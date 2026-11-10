import { splitByEligibility } from '../domain/eligibility';
import { getTemplate, renderTemplate } from '../domain/templates';
import type { Campaign, Channel } from '../domain/types';
import { recordActivity } from './accounts';
import { ApiError, simulateRequest } from './client';
import { db, nextId } from './db';
import { simulateDeliveryStatus } from './seed';

export interface SendCampaignInput {
  name: string;
  channel: Channel;
  templateId: string;
  /** The collector's selection. The server decides who is actually contacted. */
  accountIds: string[];
}

/** GET /campaigns — newest first. */
export function fetchCampaigns(): Promise<Campaign[]> {
  return simulateRequest(() => db.campaigns);
}

/**
 * POST /campaigns
 *
 * The contact rules run again here, on the "server", using the same pure
 * function the composer uses for its preview. The client preview is a
 * convenience; this is the enforcement point.
 */
export function sendCampaign(input: SendCampaignInput): Promise<Campaign> {
  return simulateRequest(() => {
    const template = getTemplate(input.templateId);
    if (!template) throw new ApiError(422, 'Unknown message template.');

    const now = new Date();
    const selected = db.accounts.filter((account) => input.accountIds.includes(account.id));
    const { eligible, excluded } = splitByEligibility(selected, input.channel, template, now);
    if (eligible.length === 0) {
      throw new ApiError(422, 'None of the selected accounts can be contacted right now.');
    }

    const campaign: Campaign = {
      id: nextId('CMP'),
      name: input.name.trim() || template.name,
      channel: input.channel,
      templateId: template.id,
      sentAt: now.toISOString(),
      // Delivery outcomes are randomised: there is no real provider behind this.
      recipients: eligible.map((account) => ({
        accountId: account.id,
        customerName: account.customer.name,
        status: simulateDeliveryStatus(Math.random()),
      })),
      excludedCount: excluded.length,
    };

    for (const account of eligible) {
      // Render before updating the account so the message reflects what was sent.
      const message = renderTemplate(template, account, now);
      recordActivity(
        account,
        {
          type: input.channel,
          summary: `${template.name} sent`,
          note: message.body,
          campaignId: campaign.id,
        },
        now,
      );
      account.lastContactAt = now.toISOString();
    }

    db.campaigns.unshift(campaign);
    return campaign;
  });
}
