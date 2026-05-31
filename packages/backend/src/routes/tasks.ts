import type { FastifyInstance } from "fastify";
import { registerCrud } from "./_crud.js";
import { taskCreateSchema, taskUpdateSchema } from "../schemas/index.js";
import { getPocketBase } from "../pocketbase.js";
import { aiService } from "../services/ai.service.js";
import { recordTimelineEntry } from "../services/timeline.service.js";

export async function registerTasksRoutes(app: FastifyInstance): Promise<void> {
  registerCrud(app, {
    collection: "tasks",
    createSchema: taskCreateSchema,
    updateSchema: taskUpdateSchema,
    expand: "project,services,assets,assignee",
    defaultSort: "-created",
    buildListFilter: (req) => {
      const q = req.query as Record<string, string | undefined>;
      const parts: string[] = [];
      if (q.project) parts.push(`project="${q.project}"`);
      if (q.status) parts.push(`status="${q.status}"`);
      if (q.priority) parts.push(`priority="${q.priority}"`);
      if (q.assignee) parts.push(`assignee="${q.assignee}"`);
      return parts.length ? parts.join(" && ") : undefined;
    },
  });

  app.post("/:id/complete", async (req, reply) => {
    const user = await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const pb = await getPocketBase();
    const updated = await pb.collection("tasks").update(
      id,
      { status: "completed", completed_at: new Date().toISOString() },
      { expand: "project,services,assets" },
    );

    const t = updated as unknown as {
      id: string;
      title: string;
      description: string;
      project: string;
      services: string[];
      assets: string[];
      expand?: {
        services?: Array<{ id: string; name: string; category?: string }>;
        assets?: Array<{ id: string; name: string; type?: string }>;
      };
    };

    await recordTimelineEntry({
      entity_type: "task",
      entity_id: t.id,
      title: `Completed task: ${t.title}`,
      description: t.description,
      project: t.project || null,
      services: t.services || [],
      assets: t.assets || [],
    }).catch(() => {});

    let suggestion: { id: string; content: string } | null = null;
    const aiAvailable = await aiService.isAvailable();
    if (aiAvailable) {
      try {
        const summary = await aiService.generateChangeSummary(
          { title: t.title, description: t.description },
          t.expand?.services || [],
          t.expand?.assets || [],
        );
        const sugg = await pb.collection("ai_suggestions").create({
          suggestion_type: "change_summary",
          title: `Suggested change record for: ${t.title}`,
          content: summary,
          status: "pending",
          related_entity_type: "task",
          related_entity_id: t.id,
          created_by_task: t.id,
        });
        suggestion = { id: sugg.id, content: summary };
      } catch {
        suggestion = null;
      }
    }
    void user;
    reply.send({ task: updated, suggestion });
  });

  app.post("/:id/reopen", async (req, reply) => {
    await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const pb = await getPocketBase();
    const updated = await pb.collection("tasks").update(id, {
      status: "todo",
      completed_at: null,
    });
    reply.send(updated);
  });
}
