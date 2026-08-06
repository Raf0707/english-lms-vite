import {
  BookOpenCheck,
  CalendarDays,
  ChartNoAxesCombined,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  UsersRound,
  Video,
  X
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { classNames } from '../utils/format';
import { Logo } from './Logo';

const studentLinks = [
  { to: '/app', label: 'Главная', icon: LayoutDashboard, end: true },
  { to: '/app/learning', label: 'Моё обучение', icon: GraduationCap },
  { to: '/app/dictionary', label: 'Мой словарь', icon: BookOpenCheck },
  { to: '/app/schedule', label: 'Расписание', icon: CalendarDays },
  { to: '/app/payments', label: 'Платежи', icon: CreditCard },
  { to: '/app/profile', label: 'Профиль', icon: Settings }
];

const teacherLinks = [
  { to: '/teacher', label: 'Обзор', icon: LayoutDashboard, end: true },
  { to: '/teacher?tab=courses', label: 'Мои курсы', icon: GraduationCap },
  { to: '/teacher?tab=students', label: 'Ученики', icon: UsersRound },
  { to: '/teacher?tab=sessions', label: 'Занятия', icon: Video },
  { to: '/teacher?tab=finance', label: 'Финансы', icon: ChartNoAxesCombined }
];

const adminLinks = [
  { to: '/admin', label: 'Обзор', icon: LayoutDashboard, end: true },
  { to: '/admin?tab=users', label: 'Пользователи', icon: UsersRound },
  { to: '/admin?tab=courses', label: 'Курсы', icon: GraduationCap },
  { to: '/admin?tab=payments', label: 'Платежи', icon: CreditCard },
  { to: '/admin?tab=system', label: 'Система', icon: ShieldCheck }
];

export function AppSidebar() {
  const user = useAppStore((state) => state.user);
  const open = useAppStore((state) => state.sidebarOpen);
  const close = useAppStore((state) => state.closeSidebar);
  const logout = useAppStore((state) => state.logout);
  const location = useLocation();

  if (!user) return null;
  const links = user.role === 'admin' ? adminLinks : user.role === 'teacher' ? teacherLinks : studentLinks;

  return (
    <>
      <aside className={classNames('app-sidebar', open && 'app-sidebar--open')}>
        <div className="app-sidebar__top">
          <Logo />
          <button className="icon-button app-sidebar__close" onClick={close} aria-label="Закрыть меню">
            <X size={20} />
          </button>
        </div>
        <nav className="app-sidebar__nav">
          <small>{user.role === 'admin' ? 'Управление' : user.role === 'teacher' ? 'Кабинет преподавателя' : 'Обучение'}</small>
          {links.map(({ to, label, icon: Icon, end }) => {
            const [pathname, search] = to.split('?');
            const active = search
              ? location.pathname === pathname && location.search.includes(search)
              : end
                ? location.pathname === pathname
                : location.pathname.startsWith(pathname);
            return (
              <NavLink key={to} to={to} className={classNames(active && 'active')} onClick={close} end={end}>
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="app-sidebar__bottom">
          {user.role === 'student' ? (
            <div className="sidebar-streak">
              <span>🔥</span>
              <div>
                <strong>7 дней подряд</strong>
                <small>Ещё один короткий урок сегодня</small>
              </div>
            </div>
          ) : null}
          <button className="sidebar-logout" onClick={logout}>
            <LogOut size={19} />
            Выйти
          </button>
        </div>
      </aside>
      {open ? <button className="sidebar-overlay" onClick={close} aria-label="Закрыть меню" /> : null}
    </>
  );
}
