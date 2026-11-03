import { RefreshCw, WifiOff } from 'lucide-react';
import { getErrorMessage, isApiError } from '../../api';
import { Button } from './Button';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  compact?: boolean;
}

export function ErrorState({ error, onRetry, title = 'We could not load this', compact = false }: ErrorStateProps) {
  const message = getErrorMessage(error);
  const code = isApiError(error) ? error.code : null;
  return (
    <div className={compact ? 'cg-error-state cg-error-state--compact' : 'cg-error-state'} role="alert">
      <div className="cg-error-state__icon">
        <WifiOff size={22} aria-hidden="true" />
      </div>
      <div>
        <h3>{title}</h3>
        <p>{message}</p>
        {code ? <p className="cg-error-state__code">Error code: {code}</p> : null}
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry} leadingIcon={<RefreshCw size={15} />}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
