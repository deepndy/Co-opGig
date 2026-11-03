import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  align?: 'left' | 'center';
  id?: string;
}

export function SectionHeading({ eyebrow, title, description, action, align = 'left', id }: SectionHeadingProps) {
  return (
    <div className={cx('cg-section-head', align === 'center' && 'cg-section-head--center')}>
      <div className="cg-section-head__copy">
        {eyebrow ? <p className="cg-eyebrow">{eyebrow}</p> : null}
        <h2 id={id}>{title}</h2>
        {description ? <p className="cg-section-head__description">{description}</p> : null}
      </div>
      {action ? <div className="cg-section-head__action">{action}</div> : null}
    </div>
  );
}
