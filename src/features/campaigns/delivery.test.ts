import { describe, expect, it } from 'vitest';
import type { CampaignRecipient, DeliveryStatus } from '../../domain/types';
import { summarizeCampaigns, summarizeDelivery, toPercent } from './delivery';

const recipients = (...statuses: DeliveryStatus[]): CampaignRecipient[] =>
  statuses.map((status, index) => ({
    accountId: `ACC-${index}`,
    customerName: `Customer ${index}`,
    status,
  }));

describe('summarizeDelivery', () => {
  it('counts each recipient in every stage they have passed through', () => {
    const funnel = summarizeDelivery(recipients('sent', 'delivered', 'read', 'read', 'replied'));

    expect(funnel).toEqual({ sent: 5, delivered: 4, read: 3, replied: 1 });
  });
});

describe('toPercent', () => {
  it('rounds to a whole percentage and survives an empty campaign', () => {
    expect(toPercent(1, 3)).toBe(33);
    expect(toPercent(0, 0)).toBe(0);
  });
});

describe('summarizeCampaigns', () => {
  it('adds up messages and delivery stages across campaigns', () => {
    const totals = summarizeCampaigns([
      { recipients: recipients('read', 'replied') },
      { recipients: recipients('delivered') },
    ]);

    expect(totals).toEqual({
      campaigns: 2,
      messages: 3,
      funnel: { sent: 3, delivered: 3, read: 2, replied: 1 },
    });
  });
});
