import { JOB_STATUS_LABELS, type JobStatus } from '../../types/domain';
import type { BadgeTone } from '../ui/Badge';
import { Badge } from '../ui/Badge';

const TONES: Record<JobStatus, BadgeTone> = {
  OPEN: 'blue',
  ACCEPTED: 'violet',
  IN_PROGRESS: 'amber',
  COMPLETED: 'green',
  CUSTOMER_CONFIRMED: 'green',
  CANCELLED: 'neutral',
};

export function jobStatusTone(status: JobStatus): BadgeTone {
  return TONES[status];
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge tone={jobStatusTone(status)}>
      <span className={`cg-dot cg-dot--${status.toLowerCase()}`} aria-hidden="true" />
      {JOB_STATUS_LABELS[status]}
    </Badge>
  );
}
