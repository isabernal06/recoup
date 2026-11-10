import {
  Ban,
  Bell,
  CalendarClock,
  CalendarX,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock,
  Handshake,
  Mail,
  MessageCircle,
  Send,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { buttonClassName } from '../../components/buttonClassName';
import { Dialog, DialogFooter } from '../../components/Dialog';
import { Field } from '../../components/Field';
import { InlineAlert } from '../../components/StateViews';
import type { AccountRow } from '../../domain/accountRow';
import { toISODate } from '../../domain/dates';
import {
  countExclusions,
  describeExclusion,
  splitByEligibility,
  type ExclusionReason,
} from '../../domain/eligibility';
import { formatDate, pluralize } from '../../domain/format';
import { CHANNEL_LABELS, getTemplate, MESSAGE_TEMPLATES, renderTemplate } from '../../domain/templates';
import type { Campaign, Channel } from '../../domain/types';
import { useToday } from '../../hooks/useToday';
import { cx } from '../../lib/cx';
import { getErrorMessage } from '../../lib/errors';
import { useSendCampaign } from '../../queries/campaigns';
import styles from './CampaignComposer.module.css';
import { MessagePreview } from './MessagePreview';

const CHANNELS: Array<{ id: Channel; icon: LucideIcon }> = [
  { id: 'whatsapp', icon: MessageCircle },
  { id: 'email', icon: Mail },
];

const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  friendly_reminder: Bell,
  overdue_notice: CircleAlert,
  promise_reminder: CalendarClock,
  final_notice: TriangleAlert,
};

const EXCLUSION_ICONS: Record<ExclusionReason, LucideIcon> = {
  paid: CircleCheck,
  missing_contact: Ban,
  active_promise: Handshake,
  no_active_promise: CalendarX,
  recently_contacted: Clock,
};

interface CampaignComposerProps {
  open: boolean;
  onClose: () => void;
  /** The accounts the collector wants to contact, before contact rules apply. */
  audience: AccountRow[];
  /** Describes where the audience came from, e.g. "5 selected accounts". */
  audienceLabel: string;
  /** Pre-selects a template, e.g. the promise reminder from the promises panel. */
  initialTemplateId?: string;
  onSent: () => void;
}

export function CampaignComposer({ open, onClose, ...formProps }: CampaignComposerProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Create campaign"
      description="Send a reminder by WhatsApp or email. Contact rules are checked before anything is sent."
    >
      <ComposerForm onClose={onClose} {...formProps} />
    </Dialog>
  );
}

type ComposerFormProps = Omit<CampaignComposerProps, 'open'>;

