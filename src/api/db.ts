import type { Account, Campaign } from '../domain/types';
import { createSeedAccounts, createSeedCampaigns } from './seed';

/**
 * The in-memory "database" behind the simulated API. Only files in `src/api`
 * may import it; the rest of the app talks to the API functions.
 */
export const db: { accounts: Account[]; campaigns: Campaign[] } = {
  accounts: [],
  campaigns: [],
};

let idCounter = 0;

/** Sequential ids are enough here; a real backend would generate them. */
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${2000 + idCounter}`;
}

/** Restores the seed data. Also used by tests to isolate each case. */
export function resetDb(today: Date = new Date()): void {
  db.accounts = createSeedAccounts(today);
  db.campaigns = createSeedCampaigns(db.accounts, today);
  idCounter = 0;
}

resetDb();
