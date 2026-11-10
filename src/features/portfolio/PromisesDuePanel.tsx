import { CalendarClock, Send } from 'lucide-react';
import { Link } from 'react-router';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import type { AccountRow } from '../../domain/accountRow';
import { diffInDays } from '../../domain/dates';
import { formatCurrency, formatDate } from '../../domain/format';
import { cx } from '../../lib/cx';
import styles from './PromisesDuePanel.module.css';
import { PROMISE_HORIZON_DAYS } from './summary';

const MAX_LISTED = 4;

interface PromisesDuePanelProps {
  promises: AccountRow[];
  today: Date;
  /** Opens the campaign composer with these customers and the promise reminder. */
  onRemind: () => void;
  /** Filters the queue down to every active promise. */
  onViewAll: () => void;
}

function describeDueDate(dueDate: string, today: Date): { text: string; urgent: boolean } {
  const days = diffInDays(today, dueDate);
  if (days <= 0) return { text: 'Due today', urgent: true };
  if (days === 1) return { text: 'Due tomorrow', urgent: true };
  return { text: `Due in ${days} days`, urgent: false };
}

/**
 * Customers who promised to pay in the next few days. They rank low in the
 * queue on purpose (they should not be chased), but a timely reminder is what
 * keeps a promise from breaking, so they get their own panel and a shortcut.
 */
export function PromisesDuePanel({ promises, today, onRemind, onViewAll }: PromisesDuePanelProps) {
  const listed = promises.slice(0, MAX_LISTED);
  const hidden = promises.length - listed.length;

  return (
    <Card
      title="Promises due this week"
      description={`Payments customers committed to in the next ${PROMISE_HORIZON_DAYS} days.`}
      className={styles.card}
    >
      {promises.length === 0 ? (
        <div className={styles.empty}>
          <CalendarClock size={22} aria-hidden="true" />
          <p>No promises fall due this week.</p>
        </div>
      ) : (
        <>
          <ul className={styles.list}>
            {listed.map((row) => {
              const { promise } = row;
              if (!promise) return null;
              const due = describeDueDate(promise.dueDate, today);
              return (
                <li key={row.id} className={styles.item}>
                  <Avatar name={row.customer.name} size="sm" />
                  <div className={styles.who}>
                    <Link to={`/accounts/${row.id}`} className={styles.name}>
                      {row.customer.name}
                    </Link>{' '}
                    <span className={styles.amount}>
                      {formatCurrency(promise.amount)} by {formatDate(promise.dueDate)}
                    </span>
                  </div>{' '}
                  <span className={cx(styles.due, due.urgent && styles.urgent)}>{due.text}</span>
                </li>
              );
            })}
          </ul>
          <div className={styles.footer}>
            <Button variant="primary" size="sm" onClick={onRemind}>
              <Send aria-hidden="true" />
              Send reminders ({promises.length})
            </Button>
            {hidden > 0 && (
              <Button variant="ghost" size="sm" onClick={onViewAll}>
                View all {promises.length}
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
