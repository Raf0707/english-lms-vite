import { Home, Menu, UserRound } from 'lucide-react';
import { MouseEvent, useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { classNames } from '../utils/format';
import { Logo } from './Logo';
import { Button } from './ui';

const links = [
  { to: '/', label: 'Главная', icon: Home },
  { to: '/catalog', label: 'Курсы' },
  { to: '/teachers', label: 'Преподаватели' },
  { to: '/#method', label: 'Как учимся', hash: 'method' },
  { to: '/#reviews', label: 'Отзывы', hash: 'reviews' }
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const user = useAppStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== '/' || !location.hash) return;
    const id = location.hash.slice(1);
    let attempt = 0;
    const scroll = () => {
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      attempt += 1;
      if (attempt < 8) window.setTimeout(scroll, 50);
    };
    scroll();
  }, [location.pathname, location.hash]);

  const goToSection = (event: MouseEvent<HTMLAnchorElement>, hash: string) => {
    event.preventDefault();
    setOpen(false);
    navigate({ pathname: '/', hash: `#${hash}` });
    if (location.pathname === '/') {
      window.setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    }
  };

  return (
    <header className="public-header">
      <div className="container public-header__inner">
        <Logo />
        <nav className={classNames('public-nav', open && 'public-nav--open')}>
          {links.map((link) => {
            const Icon = link.icon;
            if (link.hash) {
              return <a key={link.to} href={link.to} onClick={(event) => goToSection(event, link.hash!)}>{Icon ? <Icon size={15} /> : null}{link.label}</a>;
            }
            return (
              <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)} end={link.to === '/'}>
                {Icon ? <Icon size={15} /> : null}{link.label}
              </NavLink>
            );
          })}
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
