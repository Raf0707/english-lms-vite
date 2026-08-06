import { Bell, Menu, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { formatDate } from '../utils/format';
import { Avatar } from './ui';

export function AppTopbar({ title, subtitle }: { title?: string; subtitle?: string }) {
  const user = useAppStore((state) => state.user);
  const notifications = useAppStore((state) => state.notifications);
  const markAllRead = useAppStore((state) => state.markAllNotificationsRead);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unread = notifications.filter((item) => !item.read).length;

  if (!user) return null;
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
        <label className="top-search">
          <Search size={17} />
          <input placeholder="Поиск" />
          <kbd>⌘ K</kbd>
        </label>
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
        <Link to={user.role === 'student' ? '/app/profile' : user.role === 'teacher' ? '/teacher' : '/admin'} className="top-profile">
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
