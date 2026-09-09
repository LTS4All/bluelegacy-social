import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./db", () => dbMock);

import { createBlueLegacyPost, getBlueLegacyAccount, hashPassword, listBlueLegacyPosts, loginBlueLegacy, MINIMUM_AGE, validateRegistration, verifyPassword } from "./bluelegacy";

function chain<T>(value: T) {
  return {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(value),
  };
}

describe("BlueLegacy registration rules", () => {
  it("accepts a valid username, password, and eligible age", () => {
    expect(validateRegistration({ username: "blue_user", password: "correct horse battery", age: MINIMUM_AGE })).toEqual({ username: "blue_user", age: MINIMUM_AGE });
  });

  it("rejects underage registrations", () => {
    expect(() => validateRegistration({ username: "blue_user", password: "correct horse battery", age: MINIMUM_AGE - 1 })).toThrow(/at least/);
  });

  it("rejects invalid usernames and short passwords", () => {
    expect(() => validateRegistration({ username: "no spaces", password: "correct horse battery", age: 20 })).toThrow(/Username/);
    expect(() => validateRegistration({ username: "blue_user", password: "short", age: 20 })).toThrow(/Password/);
  });

  it("hashes passwords without retaining plaintext and verifies them", () => {
    const encoded = hashPassword("correct horse battery");
    expect(encoded).not.toContain("correct horse battery");
    expect(verifyPassword("correct horse battery", encoded)).toBe(true);
    expect(verifyPassword("wrong password", encoded)).toBe(false);
  });
});

describe("BlueLegacy database-backed flows", () => {
  beforeEach(() => dbMock.getDb.mockReset());

  it("issues a session token on valid login and rejects an invalid password", async () => {
    const account = { id: 4, username: "blue_user", passwordHash: hashPassword("correct horse battery"), ageConfirmed: 1, createdAt: new Date(), updatedAt: new Date() };
    const inserts = { values: vi.fn().mockResolvedValue({ insertId: 12 }) };
    const fakeDb = { select: vi.fn(() => chain([account])), insert: vi.fn(() => inserts) };
    dbMock.getDb.mockResolvedValue(fakeDb);
    const result = await loginBlueLegacy("blue_user", "correct horse battery");
    expect(result.token).toHaveLength(43);
    expect(inserts.values).toHaveBeenCalled();
    await expect(loginBlueLegacy("blue_user", "wrong password")).rejects.toThrow(/incorrect/);
  });

  it("validates an unexpired session and updates last-seen time", async () => {
    const account = { id: 4, username: "blue_user", passwordHash: "unused", ageConfirmed: 1, createdAt: new Date(), updatedAt: new Date() };
    const session = { id: 12, accountId: 4, tokenHash: "hash", expiresAt: new Date(Date.now() + 60_000), createdAt: new Date(), lastSeenAt: new Date() };
    const update = { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };
    const fakeDb = { select: vi.fn(() => chain([{ account, session }])), update: vi.fn(() => update) };
    dbMock.getDb.mockResolvedValue(fakeDb);
    const result = await getBlueLegacyAccount("a-valid-session-token");
    expect(result?.username).toBe("blue_user");
    expect(update.set).toHaveBeenCalled();
  });

  it("reads the newest feed posts", async () => {
    const posts = [{ id: 1, username: "blue_user", body: "hello", createdAt: new Date() }];
    const fakeDb = { select: vi.fn(() => chain(posts)) };
    dbMock.getDb.mockResolvedValue(fakeDb);
    await expect(listBlueLegacyPosts()).resolves.toEqual(posts);
  });

  it("creates a post only after session validation", async () => {
    const account = { id: 4, username: "blue_user", passwordHash: "unused", ageConfirmed: 1, createdAt: new Date(), updatedAt: new Date() };
    const session = { id: 12, accountId: 4, expiresAt: new Date(Date.now() + 60_000) };
    const insert = { values: vi.fn().mockResolvedValue([{ insertId: 22 }]) };
    const fakeDb = { select: vi.fn(), update: vi.fn(() => ({ set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) })), insert: vi.fn(() => insert) };
    const created = { id: 22, accountId: 4, username: "blue_user", body: "hello BlueLegacy", createdAt: new Date() };
    fakeDb.select.mockReturnValueOnce(chain([{ account, session }])).mockReturnValueOnce(chain([created]));
    dbMock.getDb.mockResolvedValue(fakeDb);
    await expect(createBlueLegacyPost("a-valid-session-token", "hello BlueLegacy")).resolves.toEqual(created);
    expect(insert.values).toHaveBeenCalledWith(expect.objectContaining({ body: "hello BlueLegacy" }));
  });
});
