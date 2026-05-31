import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, Play, CheckCircle2 } from "lucide-react";
import { ResourceListPage } from "@/components/shared/ResourceListPage";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/primitives";
import { FormField } from "@/components/shared/FormField";
import { EntityPicker } from "@/components/shared/EntityPicker";
import { RelationChip } from "@/components/shared/RelationChip";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DatePicker } from "@/components/shared/DatePicker";
import { Skeleton } from "@/components/ui/skeleton";
import { maintenanceApi } from "@/api";
import { formatDateTime } from "@/lib/date";
import type { Maintenance } from "@/types";

const STATUSES = ["scheduled", "in_progress", "completed", "cancelled"] as const;

export function MaintenanceListPage() {
  const [status, setStatus] = useState<string>("all");
  const extraFilter = status !== "all" ? `status = "${status}"` : undefined;

  return (
    <ResourceListPage<Maintenance>
      title="Maintenance"
      description="Scheduled and historical maintenance windows"
      queryKey="maintenance"
      fetchList={(p) => maintenanceApi.list(p as Record<string, string | number | undefined>)}
      searchFields={["title", "description"]}
      extraFilter={extraFilter}
      createLabel="Schedule maintenance"
      defaultSort="-start_time"
      rowHref={(m) => `/maintenance/${m.id}`}
      columns={[
        { key: "title", label: "Title", render: (m) => <span className="font-medium">{m.title}</span> },
        { key: "status", label: "Status", width: "140px", render: (m) => <StatusBadge status={m.status} /> },
        { key: "start", label: "Start", width: "180px", render: (m) => m.start_time ? formatDateTime(m.start_time) : "—" },
        { key: "end", label: "End", width: "180px", render: (m) => m.end_time ? formatDateTime(m.end_time) : "—" },
      ]}
      filters={
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      }
      createDialog={({ open, onOpenChange }) => <MaintenanceFormDialog open={open} onOpenChange={onOpenChange} />}
    />
  );
}

