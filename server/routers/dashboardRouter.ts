import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { leads, vehicleAds } from "../../drizzle/schema";
import { and, gte, lte } from "drizzle-orm";

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
});
