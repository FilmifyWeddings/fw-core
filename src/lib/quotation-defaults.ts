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

export function normalizeQuotationData(rawInput: any) {
  const d = DEFAULT_AIRY_PROPOSAL;
  if (!rawInput || typeof rawInput !== 'object') return d;

  // 1. Unwrap root wrappers if present ({ quotation: { ... } } or { pages: { ... } })
  let loaded = rawInput;
  if (loaded.quotation && typeof loaded.quotation === 'object') {
    loaded = { ...loaded, ...loaded.quotation };
  }
  const pagesObj = loaded.pages && typeof loaded.pages === 'object' ? loaded.pages : loaded;

  // 2. Normalize Cover
  const coverSrc = loaded.cover || pagesObj.cover || {};
  const cover = {
    ...d.cover,
    ...coverSrc,
    coupleName: coverSrc.coupleName || coverSrc.client_name || coverSrc.couple_name || loaded.client?.client_name || d.cover.coupleName,
    weddingDate: coverSrc.weddingDate || coverSrc.quotation_date || coverSrc.wedding_date || (d.cover as any).weddingDate || '',
    locationName: coverSrc.locationName || coverSrc.wedding_location || coverSrc.city || d.cover.locationName,
    eventType: coverSrc.eventType || coverSrc.title || coverSrc.event_type || d.cover.eventType
  };

  // 3. Normalize Functions / Events Page
  const funcsSrc = loaded.functionsPage || pagesObj.functions_coverage || pagesObj.functions || {};
  let funcItems: any[] = [];
  const rawEvents = funcsSrc.events || funcsSrc.items || funcsSrc.functions || [];
  if (Array.isArray(rawEvents) && rawEvents.length > 0) {
    funcItems = rawEvents.map((e: any, idx: number) => ({
      id: e.id || `func-norm-${idx}`,
      name: e.name || e.event_name || `Event ${idx + 1}`,
      date: e.date || 'TBD',
      time: e.time || 'Full Day',
      venue: e.venue || e.location || 'Venue TBD',
      team: Array.isArray(e.services) ? e.services.join(', ') : (e.team || e.services || 'Photographers & Cinematographers')
    }));
  } else if (Array.isArray(d.functionsPage.items)) {
    funcItems = d.functionsPage.items;
  }

  const functionsPage = {
    ...d.functionsPage,
    ...funcsSrc,
    items: funcItems
  };

  // 4. Normalize Deliverables Page
  const delivSrc = loaded.deliverablesPage || pagesObj.deliverables || {};
  const delivItems = Array.isArray(delivSrc.items)
    ? delivSrc.items
    : (Array.isArray(delivSrc.selectedItems) ? delivSrc.selectedItems : d.deliverablesPage.selectedItems);
  const deliverablesPage = {
    ...d.deliverablesPage,
    ...delivSrc,
    selectedItems: delivItems
  };

  // 5. Normalize Pricing Page
  const pricingSrc = loaded.pricingPage || pagesObj.pricing || {};
  const basePriceVal = typeof pricingSrc.basePrice === 'number'
    ? pricingSrc.basePrice
    : (typeof pricingSrc.total_amount === 'number' ? pricingSrc.total_amount : d.pricingPage.basePrice);

  const pricingPage = {
    ...d.pricingPage,
    ...pricingSrc,
    basePrice: basePriceVal
  };

  // 6. Normalize Thank You Page
  const thankSrc = loaded.thankYouPage || pagesObj.thank_you || {};
  const thankYouPage = {
    ...d.thankYouPage,
    ...thankSrc,
    contactPerson: thankSrc.contactPerson || thankSrc.signature || d.thankYouPage.contactPerson
  };

  // 7. Calculate Active Page Sequence from Page Visibility Flags
  const activeSeq: string[] = ['cover', 'aboutUs'];

  // Check shootDetails / pre_wedding
  const preWedSrc = loaded.shootDetails || pagesObj.pre_wedding;
  if (preWedSrc?.visible !== false) activeSeq.push('shootDetails');

  // Functions page
  if (funcsSrc?.visible !== false) activeSeq.push('functionsPage');

  // Deliverables page
  if (delivSrc?.visible !== false) activeSeq.push('deliverablesPage');

  // Special value additions
  const valAddSrc = loaded.specialValueAdditions || pagesObj.special_value_additions;
  if (valAddSrc?.visible === true && valAddSrc?.selectedItems?.length > 0) activeSeq.push('specialValueAdditions');

  // Pricing page
  if (pricingSrc?.visible !== false) activeSeq.push('pricingPage');

  // Payment terms
  const payTermsSrc = loaded.paymentTermsPage || pagesObj.payment_terms;
  if (payTermsSrc?.visible === true && payTermsSrc?.steps?.length > 0) activeSeq.push('paymentTermsPage');

  // Add-ons
  const addOnsSrc = loaded.addOnsPage || pagesObj.add_ons;
  if (addOnsSrc?.visible === true && addOnsSrc?.items?.length > 0) activeSeq.push('addOnsPage');

  // Terms
  const termsSrc = loaded.termsPage || pagesObj.terms_conditions;
  if (termsSrc?.visible === true && termsSrc?.items?.length > 0) activeSeq.push('termsPage');

  // Thank you
  if (thankSrc?.visible !== false) activeSeq.push('thankYouPage');

  return {
    ...d,
    ...loaded,
    cover,
    aboutUs: { ...d.aboutUs, ...(loaded.aboutUs || pagesObj.about_us || {}) },
    shootDetails: { ...d.shootDetails, ...(loaded.shootDetails || pagesObj.pre_wedding || {}) },
    functionsPage,
    deliverablesPage,
    pricingPage,
    thankYouPage,
    pageSequence: loaded.pageSequence && Array.isArray(loaded.pageSequence) ? loaded.pageSequence : activeSeq
  };
}
