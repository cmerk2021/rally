/**
 * PocketBase schema definitions for Rally.
 *
 * Schemas are applied idempotently on startup by `init.ts`.
 * Relations are resolved in a second pass so they can reference
 * collections that are also being created in this same run.
 */

export type FieldType =
  | "text"
  | "number"
  | "bool"
  | "email"
  | "url"
  | "date"
  | "select"
  | "json"
  | "file"
  | "relation"
  | "editor";

export interface FieldDef {
  name: string;
  type: FieldType;
  required?: boolean;
  options?: Record<string, unknown>;
}

export interface RelationDef {
  field: string;
  target: string;
  multiple?: boolean;
  required?: boolean;
  cascadeDelete?: boolean;
}

export interface CollectionDef {
  name: string;
  type?: "base" | "auth";
  fields: FieldDef[];
  relations?: RelationDef[];
  indexes?: string[];
  listRule?: string | null;
  viewRule?: string | null;
  createRule?: string | null;
  updateRule?: string | null;
  deleteRule?: string | null;
}

const ALL_ACCESS = "";

// Helpers
const t = (name: string, required = false): FieldDef => ({
  name,
  type: "text",
  required,
  options: { min: null, max: null, pattern: "" },
});
const longText = (name: string): FieldDef => ({
  name,
  type: "text",
  options: { min: null, max: null, pattern: "" },
});
const num = (name: string): FieldDef => ({
  name,
  type: "number",
  options: { min: null, max: null, noDecimal: false },
});
const bool = (name: string, defaultVal = false): FieldDef => ({
  name,
  type: "bool",
  options: { default: defaultVal },
});
const date = (name: string): FieldDef => ({
  name,
  type: "date",
  options: { min: "", max: "" },
});
const sel = (name: string, values: string[], required = false): FieldDef => ({
  name,
  type: "select",
  required,
  options: { maxSelect: 1, values },
});
const file = (name: string): FieldDef => ({
  name,
  type: "file",
  options: {
    maxSelect: 1,
    maxSize: 5_242_880,
    mimeTypes: [],
    thumbs: [],
    protected: false,
  },
});
const json = (name: string): FieldDef => ({
  name,
  type: "json",
  options: { maxSize: 2_000_000 },
});

