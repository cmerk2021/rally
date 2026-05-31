import type { FastifyInstance } from "fastify";
import { globalSearch } from "../services/search.service.js";

export async function registerSearchRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (req, reply) => {
    await app.requireAuth(req);
    const q = req.query as { q?: string };
    if (!q.q) {
      reply.send({ groups: {}, total: 0 });
      return;
    }
    const result = await globalSearch(q.q);
    reply.send(result);
  });
}
