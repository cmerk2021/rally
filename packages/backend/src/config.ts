import "dotenv/config";

export interface AIConfig {
  enabled: boolean;
  endpoint: string;
  apiKey: string;
  model: string;
  temperature: number;
}

export interface Config {
  nodeEnv: string;
  port: number;
  host: string;
  pocketbaseUrl: string;
  pocketbaseAdminEmail: string;
  pocketbaseAdminPassword: string;
  jwtSecret: string;
  frontendUrl: string;
  publicDir: string | null;
  ai: AIConfig;
}

function env(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v === undefined || v === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function envBool(name: string, fallback = false): boolean {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  return v === "true" || v === "1" || v === "yes";
}

function envNumber(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  if (Number.isNaN(n)) return fallback;
  return n;
}

export const config: Config = {
  nodeEnv: env("NODE_ENV", "development"),
  port: envNumber("PORT", 3001),
  host: env("HOST", "0.0.0.0"),
  pocketbaseUrl: env("POCKETBASE_URL", "http://localhost:8090"),
  pocketbaseAdminEmail: env("POCKETBASE_ADMIN_EMAIL", "admin@homelab.local"),
  pocketbaseAdminPassword: env(
    "POCKETBASE_ADMIN_PASSWORD",
    "change_me_strong_password",
  ),
  jwtSecret: env(
    "JWT_SECRET",
    "dev_only_secret_change_me_in_production_please_thanks",
  ),
  frontendUrl: env("FRONTEND_URL", "http://localhost:5173"),
  publicDir: process.env.PUBLIC_DIR ?? null,
  ai: {
    enabled: envBool("AI_ENABLED", false),
    endpoint: env("AI_ENDPOINT", "http://localhost:11434/v1"),
    apiKey: env("AI_API_KEY", ""),
    model: env("AI_MODEL", "llama3.1:8b"),
    temperature: envNumber("AI_TEMPERATURE", 0.2),
  },
};
