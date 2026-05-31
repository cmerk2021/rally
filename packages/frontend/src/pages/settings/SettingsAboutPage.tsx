import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { settingsApi } from "@/api";

function fmtUptime(s: number) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return [d && `${d}d`, h && `${h}h`, `${m}m`].filter(Boolean).join(" ");
}

export function SettingsAboutPage() {
  const { data, isLoading } = useQuery({ queryKey: ["settings", "stats"], queryFn: () => settingsApi.stats() });

  if (isLoading || !data) return <Skeleton className="h-64 w-full max-w-2xl" />;

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardContent className="p-6 space-y-2">
          <h3 className="text-lg font-semibold">Rally</h3>
          <div className="text-sm text-muted-foreground">A self-hosted homelab ops & project management platform.</div>
          <div className="grid grid-cols-2 gap-3 pt-3 text-sm">
            <div><span className="text-muted-foreground">Version: </span>{data.rallyVersion}</div>
            <div><span className="text-muted-foreground">Node: </span>{data.nodeVersion}</div>
            <div><span className="text-muted-foreground">Uptime: </span>{fmtUptime(data.uptimeSeconds)}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-3">Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(data.counts).map(([k, v]) => (
              <div key={k} className="rounded-md border p-3">
                <div className="text-xs uppercase text-muted-foreground">{k}</div>
                <div className="text-2xl font-semibold">{v}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
