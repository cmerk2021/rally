import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { initSchema } from "./db/init.js";
import corsPlugin from "./plugins/cors.js";
import errorHandler from "./plugins/error-handler.js";
import authPlugin from "./plugins/auth.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerProjectsRoutes } from "./routes/projects.js";
import { registerTasksRoutes } from "./routes/tasks.js";
import { registerChangesRoutes } from "./routes/changes.js";
import { registerServicesRoutes } from "./routes/services.js";
import { registerAssetsRoutes } from "./routes/assets.js";
import { registerDocsRoutes } from "./routes/docs.js";
import { registerDecisionsRoutes } from "./routes/decisions.js";
import { registerIncidentsRoutes } from "./routes/incidents.js";
import { registerRunbooksRoutes } from "./routes/runbooks.js";
import { registerMaintenanceRoutes } from "./routes/maintenance.js";
import { registerTimelineRoutes } from "./routes/timeline.js";
import { registerSearchRoutes } from "./routes/search.js";
import { registerEventsRoutes } from "./routes/events.js";
import { registerAIRoutes } from "./routes/ai.js";
import { registerSettingsRoutes } from "./routes/settings.js";
import { registerWebhookRoutes } from "./routes/webhooks.js";

async function buildServer() {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === "production" ? "info" : "debug",
      transport:
        config.nodeEnv === "production"
          ? undefined
          : {
              target: "pino-pretty",
              options: { colorize: true, translateTime: "HH:MM:ss" },
            },
    },
    bodyLimit: 10 * 1024 * 1024,
  });

  await app.register(corsPlugin);
  await app.register(errorHandler);
  await app.register(authPlugin);

  // Health check
  app.get("/api/health", async () => ({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }));

  // Webhooks at /api/webhooks/:token (must be inside /api but not under v1)
  await app.register(registerWebhookRoutes, { prefix: "/api" });

  // All v1 routes
  const v1 = "/api/v1";
  await app.register(registerAuthRoutes, { prefix: `${v1}/auth` });
  await app.register(registerProjectsRoutes, { prefix: `${v1}/projects` });
  await app.register(registerTasksRoutes, { prefix: `${v1}/tasks` });
  await app.register(registerChangesRoutes, { prefix: `${v1}/changes` });
  await app.register(registerServicesRoutes, { prefix: `${v1}/services` });
  await app.register(registerAssetsRoutes, { prefix: `${v1}/assets` });
  await app.register(registerDocsRoutes, { prefix: `${v1}/docs` });
  await app.register(registerDecisionsRoutes, { prefix: `${v1}/decisions` });
  await app.register(registerIncidentsRoutes, { prefix: `${v1}/incidents` });
  await app.register(registerRunbooksRoutes, { prefix: `${v1}/runbooks` });
  await app.register(registerMaintenanceRoutes, { prefix: `${v1}/maintenance` });
  await app.register(registerTimelineRoutes, { prefix: `${v1}/timeline` });
  await app.register(registerSearchRoutes, { prefix: `${v1}/search` });
  await app.register(registerEventsRoutes, { prefix: `${v1}/events` });
  await app.register(registerAIRoutes, { prefix: `${v1}/ai` });
  await app.register(registerSettingsRoutes, { prefix: `${v1}/settings` });

  // Serve frontend static files + SPA fallback (production)
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const publicDir =
    config.publicDir ?? path.resolve(__dirname, "..", "public");
  if (fs.existsSync(publicDir)) {
    await app.register(fastifyStatic, {
      root: publicDir,
      prefix: "/",
      decorateReply: true,
    });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith("/api")) {
        reply.code(404).send({
          error: { code: "not_found", message: `Route ${req.method} ${req.url} not found` },
        });
        return;
      }
      // SPA fallback
      reply.type("text/html").sendFile("index.html");
    });
    app.log.info(`[static] Serving frontend from ${publicDir}`);
  } else {
    app.log.info(`[static] No public dir at ${publicDir} — frontend served separately`);
  }

  return app;
}

async function main() {
  const app = await buildServer();

  // Initialise PocketBase schema with retries (PB might be starting up)
  let attempts = 0;
  while (attempts < 30) {
    try {
      await initSchema((m) => app.log.info(m));
      break;
    } catch (err) {
      attempts++;
      if (attempts >= 30) {
        app.log.error({ err }, "Failed to initialise PocketBase schema");
        throw err;
      }
      app.log.warn(
        `[schema] PocketBase not ready (attempt ${attempts}/30): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`🚀 Rally backend listening on http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down...`);
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
