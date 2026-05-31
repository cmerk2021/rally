import { useParams, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Pencil, Trash2, RotateCcw, Sparkles } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { RelationChip } from "@/components/shared/RelationChip";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { tasksApi, aiApi } from "@/api";
import { formatDate, formatDateTime } from "@/lib/date";
import { TaskFormDialog } from "./TasksListPage";

export function TaskDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: task, isLoading } = useQuery({
    queryKey: ["task", id],
    queryFn: () => tasksApi.get(id),
  });

  const { data: relSuggestions } = useQuery({
    queryKey: ["ai", "suggest-rel", id],
    queryFn: () => aiApi.suggestRelationships(task?.title ?? "", task?.description ?? ""),
    enabled: !!task && (!task.services?.length || !task.assets?.length),
  });

  const completeMut = useMutation({
    mutationFn: () => tasksApi.complete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task", id] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task completed");
    },
  });
  const reopenMut = useMutation({
    mutationFn: () => tasksApi.reopen(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task", id] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task reopened");
    },
  });
  const deleteMut = useMutation({
    mutationFn: () => tasksApi.remove(id),
    onSuccess: () => {
      toast.success("Task deleted");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      void navigate({ to: "/tasks" });
    },
  });

  if (isLoading || !task) {
    return (
      <PageContainer>
        <Skeleton className="h-10 w-1/2 mb-4" />
        <Skeleton className="h-64 w-full" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link to="/tasks" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to tasks
      </Link>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {task.due_date && <span className="text-xs text-muted-foreground">Due {formatDateTime(task.due_date)}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {task.status !== "completed" ? (
            <Button onClick={() => completeMut.mutate()} disabled={completeMut.isPending}>
              <CheckCircle2 className="mr-1 h-4 w-4" /> Complete
            </Button>
          ) : (
            <Button variant="outline" onClick={() => reopenMut.mutate()} disabled={reopenMut.isPending}>
              <RotateCcw className="mr-1 h-4 w-4" /> Reopen
            </Button>
          )}
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1 h-4 w-4" /> Edit
          </Button>
          <Button variant="outline" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-medium mb-2">Description</h3>
              {task.description ? (
                <p className="whitespace-pre-wrap text-sm">{task.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No description.</p>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Created</div>
                <div className="text-sm">{formatDate(task.created)}</div>
              </div>
              {task.completed_at && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Completed</div>
                  <div className="text-sm">{formatDateTime(task.completed_at)}</div>
                </div>
              )}
              {task.expand?.project && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Project</div>
                  <RelationChip type="project" id={task.expand.project.id} label={task.expand.project.name} />
                </div>
              )}
              {(task.services?.length ?? 0) > 0 && task.expand?.services && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Services</div>
                  <div className="flex flex-wrap gap-1">
                    {task.expand.services.map((s) => <RelationChip key={s.id} type="service" id={s.id} label={s.name} />)}
                  </div>
                </div>
              )}
              {(task.assets?.length ?? 0) > 0 && task.expand?.assets && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Assets</div>
                  <div className="flex flex-wrap gap-1">
                    {task.expand.assets.map((a) => <RelationChip key={a.id} type="asset" id={a.id} label={a.name} />)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {relSuggestions && ((relSuggestions.services?.length ?? 0) > 0 || (relSuggestions.assets?.length ?? 0) > 0) && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">AI suggestions</span>
                </div>
                {(relSuggestions.services?.length ?? 0) > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Possible services: {relSuggestions.services.join(", ")}
                  </div>
                )}
                {(relSuggestions.assets?.length ?? 0) > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Possible assets: {relSuggestions.assets.join(", ")}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <TaskFormDialog open={editOpen} onOpenChange={setEditOpen} task={task} />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete task?"
        description="This will permanently delete the task."
        variant="danger"
        confirmLabel="Delete"
        onConfirm={() => deleteMut.mutate()}
        loading={deleteMut.isPending}
      />
    </PageContainer>
  );
}
