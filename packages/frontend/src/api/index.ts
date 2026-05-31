import { api } from "./client";
import type {
  AISuggestion,
  ApiToken,
  AppSettings,
  Asset,
  Change,
  Decision,
  Documentation,
  Incident,
  ListResponse,
  Maintenance,
  Project,
  Runbook,
  Service,
  Task,
  TimelineEntry,
  User,
  RallyEvent,
  WebhookToken,
  SearchResponse,
} from "@/types";

// --- Auth ---
export const authApi = {
  setupStatus: () => api.get<{ setupRequired: boolean }>("/auth/setup-status").then((r) => r.data),
  setup: (data: {
    username: string;
    display_name: string;
    password: string;
    homelab_name?: string;
    timezone?: string;
    email?: string;
  }) => api.post<{ token: string; user: User }>("/auth/setup", data).then((r) => r.data),
  login: (username: string, password: string) =>
    api.post<{ token: string; user: User }>("/auth/login", { username, password }).then((r) => r.data),
  logout: () => api.post("/auth/logout").then((r) => r.data),
  me: () => api.get<{ user: User }>("/auth/me").then((r) => r.data.user),
  updateMe: (patch: Partial<Pick<User, "display_name" | "homelab_name" | "timezone" | "email">>) =>
    api.put<{ user: User }>("/auth/me", patch).then((r) => r.data.user),
  changePassword: (current_password: string, new_password: string) =>
    api.post("/auth/change-password", { current_password, new_password }).then((r) => r.data),
  createToken: (name: string) =>
    api.post<ApiToken & { token: string }>("/auth/tokens", { name }).then((r) => r.data),
  listTokens: () => api.get<{ items: ApiToken[] }>("/auth/tokens").then((r) => r.data.items),
  deleteToken: (id: string) => api.delete(`/auth/tokens/${id}`).then((r) => r.data),
};

// --- Generic CRUD factory ---
function crud<T, C = Partial<T>, U = Partial<T>>(base: string) {
  return {
    list: (params?: Record<string, string | number | undefined>) =>
      api.get<ListResponse<T>>(base, { params }).then((r) => r.data),
    get: (id: string) => api.get<T>(`${base}/${id}`).then((r) => r.data),
    create: (data: C) => api.post<T>(base, data).then((r) => r.data),
    update: (id: string, data: U) => api.put<T>(`${base}/${id}`, data).then((r) => r.data),
    remove: (id: string) => api.delete(`${base}/${id}`).then((r) => r.data),
  };
}

export const projectsApi = {
  ...crud<Project>("/projects"),
  timeline: (id: string, params?: Record<string, string | number | undefined>) =>
    api.get<ListResponse<TimelineEntry>>(`/projects/${id}/timeline`, { params }).then((r) => r.data),
  stats: (id: string) =>
    api.get<{
      tasks: { todo: number; in_progress: number; blocked: number; completed: number; total: number };
      changes: number;
      decisions: number;
      docs: number;
    }>(`/projects/${id}/stats`).then((r) => r.data),
};

export const tasksApi = {
  ...crud<Task>("/tasks"),
  complete: (id: string) =>
    api.post<{ task: Task; suggestion: { id: string; content: string } | null }>(
      `/tasks/${id}/complete`,
    ).then((r) => r.data),
  reopen: (id: string) => api.post<Task>(`/tasks/${id}/reopen`).then((r) => r.data),
};

export const changesApi = {
  ...crud<Change>("/changes"),
  generateSummary: (id: string) =>
    api.post<Change>(`/changes/${id}/generate-summary`).then((r) => r.data),
};

export const servicesApi = {
  ...crud<Service>("/services"),
  timeline: (id: string) =>
    api.get<ListResponse<TimelineEntry>>(`/services/${id}/timeline`).then((r) => r.data),
  graph: (id: string) =>
    api.get<{
      nodes: Array<{ id: string; name: string; status: string; category: string }>;
      edges: Array<{ from: string; to: string }>;
      root: string;
    }>(`/services/${id}/graph`).then((r) => r.data),
  setDependencies: (id: string, dependencies: string[]) =>
    api.put<Service>(`/services/${id}/dependencies`, { dependencies }).then((r) => r.data),
};

export const assetsApi = {
  ...crud<Asset>("/assets"),
  timeline: (id: string) =>
    api.get<ListResponse<TimelineEntry>>(`/assets/${id}/timeline`).then((r) => r.data),
};

