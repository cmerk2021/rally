import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ResourceListPage } from "@/components/shared/ResourceListPage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/shared/FormField";
import { EntityPicker } from "@/components/shared/EntityPicker";
import { changesApi, projectsApi } from "@/api";
import { formatDate } from "@/lib/date";
import type { Change } from "@/types";

const TYPES = ["upgrade", "migration", "configuration", "installation", "removal", "incident_resolution", "maintenance", "other"] as const;

export function ChangesListPage() {
  const [type, setType] = useState<string>("all");
  const extraFilter = type !== "all" ? `change_type = "${type}"` : undefined;
  return (
    <ResourceListPage<Change>
      title="Changes"
      description="An immutable log of what you've changed"
      queryKey="changes"
      fetchList={(p) => changesApi.list(p as Record<string, string | number | undefined>)}
      searchFields={["title", "description", "summary"]}
      extraFilter={extraFilter}
      createLabel="New change"
      rowHref={(c) => `/changes/${c.id}`}
      defaultSort="-created"
      columns={[
        { key: "title", label: "Title", render: (c) => <span className="font-medium">{c.title}</span> },
        { key: "type", label: "Type", width: "180px", render: (c) => <span className="capitalize text-xs text-muted-foreground">{c.change_type.replace("_", " ")}</span> },
        { key: "created", label: "When", width: "140px", render: (c) => formatDate(c.created) },
      ]}
      filters={
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      }
      createDialog={({ open, onOpenChange }) => <ChangeFormDialog open={open} onOpenChange={onOpenChange} />}
    />
  );
}

export function ChangeFormDialog({ open, onOpenChange, change }: { open: boolean; onOpenChange: (v: boolean) => void; change?: Change }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Change>>({});

  const { data: projects } = useQuery({
    queryKey: ["projects", "for-change"],
    queryFn: () => projectsApi.list({ perPage: 200 }),
    enabled: open,
  });

  useEffect(() => {
    if (open) setForm(change ?? { change_type: "configuration" });
  }, [open, change]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (change) return changesApi.update(change.id, form as Partial<Change>);
      return changesApi.create(form as Partial<Change>);
    },
    onSuccess: () => {
      toast.success(change ? "Change updated" : "Change recorded");
      qc.invalidateQueries({ queryKey: ["changes"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
      onOpenChange(false);
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg ?? "Failed to save");
    },
  });

  const set = <K extends keyof Change>(k: K, v: Change[K]) => setForm({ ...form, [k]: v });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{change ? "Edit change" : "Record a change"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
          <FormField label="Title" required>
            <Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} autoFocus />
          </FormField>
          <FormField label="Description">
            <Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} rows={4} placeholder="What did you do?" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type">
              <Select value={form.change_type ?? "configuration"} onValueChange={(v) => set("change_type", v as Change["change_type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Project">
              <Select value={form.project || "none"} onValueChange={(v) => set("project", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects?.items.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label="Services">
            <EntityPicker type="service" value={form.services ?? []} onChange={(v) => set("services", v)} />
          </FormField>
          <FormField label="Assets">
            <EntityPicker type="asset" value={form.assets ?? []} onChange={(v) => set("assets", v)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.title?.trim()}>
            {mutation.isPending ? "Saving…" : change ? "Save" : "Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
