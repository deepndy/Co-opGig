import { Loader2 } from 'lucide-react';

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="cg-page-loader" role="status" aria-live="polite">
      <Loader2 className="cg-spin" size={28} aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
