import type { ServiceCategory } from '../types/domain';

/**
 * Canonical category slugs from the shared domain model. Keep this list in
 * sync with the contract: these exact strings are sent to the backend.
 */
export const SERVICE_CATEGORY_SLUGS = [
  'electrician',
  'plumber',
  'carpenter',
  'painter',
  'cleaner',
  'gardener',
  'driver',
  'caregiver',
  'technician',
  'domestic-helper',
  'mason',
  'appliance-repair',
] as const;

/**
 * Built-in metadata used for a resilient first paint and as an honest fallback
 * if the categories endpoint is unavailable. The live API remains the source
 * of truth when it responds.
 */
export const SERVICE_CATEGORY_FALLBACK: ServiceCategory[] = [
  {
    slug: 'electrician',
    name: 'Electrician',
    description: 'Wiring, sockets, light fittings and electrical fault inspection.',
    tasks: ['Switch or socket repair', 'Light and fan fitting', 'Wiring inspection'],
  },
  {
    slug: 'plumber',
    name: 'Plumber',
    description: 'Leaks, blocked drains, taps and bathroom plumbing.',
    tasks: ['Leaking tap', 'Blocked drain', 'Toilet or bathroom fitting'],
  },
  {
    slug: 'carpenter',
    name: 'Carpenter',
    description: 'Furniture repair, doors, shelves and wooden fittings.',
    tasks: ['Furniture repair', 'Door alignment', 'Shelf installation'],
  },
  {
    slug: 'painter',
    name: 'Painter',
    description: 'Interior and exterior painting, touch-ups and wall preparation.',
    tasks: ['Room painting', 'Wall touch-up', 'Exterior paintwork'],
  },
  {
    slug: 'cleaner',
    name: 'Cleaner',
    description: 'Home cleaning, deep cleaning and move-out cleaning.',
    tasks: ['Deep cleaning', 'Regular home cleaning', 'Move-out cleaning'],
  },
  {
    slug: 'gardener',
    name: 'Gardener',
    description: 'Garden upkeep, pruning, lawn care and planting.',
    tasks: ['Lawn care', 'Pruning', 'Plant care'],
  },
  {
    slug: 'driver',
    name: 'Driver',
    description: 'Local drives, errands and planned trips.',
    tasks: ['Local drive', 'Errand assistance', 'Planned trip'],
  },
  {
    slug: 'caregiver',
    name: 'Caregiver',
    description: 'Non-medical companionship and everyday assistance.',
    tasks: ['Companionship', 'Daily assistance', 'Errand support'],
  },
  {
    slug: 'technician',
    name: 'Technician',
    description: 'Device setup, diagnostics and general technical support.',
    tasks: ['Device setup', 'Network help', 'General diagnostics'],
  },
  {
    slug: 'domestic-helper',
    name: 'Domestic Helper',
    description: 'Household help with cooking, cleaning and daily chores.',
    tasks: ['Cooking support', 'Household chores', 'Daily help'],
  },
  {
    slug: 'mason',
    name: 'Mason',
    description: 'Brickwork, plastering, tiling and small structural repairs.',
    tasks: ['Brickwork', 'Plastering', 'Tiling'],
  },
  {
    slug: 'appliance-repair',
    name: 'Appliance Repair',
    description: 'Repair of household appliances such as fans, mixers and washing machines.',
    tasks: ['Washing machine repair', 'Mixer or fan repair', 'Appliance diagnostics'],
  },
];

const fallbackBySlug = new Map(SERVICE_CATEGORY_FALLBACK.map((item) => [item.slug, item]));

export function isKnownCategory(value: string | null | undefined): value is (typeof SERVICE_CATEGORY_SLUGS)[number] {
  return typeof value === 'string' && (SERVICE_CATEGORY_SLUGS as readonly string[]).includes(value);
}

export function fallbackCategory(slug: string): ServiceCategory | undefined {
  return fallbackBySlug.get(slug);
}

export function formatCategoryLabel(slug: string | null | undefined): string {
  if (!slug) return 'Service';
  const fallback = fallbackBySlug.get(slug);
  if (fallback) return fallback.name;
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
