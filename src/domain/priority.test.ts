import { describe, expect, it } from 'vitest';
import { buildAccount, daysAgo, daysFromNow, TODAY } from '../test/factories';
import { computePriority } from './priority';

const score = (overrides: Parameters<typeof buildAccount>[0]) =>
  computePriority(buildAccount(overrides), TODAY).score;

describe('computePriority', () => {
  it('gives paid accounts no priority at all', () => {
    const priority = computePriority(buildAccount({ balanceDue: 0, paidAt: daysAgo(1) }), TODAY);

    expect(priority).toMatchObject({ score: 0, level: 'none', reasons: ['Paid in full'], factors: [] });
  });

  it('ranks an older debt above a newer one, all else equal', () => {
    expect(score({ dueDate: daysAgo(90) })).toBeGreaterThan(score({ dueDate: daysAgo(20) }));
  });

  it('ranks a larger balance above a smaller one, all else equal', () => {
    expect(score({ balanceDue: 2500 })).toBeGreaterThan(score({ balanceDue: 200 }));
  });

  it('does not let a small, very old debt outrank a large, recent one', () => {
    const smallAndOld = score({ balanceDue: 100, dueDate: daysAgo(140) });
    const largeAndRecent = score({ balanceDue: 3000, dueDate: daysAgo(40) });

    expect(largeAndRecent).toBeGreaterThan(smallAndOld);
  });

  it('raises priority the longer an account goes without contact', () => {
    const contactedYesterday = score({ lastContactAt: daysAgo(1) });
    const contactedTwoWeeksAgo = score({ lastContactAt: daysAgo(14) });
    const neverContacted = score({ lastContactAt: null });

    expect(contactedTwoWeeksAgo).toBeGreaterThan(contactedYesterday);
    expect(neverContacted).toBe(contactedTwoWeeksAgo); // Both hit the factor's ceiling.
  });

  it('treats a missed promise as a strong signal and names it in the reasons', () => {
    const promise = { amount: 1000, dueDate: daysAgo(2), createdAt: daysAgo(9) };
    const withoutPromise = buildAccount({ lastContactAt: daysAgo(9) });
    const withMissedPromise = buildAccount({ lastContactAt: daysAgo(9), promise });

    const missed = computePriority(withMissedPromise, TODAY);

    expect(missed.score).toBeGreaterThan(computePriority(withoutPromise, TODAY).score);
    expect(missed.reasons).toContain('Missed promise due Mar 14, 2026');
  });

  it('holds back accounts with a promise that is not due yet', () => {
    const promise = { amount: 1000, dueDate: daysFromNow(4), createdAt: daysAgo(1) };
    const account = { balanceDue: 3000, dueDate: daysAgo(100), lastContactAt: daysAgo(1) };

    const waiting = computePriority(buildAccount({ ...account, promise }), TODAY);

    expect(waiting.score).toBeLessThan(score(account));
    expect(waiting.level).toBe('low');
    expect(waiting.reasons).toEqual(['Promise to pay due Mar 20, 2026']);
  });

  it('caps the score at 100 for the worst possible account', () => {
    const worst = computePriority(
      buildAccount({
        balanceDue: 50_000,
        dueDate: daysAgo(400),
        lastContactAt: daysAgo(60),
        promise: { amount: 500, dueDate: daysAgo(30), createdAt: daysAgo(60) },
      }),
      TODAY,
    );

    expect(worst.score).toBe(100);
    expect(worst.level).toBe('high');
  });

  it('exposes every factor, so the score can be explained visually', () => {
    const priority = computePriority(
      buildAccount({ balanceDue: 1500, dueDate: daysAgo(60), lastContactAt: null }),
      TODAY,
    );

    expect(priority.factors.map((factor) => factor.id)).toEqual([
      'balance',
      'daysPastDue',
      'brokenPromise',
      'contactGap',
    ]);
    const total = priority.factors.reduce((sum, factor) => sum + factor.points, 0);
    expect(Math.round(total)).toBe(priority.score);
    for (const factor of priority.factors) {
      expect(factor.points).toBeLessThanOrEqual(factor.max);
    }
  });

  it('flags when an active promise is holding the score down', () => {
    const promise = { amount: 1000, dueDate: daysFromNow(2), createdAt: daysAgo(1) };

    expect(computePriority(buildAccount({ promise }), TODAY).heldByPromise).toBe(true);
    expect(computePriority(buildAccount(), TODAY).heldByPromise).toBe(false);
  });

  it('lists reasons strongest first and leaves out negligible ones', () => {
    const priority = computePriority(
      buildAccount({ balanceDue: 3000, dueDate: daysAgo(12), lastContactAt: daysAgo(1) }),
      TODAY,
    );

    // Balance dominates; 12 days late and a contact yesterday are too weak to mention.
    expect(priority.reasons).toEqual(['Balance of $3,000']);
  });
});
