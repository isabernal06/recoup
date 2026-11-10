import { diffInDays } from './dates';
import type { AccountSummary } from './types';

/** Standard receivables aging buckets, by days past due. */
export const AGING_BUCKETS = [
  { id: '1-30', label: '1–30 days', min: 1, max: 30 },
  { id: '31-60', label: '31–60 days', min: 31, max: 60 },
  { id: '61-90', label: '61–90 days', min: 61, max: 90 },
  { id: '90+', label: 'Over 90 days', min: 91, max: Infinity },
] as const;

export type AgingBucketId = (typeof AGING_BUCKETS)[number]['id'];

export interface AgingSummary {
  bucketId: AgingBucketId;
  label: string;
  count: number;
  total: number;
}

/** Days since the oldest unpaid installment was due. Zero for paid accounts. */
export function getDaysPastDue(account: AccountSummary, today: Date): number {
  if (account.balanceDue <= 0) return 0;
  return Math.max(0, diffInDays(account.dueDate, today));
}

export function getAgingBucket(daysPastDue: number): AgingBucketId | null {
  const bucket = AGING_BUCKETS.find(({ min, max }) => daysPastDue >= min && daysPastDue <= max);
  return bucket?.id ?? null;
}

/** Overdue balance and account count per bucket. Always returns every bucket. */
export function summarizeAging(accounts: AccountSummary[], today: Date): AgingSummary[] {
  const summary: AgingSummary[] = AGING_BUCKETS.map(({ id, label }) => ({
    bucketId: id,
    label,
    count: 0,
    total: 0,
  }));

  for (const account of accounts) {
    const bucketId = getAgingBucket(getDaysPastDue(account, today));
    const entry = summary.find((item) => item.bucketId === bucketId);
    if (entry) {
      entry.count += 1;
      entry.total += account.balanceDue;
    }
  }
  return summary;
}
