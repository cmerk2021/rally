export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  homelab_name: string;
  timezone: string;
  onboarding_completed: boolean;
  avatar: string;
}

export interface BaseRecord {
  id: string;
  created: string;
  updated: string;
}

export interface ListResponse<T> {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: T[];
}

export interface Project extends BaseRecord {
  name: string;
  description: string;
  status: "active" | "paused" | "completed" | "archived";
  color: string;
  icon: string;
  owner: string;
}

export interface Task extends BaseRecord {
  title: string;
  description: string;
  status: "todo" | "in_progress" | "blocked" | "completed";
  priority: "low" | "medium" | "high" | "critical";
  due_date: string;
  completed_at: string;
  project: string;
  services: string[];
  assets: string[];
  assignee: string;
  expand?: {
    project?: Project;
    services?: Service[];
    assets?: Asset[];
    assignee?: User;
  };
}

export interface Change extends BaseRecord {
  title: string;
  description: string;
  summary: string;
  change_type:
    | "upgrade"
    | "migration"
    | "configuration"
    | "installation"
    | "removal"
    | "incident_resolution"
    | "maintenance"
    | "other";
  project: string;
  services: string[];
  assets: string[];
  source_task: string;
  created_by: string;
  expand?: {
    project?: Project;
    services?: Service[];
    assets?: Asset[];
    source_task?: Task;
    created_by?: User;
  };
}

export interface Service extends BaseRecord {
  name: string;
  description: string;
  status: "running" | "stopped" | "degraded" | "unknown";
  url: string;
  icon: string;
  category:
    | "media"
    | "networking"
    | "monitoring"
    | "storage"
    | "security"
    | "automation"
    | "development"
    | "communication"
    | "other";
  assets: string[];
  dependencies: string[];
  owner: string;
  expand?: {
    assets?: Asset[];
    dependencies?: Service[];
    owner?: User;
  };
}

export interface Asset extends BaseRecord {
  name: string;
  type:
    | "server"
    | "vm"
    | "container_host"
    | "nas"
    | "router"
    | "switch"
    | "storage"
    | "workstation"
    | "rpi"
    | "other";
  hostname: string;
  ip_address: string;
  os: string;
  cpu: string;
  ram_gb: number;
  storage_tb: number;
  notes: string;
  status: "online" | "offline" | "maintenance" | "unknown";
  location: string;
  owner: string;
}

export interface Documentation extends BaseRecord {
  title: string;
  content: unknown;
  content_text: string;
  tags: string[];
  last_reviewed: string;
  review_interval_days: number;
  services: string[];
  assets: string[];
  projects: string[];
  created_by: string;
  expand?: {
    services?: Service[];
    assets?: Asset[];
    projects?: Project[];
  };
}

export interface Decision extends BaseRecord {
  title: string;
  decision: string;
  reasoning: string;
  alternatives: string;
  date: string;
  projects: string[];
  services: string[];
  assets: string[];
  created_by: string;
  expand?: {
    projects?: Project[];
    services?: Service[];
    assets?: Asset[];
  };
}

export interface Incident extends BaseRecord {
  title: string;
  description: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  severity: "low" | "medium" | "high" | "critical";
  root_cause: string;
  resolution: string;
  impact: string;
  started_at: string;
  resolved_at: string;
  services: string[];
  assets: string[];
  related_changes: string[];
  created_by: string;
  expand?: {
    services?: Service[];
    assets?: Asset[];
    related_changes?: Change[];
  };
}

export interface Runbook extends BaseRecord {
  title: string;
  content: unknown;
  content_text: string;
  tags: string[];
  services: string[];
  assets: string[];
  created_by: string;
  expand?: {
    services?: Service[];
    assets?: Asset[];
  };
}

export interface Maintenance extends BaseRecord {
  title: string;
  description: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  start_time: string;
  end_time: string;
  expected_impact: string;
  actual_notes: string;
  services: string[];
  assets: string[];
  expand?: {
    services?: Service[];
    assets?: Asset[];
  };
}

export interface RallyEvent extends BaseRecord {
  source: string;
  event_type: string;
  title: string;
  body: string;
  status: "unread" | "ignored" | "converted" | "archived";
  converted_to: string;
  received_at: string;
}

export interface TimelineEntry extends BaseRecord {
  entity_type: "task" | "change" | "incident" | "documentation" | "decision" | "maintenance" | "event";
  entity_id: string;
  title: string;
  description: string;
  event_date: string;
  project: string;
  services: string[];
  assets: string[];
  expand?: {
    project?: Project;
    services?: Service[];
    assets?: Asset[];
  };
}

export interface AISuggestion extends BaseRecord {
  suggestion_type: "doc_update" | "relationship" | "change_summary";
  title: string;
  content: string;
  status: "pending" | "accepted" | "rejected";
  related_entity_type: string;
  related_entity_id: string;
  created_by_task: string;
}

export interface WebhookToken extends BaseRecord {
  name: string;
  token: string;
  source_hint: string;
  enabled: boolean;
  last_used: string;
}

export interface ApiToken {
  id: string;
  name: string;
  token?: string;
  preview: string;
  last_used: string;
  created: string;
}

export interface AppSettings {
  id?: string;
  homelab_name: string;
  timezone: string;
  ai_enabled: boolean;
  ai_endpoint: string;
  ai_api_key: string;
  ai_api_key_set?: boolean;
  ai_model: string;
  ai_temperature: number;
  backup_enabled: boolean;
  backup_interval_hours: number;
  onboarding_completed: boolean;
  theme: string;
  date_format: string;
}

export interface SearchHit {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
}

export interface SearchResponse {
  groups: Record<string, SearchHit[]>;
  total: number;
}
