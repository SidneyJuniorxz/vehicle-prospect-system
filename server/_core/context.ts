import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { verifyToken, extractToken, AuthUser } from "./authMiddleware";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: AuthUser | User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const token = extractToken(opts.req as any);
  let user = (opts.req as any).user || null;

  if (token && !user) {
    const verified = await verifyToken(token);
    if (verified) {
      user = verified;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
