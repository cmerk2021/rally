import type { FastifyInstance } from "fastify";
import { registerCrud } from "./_crud.js";
import { runbookCreateSchema, runbookUpdateSchema } from "../schemas/index.js";

export async function registerRunbooksRoutes(app: FastifyInstance): Promise<void> {
  registerCrud(app, {
    collection: "runbooks",
    createSchema: runbookCreateSchema,
    updateSchema: runbookUpdateSchema,
    expand: "services,assets,created_by",
    ownerField: "created_by",
    defaultSort: "-updated",
  });
}
