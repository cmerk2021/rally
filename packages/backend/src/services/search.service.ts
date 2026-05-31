import { getPocketBase } from "../pocketbase.js";

export interface SearchHit {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
}

function esc(q: string): string {
  return q.replace(/"/g, '\\"');
}

interface RecordLike {
  id: string;
  [key: string]: unknown;
}

async function safeSearch(
  collection: string,
  filter: string,
): Promise<RecordLike[]> {
  try {
    const pb = await getPocketBase();
    const res = await pb.collection(collection).getList(1, 20, { filter });
    return res.items as unknown as RecordLike[];
  } catch {
    return [];
  }
}

export async function globalSearch(query: string): Promise<{
  groups: Record<string, SearchHit[]>;
  total: number;
}> {
  const q = esc(query.trim());
  if (!q) return { groups: {}, total: 0 };

  const [
    projects,
    tasks,
    changes,
    services,
    assets,
    docs,
    decisions,
    incidents,
    runbooks,
  ] = await Promise.all([
    safeSearch("projects", `name ~ "${q}" || description ~ "${q}"`),
    safeSearch("tasks", `title ~ "${q}" || description ~ "${q}"`),
    safeSearch("changes", `title ~ "${q}" || description ~ "${q}" || summary ~ "${q}"`),
    safeSearch("services", `name ~ "${q}" || description ~ "${q}"`),
    safeSearch("assets", `name ~ "${q}" || hostname ~ "${q}" || ip_address ~ "${q}" || notes ~ "${q}"`),
    safeSearch("documentation", `title ~ "${q}" || content_text ~ "${q}"`),
    safeSearch("decisions", `title ~ "${q}" || decision ~ "${q}" || reasoning ~ "${q}"`),
    safeSearch("incidents", `title ~ "${q}" || description ~ "${q}" || resolution ~ "${q}"`),
    safeSearch("runbooks", `title ~ "${q}" || content_text ~ "${q}"`),
  ]);

  const toHit = (type: string, titleField: string, subtitleField?: string) =>
    (item: RecordLike): SearchHit => ({
      type,
      id: item.id,
      title: String(item[titleField] ?? ""),
      subtitle: subtitleField ? String(item[subtitleField] ?? "") : undefined,
      status: typeof item.status === "string" ? (item.status as string) : undefined,
    });

  const rank = (items: SearchHit[]): SearchHit[] => {
    const lower = query.toLowerCase();
    return [...items].sort((a, b) => {
      const ax = a.title.toLowerCase() === lower ? 0 : a.title.toLowerCase().startsWith(lower) ? 1 : 2;
      const bx = b.title.toLowerCase() === lower ? 0 : b.title.toLowerCase().startsWith(lower) ? 1 : 2;
      return ax - bx;
    });
  };

  const groups: Record<string, SearchHit[]> = {
    projects: rank(projects.map(toHit("project", "name", "status"))),
    tasks: rank(tasks.map(toHit("task", "title", "status"))),
    changes: rank(changes.map(toHit("change", "title", "change_type"))),
    services: rank(services.map(toHit("service", "name", "category"))),
    assets: rank(assets.map(toHit("asset", "name", "type"))),
    docs: rank(docs.map(toHit("doc", "title"))),
    decisions: rank(decisions.map(toHit("decision", "title"))),
    incidents: rank(incidents.map(toHit("incident", "title", "status"))),
    runbooks: rank(runbooks.map(toHit("runbook", "title"))),
  };
  let total = 0;
  for (const k of Object.keys(groups)) total += groups[k].length;
  return { groups, total };
}
