import { Link } from "@tanstack/react-router";
import { cn, entityColor } from "@/lib/utils";

interface RelationChipProps {
  type: "project" | "task" | "service" | "asset" | "change" | "incident" | "doc" | "decision" | "maintenance" | "runbook";
  id: string;
  label: string;
  className?: string;
}

const typeToRoute: Record<RelationChipProps["type"], (id: string) => string> = {
  project: (id) => `/projects/${id}`,
  task: (id) => `/tasks/${id}`,
  service: (id) => `/services/${id}`,
  asset: (id) => `/assets/${id}`,
  change: (id) => `/changes/${id}`,
  incident: (id) => `/incidents/${id}`,
  doc: (id) => `/docs/${id}`,
  decision: (id) => `/decisions/${id}`,
  maintenance: (id) => `/maintenance/${id}`,
  runbook: (id) => `/runbooks/${id}`,
};

export function RelationChip({ type, id, label, className }: RelationChipProps) {
  const color = entityColor(type);
  const to = typeToRoute[type](id);
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors hover:bg-accent",
        className,
      )}
      style={{ borderColor: `${color} / 0.4`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      <span className="truncate max-w-[10rem]">{label}</span>
    </Link>
  );
}
