import type { FastifyInstance } from "fastify";
import { registerCrud } from "./_crud.js";
import { docCreateSchema, docUpdateSchema } from "../schemas/index.js";
import { getPocketBase } from "../pocketbase.js";

export async function registerDocsRoutes(app: FastifyInstance): Promise<void> {
  // Important: register sub-routes first since registerCrud claims "/:id"
  app.get("/due-review", async (req, reply) => {
    await app.requireAuth(req);
    const pb = await getPocketBase();
    const list = await pb.collection("documentation").getFullList({
      filter: `review_interval_days > 0`,
      sort: "last_reviewed",
    });
    const now = Date.now();
    const overdue = list.filter((d) => {
      const r = d as unknown as { last_reviewed?: string; review_interval_days?: number };
      const interval = r.review_interval_days || 0;
      if (!interval) return false;
      if (!r.last_reviewed) return true;
      const reviewed = new Date(r.last_reviewed).getTime();
      return now - reviewed > interval * 86_400_000;
    });
    reply.send({ items: overdue });
  });

  app.post("/:id/mark-reviewed", async (req, reply) => {
    await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const pb = await getPocketBase();
    const updated = await pb.collection("documentation").update(id, {
      last_reviewed: new Date().toISOString(),
    });
    reply.send(updated);
  });

  app.get("/:id/history", async (req, reply) => {
    await app.requireAuth(req);
    // PocketBase doesn't track versions by default; return an empty array (no fabrication).
    reply.send({ items: [] });
  });

  registerCrud(app, {
    collection: "documentation",
    createSchema: docCreateSchema,
    updateSchema: docUpdateSchema,
    expand: "services,assets,projects,created_by",
    ownerField: "created_by",
    timelineType: "documentation",
    timelineTitleField: "title",
    timelineDescriptionField: "content_text",
    defaultSort: "-updated",
  });
}
