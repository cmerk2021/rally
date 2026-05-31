import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { settingsApi } from "@/api";
import { formatDateTime } from "@/lib/date";

function fmtBytes(n?: number) {
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}

export function SettingsBackupPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["backups"], queryFn: () => settingsApi.backupHistory() });

  const backupMut = useMutation({
    mutationFn: () => settingsApi.backup(),
    onSuccess: (res) => {
      toast.success(`Backup created: ${res.name}`);
      qc.invalidateQueries({ queryKey: ["backups"] });
    },
  });

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">PocketBase backups stored on disk.</p>
        <Button onClick={() => backupMut.mutate()} disabled={backupMut.isPending}>
          {backupMut.isPending ? "Backing up…" : "Create backup"}
        </Button>
      </div>

      {isLoading ? <Skeleton className="h-32" /> : !data || data.length === 0 ? (
        <EmptyState icon={<Database className="h-8 w-8" />} title="No backups yet" description="Create your first backup above." />
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {data.map((b) => (
              <div key={b.key} className="flex items-center justify-between p-3">
                <div>
                  <div className="font-mono text-sm">{b.key}</div>
                  <div className="text-xs text-muted-foreground">{b.modified ? formatDateTime(b.modified) : ""}</div>
                </div>
                <div className="text-xs text-muted-foreground">{fmtBytes(b.size)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
