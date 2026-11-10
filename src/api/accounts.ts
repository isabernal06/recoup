import { CALL_OUTCOME_LABELS } from '../domain/activity';
import { diffInDays } from '../domain/dates';
import { formatCurrency, formatDate } from '../domain/format';
import { getCollectionStatus } from '../domain/status';
import type { Account, AccountSummary, Activity, CallOutcome } from '../domain/types';
import { ApiError, simulateRequest } from './client';
import { db, nextId } from './db';

export interface LogCallInput {
  outcome: CallOutcome;
  note: string;
}

export interface CreatePromiseInput {
  amount: number;
  /** ISO date (yyyy-mm-dd). */
  dueDate: string;
}

function findAccount(id: string): Account {
  const account = db.accounts.find((item) => item.id === id);
  if (!account) throw new ApiError(404, `Account ${id} was not found.`);
  return account;
}

function toSummary(account: Account): AccountSummary {
  const { activities: _activities, ...summary } = account;
  return summary;
}

/** Prepends an activity to an account's history. Shared with the campaigns API. */
export function recordActivity(account: Account, activity: Omit<Activity, 'id' | 'at'>, at: Date): void {
  account.activities.unshift({ ...activity, id: nextId('ACT'), at: at.toISOString() });
}

/** GET /accounts — the list omits each account's history to keep the payload small. */
export function fetchAccounts(): Promise<AccountSummary[]> {
  return simulateRequest(() => db.accounts.map(toSummary));
}

/** GET /accounts/:id */
export function fetchAccount(id: string): Promise<Account> {
  return simulateRequest(() => findAccount(id));
}

/** POST /accounts/:id/calls */
export function logCall(id: string, input: LogCallInput): Promise<Account> {
  return simulateRequest(() => {
    const account = findAccount(id);
    const now = new Date();
    recordActivity(
      account,
      {
        type: 'call',
        summary: CALL_OUTCOME_LABELS[input.outcome],
        note: input.note.trim() || undefined,
      },
      now,
    );
    account.lastContactAt = now.toISOString();
    return account;
  });
}

/** POST /accounts/:id/promises */
export function createPromise(id: string, input: CreatePromiseInput): Promise<Account> {
  return simulateRequest(() => {
    const account = findAccount(id);
    const now = new Date();

    if (!(input.amount > 0) || input.amount > account.balanceDue) {
      throw new ApiError(422, 'The promised amount must be between $1 and the balance due.');
    }
    if (diffInDays(now, input.dueDate) < 0) {
      throw new ApiError(422, 'The promise date cannot be in the past.');
    }

    // Replacing a promise that was already missed counts against the customer.
    if (getCollectionStatus(account, now) === 'promise_broken') {
      account.brokenPromises += 1;
    }
    account.promise = { amount: input.amount, dueDate: input.dueDate, createdAt: now.toISOString() };
    account.lastContactAt = now.toISOString();
    recordActivity(
      account,
      {
        type: 'promise',
        summary: `Promised to pay ${formatCurrency(input.amount)} by ${formatDate(input.dueDate)}`,
      },
      now,
    );
    return account;
  });
}

/** POST /accounts/:id/payments — records payment of the full balance. */
export function recordPayment(id: string): Promise<Account> {
  return simulateRequest(() => {
    const account = findAccount(id);
    if (account.balanceDue <= 0) {
      throw new ApiError(409, 'This account is already paid in full.');
    }
    const now = new Date();
    recordActivity(
      account,
      { type: 'payment', summary: `Payment of ${formatCurrency(account.balanceDue)} received` },
      now,
    );
    account.recoveredAmount += account.balanceDue;
    account.balanceDue = 0;
    account.promise = null;
    account.paidAt = now.toISOString();
    return account;
  });
}
