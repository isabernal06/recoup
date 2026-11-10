import { describe, expect, it } from 'vitest';
import { withInsights } from '../../domain/accountRow';
import { buildAccount, daysAgo, daysFromNow, TODAY } from '../../test/factories';
import { countByStatus, getPromisesDueSoon, PROMISE_HORIZON_DAYS, summarizePortfolio } from './summary';

const row = (overrides: Parameters<typeof buildAccount>[0]) =>
  withInsights(buildAccount(overrides), TODAY);

const promiseDueIn = (days: number) => ({
  amount: 100,
  dueDate: daysFromNow(days),
  createdAt: daysAgo(1),
});

describe('summarizePortfolio', () => {
  it('totals open balances and recoveries separately', () => {
    const summary = summarizePortfolio([
      row({ id: 'A', balanceDue: 400 }),
      row({ id: 'B', balanceDue: 600 }),
      row({ id: 'C', balanceDue: 0, recoveredAmount: 250 }),
    ]);

    expect(summary).toMatchObject({
      overdueBalance: 1000,
      openCount: 2,
      recoveredAmount: 250,
      paidCount: 1,
    });
  });
});

describe('getPromisesDueSoon', () => {
  it('lists active promises inside the horizon, soonest first', () => {
    const rows = [
      row({ id: 'LATER', promise: promiseDueIn(5) }),
      row({ id: 'TODAY', promise: promiseDueIn(0) }),
      row({ id: 'TOO-FAR', promise: promiseDueIn(PROMISE_HORIZON_DAYS + 1) }),
      row({ id: 'MISSED', promise: { ...promiseDueIn(0), dueDate: daysAgo(2) } }),
      row({ id: 'NO-PROMISE' }),
    ];

    expect(getPromisesDueSoon(rows, TODAY).map((item) => item.id)).toEqual(['TODAY', 'LATER']);
  });
});

describe('countByStatus', () => {
  it('counts every status, including the ones with no accounts', () => {
    const counts = countByStatus([row({}), row({ lastContactAt: daysAgo(4) }), row({})]);

    expect(counts).toEqual({
      not_contacted: 2,
      in_follow_up: 1,
      promise_active: 0,
      promise_broken: 0,
      paid: 0,
    });
  });
});