export function MaintenanceFormDialog({ open, onOpenChange, maintenance }: { open: boolean; onOpenChange: (v: boolean) => void; maintenance?: Maintenance }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Maintenance>>({});

  useEffect(() => {
    if (open) setForm(maintenance ?? { status: "scheduled" });
  }, [open, maintenance]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (maintenance) return maintenanceApi.update(maintenance.id, form as Partial<Maintenance>);
      return maintenanceApi.create(form as Partial<Maintenance>);
    },
    onSuccess: () => {
      toast.success(maintenance ? "Updated" : "Maintenance scheduled");
      qc.invalidateQueries({ queryKey: ["maintenance"] });
      onOpenChange(false);
    },
  });

  const set = <K extends keyof Maintenance>(k: K, v: Maintenance[K]) => setForm({ ...form, [k]: v });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{maintenance ? "Edit maintenance" : "Schedule maintenance"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
          <FormField label="Title" required>
            <Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} autoFocus />
          </FormField>
          <FormField label="Description">
            <Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} rows={3} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start"><DatePicker value={form.start_time ?? ""} onChange={(v) => set("start_time", v)} type="datetime-local" /></FormField>
            <FormField label="End"><DatePicker value={form.end_time ?? ""} onChange={(v) => set("end_time", v)} type="datetime-local" /></FormField>
          </div>
          <FormField label="Expected impact">
            <Textarea value={form.expected_impact ?? ""} onChange={(e) => set("expected_impact", e.target.value)} rows={2} />
          </FormField>
          <FormField label="Services"><EntityPicker type="service" value={form.services ?? []} onChange={(v) => set("services", v)} /></FormField>
          <FormField label="Assets"><EntityPicker type="asset" value={form.assets ?? []} onChange={(v) => set("assets", v)} /></FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.title?.trim() || mutation.isPending}>
            {mutation.isPending ? "Saving…" : maintenance ? "Save" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MaintenanceDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [actualNotes, setActualNotes] = useState("");
  const [createChange, setCreateChange] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: m, isLoading } = useQuery({
    queryKey: ["maintenance", id],
    queryFn: () => maintenanceApi.get(id),
  });

  const startMut = useMutation({
    mutationFn: () => maintenanceApi.start(id),
    onSuccess: () => {
      toast.success("Maintenance started");
      qc.invalidateQueries({ queryKey: ["maintenance", id] });
    },
  });
  const completeMut = useMutation({
    mutationFn: () => maintenanceApi.complete(id, { actual_notes: actualNotes, create_change: createChange }),
    onSuccess: () => {
      toast.success("Maintenance completed");
      qc.invalidateQueries({ queryKey: ["maintenance", id] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
      setCompleteOpen(false);
    },
  });
  const deleteMut = useMutation({
    mutationFn: () => maintenanceApi.remove(id),
    onSuccess: () => {
      toast.success("Maintenance deleted");
      qc.invalidateQueries({ queryKey: ["maintenance"] });
      void navigate({ to: "/maintenance" });
    },
  });

  if (isLoading || !m) {
    return (<PageContainer><Skeleton className="h-10 w-1/2 mb-4" /><Skeleton className="h-64 w-full" /></PageContainer>);
  }
  return (
    <PageContainer>
      <Link to="/maintenance" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{m.title}</h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <StatusBadge status={m.status} />
            {m.start_time && <span className="text-xs text-muted-foreground">{formatDateTime(m.start_time)}{m.end_time ? ` → ${formatDateTime(m.end_time)}` : ""}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {m.status === "scheduled" && (
            <Button onClick={() => startMut.mutate()} disabled={startMut.isPending}><Play className="mr-1 h-4 w-4" />Start</Button>
          )}
          {m.status === "in_progress" && (
            <Button onClick={() => setCompleteOpen(true)}><CheckCircle2 className="mr-1 h-4 w-4" />Complete</Button>
          )}
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="mr-1 h-4 w-4" />Edit</Button>
          <Button variant="outline" onClick={() => setConfirmOpen(true)}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>
        </div>
      </div>

      <div className="space-y-4">
        {m.description && <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Description</div>
          <p className="whitespace-pre-wrap text-sm">{m.description}</p>
        </CardContent></Card>}
        {m.expected_impact && <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Expected impact</div>
          <p className="whitespace-pre-wrap text-sm">{m.expected_impact}</p>
        </CardContent></Card>}
        {m.actual_notes && <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Notes</div>
          <p className="whitespace-pre-wrap text-sm">{m.actual_notes}</p>
        </CardContent></Card>}
        <Card><CardContent className="p-4 flex flex-wrap gap-2">
          {m.expand?.services?.map((s) => <RelationChip key={s.id} type="service" id={s.id} label={s.name} />)}
          {m.expand?.assets?.map((a) => <RelationChip key={a.id} type="asset" id={a.id} label={a.name} />)}
        </CardContent></Card>
      </div>

      <MaintenanceFormDialog open={editOpen} onOpenChange={setEditOpen} maintenance={m} />

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete maintenance</DialogTitle>
            <DialogDescription>Record what happened during the window.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <FormField label="Notes" hint="What was done?">
              <Textarea value={actualNotes} onChange={(e) => setActualNotes(e.target.value)} rows={4} />
            </FormField>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Create change record</div>
                <div className="text-xs text-muted-foreground">Generate a corresponding change entry</div>
              </div>
              <Switch checked={createChange} onCheckedChange={setCreateChange} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>Cancel</Button>
            <Button onClick={() => completeMut.mutate()} disabled={completeMut.isPending}>
              {completeMut.isPending ? "Completing…" : "Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen}
        title="Delete maintenance?" description="The maintenance window will be removed."
        variant="danger" confirmLabel="Delete"
        onConfirm={() => deleteMut.mutate()} loading={deleteMut.isPending} />
    </PageContainer>
  );
}
