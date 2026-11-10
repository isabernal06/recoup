import { Handshake } from 'lucide-react';
import { ACTIVE_PROMISE_DAMPING, FACTOR_LABELS, type Priority } from '../../domain/priority';
import { cx } from '../../lib/cx';
import { PRIORITY_LABELS } from '../shared/tones';
import styles from './PriorityBreakdown.module.css';

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Explains a priority score: a ring for the total, and one bar per factor
 * showing how many of its possible points it contributed. The collector can
 * see at a glance whether an account is urgent because of its size, its age,
 * a missed promise, or silence.
 */
export function PriorityBreakdown({ priority }: { priority: Priority }) {
  const dashOffset = RING_CIRCUMFERENCE * (1 - priority.score / 100);

  return (
    <div className={styles.layout}>
      <div className={cx(styles.ring, styles[priority.level])}>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className={styles.ringTrack} cx="60" cy="60" r={RING_RADIUS} />
          <circle
            className={styles.ringValue}
            cx="60"
            cy="60"
            r={RING_RADIUS}
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <p className={styles.ringLabel}>
          <span className={cx(styles.ringScore, 'tabular')}>{priority.score}</span>{' '}
          <span className={styles.ringLevel}>
            {PRIORITY_LABELS[priority.level]}
            <span className="visually-hidden"> priority, out of 100</span>
          </span>
        </p>
      </div>

      <div className={styles.factors}>
        {priority.heldByPromise && (
          <p className={styles.held}>
            <Handshake size={16} aria-hidden="true" />
            Held at {ACTIVE_PROMISE_DAMPING * 100}% while the customer’s promise to pay is active.
          </p>
        )}
        <ul className={styles.factorList}>
          {priority.factors.map((factor) => {
            const points = Math.round(factor.points);
            return (
              <li key={factor.id} className={styles.factor}>
                <div className={styles.factorTop}>
                  <span className={styles.factorName}>{FACTOR_LABELS[factor.id]}</span>{' '}
                  <span className={cx(styles.factorPoints, 'tabular')}>
                    {points}
                    <span className={styles.factorMax}> / {factor.max} pts</span>
                  </span>
                </div>
                <span className={styles.factorTrack} aria-hidden="true">
                  <span
                    className={styles.factorFill}
                    style={{ width: `${(factor.points / factor.max) * 100}%` }}
                  />
                </span>
                {' '}
                <span className={styles.factorReason}>{factor.reason}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
