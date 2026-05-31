import { useParams, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, Activity, ListChecks, Wrench, BookOpen, Lightbulb } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/ui/badge";
import { TimelineEntryCard } from "@/components/shared/TimelineEntryCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { projectsApi, tasksApi, changesApi, decisionsApi, docsApi } from "@/api";
import { ProjectFormDialog } from "./ProjectsListPage";

export function ProjectDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectsApi.get(id),
  });
  const { data: stats } = useQuery({
    queryKey: ["project", id, "stats"],
    queryFn: () => projectsApi.stats(id),
    enabled: !!project,
  });
  const { data: timeline } = useQuery({
    queryKey: ["project", id, "timeline"],
    queryFn: () => projectsApi.timeline(id, { perPage: 50 }),
    enabled: !!project,
  });
  const { data: tasks } = useQuery({
    queryKey: ["project", id, "tasks"],
    queryFn: () => tasksApi.list({ filter: `project = "${id}"`, perPage: 100 }),
    enabled: !!project,
  });
  const { data: changes } = useQuery({
    queryKey: ["project", id, "changes"],
    queryFn: () => changesApi.list({ filter: `project = "${id}"`, perPage: 100 }),
    enabled: !!project,
  });
  const { data: decisions } = useQuery({
    queryKey: ["project", id, "decisions"],
    queryFn: () => decisionsApi.list({ filter: `projects ~ "${id}"`, perPage: 100 }),
    enabled: !!project,
  });
  const { data: docs } = useQuery({
    queryKey: ["project", id, "docs"],
    queryFn: () => docsApi.list({ filter: `projects ~ "${id}"`, perPage: 100 }),
    enabled: !!project,
  });

  const deleteMut = useMutation({
    mutationFn: () => projectsApi.remove(id),
    onSuccess: () => {
      toast.success("Project deleted");
      qc.invalidateQueries({ queryKey: ["projects"] });
      void navigate({ to: "/projects" });
    },
  });

  if (isLoading || !project) {
    return (
      <PageContainer>
        <Skeleton className="h-10 w-1/2 mb-4" />
        <Skeleton className="h-64 w-full" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to projects
      </Link>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-3xl">{project.icon || "📁"}</span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <StatusBadge status={project.status} />
              {project.description && <span className="text-sm text-muted-foreground">{project.description}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1 h-4 w-4" /> Edit
          </Button>
          <Button variant="outline" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatTile label="Tasks (total)" value={stats?.tasks.total ?? 0} />
        <StatTile label="Open tasks" value={(stats?.tasks.todo ?? 0) + (stats?.tasks.in_progress ?? 0) + (stats?.tasks.blocked ?? 0)} />
        <StatTile label="Completed" value={stats?.tasks.completed ?? 0} />
        <StatTile label="Changes" value={stats?.changes ?? 0} />
        <StatTile label="Docs" value={stats?.docs ?? 0} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview"><Activity className="mr-1 h-3.5 w-3.5" />Overview</TabsTrigger>
          <TabsTrigger value="tasks"><ListChecks className="mr-1 h-3.5 w-3.5" />Tasks ({tasks?.totalItems ?? 0})</TabsTrigger>
          <TabsTrigger value="changes"><Wrench className="mr-1 h-3.5 w-3.5" />Changes ({changes?.totalItems ?? 0})</TabsTrigger>
          <TabsTrigger value="decisions"><Lightbulb className="mr-1 h-3.5 w-3.5" />Decisions ({decisions?.totalItems ?? 0})</TabsTrigger>
          <TabsTrigger value="docs"><BookOpen className="mr-1 h-3.5 w-3.5" />Docs ({docs?.totalItems ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-2 mt-4">
          {(timeline?.items.length ?? 0) === 0 ? (
            <EmptyState title="No activity yet" description="Activity on this project will appear here." />
          ) : (
            timeline?.items.map((e) => <TimelineEntryCard key={e.id} entry={e} />)
          )}
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <ItemList items={tasks?.items ?? []} renderItem={(t) => (
            <Link key={t.id} to="/tasks/$id" params={{ id: t.id }} className="block rounded-md border p-3 hover:bg-accent">
              <div className="flex items-center justify-between"><span className="font-medium">{t.title}</span><StatusBadge status={t.status} /></div>
            </Link>
          )} emptyText="No tasks in this project." />
        </TabsContent>

        <TabsContent value="changes" className="mt-4">
          <ItemList items={changes?.items ?? []} renderItem={(c) => (
            <Link key={c.id} to="/changes/$id" params={{ id: c.id }} className="block rounded-md border p-3 hover:bg-accent">
              <div className="font-medium">{c.title}</div>
            </Link>
          )} emptyText="No changes for this project." />
        </TabsContent>

        <TabsContent value="decisions" className="mt-4">
          <ItemList items={decisions?.items ?? []} renderItem={(d) => (
            <Link key={d.id} to="/decisions/$id" params={{ id: d.id }} className="block rounded-md border p-3 hover:bg-accent">
              <div className="font-medium">{d.title}</div>
            </Link>
          )} emptyText="No decisions linked to this project." />
        </TabsContent>

        <TabsContent value="docs" className="mt-4">
          <ItemList items={docs?.items ?? []} renderItem={(d) => (
            <Link key={d.id} to="/docs/$id" params={{ id: d.id }} className="block rounded-md border p-3 hover:bg-accent">
              <div className="font-medium">{d.title}</div>
            </Link>
          )} emptyText="No docs linked." />
        </TabsContent>
      </Tabs>

      <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete project?"
        description="This will permanently delete the project. Tasks and changes will remain but their project link will be cleared."
        variant="danger"
        confirmLabel="Delete"
        onConfirm={() => deleteMut.mutate()}
        loading={deleteMut.isPending}
      />
    </PageContainer>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function ItemList<T extends { id: string }>({ items, renderItem, emptyText }: { items: T[]; renderItem: (item: T) => React.ReactNode; emptyText: string }) {
  if (items.length === 0) return <EmptyState title={emptyText} />;
  return <div className="space-y-2">{items.map(renderItem)}</div>;
}
