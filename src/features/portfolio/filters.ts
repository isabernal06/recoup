import type { AccountRow } from '../../domain/accountRow';
import { AGING_BUCKETS, type AgingBucketId } from '../../domain/aging';
import { STATUS_LABELS, type CollectionStatus } from '../../domain/status';

export const SORT_OPTIONS = [
  { value: 'priority', label: 'Highest priority' },
  { value: 'balance', label: 'Largest balance' },
  { value: 'daysPastDue', label: 'Most days past due' },
  { value: 'lastContact', label: 'Longest without contact' },
  { value: 'customer', label: 'Customer A–Z' },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]['value'];

export interface PortfolioFilters {
  query: string;
  bucket: AgingBucketId | 'all';
  status: CollectionStatus | 'all';
  sort: SortKey;
}

export const DEFAULT_FILTERS: PortfolioFilters = {
  query: '',
  bucket: 'all',
  status: 'all',
  sort: 'priority',
};

/** The URL parameter that stores each filter. */
export const FILTER_PARAMS: Record<keyof PortfolioFilters, string> = {
  query: 'q',
  bucket: 'bucket',
  status: 'status',
  sort: 'sort',
};

const isBucket = (value: string): value is AgingBucketId =>
  AGING_BUCKETS.some((bucket) => bucket.id === value);
// Object.hasOwn, not `in`: `in` also matches inherited keys such as "constructor".
const isStatus = (value: string): value is CollectionStatus =>
  Object.hasOwn(STATUS_LABELS, value);
const isSortKey = (value: string): value is SortKey =>
  SORT_OPTIONS.some((option) => option.value === value);

/**
 * Reads filters from the URL. The URL is user-editable input, so every value
 * is validated and anything unrecognised silently falls back to its default.
 */
export function parseFilters(params: URLSearchParams): PortfolioFilters {
  const bucket = params.get(FILTER_PARAMS.bucket) ?? '';
  const status = params.get(FILTER_PARAMS.status) ?? '';
  const sort = params.get(FILTER_PARAMS.sort) ?? '';
  return {
    query: params.get(FILTER_PARAMS.query) ?? DEFAULT_FILTERS.query,
    bucket: isBucket(bucket) ? bucket : DEFAULT_FILTERS.bucket,
    status: isStatus(status) ? status : DEFAULT_FILTERS.status,
    sort: isSortKey(sort) ? sort : DEFAULT_FILTERS.sort,
  };
}

export function filterAccounts(
  rows: AccountRow[],
  filters: Pick<PortfolioFilters, 'query' | 'bucket' | 'status'>,
): AccountRow[] {
  const query = filters.query.trim().toLowerCase();
  return rows.filter((row) => {
    if (filters.bucket !== 'all' && row.agingBucket !== filters.bucket) return false;
    if (filters.status !== 'all' && row.status !== filters.status) return false;
    if (!query) return true;
    return [row.customer.name, row.id, row.product].some((value) =>
      value.toLowerCase().includes(query),
    );
  });
}

const comparators: Record<SortKey, (a: AccountRow, b: AccountRow) => number> = {
  priority: (a, b) => b.priority.score - a.priority.score,
  balance: (a, b) => b.balanceDue - a.balanceDue,
  daysPastDue: (a, b) => b.daysPastDue - a.daysPastDue,
  // ISO timestamps sort correctly as strings; never-contacted ("") comes first.
  lastContact: (a, b) => (a.lastContactAt ?? '').localeCompare(b.lastContactAt ?? ''),
  customer: (a, b) => a.customer.name.localeCompare(b.customer.name),
};

/** Returns a new sorted array. Ties fall back to the account id so order is stable. */
export function sortAccounts(rows: AccountRow[], sort: SortKey): AccountRow[] {
  return rows.toSorted((a, b) => comparators[sort](a, b) || a.id.localeCompare(b.id));
}
