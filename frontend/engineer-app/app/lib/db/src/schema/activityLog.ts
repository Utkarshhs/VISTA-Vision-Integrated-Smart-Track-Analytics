import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activityLogTable = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // alert_created | inspection_done | gemini_analysis | human_override | alert_resolved
  componentId: text("component_id").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(), // CRITICAL | HIGH_RISK | MODERATE | NOMINAL | INFO
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogTable).omit({ id: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogTable.$inferSelect;
