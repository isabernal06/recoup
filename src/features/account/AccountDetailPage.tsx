import { ArrowLeft, CalendarDays, CalendarX, Clock, Handshake, Mail, Phone, UserX, type LucideIcon } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router';
import { ApiError } from '../../api/client';
import { Avatar } from '../../components/Avatar';
import { buttonClassName } from '../../components/buttonClassName';
import { Card } from '../../components/Card';
import { EmptyState, ErrorState, LoadingState, Skeleton } from '../../components/StateViews';
import { formatCurrency, formatDate, formatRelativeDay, pluralize } from '../../domain/format';
import { useToday } from '../../hooks/useToday';
import { cx } from '../../lib/cx';
import { useAccount } from '../../queries/accounts';
import { PriorityBadge } from '../shared/PriorityBadge';
import { StatusBadge } from '../shared/StatusBadge';
import { AccountActions } from './AccountActions';
import styles from './AccountDetailPage.module.css';
import { ActivityTimeline } from './ActivityTimeline';
import { PriorityBreakdown } from './PriorityBreakdown';

interface Fact {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: 'danger';
}

/** Everything about one account, and the actions a collector can take on it. */
export function AccountDetailPage() {
  const { accountId = '' } = useParams();
  const location = useLocation();
  const today = useToday();
  const accountQuery = useAccount(accountId);

  // Return to the queue exactly as the collector left it (filters, search, sort).
  const queueSearch: string = location.state?.queueSearch ?? '';
  const backLink = (
    <Link to={{ pathname: '/', search: queueSearch }} className={styles.back}>
      <ArrowLeft size={16} aria-hidden="true" />
      Back to queue
    </Link>
  );

  if (accountQuery.isPending) {
    return (
      <>
        {backLink}
        <LoadingState label="Loading account">
          <Skeleton height="9.5rem" radius="16px" />
          <div className={styles.skeletonGrid}>
            <Skeleton height="22rem" radius="16px" />
            <Skeleton height="22rem" radius="16px" />
          </div>
        </LoadingState>
      </>
    );
  }

  const account = accountQuery.data;
  if (!account) {
    const isNotFound = accountQuery.error instanceof ApiError && accountQuery.error.status === 404;
    return (
      <>
        {backLink}
        {isNotFound ? (
          <EmptyState
            icon={UserX}
            title="Account not found"
            description={`There is no account with the ID “${accountId}”. It may have been reassigned or the link may be wrong.`}
            action={
              <Link to="/" className={buttonClassName('primary')}>
                Go to the queue
              </Link>
            }
          />
        ) : (
          <ErrorState
            title="We couldn't load this account"
            error={accountQuery.error}
            onRetry={() => void accountQuery.refetch()}
          />
        )}
      </>
    );
  }

  const { customer, promise, priority } = account;
  const isPaid = account.status === 'paid';
  const facts: Fact[] = [
    { label: 'Original due date', value: formatDate(account.dueDate), icon: CalendarDays },
    {
      label: 'Last contact',
      value: account.lastContactAt ? formatRelativeDay(account.lastContactAt, today) : 'Never',
      icon: Clock,
    },
    {
      label: 'Promise to pay',
      value: promise
        ? `${formatCurrency(promise.amount)} by ${formatDate(promise.dueDate)}${account.status === 'promise_broken' ? ' (missed)' : ''}`
        : 'None',
      icon: Handshake,
      tone: account.status === 'promise_broken' ? 'danger' : undefined,
    },
    {
      label: 'Earlier broken promises',
      value: String(account.brokenPromises),
      icon: CalendarX,
      tone: account.brokenPromises > 0 ? 'danger' : undefined,
    },
  ];

  return (
    <article className={styles.page}>
      <title>{`${customer.name} · Recoup`}</title>
      {backLink}

      <header className={styles.hero}>
        <div className={styles.identity}>
          <Avatar name={customer.name} size="lg" />
          <div className={styles.identityText}>
            <div className={styles.nameRow}>
              <h1 className={styles.name}>{customer.name}</h1>
              <div className={styles.badges}>
                <StatusBadge status={account.status} />
                {!isPaid && <PriorityBadge priority={priority} />}
              </div>
            </div>
            <p className={styles.meta}>
              {account.id} · {account.product}
            </p>
            <ul className={styles.contacts} aria-label="Contact details">
              <li className={cx(!customer.phone && styles.missing)}>
                <Phone size={15} aria-hidden="true" />
                <span className="visually-hidden">Phone and WhatsApp: </span>
                {customer.phone ?? 'No phone on file'}
              </li>
              <li className={cx(!customer.email && styles.missing)}>
                <Mail size={15} aria-hidden="true" />
                <span className="visually-hidden">Email: </span>
                {customer.email ?? 'No email on file'}
              </li>
            </ul>
          </div>
        </div>

        <div className={cx(styles.balanceBlock, isPaid && styles.settled)}>
          <p className={styles.balanceLabel}>Balance due</p>
          <p className={cx(styles.balance, 'tabular')}>{formatCurrency(account.balanceDue)}</p>
          <p className={styles.balanceMeta}>
            {isPaid && account.paidAt
              ? `Settled on ${formatDate(account.paidAt)}`
              : `${pluralize(account.daysPastDue, 'day')} past due`}
          </p>
        </div>
      </header>

      {/* Source order is the reading order on small screens: facts, why, act, history. */}
      <div className={styles.layout}>
        <Card title="Account details">
          <dl className={styles.facts}>
            {facts.map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className={styles.fact}>
                <dt>
                  <Icon size={15} aria-hidden="true" />
                  {label}
                </dt>
                <dd className={cx(tone === 'danger' && styles.factDanger)}>{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {!isPaid && (
          <Card
            title="Why this priority"
            description="Each factor adds points up to its limit. The total ranks the account in your queue."
          >
            <PriorityBreakdown priority={priority} />
          </Card>
        )}

        <Card as="aside" title="Take action" className={styles.actions}>
          <AccountActions account={account} today={today} />
        </Card>

        <Card title="Activity history" description={pluralize(account.activities.length, 'event')}>
          <ActivityTimeline activities={account.activities} />
        </Card>
      </div>
    </article>
  );
}
