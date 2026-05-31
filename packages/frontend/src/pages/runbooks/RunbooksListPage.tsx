import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, Save } from "lucide-react";
import { ResourceListPage } from "@/components/shared/ResourceListPage";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/FormField";
import { EntityPicker } from "@/components/shared/EntityPicker";
import { RelationChip } from "@/components/shared/RelationChip";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { RichTextRenderer } from "@/components/shared/RichTextRenderer";
import { Skeleton } from "@/components/ui/skeleton";
import { runbooksApi } from "@/api";
import { formatDate } from "@/lib/date";
import type { Runbook } from "@/types";

export function RunbooksListPage() {
  return (
    <ResourceListPage<Runbook>
      title="Runbooks"
      description="Step-by-step playbooks for common operations"
      queryKey="runbooks"
      fetchList={(p) => runbooksApi.list(p as Record<string, string | number | undefined>)}
      searchFields={["title", "content_text"]}
      createLabel="New runbook"
      rowHref={(r) => `/runbooks/${r.id}`}
      columns={[
        { key: "title", label: "Title", render: (r) => <span className="font-medium">{r.title}</span> },
        { key: "tags", label: "Tags", width: "200px", render: (r) => (
          <div className="flex flex-wrap gap-1">{(r.tags ?? []).slice(0, 3).map((t) => <span key={t} className="text-[10px] rounded bg-muted px-1.5 py-0.5">{t}</span>)}</div>
        ) },
        { key: "updated", label: "Updated", width: "140px", render: (r) => formatDate(r.updated) },
      ]}
      createDialog={({ open, onOpenChange }) => <RunbookFormDialog open={open} onOpenChange={onOpenChange} />}
    />
  );
}

export function RunbookFormDialog({ open, onOpenChange, runbook }: { open: boolean; onOpenChange: (v: boolean) => void; runbook?: Runbook }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [assets, setAssets] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setTitle(runbook?.title ?? "");
      setTags((runbook?.tags ?? []).join(", "));
      setServices(runbook?.services ?? []);
      setAssets(runbook?.assets ?? []);
    }
  }, [open, runbook]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        services,
        assets,
        content: runbook?.content ?? { type: "doc", content: [{ type: "paragraph" }] },
        content_text: runbook?.content_text ?? "",
      };
      if (runbook) return runbooksApi.update(runbook.id, payload);
      return runbooksApi.create(payload);
    },
    onSuccess: () => {
      toast.success(runbook ? "Updated" : "Runbook created");
      qc.invalidateQueries({ queryKey: ["runbooks"] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{runbook ? "Edit runbook" : "New runbook"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <FormField label="Title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </FormField>
          <FormField label="Tags" hint="Comma-separated">
            <Input value={tags} onChange={(e) => setTags(e.target.value)} />
          </FormField>
          <FormField label="Services"><EntityPicker type="service" value={services} onChange={setServices} /></FormField>
          <FormField label="Assets"><EntityPicker type="asset" value={assets} onChange={setAssets} /></FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!title.trim() || mutation.isPending}>
            {mutation.isPending ? "Saving…" : runbook ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RunbookDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editMeta, setEditMeta] = useState(false);
  const [editContent, setEditContent] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [content, setContent] = useState<unknown>(null);
  const [contentText, setContentText] = useState("");

  const { data: runbook, isLoading } = useQuery({
    queryKey: ["runbook", id],
    queryFn: () => runbooksApi.get(id),
  });
  useEffect(() => {
    if (runbook) {
      setContent(runbook.content);
      setContentText(runbook.content_text);
    }
  }, [runbook]);

  const saveMut = useMutation({
    mutationFn: () => runbooksApi.update(id, { content, content_text: contentText }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["runbook", id] });
      setEditContent(false);
    },
  });
  const deleteMut = useMutation({
    mutationFn: () => runbooksApi.remove(id),
    onSuccess: () => {
      toast.success("Runbook deleted");
      qc.invalidateQueries({ queryKey: ["runbooks"] });
      void navigate({ to: "/runbooks" });
    },
  });

  if (isLoading || !runbook) {
    return (<PageContainer><Skeleton className="h-10 w-1/2 mb-4" /><Skeleton className="h-64 w-full" /></PageContainer>);
  }
  return (
    <PageContainer>
      <Link to="/runbooks" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to runbooks
      </Link>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{runbook.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {(runbook.tags ?? []).map((t) => <span key={t} className="text-[10px] rounded bg-muted px-1.5 py-0.5">{t}</span>)}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditMeta(true)}><Pencil className="mr-1 h-4 w-4" />Edit metadata</Button>
          <Button variant="outline" onClick={() => setConfirmOpen(true)}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <Card><CardContent className="p-6">
            {editContent ? (
              <>
                <RichTextEditor content={content as object | string} onChange={(json, text) => { setContent(json); setContentText(text); }} />
                <div className="mt-3 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setContent(runbook.content); setContentText(runbook.content_text); setEditContent(false); }}>Cancel</Button>
                  <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}><Save className="mr-1 h-4 w-4" />Save</Button>
                </div>
              </>
            ) : (
              <>
                <RichTextRenderer content={runbook.content} />
                <div className="mt-4"><Button variant="outline" size="sm" onClick={() => setEditContent(true)}><Pencil className="mr-1 h-3 w-3" />Edit content</Button></div>
              </>
            )}
          </CardContent></Card>
        </div>
        <div>
          <Card><CardContent className="p-4 flex flex-wrap gap-2">
            {runbook.expand?.services?.map((s) => <RelationChip key={s.id} type="service" id={s.id} label={s.name} />)}
            {runbook.expand?.assets?.map((a) => <RelationChip key={a.id} type="asset" id={a.id} label={a.name} />)}
          </CardContent></Card>
        </div>
      </div>

      <RunbookFormDialog open={editMeta} onOpenChange={setEditMeta} runbook={runbook} />
      <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen}
        title="Delete runbook?" description="This runbook will be permanently removed."
        variant="danger" confirmLabel="Delete"
        onConfirm={() => deleteMut.mutate()} loading={deleteMut.isPending} />
    </PageContainer>
  );
}
