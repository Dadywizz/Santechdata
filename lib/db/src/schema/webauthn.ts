import { pgTable, text, timestamp, varchar, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const webauthnCredentialsTable = pgTable("webauthn_credentials", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  deviceName: varchar("device_name", { length: 100 }).notNull().default("My Device"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type WebAuthnCredential = typeof webauthnCredentialsTable.$inferSelect;
