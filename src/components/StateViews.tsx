import { CloudOff, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import { getErrorMessage } from '../lib/errors';
import { Button } from './Button';
import styles from './StateViews.module.css';

/**
 * The three non-happy-path views every data screen needs. Keeping them as
 * shared components makes loading, empty and error states look and behave the
 * same everywhere, and makes it cheap to handle them properly on a new screen.
 */

interface SkeletonProps {
  width?: string;
  height?: string;
  radius?: string;
}

/** A neutral placeholder block. Purely decorative, so hidden from screen readers. */
export function Skeleton({ width = '100%', height = '1rem', radius }: SkeletonProps) {
  return (
    <span
      className={styles.skeleton}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

interface LoadingStateProps {
  /** Announced to screen readers, e.g. "Loading accounts". */
  label: string;
  /** Skeleton placeholders that hint at the layout about to appear. */
  children: ReactNode;
}

export function LoadingState({ label, children }: LoadingStateProps) {
  return (
    <div role="status" aria-busy="true" className={styles.loading}>
      <span className="visually-hidden">{label}…</span>
      {children}
    </div>
  );
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Optional way out, such as a "Clear filters" button. */
  action?: ReactNode;
  /** Use "inline" inside a card that already has a border. */
  variant?: 'standalone' | 'inline';
}

export function EmptyState({ icon: Icon, title, description, action, variant = 'standalone' }: EmptyStateProps) {
  return (
    <div className={cx(styles.message, styles[variant])}>
      <span className={styles.illustration} aria-hidden="true">
        <Icon size={26} strokeWidth={1.75} />
      </span>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title: string;
  error: unknown;
  onRetry?: () => void;
}

export function ErrorState({ title, error, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className={cx(styles.message, styles.standalone)}>
      <span className={cx(styles.illustration, styles.danger)} aria-hidden="true">
        <CloudOff size={26} strokeWidth={1.75} />
      </span>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{getErrorMessage(error)}</p>
      {onRetry && (
        <div className={styles.action}>
          <Button variant="primary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

interface InlineAlertProps {
  tone: 'danger' | 'success' | 'warning';
  icon?: LucideIcon;
  children: ReactNode;
}

/** A compact message shown next to the thing it refers to (a form, a table). */
export function InlineAlert({ tone, icon: Icon, children }: InlineAlertProps) {
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx(styles.alert, styles[tone])}>
      {Icon && <Icon size={18} aria-hidden="true" className={styles.alertIcon} />}
      <div className={styles.alertBody}>{children}</div>
    </div>
  );
}
