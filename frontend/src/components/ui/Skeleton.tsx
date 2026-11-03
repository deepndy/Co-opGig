import { cx } from '../../utils/cx';

export function Skeleton({ className }: { className?: string }) {
  return <span className={cx('cg-skeleton', className)} aria-hidden="true" />;
}

export function CardGridSkeleton({ count = 6, label = 'Loading cards' }: { count?: number; label?: string }) {
  return (
    <div className="cg-card-grid" aria-busy="true" aria-label={label}>
      {Array.from({ length: count }).map((_, index) => (
        <div className="cg-card cg-skeleton-card" key={index}>
          <Skeleton className="cg-skeleton--icon" />
          <Skeleton className="cg-skeleton--title" />
          <Skeleton className="cg-skeleton--line" />
          <Skeleton className="cg-skeleton--line cg-skeleton--short" />
          <span className="visually-hidden">{label}</span>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 3, label = 'Loading list' }: { count?: number; label?: string }) {
  return (
    <div className="cg-stack" aria-busy="true" aria-label={label}>
      {Array.from({ length: count }).map((_, index) => (
        <div className="cg-card cg-skeleton-card cg-skeleton-card--wide" key={index}>
          <Skeleton className="cg-skeleton--title" />
          <Skeleton className="cg-skeleton--line" />
          <Skeleton className="cg-skeleton--line cg-skeleton--short" />
        </div>
      ))}
    </div>
  );
}
