import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Outlet,
} from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useAuthStore } from "@/stores/auth.store";
import { authApi } from "@/api";

import { LoginPage } from "@/pages/LoginPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { TimelinePage } from "@/pages/TimelinePage";
import { ProjectsListPage } from "@/pages/projects/ProjectsListPage";
import { ProjectDetailPage } from "@/pages/projects/ProjectDetailPage";
import { TasksListPage } from "@/pages/tasks/TasksListPage";
import { TaskDetailPage } from "@/pages/tasks/TaskDetailPage";
import { ChangesListPage } from "@/pages/changes/ChangesListPage";
import { ChangeDetailPage } from "@/pages/changes/ChangeDetailPage";
import { ServicesListPage } from "@/pages/services/ServicesListPage";
import { ServiceDetailPage } from "@/pages/services/ServiceDetailPage";
import { AssetsListPage } from "@/pages/assets/AssetsListPage";
import { AssetDetailPage } from "@/pages/assets/AssetDetailPage";
import { DocsListPage } from "@/pages/docs/DocsListPage";
import { DocDetailPage } from "@/pages/docs/DocDetailPage";
import { DecisionsListPage } from "@/pages/decisions/DecisionsListPage";
import { DecisionDetailPage } from "@/pages/decisions/DecisionDetailPage";
import { IncidentsListPage } from "@/pages/incidents/IncidentsListPage";
import { IncidentDetailPage } from "@/pages/incidents/IncidentDetailPage";
import { RunbooksListPage } from "@/pages/runbooks/RunbooksListPage";
import { RunbookDetailPage } from "@/pages/runbooks/RunbookDetailPage";
import { MaintenanceListPage } from "@/pages/maintenance/MaintenanceListPage";
import { MaintenanceDetailPage } from "@/pages/maintenance/MaintenanceDetailPage";
import { EventsPage } from "@/pages/EventsPage";
import { SearchPage } from "@/pages/SearchPage";
import { SettingsLayout } from "@/pages/settings/SettingsLayout";
import { SettingsGeneralPage } from "@/pages/settings/SettingsGeneralPage";
import { SettingsAIPage } from "@/pages/settings/SettingsAIPage";
import { SettingsWebhooksPage } from "@/pages/settings/SettingsWebhooksPage";
import { SettingsBackupPage } from "@/pages/settings/SettingsBackupPage";
import { SettingsAccountPage } from "@/pages/settings/SettingsAccountPage";
import { SettingsAboutPage } from "@/pages/settings/SettingsAboutPage";

const rootRoute = createRootRoute({ component: () => <Outlet /> });

async function ensureSetup() {
  let status: { setupRequired: boolean };
  try {
    status = await authApi.setupStatus();
  } catch {
    // Server unreachable — let the route load and surface the error.
    return;
  }
  if (status.setupRequired) {
    throw redirect({ to: "/onboarding" });
  }
}

function requireAuth() {
  const { token, isAuthenticated } = useAuthStore.getState();
  if (!token || !isAuthenticated) {
    throw redirect({ to: "/login" });
  }
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: ensureSetup,
  component: LoginPage,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  component: OnboardingPage,
});

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  beforeLoad: async () => {
    await ensureSetup();
    requireAuth();
  },
  component: AppShell,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: async () => {
    await ensureSetup();
    const { token, isAuthenticated } = useAuthStore.getState();
    if (!token || !isAuthenticated) {
      throw redirect({ to: "/login" });
    }
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});

const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const timelineRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/timeline",
  component: TimelinePage,
});

const projectsListRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/projects",
  component: ProjectsListPage,
});
const projectDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/projects/$id",
  component: ProjectDetailPage,
});

const tasksListRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/tasks",
  component: TasksListPage,
});
const taskDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/tasks/$id",
  component: TaskDetailPage,
});

const changesListRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/changes",
  component: ChangesListPage,
});
const changeDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/changes/$id",
  component: ChangeDetailPage,
});

const servicesListRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/services",
  component: ServicesListPage,
});
const serviceDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/services/$id",
  component: ServiceDetailPage,
});

const assetsListRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/assets",
  component: AssetsListPage,
});
const assetDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/assets/$id",
  component: AssetDetailPage,
});

const docsListRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/docs",
  component: DocsListPage,
});
const docDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/docs/$id",
  component: DocDetailPage,
});

const decisionsListRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/decisions",
  component: DecisionsListPage,
});
const decisionDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/decisions/$id",
  component: DecisionDetailPage,
});

const incidentsListRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/incidents",
  component: IncidentsListPage,
});
const incidentDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/incidents/$id",
  component: IncidentDetailPage,
});

const runbooksListRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/runbooks",
  component: RunbooksListPage,
});
const runbookDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/runbooks/$id",
  component: RunbookDetailPage,
});

const maintenanceListRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/maintenance",
  component: MaintenanceListPage,
});
const maintenanceDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/maintenance/$id",
  component: MaintenanceDetailPage,
});

const eventsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/events",
  component: EventsPage,
});

const searchRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/search",
  component: SearchPage,
});

const settingsLayoutRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/settings",
  component: SettingsLayout,
});
const settingsGeneralRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: "/",
  component: SettingsGeneralPage,
});
const settingsAIRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: "/ai",
  component: SettingsAIPage,
});
const settingsWebhooksRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: "/webhooks",
  component: SettingsWebhooksPage,
});
const settingsBackupRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: "/backup",
  component: SettingsBackupPage,
});
const settingsAccountRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: "/account",
  component: SettingsAccountPage,
});
const settingsAboutRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: "/about",
  component: SettingsAboutPage,
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([
    indexRoute,
    loginRoute,
    onboardingRoute,
    appLayoutRoute.addChildren([
      dashboardRoute,
      timelineRoute,
      projectsListRoute,
      projectDetailRoute,
      tasksListRoute,
      taskDetailRoute,
      changesListRoute,
      changeDetailRoute,
      servicesListRoute,
      serviceDetailRoute,
      assetsListRoute,
      assetDetailRoute,
      docsListRoute,
      docDetailRoute,
      decisionsListRoute,
      decisionDetailRoute,
      incidentsListRoute,
      incidentDetailRoute,
      runbooksListRoute,
      runbookDetailRoute,
      maintenanceListRoute,
      maintenanceDetailRoute,
      eventsRoute,
      searchRoute,
      settingsLayoutRoute.addChildren([
        settingsGeneralRoute,
        settingsAIRoute,
        settingsWebhooksRoute,
        settingsBackupRoute,
        settingsAccountRoute,
        settingsAboutRoute,
      ]),
    ]),
  ]),
  defaultPreload: "intent",
});
