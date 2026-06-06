import { pgTable, text, numeric, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const walletsTable = pgTable("wallets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique().references(() => usersTable.id),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0.00"),
  currency: text("currency").notNull().default("NGN"),
  virtualAccountNumber: varchar("virtual_account_number", { length: 20 }),
  virtualAccountBank: varchar("virtual_account_bank", { length: 100 }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWalletSchema = createInsertSchema(walletsTable).omit({ id: true });
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof walletsTable.$inferSelect;
