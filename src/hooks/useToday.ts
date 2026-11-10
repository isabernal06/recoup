import { useState } from 'react';

/**
 * The current date, captured once per component mount.
 *
 * Domain functions take `today` as an argument instead of calling `new Date()`
 * themselves, which keeps them pure and trivially testable. This hook is the
 * single place where the UI reads the clock, and it returns a stable reference
 * so it can be used safely in memoisation dependencies.
 */
export function useToday(): Date {
  const [today] = useState(() => new Date());
  return today;
}
