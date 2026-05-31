import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { ResourceListPage } from "@/components/shared/ResourceListPage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { FormField } from "@/components/shared/FormField";
import { EntityPicker } from "@/components/shared/EntityPicker";
import { DatePicker } from "@/components/shared/DatePicker";
import { tasksApi, projectsApi, aiApi } from "@/api";
import { formatDate } from "@/lib/date";
import type { Task } from "@/types";

const STATUSES = ["todo", "in_progress", "blocked", "completed"] as const;
const PRIORITIES = ["low", "medium", "high", "critical"] as const;

export function TasksListPage() {
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const navigate = useNavigate();

  const extraFilter = [
    status !== "all" ? `status = "${status}"` : "",
    priority !== "all" ? `priority = "${priority}"` : "",
  ].filter(Boolean).join(" && ") || undefined;

  return (
    <ResourceListPage<Task>
      title="Tasks"
      description="Track what needs to be done"
      queryKey="tasks"
      fetchList={(p) => tasksApi.list(p as Record<string, string | number | undefined>)}
      defaultSort="-created"
      searchFields={["title", "description"]}
      extraFilter={extraFilter}
      createLabel="New task"
      rowHref={(t) => `/tasks/${t.id}`}
      columns={[
        { key: "title", label: "Title", render: (t) => <span className="font-medium">{t.title}</span> },
        { key: "status", label: "Status", width: "140px", render: (t) => <StatusBadge status={t.status} /> },
        { key: "priority", label: "Priority", width: "120px", render: (t) => <PriorityBadge priority={t.priority} /> },
        { key: "due", label: "Due", width: "140px", render: (t) => (t.due_date ? formatDate(t.due_date) : "—") },
        {
          key: "actions",
          label: "",
          width: "60px",
          render: (t) =>
            t.status !== "completed" ? (
              <CompleteButton id={t.id} onCompleted={(taskId) => navigate({ to: `/tasks/${taskId}` })} />
            ) : null,
        },
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
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </>
      }
      createDialog={({ open, onOpenChange }) => <TaskFormDialog open={open} onOpenChange={onOpenChange} />}
    />
  );
}

function CompleteButton({ id, onCompleted }: { id: string; onCompleted: (id: string) => void }) {
  const qc = useQueryClient();
  const [suggestion, setSuggestion] = useState<{ id: string; content: string } | null>(null);

  const completeMutation = useMutation({
    mutationFn: () => tasksApi.complete(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
      toast.success("Task completed");
      if (res.suggestion) {
        setSuggestion(res.suggestion);
      }
    },
  });

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        title="Mark complete"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          completeMutation.mutate();
        }}
      >
        <CheckCircle2 className="h-4 w-4" />
      </Button>
      <Dialog open={!!suggestion} onOpenChange={(o) => !o && setSuggestion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Suggested change summary
            </DialogTitle>
            <DialogDescription>
              Rally can record a change from this completed task. Edit if you like.
            </DialogDescription>
          </DialogHeader>
          {suggestion && (
            <Textarea
              value={suggestion.content}
              onChange={(e) => setSuggestion({ ...suggestion, content: e.target.value })}
              rows={6}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuggestion(null)}>Dismiss</Button>
            <Button
              onClick={async () => {
                if (!suggestion) return;
                await aiApi.acceptSuggestion(suggestion.id);
                toast.success("Suggestion saved");
                setSuggestion(null);
                onCompleted(id);
              }}
            >
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task?: Task;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string>("todo");
  const [priority, setPriority] = useState<string>("medium");
  const [project, setProject] = useState<string>("");
  const [services, setServices] = useState<string[]>([]);
  const [assets, setAssets] = useState<string[]>([]);
  const [due, setDue] = useState("");

  const { data: projects } = useQuery({
    queryKey: ["projects", "for-task"],
    queryFn: () => projectsApi.list({ perPage: 200 }),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? "");
      setDescription(task?.description ?? "");
      setStatus(task?.status ?? "todo");
      setPriority(task?.priority ?? "medium");
      setProject(task?.project ?? "");
      setServices(task?.services ?? []);
      setAssets(task?.assets ?? []);
      setDue(task?.due_date ?? "");
    }
  }, [open, task]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        description,
        status: status as never,
        priority: priority as never,
        project: project || undefined,
        services,
        assets,
        due_date: due || undefined,
      };
      if (task) return tasksApi.update(task.id, payload);
      return tasksApi.create(payload);
    },
    onSuccess: () => {
      toast.success(task ? "Task updated" : "Task created");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
      onOpenChange(false);
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg ?? "Failed to save task");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
          <FormField label="Title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </FormField>
          <FormField label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Status">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Priority">
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Project">
              <Select value={project || "none"} onValueChange={(v) => setProject(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects?.items.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Due date">
              <DatePicker value={due} onChange={setDue} type="datetime-local" />
            </FormField>
          </div>
          <FormField label="Services">
            <EntityPicker type="service" value={services} onChange={setServices} />
          </FormField>
          <FormField label="Assets">
            <EntityPicker type="asset" value={assets} onChange={setAssets} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !title.trim()}>
            {mutation.isPending ? "Saving…" : task ? "Save changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
