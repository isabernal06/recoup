import { diffInDays } from './dates';
import { getCollectionStatus } from './status';
import type { MessageTemplate } from './templates';
import type { AccountSummary, Channel } from './types';

/** Minimum days between two contact attempts with the same customer. */
export const CONTACT_COOLDOWN_DAYS = 3;

export type ExclusionReason =
  | 'paid'
  | 'missing_contact'
  | 'active_promise'
  | 'no_active_promise'
  | 'recently_contacted';

export interface Exclusion<T extends AccountSummary = AccountSummary> {
  account: T;
  reason: ExclusionReason;
}

export interface EligibilityResult<T extends AccountSummary = AccountSummary> {
  eligible: T[];
  excluded: Exclusion<T>[];
}

/**
 * Contact rules for outbound campaigns. Returns why an account must be skipped,
 * or null when it may be contacted. Rules are checked from the most to the
 * least fundamental, so the reason shown is the one the collector can act on.
 */
export function getExclusionReason(
  account: AccountSummary,
  channel: Channel,
  template: MessageTemplate,
  today: Date,
): ExclusionReason | null {
  const status = getCollectionStatus(account, today);
  if (status === 'paid') return 'paid';

  const contact = channel === 'email' ? account.customer.email : account.customer.phone;
  if (!contact) return 'missing_contact';

  const hasActivePromise = status === 'promise_active';
  if (template.audience === 'active_promise' && !hasActivePromise) return 'no_active_promise';
  // Chasing someone who already committed to pay damages the relationship.
  if (template.audience === 'overdue' && hasActivePromise) return 'active_promise';

  if (account.lastContactAt) {
    const daysSinceContact = diffInDays(account.lastContactAt, today);
    if (daysSinceContact < CONTACT_COOLDOWN_DAYS) return 'recently_contacted';
  }
  return null;
}

/** Splits a selection into the accounts that will be messaged and the ones skipped. */
export function splitByEligibility<T extends AccountSummary>(
  accounts: T[],
  channel: Channel,
  template: MessageTemplate,
  today: Date,
): EligibilityResult<T> {
  const result: EligibilityResult<T> = { eligible: [], excluded: [] };
  for (const account of accounts) {
    const reason = getExclusionReason(account, channel, template, today);
    if (reason) result.excluded.push({ account, reason });
    else result.eligible.push(account);
  }
  return result;
}

/** Completes the sentence "3 accounts skipped: …" for a given reason. */
export function describeExclusion(reason: ExclusionReason, channel: Channel): string {
  switch (reason) {
    case 'paid':
      return 'already paid';
    case 'missing_contact':
      return channel === 'email' ? 'no email address on file' : 'no phone number on file';
    case 'active_promise':
      return 'active promise to pay';
    case 'no_active_promise':
      return 'no active promise to remind';
    case 'recently_contacted':
      return `contacted in the last ${CONTACT_COOLDOWN_DAYS} days`;
  }
}

/** Groups exclusions by reason, most frequent first. */
export function countExclusions(
  excluded: Exclusion[],
): Array<{ reason: ExclusionReason; count: number }> {
  const counts = new Map<ExclusionReason, number>();
  for (const { reason } of excluded) {
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}
