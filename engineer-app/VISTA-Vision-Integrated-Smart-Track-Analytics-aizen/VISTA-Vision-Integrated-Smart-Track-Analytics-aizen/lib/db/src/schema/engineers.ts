import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { hubsTable } from "./hubs";

export const engineersTable = pgTable("engineers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  employeeId: text("employee_id").notNull().unique(),
  hubId: integer("hub_id").notNull().references(() => hubsTable.id),
  status: text("status").notNull().default("available"), // available | on_mission | offline
  specialization: text("specialization").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEngineerSchema = createInsertSchema(engineersTable).omit({ id: true, createdAt: true });
export type InsertEngineer = z.infer<typeof insertEngineerSchema>;
export type Engineer = typeof engineersTable.$inferSelect;
