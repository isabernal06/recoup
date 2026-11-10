import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { ToastContext, type ToastInput, type ToastTone } from './toastContext';
import styles from './Toast.module.css';

const AUTO_DISMISS_MS = 6000;
const MAX_VISIBLE = 3;

const TONE_ICONS: Record<ToastTone, typeof Info> = {
  success: CircleCheck,
  danger: CircleAlert,
  info: Info,
};

interface Toast extends Required<ToastInput> {
  id: number;
}

/**
 * Hosts the toast stack. The container is a permanent polite live region, so
 * new messages are announced without moving focus away from what the user is
 * doing. Toasts dismiss themselves, and can also be closed by hand.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    ({ tone = 'success', message }: ToastInput) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((current) => [...current, { id, tone, message }].slice(-MAX_VISIBLE));
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS),
      );
    },
    [dismiss],
  );

  // Clear pending timers if the whole app unmounts (e.g. between tests).
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  return (
    <ToastContext value={show}>
      {children}
      <div className={styles.viewport} role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = TONE_ICONS[toast.tone];
          return (
            <div key={toast.id} className={cx(styles.toast, styles[toast.tone])}>
              <Icon className={styles.icon} size={20} aria-hidden="true" />
              <p className={styles.message}>{toast.message}</p>
              <button
                type="button"
                className={styles.close}
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext>
  );
}
