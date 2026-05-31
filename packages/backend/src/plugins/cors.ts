import fp from "fastify-plugin";
import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";

export default fp(async function corsPlugin(app: FastifyInstance) {
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      // In dev allow the configured frontend URL plus localhost variants
      const allowed = new Set([
        config.frontendUrl,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
      ]);
      if (allowed.has(origin)) return cb(null, true);
      if (config.nodeEnv !== "production") return cb(null, true);
      cb(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
});
