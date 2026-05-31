import { z } from "zod";

export const idSchema = z.string().min(1).max(100);

export const projectStatusEnum = z.enum(["active", "paused", "completed", "archived"]);
export const taskStatusEnum = z.enum(["todo", "in_progress", "blocked", "completed"]);
export const taskPriorityEnum = z.enum(["low", "medium", "high", "critical"]);
export const changeTypeEnum = z.enum([
  "upgrade",
  "migration",
  "configuration",
  "installation",
  "removal",
  "incident_resolution",
  "maintenance",
  "other",
]);
export const serviceStatusEnum = z.enum(["running", "stopped", "degraded", "unknown"]);
export const serviceCategoryEnum = z.enum([
  "media",
  "networking",
  "monitoring",
  "storage",
  "security",
  "automation",
  "development",
  "communication",
  "other",
]);
export const assetTypeEnum = z.enum([
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
]);
export const assetStatusEnum = z.enum(["online", "offline", "maintenance", "unknown"]);
export const incidentStatusEnum = z.enum(["investigating", "identified", "monitoring", "resolved"]);
export const incidentSeverityEnum = z.enum(["low", "medium", "high", "critical"]);
export const maintenanceStatusEnum = z.enum(["scheduled", "in_progress", "completed", "cancelled"]);

export const projectCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(10_000).optional().default(""),
  status: projectStatusEnum.default("active"),
  color: z.string().optional().default("#3b82f6"),
  icon: z.string().optional().default("folder"),
});
export const projectUpdateSchema = projectCreateSchema.partial();

export const taskCreateSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(20_000).optional().default(""),
  status: taskStatusEnum.default("todo"),
  priority: taskPriorityEnum.default("medium"),
  due_date: z.string().optional().nullable(),
  project: z.string().optional().nullable(),
  services: z.array(z.string()).optional().default([]),
  assets: z.array(z.string()).optional().default([]),
  assignee: z.string().optional().nullable(),
});
export const taskUpdateSchema = taskCreateSchema.partial();

export const changeCreateSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(20_000).optional().default(""),
  summary: z.string().max(5000).optional().default(""),
  change_type: changeTypeEnum.default("other"),
  project: z.string().optional().nullable(),
  services: z.array(z.string()).optional().default([]),
  assets: z.array(z.string()).optional().default([]),
  source_task: z.string().optional().nullable(),
});
export const changeUpdateSchema = changeCreateSchema.partial();

export const serviceCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(10_000).optional().default(""),
  status: serviceStatusEnum.default("unknown"),
  url: z.string().optional().default(""),
  icon: z.string().optional().default("box"),
  category: serviceCategoryEnum.default("other"),
  assets: z.array(z.string()).optional().default([]),
  dependencies: z.array(z.string()).optional().default([]),
});
export const serviceUpdateSchema = serviceCreateSchema.partial();

export const assetCreateSchema = z.object({
  name: z.string().min(1).max(200),
  type: assetTypeEnum.default("other"),
  hostname: z.string().optional().default(""),
  ip_address: z.string().optional().default(""),
  os: z.string().optional().default(""),
  cpu: z.string().optional().default(""),
  ram_gb: z.number().nonnegative().optional().nullable(),
  storage_tb: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional().default(""),
  status: assetStatusEnum.default("unknown"),
  location: z.string().optional().default(""),
});
export const assetUpdateSchema = assetCreateSchema.partial();

export const docCreateSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.unknown().optional(),
  content_text: z.string().optional().default(""),
  tags: z.array(z.string()).optional().default([]),
  last_reviewed: z.string().optional().nullable(),
  review_interval_days: z.number().int().nonnegative().optional().nullable(),
  services: z.array(z.string()).optional().default([]),
  assets: z.array(z.string()).optional().default([]),
  projects: z.array(z.string()).optional().default([]),
});
export const docUpdateSchema = docCreateSchema.partial();

export const decisionCreateSchema = z.object({
  title: z.string().min(1).max(300),
  decision: z.string().min(1),
  reasoning: z.string().optional().default(""),
  alternatives: z.string().optional().default(""),
  date: z.string().optional().nullable(),
  projects: z.array(z.string()).optional().default([]),
  services: z.array(z.string()).optional().default([]),
  assets: z.array(z.string()).optional().default([]),
});
export const decisionUpdateSchema = decisionCreateSchema.partial();

export const incidentCreateSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().optional().default(""),
  status: incidentStatusEnum.default("investigating"),
  severity: incidentSeverityEnum.default("medium"),
  root_cause: z.string().optional().default(""),
  resolution: z.string().optional().default(""),
  impact: z.string().optional().default(""),
  started_at: z.string().optional().nullable(),
  resolved_at: z.string().optional().nullable(),
  services: z.array(z.string()).optional().default([]),
  assets: z.array(z.string()).optional().default([]),
  related_changes: z.array(z.string()).optional().default([]),
});
export const incidentUpdateSchema = incidentCreateSchema.partial();

export const runbookCreateSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.unknown().optional(),
  content_text: z.string().optional().default(""),
  tags: z.array(z.string()).optional().default([]),
  services: z.array(z.string()).optional().default([]),
  assets: z.array(z.string()).optional().default([]),
});
export const runbookUpdateSchema = runbookCreateSchema.partial();

export const maintenanceCreateSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().optional().default(""),
  status: maintenanceStatusEnum.default("scheduled"),
  start_time: z.string().min(1),
  end_time: z.string().optional().nullable(),
  expected_impact: z.string().optional().default(""),
  actual_notes: z.string().optional().default(""),
  services: z.array(z.string()).optional().default([]),
  assets: z.array(z.string()).optional().default([]),
});
export const maintenanceUpdateSchema = maintenanceCreateSchema.partial();

export const setupSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscores"),
  display_name: z.string().min(1).max(100),
  password: z.string().min(8).max(200),
  homelab_name: z.string().optional().default(""),
  timezone: z.string().optional().default("UTC"),
  email: z.string().email().optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8).max(200),
});

export const updateMeSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  homelab_name: z.string().max(100).optional(),
  timezone: z.string().max(100).optional(),
  email: z.string().email().optional(),
});

export const settingsUpdateSchema = z.object({
  homelab_name: z.string().optional(),
  timezone: z.string().optional(),
  ai_enabled: z.boolean().optional(),
  ai_endpoint: z.string().optional(),
  ai_api_key: z.string().optional(),
  ai_model: z.string().optional(),
  ai_temperature: z.number().optional(),
  backup_enabled: z.boolean().optional(),
  backup_interval_hours: z.number().optional(),
  theme: z.string().optional(),
  date_format: z.string().optional(),
  onboarding_completed: z.boolean().optional(),
});

export const aiSettingsTestSchema = z.object({
  endpoint: z.string(),
  api_key: z.string().optional().default(""),
  model: z.string(),
});

export const webhookTokenSchema = z.object({
  name: z.string().min(1).max(100),
  source_hint: z.string().optional().default(""),
});

export const apiTokenCreateSchema = z.object({
  name: z.string().min(1).max(100),
});

export const eventStatusUpdateSchema = z.object({
  status: z.enum(["unread", "ignored", "converted", "archived"]),
});

export const eventConvertSchema = z.object({
  target: z.enum(["task", "incident", "change"]),
  payload: z.record(z.unknown()),
});

export const aiSuggestRelationshipsSchema = z.object({
  title: z.string(),
  description: z.string().optional().default(""),
});

export const aiChatSchema = z.object({
  message: z.string().min(1),
});
