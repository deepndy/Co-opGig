import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: number;
  label?: string;
  inline?: boolean;
}

export function Spinner({ size = 18, label = 'Loading', inline = false }: SpinnerProps) {
  return (
    <span className={inline ? 'cg-spinner cg-spinner--inline' : 'cg-spinner'} role="status">
      <Loader2 size={size} className="cg-spinner__icon" aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </span>
  );
}
