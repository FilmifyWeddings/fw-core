/**
 * Centralized Quotation Defaults & Pricing Calculators
 */

export const DEFAULT_PAGE_SEQUENCE = [
  'cover',
  'aboutUs',
  'shootDetails',
  'functionsPage',
  'deliverablesPage',
  'specialValueAdditions',
  'pricingPage',
  'paymentTermsPage',
  'addOnsPage',
  'termsPage',
  'thankYouPage'
];

export const DEFAULT_AIRY_PROPOSAL = {
  designName: 'Wedding - Design 1',
  eventGroup: 'Wedding',
  look: 'Cyprus & Sand Dune',
  primaryFont: "'Cormorant Garamond', serif",
  secondaryFont: "'Plus Jakarta Sans', sans-serif",
  pageSequence: DEFAULT_PAGE_SEQUENCE,
  customPages: {} as Record<string, any>,

  cover: {
    groomName: 'Rahul',
    brideName: 'Neha',
    coupleName: 'Rahul & Neha',
    eventType: 'Wedding',
    sideOption: 'Both Sides',
    locationName: 'MUMBAI',
    brandName: 'FILMIFY WEDDINGS',
    brandLogoUrl: '',
    brandLogoSize: 64,
    photoUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
    photoHeight: 450,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'arch' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
    imagePosition: 'center' as 'top' | 'center' | 'bottom',
  },

  aboutUs: {
    kicker: 'INTRODUCTION',
    heading: 'ABOUT US',
    text: 'Glowwed films strive to capture your love story in the most gracious way possible. All the memories of your event will be hand-picked with precision and made into films & photographs that you can cherish forever',
    signature: 'FOUNDER & DIRECTOR, AS',
    bottomBannerPhoto: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=80',
    bottomBannerHeight: 380,
    frameShape: 'full-width' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
    photoFocalY: 50,
    photoWidth: 100,
    bgOpacity: 40,
    imagePosition: 'bottom' as 'top' | 'center' | 'bottom',
  },

  shootDetails: {
    kicker: 'WHAT WE DO',
    heading: 'Pre-Wedding Shoot',
    daysText: '1 Day Shoot',
    crewText: 'Candid Photography\nCinematography\nPortable Changing Room',
    deliverablesHeading: 'Deliverables',
    deliverablesText: 'Full Ultra HD Super-Fine Raw Photos\nApprox. 50 High Resolution Edited Images\n3 Save The Dates Photos\n1 count Down Reel\n1 video Reel',
    photo: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80',
    photoHeight: 380,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'rounded' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
    imagePosition: 'bottom' as 'top' | 'center' | 'bottom',
  },

  functionsPage: {
    kicker: 'WEDDING EVENTS',
    heading: 'FUNCTIONS & COVERAGE',
    items: [],
  },

  deliverablesPage: {
    kicker: 'WHAT YOU GET',
    heading: 'DELIVERABLES',
    selectedItems: [
      'Full Ultra HD Super-Fine Raw Photos',
      'High Resolution Edited Photos (300+)',
      'Cinematic Teaser (3-5 Mins)',
      'Traditional Wedding Film (30-45 Mins)',
    ],
    availableOptions: [
      'Full Ultra HD Super-Fine Raw Photos',
      'High Resolution Edited Photos (300+)',
      'Cinematic Teaser (3-5 Mins)',
      'Traditional Wedding Film (30-45 Mins)',
      'Instagram Reels Package (5 Reels)',
      'Drone Aerial Videography',
    ],
  },

  specialValueAdditions: {
    kicker: 'COMPLIMENTARY',
    heading: 'SPECIAL VALUE ADDITIONS',
    selectedItems: [
      'Complimentary Pre-Wedding Couple Shoot (1 Day)',
      'Complimentary Custom Wooden Pendrive Box',
      'Complimentary Live Streaming for 1 Event',
    ],
    availableOptions: [
      'Complimentary Pre-Wedding Couple Shoot (1 Day)',
      'Complimentary Custom Wooden Pendrive Box',
      'Complimentary Live Streaming for 1 Event',
      'Complimentary Photo Booth Setup',
    ],
    note: '',
    photo: '',
    photoHeight: 360,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'rounded',
    imagePosition: 'bottom',
  },

  pricingPage: {
    kicker: 'INVESTMENT',
    heading: 'PRICING & PACKAGE',
    basePrice: 150000,
    discountAmount: 0,
    accommodationCharges: 0,
    travelCharges: 0,
    additionalCharges: 0,
    gstPct: 18,
    note: '',
    photo: '',
    photoHeight: 360,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'rounded',
    imagePosition: 'bottom',
  },

  paymentTermsPage: {
    kicker: 'PAYMENT SCHEDULE',
    heading: 'PAYMENT TERMS',
    steps: [
      { name: 'Advance Booking', pct: '25%', amount: 37500, status: 'Pending' },
      { name: 'On Event Day', pct: '50%', amount: 75000, status: 'Pending' },
      { name: 'On Delivery', pct: '25%', amount: 37500, status: 'Pending' },
    ],
    note: '',
    photo: '',
    photoHeight: 360,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'rounded',
    imagePosition: 'bottom',
  },

  addOnsPage: {
    kicker: 'EXTRAS',
    heading: 'ADD-ONS & UPGRADES',
    items: [],
    note: '',
    photo: '',
    photoHeight: 360,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'rounded',
    imagePosition: 'bottom',
  },

  termsPage: {
    kicker: 'POLICIES',
    heading: 'TERMS & CONDITIONS',
    items: [
      'Travel & Accommodation: Client is responsible for outstation travel & stay arrangements.',
      'Raw Data Delivery: Delivered within 7 days of event completion.',
      'Edited Albums & Films: Delivered within 45-60 days after selection.',
      'Copyrights: Studio retains artistic rights for promotional portfolio use.',
    ],
    note: '',
    photo: '',
    photoHeight: 360,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'rounded',
    imagePosition: 'bottom',
  },

  thankYouPage: {
    kicker: 'THANK YOU',
    heading: 'WE LOOK FORWARD TO CAPTURING YOUR MEMORIES',
    contactPerson: 'Filming Team',
    phone: '+91 98765 43210',
    email: 'info@filmifyweddings.com',
    website: 'www.filmifyweddings.com',
    instagram: '@filmifyweddings',
    brandLogoUrl: '',
    photo: '',
    photoHeight: 360,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'rounded',
    imagePosition: 'bottom',
  },
};

