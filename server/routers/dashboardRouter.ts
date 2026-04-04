import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { leads, vehicleAds } from "../../drizzle/schema";
import { gte } from "drizzle-orm";
import { exec } from "child_process";
import { z } from "zod";

export const dashboardRouter = router({
  metrics: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { totals: {}, completeness: {}, leads: {} };

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const ads = await db
      .select({
        total: sql<number>`count(*)`,
        withPrice: sql<number>`count(*) filter (where price is not null)`,
        withContact: sql<number>`count(*) filter (where contact_info is not null and contact_info <> '')`,
        lastCollected: sql<Date>`max(collected_at)`,
      })
      .from(vehicleAds);

    const ads24h = await db
      .select({
        new24h: sql<number>`count(*)`,
      })
      .from(vehicleAds)
      .where(gte(vehicleAds.collectedAt, yesterday));

    const leadCounts = await db
      .select({
        high: sql<number>`count(*) filter (where priority = 'high')`,
        medium: sql<number>`count(*) filter (where priority = 'medium')`,
        low: sql<number>`count(*) filter (where priority = 'low')`,
        total: sql<number>`count(*)`,
      })
      .from(leads);

    const t = ads[0];
    const c = ads24h[0];
    const l = leadCounts[0];

    return {
      totals: {
        totalProspects: Number(t.total),
        new24h: Number(c.new24h),
        lastCollectedAt: t.lastCollected,
      },
      completeness: {
        pricePct: t.total ? Math.round((Number(t.withPrice) / Number(t.total)) * 100) : 0,
        contactPct: t.total ? Math.round((Number(t.withContact) / Number(t.total)) * 100) : 0,
        totalAds: Number(t.total),
      },
      leads: {
        high: Number(l.high),
        medium: Number(l.medium),
        low: Number(l.low),
        total: Number(l.total),
      },
    };
  }),

  runPostprocessBatch: protectedProcedure
    .input(
      z.object({
        batchSize: z.number().min(1).max(10).default(2),
        timeoutMs: z.number().min(10000).max(180000).default(90000),
        priority: z.enum(["low", "normal", "high"]).default("normal"),
      })
    )
    .mutation(async ({ input }) => {
      return new Promise((resolve, reject) => {
        const cmd = `pnpm tsx scripts/postprocess-contacts.ts`;
        exec(
          cmd,
          {
            cwd: process.cwd(),
            env: {
              ...process.env,
              BATCH_SIZE: String(input.batchSize),
              TIMEOUT_MS: String(input.timeoutMs),
              POSTPROCESS_PRIORITY: input.priority,
            },
          },
          (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || error.message));
          } else {
            resolve({ ok: true, stdout });
          }
          }
        );
      });
    }),
});
