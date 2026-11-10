import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { DEFAULT_FILTERS, FILTER_PARAMS, parseFilters, type PortfolioFilters } from './filters';

/**
 * Filter state for the queue, stored in the URL instead of React state.
 *
 * That makes a filtered view shareable and bookmarkable, keeps it when the
 * collector opens an account and comes back, and makes the browser's back
 * button behave. The URL is the single source of truth: nothing is mirrored
 * into component state, so the two can never disagree.
 */
export function usePortfolioFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const setFilter = useCallback(
    <K extends keyof PortfolioFilters>(key: K, value: PortfolioFilters[K]) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          // Defaults are left out so the URL stays clean and canonical.
          if (value === DEFAULT_FILTERS[key]) next.delete(FILTER_PARAMS[key]);
          else next.set(FILTER_PARAMS[key], value);
          return next;
        },
        // Replace instead of push: typing "rojas" should not add five history entries.
        { replace: true },
      );
    },
    [setSearchParams],
  );

  /** Clears search and filters but keeps the chosen sort order. */
  const clearFilters = useCallback(() => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete(FILTER_PARAMS.query);
        next.delete(FILTER_PARAMS.bucket);
        next.delete(FILTER_PARAMS.status);
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const hasActiveFilters =
    filters.query !== '' || filters.bucket !== 'all' || filters.status !== 'all';

  return { filters, setFilter, clearFilters, hasActiveFilters };
}
