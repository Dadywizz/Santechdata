import { pgTable, text, numeric, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const airtimeToCashTable = pgTable("airtime_to_cash", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id),
  network: text("network", { enum: ["MTN", "AIRTEL", "GLO", "9MOBILE"] }).notNull(),
  airtimeAmount: numeric("airtime_amount", { precision: 12, scale: 2 }).notNull(),
  payoutAmount: numeric("payout_amount", { precision: 12, scale: 2 }).notNull(),
  rate: integer("rate").notNull(),
  senderPhone: text("sender_phone").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAirtimeToCashSchema = createInsertSchema(airtimeToCashTable).omit({
  id: true, createdAt: true, updatedAt: true,
});

export type InsertAirtimeToCash = z.infer<typeof insertAirtimeToCashSchema>;
export type AirtimeToCash = typeof airtimeToCashTable.$inferSelect;
