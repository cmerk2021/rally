import type { FastifyInstance } from "fastify";
import { getPocketBase } from "../pocketbase.js";
import { aiService } from "../services/ai.service.js";
import {
  aiChatSchema,
  aiSuggestRelationshipsSchema,
} from "../schemas/index.js";

export async function registerAIRoutes(app: FastifyInstance): Promise<void> {
  app.get("/status", async (req, reply) => {
    await app.requireAuth(req);
    const cfg = await aiService.getConfig();
    const available = await aiService.isAvailable();
    reply.send({
      enabled: cfg.enabled,
      available,
      endpoint: cfg.endpoint,
      model: cfg.model,
    });
  });

  app.post("/chat", async (req, reply) => {
    await app.requireAuth(req);
    const { message } = aiChatSchema.parse(req.body);
    const pb = await getPocketBase();
    const [changes, services, assets, incidents, decisions] = await Promise.all([
      pb.collection("changes").getList(1, 20, { sort: "-created" }),
      pb.collection("services").getFullList({ sort: "name" }),
      pb.collection("assets").getFullList({ sort: "name" }),
      pb.collection("incidents").getList(1, 20, { filter: 'status != "resolved"' }),
      pb.collection("decisions").getList(1, 10, { sort: "-created" }),
    ]);
    const trim = (rec: Record<string, unknown>) => ({
      id: rec.id,
      title: rec.title || rec.name,
      status: rec.status,
      summary: rec.summary,
      category: rec.category,
      type: rec.type,
    });
    const response = await aiService.chatWithContext(message, {
      recentChanges: changes.items.map((r) => trim(r as Record<string, unknown>)),
      services: services.map((r) => trim(r as Record<string, unknown>)),
      assets: assets.map((r) => trim(r as Record<string, unknown>)),
      openIncidents: incidents.items.map((r) => trim(r as Record<string, unknown>)),
      recentDecisions: decisions.items.map((r) => trim(r as Record<string, unknown>)),
    });
    reply.send({ response });
  });

  app.post("/suggest-relationships", async (req, reply) => {
    await app.requireAuth(req);
    const { title, description } = aiSuggestRelationshipsSchema.parse(req.body);
    if (!(await aiService.isAvailable())) {
      reply.code(503).send({ error: { code: "ai_unavailable", message: "AI not configured" } });
      return;
    }
    const pb = await getPocketBase();
    const [services, assets] = await Promise.all([
      pb.collection("services").getFullList(),
      pb.collection("assets").getFullList(),
    ]);
    const result = await aiService.suggestRelationships(
      title,
      description,
      services.map((s) => {
        const r = s as unknown as { id: string; name: string; category?: string };
        return { id: r.id, name: r.name, category: r.category };
      }),
      assets.map((a) => {
        const r = a as unknown as { id: string; name: string; type?: string };
        return { id: r.id, name: r.name, type: r.type };
      }),
    );
    reply.send(result);
  });

  app.get("/suggestions", async (req, reply) => {
    await app.requireAuth(req);
    const q = req.query as { status?: string };
    const pb = await getPocketBase();
    const filter = q.status ? `status="${q.status}"` : `status="pending"`;
    const list = await pb.collection("ai_suggestions").getList(1, 100, {
      filter,
      sort: "-created",
    });
    reply.send(list);
  });

  app.put("/suggestions/:id/accept", async (req, reply) => {
    await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const pb = await getPocketBase();
    const updated = await pb.collection("ai_suggestions").update(id, {
      status: "accepted",
    });
    reply.send(updated);
  });

  app.put("/suggestions/:id/reject", async (req, reply) => {
    await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const pb = await getPocketBase();
    const updated = await pb.collection("ai_suggestions").update(id, {
      status: "rejected",
    });
    reply.send(updated);
  });
}
