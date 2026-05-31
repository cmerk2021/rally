import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ResourceListPage } from "@/components/shared/ResourceListPage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/FormField";
import { EntityPicker } from "@/components/shared/EntityPicker";
import { docsApi } from "@/api";
import { formatDate } from "@/lib/date";
import type { Documentation } from "@/types";

export function DocsListPage() {
  return (
    <ResourceListPage<Documentation>
      title="Documentation"
      description="Knowledge base for your homelab"
      queryKey="docs"
      fetchList={(p) => docsApi.list(p as Record<string, string | number | undefined>)}
      searchFields={["title", "content_text"]}
      createLabel="New document"
      rowHref={(d) => `/docs/${d.id}`}
      columns={[
        { key: "title", label: "Title", render: (d) => <span className="font-medium">{d.title}</span> },
        { key: "tags", label: "Tags", width: "200px", render: (d) => (
          <div className="flex flex-wrap gap-1">
            {(d.tags ?? []).slice(0, 3).map((t) => <span key={t} className="text-[10px] rounded bg-muted px-1.5 py-0.5">{t}</span>)}
          </div>
        ) },
        { key: "reviewed", label: "Last reviewed", width: "160px", render: (d) => d.last_reviewed ? formatDate(d.last_reviewed) : "—" },
        { key: "updated", label: "Updated", width: "140px", render: (d) => formatDate(d.updated) },
      ]}
      createDialog={({ open, onOpenChange }) => <DocFormDialog open={open} onOpenChange={onOpenChange} />}
    />
  );
}

export function DocFormDialog({ open, onOpenChange, doc }: { open: boolean; onOpenChange: (v: boolean) => void; doc?: Documentation }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [reviewDays, setReviewDays] = useState(0);
  const [services, setServices] = useState<string[]>([]);
  const [assets, setAssets] = useState<string[]>([]);
  const [projects, setProjects] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setTitle(doc?.title ?? "");
      setTags((doc?.tags ?? []).join(", "));
      setReviewDays(doc?.review_interval_days ?? 0);
      setServices(doc?.services ?? []);
      setAssets(doc?.assets ?? []);
      setProjects(doc?.projects ?? []);
    }
  }, [open, doc]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        review_interval_days: reviewDays,
        services,
        assets,
        projects,
        content: doc?.content ?? { type: "doc", content: [{ type: "paragraph" }] },
        content_text: doc?.content_text ?? "",
      };
      if (doc) return docsApi.update(doc.id, payload);
      return docsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(doc ? "Updated" : "Document created");
      qc.invalidateQueries({ queryKey: ["docs"] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{doc ? "Edit document" : "New document"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
          <FormField label="Title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </FormField>
          <FormField label="Tags" hint="Comma-separated">
            <Input value={tags} onChange={(e) => setTags(e.target.value)} />
          </FormField>
          <FormField label="Review interval (days)" hint="0 disables review reminders">
            <Input type="number" min={0} value={reviewDays} onChange={(e) => setReviewDays(Number(e.target.value))} />
          </FormField>
          <FormField label="Services"><EntityPicker type="service" value={services} onChange={setServices} /></FormField>
          <FormField label="Assets"><EntityPicker type="asset" value={assets} onChange={setAssets} /></FormField>
          <FormField label="Projects"><EntityPicker type="project" value={projects} onChange={setProjects} /></FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!title.trim() || mutation.isPending}>
            {mutation.isPending ? "Saving…" : doc ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
