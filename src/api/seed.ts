import { addDays, startOfDay, toISODate } from '../domain/dates';
import { formatCurrency, formatDate } from '../domain/format';
import type {
  Account,
  Activity,
  ActivityType,
  Campaign,
  DeliveryStatus,
  PaymentPromise,
} from '../domain/types';

/**
 * Generates the mock portfolio.
 *
 * Data is generated rather than hand-written so that every date is relative to
 * "today": the queue always contains fresh promises, cooldowns and aging
 * buckets no matter when the app is opened. A seeded random generator keeps the
 * result identical on every load, which makes demos and tests predictable.
 */

const FIRST_NAMES = [
  'Valentina', 'Mateo', 'Camila', 'Santiago', 'Lucia', 'Daniel', 'Sofia', 'Andres',
  'Isabella', 'Nicolas', 'Mariana', 'Sebastian', 'Gabriela', 'Diego', 'Paula', 'Felipe',
  'Laura', 'Tomas', 'Carolina', 'Julian', 'Natalia', 'Emilio', 'Renata', 'Oscar',
];

const LAST_NAMES = [
  'Rojas', 'Herrera', 'Torres', 'Mendoza', 'Castillo', 'Vargas', 'Morales', 'Guerrero',
  'Navarro', 'Rios', 'Salazar', 'Cardenas', 'Pineda', 'Acosta', 'Fuentes', 'Molina',
  'Paredes', 'Lozano', 'Cifuentes', 'Arango', 'Bernal', 'Quintero', 'Osorio',
];

const PRODUCTS = ['Personal loan', 'Credit card', 'Store credit', 'Auto loan'];

type Scenario = 'paid' | 'promise_active' | 'promise_broken' | 'not_contacted' | 'in_follow_up';

/** mulberry32: a tiny, well-distributed seeded pseudo-random generator. */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickScenario(roll: number): Scenario {
  if (roll < 0.08) return 'paid';
  if (roll < 0.28) return 'promise_active';
  if (roll < 0.42) return 'promise_broken';
  if (roll < 0.62) return 'not_contacted';
  return 'in_follow_up';
}

export function simulateDeliveryStatus(roll: number): DeliveryStatus {
  if (roll < 0.15) return 'replied';
  if (roll < 0.55) return 'read';
  if (roll < 0.9) return 'delivered';
  return 'sent';
}

