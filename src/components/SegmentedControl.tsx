import type { LucideIcon } from 'lucide-react';
import styles from './SegmentedControl.module.css';

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps<T extends string> {
  /** Accessible name for the group. */
  legend: string;
  /** Shared `name` of the underlying radio buttons. */
  name: string;
  options: Array<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
}

/**
 * A row of mutually exclusive options that looks like a tab bar. It is built
 * from real radio buttons, so arrow keys, form semantics and screen reader
 * announcements ("2 of 3") work without any custom keyboard handling.
 */
export function SegmentedControl<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <fieldset>
      <legend className="visually-hidden">{legend}</legend>
      <div className={styles.segments}>
        {options.map(({ value: optionValue, label, icon: Icon }) => (
          <label key={optionValue} className={styles.segment}>
            <input
              type="radio"
              name={name}
              value={optionValue}
              checked={value === optionValue}
              onChange={() => onChange(optionValue)}
            />
            <span className={styles.face}>
              {Icon && <Icon aria-hidden="true" size={16} />}
              {label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
