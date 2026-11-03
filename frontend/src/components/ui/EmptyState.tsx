import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon, title, message, action, compact = false }: EmptyStateProps) {
  return (
    <div className={compact ? 'cg-empty cg-empty--compact' : 'cg-empty'}>
      {icon ? <div className="cg-empty__icon">{icon}</div> : null}
      <h3>{title}</h3>
      <p>{message}</p>
      {action ? <div className="cg-empty__action">{action}</div> : null}
    </div>
  );
}
