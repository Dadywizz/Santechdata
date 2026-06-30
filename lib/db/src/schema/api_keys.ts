import { pgTable, text, boolean, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const apiKeysTable = pgTable("api_keys", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  key: text("key").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  totalRequests: integer("total_requests").notNull().default(0),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ApiKey = typeof apiKeysTable.$inferSelect;
