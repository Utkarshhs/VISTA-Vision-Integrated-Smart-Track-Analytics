import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { componentsTable } from "./components";
import { hubsTable } from "./hubs";
import { engineersTable } from "./engineers";

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  componentId: integer("component_id").notNull().references(() => componentsTable.id),
  hubId: integer("hub_id").notNull().references(() => hubsTable.id),
  engineerId: integer("engineer_id").references(() => engineersTable.id),
  priority: text("priority").notNull(), // EMERGENCY | PRIORITY | ROUTINE
  status: text("status").notNull().default("PENDING"), // PENDING | DISPATCHED | IN_PROGRESS | RESOLVED | CANCELLED
  notes: text("notes"),
  dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, createdAt: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
