import { ReactNode, useState } from "react";
import { Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";

export interface Column<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  className?: string;
  width?: string;
}

export interface ResourceListPageProps<T extends { id: string }> {
  title: string;
  description?: string;
  queryKey: string;
  fetchList: (params: { filter?: string; perPage?: number; sort?: string }) => Promise<{ items: T[]; totalItems: number }>;
  columns: Column<T>[];
  rowHref: (item: T) => string;
  searchFields?: string[];
  filters?: ReactNode;
  createLabel?: string;
  createDialog?: (props: { open: boolean; onOpenChange: (v: boolean) => void }) => ReactNode;
  extraFilter?: string;
  defaultSort?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ResourceListPage<T extends { id: string }>({
  title,
  description,
  queryKey,
  fetchList,
  columns,
  rowHref,
  searchFields,
  filters,
  createLabel,
  createDialog,
  extraFilter,
  defaultSort,
  emptyTitle,
  emptyDescription,
}: ResourceListPageProps<T>) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filterStr = (() => {
    const parts: string[] = [];
    if (query && searchFields && searchFields.length) {
      const q = query.replace(/"/g, '\\"');
      parts.push("(" + searchFields.map((f) => `${f} ~ "${q}"`).join(" || ") + ")");
    }
    if (extraFilter) parts.push(extraFilter);
    return parts.join(" && ") || undefined;
  })();

  const { data, isLoading } = useQuery({
    queryKey: [queryKey, { query, extraFilter }],
    queryFn: () => fetchList({ filter: filterStr, perPage: 200, sort: defaultSort }),
  });

  return (
    <PageContainer
      title={title}
      description={description}
      actions={
        createDialog && createLabel ? (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> {createLabel}
          </Button>
        ) : undefined
      }
    >
      <Card className="mb-4">
        <CardContent className="p-3 flex gap-2 flex-wrap items-center">
          {searchFields && (
            <Input
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-xs h-9"
            />
          )}
          {filters}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title={emptyTitle ?? "Nothing here yet"}
          description={emptyDescription ?? "Create your first item to get started."}
          action={createDialog && createLabel ? { label: createLabel, onClick: () => setOpen(true) } : undefined}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className={`px-4 py-2 text-left font-medium ${c.className ?? ""}`} style={{ width: c.width }}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                    {columns.map((c, ci) => (
                      <td key={c.key} className={`px-4 py-2 ${c.className ?? ""}`}>
                        {ci === 0 ? (
                          <Link to={rowHref(item)} className="block hover:text-primary">
                            {c.render(item)}
                          </Link>
                        ) : (
                          c.render(item)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {createDialog && createDialog({ open, onOpenChange: setOpen })}
    </PageContainer>
  );
}
