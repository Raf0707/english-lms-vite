import { Link } from 'react-router-dom';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="logo" aria-label="Lingua — на главную">
      <span className="logo__mark">L</span>
      {!compact ? (
        <span className="logo__text">
          <strong>Lingua</strong>
          <small>English studio</small>
        </span>
      ) : null}
    </Link>
  );
}