function ComposerForm({ audience, audienceLabel, initialTemplateId, onClose, onSent }: ComposerFormProps) {
  const today = useToday();
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [template, setTemplate] = useState(
    () => (initialTemplateId && getTemplate(initialTemplateId)) || MESSAGE_TEMPLATES[0],
  );
  const [previewIndex, setPreviewIndex] = useState(0);
  const sendCampaign = useSendCampaign();

  // The same pure function the server runs when the campaign is sent, so the
  // preview the collector sees here cannot disagree with what actually happens.
  const { eligible, excluded } = useMemo(
    () => splitByEligibility(audience, channel, template, today),
    [audience, channel, template, today],
  );
  const exclusionCounts = countExclusions(excluded);
  const reachableBy = (option: Channel) =>
    audience.filter((account) => (option === 'email' ? account.customer.email : account.customer.phone)).length;

  // The index survives channel and template changes, clamped to the new audience.
  const previewPosition = Math.min(previewIndex, Math.max(eligible.length - 1, 0));
  const previewAccount = eligible[previewPosition];
  const preview = previewAccount ? renderTemplate(template, previewAccount, today) : null;
  const defaultName = `${template.name} · ${formatDate(toISODate(today))}`;
  const eligibleShare = audience.length === 0 ? 0 : (eligible.length / audience.length) * 100;

  if (sendCampaign.isSuccess) {
    return <SentConfirmation campaign={sendCampaign.data} onClose={onClose} />;
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (eligible.length === 0) return;
    sendCampaign.mutate(
      {
        name: name.trim() || defaultName,
        channel,
        templateId: template.id,
        // Send the whole selection: the server applies the contact rules itself.
        accountIds: audience.map((account) => account.id),
      },
      { onSuccess: onSent },
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.columns}>
        <div className={styles.settings}>
          <Field label="Campaign name" hint="Optional. Helps you find this campaign later.">
            {(control) => (
              <input
                {...control}
                type="text"
                value={name}
                placeholder={defaultName}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
              />
            )}
          </Field>

          <fieldset className={styles.group}>
            <legend className={styles.legend}>Channel</legend>
            <div className={styles.channels}>
              {CHANNELS.map(({ id, icon: Icon }) => (
                <label key={id} className={cx(styles.option, styles.channel, styles[id])}>
                  <input
                    type="radio"
                    name="channel"
                    value={id}
                    checked={channel === id}
                    onChange={() => setChannel(id)}
                  />
                  <span className={styles.optionIcon} aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <span className={styles.optionText}>
                    <span className={styles.optionTitle}>{CHANNEL_LABELS[id]}</span>{' '}
                    <span className={styles.optionDescription}>
                      {reachableBy(id)} of {audience.length} reachable
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.legend}>Message template</legend>
            <div className={styles.templates}>
              {MESSAGE_TEMPLATES.map((option) => {
                const Icon = TEMPLATE_ICONS[option.id] ?? Bell;
                return (
                  <label key={option.id} className={styles.option}>
                    <input
                      type="radio"
                      name="template"
                      value={option.id}
                      checked={template.id === option.id}
                      onChange={() => setTemplate(option)}
                    />
                    <span className={styles.optionIcon} aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    <span className={styles.optionText}>
                      <span className={styles.optionTitle}>{option.name}</span>{' '}
                      <span className={styles.optionDescription}>{option.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <section className={styles.audience} aria-labelledby="audience-title">
            <h3 id="audience-title" className={styles.legend}>
              Audience
            </h3>
            {/* A live region: the audience changes as channel and template change. */}
            <p className={styles.audienceLine} aria-live="polite">
              <strong>
                {eligible.length} of {pluralize(audience.length, 'account')}
              </strong>{' '}
              will receive this message <span className={styles.muted}>(from {audienceLabel})</span>.
            </p>
            <div className={styles.audienceBar} aria-hidden="true">
              <span style={{ width: `${eligibleShare}%` }} />
            </div>
            {exclusionCounts.length > 0 && (
              <>
                <p className={styles.skippedTitle}>Skipped by contact rules</p>
                <ul className={styles.exclusions}>
                  {exclusionCounts.map(({ reason, count }) => {
                    const Icon = EXCLUSION_ICONS[reason];
                    return (
                      <li key={reason}>
                        <Icon size={16} aria-hidden="true" />
                        <span className={styles.exclusionText}>{describeExclusion(reason, channel)}</span>{' '}
                        <strong className="tabular">{count}</strong>
                      </li>
                    );
                  })}
                </ul>
                <details className={styles.skippedDetails}>
                  <summary>See who is skipped</summary>
                  <ul>
                    {excluded.map(({ account, reason }) => (
                      <li key={account.id}>
                        <span>{account.customer.name}</span>{' '}
                        <span className={styles.muted}>{describeExclusion(reason, channel)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </>
            )}
          </section>
        </div>

        <section className={styles.previewColumn} aria-labelledby="preview-title">
          <h3 id="preview-title" className={styles.legend}>
            Preview
          </h3>
          {preview && previewAccount ? (
            <>
              <MessagePreview
                channel={channel}
                message={preview}
                recipient={previewAccount.customer}
                sentAt={today}
              />
              <div className={styles.switcher}>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Previous recipient"
                  disabled={previewPosition === 0}
                  onClick={() => setPreviewIndex(previewPosition - 1)}
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <p className={styles.switcherLabel} aria-live="polite">
                  <Avatar name={previewAccount.customer.name} size="sm" />
                  <span>
                    <span className={styles.switcherName}>{previewAccount.customer.name}</span>{' '}
                    <span className={styles.muted}>
                      Recipient {previewPosition + 1} of {eligible.length}
                    </span>
                  </span>
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Next recipient"
                  disabled={previewPosition >= eligible.length - 1}
                  onClick={() => setPreviewIndex(previewPosition + 1)}
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </>
          ) : (
            <div className={styles.noPreview}>
              <InlineAlert tone="warning" icon={TriangleAlert}>
                No account in this audience can receive this message. Try another template or channel.
              </InlineAlert>
            </div>
          )}
        </section>
      </div>

      {sendCampaign.isError && (
        <div className={styles.error}>
          <InlineAlert tone="danger" icon={CircleAlert}>
            The campaign was not sent. {getErrorMessage(sendCampaign.error)}
          </InlineAlert>
        </div>
      )}

      <DialogFooter>
        <p className={styles.footerNote}>
          {CHANNEL_LABELS[channel]} · {template.name}
        </p>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={sendCampaign.isPending}
          disabled={eligible.length === 0}
        >
          {!sendCampaign.isPending && <Send aria-hidden="true" />}
          {sendCampaign.isPending ? 'Sending…' : `Send to ${pluralize(eligible.length, 'account')}`}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface SentConfirmationProps {
  campaign: Campaign;
  onClose: () => void;
}

function SentConfirmation({ campaign, onClose }: SentConfirmationProps) {
  // The form (and the focused submit button) was just replaced by this view.
  // Move focus here so keyboard and screen reader users are told what happened.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  const stats = [
    { label: 'Messages sent', value: campaign.recipients.length },
    { label: 'Skipped by rules', value: campaign.excludedCount },
    { label: 'Channel', value: CHANNEL_LABELS[campaign.channel] },
  ];

  return (
    <div className={styles.confirmation}>
      <span className={styles.successIcon} aria-hidden="true">
        <Check size={32} strokeWidth={2.5} />
      </span>
      <h3 ref={headingRef} tabIndex={-1} className={styles.confirmationTitle}>
        Campaign sent
      </h3>
      <p className={styles.confirmationText}>
        “{campaign.name}” was sent to {pluralize(campaign.recipients.length, 'account')} by{' '}
        {CHANNEL_LABELS[campaign.channel]}.
        {campaign.excludedCount > 0 &&
          ` ${pluralize(campaign.excludedCount, 'account was', 'accounts were')} skipped by contact rules.`}
      </p>
      <dl className={styles.stats}>
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt>{stat.label}</dt>
            <dd className="tabular">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.muted}>
        Each message was added to the customer’s activity history, and those accounts will not be
        contacted again during the cooldown period.
      </p>
      <DialogFooter>
        <Link to="/campaigns" className={buttonClassName('secondary')} onClick={onClose}>
          View campaign results
        </Link>
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </DialogFooter>
    </div>
  );
}
