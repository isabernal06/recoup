/**
 * Core domain model. These types describe what the (simulated) API returns
 * and are shared by the API layer, the pure domain logic and the UI.
 */

export type Channel = 'whatsapp' | 'email';

export interface Customer {
  name: string;
  /** Null when we have no phone number on file (cannot receive WhatsApp). */
  phone: string | null;
  /** Null when we have no email address on file. */
  email: string | null;
}

export interface PaymentPromise {
  amount: number;
  /** ISO date (yyyy-mm-dd) the customer committed to pay by. */
  dueDate: string;
  /** ISO datetime the promise was registered. */
  createdAt: string;
}

export type ActivityType = 'call' | 'whatsapp' | 'email' | 'promise' | 'payment';

export interface Activity {
  id: string;
  /** ISO datetime. */
  at: string;
  type: ActivityType;
  summary: string;
  note?: string;
  campaignId?: string;
}

/** The shape returned by the list endpoint: everything except the history. */
export interface AccountSummary {
  id: string;
  customer: Customer;
  product: string;
  /** Amount currently overdue. Zero once the account is paid. */
  balanceDue: number;
  /** Amount collected through this workspace. */
  recoveredAmount: number;
  /** ISO date (yyyy-mm-dd) the oldest unpaid installment was due. */
  dueDate: string;
  /** ISO datetime of the last contact attempt, on any channel. */
  lastContactAt: string | null;
  /** The current promise to pay, if any. It may already be past its date. */
  promise: PaymentPromise | null;
  /** Promises broken before the current one. */
  brokenPromises: number;
  paidAt: string | null;
}

/** The shape returned by the detail endpoint. */
export interface Account extends AccountSummary {
  activities: Activity[];
}

export type CallOutcome = 'spoke' | 'no_answer' | 'voicemail' | 'wrong_number';

export type DeliveryStatus = 'sent' | 'delivered' | 'read' | 'replied';

export interface CampaignRecipient {
  accountId: string;
  customerName: string;
  status: DeliveryStatus;
}

export interface Campaign {
  id: string;
  name: string;
  channel: Channel;
  templateId: string;
  /** ISO datetime. */
  sentAt: string;
  recipients: CampaignRecipient[];
  /** Selected accounts that were skipped by the contact rules. */
  excludedCount: number;
}