export const COLLECTIONS: CollectionDef[] = [
  {
    name: "app_settings",
    fields: [
      t("homelab_name"),
      t("timezone"),
      bool("ai_enabled", false),
      t("ai_endpoint"),
      t("ai_api_key"),
      t("ai_model"),
      num("ai_temperature"),
      bool("backup_enabled", false),
      num("backup_interval_hours"),
      bool("onboarding_completed", false),
      t("theme"),
      t("date_format"),
    ],
    listRule: ALL_ACCESS,
    viewRule: ALL_ACCESS,
    updateRule: ALL_ACCESS,
  },
  {
    name: "projects",
    fields: [
      t("name", true),
      longText("description"),
      sel("status", ["active", "paused", "completed", "archived"], true),
      t("color"),
      t("icon"),
    ],
    relations: [{ field: "owner", target: "users" }],
  },
  {
    name: "services",
    fields: [
      t("name", true),
      longText("description"),
      sel("status", ["running", "stopped", "degraded", "unknown"], true),
      t("url"),
      t("icon"),
      sel(
        "category",
        [
          "media",
          "networking",
          "monitoring",
          "storage",
          "security",
          "automation",
          "development",
          "communication",
          "other",
        ],
        true,
      ),
    ],
    relations: [
      { field: "assets", target: "assets", multiple: true },
      { field: "dependencies", target: "services", multiple: true },
      { field: "owner", target: "users" },
    ],
  },
  {
    name: "assets",
    fields: [
      t("name", true),
      sel(
        "type",
        [
          "server",
          "vm",
          "container_host",
          "nas",
          "router",
          "switch",
          "storage",
          "workstation",
          "rpi",
          "other",
        ],
        true,
      ),
      t("hostname"),
      t("ip_address"),
      t("os"),
      t("cpu"),
      num("ram_gb"),
      num("storage_tb"),
      longText("notes"),
      sel("status", ["online", "offline", "maintenance", "unknown"], true),
      t("location"),
    ],
    relations: [{ field: "owner", target: "users" }],
  },
  {
    name: "tasks",
    fields: [
      t("title", true),
      longText("description"),
      sel("status", ["todo", "in_progress", "blocked", "completed"], true),
      sel("priority", ["low", "medium", "high", "critical"], true),
      date("due_date"),
      date("completed_at"),
    ],
    relations: [
      { field: "project", target: "projects" },
      { field: "services", target: "services", multiple: true },
      { field: "assets", target: "assets", multiple: true },
      { field: "assignee", target: "users" },
    ],
  },
  {
    name: "changes",
    fields: [
      t("title", true),
      longText("description"),
      longText("summary"),
      sel(
        "change_type",
        [
          "upgrade",
          "migration",
          "configuration",
          "installation",
          "removal",
          "incident_resolution",
          "maintenance",
          "other",
        ],
        true,
      ),
    ],
    relations: [
      { field: "project", target: "projects" },
      { field: "services", target: "services", multiple: true },
      { field: "assets", target: "assets", multiple: true },
      { field: "source_task", target: "tasks" },
      { field: "created_by", target: "users" },
    ],
  },
  {
    name: "documentation",
    fields: [
      t("title", true),
      json("content"),
      longText("content_text"),
      json("tags"),
      date("last_reviewed"),
      num("review_interval_days"),
    ],
    relations: [
      { field: "services", target: "services", multiple: true },
      { field: "assets", target: "assets", multiple: true },
      { field: "projects", target: "projects", multiple: true },
      { field: "created_by", target: "users" },
    ],
  },
  {
    name: "decisions",
    fields: [
      t("title", true),
      longText("decision"),
      longText("reasoning"),
      longText("alternatives"),
      date("date"),
    ],
    relations: [
      { field: "projects", target: "projects", multiple: true },
      { field: "services", target: "services", multiple: true },
      { field: "assets", target: "assets", multiple: true },
      { field: "created_by", target: "users" },
    ],
  },
  {
    name: "incidents",
    fields: [
      t("title", true),
      longText("description"),
      sel(
        "status",
        ["investigating", "identified", "monitoring", "resolved"],
        true,
      ),
      sel("severity", ["low", "medium", "high", "critical"], true),
      longText("root_cause"),
      longText("resolution"),
      longText("impact"),
      date("started_at"),
      date("resolved_at"),
    ],
    relations: [
      { field: "services", target: "services", multiple: true },
      { field: "assets", target: "assets", multiple: true },
      { field: "related_changes", target: "changes", multiple: true },
      { field: "created_by", target: "users" },
    ],
  },
  {
    name: "runbooks",
    fields: [
      t("title", true),
      json("content"),
      longText("content_text"),
      json("tags"),
    ],
    relations: [
      { field: "services", target: "services", multiple: true },
      { field: "assets", target: "assets", multiple: true },
      { field: "created_by", target: "users" },
    ],
  },
  {
    name: "maintenance",
    fields: [
      t("title", true),
      longText("description"),
      sel(
        "status",
        ["scheduled", "in_progress", "completed", "cancelled"],
        true,
      ),
      date("start_time"),
      date("end_time"),
      longText("expected_impact"),
      longText("actual_notes"),
    ],
    relations: [
      { field: "services", target: "services", multiple: true },
      { field: "assets", target: "assets", multiple: true },
      { field: "created_by", target: "users" },
    ],
  },
  {
    name: "events",
    fields: [
      t("source"),
      t("event_type"),
      t("title"),
      longText("body"),
      sel("status", ["unread", "ignored", "converted", "archived"], true),
      t("converted_to"),
      date("received_at"),
    ],
  },
  {
    name: "timeline_entries",
    fields: [
      sel(
        "entity_type",
        [
          "task",
          "change",
          "incident",
          "documentation",
          "decision",
          "maintenance",
          "event",
        ],
        true,
      ),
      t("entity_id"),
      t("title"),
      longText("description"),
      date("event_date"),
    ],
    relations: [
      { field: "project", target: "projects" },
      { field: "services", target: "services", multiple: true },
      { field: "assets", target: "assets", multiple: true },
    ],
    indexes: [
      "CREATE INDEX idx_timeline_event_date ON timeline_entries (event_date DESC)",
      "CREATE INDEX idx_timeline_entity ON timeline_entries (entity_type, entity_id)",
    ],
  },
  {
    name: "ai_suggestions",
    fields: [
      sel(
        "suggestion_type",
        ["doc_update", "relationship", "change_summary"],
        true,
      ),
      t("title"),
      longText("content"),
      sel("status", ["pending", "accepted", "rejected"], true),
      t("related_entity_type"),
      t("related_entity_id"),
    ],
    relations: [{ field: "created_by_task", target: "tasks" }],
  },
  {
    name: "webhook_tokens",
    fields: [
      t("name", true),
      t("token", true),
      t("source_hint"),
      bool("enabled", true),
      date("last_used"),
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_webhook_tokens_token ON webhook_tokens (token)",
    ],
  },
  {
    name: "api_tokens",
    fields: [
      t("name", true),
      t("token_hash", true),
      t("token_preview"),
      date("last_used"),
    ],
    relations: [{ field: "user", target: "users" }],
    indexes: [
      "CREATE UNIQUE INDEX idx_api_tokens_hash ON api_tokens (token_hash)",
    ],
  },
];

/** User profile fields to add to the built-in users collection. */
export const USER_PROFILE_FIELDS: FieldDef[] = [
  t("display_name"),
  t("homelab_name"),
  t("timezone"),
  bool("onboarding_completed", false),
  file("avatar"),
];
