import { Badge } from '../../components/Badge';
import { STATUS_LABELS, type CollectionStatus } from '../../domain/status';
import { STATUS_TONES } from './tones';

export function StatusBadge({ status }: { status: CollectionStatus }) {
  return (
    <Badge tone={STATUS_TONES[status]} dot>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
