import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { ResourceListPage } from "@/components/shared/ResourceListPage";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { FormField } from "@/components/shared/FormField";
import { EntityPicker } from "@/components/shared/EntityPicker";
import { RelationChip } from "@/components/shared/RelationChip";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { incidentsApi } from "@/api";
import { formatDateTime } from "@/lib/date";
import type { Incident } from "@/types";

const STATUSES = ["investigating", "identified", "monitoring", "resolved"] as const;
const SEVERITIES = ["low", "medium", "high", "critical"] as const;

export function IncidentsListPage() {
  const [status, setStatus] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const extraFilter = [
    status !== "all" ? `status = "${status}"` : "",
    severity !== "all" ? `severity = "${severity}"` : "",
  ].filter(Boolean).join(" && ") || undefined;

  return (
    <ResourceListPage<Incident>
      title="Incidents"
      description="Active and historical incidents"
      queryKey="incidents"
      fetchList={(p) => incidentsApi.list(p as Record<string, string | number | undefined>)}
      searchFields={["title", "description"]}
      extraFilter={extraFilter}
      createLabel="Report incident"
      rowHref={(i) => `/incidents/${i.id}`}
      columns={[
        { key: "title", label: "Title", render: (i) => <span className="font-medium">{i.title}</span> },
        { key: "status", label: "Status", width: "140px", render: (i) => <StatusBadge status={i.status} /> },
        { key: "severity", label: "Severity", width: "120px", render: (i) => <PriorityBadge priority={i.severity} /> },
        { key: "started", label: "Started", width: "160px", render: (i) => i.started_at ? formatDateTime(i.started_at) : formatDateTime(i.created) },
      ]}
      filters={
        <>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severity</SelectItem>
              {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </>
      }
      createDialog={({ open, onOpenChange }) => <IncidentFormDialog open={open} onOpenChange={onOpenChange} />}
    />
  );
}

export function IncidentFormDialog({ open, onOpenChange, incident }: { open: boolean; onOpenChange: (v: boolean) => void; incident?: Incident }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Incident>>({});

  useEffect(() => {
    if (open) setForm(incident ?? { status: "investigating", severity: "medium", started_at: new Date().toISOString() });
  }, [open, incident]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (incident) return incidentsApi.update(incident.id, form as Partial<Incident>);
      return incidentsApi.create(form as Partial<Incident>);
    },
    onSuccess: () => {
      toast.success(incident ? "Updated" : "Incident reported");
      qc.invalidateQueries({ queryKey: ["incidents"] });
      onOpenChange(false);
    },
  });

  const set = <K extends keyof Incident>(k: K, v: Incident[K]) => setForm({ ...form, [k]: v });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{incident ? "Edit incident" : "Report incident"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
          <FormField label="Title" required>
            <Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} autoFocus />
          </FormField>
          <FormField label="Description">
            <Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} rows={3} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Status">
              <Select value={form.status ?? "investigating"} onValueChange={(v) => set("status", v as Incident["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Severity">
              <Select value={form.severity ?? "medium"} onValueChange={(v) => set("severity", v as Incident["severity"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label="Services"><EntityPicker type="service" value={form.services ?? []} onChange={(v) => set("services", v)} /></FormField>
          <FormField label="Assets"><EntityPicker type="asset" value={form.assets ?? []} onChange={(v) => set("assets", v)} /></FormField>
          <FormField label="Impact">
            <Textarea value={form.impact ?? ""} onChange={(e) => set("impact", e.target.value)} rows={2} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.title?.trim() || mutation.isPending}>
            {mutation.isPending ? "Saving…" : incident ? "Save" : "Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function IncidentDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rootCause, setRootCause] = useState("");
  const [resolution, setResolution] = useState("");
  const [impact, setImpact] = useState("");

  const { data: incident, isLoading } = useQuery({
    queryKey: ["incident", id],
    queryFn: () => incidentsApi.get(id),
  });

  useEffect(() => {
    if (incident) {
      setRootCause(incident.root_cause ?? "");
      setResolution(incident.resolution ?? "");
      setImpact(incident.impact ?? "");
    }
  }, [incident]);

  const resolveMut = useMutation({
    mutationFn: () => incidentsApi.resolve(id, { root_cause: rootCause, resolution, impact }),
    onSuccess: () => {
      toast.success("Incident resolved");
      qc.invalidateQueries({ queryKey: ["incident", id] });
      qc.invalidateQueries({ queryKey: ["incidents"] });
      setResolveOpen(false);
    },
  });
  const deleteMut = useMutation({
    mutationFn: () => incidentsApi.remove(id),
    onSuccess: () => {
      toast.success("Incident deleted");
      qc.invalidateQueries({ queryKey: ["incidents"] });
      void navigate({ to: "/incidents" });
    },
  });

  if (isLoading || !incident) {
    return (<PageContainer><Skeleton className="h-10 w-1/2 mb-4" /><Skeleton className="h-64 w-full" /></PageContainer>);
  }
  return (
    <PageContainer>
      <Link to="/incidents" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to incidents
      </Link>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{incident.title}</h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <StatusBadge status={incident.status} />
            <PriorityBadge priority={incident.severity} />
            {incident.started_at && <span className="text-xs text-muted-foreground">Started {formatDateTime(incident.started_at)}</span>}
            {incident.resolved_at && <span className="text-xs text-green-500">Resolved {formatDateTime(incident.resolved_at)}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {incident.status !== "resolved" && (
            <Button onClick={() => setResolveOpen(true)}><CheckCircle2 className="mr-1 h-4 w-4" />Resolve</Button>
          )}
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="mr-1 h-4 w-4" />Edit</Button>
          <Button variant="outline" onClick={() => setConfirmOpen(true)}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>
        </div>
      </div>

      <div className="space-y-4">
        {incident.description && <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Description</div>
          <p className="whitespace-pre-wrap text-sm">{incident.description}</p>
        </CardContent></Card>}
        {incident.impact && <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Impact</div>
          <p className="whitespace-pre-wrap text-sm">{incident.impact}</p>
        </CardContent></Card>}
        {incident.root_cause && <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Root cause</div>
          <p className="whitespace-pre-wrap text-sm">{incident.root_cause}</p>
        </CardContent></Card>}
        {incident.resolution && <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Resolution</div>
          <p className="whitespace-pre-wrap text-sm">{incident.resolution}</p>
        </CardContent></Card>}
        <Card><CardContent className="p-4 flex flex-wrap gap-3">
          {incident.expand?.services?.map((s) => <RelationChip key={s.id} type="service" id={s.id} label={s.name} />)}
          {incident.expand?.assets?.map((a) => <RelationChip key={a.id} type="asset" id={a.id} label={a.name} />)}
          {incident.expand?.related_changes?.map((c) => <RelationChip key={c.id} type="change" id={c.id} label={c.title} />)}
        </CardContent></Card>
      </div>

      <IncidentFormDialog open={editOpen} onOpenChange={setEditOpen} incident={incident} />

      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve incident</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <FormField label="Root cause">
              <Textarea value={rootCause} onChange={(e) => setRootCause(e.target.value)} rows={3} />
            </FormField>
            <FormField label="Resolution">
              <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} />
            </FormField>
            <FormField label="Impact summary">
              <Textarea value={impact} onChange={(e) => setImpact(e.target.value)} rows={2} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(false)}>Cancel</Button>
            <Button onClick={() => resolveMut.mutate()} disabled={resolveMut.isPending}>
              {resolveMut.isPending ? "Resolving…" : "Mark resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen} onOpenChange={setConfirmOpen}
        title="Delete incident?" description="The incident will be permanently removed."
        variant="danger" confirmLabel="Delete"
        onConfirm={() => deleteMut.mutate()} loading={deleteMut.isPending}
      />
    </PageContainer>
  );
}
