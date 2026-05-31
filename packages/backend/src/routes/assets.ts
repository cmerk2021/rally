import type { FastifyInstance } from "fastify";
import { registerCrud } from "./_crud.js";
import { assetCreateSchema, assetUpdateSchema } from "../schemas/index.js";
import { getPocketBase } from "../pocketbase.js";

export async function registerAssetsRoutes(app: FastifyInstance): Promise<void> {
  registerCrud(app, {
    collection: "assets",
    createSchema: assetCreateSchema,
    updateSchema: assetUpdateSchema,
    expand: "owner",
    ownerField: "owner",
    defaultSort: "name",
    buildListFilter: (req) => {
      const q = req.query as Record<string, string | undefined>;
      const parts: string[] = [];
      if (q.type) parts.push(`type="${q.type}"`);
      if (q.status) parts.push(`status="${q.status}"`);
      return parts.length ? parts.join(" && ") : undefined;
    },
  });

  app.get("/:id/timeline", async (req, reply) => {
    await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const pb = await getPocketBase();
    const result = await pb.collection("timeline_entries").getList(1, 100, {
      filter: `assets~"${id}"`,
      sort: "-event_date",
    });
    reply.send(result);
  });
}
