import { Check } from 'lucide-react';
import type { JobStatus } from '../../types/domain';
import { cx } from '../../utils/cx';

const STEPS: Array<{ status: JobStatus; label: string }> = [
  { status: 'OPEN', label: 'Open' },
  { status: 'ACCEPTED', label: 'Accepted' },
  { status: 'IN_PROGRESS', label: 'In progress' },
  { status: 'COMPLETED', label: 'Completed' },
  { status: 'CUSTOMER_CONFIRMED', label: 'Confirmed' },
];

export function StatusStepper({ status }: { status: JobStatus }) {
  if (status === 'CANCELLED') {
    return <p className="cg-job-cancelled">This request was cancelled.</p>;
  }
  const currentIndex = STEPS.findIndex((step) => step.status === status);
  return (
    <ol className="cg-status-steps" aria-label="Request progress">
      {STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li
            key={step.status}
            className={cx('cg-status-step', isDone && 'is-done', isCurrent && 'is-current')}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className="cg-status-step__marker" aria-hidden="true">
              {isDone ? <Check size={11} /> : <span />}
            </span>
            <span className="cg-status-step__label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
