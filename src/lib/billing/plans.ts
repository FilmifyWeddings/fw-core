export interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

export interface SubscriptionTier {
  id: 'starter' | 'pro' | 'enterprise';
  name: string;
  badge?: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  storageGB: number;
  teamSeats: number;
  eventsPerMonth: number;
  aiScans: number;
  popular?: boolean;
  features: PlanFeature[];
}

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'starter',
    name: 'Starter Solo',
    tagline: 'Ideal for independent photographers & solo creators',
    priceMonthly: 799,
    priceYearly: 7999, // ~₹666/mo (Save 17%)
    storageGB: 30,
    teamSeats: 1,
    eventsPerMonth: 5,
    aiScans: 1500,
    features: [
      { text: '30 GB Backblaze B2 High-Speed Storage', included: true },
      { text: '1 Studio Owner Seat', included: true },
      { text: '5 Event Galleries / Month', included: true },
      { text: '1,500 AI Face Scans (GPU-Accelerated)', included: true },
      { text: 'Client QR Guest Pass & Instant Registration', included: true },
      { text: 'Digital Watermark Protection', included: true },
      { text: 'Basic CRM & Payments Tracking', included: true },
      { text: 'WhatsApp Direct Guest Notification', included: false },
      { text: 'Frame-Accurate Video Review & Timestamps', included: false },
      { text: 'Crew Payroll & Freelancer Portal', included: false },
      { text: 'Full White-Label & Custom Branding', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Studio Pro',
    badge: 'Founder\'s Choice · Most Popular',
    tagline: 'Built for fast-growing wedding studios & photography crews',
    priceMonthly: 1799,
    priceYearly: 17999, // ~₹1,499/mo (Save 17% + 2 Months Free)
    storageGB: 150,
    teamSeats: 5,
    eventsPerMonth: 25,
    aiScans: 10000,
    popular: true,
    features: [
      { text: '150 GB Backblaze B2 High-Speed Storage', included: true, highlight: true },
      { text: '5 Crew Member Seats + Freelancer Portal', included: true },
      { text: '25 Event Galleries / Month', included: true },
      { text: '10,000 AI Face Scans per Month', included: true, highlight: true },
      { text: 'Frame-Accurate Video Review & Timestamps', included: true, highlight: true },
      { text: 'WhatsApp Automation (Templates & QR dispatch)', included: true, highlight: true },
      { text: 'Crew Payroll, Per-day Rates & Attendance', included: true },
      { text: 'Smart Quotations & PDF Contract Builder', included: true },
      { text: 'Client Review & Photo Favoriting Portal', included: true },
      { text: 'Zero Download Bandwidth Charges', included: true },
      { text: 'Custom Subdomain & Clean URLs', included: true },
      { text: 'Full White-Label & Custom Domain', included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'Agency Enterprise',
    badge: 'Maximum Power',
    tagline: 'Uncapped capacity for high-volume production houses',
    priceMonthly: 3499,
    priceYearly: 34999, // ~₹2,916/mo (Save 17%)
    storageGB: 600,
    teamSeats: 9999,
    eventsPerMonth: 9999,
    aiScans: 999999,
    features: [
      { text: '600 GB Backblaze B2 Cloud Storage (Expandable)', included: true, highlight: true },
      { text: 'Unlimited Crew Seats & Freelancer Access', included: true },
      { text: 'Unlimited Event Galleries & Shoots', included: true },
      { text: 'Unlimited AI Face Search & Indexing', included: true, highlight: true },
      { text: 'Full White-Label (Your Logo, Your Brand Everywhere)', included: true, highlight: true },
      { text: 'Custom Domain (e.g. photos.yourstudio.com)', included: true, highlight: true },
      { text: 'Multi-Branch CRM, Invoicing & P&L Analytics', included: true },
      { text: 'WhatsApp Business API Integration', included: true },
      { text: 'Priority Dedicated SLA Support & Onboarding', included: true },
      { text: 'Early Access to Next-Gen AI Features', included: true },
    ],
  },
];
