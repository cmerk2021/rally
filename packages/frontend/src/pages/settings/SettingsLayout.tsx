import { Outlet, Link, useRouterState } from "@tanstack/react-router";
import { PageContainer } from "@/components/layout/PageContainer";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/settings", label: "General" },
  { to: "/settings/ai", label: "AI" },
  { to: "/settings/webhooks", label: "Webhooks" },
  { to: "/settings/backup", label: "Backup" },
  { to: "/settings/account", label: "Account" },
  { to: "/settings/about", label: "About" },
];

export function SettingsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <PageContainer title="Settings" description="Configure Rally">
      <div className="flex gap-1 border-b mb-6">
        {tabs.map((t) => {
          const active = t.to === "/settings" ? pathname === "/settings" : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "px-3 py-2 text-sm border-b-2 -mb-px transition-colors",
                active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </PageContainer>
  );
}
