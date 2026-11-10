/** Turns anything that was thrown into a message that is safe to show a user. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}
