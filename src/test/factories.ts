import { addDays, toISODate } from '../domain/dates';
import type { AccountSummary } from '../domain/types';

/** A fixed "today" so date-dependent unit tests never depend on the real clock. */
export const TODAY = new Date(2026, 2, 16, 10, 0); // 16 Mar 2026, 10:00 local time

export const daysAgo = (days: number): string => toISODate(addDays(TODAY, -days));
export const daysFromNow = (days: number): string => toISODate(addDays(TODAY, days));

/**
 * Builds a plain, unremarkable overdue account. Each test overrides only the
 * fields it is about, which keeps the intent of the test visible.
 */
export function buildAccount(overrides: Partial<AccountSummary> = {}): AccountSummary {
  return {
    id: 'ACC-1',
    customer: {
      name: 'Ana Perez',
      phone: '+1 (305) 555-0100',
      email: 'ana.perez@example.com',
    },
    product: 'Personal loan',
    balanceDue: 1000,
    recoveredAmount: 0,
    dueDate: daysAgo(30),
    lastContactAt: null,
    promise: null,
    brokenPromises: 0,
    paidAt: null,
    ...overrides,
  };
}
