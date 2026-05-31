import type PocketBase from "pocketbase";
import { getPocketBase } from "../pocketbase.js";
import { COLLECTIONS, USER_PROFILE_FIELDS, type CollectionDef, type FieldDef } from "./schema.js";

interface PBCollection {
  id: string;
  name: string;
  type: string;
  schema?: Array<{ name: string; type: string; required?: boolean; options?: Record<string, unknown> }>;
  listRule?: string | null;
  viewRule?: string | null;
  createRule?: string | null;
  updateRule?: string | null;
  deleteRule?: string | null;
  indexes?: string[];
}

async function fetchCollections(pb: PocketBase): Promise<PBCollection[]> {
  const list = await pb.collections.getFullList<PBCollection>();
  return list;
}

function buildSchema(
  def: CollectionDef,
  collectionsByName: Map<string, PBCollection>,
  includeRelations: boolean,
): FieldDef[] {
  const schema: FieldDef[] = [...def.fields];
  if (includeRelations && def.relations) {
    for (const rel of def.relations) {
      const target = collectionsByName.get(rel.target);
      if (!target) continue;
      schema.push({
        name: rel.field,
        type: "relation",
        required: rel.required,
        options: {
          collectionId: target.id,
          cascadeDelete: rel.cascadeDelete ?? false,
          minSelect: null,
          maxSelect: rel.multiple ? null : 1,
          displayFields: null,
        },
      });
    }
  }
  return schema;
}

async function createOrUpdateCollection(
  pb: PocketBase,
  def: CollectionDef,
  existing: PBCollection | undefined,
  collectionsByName: Map<string, PBCollection>,
  includeRelations: boolean,
): Promise<PBCollection> {
  const schema = buildSchema(def, collectionsByName, includeRelations);
  const payload: Record<string, unknown> = {
    name: def.name,
    type: def.type ?? "base",
    schema,
    listRule: def.listRule ?? null,
    viewRule: def.viewRule ?? null,
    createRule: def.createRule ?? null,
    updateRule: def.updateRule ?? null,
    deleteRule: def.deleteRule ?? null,
  };
  if (def.indexes) payload.indexes = def.indexes;

  if (!existing) {
    const created = (await pb.collections.create(payload)) as unknown as PBCollection;
    return created;
  }
  // Update: merge schema by name (preserve existing field ids)
  const existingByName = new Map(
    (existing.schema ?? []).map((f) => [f.name, f]),
  );
  const merged = schema.map((f) => {
    const prior = existingByName.get(f.name);
    return prior ? { ...prior, ...f } : f;
  });
  // Preserve other existing fields (e.g. user-added)
  for (const [name, prior] of existingByName) {
    if (!merged.find((m) => m.name === name)) {
      merged.push({
        name: prior.name,
        type: prior.type as FieldDef["type"],
        required: prior.required,
        options: prior.options,
      });
    }
  }
  const updated = (await pb.collections.update(existing.id, {
    ...payload,
    schema: merged,
  })) as unknown as PBCollection;
  return updated;
}

async function ensureUsersExtensions(
  pb: PocketBase,
  users: PBCollection,
): Promise<void> {
  const existing = new Map((users.schema ?? []).map((f) => [f.name, f]));
  const additions: FieldDef[] = [];
  for (const f of USER_PROFILE_FIELDS) {
    if (!existing.has(f.name)) additions.push(f);
  }
  if (additions.length === 0) return;
  const merged = [...(users.schema ?? []), ...additions];
  await pb.collections.update(users.id, { schema: merged });
}

async function ensureAppSettingsSingleton(pb: PocketBase): Promise<void> {
  const existing = await pb.collection("app_settings").getList(1, 1, {
    sort: "-created",
  }).catch(() => ({ items: [] as unknown[] }));
  if (existing.items.length > 0) return;
  await pb.collection("app_settings").create({
    homelab_name: "",
    timezone: "UTC",
    ai_enabled: false,
    ai_endpoint: "",
    ai_api_key: "",
    ai_model: "",
    ai_temperature: 0.2,
    backup_enabled: false,
    backup_interval_hours: 24,
    onboarding_completed: false,
    theme: "dark",
    date_format: "YYYY-MM-DD",
  });
}

export async function initSchema(log: (msg: string) => void = console.log): Promise<void> {
  const pb = await getPocketBase();

  log("[schema] Authenticated to PocketBase as admin");

  const existing = await fetchCollections(pb);
  const byName = new Map(existing.map((c) => [c.name, c]));

  // Find users collection (built-in)
  const users = existing.find((c) => c.name === "users" && c.type === "auth");
  if (!users) {
    throw new Error(
      "PocketBase 'users' auth collection not found. Please create it in PocketBase admin UI first (it's the default users collection).",
    );
  }
  await ensureUsersExtensions(pb, users);
  byName.set("users", users);
  log("[schema] Ensured user profile fields");

  // Pass 1: create/update base structure WITHOUT relations
  const created: string[] = [];
  const updated: string[] = [];
  for (const def of COLLECTIONS) {
    const prior = byName.get(def.name);
    const result = await createOrUpdateCollection(pb, def, prior, byName, false);
    byName.set(def.name, result);
    if (prior) updated.push(def.name);
    else created.push(def.name);
  }

  // Pass 2: add relations now that all collections exist
  for (const def of COLLECTIONS) {
    if (!def.relations || def.relations.length === 0) continue;
    const prior = byName.get(def.name);
    await createOrUpdateCollection(pb, def, prior, byName, true);
  }

  log(`[schema] Created: ${created.length ? created.join(", ") : "(none)"}`);
  log(`[schema] Updated: ${updated.length ? updated.join(", ") : "(none)"}`);

  await ensureAppSettingsSingleton(pb);
  log("[schema] Ensured app_settings singleton");
}
