import type { FastifyInstance } from "fastify";
import { registerCrud } from "./_crud.js";
import { changeCreateSchema, changeUpdateSchema } from "../schemas/index.js";
import { getPocketBase } from "../pocketbase.js";
import { aiService } from "../services/ai.service.js";

export async function registerChangesRoutes(app: FastifyInstance): Promise<void> {
  registerCrud(app, {
    collection: "changes",
    createSchema: changeCreateSchema,
    updateSchema: changeUpdateSchema,
    expand: "project,services,assets,source_task,created_by",
    defaultSort: "-created",
    ownerField: "created_by",
    timelineType: "change",
    timelineTitleField: "title",
    timelineDescriptionField: "summary",
    buildListFilter: (req) => {
      const q = req.query as Record<string, string | undefined>;
      const parts: string[] = [];
      if (q.project) parts.push(`project="${q.project}"`);
      if (q.service) parts.push(`services~"${q.service}"`);
      if (q.asset) parts.push(`assets~"${q.asset}"`);
      if (q.change_type) parts.push(`change_type="${q.change_type}"`);
      if (q.from) parts.push(`created>="${q.from}"`);
      if (q.to) parts.push(`created<="${q.to}"`);
      return parts.length ? parts.join(" && ") : undefined;
    },
  });

  app.post("/:id/generate-summary", async (req, reply) => {
    await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const pb = await getPocketBase();
    const change = await pb
      .collection("changes")
      .getOne(id, { expand: "services,assets" });
    const ch = change as unknown as {
      title: string;
      description: string;
      expand?: {
        services?: Array<{ name: string; category?: string }>;
        assets?: Array<{ name: string; type?: string }>;
      };
    };
    const available = await aiService.isAvailable();
    if (!available) {
      reply.code(503).send({ error: { code: "ai_unavailable", message: "AI is not configured or reachable" } });
      return;
    }
    const summary = await aiService.generateChangeSummary(
      { title: ch.title, description: ch.description },
      ch.expand?.services || [],
      ch.expand?.assets || [],
    );
    const updated = await pb.collection("changes").update(id, { summary });
    reply.send(updated);
  });
}
