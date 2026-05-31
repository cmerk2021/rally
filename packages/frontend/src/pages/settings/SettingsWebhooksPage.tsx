import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/primitives";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { FormField } from "@/components/shared/FormField";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { settingsApi } from "@/api";
import type { WebhookToken } from "@/types";

export function SettingsWebhooksPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [showToken, setShowToken] = useState<{ name: string; token: string; id: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["webhooks"], queryFn: () => settingsApi.listWebhooks() });

  const updateMut = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => settingsApi.updateWebhook(id, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => settingsApi.deleteWebhook(id),
    onSuccess: () => {
      toast.success("Webhook deleted");
      qc.invalidateQueries({ queryKey: ["webhooks"] });
      setDeleteId(null);
    },
  });

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Tokens for ingesting external events at <code>POST /api/webhook/:token</code>.</p>
        <Button onClick={() => setCreateOpen(true)}><Plus className="mr-1 h-4 w-4" />New webhook</Button>
      </div>

      {isLoading ? <Skeleton className="h-32" /> : !data || data.length === 0 ? (
        <EmptyState title="No webhooks" description="Create one to start receiving events." />
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {data.map((w: WebhookToken) => (
              <div key={w.id} className="flex items-center justify-between p-4 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{w.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {w.source_hint && `source: ${w.source_hint} · `}
                    last used: {w.last_used ? new Date(w.last_used).toLocaleString() : "never"}
                  </div>
                </div>
                <Switch checked={w.enabled} onCheckedChange={(v) => updateMut.mutate({ id: w.id, enabled: v })} />
                <Button size="sm" variant="outline" onClick={() => setDeleteId(w.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <CreateWebhookDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(w) => { setShowToken({ id: w.id, name: w.name, token: w.token }); }} />

      <Dialog open={!!showToken} onOpenChange={(o) => !o && setShowToken(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Webhook token created</DialogTitle>
            <DialogDescription>Copy this token now. It will not be shown again.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/40 p-3 font-mono text-xs break-all">{showToken?.token}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { if (showToken) { void navigator.clipboard.writeText(showToken.token); toast.success("Copied"); } }}>
              <Copy className="mr-1 h-3.5 w-3.5" />Copy
            </Button>
            <Button onClick={() => setShowToken(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete webhook?" description="This token will no longer accept events."
        variant="danger" confirmLabel="Delete"
        onConfirm={() => { if (deleteId) deleteMut.mutate(deleteId); }} loading={deleteMut.isPending} />
    </div>
  );
}

function CreateWebhookDialog({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onCreated: (w: WebhookToken & { token: string }) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [sourceHint, setSourceHint] = useState("");

  const mut = useMutation({
    mutationFn: () => settingsApi.createWebhook(name, sourceHint || undefined),
    onSuccess: (w) => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
      onOpenChange(false);
      setName(""); setSourceHint("");
      onCreated(w);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New webhook</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <FormField label="Name" required><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></FormField>
          <FormField label="Source hint" hint="Optional: e.g. uptime-kuma, grafana, generic">
            <Input value={sourceHint} onChange={(e) => setSourceHint(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={!name.trim() || mut.isPending}>
            {mut.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
