export type PlanCategory = 'gallery' | 'crm';

export interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

export interface SubscriptionTier {
  id: string;
  category: PlanCategory;
  name: string;
  badge?: string;
  tagline: string;
  popular?: boolean;
  recommended?: boolean;
  
  // Pricing
  priceMonthly: number;
  price6Months?: number;
  priceYearly: number;
  perMonthDisplayPrice?: number;
  
  // Storage & capacity limits
  storageGB: number;
  teamSeats: number;
  eventsPerMonth?: number;
  events?: number | string;
  photosPerEvent?: number | string;
  totalPhotos?: number | string;
  photoResolution?: string;
  validityPeriod?: string;
  aiScans: number;
  
  buttonText?: string;
  lockedFeatures?: string[];
  unlockedFeatures?: string[];
  features: PlanFeature[];
}

export interface FeatureMatrixItem {
  category: string;
  feature: string;
  tooltip?: string;
  values: Record<string, string | boolean>;
}

// ── 1. GALLERY PLANS (6 MONTHS & ANNUAL ONLY) ──
export const GALLERY_PLANS: SubscriptionTier[] = [
  {
    id: 'gallery_starter',
    category: 'gallery',
    name: 'Gallery Starter',
    tagline: 'Perfect for photographers just starting out',
    priceMonthly: 0,
    price6Months: 0,
    priceYearly: 0,
    perMonthDisplayPrice: 0,
    storageGB: 5,
    teamSeats: 1,
    events: 5,
    photosPerEvent: '1,000',
    totalPhotos: '5,000',
    photoResolution: 'Low Resolution',
    validityPeriod: '3 Months',
    aiScans: 500,
    buttonText: 'Get Started',
    features: [
      { text: '5 events', included: true },
      { text: '1,000 photos per event', included: true },
      { text: 'Client selection & approval', included: true },
      { text: 'AI photo sharing', included: true },
      { text: 'Web Low/Mid Resolution', included: true },
      { text: 'Download & export tools', included: false },
      { text: 'Custom domain & white-label', included: false },
      { text: 'Comments (text, audio, draw)', included: false },
    ],
  },
  {
    id: 'gallery_50',
    category: 'gallery',
    name: 'Gallery 50',
    tagline: 'For active photographers with regular shoots',
    priceMonthly: 500,
    price6Months: 2520, // ₹420/mo
    priceYearly: 4200,   // ₹350/mo
    perMonthDisplayPrice: 350,
    storageGB: 50,
    teamSeats: 2,
    events: 50,
    photosPerEvent: '3,000',
    totalPhotos: '150,000',
    photoResolution: 'Web High Resolution',
    validityPeriod: '6 Months',
    aiScans: 5000,
    buttonText: 'Start Free Trial',
    features: [
      { text: '50 events', included: true },
      { text: '3,000 photos per event', included: true },
      { text: 'Client selection & approval', included: true },
      { text: 'Download & export tools', included: true },
      { text: 'AI photo sharing', included: true },
      { text: 'Web High Resolution', included: true },
      { text: 'Folder limits & controls', included: true },
      { text: 'Custom domain', included: false },
      { text: 'Remove StudioCore branding', included: false },
    ],
  },
  {
    id: 'gallery_100',
    category: 'gallery',
    name: 'Gallery 100',
    tagline: 'For fast-growing wedding photography studios',
    priceMonthly: 1000,
    price6Months: 5400, // ₹900/mo
    priceYearly: 9000,  // ₹750/mo
    perMonthDisplayPrice: 750,
    storageGB: 120,
    teamSeats: 5,
    events: 100,
    photosPerEvent: '4,000',
    totalPhotos: '400,000',
    photoResolution: 'Web High Resolution',
    validityPeriod: '8 Months',
    aiScans: 15000,
    buttonText: 'Start Free Trial',
    features: [
      { text: '100 events', included: true },
      { text: '4,000 photos per event', included: true },
      { text: 'Client selection & approval', included: true },
      { text: 'Download & export tools', included: true },
      { text: 'Custom domain (CNAME)', included: true, highlight: true },
      { text: 'Remove StudioCore branding', included: true, highlight: true },
      { text: 'Comments (text, audio, draw)', included: true, highlight: true },
      { text: 'AI photo sharing', included: true },
      { text: 'Web High Resolution', included: true },
    ],
  },
  {
    id: 'gallery_250',
    category: 'gallery',
    name: 'Gallery 250',
    badge: 'RECOMMENDED',
    tagline: 'For studios managing large volumes of shoots',
    popular: true,
    recommended: true,
    priceMonthly: 1800,
    price6Months: 10800, // ₹1,800/mo
    priceYearly: 18000,  // ₹1,500/mo
    perMonthDisplayPrice: 1500,
    storageGB: 300,
    teamSeats: 10,
    events: 250,
    photosPerEvent: '7,000',
    totalPhotos: '1,750,000',
    photoResolution: 'Web High Resolution',
    validityPeriod: '8 Months',
    aiScans: 50000,
    buttonText: 'Start Free Trial',
    features: [
      { text: '250 events', included: true, highlight: true },
      { text: '7,000 photos per event', included: true, highlight: true },
      { text: 'Client selection & approval', included: true },
      { text: 'Download & export tools', included: true },
      { text: 'Custom domain & white-label', included: true, highlight: true },
      { text: 'Comments (text, audio, draw)', included: true, highlight: true },
      { text: 'AI photo sharing & Face Search', included: true, highlight: true },
      { text: 'Web High Resolution', included: true },
      { text: 'Priority CDN & Upload Speeds', included: true, highlight: true },
    ],
  },
];

