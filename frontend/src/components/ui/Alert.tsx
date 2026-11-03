import { CircleAlert, CircleCheck, FlaskConical, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';

type AlertVariant = 'info' | 'success' | 'warning' | 'error' | 'demo';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

const ICONS = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert,
  demo: FlaskConical,
};

export function Alert({ variant = 'info', title, children, className, action }: AlertProps) {
  const Icon = ICONS[variant];
  const role = variant === 'error' || variant === 'warning' ? 'alert' : 'status';
  return (
    <div className={cx('cg-alert', `cg-alert--${variant}`, className)} role={role}>
      <Icon size={19} className="cg-alert__icon" aria-hidden="true" />
      <div className="cg-alert__body">
        {title ? <p className="cg-alert__title">{title}</p> : null}
        <div className="cg-alert__content">{children}</div>
        {action ? <div className="cg-alert__action">{action}</div> : null}
      </div>
    </div>
  );
}
