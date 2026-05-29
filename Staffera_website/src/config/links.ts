/** Configure production URLs via .env — see .env.example */
export const links = {
  houseOwnerApp: import.meta.env.VITE_HOUSE_OWNER_APP_URL || 'http://localhost:8081',
  servantApp: import.meta.env.VITE_SERVANT_APP_URL || 'http://localhost:8082',
  agentPortal: import.meta.env.VITE_AGENT_PORTAL_URL || 'http://localhost:5173',
  playStoreHouseOwner: import.meta.env.VITE_PLAY_STORE_HOUSE_OWNER || '#',
  playStoreServant: import.meta.env.VITE_PLAY_STORE_SERVANT || '#',
  appStoreHouseOwner: import.meta.env.VITE_APP_STORE_HOUSE_OWNER || '#',
  appStoreServant: import.meta.env.VITE_APP_STORE_SERVANT || '#',
} as const;

export type AppLink = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  webUrl: string;
  accent: string;
  icon: 'home' | 'briefcase' | 'shield';
};

export const apps: AppLink[] = [
  {
    id: 'house-owner',
    title: 'House Owner App',
    subtitle: 'Book verified help',
    description:
      'Browse agent-verified staff, book monthly or per-session visits, track arrivals live, and pay with transparent ₹ pricing.',
    webUrl: links.houseOwnerApp,
    accent: 'from-[#662D8C] to-[#ED1E79]',
    icon: 'home',
  },
  {
    id: 'servant',
    title: 'Servant App',
    subtitle: 'Work with confidence',
    description:
      'View your schedule, clock in on-site, share live location while en route, and build your reputation with verified reviews.',
    webUrl: links.servantApp,
    accent: 'from-[#15157d] to-[#7d44a4]',
    icon: 'briefcase',
  },
  {
    id: 'agent',
    title: 'Agent Portal',
    subtitle: 'Onboard & verify staff',
    description:
      'Register background-checked helpers, upload ID proofs, manage verification status, and grow your agency network.',
    webUrl: links.agentPortal,
    accent: 'from-[#0d9488] to-[#15157d]',
    icon: 'shield',
  },
];

export const services = [
  { label: 'Cleaning', emoji: '🧹' },
  { label: 'Cooking', emoji: '👨‍🍳' },
  { label: 'Childcare', emoji: '👶' },
  { label: 'Elderly care', emoji: '🤝' },
  { label: 'Laundry', emoji: '🧺' },
  { label: 'Driver', emoji: '🚗' },
] as const;

export const features = [
  {
    title: 'Agent-verified staff only',
    description:
      'Servants cannot self-register. Every helper is onboarded and ID-verified by a trusted agent before appearing in search.',
    icon: 'shield-check',
  },
  {
    title: 'Live GPS tracking',
    description:
      'Know when help is on the way. Real-time location sharing from booking confirmation through active visits.',
    icon: 'map-pin',
  },
  {
    title: 'Monthly or session bookings',
    description:
      'Hire for a single visit or recurring monthly arrangements — flexible scheduling that fits Indian households.',
    icon: 'calendar',
  },
  {
    title: 'On-site time tracking',
    description:
      'Servants clock in and out at your home. Accurate hours for session billing and monthly accountability.',
    icon: 'clock',
  },
  {
    title: 'Transparent ₹ pricing',
    description:
      'See hourly and monthly rates upfront. No hidden fees — pricing tuned for clarity and household trust.',
    icon: 'indian-rupee',
  },
  {
    title: 'Verified reviews',
    description:
      'Ratings unlock only after completed bookings — genuine feedback from real visits, not fake profiles.',
    icon: 'star',
  },
] as const;

export const usps = [
  {
    stat: '100%',
    label: 'Agent-verified',
    detail: 'No unvetted profiles in browse',
  },
  {
    stat: '6+',
    label: 'Service categories',
    detail: 'Cooking, cleaning, care & more',
  },
  {
    stat: 'Live',
    label: 'Arrival tracking',
    detail: 'Google Maps powered GPS',
  },
  {
    stat: '₹',
    label: 'Clear pricing',
    detail: 'Hourly & monthly rates shown',
  },
] as const;

export const steps = [
  {
    step: '01',
    title: 'Browse verified helpers',
    description:
      'House owners search by skill, rating, and availability. Only VERIFIED servants appear — background-checked by agents.',
  },
  {
    step: '02',
    title: 'Book with confidence',
    description:
      'Choose monthly or session visits. Conflict checks run automatically so double-bookings never happen.',
  },
  {
    step: '03',
    title: 'Track & review',
    description:
      'Follow live location, get notified when visits start, and leave reviews after completed bookings.',
  },
] as const;
