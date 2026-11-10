import { ChevronDown, SearchX, Send } from 'lucide-react';
import { useCallback, useDeferredValue, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorState, InlineAlert, LoadingState, Skeleton } from '../../components/StateViews';
import type { AccountRow } from '../../domain/accountRow';
import { summarizeAging } from '../../domain/aging';
import { formatLongDate, getGreeting, pluralize } from '../../domain/format';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useToday } from '../../hooks/useToday';
import { useAccounts } from '../../queries/accounts';
import { CampaignComposer } from '../campaigns/CampaignComposer';
import { AccountTable } from './AccountTable';
import { AgingChart } from './AgingChart';
import { BulkActionBar } from './BulkActionBar';
import { filterAccounts, sortAccounts } from './filters';
import { FiltersBar } from './FiltersBar';
import styles from './PortfolioPage.module.css';
import { PromisesDuePanel } from './PromisesDuePanel';
import { StatusFilter } from './StatusFilter';
import { countByStatus, getPromisesDueSoon, summarizePortfolio } from './summary';
import { SummaryCards } from './SummaryCards';
import { usePortfolioFilters } from './usePortfolioFilters';

const NO_SELECTION: ReadonlySet<string> = new Set();

/** Rows rendered at first. The top of the queue is what a collector works on. */
export const PAGE_SIZE = 20;

/** What the campaign composer was opened with. Captured at open time, so it cannot shift mid-edit. */
interface ComposerRequest {
  audience: AccountRow[];
  audienceLabel: string;
  templateId?: string;
}

/**
 * The collector's home screen: a queue of overdue accounts ranked by urgency.
 *
 * State lives in three places, each chosen for what the state *is*:
 *  - server data (accounts)                 → React Query cache
 *  - filters, search and sort               → the URL
 *  - selection, rows shown, open composer   → local component state (transient UI)
 */
