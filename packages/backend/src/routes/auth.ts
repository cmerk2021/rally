import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { getPocketBase } from "../pocketbase.js";
import {
  setupSchema,
  loginSchema,
  changePasswordSchema,
  updateMeSchema,
  apiTokenCreateSchema,
} from "../schemas/index.js";

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/setup-status", async (_req, reply) => {
    const pb = await getPocketBase();
    const list = await pb.collection("users").getList(1, 1);
    reply.send({ setupRequired: list.totalItems === 0 });
  });

  app.post("/setup", async (req, reply) => {
    const data = setupSchema.parse(req.body);
    const pb = await getPocketBase();
    const existing = await pb.collection("users").getList(1, 1);
    if (existing.totalItems > 0) {
      reply.code(409).send({ error: { code: "setup_done", message: "Setup already completed" } });
      return;
    }
    const created = await pb.collection("users").create({
      username: data.username,
      email: data.email || `${data.username}@homelab.local`,
      emailVisibility: false,
      password: data.password,
      passwordConfirm: data.password,
      display_name: data.display_name,
      homelab_name: data.homelab_name,
      timezone: data.timezone,
      onboarding_completed: false,
    });

    // Update app_settings with homelab name + timezone
    const settingsList = await pb.collection("app_settings").getList(1, 1);
    if (settingsList.items.length > 0) {
      await pb.collection("app_settings").update(settingsList.items[0].id, {
        homelab_name: data.homelab_name,
        timezone: data.timezone,
      });
    }

    const token = app.signToken(created.id);
    reply.code(201).send({
      token,
      user: {
        id: created.id,
        username: data.username,
        display_name: data.display_name,
        homelab_name: data.homelab_name,
        timezone: data.timezone,
        onboarding_completed: false,
      },
    });
  });

  app.post("/login", async (req, reply) => {
    const { username, password } = loginSchema.parse(req.body);
    const pb = await getPocketBase();
    try {
      const result = await pb.collection("users").authWithPassword(username, password);
      const u = result.record as unknown as Record<string, unknown>;
      const token = app.signToken(result.record.id);
      reply.send({
        token,
        user: {
          id: result.record.id,
          username: String(u.username ?? ""),
          email: String(u.email ?? ""),
          display_name: String(u.display_name ?? ""),
          homelab_name: String(u.homelab_name ?? ""),
          timezone: String(u.timezone ?? "UTC"),
          onboarding_completed: Boolean(u.onboarding_completed),
          avatar: String(u.avatar ?? ""),
        },
      });
    } catch {
      reply.code(401).send({ error: { code: "invalid_credentials", message: "Invalid username or password" } });
    }
  });

  app.post("/logout", async (_req, reply) => {
    // JWT is stateless; client discards token. No-op on server.
    reply.send({ ok: true });
  });

  app.get("/me", async (req, reply) => {
    const user = await app.requireAuth(req);
    reply.send({ user });
  });

  app.put("/me", async (req, reply) => {
    const user = await app.requireAuth(req);
    const data = updateMeSchema.parse(req.body);
    const pb = await getPocketBase();
    const updated = await pb.collection("users").update(user.id, data);
    const u = updated as unknown as Record<string, unknown>;
    reply.send({
      user: {
        id: updated.id,
        username: String(u.username ?? ""),
        email: String(u.email ?? ""),
        display_name: String(u.display_name ?? ""),
        homelab_name: String(u.homelab_name ?? ""),
        timezone: String(u.timezone ?? "UTC"),
        onboarding_completed: Boolean(u.onboarding_completed),
        avatar: String(u.avatar ?? ""),
      },
    });
  });

  app.post("/change-password", async (req, reply) => {
    const user = await app.requireAuth(req);
    const { current_password, new_password } = changePasswordSchema.parse(req.body);
    const pb = await getPocketBase();
    // Verify current password by re-authenticating
    try {
      await pb.collection("users").authWithPassword(user.username, current_password);
    } catch {
      reply.code(401).send({ error: { code: "invalid_credentials", message: "Current password incorrect" } });
      return;
    }
    // Reset admin auth and update password
    const admin = await getPocketBase();
    await admin.collection("users").update(user.id, {
      password: new_password,
      passwordConfirm: new_password,
    });
    reply.send({ ok: true });
  });

  app.post("/tokens", async (req, reply) => {
    const user = await app.requireAuth(req);
    const { name } = apiTokenCreateSchema.parse(req.body);
    const token = `rally_${crypto.randomBytes(24).toString("hex")}`;
    const hash = app.hashApiToken(token);
    const preview = `${token.slice(0, 10)}…${token.slice(-4)}`;
    const pb = await getPocketBase();
    const created = await pb.collection("api_tokens").create({
      name,
      token_hash: hash,
      token_preview: preview,
      user: user.id,
    });
    reply.code(201).send({
      id: created.id,
      name,
      token, // shown ONCE
      preview,
      created: created.created,
    });
  });

  app.get("/tokens", async (req, reply) => {
    const user = await app.requireAuth(req);
    const pb = await getPocketBase();
    const list = await pb.collection("api_tokens").getFullList({
      filter: `user="${user.id}"`,
      sort: "-created",
    });
    reply.send({
      items: list.map((t) => {
        const r = t as unknown as Record<string, unknown>;
        return {
          id: t.id,
          name: String(r.name ?? ""),
          preview: String(r.token_preview ?? ""),
          last_used: String(r.last_used ?? ""),
          created: t.created,
        };
      }),
    });
  });

  app.delete("/tokens/:id", async (req, reply) => {
    const user = await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const pb = await getPocketBase();
    const record = await pb.collection("api_tokens").getOne(id);
    if ((record as unknown as { user: string }).user !== user.id) {
      reply.code(403).send({ error: { code: "forbidden", message: "Not your token" } });
      return;
    }
    await pb.collection("api_tokens").delete(id);
    reply.code(204).send();
  });
}
