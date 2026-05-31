import type { FastifyInstance } from "fastify";
import { registerCrud } from "./_crud.js";
import { maintenanceCreateSchema, maintenanceUpdateSchema } from "../schemas/index.js";
import { getPocketBase } from "../pocketbase.js";
import { recordTimelineEntry } from "../services/timeline.service.js";

export async function registerMaintenanceRoutes(app: FastifyInstance): Promise<void> {
  registerCrud(app, {
    collection: "maintenance",
    createSchema: maintenanceCreateSchema,
    updateSchema: maintenanceUpdateSchema,
    expand: "services,assets,created_by",
    ownerField: "created_by",
    timelineType: "maintenance",
    timelineTitleField: "title",
    timelineDescriptionField: "description",
    defaultSort: "-start_time",
  });

  app.post("/:id/start", async (req, reply) => {
    await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const pb = await getPocketBase();
    const updated = await pb.collection("maintenance").update(id, {
      status: "in_progress",
    });
    reply.send(updated);
  });

  app.post("/:id/complete", async (req, reply) => {
    const user = await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const body = (req.body || {}) as { actual_notes?: string; create_change?: boolean };
    const pb = await getPocketBase();
    const updated = await pb.collection("maintenance").update(
      id,
      {
        status: "completed",
        end_time: new Date().toISOString(),
        ...(body.actual_notes !== undefined && { actual_notes: body.actual_notes }),
      },
      { expand: "services,assets" },
    );
    const m = updated as unknown as {
      id: string;
      title: string;
      description: string;
      services: string[];
      assets: string[];
    };
    await recordTimelineEntry({
      entity_type: "maintenance",
      entity_id: m.id,
      title: `Completed maintenance: ${m.title}`,
      description: body.actual_notes || m.description,
      services: m.services || [],
      assets: m.assets || [],
    }).catch(() => {});

    if (body.create_change) {
      await pb.collection("changes").create({
        title: `Maintenance: ${m.title}`,
        description: m.description,
        summary: body.actual_notes || "",
        change_type: "maintenance",
        services: m.services || [],
        assets: m.assets || [],
        created_by: user.id,
      });
    }
    reply.send(updated);
  });
}
