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
} from "./db";
import { CollectionService } from "./services/collectionService";
import { getLocalAuthService } from "./services/localAuthService";
import { generateToken } from "./_core/authMiddleware";
import { eq, desc } from "drizzle-orm";
import { leads, vehicleAds, notifications } from "../drizzle/schema";

export const appRouter = router({
  system: systemRouter,
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
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        let query = db.select().from(leads) as any;
        
        if (input.priority) {
          query = query.where(eq(leads.priority, input.priority as any));
        }
        if (input.status) {
          query = query.where(eq(leads.status, input.status as any));
        }

        const results = await query
          .orderBy(desc(leads.score))
          .limit(input.limit)
          .offset(input.offset);
        return results;
      }),

    getById: protectedProcedure.input(z.number()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await (db as any)
        .select()
        .from(leads)
        .where(eq(leads.id, input))
        .limit(1);
      return result[0] || null;
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
          searchParams: z.record(z.string(), z.any()),
          filterCriteria: z.record(z.string(), z.any()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const service = new CollectionService();
        const result = await service.collect({
          userId: ctx.user.id,
          searchParams: input.searchParams,
          filterCriteria: input.filterCriteria,
        });

        return result;
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
});

export type AppRouter = typeof appRouter;
