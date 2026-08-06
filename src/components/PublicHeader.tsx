import { Menu, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { classNames } from '../utils/format';
import { Logo } from './Logo';
import { Button } from './ui';

const links = [
  { to: '/catalog', label: 'Курсы' },
  { to: '/#method', label: 'Как учимся' },
  { to: '/#teachers', label: 'Преподаватели' },
  { to: '/#reviews', label: 'Отзывы' }
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const user = useAppStore((state) => state.user);
  return (
    <header className="public-header">
      <div className="container public-header__inner">
        <Logo />
        <nav className={classNames('public-nav', open && 'public-nav--open')}>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="public-header__actions">
          {user ? (
            <Link to={user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/app'}>
              <Button variant="secondary" icon={<UserRound size={18} />}>Кабинет</Button>
            </Link>
          ) : (
            <>
              <Link to="/login" className="header-login">Войти</Link>
              <Link to="/register"><Button>Начать обучение</Button></Link>
            </>
          )}
          <button className="public-header__menu" onClick={() => setOpen((value) => !value)} aria-label="Открыть меню">
            <Menu size={23} />
          </button>
        </div>
      </div>
    </header>
  );
}
