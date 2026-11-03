/**
 * Single source of truth for the working product name, headline copy and
 * demo disclaimers. Change the brand here rather than in individual pages.
 */
export const BRAND = {
  name: 'Co-opGig',
  tagline: 'Reliable Local Services. Powered by Cooperatives.',
  heroSubtitle:
    'Book trusted local workers for household and community services while supporting cooperative employment.',
  description:
    'A cooperative-first service marketplace that connects customers with local skilled workers.',
  academicTitle:
    'AI-Assisted Blockchain-Secured Skilled Worker Employment and Service-Demand Platform',
  demoBadge: 'Demo',
  demoModeNotice:
    'The backend API is not connected. Workers, jobs, ratings and numbers shown are fictional sample data. No real booking, dispatch or payment is created.',
  demoDataNote: 'Fictional demo data — not real platform activity.',
  team: [
    { name: 'Deep Lokhande', area: 'Frontend & customer/worker experience' },
    { name: 'Shravan Ganjare', area: 'AI assistant & job classifier' },
    { name: 'Mansi Phalke', area: 'Remote-sensing demand analysis' },
    { name: 'Shreya Burse', area: 'Core backend, database & blockchain' },
  ],
  locale: 'en-IN',
  maxChatMessageLength: 1500,
} as const;

export const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Services', to: '/services' },
  { label: 'How It Works', to: '/how-it-works' },
  { label: 'For Workers', to: '/worker' },
  { label: 'About Cooperative', to: '/about' },
] as const;

export const AI_ASSISTANT = {
  title: 'Co-opGig assistant',
  openLabel: 'Open Co-opGig assistant',
  closeLabel: 'Close assistant',
  minimizeLabel: 'Minimize assistant',
  tooltip: 'Ask Co-opGig',
  subtitle: 'Service discovery · suggestions only',
} as const;
