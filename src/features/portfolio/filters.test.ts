import { describe, expect, it } from 'vitest';
import { withInsights } from '../../domain/accountRow';
import { buildAccount, daysAgo, TODAY } from '../../test/factories';
import { DEFAULT_FILTERS, filterAccounts, parseFilters, sortAccounts } from './filters';

const row = (overrides: Parameters<typeof buildAccount>[0]) =>
  withInsights(buildAccount(overrides), TODAY);

const rows = [
  row({ id: 'ACC-1', balanceDue: 500, dueDate: daysAgo(10), lastContactAt: daysAgo(2) }),
  row({
    id: 'ACC-2',
    customer: { name: 'Mateo Herrera', phone: null, email: 'mateo@example.com' },
    product: 'Credit card',
    balanceDue: 2800,
    dueDate: daysAgo(75),
  }),
  row({ id: 'ACC-3', balanceDue: 0, dueDate: daysAgo(40), lastContactAt: daysAgo(20) }),
];

const ids = (list: typeof rows) => list.map((item) => item.id);

describe('parseFilters', () => {
  it('reads valid filters from the URL', () => {
    const filters = parseFilters(new URLSearchParams('q=rojas&bucket=31-60&status=paid&sort=balance'));

    expect(filters).toEqual({ query: 'rojas', bucket: '31-60', status: 'paid', sort: 'balance' });
  });

  it('falls back to defaults for missing or tampered values', () => {
    const filters = parseFilters(new URLSearchParams('bucket=forever&status=__proto__&sort=drop'));

    expect(filters).toEqual(DEFAULT_FILTERS);
  });
});

describe('filterAccounts', () => {
  it('searches name, account id and product, ignoring case and outer spaces', () => {
    const search = (query: string) =>
      ids(filterAccounts(rows, { query, bucket: 'all', status: 'all' }));

    expect(search('  mateo ')).toEqual(['ACC-2']);
    expect(search('acc-3')).toEqual(['ACC-3']);
    expect(search('CREDIT')).toEqual(['ACC-2']);
    expect(search('nobody')).toEqual([]);
  });

  it('combines the aging and status filters', () => {
    const filtered = filterAccounts(rows, { query: '', bucket: '61-90', status: 'not_contacted' });

    expect(ids(filtered)).toEqual(['ACC-2']);
    expect(filterAccounts(rows, { query: '', bucket: '61-90', status: 'paid' })).toEqual([]);
  });
});

describe('sortAccounts', () => {
  it('puts the most urgent account first and paid accounts last by default', () => {
    expect(ids(sortAccounts(rows, 'priority'))).toEqual(['ACC-2', 'ACC-1', 'ACC-3']);
  });

  it('puts never-contacted accounts first when sorting by last contact', () => {
    expect(ids(sortAccounts(rows, 'lastContact'))).toEqual(['ACC-2', 'ACC-3', 'ACC-1']);
  });

  it('returns a new array instead of reordering the cached data', () => {
    const original = [...rows];

    sortAccounts(rows, 'balance');

    expect(rows).toEqual(original);
  });
});
