import type { FastifyInstance } from "fastify";
import { registerCrud } from "./_crud.js";
import { decisionCreateSchema, decisionUpdateSchema } from "../schemas/index.js";

export async function registerDecisionsRoutes(app: FastifyInstance): Promise<void> {
  registerCrud(app, {
    collection: "decisions",
    createSchema: decisionCreateSchema,
    updateSchema: decisionUpdateSchema,
    expand: "projects,services,assets,created_by",
    ownerField: "created_by",
    timelineType: "decision",
    timelineTitleField: "title",
    timelineDescriptionField: "decision",
    defaultSort: "-created",
    buildListFilter: (req) => {
      const q = req.query as Record<string, string | undefined>;
      const parts: string[] = [];
      if (q.project) parts.push(`projects~"${q.project}"`);
      if (q.from) parts.push(`date>="${q.from}"`);
      if (q.to) parts.push(`date<="${q.to}"`);
      return parts.length ? parts.join(" && ") : undefined;
    },
  });
}
