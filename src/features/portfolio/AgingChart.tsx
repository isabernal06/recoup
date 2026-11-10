import { Card } from '../../components/Card';
import type { AgingBucketId, AgingSummary } from '../../domain/aging';
import { formatCurrency, pluralize } from '../../domain/format';
import { cx } from '../../lib/cx';
import styles from './AgingChart.module.css';

interface AgingChartProps {
  data: AgingSummary[];
  selectedBucket: AgingBucketId | 'all';
  onSelectBucket: (bucket: AgingBucketId | 'all') => void;
}

/**
 * Overdue balance by age, as a column chart whose columns double as filters.
 *
 * It is built from plain buttons instead of a charting library: there are only
 * four values, and this way every number is real text, each column is keyboard
 * operable, and the chart adds nothing to the bundle. The bars are decorative;
 * the label, amount and share inside each button carry the same information.
 */
export function AgingChart({ data, selectedBucket, onSelectBucket }: AgingChartProps) {
  const total = data.reduce((sum, item) => sum + item.total, 0);
  const largest = Math.max(...data.map((item) => item.total), 1);
  const share = (value: number) => (total === 0 ? 0 : Math.round((value / total) * 100));

  return (
    <Card
      title="Overdue balance by age"
      description="Older debt is harder to recover. Select a bucket to filter the queue."
      className={styles.card}
    >
      <ul className={styles.columns}>
        {data.map((item, index) => {
          const isSelected = item.bucketId === selectedBucket;
          const isDimmed = selectedBucket !== 'all' && !isSelected;
          return (
            <li key={item.bucketId}>
              <button
                type="button"
                className={cx(styles.column, isSelected && styles.selected, isDimmed && styles.dimmed)}
                aria-pressed={isSelected}
                onClick={() => onSelectBucket(isSelected ? 'all' : item.bucketId)}
              >
                <span className={styles.label}>{item.label}</span>{' '}
                <span className={cx(styles.amount, 'tabular')}>{formatCurrency(item.total)}</span>{' '}
                <span className={cx(styles.meta, 'tabular')}>
                  {pluralize(item.count, 'account')} · {share(item.total)}%
                </span>
                <span className={styles.barArea} aria-hidden="true">
                  <span
                    className={cx(styles.bar, styles[`bucket${index}`])}
                    style={{ height: `${Math.max((item.total / largest) * 100, 4)}%` }}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
