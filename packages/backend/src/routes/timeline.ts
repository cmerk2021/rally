import type { FastifyInstance } from "fastify";
import { getPocketBase } from "../pocketbase.js";

export async function registerTimelineRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (req, reply) => {
    await app.requireAuth(req);
    const q = req.query as Record<string, string | undefined>;
    const page = Math.max(1, Number(q.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(q.perPage) || 30));
    const parts: string[] = [];
    if (q.project) parts.push(`project="${q.project}"`);
    if (q.service) parts.push(`services~"${q.service}"`);
    if (q.asset) parts.push(`assets~"${q.asset}"`);
    if (q.type) {
      const types = q.type.split(",").map((t) => `entity_type="${t}"`);
      parts.push(`(${types.join(" || ")})`);
    }
    if (q.from) parts.push(`event_date>="${q.from}"`);
    if (q.to) parts.push(`event_date<="${q.to}"`);

    const pb = await getPocketBase();
    const result = await pb.collection("timeline_entries").getList(page, perPage, {
      filter: parts.join(" && ") || undefined,
      sort: "-event_date",
      expand: "project,services,assets",
    });
    reply.send(result);
  });
}
