import type { FastifyInstance, FastifyRequest } from "fastify";
import { getPocketBase } from "../pocketbase.js";
import { normalizeEvent } from "../services/event.service.js";

export async function registerWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.post("/webhooks/:token", async (req: FastifyRequest, reply) => {
    const { token } = req.params as { token: string };
    const pb = await getPocketBase();
    let tokenRecord;
    try {
      tokenRecord = await pb
        .collection("webhook_tokens")
        .getFirstListItem(`token="${token}" && enabled=true`);
    } catch {
      reply.code(404).send({ error: { code: "invalid_token", message: "Unknown or disabled token" } });
      return;
    }
    const sourceHint = (tokenRecord as unknown as { source_hint: string }).source_hint;
    const normalized = normalizeEvent(req.body, req.headers, sourceHint);
    await pb.collection("events").create({
      source: normalized.source,
      event_type: normalized.event_type,
      title: normalized.title,
      body: normalized.body,
      status: "unread",
      received_at: new Date().toISOString(),
    });
    await pb
      .collection("webhook_tokens")
      .update(tokenRecord.id, { last_used: new Date().toISOString() })
      .catch(() => {});
    reply.send({ ok: true });
  });
}
