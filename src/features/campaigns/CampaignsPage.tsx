import { Eye, Inbox, Mail, Megaphone, MessageCircle, Reply, Send, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Avatar } from '../../components/Avatar';
import { Badge, type BadgeTone } from '../../components/Badge';
import { Button } from '../../components/Button';
import { buttonClassName } from '../../components/buttonClassName';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorState, InlineAlert, LoadingState, Skeleton } from '../../components/StateViews';
import { formatDateTime, pluralize } from '../../domain/format';
import { CHANNEL_LABELS, getTemplate } from '../../domain/templates';
import type { Campaign, DeliveryStatus } from '../../domain/types';
import { cx } from '../../lib/cx';
import { useAccounts } from '../../queries/accounts';
import { useCampaigns } from '../../queries/campaigns';
import { CampaignComposer } from './CampaignComposer';
import styles from './CampaignsPage.module.css';
import { DELIVERY_LABELS, summarizeCampaigns, summarizeDelivery, toPercent } from './delivery';

const DELIVERY_TONES: Record<DeliveryStatus, BadgeTone> = {
  sent: 'neutral',
  delivered: 'info',
  read: 'warning',
  replied: 'success',
};

const FUNNEL_STAGES: DeliveryStatus[] = ['delivered', 'read', 'replied'];

/** Every campaign sent from the queue, with how its messages performed. */
export function CampaignsPage() {
  const [isComposerOpen, setComposerOpen] = useState(false);
  // The whole queue is the audience here; the contact rules decide who is actually
  // messaged. To target specific accounts, the collector selects them in the queue.
  const accountsQuery = useAccounts();

  return (
    <>
      <title>Campaigns · Recoup</title>
      <PageHeader
        title="Campaigns"
        description="Reminders sent by WhatsApp and email, and how customers responded to them."
        actions={
          <Button
            variant="primary"
            onClick={() => setComposerOpen(true)}
            isLoading={accountsQuery.isPending}
            disabled={!accountsQuery.data}
          >
            {!accountsQuery.isPending && <Send aria-hidden="true" />}
            New campaign
          </Button>
        }
      />
      <CampaignList />
      <CampaignComposer
        open={isComposerOpen}
        onClose={() => setComposerOpen(false)}
        audience={accountsQuery.data ?? []}
        audienceLabel="the whole queue"
        onSent={() => {
          // Nothing to reset here: the campaign list refreshes itself after a send.
        }}
      />
    </>
  );
}

function CampaignList() {
  const campaignsQuery = useCampaigns();
  const campaigns = campaignsQuery.data;

  if (campaignsQuery.isPending) {
    return (
      <LoadingState label="Loading campaigns">
        <Skeleton height="7rem" radius="16px" />
        <Skeleton height="13rem" radius="16px" />
        <Skeleton height="13rem" radius="16px" />
      </LoadingState>
    );
  }

  if (!campaigns) {
    return (
      <ErrorState
        title="We couldn't load your campaigns"
        error={campaignsQuery.error}
        onRetry={() => void campaignsQuery.refetch()}
      />
    );
  }

  if (campaigns.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No campaigns yet"
        description="Select accounts in the collections queue and choose “Create campaign” to send your first reminder."
        action={
          <Link to="/" className={buttonClassName('primary')}>
            Go to the queue
          </Link>
        }
      />
    );
  }

  const totals = summarizeCampaigns(campaigns);
  const headline = [
    { label: 'Campaigns sent', value: String(totals.campaigns), icon: Megaphone },
    { label: 'Messages delivered', value: String(totals.funnel.delivered), icon: Users },
    { label: 'Read rate', value: `${toPercent(totals.funnel.read, totals.messages)}%`, icon: Eye },
    { label: 'Reply rate', value: `${toPercent(totals.funnel.replied, totals.messages)}%`, icon: Reply },
  ];

  return (
    <div className={styles.stack}>
      {campaignsQuery.isRefetchError && (
        <InlineAlert tone="warning">
          We couldn’t refresh this list, so recent campaigns may be missing.
        </InlineAlert>
      )}

      <dl className={styles.totals}>
        {headline.map(({ label, value, icon: Icon }) => (
          <div key={label} className={styles.total}>
            <dt>
              <Icon size={16} aria-hidden="true" />
              {label}
            </dt>
            <dd className="tabular">{value}</dd>
          </div>
        ))}
      </dl>

      <ul className={styles.list}>
        {campaigns.map((campaign) => (
          <li key={campaign.id}>
            <CampaignCard campaign={campaign} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const funnel = summarizeDelivery(campaign.recipients);
  const total = campaign.recipients.length;
  const templateName = getTemplate(campaign.templateId)?.name ?? 'Custom message';
  const ChannelIcon = campaign.channel === 'whatsapp' ? MessageCircle : Mail;

  return (
    <article className={styles.card}>
      <header className={styles.cardHeader}>
        <span className={cx(styles.channelIcon, styles[campaign.channel])} aria-hidden="true">
          <ChannelIcon size={20} />
        </span>
        <div className={styles.cardHeading}>
          <h2 className={styles.cardTitle}>{campaign.name}</h2>
          <p className={styles.meta}>
            {CHANNEL_LABELS[campaign.channel]} · {templateName} · sent{' '}
            <time dateTime={campaign.sentAt}>{formatDateTime(campaign.sentAt)}</time>
          </p>
        </div>
        <div className={styles.reach}>
          <span className={cx(styles.reachValue, 'tabular')}>{total}</span>{' '}
          <span className={styles.meta}>
            recipients
            {campaign.excludedCount > 0 && <> · {campaign.excludedCount} skipped</>}
          </span>
        </div>
      </header>

      <dl className={styles.funnel}>
        {FUNNEL_STAGES.map((stage) => {
          const percent = toPercent(funnel[stage], total);
          return (
            <div key={stage} className={cx(styles.stage, styles[stage])}>
              <dt>{DELIVERY_LABELS[stage]}</dt>
              <dd>
                <span className="tabular">
                  <strong className={styles.percent}>{percent}%</strong>{' '}
                  <span className={styles.meta}>({funnel[stage]})</span>
                </span>
                <span className={styles.track} aria-hidden="true">
                  <span className={styles.fill} style={{ width: `${percent}%` }} />
                </span>
              </dd>
            </div>
          );
        })}
      </dl>

      <details className={styles.recipients}>
        <summary>View {pluralize(total, 'recipient')}</summary>
        <ul className={styles.recipientList}>
          {campaign.recipients.map((recipient) => (
            <li key={recipient.accountId}>
              <Avatar name={recipient.customerName} size="sm" />
              <Link to={`/accounts/${recipient.accountId}`} className={styles.recipientName}>
                {recipient.customerName}
              </Link>{' '}
              <Badge tone={DELIVERY_TONES[recipient.status]} dot>
                {DELIVERY_LABELS[recipient.status]}
              </Badge>
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}
