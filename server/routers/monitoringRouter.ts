import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getHealthMonitor } from "../services/healthMonitorService";

export const monitoringRouter = router({
    getReport: protectedProcedure.query(() => {
        const monitor = getHealthMonitor();
        return monitor.getHealthReport();
    }),
    getAlerts: protectedProcedure.query(() => {
        const monitor = getHealthMonitor();
        return monitor.getAlerts();
    }),
    getHistory: protectedProcedure
        .input(z.object({
            source: z.string().optional(),
            limit: z.number().default(50)
        }))
        .query(({ input }) => {
            const monitor = getHealthMonitor();
            return monitor.getCollectionHistory(input.source, input.limit);
        }),
});
