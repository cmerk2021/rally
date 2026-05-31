import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TimelineEntryCard } from "@/components/shared/TimelineEntryCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { timelineApi } from "@/api";
import { dayLabel } from "@/lib/date";

const typeOptions = [
  { value: "", label: "All" },
  { value: "change", label: "Changes" },
  { value: "incident", label: "Incidents" },
  { value: "task", label: "Tasks" },
  { value: "documentation", label: "Docs" },
  { value: "decision", label: "Decisions" },
  { value: "maintenance", label: "Maintenance" },
  { value: "event", label: "Events" },
];

export function TimelinePage() {
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["timeline", { type, from, to, page }],
    queryFn: () =>
      timelineApi.list({
        type: type || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        perPage: 30,
      }),
  });

  // Group by day
  const items = data?.items ?? [];
  const grouped = items.reduce<Record<string, typeof items>>((acc, e) => {
    const key = (e.event_date ?? e.created).slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});
  const groupKeys = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

  return (
    <PageContainer title="Timeline" description="Everything that's happened across your homelab">
      <Card className="mb-4">
        <CardContent className="p-3 flex flex-wrap items-end gap-2">
          <div className="flex gap-1 flex-wrap">
            {typeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setType(opt.value); setPage(1); }}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  type === opt.value ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-end gap-2">
            <div>
              <label className="text-xs text-muted-foreground">From</label>
              <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="h-8" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">To</label>
              <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="h-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      )}

      {!isLoading && groupKeys.length === 0 && (
        <EmptyState
          icon={<Activity className="h-10 w-10" />}
          title="No activity"
          description="No entries match the current filters."
        />
      )}

      <div className="space-y-6">
        {groupKeys.map((key) => (
          <div key={key}>
            <div className="sticky top-0 z-10 mb-2 -mx-2 bg-background/90 px-2 py-1 backdrop-blur">
              <h3 className="text-sm font-semibold">{dayLabel(key)}</h3>
            </div>
            <div className="space-y-2">
              {grouped[key].map((e) => <TimelineEntryCard key={e.id} entry={e} />)}
            </div>
          </div>
        ))}
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-accent"
          >Previous</button>
          <span className="text-sm text-muted-foreground self-center">Page {page} of {data.totalPages}</span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-accent"
          >Next</button>
        </div>
      )}
    </PageContainer>
  );
}
