import { cx } from '../../utils/cx';
import { initials } from '../../utils/format';

export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <span className={cx('cg-avatar', `cg-avatar--${size}`, className)} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
