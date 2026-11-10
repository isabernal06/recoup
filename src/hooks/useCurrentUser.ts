export interface CurrentUser {
  name: string;
  role: string;
}

const DEMO_USER: CurrentUser = { name: 'Jordan Lee', role: 'Collections agent' };

/**
 * The signed-in collector. This exercise has no authentication, so it is a
 * fixed demo user; a real app would read it from the session. Components ask
 * through this hook so that swap would not touch them.
 */
export function useCurrentUser(): CurrentUser {
  return DEMO_USER;
}
