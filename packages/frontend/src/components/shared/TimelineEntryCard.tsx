import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Calendar, FileText, Wrench, ShieldAlert, BookOpen, GitBranch, Lightbulb, Inbox } from "lucide-react";
import { cn, entityColor } from "@/lib/utils";
import { relative } from "@/lib/date";
import type { TimelineEntry } from "@/types";

interface TimelineEntryCardProps {
  entry: TimelineEntry;
  className?: string;
}

const iconByType: Record<string, ReactNode> = {
  change: <Wrench className="h-4 w-4" />,
  incident: <ShieldAlert className="h-4 w-4" />,
  task: <FileText className="h-4 w-4" />,
  documentation: <BookOpen className="h-4 w-4" />,
  decision: <Lightbulb className="h-4 w-4" />,
  maintenance: <Calendar className="h-4 w-4" />,
  event: <Inbox className="h-4 w-4" />,
};

const routeByType: Record<string, (id: string) => string> = {
  change: (id) => `/changes/${id}`,
  incident: (id) => `/incidents/${id}`,
  task: (id) => `/tasks/${id}`,
  documentation: (id) => `/docs/${id}`,
  decision: (id) => `/decisions/${id}`,
  maintenance: (id) => `/maintenance/${id}`,
  event: () => "/events",
};

export function TimelineEntryCard({ entry, className }: TimelineEntryCardProps) {
  const color = entityColor(entry.entity_type);
  const icon = iconByType[entry.entity_type] ?? <GitBranch className="h-4 w-4" />;
  const route = routeByType[entry.entity_type]?.(entry.entity_id) ?? "/timeline";
  return (
    <Link
      to={route}
      className={cn(
        "group relative flex gap-3 rounded-lg border bg-card p-4 transition-all hover:shadow-sm hover:-translate-y-0.5",
        className,
      )}
      style={{ borderLeftWidth: 3, borderLeftColor: color }}
    >
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
        style={{ background: `${color}33`, color }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {entry.entity_type}
          </span>
          <span className="text-xs text-muted-foreground">{relative(entry.event_date)}</span>
        </div>
        <div className="mt-0.5 font-medium leading-tight">{entry.title}</div>
        {entry.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{entry.description}</p>
        )}
        {(entry.expand?.services?.length || entry.expand?.assets?.length) ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {entry.expand?.services?.slice(0, 4).map((s) => (
              <span key={s.id} className="text-[10px] rounded bg-muted px-1.5 py-0.5">
                {s.name}
              </span>
            ))}
            {entry.expand?.assets?.slice(0, 4).map((a) => (
              <span key={a.id} className="text-[10px] rounded bg-muted px-1.5 py-0.5">
                {a.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
