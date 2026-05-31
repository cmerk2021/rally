import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { getPocketBase } from "../pocketbase.js";
import { aiService } from "../services/ai.service.js";
import {
  settingsUpdateSchema,
  aiSettingsTestSchema,
  webhookTokenSchema,
} from "../schemas/index.js";

export async function registerSettingsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (req, reply) => {
    await app.requireAuth(req);
    const pb = await getPocketBase();
    const list = await pb.collection("app_settings").getList(1, 1, { sort: "-created" });
    if (list.items.length === 0) {
      reply.send({});
      return;
    }
    const s = list.items[0] as unknown as Record<string, unknown>;
    // Don't leak the API key in plain text — return whether it's set
    reply.send({
      id: list.items[0].id,
      ...s,
      ai_api_key: "",
      ai_api_key_set: Boolean(s.ai_api_key),
    });
  });

  app.put("/", async (req, reply) => {
    await app.requireAuth(req);
    const data = settingsUpdateSchema.parse(req.body);
    const pb = await getPocketBase();
    const list = await pb.collection("app_settings").getList(1, 1, { sort: "-created" });
    // Don't overwrite ai_api_key with empty string
    const updateData = { ...data };
    if (updateData.ai_api_key === "" || updateData.ai_api_key === undefined) {
      delete updateData.ai_api_key;
    }
    if (list.items.length === 0) {
      const created = await pb.collection("app_settings").create(updateData);
      reply.send(created);
    } else {
      const updated = await pb.collection("app_settings").update(list.items[0].id, updateData);
      reply.send(updated);
    }
  });

  app.post("/test-ai", async (req, reply) => {
    await app.requireAuth(req);
    const data = aiSettingsTestSchema.parse(req.body);
    const result = await aiService.testConnection({
      endpoint: data.endpoint,
      apiKey: data.api_key,
      model: data.model,
      enabled: true,
      temperature: 0,
    });
    reply.send(result);
  });

  app.post("/backup", async (req, reply) => {
    await app.requireAuth(req);
    // Trigger a PocketBase backup via its API
    const pb = await getPocketBase();
    const name = `rally_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
    try {
      await pb.backups.create(name);
      reply.send({ ok: true, name });
    } catch (err) {
      reply.code(500).send({
        error: {
          code: "backup_failed",
          message: err instanceof Error ? err.message : "Backup failed",
        },
      });
    }
  });

  app.get("/backup/history", async (req, reply) => {
    await app.requireAuth(req);
    const pb = await getPocketBase();
    try {
      const list = await pb.backups.getFullList();
      reply.send({ items: list });
    } catch {
      reply.send({ items: [] });
    }
  });

  app.post("/webhooks", async (req, reply) => {
    await app.requireAuth(req);
    const { name, source_hint } = webhookTokenSchema.parse(req.body);
    const token = crypto.randomBytes(16).toString("hex");
    const pb = await getPocketBase();
    const created = await pb.collection("webhook_tokens").create({
      name,
      token,
      source_hint,
      enabled: true,
    });
    reply.code(201).send({
      id: created.id,
      name,
      token,
      source_hint,
      enabled: true,
    });
  });

  app.get("/webhooks", async (req, reply) => {
    await app.requireAuth(req);
    const pb = await getPocketBase();
    const list = await pb.collection("webhook_tokens").getFullList({ sort: "-created" });
    reply.send({ items: list });
  });

  app.patch("/webhooks/:id", async (req, reply) => {
    await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const body = (req.body || {}) as { enabled?: boolean; name?: string };
    const pb = await getPocketBase();
    const updated = await pb.collection("webhook_tokens").update(id, body);
    reply.send(updated);
  });

  app.delete("/webhooks/:id", async (req, reply) => {
    await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const pb = await getPocketBase();
    await pb.collection("webhook_tokens").delete(id);
    reply.code(204).send();
  });

  app.get("/stats", async (req, reply) => {
    await app.requireAuth(req);
    const pb = await getPocketBase();
    const collections = [
      "projects",
      "tasks",
      "changes",
      "services",
      "assets",
      "documentation",
      "decisions",
      "incidents",
      "runbooks",
      "maintenance",
      "events",
    ];
    const counts: Record<string, number> = {};
    await Promise.all(
      collections.map(async (c) => {
        try {
          const r = await pb.collection(c).getList(1, 1);
          counts[c] = r.totalItems;
        } catch {
          counts[c] = 0;
        }
      }),
    );
    reply.send({
      counts,
      uptimeSeconds: Math.floor(process.uptime()),
      rallyVersion: "0.1.0",
      nodeVersion: process.version,
    });
  });
}
