import { MapPin } from 'lucide-react';
import { isDemoMode } from '../../api';
import { formatCategoryLabel } from '../../config/serviceCategories';
import type { Worker } from '../../types/domain';
import { Avatar } from '../ui/Avatar';
import { AvailabilityBadge, VerificationBadge, WorkerRating } from './WorkerBadges';

export function WorkerCard({ worker, compact = false }: { worker: Worker; compact?: boolean }) {
  const demo = isDemoMode || worker.isDemo;
  return (
    <article className={compact ? 'cg-worker-card cg-worker-card--compact' : 'cg-worker-card'}>
      <div className="cg-worker-card__head">
        <Avatar name={worker.displayName} size={compact ? 'md' : 'lg'} />
        <div className="cg-worker-card__identity">
          <h3>{worker.displayName}</h3>
          {worker.serviceAreaText ? (
            <p className="cg-worker-card__area">
              <MapPin size={13} aria-hidden="true" />
              {worker.serviceAreaText}
            </p>
          ) : null}
        </div>
        <div className="cg-worker-card__badges">
          <VerificationBadge worker={worker} />
          <AvailabilityBadge worker={worker} />
        </div>
      </div>

      <div className="cg-worker-card__categories">
        {worker.serviceCategories.slice(0, compact ? 2 : 3).map((category) => (
          <span className="cg-chip" key={category}>
            {formatCategoryLabel(category)}
          </span>
        ))}
        {worker.serviceCategories.length > (compact ? 2 : 3) ? (
          <span className="cg-chip cg-chip--muted">
            +{worker.serviceCategories.length - (compact ? 2 : 3)} more
          </span>
        ) : null}
      </div>

      <WorkerRating worker={worker} />

      {!compact && typeof worker.completedJobsCount === 'number' ? (
        <p className="cg-worker-card__completed">
          {worker.completedJobsCount} completed jobs {demo ? '(demo)' : ''}
        </p>
      ) : null}

      {compact ? null : worker.bio ? <p className="cg-worker-card__bio">{worker.bio}</p> : null}
    </article>
  );
}
