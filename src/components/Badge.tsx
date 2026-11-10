import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  tone?: BadgeTone;
  /** Shows a small coloured dot before the label, for statuses. */
  dot?: boolean;
  children: ReactNode;
}

/**
 * A small status label. Tone adds colour, but the text always carries the
 * meaning on its own, so the badge works without colour perception.
 */
export function Badge({ tone = 'neutral', dot = false, children }: BadgeProps) {
  return (
    <span className={cx(styles.badge, styles[tone])}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  );
}
