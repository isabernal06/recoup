import { getDaysPastDue } from './aging';
import { formatCurrency, formatDate } from './format';
import type { AccountSummary, Channel } from './types';

/** Who a template may be sent to. Enforced by the contact rules. */
export type TemplateAudience = 'overdue' | 'active_promise';

export interface MessageTemplate {
  id: string;
  name: string;
  description: string;
  audience: TemplateAudience;
  /** Used by email only. */
  subject: string;
  body: string;
}

export const CHANNEL_LABELS: Record<Channel, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
};

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'friendly_reminder',
    name: 'Friendly reminder',
    description: 'A soft first nudge for recently overdue accounts.',
    audience: 'overdue',
    subject: 'A quick reminder about your account {{accountId}}',
    body: 'Hi {{firstName}}, this is a friendly reminder that your account {{accountId}} has an outstanding balance of {{amount}}. You can pay online at any time, or reply to this message if you need help.',
  },
  {
    id: 'overdue_notice',
    name: 'Overdue notice',
    description: 'States the amount and how long it has been overdue.',
    audience: 'overdue',
    subject: 'Your payment of {{amount}} is past due',
    body: 'Hi {{firstName}}, your payment of {{amount}} is now {{daysPastDue}} days past due. Please make your payment today, or reply to set up a payment arrangement that works for you.',
  },
  {
    id: 'promise_reminder',
    name: 'Promise reminder',
    description: 'Reminds customers of a payment they committed to.',
    audience: 'active_promise',
    subject: 'Reminder: your payment of {{promiseAmount}} is due {{promiseDate}}',
    body: 'Hi {{firstName}}, a quick reminder of your commitment to pay {{promiseAmount}} by {{promiseDate}}. Thank you for keeping your account on track.',
  },
  {
    id: 'final_notice',
    name: 'Final notice',
    description: 'A firm last message before the account is escalated.',
    audience: 'overdue',
    subject: 'Final notice for account {{accountId}}',
    body: '{{firstName}}, your account {{accountId}} is {{daysPastDue}} days past due with a balance of {{amount}}. To avoid escalation, please contact us within 48 hours.',
  },
];

export function getTemplate(templateId: string): MessageTemplate | undefined {
  return MESSAGE_TEMPLATES.find((template) => template.id === templateId);
}

function buildVariables(account: AccountSummary, today: Date): Record<string, string> {
  const variables: Record<string, string> = {
    firstName: account.customer.name.split(' ')[0],
    accountId: account.id,
    amount: formatCurrency(account.balanceDue),
    daysPastDue: String(getDaysPastDue(account, today)),
  };
  if (account.promise) {
    variables.promiseAmount = formatCurrency(account.promise.amount);
    variables.promiseDate = formatDate(account.promise.dueDate);
  }
  return variables;
}

export interface RenderedMessage {
  subject: string;
  body: string;
}

/**
 * Fills a template's {{placeholders}} with one account's data.
 * Unknown placeholders are left visible on purpose: a message that still shows
 * "{{promiseDate}}" in the preview is easier to catch than a silent blank.
 */
export function renderTemplate(
  template: MessageTemplate,
  account: AccountSummary,
  today: Date,
): RenderedMessage {
  const variables = buildVariables(account, today);
  const fill = (text: string) =>
    text.replace(/\{\{(\w+)\}\}/g, (placeholder, name: string) => variables[name] ?? placeholder);

  return { subject: fill(template.subject), body: fill(template.body) };
}
