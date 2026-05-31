import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { registerCrud } from "./_crud.js";
import { serviceCreateSchema, serviceUpdateSchema } from "../schemas/index.js";
import { getPocketBase } from "../pocketbase.js";

export async function registerServicesRoutes(app: FastifyInstance): Promise<void> {
  registerCrud(app, {
    collection: "services",
    createSchema: serviceCreateSchema,
    updateSchema: serviceUpdateSchema,
    expand: "assets,dependencies,owner",
    ownerField: "owner",
    defaultSort: "name",
    buildListFilter: (req) => {
      const q = req.query as Record<string, string | undefined>;
      const parts: string[] = [];
      if (q.category) parts.push(`category="${q.category}"`);
      if (q.status) parts.push(`status="${q.status}"`);
      return parts.length ? parts.join(" && ") : undefined;
    },
  });

  app.get("/:id/timeline", async (req, reply) => {
    await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const pb = await getPocketBase();
    const result = await pb.collection("timeline_entries").getList(1, 100, {
      filter: `services~"${id}"`,
      sort: "-event_date",
    });
    reply.send(result);
  });

  app.get("/:id/graph", async (req, reply) => {
    await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const pb = await getPocketBase();
    const root = await pb
      .collection("services")
      .getOne(id, { expand: "dependencies" });

    interface ServiceNode {
      id: string;
      name: string;
      status: string;
      category: string;
    }
    const visited = new Map<string, ServiceNode>();
    const edges: Array<{ from: string; to: string }> = [];

    async function walk(serviceId: string, depth: number): Promise<void> {
      if (visited.has(serviceId) || depth > 3) return;
      const node = await pb
        .collection("services")
        .getOne(serviceId, { expand: "dependencies" })
        .catch(() => null);
      if (!node) return;
      const n = node as unknown as ServiceNode & {
        dependencies?: string[];
      };
      visited.set(serviceId, {
        id: serviceId,
        name: n.name,
        status: n.status,
        category: n.category,
      });
      const deps = (n.dependencies as string[]) || [];
      for (const depId of deps) {
        edges.push({ from: serviceId, to: depId });
        await walk(depId, depth + 1);
      }
    }
    await walk(root.id, 0);

    // Also find dependents
    const dependents = await pb
      .collection("services")
      .getFullList({ filter: `dependencies~"${id}"` });
    for (const d of dependents) {
      const dn = d as unknown as ServiceNode;
      if (!visited.has(d.id)) {
        visited.set(d.id, { id: d.id, name: dn.name, status: dn.status, category: dn.category });
      }
      edges.push({ from: d.id, to: id });
    }

    reply.send({
      nodes: Array.from(visited.values()),
      edges,
      root: id,
    });
  });

  app.put("/:id/dependencies", async (req, reply) => {
    await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const body = z.object({ dependencies: z.array(z.string()) }).parse(req.body);
    const pb = await getPocketBase();
    const updated = await pb.collection("services").update(id, {
      dependencies: body.dependencies,
    });
    reply.send(updated);
  });
}