function createAccount(index: number, today: Date, rand: () => number): Account {
  const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
  const pick = <T>(items: T[]): T => items[Math.floor(rand() * items.length)];

  /** A timestamp `daysAgo` days back, during business hours and never in the future. */
  const timestamp = (daysAgo: number): string => {
    if (daysAgo <= 0) {
      const anHourAgo = today.getTime() - 3_600_000;
      return new Date(Math.max(startOfDay(today).getTime(), anHourAgo)).toISOString();
    }
    const date = addDays(startOfDay(today), -daysAgo);
    date.setHours(int(9, 17), int(0, 59));
    return date.toISOString();
  };

  const id = `ACC-${1001 + index}`;
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = LAST_NAMES[(index * 5 + 3) % LAST_NAMES.length];
  const hasEmail = rand() > 0.12;
  const hasPhone = !hasEmail || rand() > 0.06; // Every customer has at least one channel.

  const scenario = pickScenario(rand());
  // Squaring skews amounts and ages toward the low end, like a real portfolio.
  const amount = Math.round((60 + rand() ** 2 * 4100) / 5) * 5;
  let daysPastDue = scenario === 'not_contacted' ? int(2, 35) : 5 + Math.floor(rand() ** 1.5 * 140);

  const activities: Activity[] = [];
  const log = (daysAgo: number, type: ActivityType, summary: string) => {
    activities.push({ id: `${id}-seed-${activities.length + 1}`, at: timestamp(daysAgo), type, summary });
  };

  let lastContactDaysAgo: number | null = null;
  let promise: PaymentPromise | null = null;
  let paidDaysAgo: number | null = null;

  if (scenario === 'in_follow_up') {
    lastContactDaysAgo = int(0, Math.min(25, daysPastDue - 1));
  }
  if (scenario === 'promise_active') {
    lastContactDaysAgo = int(1, 6);
    promise = {
      amount,
      dueDate: toISODate(addDays(today, int(0, 9))),
      createdAt: timestamp(lastContactDaysAgo),
    };
  }
  if (scenario === 'promise_broken') {
    const promiseDueDaysAgo = int(1, 10);
    lastContactDaysAgo = promiseDueDaysAgo + int(4, 9);
    promise = {
      amount,
      dueDate: toISODate(addDays(today, -promiseDueDaysAgo)),
      createdAt: timestamp(lastContactDaysAgo),
    };
  }
  if (scenario === 'paid') {
    paidDaysAgo = int(0, 12);
    lastContactDaysAgo = paidDaysAgo + int(1, 5);
  }

  if (lastContactDaysAgo !== null) {
    // The debt must be older than the first time we contacted the customer about it.
    daysPastDue = Math.max(daysPastDue, lastContactDaysAgo + int(3, 12));

    const attempts: Array<{ type: ActivityType; summary: string }> = [];
    if (hasPhone) {
      attempts.push(
        { type: 'call', summary: 'No answer' },
        { type: 'call', summary: 'Left voicemail' },
        { type: 'whatsapp', summary: 'Friendly reminder sent' },
      );
    }
    if (hasEmail) attempts.push({ type: 'email', summary: 'Overdue notice sent' });

    const earlierAttempts = int(0, 2);
    for (let i = 0; i < earlierAttempts; i += 1) {
      const attempt = pick(attempts);
      log(int(lastContactDaysAgo + 1, daysPastDue - 1), attempt.type, attempt.summary);
    }

    if (promise) {
      log(
        lastContactDaysAgo,
        'promise',
        `Promised to pay ${formatCurrency(promise.amount)} by ${formatDate(promise.dueDate)}`,
      );
    } else {
      if (hasPhone) log(lastContactDaysAgo, 'call', 'Spoke with customer');
      else log(lastContactDaysAgo, 'email', 'Overdue notice sent');
    }
  }
  if (paidDaysAgo !== null) {
    log(paidDaysAgo, 'payment', `Payment of ${formatCurrency(amount)} received`);
  }

  activities.sort((a, b) => b.at.localeCompare(a.at));

  return {
    id,
    customer: {
      name: `${firstName} ${lastName}`,
      phone: hasPhone ? `+1 (305) 555-01${String(index % 100).padStart(2, '0')}` : null,
      email: hasEmail ? `${firstName}.${lastName}@example.com`.toLowerCase() : null,
    },
    product: pick(PRODUCTS),
    balanceDue: paidDaysAgo === null ? amount : 0,
    recoveredAmount: paidDaysAgo === null ? 0 : amount,
    dueDate: toISODate(addDays(today, -daysPastDue)),
    lastContactAt: lastContactDaysAgo === null ? null : timestamp(lastContactDaysAgo),
    promise: paidDaysAgo === null ? promise : null,
    brokenPromises: rand() < 0.25 ? int(1, 2) : 0,
    paidAt: paidDaysAgo === null ? null : timestamp(paidDaysAgo),
    activities,
  };
}

export function createSeedAccounts(today: Date, count = 48): Account[] {
  const rand = createRandom(20260314);
  return Array.from({ length: count }, (_, index) => createAccount(index, today, rand));
}

/** Two past campaigns so the Campaigns page has history on first load. */
export function createSeedCampaigns(accounts: Account[], today: Date): Campaign[] {
  const rand = createRandom(7);
  const sentAt = (daysAgo: number) => {
    const date = addDays(startOfDay(today), -daysAgo);
    date.setHours(10, 15);
    return date.toISOString();
  };
  const recipientsFrom = (start: number, size: number) =>
    accounts.slice(start, start + size).map((account) => ({
      accountId: account.id,
      customerName: account.customer.name,
      status: simulateDeliveryStatus(rand()),
    }));

  return [
    {
      id: 'CMP-1002',
      name: 'Overdue notice · 31–60 days',
      channel: 'whatsapp',
      templateId: 'overdue_notice',
      sentAt: sentAt(6),
      recipients: recipientsFrom(4, 9),
      excludedCount: 2,
    },
    {
      id: 'CMP-1001',
      name: 'Friendly reminder · newly overdue',
      channel: 'email',
      templateId: 'friendly_reminder',
      sentAt: sentAt(13),
      recipients: recipientsFrom(20, 12),
      excludedCount: 1,
    },
  ];
}
