import type { FastifyInstance } from "fastify";
import { registerCrud } from "./_crud.js";
import { projectCreateSchema, projectUpdateSchema } from "../schemas/index.js";
import { getPocketBase } from "../pocketbase.js";

export async function registerProjectsRoutes(app: FastifyInstance): Promise<void> {
  registerCrud(app, {
    collection: "projects",
    createSchema: projectCreateSchema,
    updateSchema: projectUpdateSchema,
    expand: "owner",
    ownerField: "owner",
    defaultSort: "-created",
  });

  app.get("/:id/timeline", async (req, reply) => {
    await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const q = req.query as { page?: string; perPage?: string };
    const page = Math.max(1, Number(q.page) || 1);
    const perPage = Math.min(200, Math.max(1, Number(q.perPage) || 50));
    const pb = await getPocketBase();
    const result = await pb.collection("timeline_entries").getList(page, perPage, {
      filter: `project="${id}"`,
      sort: "-event_date",
    });
    reply.send(result);
  });

  app.get("/:id/stats", async (req, reply) => {
    await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const pb = await getPocketBase();
    const [todo, inProgress, blocked, completed, changes, decisions, docs] = await Promise.all([
      pb.collection("tasks").getList(1, 1, { filter: `project="${id}" && status="todo"` }),
      pb.collection("tasks").getList(1, 1, { filter: `project="${id}" && status="in_progress"` }),
      pb.collection("tasks").getList(1, 1, { filter: `project="${id}" && status="blocked"` }),
      pb.collection("tasks").getList(1, 1, { filter: `project="${id}" && status="completed"` }),
      pb.collection("changes").getList(1, 1, { filter: `project="${id}"` }),
      pb.collection("decisions").getList(1, 1, { filter: `projects~"${id}"` }),
      pb.collection("documentation").getList(1, 1, { filter: `projects~"${id}"` }),
    ]);
    reply.send({
      tasks: {
        todo: todo.totalItems,
        in_progress: inProgress.totalItems,
        blocked: blocked.totalItems,
        completed: completed.totalItems,
        total: todo.totalItems + inProgress.totalItems + blocked.totalItems + completed.totalItems,
      },
      changes: changes.totalItems,
      decisions: decisions.totalItems,
      docs: docs.totalItems,
    });
  });
}
