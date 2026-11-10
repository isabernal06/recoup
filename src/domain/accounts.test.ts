import { describe, expect, it } from 'vitest';
import { buildAccount, daysAgo, daysFromNow, TODAY } from '../test/factories';
import { getAgingBucket, getDaysPastDue, summarizeAging } from './aging';
import { diffInDays, parseDate, toISODate } from './dates';
import { getCollectionStatus } from './status';
import { getTemplate, renderTemplate } from './templates';

describe('dates', () => {
  it('reads date-only strings as local calendar days', () => {
    const date = parseDate('2026-03-01');

    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([
      2026, 2, 1, 0,
    ]);
    expect(toISODate(date)).toBe('2026-03-01');
  });

  it('counts whole calendar days regardless of the time of day', () => {
    const lateEvening = new Date(2026, 2, 15, 23, 50);
    const earlyMorning = new Date(2026, 2, 16, 0, 10);

    expect(diffInDays(lateEvening, earlyMorning)).toBe(1);
    expect(diffInDays('2026-03-16', '2026-03-10')).toBe(-6);
  });
});

describe('getCollectionStatus', () => {
  it.each([
    ['not_contacted', buildAccount()],
    ['in_follow_up', buildAccount({ lastContactAt: daysAgo(4) })],
    [
      'promise_active',
      buildAccount({ promise: { amount: 100, dueDate: daysFromNow(2), createdAt: daysAgo(1) } }),
    ],
    [
      'promise_broken',
      buildAccount({ promise: { amount: 100, dueDate: daysAgo(1), createdAt: daysAgo(6) } }),
    ],
    ['paid', buildAccount({ balanceDue: 0 })],
  ])('derives "%s" from the account data', (expected, account) => {
    expect(getCollectionStatus(account, TODAY)).toBe(expected);
  });

  it('keeps a promise active on the day it is due', () => {
    const dueToday = buildAccount({
      promise: { amount: 100, dueDate: daysAgo(0), createdAt: daysAgo(3) },
    });

    expect(getCollectionStatus(dueToday, TODAY)).toBe('promise_active');
  });
});

describe('aging', () => {
  it.each([
    [0, null],
    [1, '1-30'],
    [30, '1-30'],
    [31, '31-60'],
    [60, '31-60'],
    [61, '61-90'],
    [90, '61-90'],
    [91, '90+'],
    [400, '90+'],
  ])('puts %i days past due in bucket %s', (days, bucket) => {
    expect(getAgingBucket(days)).toBe(bucket);
  });

  it('reports zero days past due for paid accounts', () => {
    expect(getDaysPastDue(buildAccount({ balanceDue: 0, dueDate: daysAgo(80) }), TODAY)).toBe(0);
  });

  it('totals open balances per bucket and ignores paid accounts', () => {
    const summary = summarizeAging(
      [
        buildAccount({ balanceDue: 100, dueDate: daysAgo(10) }),
        buildAccount({ balanceDue: 250, dueDate: daysAgo(25) }),
        buildAccount({ balanceDue: 900, dueDate: daysAgo(120) }),
        buildAccount({ balanceDue: 0, dueDate: daysAgo(45) }),
      ],
      TODAY,
    );

    expect(summary.map(({ bucketId, count, total }) => [bucketId, count, total])).toEqual([
      ['1-30', 2, 350],
      ['31-60', 0, 0],
      ['61-90', 0, 0],
      ['90+', 1, 900],
    ]);
  });
});

describe('renderTemplate', () => {
  it("fills the placeholders with the account's data", () => {
    const account = buildAccount({ id: 'ACC-77', balanceDue: 1250, dueDate: daysAgo(42) });

    const message = renderTemplate(getTemplate('overdue_notice')!, account, TODAY);

    expect(message.subject).toBe('Your payment of $1,250 is past due');
    expect(message.body).toContain('Hi Ana, your payment of $1,250 is now 42 days past due.');
  });

  it('includes the promise details in a promise reminder', () => {
    const account = buildAccount({
      promise: { amount: 300, dueDate: daysFromNow(2), createdAt: daysAgo(1) },
    });

    const message = renderTemplate(getTemplate('promise_reminder')!, account, TODAY);

    expect(message.body).toContain('your commitment to pay $300 by Mar 18, 2026');
  });

  it('leaves a placeholder visible when the account has no data for it', () => {
    const message = renderTemplate(getTemplate('promise_reminder')!, buildAccount(), TODAY);

    expect(message.body).toContain('{{promiseAmount}}');
  });
});
