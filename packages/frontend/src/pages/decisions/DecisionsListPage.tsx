import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { ResourceListPage } from "@/components/shared/ResourceListPage";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { FormField } from "@/components/shared/FormField";
import { EntityPicker } from "@/components/shared/EntityPicker";
import { RelationChip } from "@/components/shared/RelationChip";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DatePicker } from "@/components/shared/DatePicker";
import { Skeleton } from "@/components/ui/skeleton";
import { decisionsApi } from "@/api";
import { formatDate } from "@/lib/date";
import type { Decision } from "@/types";

export function DecisionsListPage() {
  return (
    <ResourceListPage<Decision>
      title="Decisions"
      description="Architecture and operational decisions worth remembering"
      queryKey="decisions"
      fetchList={(p) => decisionsApi.list(p as Record<string, string | number | undefined>)}
      searchFields={["title", "decision", "reasoning"]}
      createLabel="New decision"
      rowHref={(d) => `/decisions/${d.id}`}
      defaultSort="-date"
      columns={[
        { key: "title", label: "Title", render: (d) => <span className="font-medium">{d.title}</span> },
        { key: "date", label: "Date", width: "140px", render: (d) => d.date ? formatDate(d.date) : "—" },
      ]}
      createDialog={({ open, onOpenChange }) => <DecisionFormDialog open={open} onOpenChange={onOpenChange} />}
    />
  );
}

export function DecisionFormDialog({ open, onOpenChange, decision }: { open: boolean; onOpenChange: (v: boolean) => void; decision?: Decision }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Decision>>({});

  useEffect(() => {
    if (open) setForm(decision ?? { date: new Date().toISOString() });
  }, [open, decision]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (decision) return decisionsApi.update(decision.id, form as Partial<Decision>);
      return decisionsApi.create(form as Partial<Decision>);
    },
    onSuccess: () => {
      toast.success(decision ? "Updated" : "Decision recorded");
      qc.invalidateQueries({ queryKey: ["decisions"] });
      onOpenChange(false);
    },
  });

  const set = <K extends keyof Decision>(k: K, v: Decision[K]) => setForm({ ...form, [k]: v });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{decision ? "Edit decision" : "Record a decision"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
          <FormField label="Title" required>
            <Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} autoFocus />
          </FormField>
          <FormField label="Decision" required hint="What was decided?">
            <Textarea value={form.decision ?? ""} onChange={(e) => set("decision", e.target.value)} rows={3} />
          </FormField>
          <FormField label="Reasoning" hint="Why?">
            <Textarea value={form.reasoning ?? ""} onChange={(e) => set("reasoning", e.target.value)} rows={3} />
          </FormField>
          <FormField label="Alternatives" hint="What did you consider?">
            <Textarea value={form.alternatives ?? ""} onChange={(e) => set("alternatives", e.target.value)} rows={2} />
          </FormField>
          <FormField label="Date">
            <DatePicker value={form.date ?? ""} onChange={(v) => set("date", v)} />
          </FormField>
          <FormField label="Projects"><EntityPicker type="project" value={form.projects ?? []} onChange={(v) => set("projects", v)} /></FormField>
          <FormField label="Services"><EntityPicker type="service" value={form.services ?? []} onChange={(v) => set("services", v)} /></FormField>
          <FormField label="Assets"><EntityPicker type="asset" value={form.assets ?? []} onChange={(v) => set("assets", v)} /></FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.title?.trim() || !form.decision?.trim() || mutation.isPending}>
            {mutation.isPending ? "Saving…" : decision ? "Save" : "Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DecisionDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: decision, isLoading } = useQuery({
    queryKey: ["decision", id],
    queryFn: () => decisionsApi.get(id),
  });
  const deleteMut = useMutation({
    mutationFn: () => decisionsApi.remove(id),
    onSuccess: () => {
      toast.success("Decision deleted");
      qc.invalidateQueries({ queryKey: ["decisions"] });
      void navigate({ to: "/decisions" });
    },
  });

  if (isLoading || !decision) {
    return (<PageContainer><Skeleton className="h-10 w-1/2 mb-4" /><Skeleton className="h-64 w-full" /></PageContainer>);
  }
  return (
    <PageContainer>
      <Link to="/decisions" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to decisions
      </Link>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{decision.title}</h1>
          {decision.date && <div className="mt-1 text-sm text-muted-foreground">{formatDate(decision.date)}</div>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="mr-1 h-4 w-4" />Edit</Button>
          <Button variant="outline" onClick={() => setConfirmOpen(true)}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>
        </div>
      </div>

      <div className="space-y-4">
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Decision</div>
          <p className="whitespace-pre-wrap">{decision.decision}</p>
        </CardContent></Card>
        {decision.reasoning && <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Reasoning</div>
          <p className="whitespace-pre-wrap text-sm">{decision.reasoning}</p>
        </CardContent></Card>}
        {decision.alternatives && <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Alternatives considered</div>
          <p className="whitespace-pre-wrap text-sm">{decision.alternatives}</p>
        </CardContent></Card>}
        <Card><CardContent className="p-4 flex flex-wrap gap-3">
          {decision.expand?.projects?.map((p) => <RelationChip key={p.id} type="project" id={p.id} label={p.name} />)}
          {decision.expand?.services?.map((s) => <RelationChip key={s.id} type="service" id={s.id} label={s.name} />)}
          {decision.expand?.assets?.map((a) => <RelationChip key={a.id} type="asset" id={a.id} label={a.name} />)}
        </CardContent></Card>
      </div>

      <DecisionFormDialog open={editOpen} onOpenChange={setEditOpen} decision={decision} />
      <ConfirmDialog
        open={confirmOpen} onOpenChange={setConfirmOpen}
        title="Delete decision?" description="This will be permanently removed."
        variant="danger" confirmLabel="Delete"
        onConfirm={() => deleteMut.mutate()} loading={deleteMut.isPending}
      />
    </PageContainer>
  );
}
