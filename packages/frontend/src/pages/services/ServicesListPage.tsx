import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ResourceListPage } from "@/components/shared/ResourceListPage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { FormField } from "@/components/shared/FormField";
import { EntityPicker } from "@/components/shared/EntityPicker";
import { servicesApi } from "@/api";
import type { Service } from "@/types";

const STATUSES = ["running", "stopped", "degraded", "unknown"] as const;
const CATEGORIES = [
  "media", "networking", "monitoring", "storage", "security",
  "automation", "development", "communication", "other",
] as const;

export function ServicesListPage() {
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const extraFilter = [
    status !== "all" ? `status = "${status}"` : "",
    category !== "all" ? `category = "${category}"` : "",
  ].filter(Boolean).join(" && ") || undefined;

  return (
    <ResourceListPage<Service>
      title="Services"
      description="What's running in your homelab"
      queryKey="services"
      fetchList={(p) => servicesApi.list(p as Record<string, string | number | undefined>)}
      searchFields={["name", "description"]}
      extraFilter={extraFilter}
      createLabel="New service"
      rowHref={(s) => `/services/${s.id}`}
      columns={[
        { key: "name", label: "Name", render: (s) => <span className="font-medium">{s.icon ? `${s.icon} ` : ""}{s.name}</span> },
        { key: "category", label: "Category", width: "140px", render: (s) => <span className="text-xs text-muted-foreground capitalize">{s.category}</span> },
        { key: "status", label: "Status", width: "120px", render: (s) => <StatusBadge status={s.status} /> },
        { key: "url", label: "URL", width: "240px", render: (s) => s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline truncate inline-block max-w-[220px]">{s.url}</a> : "—" },
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
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </>
      }
      createDialog={({ open, onOpenChange }) => <ServiceFormDialog open={open} onOpenChange={onOpenChange} />}
    />
  );
}

export function ServiceFormDialog({ open, onOpenChange, service }: { open: boolean; onOpenChange: (v: boolean) => void; service?: Service }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Service>>({});

  useEffect(() => {
    if (open) {
      setForm(service ?? { status: "unknown", category: "other" });
    }
  }, [open, service]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (service) return servicesApi.update(service.id, form as Partial<Service>);
      return servicesApi.create(form as Partial<Service>);
    },
    onSuccess: () => {
      toast.success(service ? "Service updated" : "Service created");
      qc.invalidateQueries({ queryKey: ["services"] });
      onOpenChange(false);
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg ?? "Failed to save");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{service ? "Edit service" : "New service"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
          <FormField label="Name" required>
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </FormField>
          <FormField label="Description">
            <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Status">
              <Select value={form.status ?? "unknown"} onValueChange={(v) => setForm({ ...form, status: v as Service["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Category">
              <Select value={form.category ?? "other"} onValueChange={(v) => setForm({ ...form, category: v as Service["category"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="URL">
              <Input value={form.url ?? ""} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
            </FormField>
            <FormField label="Icon">
              <Input value={form.icon ?? ""} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🎬" />
            </FormField>
          </div>
          <FormField label="Hosted on (assets)">
            <EntityPicker type="asset" value={form.assets ?? []} onChange={(v) => setForm({ ...form, assets: v })} />
          </FormField>
          <FormField label="Depends on (services)">
            <EntityPicker type="service" value={form.dependencies ?? []} onChange={(v) => setForm({ ...form, dependencies: v })} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name?.trim()}>
            {mutation.isPending ? "Saving…" : service ? "Save changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
