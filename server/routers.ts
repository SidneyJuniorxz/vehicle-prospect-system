import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  getDb,
  createLead,
  updateLead,
  getFilterConfigs,
  createFilterConfig,
  getScoringRules,
  createScoringRule,
  getUserNotifications,
  logActivity,
  createCollectionJob,
  getCollectionJob,
  getCollectionJobs,
} from "./db";
import { CollectionService } from "./services/collectionService";
import { getLocalAuthService } from "./services/localAuthService";
import { generateToken } from "./_core/authMiddleware";
import { eq, desc, ilike, and, isNotNull } from "drizzle-orm";
import { leads, vehicleAds, notifications, collectionJobs } from "../drizzle/schema";
import { monitoringRouter } from "./routers/monitoringRouter";
import { exportRouter } from "./routers/exportRouter";
import { whatsappRouter } from "./routers/whatsappRouter";
import { dashboardRouter } from "./routers/dashboardRouter";

export const appRouter = router({
  system: systemRouter,
  dashboard: dashboardRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    localLogin: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(6),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const authService = getLocalAuthService();
        const result = await authService.login(input.email, input.password);

        if (result.success && result.user) {
          const token = await generateToken({
            id: result.user.id,
            openId: `local_${result.user.email}`,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role as "admin" | "analyst" | "viewer",
          });
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

          return {
            ...result,
            token
          };
        }

        return result;
      }),
    localRegister: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(6),
          name: z.string().min(2),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const authService = getLocalAuthService();
        const result = await authService.register(input.email, input.password, input.name);

        if (result.success && result.user) {
          const token = await generateToken({
            id: result.user.id,
            openId: `local_${result.user.email}`,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role as "admin" | "analyst" | "viewer",
          });
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
        }

        return result;
      }),
  }),

  leads: router({
    list: protectedProcedure
      .input(
        z.object({
          priority: z.enum(["high", "medium", "low"]).optional(),
          status: z.string().optional(),
          brand: z.string().optional(),
          model: z.string().optional(),
          sellerType: z.enum(["individual", "dealer", "reseller", "unknown"]).optional(),
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        let conditions = [];
        if (input.priority) conditions.push(eq(leads.priority, input.priority as any));
        if (input.status) conditions.push(eq(leads.status, input.status as any));
        if (input.brand) conditions.push(ilike(vehicleAds.brand, `%${input.brand}%`));
        if (input.model) conditions.push(ilike(vehicleAds.model, `%${input.model}%`));
        if (input.sellerType) conditions.push(eq(vehicleAds.sellerType, input.sellerType));

        const query = db
          .select({
            lead: leads,
            ad: vehicleAds,
          })
          .from(leads)
          .leftJoin(vehicleAds, eq(leads.adId, vehicleAds.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(leads.score), desc(leads.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        const results = await query;
        
        // Fallback: If no leads found, and no filters are applied, show all ads as "New" leads
        if (results.length === 0 && !input.priority && !input.status && !input.brand && !input.model && !input.sellerType) {
            const allAds = await db.select().from(vehicleAds).orderBy(desc(vehicleAds.collectedAt)).limit(input.limit).offset(input.offset);
            return allAds.map(ad => ({
                id: -ad.id, // Negative ID to indicate it's a virtual lead
                adId: ad.id,
                score: "0.00",
                priority: "low",
                status: "new",
                createdAt: ad.collectedAt,
                updatedAt: ad.updatedAt,
                ad: ad
            }));
        }

        return results.map(r => ({ ...r.lead, ad: r.ad }));
      }),

    stats: protectedProcedure
      .input(
        z.object({
          brand: z.string().optional(),
          model: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { total: 0, new: 0, high: 0, medium: 0, low: 0 };

        let conditions = [];
        if (input.brand) conditions.push(ilike(vehicleAds.brand, `%${input.brand}%`));
        if (input.model) conditions.push(ilike(vehicleAds.model, `%${input.model}%`));

        let query = db
          .select({
            priority: leads.priority,
            status: leads.status
          })
          .from(leads);

        if (conditions.length > 0) {
          query = query
            .leftJoin(vehicleAds, eq(leads.adId, vehicleAds.id))
            .where(and(...conditions)) as any;
        }

        const allLeads = await query;

        return {
          total: allLeads.length,
          new: allLeads.filter(l => l.status === "new").length,
          high: allLeads.filter(l => l.priority === "high").length,
          medium: allLeads.filter(l => l.priority === "medium").length,
          low: allLeads.filter(l => l.priority === "low").length,
        };
      }),

    getFilterOptions: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { brands: [], models: [] };

      // Get unique brands and models from the database
      const data = await db
        .select({
          brand: vehicleAds.brand,
          model: vehicleAds.model,
        })
        .from(vehicleAds)
        .where(isNotNull(vehicleAds.brand));

      const brands = new Set<string>();
      const models = new Set<string>();

      data.forEach((row) => {
        if (row.brand) brands.add(row.brand);
        if (row.model) models.add(row.model);
      });

      return {
        brands: Array.from(brands).sort(),
        models: Array.from(models).sort(),
      };
    }),

    getById: protectedProcedure.input(z.number()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db
        .select({
          lead: leads,
          ad: vehicleAds
        })
        .from(leads)
        .leftJoin(vehicleAds, eq(leads.adId, vehicleAds.id))
        .where(eq(leads.id, input))
        .limit(1);

      if (result.length === 0) return null;

      const row = result[0];
      return {
        ...row.lead,
        ad: row.ad
      };
    }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.string().optional(),
          notes: z.string().optional(),
          contactedAt: z.date().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const updates: any = {};
        if (input.status) updates.status = input.status;
        if (input.notes) updates.notes = input.notes;
        if (input.contactedAt) updates.contactedAt = input.contactedAt;

        await updateLead(input.id, updates);
        await logActivity({
          userId: ctx.user.id,
          action: "lead_updated",
          entityType: "lead",
          entityId: input.id,
          details: JSON.stringify(updates),
        });

        return { success: true };
      }),
  }),

  collection: router({
    collect: protectedProcedure
      .input(
        z.object({
          name: z.string().default("Busca Manual"),
          searchParams: z.record(z.string(), z.any()),
          filterCriteria: z.record(z.string(), z.any()).optional(),
          useLLM: z.boolean().optional().default(false),
          autoSend: z.boolean().optional().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // 1. Create the job record
        const jobResult = await createCollectionJob({
          userId: ctx.user.id,
          name: input.name,
          source: "all",
          status: "pending",
          config: input.searchParams,
        });

        const jobId = (jobResult as any)[0]?.id || (jobResult as any).id;

        // 2. Start the service in the background
        const service = new CollectionService();
        void service.collect({
          userId: ctx.user.id,
          searchParams: input.searchParams,
          filterCriteria: input.filterCriteria,
          jobId: jobId,
          useLLM: input.useLLM,
          autoSend: input.autoSend,
        }).catch(err => {
          console.error(`[Collection Router] Job ${jobId} failed:`, err);
        });

        return { jobId };
      }),

    getJobStatus: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return getCollectionJob(input);
      }),

    listJobs: protectedProcedure
      .query(async ({ ctx }) => {
        return getCollectionJobs(ctx.user.id);
      }),
  }),

  filters: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getFilterConfigs(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          config: z.record(z.string(), z.any()),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const result = await createFilterConfig({
          userId: ctx.user.id,
          name: input.name,
          description: input.description || undefined,
          config: JSON.stringify(input.config),
          isActive: true,
        } as any);

        await logActivity({
          userId: ctx.user.id,
          action: "filter_created",
          entityType: "filter",
          details: JSON.stringify(input),
        });

        return result;
      }),
  }),

  scoring: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getScoringRules(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          rules: z.record(z.string(), z.any()),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const result = await createScoringRule({
          userId: ctx.user.id,
          name: input.name,
          description: input.description || undefined,
          rules: JSON.stringify(input.rules),
          isActive: true,
        } as any);

        await logActivity({
          userId: ctx.user.id,
          action: "scoring_rule_created",
          entityType: "scoring_rule",
          details: JSON.stringify(input),
        });

        return result;
      }),
  }),

  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ input, ctx }) => {
        return getUserNotifications(ctx.user.id, input.limit);
      }),
  }),

  monitoring: monitoringRouter,
  export: exportRouter,
  whatsapp: whatsappRouter,
});

export type AppRouter = typeof appRouter;
