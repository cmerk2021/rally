import { getPocketBase } from "../pocketbase.js";
import { config, type AIConfig } from "../config.js";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

interface ChatCompletionResponse {
  choices: Array<{ message: { role: string; content: string } }>;
}

interface EmbeddingResponse {
  data: Array<{ embedding: number[] }>;
}

export interface DocSuggestion {
  docId: string;
  title: string;
  suggestedChange: string;
}

export interface RelationshipSuggestion {
  services: string[];
  assets: string[];
}

export interface RallyContext {
  recentChanges?: Array<Record<string, unknown>>;
  services?: Array<Record<string, unknown>>;
  assets?: Array<Record<string, unknown>>;
  openIncidents?: Array<Record<string, unknown>>;
  recentDecisions?: Array<Record<string, unknown>>;
}

async function getEffectiveConfig(): Promise<AIConfig> {
  // Pull live values from app_settings (overrides env)
  try {
    const pb = await getPocketBase();
    const result = await pb
      .collection("app_settings")
      .getList(1, 1, { sort: "-created" });
    if (result.items.length > 0) {
      const s = result.items[0] as unknown as Record<string, unknown>;
      return {
        enabled: Boolean(s.ai_enabled),
        endpoint: String(s.ai_endpoint || config.ai.endpoint),
        apiKey: String(s.ai_api_key || config.ai.apiKey),
        model: String(s.ai_model || config.ai.model),
        temperature:
          typeof s.ai_temperature === "number"
            ? (s.ai_temperature as number)
            : config.ai.temperature,
      };
    }
  } catch {
    // fall through
  }
  return config.ai;
}

export class AIService {
  async getConfig(): Promise<AIConfig> {
    return getEffectiveConfig();
  }

