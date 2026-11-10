import type { BadgeTone } from '../../components/Badge';
import type { PriorityLevel } from '../../domain/priority';
import type { CollectionStatus } from '../../domain/status';

/** The colour each collection status is shown in, everywhere in the app. */
export const STATUS_TONES: Record<CollectionStatus, BadgeTone> = {
  not_contacted: 'neutral',
  in_follow_up: 'info',
  promise_active: 'warning',
  promise_broken: 'danger',
  paid: 'success',
};

export const PRIORITY_TONES: Record<PriorityLevel, BadgeTone> = {
  high: 'danger',
  medium: 'warning',
  low: 'info',
  none: 'neutral',
};

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'None',
};
