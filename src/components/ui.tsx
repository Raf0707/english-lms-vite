import type { ButtonHTMLAttributes, HTMLAttributes, PropsWithChildren, ReactNode } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import { classNames } from '../utils/format';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={classNames('button', `button--${variant}`, `button--${size}`, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle size={18} className="spin" /> : icon}
      <span>{children}</span>
    </button>
  );
}

export function Card({ children, className, ...props }: PropsWithChildren<HTMLAttributes<HTMLElement>>) {
  return <section className={classNames('card', className)} {...props}>{children}</section>;
}

export function Badge({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'neutral' | 'green' | 'amber' | 'red' | 'violet' }>) {
  return <span className={classNames('badge', `badge--${tone}`)}>{children}</span>;
}

export function Avatar({ value, size = 'md', className }: { value: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  return <span className={classNames('avatar', `avatar--${size}`, className)}>{value}</span>;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  actions,
  size = 'md'
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className={classNames('modal', `modal--${size}`)} role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {actions ? <footer className="modal__actions">{actions}</footer> : null}
      </div>
    </div>
  );
}

export function InputField({
  label,
  error,
  hint,
  children
}: PropsWithChildren<{ label: string; error?: string; hint?: string }>) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {error ? <span className="field__error">{error}</span> : hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}
