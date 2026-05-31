import { useParams, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, Sparkles } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RelationChip } from "@/components/shared/RelationChip";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { changesApi } from "@/api";
import { formatDateTime } from "@/lib/date";
import { ChangeFormDialog } from "./ChangesListPage";

export function ChangeDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: change, isLoading } = useQuery({
    queryKey: ["change", id],
    queryFn: () => changesApi.get(id),
  });

  const deleteMut = useMutation({
    mutationFn: () => changesApi.remove(id),
    onSuccess: () => {
      toast.success("Change deleted");
      qc.invalidateQueries({ queryKey: ["changes"] });
      void navigate({ to: "/changes" });
    },
  });
  const summaryMut = useMutation({
    mutationFn: () => changesApi.generateSummary(id),
    onSuccess: () => {
      toast.success("Summary regenerated");
      qc.invalidateQueries({ queryKey: ["change", id] });
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg ?? "AI is not available");
    },
  });

  if (isLoading || !change) {
    return (<PageContainer><Skeleton className="h-10 w-1/2 mb-4" /><Skeleton className="h-64 w-full" /></PageContainer>);
  }

  return (
    <PageContainer>
      <Link to="/changes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to changes
      </Link>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{change.title}</h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize">{change.change_type.replace("_", " ")}</span>
            <span className="text-xs text-muted-foreground">{formatDateTime(change.created)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => summaryMut.mutate()} disabled={summaryMut.isPending}>
            <Sparkles className="mr-1 h-4 w-4" />Regenerate summary
          </Button>
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="mr-1 h-4 w-4" />Edit</Button>
          <Button variant="outline" onClick={() => setConfirmOpen(true)}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {change.summary && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary">AI Summary</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{change.summary}</p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Description</div>
              {change.description ? (
                <p className="whitespace-pre-wrap text-sm">{change.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No description.</p>
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardContent className="p-4 space-y-3">
              {change.expand?.project && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Project</div>
                  <RelationChip type="project" id={change.expand.project.id} label={change.expand.project.name} />
                </div>
              )}
              {change.expand?.services?.length && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Services</div>
                  <div className="flex flex-wrap gap-1">
                    {change.expand.services.map((s) => <RelationChip key={s.id} type="service" id={s.id} label={s.name} />)}
                  </div>
                </div>
              )}
              {change.expand?.assets?.length && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Assets</div>
                  <div className="flex flex-wrap gap-1">
                    {change.expand.assets.map((a) => <RelationChip key={a.id} type="asset" id={a.id} label={a.name} />)}
                  </div>
                </div>
              )}
              {change.expand?.source_task && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Source task</div>
                  <RelationChip type="task" id={change.expand.source_task.id} label={change.expand.source_task.title} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ChangeFormDialog open={editOpen} onOpenChange={setEditOpen} change={change} />
      <ConfirmDialog
        open={confirmOpen} onOpenChange={setConfirmOpen}
        title="Delete change?" description="The change log entry will be removed."
        variant="danger" confirmLabel="Delete"
        onConfirm={() => deleteMut.mutate()} loading={deleteMut.isPending}
      />
    </PageContainer>
  );
}
