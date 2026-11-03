import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';

export type BadgeTone = 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'demo' | 'outline';

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return <span className={cx('cg-badge', `cg-badge--${tone}`, className)}>{children}</span>;
}
