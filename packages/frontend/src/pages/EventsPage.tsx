import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, EyeOff, ArrowRight, Inbox, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormField } from "@/components/shared/FormField";
import { Input, Textarea } from "@/components/ui/input";
import { eventsApi } from "@/api";
import { formatDateTime, relative } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { RallyEvent } from "@/types";

export function EventsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"unread" | "all" | "archived">("unread");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);

  const status = filter === "unread" ? 'status = "unread"' : filter === "archived" ? 'status = "archived" || status = "ignored"' : undefined;
  const { data, isLoading } = useQuery({
    queryKey: ["events", filter],
    queryFn: () => eventsApi.list({ filter: status, perPage: 100, sort: "-received_at" }),
  });

  const selected = data?.items.find((e) => e.id === selectedId) ?? data?.items[0];

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RallyEvent["status"] }) => eventsApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Updated");
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => eventsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Deleted");
    },
  });

  return (
    <PageContainer
      title="Events"
      description="Webhooks and external alerts from your homelab"
      actions={
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-[calc(100vh-220px)]">
        <Card className="lg:col-span-2 overflow-hidden flex flex-col">
          <div className="overflow-y-auto scrollbar-thin flex-1">
            {isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 m-2" />)}
            {!isLoading && (data?.items.length ?? 0) === 0 && (
              <div className="p-8">
                <EmptyState icon={<Inbox className="h-8 w-8" />} title="No events" description="Configure webhooks in Settings → Webhooks to receive events here." />
              </div>
            )}
            {data?.items.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className={cn(
                  "w-full text-left border-b px-3 py-2.5 transition-colors hover:bg-accent/50",
                  selected?.id === e.id && "bg-accent",
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[10px] rounded bg-muted px-1.5 py-0.5 uppercase">{e.source}</span>
                  <span className="text-[10px] text-muted-foreground">{relative(e.received_at)}</span>
                </div>
                <div className={cn("truncate text-sm", e.status === "unread" && "font-medium")}>{e.title}</div>
                {e.body && <div className="truncate text-xs text-muted-foreground mt-0.5">{e.body}</div>}
              </button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-3 overflow-hidden flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Select an event</div>
          ) : (
            <CardContent className="p-5 overflow-y-auto scrollbar-thin">
              <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                <div>
                  <div className="text-xs text-muted-foreground uppercase">{selected.source} · {selected.event_type}</div>
                  <h2 className="text-xl font-semibold mt-1">{selected.title}</h2>
                  <div className="text-xs text-muted-foreground mt-1">{formatDateTime(selected.received_at)}</div>
                </div>
                <div className="flex gap-1">
                  {selected.status === "unread" && (
                    <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: selected.id, status: "ignored" })}>
                      <EyeOff className="mr-1 h-3 w-3" />Ignore
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setConvertOpen(true)}>
                    <ArrowRight className="mr-1 h-3 w-3" />Convert
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: selected.id, status: "archived" })}>
                    <Archive className="mr-1 h-3 w-3" />Archive
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deleteMut.mutate(selected.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <pre className="text-xs whitespace-pre-wrap bg-muted/40 rounded p-3 overflow-x-auto">{selected.body || "(no body)"}</pre>
            </CardContent>
          )}
        </Card>
      </div>

      {selected && <ConvertDialog open={convertOpen} onOpenChange={setConvertOpen} event={selected} />}
    </PageContainer>
  );
}

function ConvertDialog({ open, onOpenChange, event }: { open: boolean; onOpenChange: (v: boolean) => void; event: RallyEvent }) {
  const qc = useQueryClient();
  const [target, setTarget] = useState<"task" | "incident" | "change">("task");
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.body);

  const mutation = useMutation({
    mutationFn: () => eventsApi.convert(event.id, target, target === "incident"
      ? { title, description, severity: "medium", status: "investigating" }
      : target === "change"
        ? { title, description, change_type: "other" }
        : { title, description, status: "todo", priority: "medium" }),
    onSuccess: () => {
      toast.success(`Converted to ${target}`);
      qc.invalidateQueries({ queryKey: ["events"] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Convert event</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <FormField label="Convert to">
            <Select value={target} onValueChange={(v) => setTarget(v as typeof target)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="incident">Incident</SelectItem>
                <SelectItem value="change">Change</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></FormField>
          <FormField label="Description"><Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!title.trim() || mutation.isPending}>
            {mutation.isPending ? "Converting…" : "Convert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
