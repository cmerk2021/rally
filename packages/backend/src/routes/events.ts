import type { FastifyInstance } from "fastify";
import { getPocketBase } from "../pocketbase.js";
import { eventStatusUpdateSchema, eventConvertSchema } from "../schemas/index.js";

export async function registerEventsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/unread-count", async (req, reply) => {
    await app.requireAuth(req);
    const pb = await getPocketBase();
    const list = await pb.collection("events").getList(1, 1, { filter: 'status="unread"' });
    reply.send({ count: list.totalItems });
  });

  app.get("/", async (req, reply) => {
    await app.requireAuth(req);
    const q = req.query as Record<string, string | undefined>;
    const page = Math.max(1, Number(q.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(q.perPage) || 50));
    const parts: string[] = [];
    if (q.status) parts.push(`status="${q.status}"`);
    if (q.source) parts.push(`source="${q.source}"`);
    const pb = await getPocketBase();
    const result = await pb.collection("events").getList(page, perPage, {
      filter: parts.join(" && ") || undefined,
      sort: "-received_at",
    });
    reply.send(result);
  });

  app.get("/:id", async (req, reply) => {
    await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const pb = await getPocketBase();
    const record = await pb.collection("events").getOne(id);
    reply.send(record);
  });

  app.put("/:id/status", async (req, reply) => {
    await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const { status } = eventStatusUpdateSchema.parse(req.body);
    const pb = await getPocketBase();
    const updated = await pb.collection("events").update(id, { status });
    reply.send(updated);
  });

  app.post("/:id/convert", async (req, reply) => {
    const user = await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const { target, payload } = eventConvertSchema.parse(req.body);
    const pb = await getPocketBase();
    const event = await pb.collection("events").getOne(id);
    const ev = event as unknown as { title: string; body: string };

    let createdId = "";
    if (target === "task") {
      const created = await pb.collection("tasks").create({
        title: (payload.title as string) || ev.title,
        description: (payload.description as string) || ev.body,
        status: "todo",
        priority: (payload.priority as string) || "medium",
        services: (payload.services as string[]) || [],
        assets: (payload.assets as string[]) || [],
        project: (payload.project as string) || "",
        assignee: user.id,
      });
      createdId = created.id;
    } else if (target === "incident") {
      const created = await pb.collection("incidents").create({
        title: (payload.title as string) || ev.title,
        description: (payload.description as string) || ev.body,
        status: "investigating",
        severity: (payload.severity as string) || "medium",
        started_at: new Date().toISOString(),
        services: (payload.services as string[]) || [],
        assets: (payload.assets as string[]) || [],
        created_by: user.id,
      });
      createdId = created.id;
    } else {
      const created = await pb.collection("changes").create({
        title: (payload.title as string) || ev.title,
        description: (payload.description as string) || ev.body,
        summary: (payload.summary as string) || "",
        change_type: (payload.change_type as string) || "other",
        services: (payload.services as string[]) || [],
        assets: (payload.assets as string[]) || [],
        created_by: user.id,
      });
      createdId = created.id;
    }
    await pb.collection("events").update(id, {
      status: "converted",
      converted_to: `${target}:${createdId}`,
    });
    reply.send({ ok: true, target, id: createdId });
  });

  app.delete("/:id", async (req, reply) => {
    await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const pb = await getPocketBase();
    await pb.collection("events").delete(id);
    reply.code(204).send();
  });
}
