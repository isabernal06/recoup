import { memo, useEffect, useRef, type MouseEvent } from 'react';
import { Link } from 'react-router';
import { Avatar } from '../../components/Avatar';
import type { AccountRow } from '../../domain/accountRow';
import { AGING_BUCKETS } from '../../domain/aging';
import { formatCurrency, formatRelativeDay } from '../../domain/format';
import { cx } from '../../lib/cx';
import { PriorityMeter } from '../shared/PriorityBadge';
import { StatusBadge } from '../shared/StatusBadge';
import styles from './AccountTable.module.css';

interface AccountTableProps {
  rows: AccountRow[];
  selectedIds: ReadonlySet<string>;
  onToggleRow: (accountId: string) => void;
  onToggleAll: (accountIds: string[], shouldSelect: boolean) => void;
  today: Date;
  /** The queue's current query string, so the detail page can link back to it. */
  queueSearch: string;
}

export function AccountTable({
  rows,
  selectedIds,
  onToggleRow,
  onToggleAll,
  today,
  queueSearch,
}: AccountTableProps) {
  const selectedCount = rows.filter((row) => selectedIds.has(row.id)).length;
  const allSelected = rows.length > 0 && selectedCount === rows.length;

  // "Some but not all" has no HTML attribute; it can only be set on the DOM node.
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedCount > 0 && !allSelected;
    }
  }, [selectedCount, allSelected]);

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <caption className="visually-hidden">
          Overdue accounts. Use the filters above to narrow or reorder the list.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={styles.checkboxCell}>
              <input
                ref={selectAllRef}
                type="checkbox"
                className={styles.checkbox}
                checked={allSelected}
                onChange={(event) =>
                  onToggleAll(
                    rows.map((row) => row.id),
                    event.target.checked,
                  )
                }
                aria-label={`Select all ${rows.length} accounts shown`}
              />
            </th>
            <th scope="col">Customer</th>
            <th scope="col" className={styles.wideOnly}>
              Status
            </th>
            <th scope="col" className={styles.numeric}>
              Balance due
            </th>
            <th scope="col" className={cx(styles.numeric, styles.wideOnly)}>
              Days past due
            </th>
            <th scope="col" className={styles.wideOnly}>
              Last contact
            </th>
            <th scope="col">Priority</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <AccountTableRow
              key={row.id}
              row={row}
              isSelected={selectedIds.has(row.id)}
              onToggle={onToggleRow}
              today={today}
              queueSearch={queueSearch}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface AccountTableRowProps {
  row: AccountRow;
  isSelected: boolean;
  onToggle: (accountId: string) => void;
  today: Date;
  queueSearch: string;
}

/**
 * The whole row opens the account on click, as a mouse convenience. It does so
 * by clicking the row's real link, so keyboard users, screen readers and
 * "open in new tab" all keep using that link. Clicks on the checkbox or on
 * selected text are left alone.
 */
function openRowOnClick(event: MouseEvent<HTMLTableRowElement>) {
  const target = event.target as HTMLElement;
  if (target.closest('a, button, input, label')) return;
  if (window.getSelection()?.toString()) return;
  event.currentTarget.querySelector<HTMLAnchorElement>('a[data-row-link]')?.click();
}

/**
 * Memoised so that ticking one checkbox re-renders one row instead of the whole
 * table. This works because every prop is stable between renders: `row` objects
 * come from React Query's cache, and the parent passes a `useCallback` handler.
 */
const AccountTableRow = memo(function AccountTableRow({
  row,
  isSelected,
  onToggle,
  today,
  queueSearch,
}: AccountTableRowProps) {
  const bucketIndex = AGING_BUCKETS.findIndex((bucket) => bucket.id === row.agingBucket);

  return (
    <tr className={cx(styles.row, isSelected && styles.selectedRow)} onClick={openRowOnClick}>
      <td className={styles.checkboxCell}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={isSelected}
          onChange={() => onToggle(row.id)}
          aria-label={`Select ${row.customer.name}`}
        />
      </td>
      <th scope="row" className={styles.customer}>
        <div className={styles.customerInner}>
          <Avatar name={row.customer.name} />
          <div className={styles.customerText}>
            <Link
              to={`/accounts/${row.id}`}
              state={{ queueSearch }}
              className={styles.name}
              data-row-link
            >
              {row.customer.name}
            </Link>{' '}
            <span className={styles.meta}>
              {row.id} · {row.product}
            </span>{' '}
            <span className={styles.narrowOnly}>
              <StatusBadge status={row.status} />
            </span>
          </div>
        </div>
      </th>
      <td className={styles.wideOnly}>
        <StatusBadge status={row.status} />
      </td>
      <td className={cx(styles.numeric, styles.balance, 'tabular')}>
        {formatCurrency(row.balanceDue)}
      </td>
      <td className={cx(styles.numeric, styles.wideOnly, 'tabular')}>
        {row.status === 'paid' ? (
          <span className={styles.muted}>—</span>
        ) : (
          <span className={styles.days}>
            <span className={cx(styles.agingDot, styles[`bucket${bucketIndex}`])} aria-hidden="true" />
            {row.daysPastDue}
          </span>
        )}
      </td>
      <td className={cx(styles.wideOnly, !row.lastContactAt && styles.muted)}>
        {row.lastContactAt ? formatRelativeDay(row.lastContactAt, today) : 'Never'}
      </td>
      <td>
        <PriorityMeter priority={row.priority} />{' '}
        <span className={styles.reason}>{row.priority.reasons[0]}</span>
      </td>
    </tr>
  );
});
