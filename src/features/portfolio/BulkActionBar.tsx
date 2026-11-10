import { Send, X } from 'lucide-react';
import { pluralize } from '../../domain/format';
import styles from './BulkActionBar.module.css';

interface BulkActionBarProps {
  count: number;
  onCreateCampaign: () => void;
  onClear: () => void;
}

/**
 * Floats at the bottom of the screen while accounts are selected, so the
 * action is always in reach however far down the queue the collector has
 * scrolled. The count is a live region, announced as rows are ticked.
 */
export function BulkActionBar({ count, onCreateCampaign, onClear }: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div role="region" aria-label="Selected accounts" className={styles.bar}>
      <p className={styles.count} aria-live="polite">
        <span className={styles.number}>{count}</span>{' '}
        <span>
          <span className={styles.phoneHidden}>{count === 1 ? 'account' : 'accounts'}</span>{' '}
          selected
        </span>
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.clear} onClick={onClear}>
          <X size={16} aria-hidden="true" />
          <span className={styles.phoneHidden}>Clear</span>
        </button>
        <button type="button" className={styles.primary} onClick={onCreateCampaign}>
          <Send size={16} aria-hidden="true" />
          Message{' '}
          <span className={styles.phoneHidden}>{pluralize(count, 'account')}</span>
        </button>
      </div>
    </div>
  );
}
