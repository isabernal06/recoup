import { getAgingBucket, getDaysPastDue, type AgingBucketId } from './aging';
import { computePriority, type Priority } from './priority';
import { getCollectionStatus, type CollectionStatus } from './status';
import type { AccountSummary } from './types';

/** Everything the UI derives from an account. Never stored, always computed. */
export interface AccountInsights {
  daysPastDue: number;
  agingBucket: AgingBucketId | null;
  status: CollectionStatus;
  priority: Priority;
}

/** An account as the UI consumes it: API data plus derived insights. */
export type WithInsights<T extends AccountSummary = AccountSummary> = T & AccountInsights;

export type AccountRow = WithInsights<AccountSummary>;

export function withInsights<T extends AccountSummary>(account: T, today: Date): WithInsights<T> {
  const daysPastDue = getDaysPastDue(account, today);
  return {
    ...account,
    daysPastDue,
    agingBucket: getAgingBucket(daysPastDue),
    status: getCollectionStatus(account, today),
    priority: computePriority(account, today),
  };
}
