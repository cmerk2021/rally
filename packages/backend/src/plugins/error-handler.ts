import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { ClientResponseError } from "pocketbase";
import { ZodError } from "zod";

interface ApiError {
  error: { code: string; message: string; details?: unknown };
}

export default fp(async function errorHandler(app: FastifyInstance) {
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) {
      const body: ApiError = {
        error: {
          code: "validation_error",
          message: "Invalid request payload",
          details: err.flatten(),
        },
      };
      reply.code(400).send(body);
      return;
    }
    if (err instanceof ClientResponseError) {
      const status = err.status || 500;
      const body: ApiError = {
        error: {
          code: status === 404 ? "not_found" : "pocketbase_error",
          message: err.message,
          details: err.response?.data,
        },
      };
      reply.code(status).send(body);
      return;
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    const body: ApiError = {
      error: {
        code: status === 401 ? "unauthorized" : status === 403 ? "forbidden" : status === 404 ? "not_found" : "internal_error",
        message: err.message || "Internal server error",
      },
    };
    if (status >= 500) app.log.error({ err }, "Unhandled error");
    reply.code(status).send(body);
  });

  app.setNotFoundHandler((req: FastifyRequest, reply) => {
    if (req.url.startsWith("/api")) {
      reply.code(404).send({
        error: { code: "not_found", message: `Route ${req.method} ${req.url} not found` },
      });
      return;
    }
    // SPA fallback: serve index.html for any non-API route so client-side router can handle it.
    // Requires @fastify/static to be registered (decorateReply: true).
    if (typeof reply.sendFile === "function") {
      reply.type("text/html").sendFile("index.html");
      return;
    }
    reply.code(404).send({
      error: { code: "not_found", message: `Route ${req.method} ${req.url} not found` },
    });
  });
});
