import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, index } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extended with role-based access control for the vehicle prospect system.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "analyst", "viewer"]).default("viewer").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Vehicle advertisements collected from various sources
 */
export const vehicleAds = mysqlTable("vehicle_ads", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("external_id", { length: 255 }).notNull(),
  source: mysqlEnum("source", ["olx", "mercado_livre", "manual", "api"]).notNull(),
  url: text("url"),
  title: text("title").notNull(),
  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 100 }),
  version: varchar("version", { length: 100 }),
  year: int("year"),
  mileage: int("mileage"), // in km
  price: decimal("price", { precision: 12, scale: 2 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  sellerType: mysqlEnum("seller_type", ["individual", "dealer", "reseller", "unknown"]).default("unknown"),
  sellerName: varchar("seller_name", { length: 255 }),
  description: text("description"),
  photoCount: int("photo_count").default(0),
  photoUrls: json("photo_urls"), // JSON array of photo URLs
  adPostedAt: timestamp("ad_posted_at"),
  collectedAt: timestamp("collected_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true),
  hash: varchar("hash", { length: 64 }), // For deduplication
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  externalIdIdx: index("external_id_idx").on(table.externalId),
  sourceIdx: index("source_idx").on(table.source),
  hashIdx: index("hash_idx").on(table.hash),
  collectedAtIdx: index("collected_at_idx").on(table.collectedAt),
}));

export type VehicleAd = typeof vehicleAds.$inferSelect;
export type InsertVehicleAd = typeof vehicleAds.$inferInsert;

/**
 * Leads: qualified opportunities from vehicle ads
 */
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  adId: int("ad_id").notNull(),
  score: decimal("score", { precision: 5, scale: 2 }).default("0"),
  priority: mysqlEnum("priority", ["high", "medium", "low"]).default("low"),
  scoreReason: text("score_reason"),
  status: mysqlEnum("status", ["new", "filtered", "reviewed", "approved", "rejected", "in_progress", "completed"]).default("new"),
  notes: text("notes"),
  contactedAt: timestamp("contacted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  adIdIdx: index("lead_ad_id_idx").on(table.adId),
  priorityIdx: index("lead_priority_idx").on(table.priority),
  statusIdx: index("lead_status_idx").on(table.status),
}));

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Filter configurations for ad collection and lead qualification
 */
export const filterConfigs = mysqlTable("filter_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  config: json("config").notNull(), // Stores filter criteria as JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type FilterConfig = typeof filterConfigs.$inferSelect;
export type InsertFilterConfig = typeof filterConfigs.$inferInsert;

/**
 * Scoring rules for lead prioritization
 */
export const scoringRules = mysqlTable("scoring_rules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  rules: json("rules").notNull(), // Stores scoring rules as JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ScoringRule = typeof scoringRules.$inferSelect;
export type InsertScoringRule = typeof scoringRules.$inferInsert;

/**
 * Scheduled collection jobs
 */
export const collectionJobs = mysqlTable("collection_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  source: mysqlEnum("source", ["olx", "mercado_livre", "all"]).notNull(),
  cronExpression: varchar("cron_expression", { length: 255 }),
  isActive: boolean("is_active").default(true),
  config: json("config").notNull(), // Search parameters
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CollectionJob = typeof collectionJobs.$inferSelect;
export type InsertCollectionJob = typeof collectionJobs.$inferInsert;

/**
 * Activity logs for audit trail
 */
export const activityLogs = mysqlTable("activity_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id"),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: int("entity_id"),
  details: json("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("log_user_id_idx").on(table.userId),
  createdAtIdx: index("log_created_at_idx").on(table.createdAt),
}));

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;

/**
 * Notifications for users
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  type: mysqlEnum("type", ["new_lead", "high_priority", "collection_complete", "system"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  leadId: int("lead_id"),
  isRead: boolean("is_read").default(false),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Price history for tracking price changes
 */
export const priceHistory = mysqlTable("price_history", {
  id: int("id").autoincrement().primaryKey(),
  adId: int("ad_id").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = typeof priceHistory.$inferInsert;

/**
 * Relations
 */
export const vehicleAdsRelations = relations(vehicleAds, ({ many }) => ({
  leads: many(leads),
  priceHistory: many(priceHistory),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  ad: one(vehicleAds, {
    fields: [leads.adId],
    references: [vehicleAds.id],
  }),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  ad: one(vehicleAds, {
    fields: [priceHistory.adId],
    references: [vehicleAds.id],
  }),
}));