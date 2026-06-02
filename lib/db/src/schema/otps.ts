import { pgTable, text, boolean, timestamp, varchar } from "drizzle-orm/pg-core";

export const otpsTable = pgTable("otps", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar("email", { length: 255 }).notNull(),
  otp: varchar("otp", { length: 10 }).notNull(),
  type: text("type", { enum: ["email_verify", "password_reset"] }).notNull(),
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Otp = typeof otpsTable.$inferSelect;
