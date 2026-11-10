import { cx } from '../lib/cx';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

/** Class names for elements that should look like a button, e.g. router links. */
export function buttonClassName(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md'): string {
  return cx(styles.button, styles[variant], styles[size]);
}
