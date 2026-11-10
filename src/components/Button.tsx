import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../lib/cx';
import styles from './Button.module.css';
import { buttonClassName, type ButtonSize, type ButtonVariant } from './buttonClassName';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Disables the button, shows a spinner and tells assistive technology that work is in progress. */
  isLoading?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  type = 'button',
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(buttonClassName(variant, size), className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading && <span className={styles.spinner} aria-hidden="true" />}
      {children}
    </button>
  );
}
