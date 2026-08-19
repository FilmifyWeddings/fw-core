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
  const groomName = coverSrc.groomName ?? (d.cover.groomName || 'Rahul');
  const brideName = coverSrc.brideName ?? (d.cover.brideName || 'Neha');
  const coupleName = coverSrc.coupleName || (coverSrc.groomName && coverSrc.brideName ? `${coverSrc.groomName} & ${coverSrc.brideName}` : (loaded.client?.client_name || d.cover.coupleName));
  const eventType = coverSrc.eventType ?? coverSrc.title ?? coverSrc.event_type ?? d.cover.eventType;
  const locationName = coverSrc.locationName !== undefined ? coverSrc.locationName : (coverSrc.wedding_location || coverSrc.city || '');
  const weddingDate = coverSrc.weddingDate || coverSrc.quotation_date || coverSrc.wedding_date || '';

  const cover = {
    ...d.cover,
    ...coverSrc,
    groomName,
    brideName,
    coupleName,
    eventType,
    locationName,
    weddingDate,
    sideOption: coverSrc.sideOption || d.cover.sideOption,
    brandName: coverSrc.brandName || d.cover.brandName,
  };

  // 3. Normalize About Us
  const aboutSrc = loaded.aboutUs || pagesObj.about_us || {};
  const aboutUs = {
    ...d.aboutUs,
    ...aboutSrc,
    kicker: aboutSrc.kicker || d.aboutUs.kicker,
    heading: aboutSrc.heading || d.aboutUs.heading,
    text: aboutSrc.text || d.aboutUs.text,
    signature: aboutSrc.signature || d.aboutUs.signature,
  };

  // 4. Normalize Pre-Wedding Shoot Details
  const shootSrc = loaded.shootDetails || pagesObj.pre_wedding || {};
  const shootVisible = shootSrc.visible !== undefined 
    ? Boolean(shootSrc.visible) 
    : Boolean(shootSrc.crewText || shootSrc.deliverablesText);

  const shootDetails = {
    ...d.shootDetails,
    ...shootSrc,
    visible: shootVisible,
    kicker: shootSrc.kicker || d.shootDetails.kicker,
    heading: shootSrc.heading || d.shootDetails.heading,
    daysText: shootSrc.daysText || d.shootDetails.daysText,
    crewText: shootSrc.crewText !== undefined ? shootSrc.crewText : d.shootDetails.crewText,
    deliverablesHeading: shootSrc.deliverablesHeading || d.shootDetails.deliverablesHeading,
    deliverablesText: shootSrc.deliverablesText !== undefined ? shootSrc.deliverablesText : d.shootDetails.deliverablesText,
    showExclusionsNote: shootSrc.showExclusionsNote !== undefined ? Boolean(shootSrc.showExclusionsNote) : true,
  };

  // 5. Normalize Functions / Events Page
  const funcsSrc = loaded.functionsPage || pagesObj.functions_coverage || pagesObj.functions || {};
  const rawEvents = funcsSrc.items || funcsSrc.events || funcsSrc.functions || [];
  let funcItems: any[] = [];

  if (Array.isArray(rawEvents) && rawEvents.length > 0) {
    funcItems = rawEvents.map((e: any, idx: number) => {
      let requirements: { name: string; qty: number }[] = [];
      if (Array.isArray(e.requirements) && e.requirements.length > 0) {
        requirements = e.requirements.map((r: any) => ({
          name: typeof r === 'string' ? r : (r.name || 'Candid Photographer'),
          qty: Number(r.qty || 1)
        }));
      } else if (Array.isArray(e.services) && e.services.length > 0) {
        requirements = e.services.map((s: string) => ({ name: s, qty: 1 }));
      } else if (e.team || e.services) {
        const teamStr = String(e.team || e.services);
        requirements = teamStr.split(/,|\n/).map((s: string) => s.trim()).filter(Boolean).map((s: string) => ({ name: s, qty: 1 }));
      }

      if (requirements.length === 0) {
        requirements = [
          { name: 'Traditional Photographer', qty: 1 },
          { name: 'Cinematographer', qty: 1 }
        ];
      }

      const isNotFixed = e.dateNotFixed ?? (!e.date || e.date === 'Date Not Fixed' || e.date === 'TBD');

      return {
        id: e.id || `func_${idx + 1}`,
        name: e.name || e.event_name || `Function ${idx + 1}`,
        date: isNotFixed ? 'Date Not Fixed' : (e.date || 'Date Not Fixed'),
        dateNotFixed: isNotFixed,
        startTime: e.startTime || '',
        endTime: e.endTime || '',
        time: e.time || (e.startTime && e.endTime ? `${e.startTime} - ${e.endTime}` : (e.time || '')),
        durationSlot: e.durationSlot || '',
        location: e.location || e.venue || '',
        venue: e.venue || e.location || '',
        notes: e.notes || '',
        requirements,
        team: Array.isArray(e.team) ? e.team.join(', ') : (e.team || requirements.map(r => `${r.qty}x ${r.name}`).join(', '))
      };
    });
  } else if (Array.isArray(d.functionsPage.items)) {
    funcItems = d.functionsPage.items;
  }

  const functionsPage = {
    ...d.functionsPage,
    ...funcsSrc,
    kicker: funcsSrc.kicker || d.functionsPage.kicker,
    heading: funcsSrc.heading || d.functionsPage.heading,
    items: funcItems
  };

  // 6. Normalize Deliverables Page
  const delivSrc = loaded.deliverablesPage || pagesObj.deliverables || {};
  let delivItems: string[] = [];
  if (Array.isArray(delivSrc.selectedItems) && delivSrc.selectedItems.length > 0) {
    delivItems = delivSrc.selectedItems;
  } else if (Array.isArray(delivSrc.items) && delivSrc.items.length > 0) {
    delivItems = delivSrc.items;
  } else {
    delivItems = d.deliverablesPage.selectedItems;
  }

  const combinedOptions = Array.from(new Set([
    ...d.deliverablesPage.availableOptions,
    ...(Array.isArray(delivSrc.availableOptions) ? delivSrc.availableOptions : []),
    ...delivItems
  ]));

  const deliverablesPage = {
    ...d.deliverablesPage,
    ...delivSrc,
    kicker: delivSrc.kicker || d.deliverablesPage.kicker,
    heading: delivSrc.heading || d.deliverablesPage.heading,
    selectedItems: delivItems,
    availableOptions: combinedOptions
  };

  // 7. Normalize Special Value Additions
  const valAddSrc = loaded.specialValueAdditions || pagesObj.special_value_additions || {};
  const valAddItems = Array.isArray(valAddSrc.selectedItems)
    ? valAddSrc.selectedItems
    : (Array.isArray(valAddSrc.items) ? valAddSrc.items : []);

  const valCombinedOptions = Array.from(new Set([
    ...d.specialValueAdditions.availableOptions,
    ...(Array.isArray(valAddSrc.availableOptions) ? valAddSrc.availableOptions : []),
    ...valAddItems
  ]));

  const specialValueAdditions = {
    ...d.specialValueAdditions,
    ...valAddSrc,
    kicker: valAddSrc.kicker || d.specialValueAdditions.kicker,
    heading: valAddSrc.heading || d.specialValueAdditions.heading,
    selectedItems: valAddItems,
    availableOptions: valCombinedOptions,
    note: valAddSrc.note || ''
  };

  // 8. Normalize Pricing Page
  const pricingSrc = loaded.pricingPage || pagesObj.pricing || {};
  const basePrice = Number(pricingSrc.basePrice ?? pricingSrc.total_amount ?? pricingSrc.base ?? d.pricingPage.basePrice);
  const discountAmount = Number(pricingSrc.discountAmount ?? pricingSrc.discount ?? 0);
  const gstPct = Number(pricingSrc.gstPct ?? pricingSrc.gstPercent ?? 0);
  const travelCharges = Number(pricingSrc.travelCharges ?? pricingSrc.travel ?? 0);
  const accommodationCharges = Number(pricingSrc.accommodationCharges ?? pricingSrc.accommodation ?? 0);
  const additionalCharges = Number(pricingSrc.additionalCharges ?? pricingSrc.additional ?? 0);

  const pricingPage = {
    ...d.pricingPage,
    ...pricingSrc,
    kicker: pricingSrc.kicker || d.pricingPage.kicker,
    heading: pricingSrc.heading || d.pricingPage.heading,
    basePrice,
    discountAmount,
    gstPct,
    travelCharges,
    accommodationCharges,
    additionalCharges,
    showExclusionsNote: pricingSrc.showExclusionsNote !== undefined ? Boolean(pricingSrc.showExclusionsNote) : true,
    note: pricingSrc.note || ''
  };

  // 9. Normalize Payment Terms Page
  const payTermsSrc = loaded.paymentTermsPage || pagesObj.payment_terms || {};
  const netAmount = Math.max(0, basePrice - discountAmount + travelCharges + accommodationCharges + additionalCharges);

  let paySteps = payTermsSrc.steps || [];
  if (!Array.isArray(paySteps) || paySteps.length === 0) {
    paySteps = [
      { name: 'Advance Token', pct: '25%', amount: Math.round(netAmount * 0.25), status: 'Pending' },
      { name: 'On Event Day', pct: '50%', amount: Math.round(netAmount * 0.50), status: 'Pending' },
      { name: 'On Final Delivery', pct: '25%', amount: Math.round(netAmount * 0.25), status: 'Pending' }
    ];
  } else {
    paySteps = paySteps.map((s: any) => ({
      name: s.name || 'Payment Milestone',
      pct: s.pct || '30%',
      amount: Number(s.amount || 0),
      status: s.status || 'Pending'
    }));
  }

  const paymentTermsPage = {
    ...d.paymentTermsPage,
    ...payTermsSrc,
    kicker: payTermsSrc.kicker || d.paymentTermsPage.kicker,
    heading: payTermsSrc.heading || d.paymentTermsPage.heading,
    steps: paySteps,
    note: payTermsSrc.note || ''
  };

  // 10. Normalize Thank You Page
  const thankSrc = loaded.thankYouPage || pagesObj.thank_you || {};
  const thankYouPage = {
    ...d.thankYouPage,
    ...thankSrc,
    contactPerson: thankSrc.contactPerson || thankSrc.signature || d.thankYouPage.contactPerson
  };

  // 11. Calculate Active Page Sequence from Page Visibility Flags
  const activeSeq: string[] = ['cover', 'aboutUs'];
  if (shootDetails.visible) activeSeq.push('shootDetails');
  activeSeq.push('functionsPage');
  activeSeq.push('deliverablesPage');
  if (specialValueAdditions.selectedItems.length > 0) activeSeq.push('specialValueAdditions');
  activeSeq.push('pricingPage');
  if (paymentTermsPage.steps.length > 0) activeSeq.push('paymentTermsPage');

  const addOnsSrc = loaded.addOnsPage || pagesObj.add_ons;
  if (addOnsSrc?.visible === true && Array.isArray(addOnsSrc.items) && addOnsSrc.items.length > 0) {
    activeSeq.push('addOnsPage');
  }

  const termsSrc = loaded.termsPage || pagesObj.terms_conditions;
  if (termsSrc?.visible !== false) activeSeq.push('termsPage');
  activeSeq.push('thankYouPage');

  return {
    ...d,
    ...loaded,
    cover,
    aboutUs,
    shootDetails,
    functionsPage,
    deliverablesPage,
    specialValueAdditions,
    pricingPage,
    paymentTermsPage,
    thankYouPage,
    pageSequence: loaded.pageSequence && Array.isArray(loaded.pageSequence) && loaded.pageSequence.length > 0 ? loaded.pageSequence : activeSeq
  };
}
