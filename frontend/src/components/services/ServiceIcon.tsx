import {
  BrickWall,
  Car,
  Droplets,
  Hammer,
  HeartHandshake,
  House,
  Leaf,
  Paintbrush,
  Plug,
  Settings,
  Sparkles,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cx } from '../../utils/cx';

const SERVICE_ICONS: Record<string, LucideIcon> = {
  electrician: Zap,
  plumber: Droplets,
  carpenter: Hammer,
  painter: Paintbrush,
  cleaner: Sparkles,
  gardener: Leaf,
  driver: Car,
  caregiver: HeartHandshake,
  technician: Settings,
  'domestic-helper': House,
  mason: BrickWall,
  'appliance-repair': Plug,
};

interface ServiceIconProps {
  slug: string;
  size?: number;
  className?: string;
}

export function ServiceIcon({ slug, size = 22, className }: ServiceIconProps) {
  const Icon = SERVICE_ICONS[slug] ?? Wrench;
  return (
    <span className={cx('cg-service-icon', `cg-service-icon--${slug}`, className)} aria-hidden="true">
      <Icon size={size} strokeWidth={1.9} />
    </span>
  );
}
