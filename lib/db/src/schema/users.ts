import { pgTable, text, timestamp, boolean, varchar, type AnyPgColumn } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["customer", "reseller", "admin"] }).notNull().default("customer"),
  status: text("status", { enum: ["active", "suspended"] }).notNull().default("active"),
  emailVerified: boolean("email_verified").notNull().default(false),
  referralCode: varchar("referral_code", { length: 20 }).unique(),
  referredBy: text("referred_by").references((): AnyPgColumn => usersTable.id),
  resellerSince: timestamp("reseller_since"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
