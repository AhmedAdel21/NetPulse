import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@features/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  console.log('isAuthenticated', isAuthenticated);

  if (!isAuthenticated) {
    console.log('location', location);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
