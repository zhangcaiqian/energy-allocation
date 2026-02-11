import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  energyReserveRatio: real("energy_reserve_ratio").notNull().default(0.3),
  checkInTimes: text("check_in_times").notNull().default("09:00,12:30,18:00,22:00"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const energyCheckIns = sqliteTable("energy_check_ins", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  level: text("level", {
    enum: ["HIGH", "MEDIUM", "LOW", "EXHAUSTED"],
  }).notNull(),
  question: text("question").notNull(),
  note: text("note"),
  aiResponse: text("ai_response"),
  checkInAt: text("check_in_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const dailyEnergySummaries = sqliteTable("daily_energy_summaries", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  date: text("date").notNull(), // YYYY-MM-DD
  avgScore: real("avg_score").notNull(),
  minScore: real("min_score").notNull(),
  maxScore: real("max_score").notNull(),
  checkInCount: integer("check_in_count").notNull(),
  belowReserve: integer("below_reserve").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const coachMessages = sqliteTable("coach_messages", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  triggerType: text("trigger_type", {
    enum: ["CHECK_IN_REPLY", "LOW_ENERGY_ALERT", "WEEKLY_SUMMARY"],
  }).notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type EnergyCheckIn = typeof energyCheckIns.$inferSelect;
export type NewEnergyCheckIn = typeof energyCheckIns.$inferInsert;
export type DailyEnergySummary = typeof dailyEnergySummaries.$inferSelect;
export type CoachMessage = typeof coachMessages.$inferSelect;

// Energy level score mapping
export const ENERGY_SCORES: Record<string, number> = {
  HIGH: 1.0,
  MEDIUM: 0.65,
  LOW: 0.35,
  EXHAUSTED: 0.1,
};

export type EnergyLevel = "HIGH" | "MEDIUM" | "LOW" | "EXHAUSTED";
