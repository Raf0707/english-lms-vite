import { Link } from 'react-router-dom';
import { Logo } from './Logo';

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="container public-footer__grid">
        <div>
          <Logo />
          <p>Английский, который становится частью жизни. Уроки, практика, словарь и занятия с преподавателем — в одном месте.</p>
        </div>
        <div>
          <strong>Обучение</strong>
          <Link to="/catalog">Все курсы</Link>
          <Link to="/catalog?level=A1">Для начинающих</Link>
          <Link to="/catalog?category=travel">Для путешествий</Link>
        </div>
        <div>
          <strong>Платформа</strong>
          <Link to="/login">Войти</Link>
          <Link to="/register">Регистрация</Link>
          <Link to="/app/dictionary">Умный словарь</Link>
        </div>
        <div>
          <strong>Документы</strong>
          <a href="#">Публичная оферта</a>
          <a href="#">Политика конфиденциальности</a>
          <a href="mailto:hello@lingua.school">hello@lingua.school</a>
        </div>
      </div>
      <div className="container public-footer__bottom">
        <span>© 2026 Lingua English Studio</span>
        <span>Демо-проект на Vite + React + TypeScript</span>
      </div>
    </footer>
  );
}
