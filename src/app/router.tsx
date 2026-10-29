import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router';
import { RouteError } from '@/components/feedback/ErrorBoundary';
import { AppShell } from '@/components/layout/AppShell';
import BudgetPage from '@/routes/BudgetPage';
import DashboardPage from '@/routes/DashboardPage';
import GoalsPage from '@/routes/GoalsPage';
import ImportPage from '@/routes/ImportPage';
import NotFoundPage from '@/routes/NotFoundPage';
import OfflinePage from '@/routes/OfflinePage';
import OnboardingPage from '@/routes/OnboardingPage';
import ReportsPage from '@/routes/ReportsPage';
import SettingsPage from '@/routes/SettingsPage';
import TransactionsPage from '@/routes/TransactionsPage';

const shellRoutes: RouteObject[] = [
  { index: true, Component: DashboardPage },
  { path: 'movimientos', Component: TransactionsPage },
  { path: 'presupuesto', Component: BudgetPage },
  { path: 'reportes', Component: ReportsPage },
  { path: 'metas', Component: GoalsPage },
  { path: 'ajustes', Component: SettingsPage },
  { path: 'importar', Component: ImportPage },
  { path: '*', Component: NotFoundPage },
];

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: shellRoutes,
  },
  {
    path: '/onboarding',
    Component: OnboardingPage,
    errorElement: <RouteError />,
  },
  {
    path: '/offline',
    Component: OfflinePage,
    errorElement: <RouteError />,
  },
];

export const router = createBrowserRouter(appRoutes);

export function createTestRouter(initialEntries: string[] = ['/']) {
  return createMemoryRouter(appRoutes, { initialEntries });
}