  async isAvailable(): Promise<boolean> {
    const cfg = await this.getConfig();
    if (!cfg.enabled || !cfg.endpoint) return false;
    try {
      const res = await fetch(`${cfg.endpoint.replace(/\/$/, "")}/models`, {
        headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {},
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async testConnection(
    override?: Partial<AIConfig>,
  ): Promise<{ ok: boolean; message: string; latencyMs?: number; sample?: string }> {
    const base = await this.getConfig();
    const cfg: AIConfig = { ...base, ...override };
    if (!cfg.endpoint) return { ok: false, message: "No endpoint configured" };
    const start = Date.now();
    try {
      const res = await this.rawCompletion(
        [
          { role: "system", content: "You are a connectivity test." },
          { role: "user", content: "Reply with the single word OK." },
        ],
        { temperature: 0 },
        cfg,
      );
      const latency = Date.now() - start;
      return {
        ok: true,
        message: `Connected to ${cfg.model}`,
        latencyMs: latency,
        sample: res.slice(0, 200),
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Connection failed",
      };
    }
  }

  private async rawCompletion(
    messages: ChatMessage[],
    options: ChatOptions,
    cfgOverride?: AIConfig,
  ): Promise<string> {
    const cfg = cfgOverride ?? (await this.getConfig());
    const url = `${cfg.endpoint.replace(/\/$/, "")}/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: options.temperature ?? cfg.temperature,
        max_tokens: options.maxTokens ?? 1000,
        stream: false,
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`AI request failed (${res.status}): ${text}`);
    }
    const json = (await res.json()) as ChatCompletionResponse;
    return json.choices?.[0]?.message?.content ?? "";
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    return this.rawCompletion(messages, options);
  }

  async *stream(
    messages: ChatMessage[],
    options: ChatOptions = {},
  ): AsyncGenerator<string, void, unknown> {
    const cfg = await this.getConfig();
    const url = `${cfg.endpoint.replace(/\/$/, "")}/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: options.temperature ?? cfg.temperature,
        max_tokens: options.maxTokens ?? 1000,
        stream: true,
      }),
    });
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(`AI stream failed (${res.status}): ${text}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // skip parse errors
        }
      }
    }
  }

  async embeddings(text: string): Promise<number[]> {
    const cfg = await this.getConfig();
    const url = `${cfg.endpoint.replace(/\/$/, "")}/embeddings`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({ model: cfg.model, input: text }),
    });
    if (!res.ok) throw new Error(`Embeddings failed: ${res.status}`);
    const json = (await res.json()) as EmbeddingResponse;
    return json.data?.[0]?.embedding ?? [];
  }

  async generateChangeSummary(
    task: { title: string; description?: string },
    relatedServices: Array<{ name: string; category?: string }>,
    relatedAssets: Array<{ name: string; type?: string }>,
  ): Promise<string> {
    const services = relatedServices.map((s) => `- ${s.name}${s.category ? ` (${s.category})` : ""}`).join("\n") || "(none)";
    const assets = relatedAssets.map((a) => `- ${a.name}${a.type ? ` (${a.type})` : ""}`).join("\n") || "(none)";
    const userMsg = `Task title: ${task.title}\n\nTask description:\n${task.description || "(none)"}\n\nRelated services:\n${services}\n\nRelated assets:\n${assets}`;
    return this.chat(
      [
        {
          role: "system",
          content:
            "You are an operational assistant for a homelab. Given a completed task and its related infrastructure, write a concise, factual operational summary suitable for a change log. Focus on what changed, what was affected, and any important context. Be specific and technical. 2-4 sentences maximum.",
        },
        { role: "user", content: userMsg },
      ],
      { temperature: 0.2, maxTokens: 400 },
    );
  }

  async generateDocSuggestions(
    task: { title: string; description?: string },
    relatedDocs: Array<{ id: string; title: string; content_text?: string }>,
    relatedServices: Array<{ name: string }>,
  ): Promise<DocSuggestion[]> {
    if (relatedDocs.length === 0) return [];
    const docs = relatedDocs
      .map((d) => `id=${d.id} | ${d.title} | ${(d.content_text || "").slice(0, 200)}`)
      .join("\n");
    const services = relatedServices.map((s) => s.name).join(", ");
    const response = await this.chat(
      [
        {
          role: "system",
          content:
            "You are a homelab documentation assistant. Given a completed task and existing documentation, identify which documentation sections may need updating based on what changed. Return specific, actionable suggestions. Respond ONLY with a JSON array of objects with shape: [{\"docId\":\"...\",\"title\":\"...\",\"suggestedChange\":\"...\"}]. If nothing needs updating return [].",
        },
        {
          role: "user",
          content: `Task: ${task.title}\n\n${task.description || ""}\n\nServices: ${services}\n\nDocs:\n${docs}`,
        },
      ],
      { temperature: 0.2, maxTokens: 600 },
    );
    try {
      const match = response.match(/\[[\s\S]*\]/);
      if (!match) return [];
      const parsed = JSON.parse(match[0]) as DocSuggestion[];
      return parsed.filter(
        (s) => s && typeof s.docId === "string" && typeof s.suggestedChange === "string",
      );
    } catch {
      return [];
    }
  }

  async suggestRelationships(
    taskTitle: string,
    taskDescription: string,
    allServices: Array<{ id: string; name: string; category?: string }>,
    allAssets: Array<{ id: string; name: string; type?: string }>,
  ): Promise<RelationshipSuggestion> {
    if (allServices.length === 0 && allAssets.length === 0) {
      return { services: [], assets: [] };
    }
    const services = allServices
      .map((s) => `${s.id}: ${s.name}${s.category ? ` (${s.category})` : ""}`)
      .join("\n");
    const assets = allAssets
      .map((a) => `${a.id}: ${a.name}${a.type ? ` (${a.type})` : ""}`)
      .join("\n");
    const response = await this.chat(
      [
        {
          role: "system",
          content:
            "You are analyzing a homelab task to identify which infrastructure components it relates to. Given a task and a list of services and assets, return the IDs of the most relevant ones. Be conservative — only suggest clear relationships. Respond ONLY with JSON: {\"services\":[\"id\",...],\"assets\":[\"id\",...]}.",
        },
        {
          role: "user",
          content: `Task: ${taskTitle}\n\n${taskDescription}\n\nServices:\n${services}\n\nAssets:\n${assets}`,
        },
      ],
      { temperature: 0.1, maxTokens: 400 },
    );
    try {
      const match = response.match(/\{[\s\S]*\}/);
      if (!match) return { services: [], assets: [] };
      const parsed = JSON.parse(match[0]) as RelationshipSuggestion;
      return {
        services: Array.isArray(parsed.services) ? parsed.services.filter((s) => typeof s === "string") : [],
        assets: Array.isArray(parsed.assets) ? parsed.assets.filter((s) => typeof s === "string") : [],
      };
    } catch {
      return { services: [], assets: [] };
    }
  }

  async chatWithContext(userMessage: string, context: RallyContext): Promise<string> {
    const contextStr = JSON.stringify(
      {
        recentChanges: context.recentChanges?.slice(0, 20) ?? [],
        services: context.services ?? [],
        assets: context.assets ?? [],
        openIncidents: context.openIncidents ?? [],
        recentDecisions: context.recentDecisions ?? [],
      },
      null,
      2,
    );
    return this.chat(
      [
        {
          role: "system",
          content:
            "You are Rally, an operational assistant for a homelab. You have access to the homelab's operational data. Answer questions about what changed, what depends on what, why decisions were made, and what is currently happening. Only use the provided data — do not fabricate information. If you don't have the data to answer, say so. Keep answers concise and technical.",
        },
        {
          role: "user",
          content: `Operational data:\n${contextStr}\n\nQuestion: ${userMessage}`,
        },
      ],
      { temperature: 0.2, maxTokens: 800 },
    );
  }
}

export const aiService = new AIService();
