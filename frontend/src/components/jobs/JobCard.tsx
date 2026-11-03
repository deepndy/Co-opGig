import { Clock, MapPin, UserRound } from 'lucide-react';
import { useState } from 'react';
import { isDemoMode } from '../../api';
import { formatCategoryLabel } from '../../config/serviceCategories';
import type { Job } from '../../types/domain';
import { confidenceText, formatRelativeTime, jobReference, urgencyLabel } from '../../utils/format';
import { ServiceIcon } from '../services/ServiceIcon';
import { Button } from '../ui/Button';
import { JobStatusBadge } from './JobStatusBadge';
import { StatusStepper } from './StatusStepper';

export type JobAction = 'accept' | 'start' | 'complete' | 'confirm';

interface JobCardProps {
  job: Job;
  perspective: 'customer' | 'worker';
  onAction?: (job: Job, action: JobAction) => void;
  busy?: boolean;
  actionsNote?: string;
}

export function JobCard({ job, perspective, onAction, busy = false, actionsNote }: JobCardProps) {
  const [confirming, setConfirming] = useState(false);
  const demo = isDemoMode || job.isDemo;
  const confidence = confidenceText(job.categoryConfidence);

  function act(action: JobAction) {
    setConfirming(false);
    onAction?.(job, action);
  }

  return (
    <article className="cg-job-card">
      <div className="cg-job-card__top">
        <div className="cg-job-card__heading">
          <ServiceIcon slug={job.category} size={19} />
          <div>
            <p className="cg-job-card__reference">Ref {jobReference(job)}</p>
            <h3>{formatCategoryLabel(job.category)}</h3>
          </div>
        </div>
        <div className="cg-job-card__badges">
          {job.isDemo ? <span className="cg-badge cg-badge--demo">Demo</span> : null}
          <JobStatusBadge status={job.status} />
        </div>
      </div>

      <p className="cg-job-card__description">{job.description}</p>

      <ul className="cg-job-meta">
        <li>
          <MapPin size={14} aria-hidden="true" />
          <span>{job.locationText || 'Locality not provided'}</span>
        </li>
        <li>
          <Clock size={14} aria-hidden="true" />
          <span>{urgencyLabel(job.urgency)}</span>
        </li>
        <li>
          <Clock size={14} aria-hidden="true" />
          <span>Posted {formatRelativeTime(job.createdAt) || 'recently'}</span>
        </li>
        {job.assignedWorkerName ? (
          <li>
            <UserRound size={14} aria-hidden="true" />
            <span>{job.assignedWorkerName}</span>
          </li>
        ) : null}
      </ul>

      {confidence ? (
        <p className="cg-job-card__confidence">
          Assistant category suggestion used at {confidence} confidence. The request may be re-categorised by the
          cooperative.
        </p>
      ) : null}

      <StatusStepper status={job.status} />

      {actionsNote ? <p className="cg-job-card__note">{actionsNote}</p> : null}

      <div className="cg-job-card__actions">
        {perspective === 'customer' ? (
          <>
            {job.status === 'OPEN' ? <p className="cg-muted-note">Waiting for a worker to accept this request.</p> : null}
            {job.status === 'ACCEPTED' || job.status === 'IN_PROGRESS' ? (
              <p className="cg-muted-note">The assigned worker is handling this request.</p>
            ) : null}
            {job.status === 'COMPLETED' ? (
              confirming ? (
                <div className="cg-confirm-inline" role="group" aria-label="Confirm job completion">
                  <p>Confirm the work is complete? This records your confirmation.</p>
                  <div className="cg-button-row">
                    <Button size="sm" isLoading={busy} onClick={() => act('confirm')}>
                      Yes, confirm completion
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
                      Not yet
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" onClick={() => setConfirming(true)} disabled={busy || !onAction}>
                  Confirm completion
                </Button>
              )
            ) : null}
            {job.status === 'CUSTOMER_CONFIRMED' ? (
              <p className="cg-success-note">You confirmed this job. Payment is not handled in this prototype.</p>
            ) : null}
          </>
        ) : (
          <>
            {job.status === 'OPEN' ? (
              <Button size="sm" isLoading={busy} disabled={busy || !onAction} onClick={() => act('accept')}>
                Accept request
              </Button>
            ) : null}
            {job.status === 'ACCEPTED' ? (
              <Button size="sm" isLoading={busy} disabled={busy || !onAction} onClick={() => act('start')}>
                Start job
              </Button>
            ) : null}
            {job.status === 'IN_PROGRESS' ? (
              <Button size="sm" isLoading={busy} disabled={busy || !onAction} onClick={() => act('complete')}>
                Mark work complete
              </Button>
            ) : null}
            {job.status === 'COMPLETED' ? (
              <p className="cg-muted-note">Work marked complete — waiting for the customer to confirm.</p>
            ) : null}
            {job.status === 'CUSTOMER_CONFIRMED' ? (
              <p className="cg-success-note">Customer confirmed. Payments are not handled in this prototype.</p>
            ) : null}
          </>
        )}
      </div>

      {demo ? <p className="cg-job-card__demo-note">Demo record — stored only as synthetic sample data.</p> : null}
    </article>
  );
}
