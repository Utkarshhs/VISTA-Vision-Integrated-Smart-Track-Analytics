import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { hubsTable } from "./hubs";
import { sectorsTable } from "./sectors";

export const componentsTable = pgTable("components", {
  id: serial("id").primaryKey(),
  componentId: text("component_id").notNull().unique(),
  type: text("type").notNull(), // ERC Clip | Rail Joint | Fish Plate | Sleeper | Ballast | Signal Cable
  hubId: integer("hub_id").notNull().references(() => hubsTable.id),
  sectorId: integer("sector_id").notNull().references(() => sectorsTable.id),
  ageMonths: integer("age_months").notNull(),
  lastInspection: timestamp("last_inspection", { withTimezone: true }),
  ciiScore: numeric("cii_score", { precision: 5, scale: 2 }).notNull(),
  ciiStatus: text("cii_status").notNull(), // NOMINAL | MODERATE | HIGH_RISK | CRITICAL
  loadStress: numeric("load_stress", { precision: 8, scale: 3 }).notNull(),
  rainfallIndex: numeric("rainfall_index", { precision: 5, scale: 3 }).notNull(),
  thermalGradient: numeric("thermal_gradient", { precision: 8, scale: 3 }).notNull(),
  latitude: numeric("latitude", { precision: 10, scale: 6 }).notNull(),
  longitude: numeric("longitude", { precision: 10, scale: 6 }).notNull(),
  location: text("location").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertComponentSchema = createInsertSchema(componentsTable).omit({ id: true, createdAt: true });
export type InsertComponent = z.infer<typeof insertComponentSchema>;
export type Component = typeof componentsTable.$inferSelect;