export const docsApi = {
  ...crud<Documentation>("/docs"),
  dueReview: () => api.get<{ items: Documentation[] }>("/docs/due-review").then((r) => r.data.items),
  markReviewed: (id: string) =>
    api.post<Documentation>(`/docs/${id}/mark-reviewed`).then((r) => r.data),
};

export const decisionsApi = crud<Decision>("/decisions");

export const incidentsApi = {
  ...crud<Incident>("/incidents"),
  resolve: (id: string, data: { root_cause?: string; resolution?: string; impact?: string }) =>
    api.post<Incident>(`/incidents/${id}/resolve`, data).then((r) => r.data),
};

export const runbooksApi = crud<Runbook>("/runbooks");

export const maintenanceApi = {
  ...crud<Maintenance>("/maintenance"),
  start: (id: string) => api.post<Maintenance>(`/maintenance/${id}/start`).then((r) => r.data),
  complete: (id: string, data: { actual_notes?: string; create_change?: boolean }) =>
    api.post<Maintenance>(`/maintenance/${id}/complete`, data).then((r) => r.data),
};

export const timelineApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ListResponse<TimelineEntry>>("/timeline", { params }).then((r) => r.data),
};

export const searchApi = {
  search: (q: string) => api.get<SearchResponse>("/search", { params: { q } }).then((r) => r.data),
};

export const eventsApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ListResponse<RallyEvent>>("/events", { params }).then((r) => r.data),
  get: (id: string) => api.get<RallyEvent>(`/events/${id}`).then((r) => r.data),
  unreadCount: () => api.get<{ count: number }>("/events/unread-count").then((r) => r.data.count),
  updateStatus: (id: string, status: RallyEvent["status"]) =>
    api.put<RallyEvent>(`/events/${id}/status`, { status }).then((r) => r.data),
  convert: (id: string, target: "task" | "incident" | "change", payload: Record<string, unknown>) =>
    api.post<{ ok: true; target: string; id: string }>(`/events/${id}/convert`, { target, payload }).then((r) => r.data),
  remove: (id: string) => api.delete(`/events/${id}`).then((r) => r.data),
};

export const aiApi = {
  status: () =>
    api.get<{ enabled: boolean; available: boolean; endpoint: string; model: string }>("/ai/status").then((r) => r.data),
  chat: (message: string) =>
    api.post<{ response: string }>("/ai/chat", { message }).then((r) => r.data),
  suggestRelationships: (title: string, description: string) =>
    api.post<{ services: string[]; assets: string[] }>(
      "/ai/suggest-relationships",
      { title, description },
    ).then((r) => r.data),
  listSuggestions: (status?: string) =>
    api.get<ListResponse<AISuggestion>>("/ai/suggestions", { params: { status } }).then((r) => r.data),
  acceptSuggestion: (id: string) =>
    api.put<AISuggestion>(`/ai/suggestions/${id}/accept`).then((r) => r.data),
  rejectSuggestion: (id: string) =>
    api.put<AISuggestion>(`/ai/suggestions/${id}/reject`).then((r) => r.data),
};

export const settingsApi = {
  get: () => api.get<AppSettings>("/settings").then((r) => r.data),
  update: (data: Partial<AppSettings>) => api.put<AppSettings>("/settings", data).then((r) => r.data),
  testAI: (data: { endpoint: string; api_key?: string; model: string }) =>
    api.post<{ ok: boolean; message: string; latencyMs?: number; sample?: string }>(
      "/settings/test-ai",
      data,
    ).then((r) => r.data),
  backup: () => api.post<{ ok: boolean; name: string }>("/settings/backup").then((r) => r.data),
  backupHistory: () =>
    api.get<{ items: Array<{ key: string; size?: number; modified?: string }> }>("/settings/backup/history").then((r) => r.data.items),
  listWebhooks: () => api.get<{ items: WebhookToken[] }>("/settings/webhooks").then((r) => r.data.items),
  createWebhook: (name: string, source_hint?: string) =>
    api.post<WebhookToken & { token: string }>("/settings/webhooks", { name, source_hint }).then((r) => r.data),
  updateWebhook: (id: string, data: { enabled?: boolean; name?: string }) =>
    api.patch<WebhookToken>(`/settings/webhooks/${id}`, data).then((r) => r.data),
  deleteWebhook: (id: string) => api.delete(`/settings/webhooks/${id}`).then((r) => r.data),
  stats: () =>
    api.get<{
      counts: Record<string, number>;
      uptimeSeconds: number;
      rallyVersion: string;
      nodeVersion: string;
    }>("/settings/stats").then((r) => r.data),
};
