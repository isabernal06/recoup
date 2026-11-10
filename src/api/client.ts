import { simulation } from './simulation';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs a "server-side" handler the way a real HTTP call would behave:
 * it takes time, it can fail, and the caller receives a copy of the data.
 *
 * The copy matters. Without it the UI would hold references into the in-memory
 * database and could mutate "server" state by accident, hiding bugs that a real
 * network boundary would expose.
 */
export async function simulateRequest<T>(handler: () => T): Promise<T> {
  const { min, max } = simulation.latency;
  await wait(min + Math.random() * (max - min));

  if (simulation.getFailRequests()) {
    throw new ApiError(503, 'The collections service is temporarily unavailable.');
  }
  return structuredClone(handler());
}
