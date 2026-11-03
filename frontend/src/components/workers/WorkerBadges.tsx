import { ShieldCheck, Star } from 'lucide-react';
import { isDemoMode } from '../../api';
import type { Worker } from '../../types/domain';
import { availabilityLabel, isAvailable } from '../../utils/format';
import { Badge } from '../ui/Badge';

/**
 * Verification is only ever shown as "Verified" when the backend returns
 * verificationStatus === "VERIFIED" and the app is not in demo mode.
 */
export function VerificationBadge({ worker }: { worker: Worker }) {
  if (isDemoMode || worker.isDemo) {
    return <Badge tone="demo">Demo profile</Badge>;
  }
  if (worker.verificationStatus === 'VERIFIED') {
    return (
      <Badge tone="green">
        <ShieldCheck size={12} aria-hidden="true" /> Verified
      </Badge>
    );
  }
  if (worker.verificationStatus === 'PENDING') {
    return <Badge tone="amber">Verification pending</Badge>;
  }
  if (worker.verificationStatus === 'REJECTED') {
    return <Badge tone="red">Not verified</Badge>;
  }
  return <Badge tone="neutral">Verification unavailable</Badge>;
}

export function AvailabilityBadge({ worker }: { worker: Worker }) {
  const available = isAvailable(worker.availabilityStatus);
  return (
    <Badge tone={available ? 'green' : 'neutral'}>
      <span className={`cg-dot ${available ? 'cg-dot--green' : 'cg-dot--muted'}`} aria-hidden="true" />
      {availabilityLabel(worker.availabilityStatus)}
    </Badge>
  );
}

export function WorkerRating({ worker }: { worker: Worker }) {
  if (typeof worker.ratingAverage !== 'number' || !Number.isFinite(worker.ratingAverage)) return null;
  const demo = isDemoMode || worker.isDemo;
  return (
    <p className="cg-worker-rating">
      <Star size={15} aria-hidden="true" className="cg-worker-rating__star" />
      <strong>{worker.ratingAverage.toFixed(1)}</strong>
      <span>
        {demo ? 'Demo rating' : 'Average rating'}
        {typeof worker.ratingCount === 'number' && worker.ratingCount > 0
          ? ` · ${worker.ratingCount} ${demo ? 'sample' : ''} reviews`
          : ''}
      </span>
    </p>
  );
}
