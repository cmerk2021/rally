import type { IncomingHttpHeaders } from "node:http";

export interface NormalizedEvent {
  source: string;
  event_type: string;
  title: string;
  body: string;
}

function safeString(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export function normalizeEvent(
  payload: unknown,
  headers: IncomingHttpHeaders,
  tokenSourceHint?: string,
): NormalizedEvent {
  const body = asObject(payload);
  const rawBody = JSON.stringify(body);

  // GitHub: distinctive header
  const githubEvent = headers["x-github-event"];
  if (githubEvent) {
    const repo = asObject(body.repository);
    return {
      source: "github",
      event_type: String(githubEvent),
      title: `GitHub ${githubEvent}: ${safeString(repo.full_name || repo.name, "unknown repo")}${body.action ? ` (${String(body.action)})` : ""}`,
      body: rawBody,
    };
  }

  // Uptime Kuma
  if (body.monitor || body.heartbeat) {
    const monitor = asObject(body.monitor);
    const heartbeat = asObject(body.heartbeat);
    const status = heartbeat.status === 1 ? "UP" : heartbeat.status === 0 ? "DOWN" : safeString(heartbeat.status);
    return {
      source: "uptime_kuma",
      event_type: status === "UP" ? "monitor_up" : "monitor_down",
      title: `${safeString(monitor.name, "Monitor")} is ${status}${body.msg ? ` — ${String(body.msg)}` : ""}`,
      body: rawBody,
    };
  }

  // Grafana
  if (body.alerts || body.ruleName || body.state) {
    const title = safeString(body.title || body.ruleName, "Grafana alert");
    return {
      source: "grafana",
      event_type: safeString(body.state, "alert"),
      title: `Grafana: ${title}${body.message ? ` — ${String(body.message)}` : ""}`,
      body: rawBody,
    };
  }

  // Generic — best-effort title
  const guessTitle =
    safeString(body.title) ||
    safeString(body.subject) ||
    safeString(body.message) ||
    safeString(body.event) ||
    "Webhook event";
  return {
    source: tokenSourceHint || "custom",
    event_type: safeString(body.type || body.event || "generic", "generic"),
    title: guessTitle.slice(0, 250),
    body: rawBody,
  };
}
