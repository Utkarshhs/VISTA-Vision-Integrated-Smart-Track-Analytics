import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { engineersTable } from "./engineers";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("engineer"),
  engineerId: integer("engineer_id").references(() => engineersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
