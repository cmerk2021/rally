import { getPocketBase } from "../pocketbase.js";

export type TimelineEntityType =
  | "task"
  | "change"
  | "incident"
  | "documentation"
  | "decision"
  | "maintenance"
  | "event";

export interface TimelineEntryInput {
  entity_type: TimelineEntityType;
  entity_id: string;
  title: string;
  description?: string;
  event_date?: string;
  project?: string | null;
  services?: string[];
  assets?: string[];
}

export async function recordTimelineEntry(input: TimelineEntryInput): Promise<void> {
  const pb = await getPocketBase();
  await pb.collection("timeline_entries").create({
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    title: input.title.slice(0, 500),
    description: (input.description ?? "").slice(0, 5000),
    event_date: input.event_date ?? new Date().toISOString(),
    project: input.project ?? "",
    services: input.services ?? [],
    assets: input.assets ?? [],
  });
}

export async function deleteTimelineEntriesFor(
  entityType: TimelineEntityType,
  entityId: string,
): Promise<void> {
  const pb = await getPocketBase();
  const list = await pb
    .collection("timeline_entries")
    .getFullList({ filter: `entity_type="${entityType}" && entity_id="${entityId}"` });
  for (const item of list) {
    await pb.collection("timeline_entries").delete(item.id).catch(() => {});
  }
}
