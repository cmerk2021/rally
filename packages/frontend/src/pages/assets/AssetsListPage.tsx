import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ResourceListPage } from "@/components/shared/ResourceListPage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { FormField } from "@/components/shared/FormField";
import { assetsApi } from "@/api";
import type { Asset } from "@/types";

const TYPES = ["server", "vm", "container_host", "nas", "router", "switch", "storage", "workstation", "rpi", "other"] as const;
const STATUSES = ["online", "offline", "maintenance", "unknown"] as const;

export function AssetsListPage() {
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const extraFilter = [
    status !== "all" ? `status = "${status}"` : "",
    type !== "all" ? `type = "${type}"` : "",
  ].filter(Boolean).join(" && ") || undefined;

  return (
    <ResourceListPage<Asset>
      title="Assets"
      description="Hardware and infrastructure that powers your homelab"
      queryKey="assets"
      fetchList={(p) => assetsApi.list(p as Record<string, string | number | undefined>)}
      searchFields={["name", "hostname", "ip_address", "notes"]}
      extraFilter={extraFilter}
      createLabel="New asset"
      rowHref={(a) => `/assets/${a.id}`}
      columns={[
        { key: "name", label: "Name", render: (a) => <span className="font-medium">{a.name}</span> },
        { key: "type", label: "Type", width: "120px", render: (a) => <span className="text-xs capitalize text-muted-foreground">{a.type.replace("_", " ")}</span> },
        { key: "hostname", label: "Hostname/IP", width: "200px", render: (a) => <span className="font-mono text-xs">{a.hostname || a.ip_address || "—"}</span> },
        { key: "status", label: "Status", width: "120px", render: (a) => <StatusBadge status={a.status} /> },
        { key: "location", label: "Location", width: "140px", render: (a) => a.location || "—" },
      ]}
      filters={
        <>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </>
      }
      createDialog={({ open, onOpenChange }) => <AssetFormDialog open={open} onOpenChange={onOpenChange} />}
    />
  );
}

export function AssetFormDialog({ open, onOpenChange, asset }: { open: boolean; onOpenChange: (v: boolean) => void; asset?: Asset }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Asset>>({});

  useEffect(() => {
    if (open) setForm(asset ?? { type: "server", status: "unknown" });
  }, [open, asset]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (asset) return assetsApi.update(asset.id, form as Partial<Asset>);
      return assetsApi.create(form as Partial<Asset>);
    },
    onSuccess: () => {
      toast.success(asset ? "Asset updated" : "Asset created");
      qc.invalidateQueries({ queryKey: ["assets"] });
      onOpenChange(false);
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg ?? "Failed to save");
    },
  });

  const set = <K extends keyof Asset>(k: K, v: Asset[K]) => setForm({ ...form, [k]: v });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{asset ? "Edit asset" : "New asset"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
          <FormField label="Name" required>
            <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} autoFocus />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type">
              <Select value={form.type ?? "server"} onValueChange={(v) => set("type", v as Asset["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Status">
              <Select value={form.status ?? "unknown"} onValueChange={(v) => set("status", v as Asset["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Hostname">
              <Input value={form.hostname ?? ""} onChange={(e) => set("hostname", e.target.value)} />
            </FormField>
            <FormField label="IP address">
              <Input value={form.ip_address ?? ""} onChange={(e) => set("ip_address", e.target.value)} />
            </FormField>
            <FormField label="OS">
              <Input value={form.os ?? ""} onChange={(e) => set("os", e.target.value)} placeholder="Ubuntu 24.04" />
            </FormField>
            <FormField label="CPU">
              <Input value={form.cpu ?? ""} onChange={(e) => set("cpu", e.target.value)} placeholder="Intel i7-12700" />
            </FormField>
            <FormField label="RAM (GB)">
              <Input type="number" value={form.ram_gb ?? 0} onChange={(e) => set("ram_gb", Number(e.target.value))} />
            </FormField>
            <FormField label="Storage (TB)">
              <Input type="number" step="0.1" value={form.storage_tb ?? 0} onChange={(e) => set("storage_tb", Number(e.target.value))} />
            </FormField>
            <FormField label="Location">
              <Input value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} />
            </FormField>
          </div>
          <FormField label="Notes">
            <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={3} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name?.trim()}>
            {mutation.isPending ? "Saving…" : asset ? "Save changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
