import { Request, Response, NextFunction } from "express";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export interface AuthUser {
  id: number;
  openId: string;
  email?: string;
  name?: string;
  role: "admin" | "analyst" | "viewer";
  [key: string]: any;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Middleware to handle self-hosted JWT authentication
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  const token = extractToken(req);

  if (!token) {
    if (isPublicEndpoint(req.path)) {
      next();
      return;
    }
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const verified = await jwtVerify(token, secret);
    req.user = verified.payload as AuthUser;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
}

/**
 * Extract JWT token from request
 */
import { COOKIE_NAME } from "@shared/const";

export function extractToken(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Check cookie
  const cookie = req.cookies?.[COOKIE_NAME] || req.cookies?.auth_token;
  if (cookie) {
    return cookie;
  }

  return null;
}

/**
 * Check if endpoint is public (doesn't require authentication)
 */
function isPublicEndpoint(path: string): boolean {
  const publicPaths = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/health",
    "/api/version",
    "/api/docs",
  ];

  return publicPaths.some((p) => path.startsWith(p));
}

/**
 * Generate JWT token for self-hosted deployment
 */
export async function generateToken(user: AuthUser): Promise<string> {
  const { SignJWT } = await import("jose");
  const secret = new TextEncoder().encode(JWT_SECRET);

  const token = await new SignJWT(user as Record<string, any>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);

  return token;
}

/**
 * Verify JWT token
 */
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const verified = await jwtVerify(token, secret);
    return verified.payload as unknown as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Create local user (for self-hosted)
 */
export interface LocalUser {
  email: string;
  password: string;
  name: string;
  role: "admin" | "analyst" | "viewer";
}

/**
 * Hash password (simple implementation - use bcrypt in production)
 */
export async function hashPassword(password: string): Promise<string> {
  // In production, use bcrypt or argon2
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify password
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}
