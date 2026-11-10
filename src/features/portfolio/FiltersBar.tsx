import { Search, X } from 'lucide-react';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { AGING_BUCKETS } from '../../domain/aging';
import styles from './FiltersBar.module.css';
import { SORT_OPTIONS, type PortfolioFilters } from './filters';

interface FiltersBarProps {
  filters: PortfolioFilters;
  onChange: <K extends keyof PortfolioFilters>(key: K, value: PortfolioFilters[K]) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

/**
 * Search, age and sort controls for the queue. A controlled, stateless
 * component: it renders the filters it is given and reports changes upward.
 * Labels are visually hidden to keep the toolbar compact, but every control
 * still has one, and the placeholder and first option describe it on screen.
 */
export function FiltersBar({ filters, onChange, onClear, hasActiveFilters }: FiltersBarProps) {
  return (
    <form
      role="search"
      aria-label="Filter accounts"
      className={styles.bar}
      onSubmit={(event) => event.preventDefault()}
    >
      <div className={styles.search}>
        <Field label="Search" hideLabel>
          {(control) => (
            <div className={styles.searchWrap}>
              <Search className={styles.searchIcon} size={18} aria-hidden="true" />
              <input
                {...control}
                className={styles.searchInput}
                type="search"
                placeholder="Search by customer, account ID or product"
                value={filters.query}
                onChange={(event) => onChange('query', event.target.value)}
              />
            </div>
          )}
        </Field>
      </div>

      <Field label="Days past due" hideLabel>
        {(control) => (
          <select
            {...control}
            value={filters.bucket}
            onChange={(event) => onChange('bucket', event.target.value as PortfolioFilters['bucket'])}
          >
            <option value="all">Any age</option>
            {AGING_BUCKETS.map((bucket) => (
              <option key={bucket.id} value={bucket.id}>
                {bucket.label} past due
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Sort by" hideLabel>
        {(control) => (
          <select
            {...control}
            value={filters.sort}
            onChange={(event) => onChange('sort', event.target.value as PortfolioFilters['sort'])}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Sort: {option.label}
              </option>
            ))}
          </select>
        )}
      </Field>

      {hasActiveFilters && (
        <Button variant="ghost" onClick={onClear} className={styles.clear}>
          <X aria-hidden="true" />
          Clear filters
        </Button>
      )}
    </form>
  );
}
