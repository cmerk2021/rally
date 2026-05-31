import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/FormField";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { authApi } from "@/api";
import { useAuthStore } from "@/stores/auth.store";
import type { ApiToken } from "@/types";

export function SettingsAccountPage() {
  const user = useAuthStore((s) => s.user);
  const refresh = useAuthStore((s) => s.initialize);
  const qc = useQueryClient();

  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [showToken, setShowToken] = useState<{ name: string; token: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name);
      setEmail(user.email ?? "");
    }
  }, [user]);

  const profileMut = useMutation({
    mutationFn: () => authApi.updateMe({ display_name: displayName, email }),
    onSuccess: async () => {
      toast.success("Profile updated");
      await refresh();
    },
  });
  const pwMut = useMutation({
    mutationFn: () => authApi.changePassword(currentPw, newPw),
    onSuccess: () => {
      toast.success("Password changed");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    },
  });
  const { data: tokens, isLoading: tokensLoading } = useQuery({ queryKey: ["api-tokens"], queryFn: () => authApi.listTokens() });
  const createTokenMut = useMutation({
    mutationFn: () => authApi.createToken(tokenName),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["api-tokens"] });
      setCreateOpen(false);
      setTokenName("");
      setShowToken({ name: res.name, token: res.token });
    },
  });
  const deleteTokenMut = useMutation({
    mutationFn: (id: string) => authApi.deleteToken(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-tokens"] });
      setDeleteId(null);
      toast.success("Token deleted");
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold">Profile</h3>
          <FormField label="Username"><Input value={user?.username ?? ""} disabled /></FormField>
          <FormField label="Display name"><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></FormField>
          <FormField label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></FormField>
          <div className="flex justify-end">
            <Button onClick={() => profileMut.mutate()} disabled={profileMut.isPending}>
              {profileMut.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold">Change password</h3>
          <FormField label="Current password"><Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} /></FormField>
          <FormField label="New password" hint="At least 8 characters"><Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} /></FormField>
          <FormField label="Confirm new password" error={confirmPw && confirmPw !== newPw ? "Passwords do not match" : undefined}>
            <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
          </FormField>
          <div className="flex justify-end">
            <Button onClick={() => pwMut.mutate()} disabled={!currentPw || newPw.length < 8 || newPw !== confirmPw || pwMut.isPending}>
              {pwMut.isPending ? "Updating…" : "Update password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">API tokens</h3>
            <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-1 h-3.5 w-3.5" />New token</Button>
          </div>
          {tokensLoading ? <Skeleton className="h-20" /> : !tokens || tokens.length === 0 ? (
            <EmptyState title="No API tokens" description="Create one for scripts and CLI access." />
          ) : (
            <div className="divide-y border rounded-md">
              {tokens.map((t: ApiToken) => (
                <div key={t.id} className="flex items-center justify-between p-3 gap-2">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      created {new Date(t.created).toLocaleDateString()}{t.last_used ? ` · last used ${new Date(t.last_used).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setDeleteId(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New API token</DialogTitle></DialogHeader>
          <div className="py-2">
            <FormField label="Name" required><Input value={tokenName} onChange={(e) => setTokenName(e.target.value)} autoFocus /></FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createTokenMut.mutate()} disabled={!tokenName.trim() || createTokenMut.isPending}>
              {createTokenMut.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showToken} onOpenChange={(o) => !o && setShowToken(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Token created</DialogTitle>
            <DialogDescription>Copy this token now — it will not be shown again.</DialogDescription>
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
        title="Revoke token?" description="Any clients using this token will lose access."
        variant="danger" confirmLabel="Revoke"
        onConfirm={() => { if (deleteId) deleteTokenMut.mutate(deleteId); }} loading={deleteTokenMut.isPending} />
    </div>
  );
}
