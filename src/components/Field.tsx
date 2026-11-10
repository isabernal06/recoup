import { useId, type ReactNode } from 'react';
import { cx } from '../lib/cx';
import styles from './Field.module.css';

/** Props the form control must spread so it is wired to its label and messages. */
export interface ControlProps {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
}

interface FieldProps {
  label: string;
  /** Keeps the label for screen readers but hides it visually, for compact toolbars. */
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  children: (control: ControlProps) => ReactNode;
}

/**
 * Label + control + hint + error, correctly associated.
 *
 * The control is passed as a render function so Field owns the accessibility
 * wiring (ids, aria-describedby, aria-invalid) and callers cannot forget it:
 *
 *   <Field label="Amount" error={errors.amount}>
 *     {(control) => <input {...control} type="number" />}
 *   </Field>
 */
export function Field({ label, hideLabel = false, hint, error, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={cx(styles.label, hideLabel && 'visually-hidden')}>
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
