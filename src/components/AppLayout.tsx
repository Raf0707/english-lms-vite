import type { PropsWithChildren } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';

export function AppLayout({ children, title, subtitle, wide = false }: PropsWithChildren<{ title?: string; subtitle?: string; wide?: boolean }>) {
  return (
    <div className="app-shell">
      <AppSidebar />
      <main className="app-main">
        <AppTopbar title={title} subtitle={subtitle} />
        <div className={wide ? 'app-content app-content--wide' : 'app-content'}>{children}</div>
      </main>
    </div>
  );
}
