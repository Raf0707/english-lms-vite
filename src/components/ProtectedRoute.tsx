import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import type { Role } from '../types';

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const user = useAppStore((state) => state.user);
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role)) {
    const destination = user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/app';
    return <Navigate to={destination} replace />;
  }
  return <>{children}</>;
}
