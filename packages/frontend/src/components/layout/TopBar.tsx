import { useRouterState, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Bell, Sparkles, ChevronRight, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui.store";
import { aiApi, eventsApi } from "@/api";
import { cn } from "@/lib/utils";

function toTitle(segment: string) {
  if (!segment) return "Home";
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}

export function TopBar() {
  const routerState = useRouterState();
  const path = routerState.location.pathname;
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);

  const segments = path.split("/").filter(Boolean);
  const crumbs = segments.map((seg, i) => {
    const to = "/" + segments.slice(0, i + 1).join("/");
    return { label: toTitle(seg), to };
  });

  const { data: aiStatus } = useQuery({
    queryKey: ["ai", "status"],
    queryFn: () => aiApi.status(),
    refetchInterval: 60_000,
  });
  const { data: unread } = useQuery({
    queryKey: ["events", "unread-count"],
    queryFn: () => eventsApi.unreadCount(),
    refetchInterval: 30_000,
  });

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-background/80 backdrop-blur px-4">
      <nav className="flex min-w-0 items-center gap-1 text-sm">
        {crumbs.length === 0 ? (
          <span className="text-muted-foreground">Home</span>
        ) : (
          crumbs.map((c, i) => (
            <span key={c.to} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              {i === crumbs.length - 1 ? (
                <span className="truncate font-medium">{c.label}</span>
              ) : (
                <Link to={c.to} className="truncate text-muted-foreground hover:text-foreground">
                  {c.label}
                </Link>
              )}
            </span>
          ))
        )}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" className="h-8 gap-2 text-muted-foreground" onClick={() => setOpen(true)}>
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs">Search…</span>
          <span className="ml-2 flex items-center gap-0.5 rounded border px-1 py-px text-[10px]">
            <Command className="h-2.5 w-2.5" />K
          </span>
        </Button>
        <Link to="/events" className="relative rounded-md p-1.5 hover:bg-accent" title="Events">
          <Bell className="h-4 w-4" />
          {unread && unread > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>
        <Link
          to="/settings/ai"
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs",
            aiStatus?.available ? "text-primary hover:bg-accent" : "text-muted-foreground hover:bg-accent",
          )}
          title={aiStatus?.available ? "AI enabled" : "AI not configured"}
        >
          <Sparkles className={cn("h-3.5 w-3.5", aiStatus?.available && "animate-pulse")} />
          <span className="hidden sm:inline">{aiStatus?.available ? "AI" : "AI Off"}</span>
        </Link>
      </div>
    </header>
  );
}
