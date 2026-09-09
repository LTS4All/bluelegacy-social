import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { blueLegacyAccounts, blueLegacyPosts, blueLegacySessions, type BlueLegacyAccount } from "../drizzle/schema";

export const MINIMUM_AGE = 13;
export const SESSION_DAYS = 30;

export function validateRegistration(input: { username: string; password: string; age: number }) {
  const username = input.username.trim();
  if (!/^[A-Za-z0-9_]{3,32}$/.test(username)) {
    throw new Error("Username must be 3–32 characters using letters, numbers, or underscores.");
  }
  if (input.password.length < 8 || input.password.length > 128) {
    throw new Error("Password must be between 8 and 128 characters.");
  }
  if (!Number.isInteger(input.age) || input.age < MINIMUM_AGE || input.age > 120) {
    throw new Error(`You must be at least ${MINIMUM_AGE} years old to register.`);
  }
  return { username, age: input.age };
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${digest}`;
}

export function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, expectedHex] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function newToken() {
  return randomBytes(32).toString("base64url");
}

function expiryDate() {
  const date = new Date();
  date.setDate(date.getDate() + SESSION_DAYS);
  return date;
}

export async function registerBlueLegacy(input: { username: string; password: string; age: number }) {
  const { username, age } = validateRegistration(input);
  const db = await getDb();
  if (!db) throw new Error("BlueLegacy database is unavailable.");
  const existing = await db.select({ id: blueLegacyAccounts.id }).from(blueLegacyAccounts).where(eq(blueLegacyAccounts.username, username)).limit(1);
  if (existing.length) throw new Error("That username is already registered.");
  const inserted = await db.insert(blueLegacyAccounts).values({ username, passwordHash: hashPassword(input.password), ageConfirmed: 1 });
  const accountId = Number(inserted[0].insertId);
  const token = await createSession(accountId);
  return { token, username, ageConfirmed: age >= MINIMUM_AGE, completed: true };
}

export async function loginBlueLegacy(username: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error("BlueLegacy database is unavailable.");
  const rows = await db.select().from(blueLegacyAccounts).where(eq(blueLegacyAccounts.username, username.trim())).limit(1);
  const account = rows[0];
  if (!account || !verifyPassword(password, account.passwordHash)) throw new Error("Username or password is incorrect.");
  const token = await createSession(account.id);
  return { token, username: account.username, ageConfirmed: Boolean(account.ageConfirmed) };
}

async function createSession(accountId: number) {
  const db = await getDb();
  if (!db) throw new Error("BlueLegacy database is unavailable.");
  const token = newToken();
  await db.insert(blueLegacySessions).values({ accountId, tokenHash: hashToken(token), expiresAt: expiryDate() });
  return token;
}

export async function getBlueLegacyAccount(token: string): Promise<BlueLegacyAccount | undefined> {
  const db = await getDb();
  if (!db || !token) return undefined;
  const rows = await db.select({ account: blueLegacyAccounts, session: blueLegacySessions })
    .from(blueLegacySessions)
    .innerJoin(blueLegacyAccounts, eq(blueLegacySessions.accountId, blueLegacyAccounts.id))
    .where(eq(blueLegacySessions.tokenHash, hashToken(token)))
    .limit(1);
  const row = rows[0];
  if (!row || row.session.expiresAt.getTime() <= Date.now()) return undefined;
  await db.update(blueLegacySessions).set({ lastSeenAt: new Date() }).where(eq(blueLegacySessions.id, row.session.id));
  return row.account;
}

export async function logoutBlueLegacy(token: string) {
  const db = await getDb();
  if (!db || !token) return;
  await db.delete(blueLegacySessions).where(eq(blueLegacySessions.tokenHash, hashToken(token)));
}

export async function listBlueLegacyPosts(limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("BlueLegacy database is unavailable.");
  return db.select().from(blueLegacyPosts).orderBy(desc(blueLegacyPosts.createdAt)).limit(Math.min(Math.max(limit, 1), 100));
}

export async function createBlueLegacyPost(token: string, body: string) {
  const account = await getBlueLegacyAccount(token);
  if (!account) throw new Error("Sign in to BlueLegacy before posting.");
  const cleanBody = body.trim();
  if (!cleanBody || cleanBody.length > 500) throw new Error("Posts must contain 1–500 characters.");
  const db = await getDb();
  if (!db) throw new Error("BlueLegacy database is unavailable.");
  const inserted = await db.insert(blueLegacyPosts).values({ accountId: account.id, username: account.username, body: cleanBody });
  const rows = await db.select().from(blueLegacyPosts).where(eq(blueLegacyPosts.id, Number(inserted[0].insertId))).limit(1);
  return rows[0];
}
