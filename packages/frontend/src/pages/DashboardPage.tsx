import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Activity, AlertTriangle, CheckCircle2, ListChecks, Server, ShieldAlert, Wrench, Inbox, BookOpen, Calendar } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TimelineEntryCard } from "@/components/shared/TimelineEntryCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { timelineApi, tasksApi, incidentsApi, servicesApi, eventsApi, maintenanceApi, docsApi, changesApi } from "@/api";
import { useAuthStore } from "@/stores/auth.store";
import { formatDateTime } from "@/lib/date";

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ["timeline", "dashboard"],
    queryFn: () => timelineApi.list({ perPage: 8 }),
  });
  const { data: tasks } = useQuery({
    queryKey: ["tasks", "open"],
    queryFn: () => tasksApi.list({ perPage: 5, filter: 'status != "completed"', sort: "due_date" }),
  });
  const { data: incidents } = useQuery({
    queryKey: ["incidents", "active"],
    queryFn: () => incidentsApi.list({ perPage: 10, filter: 'status != "resolved"' }),
  });
  const { data: changes } = useQuery({
    queryKey: ["changes", "recent"],
    queryFn: () => changesApi.list({ perPage: 5, sort: "-created" }),
  });
  const { data: services } = useQuery({
    queryKey: ["services", "status"],
    queryFn: () => servicesApi.list({ perPage: 200 }),
  });
  const { data: events } = useQuery({
    queryKey: ["events", "unread-count"],
    queryFn: () => eventsApi.unreadCount(),
  });
  const { data: maintenance } = useQuery({
    queryKey: ["maintenance", "upcoming"],
    queryFn: () => maintenanceApi.list({ perPage: 5, filter: 'status = "scheduled"', sort: "start_time" }),
  });
  const { data: dueDocs } = useQuery({
    queryKey: ["docs", "due-review"],
    queryFn: () => docsApi.dueReview(),
  });

  const servicesByStatus = (services?.items ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <PageContainer
      title={`${greeting}, ${user?.display_name ?? "there"}`}
      description={user?.homelab_name ? `Here's what's happening at ${user.homelab_name}` : undefined}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          to="/incidents"
          icon={<ShieldAlert className="h-4 w-4" />}
          label="Active incidents"
          value={incidents?.totalItems ?? 0}
          tone={incidents?.totalItems ? "danger" : "default"}
        />
        <StatCard
          to="/tasks"
          icon={<ListChecks className="h-4 w-4" />}
          label="Open tasks"
          value={tasks?.totalItems ?? 0}
        />
        <StatCard
          to="/services"
          icon={<Server className="h-4 w-4" />}
          label="Services"
          value={services?.totalItems ?? 0}
          secondary={
            <span className="text-xs text-muted-foreground">
              {servicesByStatus.running ?? 0} running
              {servicesByStatus.degraded ? ` · ${servicesByStatus.degraded} degraded` : ""}
              {servicesByStatus.stopped ? ` · ${servicesByStatus.stopped} stopped` : ""}
            </span>
          }
        />
        <StatCard
          to="/events"
          icon={<Inbox className="h-4 w-4" />}
          label="Unread events"
          value={events ?? 0}
          tone={events ? "warn" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Recent activity
              </CardTitle>
              <Link to="/timeline" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {timelineLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              {!timelineLoading && (timeline?.items.length ?? 0) === 0 && (
                <EmptyState title="No recent activity" description="Activity will appear here as you work." />
              )}
              {!timelineLoading && timeline?.items.map((e) => <TimelineEntryCard key={e.id} entry={e} />)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Latest changes
              </CardTitle>
              <Link to="/changes" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>
            </CardHeader>
            <CardContent>
              {(changes?.items.length ?? 0) === 0 ? (
                <EmptyState title="No changes yet" description="Record what you change in your homelab." />
              ) : (
                <ul className="space-y-2">
                  {changes?.items.map((c) => (
                    <li key={c.id}>
                      <Link
                        to="/changes/$id"
                        params={{ id: c.id }}
                        className="flex items-baseline justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                      >
                        <span className="truncate font-medium">{c.title}</span>
                        <span className="text-xs text-muted-foreground">{formatDateTime(c.created)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                Open tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(tasks?.items.length ?? 0) === 0 ? (
                <EmptyState title="All caught up" description="No open tasks." />
              ) : (
                <ul className="space-y-1.5">
                  {tasks?.items.map((t) => (
                    <li key={t.id}>
                      <Link to="/tasks/$id" params={{ id: t.id }} className="block rounded-md px-2 py-1.5 hover:bg-accent">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate flex-1 text-sm">{t.title}</span>
                          {t.due_date && (
                            <span className="text-xs text-muted-foreground">{formatDateTime(t.due_date)}</span>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {(incidents?.totalItems ?? 0) > 0 && (
            <Card className="border-red-500/40">
              <CardHeader className="space-y-0">
                <CardTitle className="text-base flex items-center gap-2 text-red-500">
                  <AlertTriangle className="h-4 w-4" />
                  Active incidents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {incidents?.items.map((i) => (
                    <li key={i.id}>
                      <Link to="/incidents/$id" params={{ id: i.id }} className="block rounded-md px-2 py-1.5 hover:bg-accent">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium">{i.title}</span>
                          <span className="text-xs uppercase text-muted-foreground">{i.severity}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {(maintenance?.items.length ?? 0) > 0 && (
            <Card>
              <CardHeader className="space-y-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Upcoming maintenance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {maintenance?.items.map((m) => (
                    <li key={m.id}>
                      <Link to="/maintenance/$id" params={{ id: m.id }} className="block rounded-md px-2 py-1.5 hover:bg-accent">
                        <div className="truncate font-medium">{m.title}</div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(m.start_time)}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {(dueDocs?.length ?? 0) > 0 && (
            <Card>
              <CardHeader className="space-y-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Docs needing review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {dueDocs?.slice(0, 5).map((d) => (
                    <li key={d.id}>
                      <Link to="/docs/$id" params={{ id: d.id }} className="block rounded-md px-2 py-1.5 hover:bg-accent">
                        <div className="truncate font-medium">{d.title}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function StatCard({ to, icon, label, value, secondary, tone = "default" }: {
  to: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  secondary?: React.ReactNode;
  tone?: "default" | "danger" | "warn";
}) {
  const toneClasses = tone === "danger" ? "text-red-500" : tone === "warn" ? "text-amber-500" : "text-foreground";
  return (
    <Link to={to}>
      <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
            <span className={toneClasses}>{icon}</span>
          </div>
          <div className={`mt-2 text-3xl font-semibold ${toneClasses}`}>{value}</div>
          {secondary && <div className="mt-1">{secondary}</div>}
        </CardContent>
      </Card>
    </Link>
  );
}
