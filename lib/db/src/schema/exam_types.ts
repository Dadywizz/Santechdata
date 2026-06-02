import { pgTable, text, numeric, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const examTypesTable = pgTable("exam_types", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 100 }).notNull(),
  code: text("code", { enum: ["WAEC", "NECO", "JAMB", "NABTEB"] }).notNull().unique(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExamTypeSchema = createInsertSchema(examTypesTable).omit({ id: true, createdAt: true });
export type InsertExamType = z.infer<typeof insertExamTypeSchema>;
export type ExamType = typeof examTypesTable.$inferSelect;
