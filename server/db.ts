import { eq, and, desc } from "drizzle-orm";

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  users,
  vehicleAds,
  leads,
  activityLogs,
  notifications,
  filterConfigs,
  scoringRules,
  collectionJobs,
  InsertUser,
  InsertVehicleAd,
  InsertLead,
  InsertActivityLog,
  InsertNotification,
  InsertFilterConfig,
  InsertScoringRule,
  InsertCollectionJob,
  whatsappTemplates,
  InsertWhatsappTemplate,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
      });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Vehicle Ads queries
 */
export async function createVehicleAd(ad: InsertVehicleAd) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(vehicleAds).values(ad);
  return result;
}

export async function getVehicleAdByExternalId(source: string, externalId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(vehicleAds)
    .where(
      and(
        eq(vehicleAds.source, source as any),
        eq(vehicleAds.externalId, externalId)
      )
    )
    .limit(1);
  return result[0];
}

export async function getVehicleAdsByFilters(filters: any, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  // This will be expanded with actual filter logic
  return db.select().from(vehicleAds).limit(limit).offset(offset);
}

export async function getVehicleAdByHash(hash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(vehicleAds).where(eq(vehicleAds.hash, hash)).limit(1);
  return result[0] || undefined;
}

export async function updateVehicleAd(id: number, updates: Partial<InsertVehicleAd>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(vehicleAds).set(updates).where(eq(vehicleAds.id, id));
}

/**
 * Leads queries
 */
export async function createLead(lead: InsertLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(leads).values(lead);
}

export async function getLeadsByPriority(priority: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(leads)
    .where(eq(leads.priority, priority as any))
    .orderBy(desc(leads.score))
    .limit(limit);
}

export async function updateLead(id: number, updates: Partial<InsertLead>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(leads).set(updates).where(eq(leads.id, id));
}

/**
 * Activity logs
 */
export async function logActivity(log: InsertActivityLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityLogs).values(log);
}

/**
 * Notifications
 */
export async function createNotification(notif: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(notifications).values(notif);
}

export async function getUserNotifications(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.sentAt))
    .limit(limit);
}

/**
 * Filter configs
 */
export async function getFilterConfigs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(filterConfigs)
    .where(eq(filterConfigs.userId, userId));
}

export async function createFilterConfig(config: InsertFilterConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(filterConfigs).values(config);
}

/**
 * Scoring rules
 */
export async function getScoringRules(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(scoringRules)
    .where(eq(scoringRules.userId, userId));
}

export async function createScoringRule(rule: InsertScoringRule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(scoringRules).values(rule);
}

/**
 * WhatsApp Templates
 */
export async function getWhatsappTemplates(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(whatsappTemplates)
    .where(eq(whatsappTemplates.userId, userId));
}

export async function upsertWhatsappTemplate(template: Required<Pick<InsertWhatsappTemplate, 'userId' | 'status' | 'message'>>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(whatsappTemplates)
    .where(and(eq(whatsappTemplates.userId, template.userId), eq(whatsappTemplates.status, template.status)))
    .limit(1);

  if (existing.length > 0) {
    return db.update(whatsappTemplates).set({ message: template.message, updatedAt: new Date() }).where(eq(whatsappTemplates.id, existing[0].id));
  } else {
    return db.insert(whatsappTemplates).values(template);
  }
}

/**
 * Activity logs
 */
export async function createActivityLog(log: InsertActivityLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(activityLogs).values(log);
}

export async function getActivityLogs(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(activityLogs)
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Collection jobs
 */
export async function createCollectionJob(job: InsertCollectionJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(collectionJobs).values(job).returning();
}

export async function getCollectionJob(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(collectionJobs).where(eq(collectionJobs.id, id)).limit(1);
  return result[0];
}

export async function updateCollectionJob(jobId: number, updates: Partial<InsertCollectionJob>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(collectionJobs).set(updates).where(eq(collectionJobs.id, jobId)).returning();
}

export async function getCollectionJobs(userId?: number) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(collectionJobs);

  if (userId) {
    query = query.where(eq(collectionJobs.userId, userId)) as any;
  }

  return query.orderBy(desc(collectionJobs.createdAt));
}

/**
 * Generic query functions for REST API
 */
export async function getLeads(filters: any = {}, limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(leads);

  if (filters.id) {
    query = query.where(eq(leads.id, filters.id)) as any;
  }
  if (filters.priority) {
    query = query.where(eq(leads.priority, filters.priority as any)) as any;
  }
  if (filters.status) {
    query = query.where(eq(leads.status, filters.status as any)) as any;
  }

  return query.orderBy(desc(leads.score)).limit(limit).offset(offset);
}

export async function getVehicleAds(filters: any = {}, limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(vehicleAds);

  if (filters.id) {
    query = query.where(eq(vehicleAds.id, filters.id)) as any;
  }
  if (filters.source) {
    query = query.where(eq(vehicleAds.source, filters.source as any)) as any;
  }

  return query.limit(limit).offset(offset);
}
