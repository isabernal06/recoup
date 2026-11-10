import { describe, expect, it } from 'vitest';
import { buildAccount, daysAgo, daysFromNow, TODAY } from '../test/factories';
import {
  CONTACT_COOLDOWN_DAYS,
  countExclusions,
  getExclusionReason,
  splitByEligibility,
} from './eligibility';
import { getTemplate } from './templates';

const overdueNotice = getTemplate('overdue_notice')!;
const promiseReminder = getTemplate('promise_reminder')!;

const activePromise = { amount: 500, dueDate: daysFromNow(3), createdAt: daysAgo(5) };
const missedPromise = { amount: 500, dueDate: daysAgo(2), createdAt: daysAgo(9) };

describe('getExclusionReason', () => {
  it('allows an overdue account that has never been contacted', () => {
    expect(getExclusionReason(buildAccount(), 'whatsapp', overdueNotice, TODAY)).toBeNull();
  });

  it('never contacts an account that is already paid', () => {
    const paid = buildAccount({ balanceDue: 0, paidAt: daysAgo(1) });

    expect(getExclusionReason(paid, 'email', overdueNotice, TODAY)).toBe('paid');
  });

  it('skips customers who cannot be reached on the chosen channel only', () => {
    const noPhone = buildAccount({
      customer: { name: 'Ana Perez', phone: null, email: 'ana.perez@example.com' },
    });

    expect(getExclusionReason(noPhone, 'whatsapp', overdueNotice, TODAY)).toBe('missing_contact');
    expect(getExclusionReason(noPhone, 'email', overdueNotice, TODAY)).toBeNull();
  });

  it('does not chase customers who have an active promise to pay', () => {
    const account = buildAccount({ promise: activePromise, lastContactAt: daysAgo(5) });

    expect(getExclusionReason(account, 'whatsapp', overdueNotice, TODAY)).toBe('active_promise');
  });

  it('sends promise reminders only to customers with an active promise', () => {
    const withPromise = buildAccount({ promise: activePromise, lastContactAt: daysAgo(5) });
    const withoutPromise = buildAccount();
    const withMissedPromise = buildAccount({ promise: missedPromise, lastContactAt: daysAgo(9) });

    expect(getExclusionReason(withPromise, 'whatsapp', promiseReminder, TODAY)).toBeNull();
    expect(getExclusionReason(withoutPromise, 'whatsapp', promiseReminder, TODAY)).toBe(
      'no_active_promise',
    );
    expect(getExclusionReason(withMissedPromise, 'whatsapp', promiseReminder, TODAY)).toBe(
      'no_active_promise',
    );
  });

  it('treats a missed promise as overdue again', () => {
    const account = buildAccount({ promise: missedPromise, lastContactAt: daysAgo(9) });

    expect(getExclusionReason(account, 'whatsapp', overdueNotice, TODAY)).toBeNull();
  });

  it('enforces the cooldown between contacts, up to and excluding its last day', () => {
    const contacted = (days: number) => buildAccount({ lastContactAt: daysAgo(days) });

    expect(getExclusionReason(contacted(0), 'email', overdueNotice, TODAY)).toBe('recently_contacted');
    expect(
      getExclusionReason(contacted(CONTACT_COOLDOWN_DAYS - 1), 'email', overdueNotice, TODAY),
    ).toBe('recently_contacted');
    expect(
      getExclusionReason(contacted(CONTACT_COOLDOWN_DAYS), 'email', overdueNotice, TODAY),
    ).toBeNull();
  });
});

describe('splitByEligibility', () => {
  it('separates who will be messaged from who is skipped, keeping the reason', () => {
    const eligible = buildAccount({ id: 'ACC-1' });
    const paid = buildAccount({ id: 'ACC-2', balanceDue: 0 });
    const recent = buildAccount({ id: 'ACC-3', lastContactAt: daysAgo(1) });

    const result = splitByEligibility([eligible, paid, recent], 'email', overdueNotice, TODAY);

    expect(result.eligible).toEqual([eligible]);
    expect(result.excluded).toEqual([
      { account: paid, reason: 'paid' },
      { account: recent, reason: 'recently_contacted' },
    ]);
  });
});

describe('countExclusions', () => {
  it('groups exclusions by reason with the most common first', () => {
    const account = buildAccount();

    const counts = countExclusions([
      { account, reason: 'paid' },
      { account, reason: 'recently_contacted' },
      { account, reason: 'recently_contacted' },
    ]);

    expect(counts).toEqual([
      { reason: 'recently_contacted', count: 2 },
      { reason: 'paid', count: 1 },
    ]);
  });
});
