import type { FastifyInstance } from "fastify";
import { registerCrud } from "./_crud.js";
import { incidentCreateSchema, incidentUpdateSchema } from "../schemas/index.js";
import { getPocketBase } from "../pocketbase.js";
import { recordTimelineEntry } from "../services/timeline.service.js";

export async function registerIncidentsRoutes(app: FastifyInstance): Promise<void> {
  registerCrud(app, {
    collection: "incidents",
    createSchema: incidentCreateSchema,
    updateSchema: incidentUpdateSchema,
    expand: "services,assets,related_changes,created_by",
    ownerField: "created_by",
    timelineType: "incident",
    timelineTitleField: "title",
    timelineDescriptionField: "description",
    defaultSort: "-created",
    buildListFilter: (req) => {
      const q = req.query as Record<string, string | undefined>;
      const parts: string[] = [];
      if (q.status) parts.push(`status="${q.status}"`);
      if (q.severity) parts.push(`severity="${q.severity}"`);
      return parts.length ? parts.join(" && ") : undefined;
    },
  });

  app.post("/:id/resolve", async (req, reply) => {
    await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const body = (req.body || {}) as { root_cause?: string; resolution?: string; impact?: string };
    const pb = await getPocketBase();
    const updated = await pb.collection("incidents").update(id, {
      status: "resolved",
      resolved_at: new Date().toISOString(),
      ...(body.root_cause !== undefined && { root_cause: body.root_cause }),
      ...(body.resolution !== undefined && { resolution: body.resolution }),
      ...(body.impact !== undefined && { impact: body.impact }),
    });
    const u = updated as unknown as { id: string; title: string; services: string[]; assets: string[] };
    await recordTimelineEntry({
      entity_type: "incident",
      entity_id: u.id,
      title: `Resolved incident: ${u.title}`,
      description: body.resolution || "",
      services: u.services || [],
      assets: u.assets || [],
    }).catch(() => {});
    reply.send(updated);
  });
}
