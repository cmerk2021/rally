import { useParams, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, CheckCircle2, Save } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { RichTextRenderer } from "@/components/shared/RichTextRenderer";
import { RelationChip } from "@/components/shared/RelationChip";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { docsApi } from "@/api";
import { formatDate, relative } from "@/lib/date";
import { DocFormDialog } from "./DocsListPage";

export function DocDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editMeta, setEditMeta] = useState(false);
  const [editContent, setEditContent] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [content, setContent] = useState<unknown>(null);
  const [contentText, setContentText] = useState("");

  const { data: doc, isLoading } = useQuery({
    queryKey: ["doc", id],
    queryFn: () => docsApi.get(id),
  });

  useEffect(() => {
    if (doc) {
      setContent(doc.content);
      setContentText(doc.content_text);
    }
  }, [doc]);

  const saveMut = useMutation({
    mutationFn: () => docsApi.update(id, { content, content_text: contentText }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["doc", id] });
      setEditContent(false);
    },
  });
  const reviewMut = useMutation({
    mutationFn: () => docsApi.markReviewed(id),
    onSuccess: () => {
      toast.success("Marked as reviewed");
      qc.invalidateQueries({ queryKey: ["doc", id] });
      qc.invalidateQueries({ queryKey: ["docs", "due-review"] });
    },
  });
  const deleteMut = useMutation({
    mutationFn: () => docsApi.remove(id),
    onSuccess: () => {
      toast.success("Document deleted");
      qc.invalidateQueries({ queryKey: ["docs"] });
      void navigate({ to: "/docs" });
    },
  });

  if (isLoading || !doc) {
    return (<PageContainer><Skeleton className="h-10 w-1/2 mb-4" /><Skeleton className="h-64 w-full" /></PageContainer>);
  }

  const overdue = doc.last_reviewed && doc.review_interval_days > 0 &&
    new Date(doc.last_reviewed).getTime() + doc.review_interval_days * 86400000 < Date.now();

  return (
    <PageContainer>
      <Link to="/docs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to docs
      </Link>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{doc.title}</h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {(doc.tags ?? []).map((t) => <span key={t} className="text-[10px] rounded bg-muted px-1.5 py-0.5">{t}</span>)}
            {doc.last_reviewed && (
              <span className={`text-xs ${overdue ? "text-amber-500" : "text-muted-foreground"}`}>
                Reviewed {relative(doc.last_reviewed)}{overdue ? " · overdue" : ""}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {doc.review_interval_days > 0 && (
            <Button variant="outline" onClick={() => reviewMut.mutate()}><CheckCircle2 className="mr-1 h-4 w-4" />Mark reviewed</Button>
          )}
          <Button variant="outline" onClick={() => setEditMeta(true)}><Pencil className="mr-1 h-4 w-4" />Edit metadata</Button>
          <Button variant="outline" onClick={() => setConfirmOpen(true)}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-6">
              {editContent ? (
                <>
                  <RichTextEditor
                    content={content as object | string | undefined}
                    onChange={(json, text) => { setContent(json); setContentText(text); }}
                  />
                  <div className="mt-3 flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => { setContent(doc.content); setContentText(doc.content_text); setEditContent(false); }}>Cancel</Button>
                    <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                      <Save className="mr-1 h-4 w-4" />{saveMut.isPending ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </>
              ) : (
                <div onDoubleClick={() => setEditContent(true)} title="Double-click to edit">
                  <RichTextRenderer content={doc.content} />
                  <div className="mt-4">
                    <Button variant="outline" size="sm" onClick={() => setEditContent(true)}>
                      <Pencil className="mr-1 h-3 w-3" />Edit content
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Created</div>
                <div>{formatDate(doc.created)}</div>
              </div>
              {doc.expand?.services?.length && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Services</div>
                  <div className="flex flex-wrap gap-1">{doc.expand.services.map((s) => <RelationChip key={s.id} type="service" id={s.id} label={s.name} />)}</div>
                </div>
              )}
              {doc.expand?.assets?.length && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Assets</div>
                  <div className="flex flex-wrap gap-1">{doc.expand.assets.map((a) => <RelationChip key={a.id} type="asset" id={a.id} label={a.name} />)}</div>
                </div>
              )}
              {doc.expand?.projects?.length && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Projects</div>
                  <div className="flex flex-wrap gap-1">{doc.expand.projects.map((p) => <RelationChip key={p.id} type="project" id={p.id} label={p.name} />)}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <DocFormDialog open={editMeta} onOpenChange={setEditMeta} doc={doc} />
      <ConfirmDialog
        open={confirmOpen} onOpenChange={setConfirmOpen}
        title="Delete document?" description="This document will be permanently removed."
        variant="danger" confirmLabel="Delete"
        onConfirm={() => deleteMut.mutate()} loading={deleteMut.isPending}
      />
    </PageContainer>
  );
}
