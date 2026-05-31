import { useParams, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { TimelineEntryCard } from "@/components/shared/TimelineEntryCard";
import { RelationChip } from "@/components/shared/RelationChip";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { servicesApi } from "@/api";
import { ServiceFormDialog } from "./ServicesListPage";

export function ServiceDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: service, isLoading } = useQuery({
    queryKey: ["service", id],
    queryFn: () => servicesApi.get(id),
  });
  const { data: timeline } = useQuery({
    queryKey: ["service", id, "timeline"],
    queryFn: () => servicesApi.timeline(id),
    enabled: !!service,
  });
  const { data: graph } = useQuery({
    queryKey: ["service", id, "graph"],
    queryFn: () => servicesApi.graph(id),
    enabled: !!service,
  });

  const deleteMut = useMutation({
    mutationFn: () => servicesApi.remove(id),
    onSuccess: () => {
      toast.success("Service deleted");
      qc.invalidateQueries({ queryKey: ["services"] });
      void navigate({ to: "/services" });
    },
  });

  const nodeMap = useMemo(() => {
    const m = new Map<string, { id: string; name: string; status: string; category: string }>();
    graph?.nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [graph]);

  if (isLoading || !service) {
    return (<PageContainer><Skeleton className="h-10 w-1/2 mb-4" /><Skeleton className="h-64 w-full" /></PageContainer>);
  }

  return (
    <PageContainer>
      <Link to="/services" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to services
      </Link>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {service.icon ? `${service.icon} ` : ""}{service.name}
          </h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <StatusBadge status={service.status} />
            <span className="text-xs text-muted-foreground capitalize">{service.category}</span>
            {service.url && (
              <a href={service.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                {service.url} <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {service.description && <p className="mt-3 text-sm text-muted-foreground">{service.description}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="mr-1 h-4 w-4" />Edit</Button>
          <Button variant="outline" onClick={() => setConfirmOpen(true)}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          <TabsTrigger value="timeline">Timeline ({timeline?.totalItems ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Hosted on</div>
                {service.expand?.assets?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {service.expand.assets.map((a) => <RelationChip key={a.id} type="asset" id={a.id} label={a.name} />)}
                  </div>
                ) : <div className="text-sm text-muted-foreground">No assets linked.</div>}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Depends on</div>
                {service.expand?.dependencies?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {service.expand.dependencies.map((s) => <RelationChip key={s.id} type="service" id={s.id} label={s.name} />)}
                  </div>
                ) : <div className="text-sm text-muted-foreground">No dependencies.</div>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dependencies" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-3">
                {graph ? `${graph.nodes.length} related service${graph.nodes.length === 1 ? "" : "s"}` : "Loading…"}
              </div>
              <div className="space-y-2">
                {graph?.edges.map((e, i) => {
                  const from = nodeMap.get(e.from);
                  const to = nodeMap.get(e.to);
                  if (!from || !to) return null;
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Link to="/services/$id" params={{ id: from.id }} className="rounded border px-2 py-1 hover:bg-accent">{from.name}</Link>
                      <span className="text-muted-foreground">depends on</span>
                      <Link to="/services/$id" params={{ id: to.id }} className="rounded border px-2 py-1 hover:bg-accent">{to.name}</Link>
                    </div>
                  );
                })}
                {graph && graph.edges.length === 0 && (
                  <div className="text-sm text-muted-foreground">No dependency edges.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4 space-y-2">
          {(timeline?.items.length ?? 0) === 0 ? (
            <EmptyState title="No activity" description="Changes, incidents, and maintenance related to this service will appear here." />
          ) : (
            timeline?.items.map((e) => <TimelineEntryCard key={e.id} entry={e} />)
          )}
        </TabsContent>
      </Tabs>

      <ServiceFormDialog open={editOpen} onOpenChange={setEditOpen} service={service} />
      <ConfirmDialog
        open={confirmOpen} onOpenChange={setConfirmOpen}
        title="Delete service?" description="This service will be removed."
        variant="danger" confirmLabel="Delete"
        onConfirm={() => deleteMut.mutate()} loading={deleteMut.isPending}
      />
    </PageContainer>
  );
}
