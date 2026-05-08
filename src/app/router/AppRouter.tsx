import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

import { AppLayout } from '@app/layouts/AppLayout';
import { AuthLayout } from '@app/layouts/AuthLayout';

import { ProtectedRoute } from './ProtectedRoute';
import { PublicOnlyRoute } from './PublicOnlyRoute';
import { RouteFallback } from './RouteFallback';

const LoginPage = lazy(() => import('@pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() =>
  import('@pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const IncidentsPage = lazy(() =>
  import('@pages/IncidentsPage').then((m) => ({ default: m.IncidentsPage })),
);
const ReportsPage = lazy(() =>
  import('@pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const NotFoundPage = lazy(() =>
  import('@pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    element: (
      <PublicOnlyRoute>
        <AuthLayout />
      </PublicOnlyRoute>
    ),
    children: [
      {
        path: '/login',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <LoginPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/dashboard',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: '/incidents',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <IncidentsPage />
          </Suspense>
        ),
      },
      {
        path: '/reports',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <ReportsPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
]);

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};
