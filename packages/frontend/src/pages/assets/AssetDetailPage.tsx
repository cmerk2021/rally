import { useParams, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { TimelineEntryCard } from "@/components/shared/TimelineEntryCard";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { assetsApi } from "@/api";
import { AssetFormDialog } from "./AssetsListPage";

export function AssetDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: asset, isLoading } = useQuery({
    queryKey: ["asset", id],
    queryFn: () => assetsApi.get(id),
  });
  const { data: timeline } = useQuery({
    queryKey: ["asset", id, "timeline"],
    queryFn: () => assetsApi.timeline(id),
    enabled: !!asset,
  });

  const deleteMut = useMutation({
    mutationFn: () => assetsApi.remove(id),
    onSuccess: () => {
      toast.success("Asset deleted");
      qc.invalidateQueries({ queryKey: ["assets"] });
      void navigate({ to: "/assets" });
    },
  });

  if (isLoading || !asset) {
    return (<PageContainer><Skeleton className="h-10 w-1/2 mb-4" /><Skeleton className="h-64 w-full" /></PageContainer>);
  }

  return (
    <PageContainer>
      <Link to="/assets" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to assets
      </Link>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{asset.name}</h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <StatusBadge status={asset.status} />
            <span className="text-xs text-muted-foreground capitalize">{asset.type.replace("_", " ")}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="mr-1 h-4 w-4" />Edit</Button>
          <Button variant="outline" onClick={() => setConfirmOpen(true)}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>
        </div>
      </div>

      <Tabs defaultValue="specs">
        <TabsList>
          <TabsTrigger value="specs">Specs</TabsTrigger>
          <TabsTrigger value="timeline">Timeline ({timeline?.totalItems ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="specs" className="mt-4">
          <Card>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <DetailRow label="Hostname" value={asset.hostname} />
              <DetailRow label="IP address" value={asset.ip_address} mono />
              <DetailRow label="OS" value={asset.os} />
              <DetailRow label="CPU" value={asset.cpu} />
              <DetailRow label="RAM" value={asset.ram_gb ? `${asset.ram_gb} GB` : ""} />
              <DetailRow label="Storage" value={asset.storage_tb ? `${asset.storage_tb} TB` : ""} />
              <DetailRow label="Location" value={asset.location} />
            </CardContent>
          </Card>
          {asset.notes && (
            <Card className="mt-4">
              <CardContent className="p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Notes</div>
                <p className="whitespace-pre-wrap text-sm">{asset.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="timeline" className="mt-4 space-y-2">
          {(timeline?.items.length ?? 0) === 0 ? (
            <EmptyState title="No activity" description="Changes and incidents for this asset will appear here." />
          ) : (
            timeline?.items.map((e) => <TimelineEntryCard key={e.id} entry={e} />)
          )}
        </TabsContent>
      </Tabs>

      <AssetFormDialog open={editOpen} onOpenChange={setEditOpen} asset={asset} />
      <ConfirmDialog
        open={confirmOpen} onOpenChange={setConfirmOpen}
        title="Delete asset?" description="This asset will be removed."
        variant="danger" confirmLabel="Delete"
        onConfirm={() => deleteMut.mutate()} loading={deleteMut.isPending}
      />
    </PageContainer>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 ${mono ? "font-mono" : ""}`}>{value || "—"}</div>
    </div>
  );
}
