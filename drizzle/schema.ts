import { int, mysqlEnum, mysqlTable, timestamp, varchar, text, uniqueIndex } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const blueLegacyAccounts = mysqlTable(
  "bluelegacy_accounts",
  {
    id: int("id").autoincrement().primaryKey(),
    username: varchar("username", { length: 32 }).notNull(),
    passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
    ageConfirmed: int("ageConfirmed").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ usernameUnique: uniqueIndex("bluelegacy_accounts_username_unique").on(table.username) }),
);

export type BlueLegacyAccount = typeof blueLegacyAccounts.$inferSelect;

export const blueLegacySessions = mysqlTable(
  "bluelegacy_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    accountId: int("accountId").notNull(),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  },
  table => ({ tokenUnique: uniqueIndex("bluelegacy_sessions_token_unique").on(table.tokenHash) }),
);

export const blueLegacyPosts = mysqlTable("bluelegacy_posts", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  username: varchar("username", { length: 32 }).notNull(),
  body: varchar("body", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BlueLegacyPost = typeof blueLegacyPosts.$inferSelect;
export type InsertBlueLegacyPost = typeof blueLegacyPosts.$inferInsert;
