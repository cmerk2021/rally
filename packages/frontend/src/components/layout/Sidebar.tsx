import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Activity,
  Inbox,
  Search,
  Server,
  HardDrive,
  FolderKanban,
  Wrench,
  ShieldAlert,
  Calendar,
  BookOpen,
  Lightbulb,
  ListChecks,
  Settings,
  Moon,
  Sun,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { eventsApi } from "@/api";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider, Avatar, AvatarFallback } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: "events";
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const groups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/timeline", label: "Timeline", icon: Activity },
      { to: "/events", label: "Events", icon: Inbox, badge: "events" },
      { to: "/search", label: "Search", icon: Search },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { to: "/services", label: "Services", icon: Server },
      { to: "/assets", label: "Assets", icon: HardDrive },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/projects", label: "Projects", icon: FolderKanban },
      { to: "/tasks", label: "Tasks", icon: ListChecks },
      { to: "/changes", label: "Changes", icon: Wrench },
      { to: "/incidents", label: "Incidents", icon: ShieldAlert },
      { to: "/maintenance", label: "Maintenance", icon: Calendar },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { to: "/docs", label: "Documentation", icon: BookOpen },
      { to: "/decisions", label: "Decisions", icon: Lightbulb },
      { to: "/runbooks", label: "Runbooks", icon: BookOpen },
    ],
  },
];

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const { data: unreadEvents } = useQuery({
    queryKey: ["events", "unread-count"],
    queryFn: () => eventsApi.unreadCount(),
    refetchInterval: 30_000,
  });

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.15 }}
      className="flex h-full flex-col border-r border-border bg-card"
    >
      <div className="flex items-center gap-2 px-3 py-3.5 border-b border-border h-14">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
          R
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="font-semibold leading-tight">Rally</div>
            {user?.homelab_name && (
              <div className="truncate text-xs text-muted-foreground">{user.homelab_name}</div>
            )}
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3">
        <TooltipProvider delayDuration={100}>
          {groups.map((group) => (
            <div key={group.label} className="mb-4">
              {!collapsed && (
                <div className="px-2 mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = currentPath === item.to || currentPath.startsWith(item.to + "/");
                  const showBadge = item.badge === "events" && unreadEvents && unreadEvents > 0;
                  const inner = (
                    <Link
                      to={item.to}
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                      )}
                    >
                      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-primary" />}
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && showBadge && (
                        <span className="ml-auto rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                          {unreadEvents}
                        </span>
                      )}
                      {collapsed && showBadge && (
                        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </Link>
                  );
                  if (!collapsed) return <div key={item.to}>{inner}</div>;
                  return (
                    <Tooltip key={item.to}>
                      <TooltipTrigger asChild>{inner}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="my-3 h-px bg-border" />

          <Link
            to="/settings"
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
              currentPath.startsWith("/settings")
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </Link>
        </TooltipProvider>
      </nav>

      <div className="border-t border-border p-2 space-y-1">
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-1 py-1.5">
            <Avatar className="h-7 w-7">
              <AvatarFallback>
                {user.display_name?.slice(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{user.display_name}</div>
              <div className="truncate text-[10px] text-muted-foreground">@{user.username}</div>
            </div>
          </div>
        )}
        <div className={cn("flex gap-1", collapsed && "flex-col")}>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex-1 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4 mx-auto" /> : <Moon className="h-4 w-4 mx-auto" />}
          </button>
          <button
            onClick={() => void logout()}
            className="flex-1 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Logout"
          >
            <LogOut className="h-4 w-4 mx-auto" />
          </button>
          <button
            onClick={toggle}
            className="flex-1 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4 mx-auto" /> : <ChevronsLeft className="h-4 w-4 mx-auto" />}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
