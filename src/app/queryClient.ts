import { QueryClient } from '@tanstack/react-query';

/**
 * A factory rather than a shared instance, so every test gets its own empty cache.
 *
 * `retry: false` is a choice for this exercise: the simulated API fails
 * deterministically, so retrying would only delay the error state. Against a
 * real backend I would keep React Query's default retries for queries (GETs
 * are safe to repeat) and leave mutations without retries.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}