// ── 2. PHOTOGRAPHY CRM PLANS ──
export const CRM_PLANS: SubscriptionTier[] = [
  {
    id: 'solo',
    category: 'crm',
    name: 'Solo Photographer',
    tagline: 'For Solo Wedding Photographers & Independent Creators',
    priceMonthly: 299,
    priceYearly: 2990, // ~₹249/mo (Save 17%)
    perMonthDisplayPrice: 249,
    storageGB: 30,
    teamSeats: 5,
    aiScans: 1500,
    buttonText: 'Start 14-Day Free Trial',
    lockedFeatures: [
      'ai_quotations',
      'video_review',
      'clients_directory',
      'smart_attendance',
      'integrations_hub',
      'gallery',
    ],
    unlockedFeatures: [
      'leads',
      'quotations_builder',
      'bookings',
      'team',
      'post_production',
      'storage',
      'tasks',
      'finance',
      'settings',
    ],
    features: [
      { text: 'Leads & CRM (All Pipelines & Follow-ups)', included: true },
      { text: 'Standard Quotations & Contracts Builder', included: true },
      { text: 'Booking & Events Master Calendar', included: true },
      { text: 'Team & Partners (Up to 5 Crew/Freelancers)', included: true },
      { text: 'Post-Production Management Board', included: true },
      { text: 'Studio Storage (30 GB Cloud Storage)', included: true },
      { text: 'Tasks & Notes Productivity Suite', included: true },
      { text: 'Finance, Invoices & Salary Slips', included: true },
      { text: 'Studio Settings & Help & Support', included: true },
      { text: 'Create Quotation with AI (Voice/Whisper)', included: false },
      { text: 'Frame-Accurate Video Review Engine', included: false },
      { text: 'Clients Directory & Kundali Insights', included: false },
      { text: 'Smart Attendance & GPS Check-in', included: false },
      { text: 'Integrations Hub (Meta, IG, Google)', included: false },
      { text: 'Client Photo Gallery Access', included: false },
    ],
  },
  {
    id: 'pro',
    category: 'crm',
    name: 'Studio Pro',
    badge: 'MOST POPULAR',
    tagline: 'Built for growing wedding studios & multi-shooter teams',
    popular: true,
    recommended: true,
    priceMonthly: 699,
    priceYearly: 6990, // ~₹582/mo (Save 17%)
    perMonthDisplayPrice: 582,
    storageGB: 150,
    teamSeats: 15,
    aiScans: 10000,
    buttonText: 'Start 14-Day Free Trial',
    lockedFeatures: [
      'smart_attendance',
      'integrations_hub',
    ],
    unlockedFeatures: [
      'leads',
      'quotations_builder',
      'ai_quotations',
      'video_review',
      'clients_directory',
      'bookings',
      'team',
      'post_production',
      'storage',
      'tasks',
      'finance',
      'settings',
    ],
    features: [
      { text: 'Everything in Solo, plus:', included: true, highlight: true },
      { text: 'Client Directory & Full CRM Kundali', included: true, highlight: true },
      { text: 'Create Quotation with AI (Voice & Whisper)', included: true, highlight: true },
      { text: 'Frame-Accurate Video Review & Timestamps', included: true, highlight: true },
      { text: 'Team & Partners (Up to 15 Crew Members)', included: true },
      { text: 'Studio Storage (150 GB Cloud Storage)', included: true, highlight: true },
      { text: 'PDF Contract Custom Fonts & Branding', included: true },
      { text: 'Full Post-Production Deadline Pipeline', included: true },
      { text: 'Smart Attendance & GPS Check-in', included: false },
      { text: 'Integrations Hub (Meta, IG, Google)', included: false },
    ],
  },
  {
    id: 'studio',
    category: 'crm',
    name: 'Advanced Studio',
    badge: 'POWERHOUSE · ALL ACCESS',
    tagline: 'Complete operating system for full-scale luxury studios',
    priceMonthly: 1499,
    priceYearly: 14990, // ~₹1,249/mo (Save 17%)
    perMonthDisplayPrice: 1249,
    storageGB: 500,
    teamSeats: 9999,
    aiScans: 50000,
    buttonText: 'Start 14-Day Free Trial',
    lockedFeatures: [],
    unlockedFeatures: [
      'leads',
      'quotations_builder',
      'ai_quotations',
      'video_review',
      'clients_directory',
      'bookings',
      'team',
      'post_production',
      'storage',
      'tasks',
      'finance',
      'smart_attendance',
      'integrations_hub',
      'settings',
    ],
    features: [
      { text: 'Everything in Pro, plus:', included: true, highlight: true },
      { text: 'Full Integration Hub (Instagram & Meta Ads)', included: true, highlight: true },
      { text: 'Google Drive, Contacts & Calendar Sync', included: true, highlight: true },
      { text: 'Smart Attendance (GPS/Geo-tagged Staff Clock-In)', included: true, highlight: true },
      { text: 'Unlimited Crew Members & Role-Based Access', included: true, highlight: true },
      { text: 'Studio Storage (500 GB High-Speed Cloud)', included: true, highlight: true },
      { text: 'Full Team Collaboration & Freelancer Rates', included: true },
      { text: 'WhatsApp Business Notifications & Retainers', included: true },
      { text: 'Dedicated 24/7 VIP Concierge Support', included: true, highlight: true },
    ],
  },
];

