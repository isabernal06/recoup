/**
 * Runtime knobs for the simulated backend.
 *
 * `failRequests` backs the "Simulate API failures" switch in the page footer so
 * error states can be demonstrated on demand. It lives in sessionStorage so it
 * survives a reload, which is the only way to see a cold-start failure.
 */

const STORAGE_KEY = 'recoup:simulate-failures';

type Listener = () => void;

const listeners = new Set<Listener>();

function readStoredFlag(): boolean {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false; // Storage can be blocked (private mode); the default is fine.
  }
}

let failRequests = readStoredFlag();

export const simulation = {
  /** Artificial network latency, in milliseconds. Tests set both to zero. */
  latency: { min: 350, max: 750 },

  getFailRequests: (): boolean => failRequests,

  setFailRequests(value: boolean): void {
    failRequests = value;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Ignore: the in-memory flag still works for this page load.
    }
    listeners.forEach((listener) => listener());
  },

  /** Compatible with React's useSyncExternalStore. */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
