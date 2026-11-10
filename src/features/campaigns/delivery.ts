import type { CampaignRecipient, DeliveryStatus } from '../../domain/types';

/** Delivery stages in the order a message moves through them. */
const STAGES: DeliveryStatus[] = ['sent', 'delivered', 'read', 'replied'];

export const DELIVERY_LABELS: Record<DeliveryStatus, string> = {
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  replied: 'Replied',
};

export type DeliveryFunnel = Record<DeliveryStatus, number>;

/**
 * Counts how many recipients reached each stage. The funnel is cumulative:
 * a message that was read was necessarily delivered, so it counts in both.
 */
export function summarizeDelivery(recipients: CampaignRecipient[]): DeliveryFunnel {
  const reached = (stage: DeliveryStatus) =>
    recipients.filter((recipient) => STAGES.indexOf(recipient.status) >= STAGES.indexOf(stage))
      .length;

  return {
    sent: reached('sent'),
    delivered: reached('delivered'),
    read: reached('read'),
    replied: reached('replied'),
  };
}

export function toPercent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

export interface CampaignTotals {
  campaigns: number;
  messages: number;
  funnel: DeliveryFunnel;
}

/** Totals across every campaign, for the headline numbers. */
export function summarizeCampaigns(campaigns: Array<{ recipients: CampaignRecipient[] }>): CampaignTotals {
  const allRecipients = campaigns.flatMap((campaign) => campaign.recipients);
  return {
    campaigns: campaigns.length,
    messages: allRecipients.length,
    funnel: summarizeDelivery(allRecipients),
  };
}
