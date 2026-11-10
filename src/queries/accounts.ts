import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  createPromise,
  fetchAccount,
  fetchAccounts,
  logCall,
  recordPayment,
  type CreatePromiseInput,
  type LogCallInput,
} from '../api/accounts';
import { withInsights } from '../domain/accountRow';
import type { Account, AccountSummary } from '../domain/types';
import { useToday } from '../hooks/useToday';
import { queryKeys } from './keys';

/**
 * The portfolio, enriched with derived insights (status, aging, priority).
 *
 * The enrichment happens in `select`, so the cache keeps the raw API data and
 * React Query re-runs the derivation only when that data actually changes,
 * not on every render of every subscriber.
 */
export function useAccounts() {
  const today = useToday();
  const select = useCallback(
    (accounts: AccountSummary[]) => accounts.map((account) => withInsights(account, today)),
    [today],
  );
  return useQuery({ queryKey: queryKeys.accounts.list(), queryFn: fetchAccounts, select });
}

export function useAccount(id: string) {
  const today = useToday();
  const select = useCallback((account: Account) => withInsights(account, today), [today]);
  return useQuery({
    queryKey: queryKeys.accounts.detail(id),
    queryFn: () => fetchAccount(id),
    select,
  });
}

/**
 * Shared wiring for mutations that return the updated account: write the
 * response straight into the detail cache (no extra round trip) and mark the
 * list as stale so the queue re-ranks next time it is shown.
 */
function useAccountMutation<TInput>(
  accountId: string,
  mutationFn: (accountId: string, input: TInput) => Promise<Account>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => mutationFn(accountId, input),
    onSuccess: (account) => {
      queryClient.setQueryData(queryKeys.accounts.detail(accountId), account);
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.list() });
    },
  });
}

export function useLogCall(accountId: string) {
  return useAccountMutation<LogCallInput>(accountId, logCall);
}

export function useCreatePromise(accountId: string) {
  return useAccountMutation<CreatePromiseInput>(accountId, createPromise);
}

export function useRecordPayment(accountId: string) {
  return useAccountMutation<void>(accountId, (id) => recordPayment(id));
}
