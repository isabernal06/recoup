import { diffInDays } from './dates';
import type { AccountSummary } from './types';

export type CollectionStatus =
  | 'not_contacted'
  | 'in_follow_up'
  | 'promise_active'
  | 'promise_broken'
  | 'paid';

export const STATUS_LABELS: Record<CollectionStatus, string> = {
  not_contacted: 'Not contacted',
  in_follow_up: 'In follow-up',
  promise_active: 'Promise to pay',
  promise_broken: 'Broken promise',
  paid: 'Paid',
};

/**
 * Status is derived from the account data instead of being stored, so it can
 * never drift out of sync: a promise becomes "broken" simply because its date
 * has passed, without anything having to update the record.
 */
export function getCollectionStatus(account: AccountSummary, today: Date): CollectionStatus {
  if (account.balanceDue <= 0) return 'paid';
  if (account.promise) {
    const daysLate = diffInDays(account.promise.dueDate, today);
    return daysLate > 0 ? 'promise_broken' : 'promise_active';
  }
  return account.lastContactAt ? 'in_follow_up' : 'not_contacted';
}
