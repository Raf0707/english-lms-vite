import { useEffect, type PropsWithChildren } from 'react';
import { useAppStore } from '../store/useAppStore';

export function AuthBootstrap({ children }: PropsWithChildren) {
  const authStatus = useAppStore((state) => state.authStatus);
  const bootstrapAuth = useAppStore((state) => state.bootstrapAuth);

  useEffect(() => {
    if (authStatus === 'idle') void bootstrapAuth();
  }, [authStatus, bootstrapAuth]);

  return <>{children}</>;
}
