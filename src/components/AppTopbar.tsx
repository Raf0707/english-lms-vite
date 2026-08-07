import { Bell, BookOpen, CalendarDays, GraduationCap, Menu, Search, UserRoundSearch, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { formatDate } from '../utils/format';
import { Avatar } from './ui';

type SearchResult = { id: string; title: string; subtitle: string; to: string; kind: 'course' | 'session' | 'section' };

export function AppTopbar({ title, subtitle }: { title?: string; subtitle?: string }) {
  const user = useAppStore((state) => state.user);
  const notifications = useAppStore((state) => state.notifications);
  const courses = useAppStore((state) => state.courses);
  const sessions = useAppStore((state) => state.sessions);
  const markAllRead = useAppStore((state) => state.markAllNotificationsRead);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const unread = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    if (!user || query.trim().length < 1) return [];
    const q = query.trim().toLowerCase();
    const searchableCourses = user.role === 'teacher'
      ? courses.filter((course) => course.ownerId === user.id || course.instructorId === user.id)
      : user.role === 'student'
        ? courses.filter((course) => course.status === 'published')
        : courses;
    const courseResults = searchableCourses
      .filter((course) => `${course.title} ${course.shortDescription} ${course.category} ${course.instructor}`.toLowerCase().includes(q))
      .slice(0, 5)
      .map((course) => ({
        id: `course-${course.id}`,
        title: course.title,
        subtitle: `${course.level} · ${course.instructor}`,
        to: user.role === 'teacher' ? `/teacher/course/${course.id}/edit` : user.role === 'admin' ? `/admin/course/${course.id}/edit` : `/course/${course.slug}`,
        kind: 'course' as const
      }));
    const sessionResults = sessions
      .filter((session) => `${session.title} ${session.instructor}`.toLowerCase().includes(q))
      .slice(0, 4)
      .map((session) => ({
        id: `session-${session.id}`,
        title: session.title,
        subtitle: `${session.instructor} · ${formatDate(session.startAt, true)}`,
        to: user.role === 'student' ? `/app/schedule` : user.role === 'teacher' ? '/teacher?tab=sessions' : '/admin',
        kind: 'session' as const
      }));
    const sections: SearchResult[] = user.role === 'student'
      ? [
          { id: 's-learning', title: 'Моё обучение', subtitle: 'Курсы и прогресс', to: '/app/learning', kind: 'section' },
          { id: 's-teachers', title: 'Преподаватели', subtitle: 'Индивидуальные и групповые занятия', to: '/app/teachers', kind: 'section' },
          { id: 's-dict', title: 'Мой словарь', subtitle: 'Слова и повторения', to: '/app/dictionary', kind: 'section' },
          { id: 's-schedule', title: 'Расписание', subtitle: 'Предстоящие занятия', to: '/app/schedule', kind: 'section' },
          { id: 's-profile', title: 'Профиль', subtitle: 'Email, телефон и настройки', to: '/app/profile', kind: 'section' }
        ]
      : user.role === 'teacher'
        ? [
            { id: 't-courses', title: 'Мои курсы', subtitle: 'Редактор и публикация', to: '/teacher?tab=courses', kind: 'section' },
            { id: 't-sessions', title: 'Занятия', subtitle: 'Расписание и видеокомнаты', to: '/teacher?tab=sessions', kind: 'section' }
          ]
        : [
            { id: 'a-courses', title: 'Курсы', subtitle: 'Модерация и публикация', to: '/admin?tab=courses', kind: 'section' },
            { id: 'a-users', title: 'Пользователи', subtitle: 'Управление доступами', to: '/admin?tab=users', kind: 'section' }
          ];
    const sectionResults = sections.filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(q));
    return [...sectionResults, ...courseResults, ...sessionResults].slice(0, 9);
  }, [courses, query, sessions, user]);

  if (!user) return null;
  const iconFor = (kind: SearchResult['kind']) => kind === 'course' ? <GraduationCap size={17} /> : kind === 'session' ? <CalendarDays size={17} /> : <BookOpen size={17} />;

  return (
    <header className="app-topbar">
      <div className="app-topbar__title">
        <button className="icon-button app-topbar__menu" onClick={toggleSidebar} aria-label="Открыть меню">
          <Menu size={22} />
        </button>
        <div>
          {title ? <h1>{title}</h1> : null}
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="app-topbar__actions">
        <div className="top-search-wrap">
          <label className="top-search">
            <Search size={17} />
            <input
              ref={searchRef}
              value={query}
              placeholder="Поиск по платформе"
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }}
            />
            {query ? <button type="button" className="top-search__clear" onClick={() => setQuery('')} aria-label="Очистить"><X size={14} /></button> : null}
          </label>
          {searchOpen && query ? (
            <div className="global-search-popover">
              <header><strong>Результаты поиска</strong><small>{results.length ? `${results.length} найдено` : 'Совпадений нет'}</small></header>
              {results.length ? results.map((result) => (
                <Link key={result.id} to={result.to} onClick={() => { setSearchOpen(false); setQuery(''); }}>
                  <span>{iconFor(result.kind)}</span>
                  <div><strong>{result.title}</strong><small>{result.subtitle}</small></div>
                </Link>
              )) : <div className="global-search-empty"><UserRoundSearch size={22} /><span>Попробуйте название курса, преподавателя или раздела.</span></div>}
            </div>
          ) : null}
        </div>
        <div className="notifications-wrap">
          <button
            className="icon-button notification-button"
            onClick={() => setNotificationsOpen((value) => !value)}
            aria-label="Уведомления"
          >
            <Bell size={20} />
            {unread ? <span>{unread}</span> : null}
          </button>
          {notificationsOpen ? (
            <div className="notifications-popover">
              <header>
                <strong>Уведомления</strong>
                <button onClick={markAllRead}>Прочитать все</button>
              </header>
              <div>
                {notifications.slice(0, 5).map((item) => (
                  <article key={item.id} className={!item.read ? 'unread' : ''}>
                    <span />
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.text}</p>
                      <small>{formatDate(item.date, true)}</small>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <Link to={user.role === 'student' ? '/app/profile' : '/profile'} className="top-profile">
          <Avatar value={user.avatar ?? user.name.slice(0, 2)} size="sm" />
          <div>
            <strong>{user.name}</strong>
            <small>{user.role === 'student' ? 'Ученик' : user.role === 'teacher' ? 'Преподаватель' : 'Администратор'}</small>
          </div>
        </Link>
      </div>
    </header>
  );
}
