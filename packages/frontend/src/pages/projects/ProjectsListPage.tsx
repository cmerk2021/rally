import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/shared/FormField";
import { Textarea } from "@/components/ui/input";
import { projectsApi } from "@/api";
import { formatDate } from "@/lib/date";

const STATUSES: Array<"active" | "paused" | "completed" | "archived"> = [
  "active", "paused", "completed", "archived",
];

export function ProjectsListPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const filter = (() => {
    const parts: string[] = [];
    if (query) parts.push(`(name ~ "${query.replace(/"/g, '\\"')}" || description ~ "${query.replace(/"/g, '\\"')}")`);
    if (status !== "all") parts.push(`status = "${status}"`);
    return parts.join(" && ") || undefined;
  })();

  const { data, isLoading } = useQuery({
    queryKey: ["projects", { query, status }],
    queryFn: () => projectsApi.list({ filter, perPage: 100 }),
  });

  return (
    <PageContainer
      title="Projects"
      description="Group related tasks, changes, and decisions"
      actions={
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> New project
        </Button>
      }
    >
      <Card className="mb-4">
        <CardContent className="p-3 flex gap-2 flex-wrap">
          <Input
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs h-9"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create a project to group related tasks and changes."
          action={{ label: "Create project", onClick: () => setOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.items.map((p) => (
            <Link key={p.id} to="/projects/$id" params={{ id: p.id }}>
              <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-2xl">{p.icon || "📁"}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <h3 className="mt-2 font-semibold truncate">{p.name}</h3>
                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                  )}
                  <div className="mt-3 text-xs text-muted-foreground">
                    Updated {formatDate(p.updated)}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <ProjectFormDialog open={open} onOpenChange={setOpen} />
    </PageContainer>
  );
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project?: {
    id: string;
    name: string;
    description: string;
    status: string;
    color: string;
    icon: string;
  };
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string>("active");
  const [color, setColor] = useState("#6366f1");
  const [icon, setIcon] = useState("📁");

  useEffect(() => {
    if (open) {
      setName(project?.name ?? "");
      setDescription(project?.description ?? "");
      setStatus(project?.status ?? "active");
      setColor(project?.color ?? "#6366f1");
      setIcon(project?.icon ?? "📁");
    }
  }, [open, project]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { name, description, status: status as never, color, icon };
      if (project) return projectsApi.update(project.id, payload);
      return projectsApi.create(payload);
    },
    onSuccess: (created) => {
      toast.success(project ? "Project updated" : "Project created");
      qc.invalidateQueries({ queryKey: ["projects"] });
      onOpenChange(false);
      if (!project && created?.id) {
        void navigate({ to: `/projects/${created.id}` });
      }
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg ?? "Failed to save");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <FormField label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </FormField>
          <FormField label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </FormField>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Status">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Color">
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-full p-1" />
            </FormField>
            <FormField label="Icon">
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="📁" />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !name.trim()}>
            {mutation.isPending ? "Saving…" : project ? "Save changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
