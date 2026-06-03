import { pgTable, text, numeric, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dataPlansTable = pgTable("data_plans", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  network: text("network", { enum: ["MTN", "AIRTEL", "GLO", "9MOBILE"] }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  size: varchar("size", { length: 20 }).notNull(),
  validity: varchar("validity", { length: 50 }).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }).notNull(),
  providerCode: varchar("provider_code", { length: 100 }).default("").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDataPlanSchema = createInsertSchema(dataPlansTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDataPlan = z.infer<typeof insertDataPlanSchema>;
export type DataPlan = typeof dataPlansTable.$inferSelect;