export function PortfolioPage() {
  const today = useToday();
  const location = useLocation();
  const accountsQuery = useAccounts();
  const { filters, setFilter, clearFilters, hasActiveFilters } = usePortfolioFilters();
  const [selectedIds, setSelectedIds] = useState(NO_SELECTION);
  const [composer, setComposer] = useState<ComposerRequest | null>(null);

  // The input updates immediately; filtering the list may lag a frame behind
  // if the device is busy, so typing never feels blocked.
  const deferredQuery = useDeferredValue(filters.query);

  const accounts = accountsQuery.data;
  const { bucket, status, sort } = filters;

  // Status counts reflect the other filters, so each chip says what clicking it would show.
  const matchingOtherFilters = useMemo(
    () => (accounts ? filterAccounts(accounts, { query: deferredQuery, bucket, status: 'all' }) : []),
    [accounts, deferredQuery, bucket],
  );
  const statusCounts = useMemo(() => countByStatus(matchingOtherFilters), [matchingOtherFilters]);
  const visibleAccounts = useMemo(() => {
    const filtered = status === 'all' ? matchingOtherFilters : matchingOtherFilters.filter((row) => row.status === status);
    return sortAccounts(filtered, sort);
  }, [matchingOtherFilters, status, sort]);

  // How many rows are rendered. Any change to the filters starts again from the top.
  const filterKey = `${deferredQuery}|${bucket}|${status}|${sort}`;
  const [shown, setShown] = useState({ key: filterKey, count: PAGE_SIZE });
  const shownCount = shown.key === filterKey ? shown.count : PAGE_SIZE;
  const renderedAccounts = visibleAccounts.slice(0, shownCount);
  const remaining = visibleAccounts.length - renderedAccounts.length;

  const summary = useMemo(() => summarizePortfolio(accounts ?? []), [accounts]);
  const aging = useMemo(() => summarizeAging(accounts ?? [], today), [accounts, today]);
  const promisesDue = useMemo(() => getPromisesDueSoon(accounts ?? [], today), [accounts, today]);

  const selectedAccounts = useMemo(
    () => (accounts ?? []).filter((account) => selectedIds.has(account.id)),
    [accounts, selectedIds],
  );

  // Stable identities, so memoised table rows are not re-rendered needlessly.
  const toggleRow = useCallback((accountId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return next;
    });
  }, []);

  const toggleAll = useCallback((accountIds: string[], shouldSelect: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of accountIds) {
        if (shouldSelect) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(NO_SELECTION), []);

  if (accountsQuery.isPending) {
    return (
      <>
        <QueueHeader />
        <PortfolioSkeleton />
      </>
    );
  }

  // A failed first load has nothing to show. A failed *refresh* still has the
  // previous data, which is more useful than an error page (handled below).
  if (!accounts) {
    return (
      <>
        <QueueHeader />
        <ErrorState
          title="We couldn't load your accounts"
          error={accountsQuery.error}
          onRetry={() => void accountsQuery.refetch()}
        />
      </>
    );
  }

  // With a selection, a campaign targets it. Without one, it targets the
  // current filtered view, which makes "message everyone 31–60 days late" two clicks.
  const hasSelection = selectedAccounts.length > 0;
  const openComposer = () =>
    setComposer({
      audience: hasSelection ? selectedAccounts : visibleAccounts,
      audienceLabel: hasSelection
        ? pluralize(selectedAccounts.length, 'selected account')
        : hasActiveFilters
          ? 'the current filtered view'
          : 'the whole queue',
    });
  const openReminders = () =>
    setComposer({
      audience: promisesDue,
      audienceLabel: 'promises due this week',
      templateId: 'promise_reminder',
    });

  return (
    <>
      <QueueHeader>
        <Button variant="primary" onClick={openComposer} disabled={visibleAccounts.length === 0}>
          <Send aria-hidden="true" />
          Create campaign
        </Button>
      </QueueHeader>

      <div className={styles.stack}>
        {accountsQuery.isRefetchError && (
          <InlineAlert tone="warning">
            We couldn’t refresh the queue, so you may be looking at older data.
            <Button size="sm" onClick={() => void accountsQuery.refetch()}>
              Retry
            </Button>
          </InlineAlert>
        )}

        <SummaryCards summary={summary} />

        <div className={styles.insights}>
          <AgingChart
            data={aging}
            selectedBucket={filters.bucket}
            onSelectBucket={(nextBucket) => setFilter('bucket', nextBucket)}
          />
          <PromisesDuePanel
            promises={promisesDue}
            today={today}
            onRemind={openReminders}
            onViewAll={() => setFilter('status', 'promise_active')}
          />
        </div>

        <section aria-labelledby="queue-title" className={styles.queue}>
          <div className={styles.queueTop}>
            <div className={styles.queueHeading}>
              <h2 id="queue-title" className={styles.queueTitle}>
                Accounts
              </h2>
              {/* Announces the result count to screen readers as filters change. */}
              <p role="status" className={styles.count}>
                {visibleAccounts.length} of {pluralize(accounts.length, 'account')}
              </p>
            </div>
            <StatusFilter
              value={filters.status}
              counts={statusCounts}
              onChange={(nextStatus) => setFilter('status', nextStatus)}
            />
            <FiltersBar
              filters={filters}
              onChange={setFilter}
              onClear={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </div>

          {visibleAccounts.length === 0 ? (
            <EmptyState
              variant="inline"
              icon={SearchX}
              title="No accounts match these filters"
              description="Try a different search term, or widen the status and days past due filters."
              action={<Button onClick={clearFilters}>Clear filters</Button>}
            />
          ) : (
            <>
              <AccountTable
                rows={renderedAccounts}
                selectedIds={selectedIds}
                onToggleRow={toggleRow}
                onToggleAll={toggleAll}
                today={today}
                queueSearch={location.search}
              />
              <div className={styles.queueFooter}>
                <p className={styles.count}>
                  Showing {renderedAccounts.length} of {visibleAccounts.length}
                </p>
                {remaining > 0 && (
                  <Button
                    size="sm"
                    onClick={() => setShown({ key: filterKey, count: shownCount + PAGE_SIZE })}
                  >
                    <ChevronDown aria-hidden="true" />
                    Show {Math.min(PAGE_SIZE, remaining)} more
                  </Button>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <BulkActionBar
        count={selectedAccounts.length}
        onCreateCampaign={openComposer}
        onClear={clearSelection}
      />

      <CampaignComposer
        open={composer !== null}
        onClose={() => setComposer(null)}
        audience={composer?.audience ?? []}
        audienceLabel={composer?.audienceLabel ?? ''}
        initialTemplateId={composer?.templateId}
        onSent={clearSelection}
      />
    </>
  );
}

function QueueHeader({ children }: { children?: ReactNode }) {
  const today = useToday();
  const user = useCurrentUser();
  const firstName = user.name.split(' ')[0];

  return (
    <>
      <title>Collections queue · Recoup</title>
      <PageHeader
        eyebrow={`${formatLongDate(today)} · ${getGreeting(today)}, ${firstName}`}
        title="Collections queue"
        description="Overdue accounts ranked by how urgently they need you, with the reasons behind every rank."
        actions={children}
      />
    </>
  );
}

function PortfolioSkeleton() {
  return (
    <LoadingState label="Loading accounts">
      <div className={styles.skeletonCards}>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} height="8.5rem" radius="16px" />
        ))}
      </div>
      <div className={styles.insights}>
        <Skeleton height="15rem" radius="16px" />
        <Skeleton height="15rem" radius="16px" />
      </div>
      <Skeleton height="28rem" radius="16px" />
    </LoadingState>
  );
}
