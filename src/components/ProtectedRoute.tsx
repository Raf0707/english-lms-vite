import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import type { Role } from '../types';

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const user = useAppStore((state) => state.user);
  const authStatus = useAppStore((state) => state.authStatus);
  const location = useLocation();

  if (authStatus === 'idle' || authStatus === 'loading') {
    return (
      <main className="auth-session-loading" aria-live="polite">
        <LoaderCircle size={28} className="spin" />
        <strong>Проверяем сессию…</strong>
      </main>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: `${location.pathname}${location.search}` }} replace />;
  if (roles && !roles.includes(user.role)) {
    const destination = user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/app';
    return <Navigate to={destination} replace />;
  }
  return <>{children}</>;
}
