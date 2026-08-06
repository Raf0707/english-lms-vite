import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export function Toasts() {
  const toasts = useAppStore((state) => state.toasts);
  const dismiss = useAppStore((state) => state.dismissToast);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = toast.tone === 'warning' ? TriangleAlert : toast.tone === 'info' ? Info : CheckCircle2;
        return (
          <div className={`toast toast--${toast.tone ?? 'success'}`} key={toast.id}>
            <Icon size={20} />
            <div>
              <strong>{toast.title}</strong>
              {toast.text ? <p>{toast.text}</p> : null}
            </div>
            <button onClick={() => dismiss(toast.id)} aria-label="Закрыть уведомление">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
