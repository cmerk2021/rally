import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { config } from "../config.js";
import { getPocketBase } from "../pocketbase.js";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  display_name: string;
  homelab_name: string;
  timezone: string;
  onboarding_completed: boolean;
  avatar: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
  interface FastifyInstance {
    requireAuth: (req: FastifyRequest) => Promise<AuthUser>;
    signToken: (userId: string) => string;
    hashApiToken: (token: string) => string;
  }
}

interface JWTPayload {
  sub: string;
  iat?: number;
  exp?: number;
}

async function resolveUser(req: FastifyRequest): Promise<AuthUser | null> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;

  // Try JWT (session) first
  let userId: string | null = null;
  try {
    const payload = jwt.verify(token, config.jwtSecret) as JWTPayload;
    userId = payload.sub;
  } catch {
    // Not a JWT — try as an API token
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const pb = await getPocketBase();
    try {
      const rec = await pb.collection("api_tokens").getFirstListItem(
        `token_hash="${hash}"`,
      );
      userId = (rec as unknown as { user: string }).user;
      // Update last_used (fire and forget)
      pb.collection("api_tokens")
        .update(rec.id, { last_used: new Date().toISOString() })
        .catch(() => {});
    } catch {
      return null;
    }
  }

  if (!userId) return null;
  const pb = await getPocketBase();
  try {
    const user = await pb.collection("users").getOne(userId);
    const u = user as unknown as Record<string, unknown>;
    return {
      id: user.id,
      username: String(u.username ?? ""),
      email: String(u.email ?? ""),
      display_name: String(u.display_name ?? ""),
      homelab_name: String(u.homelab_name ?? ""),
      timezone: String(u.timezone ?? "UTC"),
      onboarding_completed: Boolean(u.onboarding_completed),
      avatar: String(u.avatar ?? ""),
    };
  } catch {
    return null;
  }
}

export default fp(async function authPlugin(app: FastifyInstance) {
  app.decorate("signToken", (userId: string): string =>
    jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: "30d" }),
  );

  app.decorate("hashApiToken", (token: string): string =>
    crypto.createHash("sha256").update(token).digest("hex"),
  );

  app.decorate("requireAuth", async (req: FastifyRequest): Promise<AuthUser> => {
    const user = await resolveUser(req);
    if (!user) {
      const err = new Error("Authentication required") as Error & {
        statusCode?: number;
      };
      err.statusCode = 401;
      throw err;
    }
    req.user = user;
    return user;
  });

  app.addHook("preHandler", async (req) => {
    if (!req.url.startsWith("/api")) return;
    // Try to load user (non-fatal) so handlers can read req.user when present
    const user = await resolveUser(req);
    if (user) req.user = user;
  });
});
