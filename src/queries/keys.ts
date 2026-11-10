/**
 * Query key factory. Keys are hierarchical, so invalidating `accounts.all`
 * refreshes both the list and every cached detail in one call.
 */
export const queryKeys = {
  accounts: {
    all: ['accounts'] as const,
    list: () => ['accounts', 'list'] as const,
    detail: (id: string) => ['accounts', 'detail', id] as const,
  },
  campaigns: {
    all: ['campaigns'] as const,
  },
};
