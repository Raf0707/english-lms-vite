import type { PropsWithChildren } from 'react';
import { useAppStore } from '../store/useAppStore';
import { classNames } from '../utils/format';
import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';

export function AppLayout({ children, title, subtitle, wide = false }: PropsWithChildren<{ title?: string; subtitle?: string; wide?: boolean }>) {
  const collapsed = useAppStore((state) => state.sidebarCollapsed);
  return (
    <div className={classNames('app-shell', collapsed && 'app-shell--sidebar-collapsed')}>
      <AppSidebar />
      <main className="app-main">
        <AppTopbar title={title} subtitle={subtitle} />
        <div className={wide ? 'app-content app-content--wide' : 'app-content'}>{children}</div>
      </main>
    </div>
  );
}
