import { numeric, integer, pgEnum, pgTable, text, timestamp, varchar, boolean, jsonb, index, uniqueIndex, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Enums
 */
export const userRoleEnum = pgEnum("user_role", ["admin", "analyst", "viewer"]);
export const sourceEnum = pgEnum("source", ["olx", "mercado_livre", "webmotors", "icarros", "socarrao", "manual", "api"]);
export const sellerTypeEnum = pgEnum("seller_type", ["individual", "dealer", "reseller", "unknown"]);
export const priorityEnum = pgEnum("priority", ["high", "medium", "low"]);
export const leadStatusEnum = pgEnum("lead_status", ["new", "sent", "filtered", "reviewed", "approved", "rejected", "in_progress", "completed"]);
export const notificationTypeEnum = pgEnum("notification_type", ["new_lead", "high_priority", "collection_complete", "system"]);
export const jobStatusEnum = pgEnum("job_status", ["pending", "running", "completed", "failed"]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("viewer").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Vehicle advertisements collected from various sources
 */
export const vehicleAds = pgTable("vehicle_ads", {
  id: serial("id").primaryKey(),
  externalId: varchar("external_id", { length: 255 }).notNull(),
  source: sourceEnum("source").notNull(),
  url: text("url"),
  title: text("title").notNull(),
  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 100 }),
  version: varchar("version", { length: 100 }),
  year: integer("year"),
  mileage: integer("mileage"), // in km
  price: numeric("price", { precision: 12, scale: 2 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  sellerType: sellerTypeEnum("seller_type").default("unknown"),
  sellerName: varchar("seller_name", { length: 255 }),
  contactInfo: varchar("contact_info", { length: 255 }), // Phone, WhatsApp link, or email
  description: text("description"),
  photoCount: integer("photo_count").default(0),
  photoUrls: jsonb("photo_urls"), // JSONB array of photo URLs
  adPostedAt: timestamp("ad_posted_at"),
  collectedAt: timestamp("collected_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true),
  hash: varchar("hash", { length: 64 }), // For deduplication
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  adId: integer("ad_id").notNull(),
  score: numeric("score", { precision: 5, scale: 2 }).default("0"),
  priority: priorityEnum("priority").default("low"),
  scoreReason: text("score_reason"),
  status: leadStatusEnum("status").default("new"),
  notes: text("notes"),
  contactedAt: timestamp("contacted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
export const filterConfigs = pgTable("filter_configs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  config: jsonb("config").notNull(), // Stores filter criteria as JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type FilterConfig = typeof filterConfigs.$inferSelect;
export type InsertFilterConfig = typeof filterConfigs.$inferInsert;

/**
 * Scoring rules for lead prioritization
 */
export const scoringRules = pgTable("scoring_rules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  rules: jsonb("rules").notNull(), // Stores scoring rules as JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ScoringRule = typeof scoringRules.$inferSelect;
export type InsertScoringRule = typeof scoringRules.$inferInsert;

/**
 * Scheduled collection jobs
 */
export const collectionJobs = pgTable("collection_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  source: varchar("source", { length: 50 }), // Can be "all" or specific
  status: jobStatusEnum("status").default("pending").notNull(),
  progress: jsonb("progress").default({ processed: 0, total: 0, currentStep: "", lastMessage: "" }),
  error: text("error"),
  cronExpression: varchar("cron_expression", { length: 255 }),
  isActive: boolean("is_active").default(true),
  config: jsonb("config").notNull(), // Search parameters
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CollectionJob = typeof collectionJobs.$inferSelect;
export type InsertCollectionJob = typeof collectionJobs.$inferInsert;

/**
 * WhatsApp Message Templates
 */
export const whatsappTemplates = pgTable("whatsapp_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdStatusUnique: uniqueIndex("user_id_status_unique").on(table.userId, table.status),
}));

export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;
export type InsertWhatsappTemplate = typeof whatsappTemplates.$inferInsert;

/**
 * Activity logs for audit trail
 */
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: integer("entity_id"),
  details: jsonb("details"),
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
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  leadId: integer("lead_id"),
  isRead: boolean("is_read").default(false),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Price history for tracking price changes
 */
export const priceHistory = pgTable("price_history", {
  id: serial("id").primaryKey(),
  adId: integer("ad_id").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
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