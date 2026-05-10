import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sectorsTable } from "./sectors";

export const hubsTable = pgTable("hubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sectorId: integer("sector_id").notNull().references(() => sectorsTable.id),
  location: text("location").notNull(),
  latitude: numeric("latitude", { precision: 10, scale: 6 }).notNull(),
  longitude: numeric("longitude", { precision: 10, scale: 6 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHubSchema = createInsertSchema(hubsTable).omit({ id: true, createdAt: true });
export type InsertHub = z.infer<typeof insertHubSchema>;
export type Hub = typeof hubsTable.$inferSelect;