// Unified default catalog for backward compatibility
export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [...CRM_PLANS, ...GALLERY_PLANS];

// ── 3. FEATURE COMPARISON MATRICES ──
export const GALLERY_FEATURE_MATRIX: FeatureMatrixItem[] = [
  // Category: Gallery Limits
  {
    category: 'Gallery',
    feature: 'Events Included',
    values: {
      gallery_starter: '5 Events',
      gallery_50: '50 Events',
      gallery_100: '100 Events',
      gallery_250: '250 Events',
    },
  },
  {
    category: 'Gallery',
    feature: 'Photos Per Event',
    values: {
      gallery_starter: '1,000',
      gallery_50: '3,000',
      gallery_100: '4,000',
      gallery_250: '7,000',
    },
  },
  {
    category: 'Gallery',
    feature: 'Total Photos Capacity',
    values: {
      gallery_starter: '5,000',
      gallery_50: '150,000',
      gallery_100: '400,000',
      gallery_250: '1,750,000',
    },
  },
  {
    category: 'Gallery',
    feature: 'Photo Resolution Quality',
    values: {
      gallery_starter: 'Low Resolution',
      gallery_50: 'Web High Resolution',
      gallery_100: 'Web High Resolution',
      gallery_250: 'Web High Resolution',
    },
  },
  {
    category: 'Gallery',
    feature: 'Per Event Validity Period',
    values: {
      gallery_starter: '3 Months',
      gallery_50: '6 Months',
      gallery_100: '8 Months',
      gallery_250: '8 Months',
    },
  },
  // Category: Sharing & Interaction
  {
    category: 'Sharing',
    feature: 'Client Access Accounts',
    values: {
      gallery_starter: '1 Client',
      gallery_50: '1 Client',
      gallery_100: '1 Client',
      gallery_250: '3 Clients',
    },
  },
  {
    category: 'Sharing',
    feature: 'Public Sharable Gallery Link',
    values: {
      gallery_starter: false,
      gallery_50: false,
      gallery_100: true,
      gallery_250: true,
    },
  },
  {
    category: 'Sharing',
    feature: 'Guest & Family Collaborators',
    values: {
      gallery_starter: false,
      gallery_50: false,
      gallery_100: true,
      gallery_250: true,
    },
  },
  {
    category: 'Sharing',
    feature: 'AI Face Search & Smart Photo Sharing',
    values: {
      gallery_starter: true,
      gallery_50: true,
      gallery_100: true,
      gallery_250: true,
    },
  },
  // Category: Photo Selection
  {
    category: 'Photo Selection',
    feature: 'Client Photo Selection & Approval',
    values: {
      gallery_starter: true,
      gallery_50: true,
      gallery_100: true,
      gallery_250: true,
    },
  },
  {
    category: 'Photo Selection',
    feature: 'Selection Quota Limit Rules',
    values: {
      gallery_starter: true,
      gallery_50: true,
      gallery_100: true,
      gallery_250: true,
    },
  },
  {
    category: 'Photo Selection',
    feature: 'Sub-Folder Limits & Categorization',
    values: {
      gallery_starter: false,
      gallery_50: true,
      gallery_100: true,
      gallery_250: true,
    },
  },
  {
    category: 'Photo Selection',
    feature: 'Interactive Comments (Text, Audio, Draw)',
    values: {
      gallery_starter: false,
      gallery_50: false,
      gallery_100: true,
      gallery_250: true,
    },
  },
  // Category: Delivery & Downloads
  {
    category: 'Delivery & Downloads',
    feature: 'High-Res Direct Downloads',
    values: {
      gallery_starter: false,
      gallery_50: true,
      gallery_100: true,
      gallery_250: true,
    },
  },
  {
    category: 'Delivery & Downloads',
    feature: 'Download & Export Tools (ZIP/Single)',
    values: {
      gallery_starter: false,
      gallery_50: true,
      gallery_100: true,
      gallery_250: true,
    },
  },
  {
    category: 'Delivery & Downloads',
    feature: 'PIN Protection & Download Restrictions',
    values: {
      gallery_starter: true,
      gallery_50: true,
      gallery_100: true,
      gallery_250: true,
    },
  },
  // Category: Branding
  {
    category: 'Branding & Domain',
    feature: 'Remove StudioCore Branding',
    values: {
      gallery_starter: false,
      gallery_50: false,
      gallery_100: true,
      gallery_250: true,
    },
  },
  {
    category: 'Branding & Domain',
    feature: 'Custom Domain (CNAME / Subdomain)',
    values: {
      gallery_starter: false,
      gallery_50: false,
      gallery_100: true,
      gallery_250: true,
    },
  },
];

