import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCampaigns, sendCampaign } from '../api/campaigns';
import { queryKeys } from './keys';

export function useCampaigns() {
  return useQuery({ queryKey: queryKeys.campaigns.all, queryFn: fetchCampaigns });
}

export function useSendCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendCampaign,
    onSuccess: () => {
      // A campaign touches many accounts at once (last contact, history), so
      // every cached account is stale, along with the campaign list itself.
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
    },
  });
}
