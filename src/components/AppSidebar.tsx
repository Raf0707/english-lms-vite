import {
  BookOpenCheck,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Settings,
  ShieldCheck,
  UserRoundSearch,
  UsersRound,
  Video,
  X
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { classNames } from '../utils/format';
import { Logo } from './Logo';

const studentLinks = [
  { to: '/app', label: 'Главная', icon: LayoutDashboard, end: true },
  { to: '/app/learning', label: 'Моё обучение', icon: GraduationCap },
  { to: '/app/teachers', label: 'Преподаватели', icon: UserRoundSearch },
  { to: '/app/dictionary', label: 'Мой словарь', icon: BookOpenCheck },
  { to: '/app/schedule', label: 'Расписание', icon: CalendarDays },
  { to: '/app/payments', label: 'Платежи', icon: CreditCard },
  { to: '/app/profile', label: 'Профиль', icon: Settings }
];

const teacherLinks = [
  { to: '/teacher', label: 'Обзор', icon: LayoutDashboard, end: true },
  { to: '/teacher?tab=courses', label: 'Мои курсы', icon: GraduationCap },
  { to: '/teacher?tab=students', label: 'Ученики', icon: UsersRound },
  { to: '/teacher?tab=reviews', label: 'Проверка заданий', icon: FileCheck2 },
  { to: '/teacher?tab=sessions', label: 'Занятия', icon: Video },
  { to: '/teacher?tab=finance', label: 'Финансы', icon: ChartNoAxesCombined },
  { to: '/profile', label: 'Профиль', icon: Settings }
];

const adminLinks = [
  { to: '/admin', label: 'Обзор', icon: LayoutDashboard, end: true },
  { to: '/admin?tab=users', label: 'Пользователи', icon: UsersRound },
  { to: '/admin?tab=courses', label: 'Курсы', icon: GraduationCap },
  { to: '/admin?tab=payments', label: 'Платежи', icon: CreditCard },
  { to: '/admin?tab=system', label: 'Система', icon: ShieldCheck },
  { to: '/profile', label: 'Профиль', icon: Settings }
];

function isLinkActive(currentPath: string, currentSearch: string, to: string, end?: boolean) {
  const [pathname, rawSearch] = to.split('?');
  if (rawSearch) {
    const expected = new URLSearchParams(rawSearch);
    const actual = new URLSearchParams(currentSearch);
    if (currentPath !== pathname) return false;
    return Array.from(expected.entries()).every(([key, value]) => actual.get(key) === value);
  }
  if (end) return currentPath === pathname && !currentSearch;
  return currentPath === pathname || currentPath.startsWith(`${pathname}/`);
}

export function AppSidebar() {
  const user = useAppStore((state) => state.user);
  const open = useAppStore((state) => state.sidebarOpen);
  const collapsed = useAppStore((state) => state.sidebarCollapsed);
  const close = useAppStore((state) => state.closeSidebar);
  const toggleCollapsed = useAppStore((state) => state.toggleSidebarCollapsed);
  const logout = useAppStore((state) => state.logout);
  const location = useLocation();

  if (!user) return null;
  const links = user.role === 'admin' ? adminLinks : user.role === 'teacher' ? teacherLinks : studentLinks;

  const openSupport = () => {
    window.location.href = `mailto:support@lingua.demo?subject=${encodeURIComponent('Поддержка Lingua LMS')}&body=${encodeURIComponent(`Здравствуйте!\n\nПользователь: ${user.name}\nEmail: ${user.email}\n\nОпишите вопрос:`)}`;
  };

  return (
    <>
      <aside className={classNames('app-sidebar', open && 'app-sidebar--open', collapsed && 'app-sidebar--collapsed')}>
        <div className="app-sidebar__top">
          <div className="sidebar-logo-wrap"><Logo /></div>
          <button className="icon-button app-sidebar__collapse" onClick={toggleCollapsed} aria-label={collapsed ? 'Развернуть панель' : 'Свернуть панель'} title={collapsed ? 'Развернуть панель' : 'Свернуть панель'}>
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button className="icon-button app-sidebar__close" onClick={close} aria-label="Закрыть меню">
            <X size={20} />
          </button>
        </div>
        <nav className="app-sidebar__nav">
          <small>{user.role === 'admin' ? 'Управление' : user.role === 'teacher' ? 'Кабинет преподавателя' : 'Обучение'}</small>
          {links.map(({ to, label, icon: Icon, end }) => {
            const active = isLinkActive(location.pathname, location.search, to, end);
            return (
              <Link key={to} to={to} className={classNames(active && 'active')} onClick={close} title={collapsed ? label : undefined} aria-current={active ? 'page' : undefined}>
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="app-sidebar__bottom">
          {user.role === 'student' ? (
            <div className="sidebar-streak" title="7 дней подряд">
              <span className="sidebar-streak__fire">🔥</span>
              <div>
                <strong>7 дней подряд</strong>
                <small>Ещё один короткий урок сегодня</small>
              </div>
              <b className="sidebar-streak__count" aria-label="7 дней подряд">7</b>
            </div>
          ) : null}
          <button className="sidebar-support" onClick={openSupport} title={collapsed ? 'Поддержка' : undefined}>
            <LifeBuoy size={19} />
            <span>Поддержка</span>
          </button>
          <button className="sidebar-logout" onClick={logout} title={collapsed ? 'Выйти' : undefined}>
            <LogOut size={19} />
            <span>Выйти</span>
          </button>
        </div>
      </aside>
      {open ? <button className="sidebar-overlay" onClick={close} aria-label="Закрыть меню" /> : null}
    </>
  );
}