export function calculatePricingTotals(pricing: any) {
  const p = pricing || DEFAULT_AIRY_PROPOSAL.pricingPage;
  const base = Number(p?.basePrice ?? p?.base ?? 0);
  const disc = Number(p?.discountAmount ?? p?.discount ?? 0);
  const accom = Number(p?.accommodationCharges ?? p?.accommodation ?? 0);
  const travel = Number(p?.travelCharges ?? p?.travel ?? 0);
  const addl = Number(p?.additionalCharges ?? p?.additional ?? 0);
  const gross = Math.max(0, base - disc + accom + travel + addl);
  const gstPct = Number(p?.gstPct ?? p?.gstPercent ?? 18);
  const gstAmount = Math.round(gross * (gstPct / 100));
  const netTotal = gross + gstAmount;
  return { base, disc, accom, travel, addl, gross, gstPct, gstAmount, netTotal };
}

export function normalizeQuotationData(loaded: any) {
  const d = DEFAULT_AIRY_PROPOSAL;
  if (!loaded || typeof loaded !== 'object') return d;

  return {
    ...d,
    ...loaded,
    cover: { ...d.cover, ...(loaded.cover || {}) },
    aboutUs: { ...d.aboutUs, ...(loaded.aboutUs || {}) },
    shootDetails: { ...d.shootDetails, ...(loaded.shootDetails || {}) },
    functionsPage: {
      ...d.functionsPage,
      ...(loaded.functionsPage || {}),
      items: Array.isArray(loaded.functionsPage?.items) ? loaded.functionsPage.items : d.functionsPage.items,
    },
    deliverablesPage: {
      ...d.deliverablesPage,
      ...(loaded.deliverablesPage || {}),
      selectedItems: Array.isArray(loaded.deliverablesPage?.selectedItems)
        ? loaded.deliverablesPage.selectedItems
        : d.deliverablesPage.selectedItems,
      availableOptions: Array.isArray(loaded.deliverablesPage?.availableOptions)
        ? loaded.deliverablesPage.availableOptions
        : d.deliverablesPage.availableOptions,
    },
    specialValueAdditions: {
      ...d.specialValueAdditions,
      ...(loaded.specialValueAdditions || {}),
      selectedItems: Array.isArray(loaded.specialValueAdditions?.selectedItems)
        ? loaded.specialValueAdditions.selectedItems
        : d.specialValueAdditions.selectedItems,
      availableOptions: Array.isArray(loaded.specialValueAdditions?.availableOptions)
        ? loaded.specialValueAdditions.availableOptions
        : d.specialValueAdditions.availableOptions,
      note: loaded.specialValueAdditions?.note ?? d.specialValueAdditions.note ?? '',
      photo: loaded.specialValueAdditions?.photo ?? d.specialValueAdditions.photo ?? '',
      photoHeight: loaded.specialValueAdditions?.photoHeight ?? d.specialValueAdditions.photoHeight ?? 360,
      photoWidth: loaded.specialValueAdditions?.photoWidth ?? d.specialValueAdditions.photoWidth ?? 75,
      photoFocalY: loaded.specialValueAdditions?.photoFocalY ?? d.specialValueAdditions.photoFocalY ?? 50,
      bgOpacity: loaded.specialValueAdditions?.bgOpacity ?? d.specialValueAdditions.bgOpacity ?? 40,
      frameShape: loaded.specialValueAdditions?.frameShape ?? d.specialValueAdditions.frameShape ?? 'rounded',
      imagePosition: loaded.specialValueAdditions?.imagePosition ?? d.specialValueAdditions.imagePosition ?? 'bottom',
    },
    pricingPage: {
      ...d.pricingPage,
      ...(loaded.pricingPage || {}),
      basePrice: typeof loaded.pricingPage?.basePrice === 'number' ? loaded.pricingPage.basePrice : d.pricingPage.basePrice,
      discountAmount: typeof loaded.pricingPage?.discountAmount === 'number' ? loaded.pricingPage.discountAmount : d.pricingPage.discountAmount,
      accommodationCharges: typeof loaded.pricingPage?.accommodationCharges === 'number' ? loaded.pricingPage.accommodationCharges : d.pricingPage.accommodationCharges,
      travelCharges: typeof loaded.pricingPage?.travelCharges === 'number' ? loaded.pricingPage.travelCharges : d.pricingPage.travelCharges,
      additionalCharges: typeof loaded.pricingPage?.additionalCharges === 'number' ? loaded.pricingPage.additionalCharges : d.pricingPage.additionalCharges,
      gstPct: typeof loaded.pricingPage?.gstPct === 'number' ? loaded.pricingPage.gstPct : d.pricingPage.gstPct,
      note: loaded.pricingPage?.note ?? d.pricingPage.note ?? '',
      photo: loaded.pricingPage?.photo ?? d.pricingPage.photo ?? '',
      photoHeight: loaded.pricingPage?.photoHeight ?? d.pricingPage.photoHeight ?? 360,
      photoWidth: loaded.pricingPage?.photoWidth ?? d.pricingPage.photoWidth ?? 75,
      photoFocalY: loaded.pricingPage?.photoFocalY ?? d.pricingPage.photoFocalY ?? 50,
      bgOpacity: loaded.pricingPage?.bgOpacity ?? d.pricingPage.bgOpacity ?? 40,
      frameShape: loaded.pricingPage?.frameShape ?? d.pricingPage.frameShape ?? 'rounded',
      imagePosition: loaded.pricingPage?.imagePosition ?? d.pricingPage.imagePosition ?? 'bottom',
    },
    paymentTermsPage: {
      ...d.paymentTermsPage,
      ...(loaded.paymentTermsPage || {}),
      steps: Array.isArray(loaded.paymentTermsPage?.steps)
        ? loaded.paymentTermsPage.steps
        : d.paymentTermsPage.steps,
      note: loaded.paymentTermsPage?.note ?? d.paymentTermsPage.note ?? '',
      photo: loaded.paymentTermsPage?.photo ?? d.paymentTermsPage.photo ?? '',
      photoHeight: loaded.paymentTermsPage?.photoHeight ?? d.paymentTermsPage.photoHeight ?? 360,
      photoWidth: loaded.paymentTermsPage?.photoWidth ?? d.paymentTermsPage.photoWidth ?? 75,
      photoFocalY: loaded.paymentTermsPage?.photoFocalY ?? d.paymentTermsPage.photoFocalY ?? 50,
      bgOpacity: loaded.paymentTermsPage?.bgOpacity ?? d.paymentTermsPage.bgOpacity ?? 40,
      frameShape: loaded.paymentTermsPage?.frameShape ?? d.paymentTermsPage.frameShape ?? 'rounded',
      imagePosition: loaded.paymentTermsPage?.imagePosition ?? d.paymentTermsPage.imagePosition ?? 'bottom',
    },
    addOnsPage: {
      ...d.addOnsPage,
      ...(loaded.addOnsPage || {}),
      items: Array.isArray(loaded.addOnsPage?.items)
        ? loaded.addOnsPage.items
        : d.addOnsPage.items,
      note: loaded.addOnsPage?.note ?? d.addOnsPage.note ?? '',
      photo: loaded.addOnsPage?.photo ?? d.addOnsPage.photo ?? '',
      photoHeight: loaded.addOnsPage?.photoHeight ?? d.addOnsPage.photoHeight ?? 360,
      photoWidth: loaded.addOnsPage?.photoWidth ?? d.addOnsPage.photoWidth ?? 75,
      photoFocalY: loaded.addOnsPage?.photoFocalY ?? d.addOnsPage.photoFocalY ?? 50,
      bgOpacity: loaded.addOnsPage?.bgOpacity ?? d.addOnsPage.bgOpacity ?? 40,
      frameShape: loaded.addOnsPage?.frameShape ?? d.addOnsPage.frameShape ?? 'rounded',
      imagePosition: loaded.addOnsPage?.imagePosition ?? d.addOnsPage.imagePosition ?? 'bottom',
    },
    termsPage: {
      ...d.termsPage,
      ...(loaded.termsPage || {}),
      items: Array.isArray(loaded.termsPage?.items)
        ? loaded.termsPage.items
        : d.termsPage.items,
      note: loaded.termsPage?.note ?? d.termsPage.note ?? '',
      photo: loaded.termsPage?.photo ?? d.termsPage.photo ?? '',
      photoHeight: loaded.termsPage?.photoHeight ?? d.termsPage.photoHeight ?? 360,
      photoWidth: loaded.termsPage?.photoWidth ?? d.termsPage.photoWidth ?? 75,
      photoFocalY: loaded.termsPage?.photoFocalY ?? d.termsPage.photoFocalY ?? 50,
      bgOpacity: loaded.termsPage?.bgOpacity ?? d.termsPage.bgOpacity ?? 40,
      frameShape: loaded.termsPage?.frameShape ?? d.termsPage.frameShape ?? 'rounded',
      imagePosition: loaded.termsPage?.imagePosition ?? d.termsPage.imagePosition ?? 'bottom',
    },
    thankYouPage: {
      ...d.thankYouPage,
      ...(loaded.thankYouPage || {}),
      contactPerson: loaded.thankYouPage?.contactPerson ?? d.thankYouPage.contactPerson ?? 'Filming Team',
      phone: loaded.thankYouPage?.phone ?? d.thankYouPage.phone ?? '',
      email: loaded.thankYouPage?.email ?? d.thankYouPage.email ?? '',
      website: loaded.thankYouPage?.website ?? d.thankYouPage.website ?? '',
      instagram: loaded.thankYouPage?.instagram ?? d.thankYouPage.instagram ?? '',
      photo: loaded.thankYouPage?.photo ?? d.thankYouPage.photo ?? '',
      photoHeight: loaded.thankYouPage?.photoHeight ?? d.thankYouPage.photoHeight ?? 360,
      photoWidth: loaded.thankYouPage?.photoWidth ?? d.thankYouPage.photoWidth ?? 75,
      photoFocalY: loaded.thankYouPage?.photoFocalY ?? d.thankYouPage.photoFocalY ?? 50,
      bgOpacity: loaded.thankYouPage?.bgOpacity ?? d.thankYouPage.bgOpacity ?? 40,
      frameShape: loaded.thankYouPage?.frameShape ?? d.thankYouPage.frameShape ?? 'rounded',
      imagePosition: loaded.thankYouPage?.imagePosition ?? d.thankYouPage.imagePosition ?? 'bottom',
    },
  };
}
