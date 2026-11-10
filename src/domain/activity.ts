import type { CallOutcome } from './types';

export const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  spoke: 'Spoke with customer',
  no_answer: 'No answer',
  voicemail: 'Left voicemail',
  wrong_number: 'Wrong number',
};
