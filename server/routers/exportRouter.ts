import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getExportService } from "../services/exportService";
import { getDb } from "../db";
import { leads as leadsTable, vehicleAds } from "../../drizzle/schema";
import { eq, inArray, and, ilike } from "drizzle-orm";

export const exportRouter = router({
    getColumns: protectedProcedure.query(() => {
        const service = getExportService();
        return service.getAvailableColumns();
    }),

    exportLeads: protectedProcedure
        .input(
            z.object({
                format: z.enum(["csv", "excel", "json"]),
                columns: z.array(z.string()).optional(),
                leadIds: z.array(z.number()).optional(),
                filters: z.object({
                    priority: z.enum(["high", "medium", "low"]).optional(),
                    status: z.string().optional(),
                    brand: z.string().optional(),
                    model: z.string().optional(),
                }).optional()
            })
        )
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            let leadsQuery = db.select({ lead: leadsTable, ad: vehicleAds })
                .from(leadsTable)
                .leftJoin(vehicleAds, eq(leadsTable.adId, vehicleAds.id));

            let conditions = [];

            if (input.leadIds && input.leadIds.length > 0) {
                conditions.push(inArray(leadsTable.id, input.leadIds));
            } else if (input.filters) {
                if (input.filters.priority) conditions.push(eq(leadsTable.priority, input.filters.priority as any));
                if (input.filters.status) conditions.push(eq(leadsTable.status, input.filters.status as any));

                // Note: to import ilike we would need it from drizzle-orm. Let's just do a simpler filter if possible, 
                // or assume ilike is already defined? Wait, ilike is not imported.
                // It's better to add the import if needed.
                if (input.filters.brand) conditions.push(ilike(vehicleAds.brand, `%${input.filters.brand}%`));
                if (input.filters.model) conditions.push(ilike(vehicleAds.model, `%${input.filters.model}%`));
            }

            if (conditions.length > 0) {
                leadsQuery = leadsQuery.where(and(...conditions)) as any;
            }

            const leadsData = await leadsQuery;

            if (leadsData.length === 0) {
                throw new Error("No leads found to export");
            }

            const adIds = Array.from(new Set(leadsData.map((l: any) => l.ad?.id).filter(Boolean)));
            const adsData = leadsData.map((l: any) => l.ad).filter((ad: any, index: number, self: any[]) => ad && self.findIndex(a => a?.id === ad.id) === index);

            const service = getExportService();
            const exportData = await service.prepareLeadsForExport(leadsData.map((l: any) => l.lead), adsData);

            let resultData: string | Buffer;
            if (input.format === "csv") {
                resultData = await service.exportToCSV(exportData, input.columns);
            } else if (input.format === "excel") {
                const buffer = await service.exportToExcel(exportData, input.columns);
                resultData = buffer.toString("base64"); // Send as base64 over trpc
            } else {
                resultData = await service.exportToJSON(exportData, input.columns);
            }

            const filename = service.generateFilename(input.format);

            return {
                data: resultData,
                filename,
                format: input.format,
            };
        }),
});
