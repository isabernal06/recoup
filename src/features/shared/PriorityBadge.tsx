import { Badge } from '../../components/Badge';
import type { Priority } from '../../domain/priority';
import { cx } from '../../lib/cx';
import styles from './PriorityBadge.module.css';
import { PRIORITY_LABELS, PRIORITY_TONES } from './tones';

/** Shows the priority level and its 0–100 score, e.g. "High · 78". */
export function PriorityBadge({ priority }: { priority: Priority }) {
  if (priority.level === 'none') {
    return (
      <Badge tone="neutral">
        None<span className="visually-hidden"> (no action needed)</span>
      </Badge>
    );
  }
  return (
    <Badge tone={PRIORITY_TONES[priority.level]}>
      {PRIORITY_LABELS[priority.level]}
      <span className="visually-hidden"> priority, score </span>
      <span aria-hidden="true">·</span>
      <span className="tabular">{priority.score}</span>
    </Badge>
  );
}

/**
 * Priority as a compact meter for dense lists: level, score and a bar whose
 * length is the score. The bar is decorative; the text carries the value.
 */
export function PriorityMeter({ priority }: { priority: Priority }) {
  if (priority.level === 'none') {
    return (
      <span className={styles.meter}>
        <span className={styles.label}>
          None<span className="visually-hidden"> (no action needed)</span>
        </span>
      </span>
    );
  }
  return (
    <span className={cx(styles.meter, styles[priority.level])}>
      <span className={styles.label}>
        {PRIORITY_LABELS[priority.level]}
        <span className="visually-hidden"> priority, score</span>{' '}
        <span className={cx(styles.score, 'tabular')}>{priority.score}</span>
      </span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.fill} style={{ width: `${priority.score}%` }} />
      </span>
    </span>
  );
}
