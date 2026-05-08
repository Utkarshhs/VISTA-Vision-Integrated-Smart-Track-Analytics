import { pgTable, serial, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { componentsTable } from "./components";
import { engineersTable } from "./engineers";
import { alertsTable } from "./alerts";

export const inspectionsTable = pgTable("inspections", {
  id: serial("id").primaryKey(),
  componentId: integer("component_id").notNull().references(() => componentsTable.id),
  engineerId: integer("engineer_id").notNull().references(() => engineersTable.id),
  alertId: integer("alert_id").references(() => alertsTable.id),
  outcome: text("outcome").notNull(), // CERTIFIED_HEALTHY | FLAGGED_MODERATE | FLAGGED_CRITICAL | REPLACEMENT_REQUIRED
  geminiAnalysis: text("gemini_analysis"),
  geminiCiiOverride: numeric("gemini_cii_override", { precision: 5, scale: 2 }),
  humanOverride: boolean("human_override").notNull().default(false),
  humanOverrideReason: text("human_override_reason"),
  photoUrl: text("photo_url"),
  inspectedAt: timestamp("inspected_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInspectionSchema = createInsertSchema(inspectionsTable).omit({ id: true, createdAt: true });
export type InsertInspection = z.infer<typeof insertInspectionSchema>;
export type Inspection = typeof inspectionsTable.$inferSelect;
