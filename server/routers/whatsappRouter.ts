import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { getWhatsappTemplates, upsertWhatsappTemplate } from "../db";
import { getWhatsAppBotService } from "../services/whatsAppBotService";

export const whatsappRouter = router({
    getTemplates: publicProcedure.query(async () => {
        const userId = 1;
        return await getWhatsappTemplates(userId);
    }),
    saveTemplate: publicProcedure
        .input(z.object({
            status: z.string(),
            message: z.string(),
        }))
        .mutation(async ({ input }) => {
            const userId = 1;
            return await upsertWhatsappTemplate({
                userId,
                status: input.status,
                message: input.message,
            });
        }),

    initialize: publicProcedure.mutation(async () => {
        const bot = getWhatsAppBotService();
        await bot.initialize();
        return { success: true };
    }),

    getConnectionStatus: publicProcedure.query(async () => {
        const bot = getWhatsAppBotService();
        return bot.getStatus();
    }),

    logout: publicProcedure.mutation(async () => {
        const bot = getWhatsAppBotService();
        await bot.logout();
        return { success: true };
    }),
});
