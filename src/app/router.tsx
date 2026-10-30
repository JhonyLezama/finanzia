import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router';
import { RouteError } from '@/components/feedback/ErrorBoundary';
import { AppShell } from '@/components/layout/AppShell';
import BudgetPage from '@/routes/BudgetPage';
import DashboardPage from '@/routes/DashboardPage';
import GoalsPage from '@/routes/GoalsPage';
import NotFoundPage from '@/routes/NotFoundPage';
import OfflinePage from '@/routes/OfflinePage';
import OnboardingPage from '@/routes/OnboardingPage';
import SettingsPage from '@/routes/SettingsPage';
import TransactionsPage from '@/routes/TransactionsPage';

const shellRoutes: RouteObject[] = [
  { index: true, Component: DashboardPage },
  { path: 'movimientos', Component: TransactionsPage },
  { path: 'presupuesto', Component: BudgetPage },
  { path: 'reportes', lazy: () => import('@/routes/ReportsPage').then((m) => ({ Component: m.default })) },
  { path: 'metas', Component: GoalsPage },
  { path: 'ajustes', Component: SettingsPage },
  { path: 'importar', lazy: () => import('@/routes/ImportPage').then((m) => ({ Component: m.default })) },
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
