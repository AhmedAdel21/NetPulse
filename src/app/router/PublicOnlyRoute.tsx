import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@features/auth';
export type LocationState = { from: Location };

interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

export const PublicOnlyRoute = ({ children }: PublicOnlyRouteProps) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (isAuthenticated) {
    const state = location.state as LocationState | null;
    const to = state?.from
      ? `${state.from.pathname}${state.from.search}${state.from.hash}`
      : '/dashboard';
    return <Navigate to={to} replace />;
  }

  return <>{children}</>;
};
