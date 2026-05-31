import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Activity,
  Inbox,
  Server,
  HardDrive,
  FolderKanban,
  ListChecks,
  Wrench,
  ShieldAlert,
  Calendar,
  BookOpen,
  Lightbulb,
  Settings,
  Plus,
  Search,
} from "lucide-react";
import { useUIStore } from "@/stores/ui.store";
import { searchApi } from "@/api";

interface QuickNav {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
}

const nav: QuickNav[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Timeline", to: "/timeline", icon: Activity },
  { label: "Events", to: "/events", icon: Inbox },
  { label: "Services", to: "/services", icon: Server },
  { label: "Assets", to: "/assets", icon: HardDrive },
  { label: "Projects", to: "/projects", icon: FolderKanban },
  { label: "Tasks", to: "/tasks", icon: ListChecks },
  { label: "Changes", to: "/changes", icon: Wrench },
  { label: "Incidents", to: "/incidents", icon: ShieldAlert },
  { label: "Maintenance", to: "/maintenance", icon: Calendar },
  { label: "Documentation", to: "/docs", icon: BookOpen },
  { label: "Decisions", to: "/decisions", icon: Lightbulb },
  { label: "Runbooks", to: "/runbooks", icon: BookOpen },
  { label: "Settings", to: "/settings", icon: Settings },
];

const creates: QuickNav[] = [
  { label: "New project", to: "/projects/new", icon: Plus },
  { label: "New task", to: "/tasks/new", icon: Plus },
  { label: "New change", to: "/changes/new", icon: Plus },
  { label: "New incident", to: "/incidents/new", icon: Plus },
  { label: "New service", to: "/services/new", icon: Plus },
  { label: "New asset", to: "/assets/new", icon: Plus },
  { label: "New document", to: "/docs/new", icon: Plus },
];

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const { data: results } = useQuery({
    queryKey: ["search", query],
    queryFn: () => searchApi.search(query),
    enabled: open && query.trim().length > 1,
  });

  const go = (to: string) => {
    setOpen(false);
    void navigate({ to });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl rounded-xl border bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={!query || query.trim().length <= 1}>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Type a command or search…"
              className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto p-2 scrollbar-thin">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results.
            </Command.Empty>

            {query.trim().length > 1 && results?.groups && Object.entries(results.groups).map(([group, items]) => {
              if (!Array.isArray(items) || items.length === 0) return null;
              return (
                <Command.Group key={group} heading={group} className="text-xs text-muted-foreground">
                  {items.slice(0, 5).map((item) => {
                    const path = `/${group}/${item.id}`;
                    return (
                      <Command.Item
                        key={`${group}-${item.id}`}
                        value={`${group}-${item.id}-${item.title}`}
                        onSelect={() => go(path)}
                        className="flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent"
                      >
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate text-foreground">{item.title}</span>
                        {item.subtitle && (
                          <span className="ml-auto text-xs text-muted-foreground">{item.subtitle}</span>
                        )}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              );
            })}

            <Command.Group heading="Navigation" className="text-xs text-muted-foreground">
              {nav.map((n) => (
                <Command.Item
                  key={n.to}
                  value={n.label}
                  onSelect={() => go(n.to)}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent"
                >
                  <n.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-foreground">{n.label}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Create" className="text-xs text-muted-foreground">
              {creates.map((n) => (
                <Command.Item
                  key={n.to}
                  value={n.label}
                  onSelect={() => go(n.to)}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent"
                >
                  <n.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-foreground">{n.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
