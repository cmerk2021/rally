import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { searchApi } from "@/api";

export function SearchPage() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["search", "page", q],
    queryFn: () => searchApi.search(q),
    enabled: q.trim().length > 1,
  });

  return (
    <PageContainer title="Search" description="Find anything in your homelab">
      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <SearchIcon className="h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search projects, tasks, services, assets, docs, decisions, incidents, runbooks…"
              className="border-0 focus-visible:ring-0 px-0"
            />
          </div>
        </CardContent>
      </Card>

      {q.trim().length <= 1 ? (
        <EmptyState title="Start typing" description="Type at least 2 characters to search." />
      ) : isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : !data || data.total === 0 ? (
        <EmptyState title="No matches" description="Try different keywords." />
      ) : (
        <div className="space-y-4">
          {Object.entries(data.groups).map(([group, items]) => {
            if (!items || items.length === 0) return null;
            return (
              <Card key={group}>
                <CardContent className="p-3">
                  <h3 className="text-xs uppercase text-muted-foreground mb-2">{group} ({items.length})</h3>
                  <ul className="space-y-1">
                    {items.map((hit) => (
                      <li key={hit.id}>
                        <button type="button" onClick={() => void navigate({ to: `/${group}/${hit.id}` as never })} className="w-full flex items-center justify-between gap-3 rounded px-2 py-1.5 hover:bg-accent text-left">
                          <span className="truncate font-medium">{hit.title}</span>
                          {hit.subtitle && <span className="text-xs text-muted-foreground">{hit.subtitle}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
