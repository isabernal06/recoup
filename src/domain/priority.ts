import { getDaysPastDue } from './aging';
import { diffInDays } from './dates';
import { formatCurrency, formatDate, pluralize } from './format';
import { getCollectionStatus } from './status';
import type { AccountSummary } from './types';

export type PriorityLevel = 'high' | 'medium' | 'low' | 'none';

export type PriorityFactorId = 'balance' | 'daysPastDue' | 'brokenPromise' | 'contactGap';

export interface PriorityFactor {
  id: PriorityFactorId;
  /** Points this factor contributed, before any promise damping. */
  points: number;
  /** The most points this factor can contribute. */
  max: number;
  /** Human-readable explanation, e.g. "Balance of $3,000". */
  reason: string;
}

export interface Priority {
  /** 0–100. Higher means "work this account sooner". */
  score: number;
  level: PriorityLevel;
  /** Human-readable explanation, strongest factor first. */
  reasons: string[];
  /** Every factor in a fixed order, for visual breakdowns. Empty for paid accounts. */
  factors: PriorityFactor[];
  /** True when an active promise to pay is holding the score down. */
  heldByPromise: boolean;
}

export const FACTOR_LABELS: Record<PriorityFactorId, string> = {
  balance: 'Balance',
  daysPastDue: 'Days past due',
  brokenPromise: 'Promise history',
  contactGap: 'Time since contact',
};

/**
 * Maximum points each factor can contribute. They add up to 100.
 * Balance weighs the most: an old debt of $100 should not outrank a newer one of $3,000.
 */
export const PRIORITY_WEIGHTS = {
  balance: 35,
  daysPastDue: 25,
  brokenPromise: 20,
  contactGap: 20,
} as const;

/** The value at which each factor reaches its maximum points. */
const SATURATION = {
  daysPastDue: 120,
  balance: 3000,
  contactGapDays: 14,
} as const;

/** A customer with a live promise should mostly be left alone until it is due. */
export const ACTIVE_PROMISE_DAMPING = 0.25;

const LEVEL_THRESHOLDS = { high: 60, medium: 35 } as const;

/** Factors contributing fewer points than this are not worth explaining. */
const MIN_POINTS_TO_EXPLAIN = 8;

const ratio = (value: number, saturation: number) => Math.min(Math.max(value / saturation, 0), 1);

function brokenPromiseFactor(account: AccountSummary, isCurrentPromiseBroken: boolean): PriorityFactor {
  const base = { id: 'brokenPromise', max: PRIORITY_WEIGHTS.brokenPromise } as const;
  if (isCurrentPromiseBroken && account.promise) {
    return {
      ...base,
      points: PRIORITY_WEIGHTS.brokenPromise,
      reason: `Missed promise due ${formatDate(account.promise.dueDate)}`,
    };
  }
  return {
    ...base,
    points: Math.min(account.brokenPromises, 2) * (PRIORITY_WEIGHTS.brokenPromise / 4),
    reason: `${pluralize(account.brokenPromises, 'broken promise')} on record`,
  };
}

function contactGapFactor(account: AccountSummary, today: Date): PriorityFactor {
  const base = { id: 'contactGap', max: PRIORITY_WEIGHTS.contactGap } as const;
  if (!account.lastContactAt) {
    return { ...base, points: PRIORITY_WEIGHTS.contactGap, reason: 'Never contacted' };
  }
  const days = diffInDays(account.lastContactAt, today);
  return {
    ...base,
    points: ratio(days, SATURATION.contactGapDays) * PRIORITY_WEIGHTS.contactGap,
    reason: `No contact in ${pluralize(days, 'day')}`,
  };
}

function toLevel(score: number): PriorityLevel {
  if (score >= LEVEL_THRESHOLDS.high) return 'high';
  if (score >= LEVEL_THRESHOLDS.medium) return 'medium';
  return 'low';
}

/**
 * Scores how urgently a collector should work an account, and explains why.
 *
 * The score is a transparent weighted sum rather than a black box: a collector
 * has to trust the queue order, so every score comes with its reasons.
 */
export function computePriority(account: AccountSummary, today: Date): Priority {
  const status = getCollectionStatus(account, today);
  if (status === 'paid') {
    return { score: 0, level: 'none', reasons: ['Paid in full'], factors: [], heldByPromise: false };
  }

  const daysPastDue = getDaysPastDue(account, today);
  const factors: PriorityFactor[] = [
    {
      id: 'balance',
      max: PRIORITY_WEIGHTS.balance,
      points: ratio(account.balanceDue, SATURATION.balance) * PRIORITY_WEIGHTS.balance,
      reason: `Balance of ${formatCurrency(account.balanceDue)}`,
    },
    {
      id: 'daysPastDue',
      max: PRIORITY_WEIGHTS.daysPastDue,
      points: ratio(daysPastDue, SATURATION.daysPastDue) * PRIORITY_WEIGHTS.daysPastDue,
      reason: `${pluralize(daysPastDue, 'day')} past due`,
    },
    brokenPromiseFactor(account, status === 'promise_broken'),
    contactGapFactor(account, today),
  ];
  const total = factors.reduce((sum, factor) => sum + factor.points, 0);

  if (status === 'promise_active' && account.promise) {
    const score = Math.round(total * ACTIVE_PROMISE_DAMPING);
    return {
      score,
      level: toLevel(score),
      reasons: [`Promise to pay due ${formatDate(account.promise.dueDate)}`],
      factors,
      heldByPromise: true,
    };
  }

  const score = Math.round(total);
  const reasons = factors
    .filter((factor) => factor.points >= MIN_POINTS_TO_EXPLAIN)
    .toSorted((a, b) => b.points - a.points)
    .map((factor) => factor.reason);

  return { score, level: toLevel(score), reasons, factors, heldByPromise: false };
}
