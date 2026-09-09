import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "@shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  createBlueLegacyPost,
  getBlueLegacyAccount,
  listBlueLegacyPosts,
  loginBlueLegacy,
  logoutBlueLegacy,
  registerBlueLegacy,
} from "./bluelegacy";

const tokenInput = z.object({ token: z.string().min(20).max(256) });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  blueLegacy: router({
    register: publicProcedure
      .input(z.object({ username: z.string(), password: z.string(), age: z.number().int() }))
      .mutation(({ input }) => registerBlueLegacy(input)),
    login: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(({ input }) => loginBlueLegacy(input.username, input.password)),
    me: publicProcedure.input(tokenInput).query(async ({ input }) => {
      const account = await getBlueLegacyAccount(input.token);
      if (!account) return null;
      return { username: account.username, ageConfirmed: Boolean(account.ageConfirmed) };
    }),
    logout: publicProcedure.input(tokenInput).mutation(({ input }) => logoutBlueLegacy(input.token).then(() => ({ success: true }))),
    feed: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
      .query(({ input }) => listBlueLegacyPosts(input?.limit ?? 50)),
    createPost: publicProcedure
      .input(z.object({ token: z.string().min(20).max(256), body: z.string().min(1).max(500) }))
      .mutation(({ input }) => createBlueLegacyPost(input.token, input.body)),
  }),
});

export type AppRouter = typeof appRouter;