export const CRM_FEATURE_MATRIX: FeatureMatrixItem[] = [
  // Category: Lead Management
  {
    category: 'Lead Management',
    feature: 'Unlimited Leads & Pipeline Stages',
    values: {
      solo: true,
      pro: true,
      studio: true,
    },
  },
  {
    category: 'Lead Management',
    feature: 'Kanban & List Visual Pipelines',
    values: {
      solo: true,
      pro: true,
      studio: true,
    },
  },
  {
    category: 'Lead Management',
    feature: 'Client Directory & Kundali History',
    values: {
      solo: false,
      pro: true,
      studio: true,
    },
  },
  // Category: Quotations & AI
  {
    category: 'Quotations & Contracts',
    feature: 'Luxury PDF Quotation Builder',
    values: {
      solo: true,
      pro: true,
      studio: true,
    },
  },
  {
    category: 'Quotations & AI',
    feature: 'Create with AI (Voice / OpenAI Whisper)',
    values: {
      solo: false,
      pro: true,
      studio: true,
    },
  },
  {
    category: 'Quotations & AI',
    feature: 'Dynamic Rate Card & Scope of Work',
    values: {
      solo: true,
      pro: true,
      studio: true,
    },
  },
  // Category: Video Review & Production
  {
    category: 'Post-Production',
    feature: 'Post-Production Workflow Board',
    values: {
      solo: true,
      pro: true,
      studio: true,
    },
  },
  {
    category: 'Post-Production',
    feature: 'Frame-Accurate Video Review & Timestamps',
    values: {
      solo: false,
      pro: true,
      studio: true,
    },
  },
  {
    category: 'Post-Production',
    feature: 'Cloud Storage Capacity',
    values: {
      solo: '30 GB',
      pro: '150 GB',
      studio: '500 GB',
    },
  },
  // Category: Team & Attendance
  {
    category: 'Team Management',
    feature: 'Shooter & Freelancer Roster',
    values: {
      solo: 'Up to 5 Crew',
      pro: 'Up to 15 Crew',
      studio: 'Unlimited Crew',
    },
  },
  {
    category: 'Team Management',
    feature: 'Freelancer Day Rates & Payout Slips',
    values: {
      solo: true,
      pro: true,
      studio: true,
    },
  },
  {
    category: 'Team Management',
    feature: 'Smart Attendance (GPS/Geo-Tagged Clock-In)',
    values: {
      solo: false,
      pro: false,
      studio: true,
    },
  },
  // Category: Integrations & Automations
  {
    category: 'Integrations Hub',
    feature: 'Meta Lead Ads Instant Webhook',
    values: {
      solo: false,
      pro: false,
      studio: true,
    },
  },
  {
    category: 'Integrations Hub',
    feature: 'Instagram Direct Messages & Leads',
    values: {
      solo: false,
      pro: false,
      studio: true,
    },
  },
  {
    category: 'Integrations Hub',
    feature: 'Google Drive, Contacts & Calendar Sync',
    values: {
      solo: false,
      pro: false,
      studio: true,
    },
  },
  // Category: Support
  {
    category: 'Support & Success',
    feature: 'Customer Support Level',
    values: {
      solo: 'Standard Email',
      pro: 'Priority WhatsApp Chat',
      studio: '24/7 Dedicated VIP Concierge',
    },
  },
];
