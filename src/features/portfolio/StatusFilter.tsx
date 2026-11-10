import { STATUS_LABELS, type CollectionStatus } from '../../domain/status';
import { cx } from '../../lib/cx';
import { STATUS_TONES } from '../shared/tones';
import styles from './StatusFilter.module.css';

const STATUSES = Object.keys(STATUS_LABELS) as CollectionStatus[];

interface StatusFilterProps {
  value: CollectionStatus | 'all';
  onChange: (status: CollectionStatus | 'all') => void;
  /** Accounts per status, given the other active filters. */
  counts: Record<CollectionStatus, number>;
}

/**
 * Status as a row of toggle chips with live counts, so the collector sees the
 * shape of the queue before filtering and never picks a status with no results
 * by accident. A dropdown would hide both the options and the counts.
 */
export function StatusFilter({ value, onChange, counts }: StatusFilterProps) {
  const total = STATUSES.reduce((sum, status) => sum + counts[status], 0);
  const chips: Array<{ id: CollectionStatus | 'all'; label: string; count: number }> = [
    { id: 'all', label: 'All', count: total },
    ...STATUSES.map((status) => ({ id: status, label: STATUS_LABELS[status], count: counts[status] })),
  ];

  return (
    <div role="group" aria-label="Filter by status" className={styles.chips}>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className={cx(styles.chip, chip.id === value && styles.active)}
          aria-pressed={chip.id === value}
          onClick={() => onChange(chip.id)}
        >
          {chip.id !== 'all' && (
            <span className={cx(styles.dot, styles[STATUS_TONES[chip.id]])} aria-hidden="true" />
          )}
          {chip.label}{' '}
          <span className={cx(styles.count, 'tabular')}>{chip.count}</span>
        </button>
      ))}
    </div>
  );
}
