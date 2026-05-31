import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { ZodSchema } from "zod";
import { ClientResponseError } from "pocketbase";
import { getPocketBase } from "../pocketbase.js";
import { recordTimelineEntry, deleteTimelineEntriesFor, type TimelineEntityType } from "../services/timeline.service.js";

interface RecordLike {
  id: string;
  [key: string]: unknown;
}

export interface CrudOptions {
  collection: string;
  createSchema: ZodSchema;
  updateSchema: ZodSchema;
  /** Fields to expand when fetching. */
  expand?: string;
  /** Default sort order, e.g. "-created" */
  defaultSort?: string;
  /** Timeline entity_type, if this entity should appear in timeline */
  timelineType?: TimelineEntityType;
  /** Field to use for timeline title */
  timelineTitleField?: string;
  /** Field to use for timeline description */
  timelineDescriptionField?: string;
  /** Inject the authenticated user id into this field on create */
  ownerField?: string;
  /** PocketBase filter to apply when listing (built from query params) */
  buildListFilter?: (req: FastifyRequest) => string | undefined;
  /** Hook called after create */
  afterCreate?: (record: RecordLike, req: FastifyRequest) => Promise<void>;
  /** Hook called after update */
  afterUpdate?: (record: RecordLike, req: FastifyRequest) => Promise<void>;
  /** Hook called before delete */
  beforeDelete?: (record: RecordLike, req: FastifyRequest) => Promise<void>;
}

export interface ListQuery {
  page?: string;
  perPage?: string;
  sort?: string;
  filter?: string;
}

export function registerCrud(app: FastifyInstance, opts: CrudOptions): void {
  const expandQ = opts.expand ? { expand: opts.expand } : {};

  app.get("/", async (req: FastifyRequest, reply: FastifyReply) => {
    await app.requireAuth(req);
    const q = req.query as ListQuery;
    const page = Math.max(1, Number(q.page) || 1);
    const perPage = Math.min(200, Math.max(1, Number(q.perPage) || 50));
    const sort = q.sort || opts.defaultSort || "-created";
    const customFilter = opts.buildListFilter?.(req);
    const filter = [q.filter, customFilter].filter(Boolean).join(" && ");
    const pb = await getPocketBase();
    const listOpts: Record<string, unknown> = { sort };
    if (filter) listOpts.filter = filter;
    if (opts.expand) listOpts.expand = opts.expand;
    try {
      const result = await pb.collection(opts.collection).getList(page, perPage, listOpts);
      reply.send(result);
    } catch (err) {
      // If PB rejected the expand (e.g. relation field missing on legacy schema), retry without it.
      if (opts.expand && err instanceof ClientResponseError && err.status === 400) {
        app.log.warn(
          { collection: opts.collection, expand: opts.expand, message: err.message, data: err.response?.data },
          "list with expand returned 400, retrying without expand",
        );
        const retryOpts = { ...listOpts };
        delete retryOpts.expand;
        const result = await pb.collection(opts.collection).getList(page, perPage, retryOpts);
        reply.send(result);
        return;
      }
      app.log.error(
        {
          collection: opts.collection,
          listOpts,
          page,
          perPage,
          err: err instanceof Error ? { message: err.message, name: err.name } : err,
          response: (err as { response?: unknown }).response,
        },
        "list failed",
      );
      throw err;
    }
  });

  app.post("/", async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await app.requireAuth(req);
    const data = opts.createSchema.parse(req.body) as Record<string, unknown>;
    if (opts.ownerField && !data[opts.ownerField]) data[opts.ownerField] = user.id;
    const pb = await getPocketBase();
    const record = (await pb.collection(opts.collection).create(data, expandQ)) as unknown as RecordLike;

    if (opts.timelineType) {
      const title = String(record[opts.timelineTitleField ?? "title"] ?? "");
      const description = String(record[opts.timelineDescriptionField ?? "description"] ?? "");
      await recordTimelineEntry({
        entity_type: opts.timelineType,
        entity_id: record.id,
        title,
        description,
        project: (record.project as string) || null,
        services: (record.services as string[]) || [],
        assets: (record.assets as string[]) || [],
      }).catch(() => {});
    }

    await opts.afterCreate?.(record, req);
    reply.code(201).send(record);
  });

  app.get("/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const pb = await getPocketBase();
    const record = await pb.collection(opts.collection).getOne(id, expandQ);
    reply.send(record);
  });

  app.put("/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const data = opts.updateSchema.parse(req.body) as Record<string, unknown>;
    const pb = await getPocketBase();
    const record = (await pb.collection(opts.collection).update(id, data, expandQ)) as unknown as RecordLike;
    await opts.afterUpdate?.(record, req);
    reply.send(record);
  });

  app.patch("/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const data = opts.updateSchema.parse(req.body) as Record<string, unknown>;
    const pb = await getPocketBase();
    const record = (await pb.collection(opts.collection).update(id, data, expandQ)) as unknown as RecordLike;
    await opts.afterUpdate?.(record, req);
    reply.send(record);
  });

  app.delete("/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    await app.requireAuth(req);
    const { id } = req.params as { id: string };
    const pb = await getPocketBase();
    if (opts.beforeDelete) {
      try {
        const record = (await pb.collection(opts.collection).getOne(id)) as unknown as RecordLike;
        await opts.beforeDelete(record, req);
      } catch {
        // record might not exist
      }
    }
    await pb.collection(opts.collection).delete(id);
    if (opts.timelineType) {
      await deleteTimelineEntriesFor(opts.timelineType, id).catch(() => {});
    }
    reply.code(204).send();
  });
}
