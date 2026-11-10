import type { AccountRow } from '../../domain/accountRow';
import { diffInDays } from '../../domain/dates';
import { STATUS_LABELS, type CollectionStatus } from '../../domain/status';

/** How far ahead the "promises due soon" panel looks. */
export const PROMISE_HORIZON_DAYS = 7;

/** The collector's recovery target for the period. A demo constant, not real data. */
export const RECOVERY_TARGET = 10_000;

export interface PortfolioSummary {
  overdueBalance: number;
  openCount: number;
  highPriorityCount: number;
  brokenPromises: number;
  recoveredAmount: number;
  paidCount: number;
}

/** The headline numbers for the top of the queue, computed in a single pass. */
export function summarizePortfolio(rows: AccountRow[]): PortfolioSummary {
  const summary: PortfolioSummary = {
    overdueBalance: 0,
    openCount: 0,
    highPriorityCount: 0,
    brokenPromises: 0,
    recoveredAmount: 0,
    paidCount: 0,
  };

  for (const row of rows) {
    summary.recoveredAmount += row.recoveredAmount;
    if (row.status === 'paid') {
      summary.paidCount += 1;
      continue;
    }
    summary.openCount += 1;
    summary.overdueBalance += row.balanceDue;
    if (row.priority.level === 'high') summary.highPriorityCount += 1;
    if (row.status === 'promise_broken') summary.brokenPromises += 1;
  }
  return summary;
}

/**
 * Active promises that fall due within the horizon, soonest first. These are
 * the customers worth a reminder before the date passes, and they rank low in
 * the main queue on purpose, so they get their own panel.
 */
export function getPromisesDueSoon(rows: AccountRow[], today: Date): AccountRow[] {
  return rows
    .filter(
      (row) =>
        row.status === 'promise_active' &&
        row.promise !== null &&
        diffInDays(today, row.promise.dueDate) <= PROMISE_HORIZON_DAYS,
    )
    .toSorted((a, b) => (a.promise?.dueDate ?? '').localeCompare(b.promise?.dueDate ?? ''));
}

/** How many accounts are in each status, for the status filter chips. */
export function countByStatus(rows: AccountRow[]): Record<CollectionStatus, number> {
  const counts = Object.fromEntries(
    Object.keys(STATUS_LABELS).map((status) => [status, 0]),
  ) as Record<CollectionStatus, number>;
  for (const row of rows) counts[row.status] += 1;
  return counts;
}
