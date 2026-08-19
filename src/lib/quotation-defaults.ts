// src/lib/quotation-defaults.ts

export interface PageSequenceItem {
  id: string;
  type: string;
  label: string;
  isStandard?: boolean;
  customId?: string;
}

export const STANDARD_PAGE_DEFINITIONS: { type: string; label: string }[] = [
  { type: 'cover', label: 'Cover Page' },
  { type: 'aboutUs', label: 'About Us' },
  { type: 'shootDetails', label: 'Pre-Wedding Shoot' },
  { type: 'functionsPage', label: 'Functions & Coverage' },
  { type: 'deliverablesPage', label: 'Deliverables' },
  { type: 'specialValueAdditions', label: 'Special Value Additions' },
  { type: 'pricingPage', label: 'Pricing Details' },
  { type: 'paymentTermsPage', label: 'Payment Terms & Schedule' },
  { type: 'addOnsPage', label: 'Add-Ons & Upgrades' },
  { type: 'termsPage', label: 'Terms & Conditions' },
  { type: 'thankYouPage', label: 'Thank You Page' },
];

export const DEFAULT_PAGE_SEQUENCE: PageSequenceItem[] = STANDARD_PAGE_DEFINITIONS.map(std => ({
  id: `${std.type}-std`,
  type: std.type,
  label: std.label,
  isStandard: true
}));

export const DEFAULT_AIRY_PROPOSAL = {
  theme: 'cyprus-sand-dune',
  look: 'cyprus-sand-dune',
  primaryFont: 'Cormorant Garamond',
  secondaryFont: 'Plus Jakarta Sans',
  designName: 'Minimalist Airy Proposal',
  pageSequence: DEFAULT_PAGE_SEQUENCE,
  customPages: [],
  cover: {
    coupleName: 'YASH & TWINKLE',
    groomName: 'Yash',
    brideName: 'Twinkle',
    eventType: 'Wedding Photography & Films',
    weddingDate: 'December 14, 2026',
    locationName: 'Udaipur, Rajasthan',
    brandName: 'STUDIOCORE WEDDINGS',
    sideOption: 'A Wedding Story',
    photoUrl: '',
    brandLogoUrl: '',
    brandLogoSize: 80,
    photoHeight: 360,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'rounded',
    imagePosition: 'bottom',
  },
  aboutUs: {
    kicker: 'WHO WE ARE',
    heading: 'Preserving Emotions & Creating Timeless Visual Legacies',
    text: 'We are a dedicated team of visual artists crafting heartfelt wedding films and editorial photographs that feel as timeless as your love.',
    signature: '— StudioCore Photography Crew',
    photo: '',
    photoHeight: 320,
    photoWidth: 100,
    photoFocalY: 50,
    frameShape: 'rounded',
    imagePosition: 'bottom',
  },
  shootDetails: {
    visible: true,
    kicker: 'CHAPTER ONE',
    heading: 'Pre-Wedding Creative Session',
    daysText: '1 Full Day Creative Session',
    crewText: '1x Candid Photographer\n1x Cinematographer\n1x Drone Specialist',
    deliverablesHeading: 'Curated Session Deliverables',
    deliverablesText: '1x 60-Sec Instagram Cinematic Teaser\n40+ Color-Graded High-Resolution Master Portraits\nFull High-Resolution Digital Master Gallery Link',
    showExclusionsNote: true,
    photo: '',
    photoHeight: 320,
    photoWidth: 100,
    photoFocalY: 50,
    frameShape: 'rounded',
    imagePosition: 'bottom',
  },
  functionsPage: {
    kicker: 'CELEBRATIONS',
    heading: 'Functions & Crew Coverage',
    items: [
      {
        id: 'func_1',
        name: 'Haldi & Mehendi',
        date: 'December 12, 2026',
        dateNotFixed: false,
        startTime: '10:00 AM',
        endTime: '03:00 PM',
        time: '10:00 AM - 03:00 PM',
        durationSlot: 'Morning Rituals',
        location: 'The Leela Palace Courtyard',
        venue: 'The Leela Palace Courtyard',
        notes: 'Casual bright candid portraits & organic ceremony moments',
        requirements: [
          { name: 'Candid Photographer', qty: 1 },
          { name: 'Cinematographer', qty: 1 }
        ],
        team: '1x Candid Photographer, 1x Cinematographer'
      },
      {
        id: 'func_2',
        name: 'Sangeet & Cocktail Night',
        date: 'December 13, 2026',
        dateNotFixed: false,
        startTime: '07:00 PM',
        endTime: '01:00 AM',
        time: '07:00 PM - 01:00 AM',
        durationSlot: 'Evening Glamour',
        location: 'Grand Ballroom',
        venue: 'Grand Ballroom',
        notes: 'High-energy dance performances, stage lighting & family portraits',
        requirements: [
          { name: 'Candid Photographer', qty: 1 },
          { name: 'Traditional Photographer', qty: 1 },
          { name: 'Cinematographer', qty: 2 }
        ],
        team: '1x Candid, 1x Traditional, 2x Cinematographer'
      },
      {
        id: 'func_3',
        name: 'The Wedding Ceremony & Reception',
        date: 'December 14, 2026',
        dateNotFixed: false,
        startTime: '04:00 PM',
        endTime: '12:00 AM',
        time: '04:00 PM - 12:00 AM',
        durationSlot: 'Main Ceremony',
        location: 'Lakeside Mandap & Lawn',
        venue: 'Lakeside Mandap & Lawn',
        notes: 'Baraat, Varmala, Pheras, Emotional Vidai & Reception',
        requirements: [
          { name: 'Candid Photographer', qty: 2 },
          { name: 'Traditional Photographer', qty: 1 },
          { name: 'Cinematographer', qty: 2 },
          { name: 'Drone Pilot', qty: 1 }
        ],
        team: '2x Candid, 1x Traditional, 2x Cinematographer, 1x Drone'
      }
    ]
  },
  deliverablesPage: {
    kicker: 'FINAL OUTPUTS',
    heading: 'Curated Deliverables & Keepsakes',
    selectedItems: [
      'All Unedited High-Resolution RAW Photos (Delivered within 7 days via Hard Drive/Cloud)',
      '350+ Signature Master Color-Graded & Retouched Photographs',
      '1x 3 to 5-Minute 4K Cinematic Highlight Trailer Film',
      '1x 30 to 45-Minute Long Extended Documentary Feature Film',
      '4x Vertical Reels (9:16) tailored for Social Media & Instagram',
      '1x Premium Handcrafted Leatherette Wedding Photobook Album (40 Sheets / 80 Pages)'
    ],
    availableOptions: [
      'All Unedited High-Resolution RAW Photos',
      '350+ Signature Master Color-Graded & Retouched Photographs',
      '1x 3 to 5-Minute 4K Cinematic Highlight Trailer Film',
      '1x 30 to 45-Minute Long Extended Documentary Feature Film',
      '4x Vertical Reels (9:16) tailored for Social Media & Instagram',
      '1x Premium Handcrafted Leatherette Wedding Photobook Album (40 Sheets / 80 Pages)',
      '2x Mini Parent Albums (Identical Copies)',
      'Same Day Edit (SDE) 1-Minute Reel for Reception Screen',
      'Full Wedding Livestreaming (YouTube / Private link)',
      'Pre-Wedding Shoot (1 Day with Hair & Makeup)'
    ]
  },
  specialValueAdditions: {
    kicker: 'COMPLIMENTARY GIFTS',
    heading: 'Special Value Additions',
    selectedItems: [
      'Complimentary 4K Drone Aerial Coverage across all Wedding Functions',
      'Express Same-Week 25-Photo Sneak Peek Gallery for Instant Social Sharing',
      'Custom Engraved Crystal USB Presentation Box with Master Archival Drive'
    ],
    availableOptions: [
      'Complimentary 4K Drone Aerial Coverage across all Wedding Functions',
      'Express Same-Week 25-Photo Sneak Peek Gallery for Instant Social Sharing',
      'Custom Engraved Crystal USB Presentation Box with Master Archival Drive',
      'Complimentary 1-Minute Save the Date Animated Motion Video Invitation',
      'Free Digital Cloud Storage for 2 Full Years'
    ],
    note: ''
  },
  pricingPage: {
    kicker: 'INVESTMENT SUMMARY',
    heading: 'Commercial Proposal & Package Investment',
    basePrice: 285000,
    discountAmount: 15000,
    gstPct: 0,
    travelCharges: 0,
    accommodationCharges: 0,
    additionalCharges: 0,
    showExclusionsNote: true,
    note: 'Custom customized package created specifically for your celebrations.'
  },
  paymentTermsPage: {
    kicker: 'SCHEDULE',
    heading: 'Payment Milestones & Commercial Terms',
    steps: [
      { name: 'Booking Advance (To lock & confirm dates)', pct: '25%', amount: 67500, status: 'Pending' },
      { name: 'Mid-Way Milestone (15 days prior to event)', pct: '50%', amount: 135000, status: 'Pending' },
      { name: 'Final Delivery & Album Dispatch', pct: '25%', amount: 67500, status: 'Pending' }
    ],
    note: 'Payments can be remitted via IMPS, NEFT, RTGS or UPI.'
  },
  addOnsPage: {
    visible: false,
    kicker: 'OPTIONAL UPGRADES',
    heading: 'Available Add-Ons & Enhancements',
    items: [
      { id: 'addon_1', name: 'Same-Day Edit (SDE) Reel', price: 25000, description: '1-minute fast-turnaround reel displayed on reception LED screens' },
      { id: 'addon_2', name: 'Parent Album Duos (2x Books)', price: 30000, description: '2 exact miniature hardbound photobook copies for parents' }
    ]
  },
  termsPage: {
    visible: true,
    kicker: 'POLICIES',
    heading: 'Standard Studio Policies & Terms of Service',
    terms: [
      'Dates are exclusively reserved upon confirmation of the 25% booking advance.',
      'Travel, lodging, and local transit for outstation crew to be provided by client.',
      'Delivery timeline: RAW files within 7 days; Teaser within 20 days; Full Deliverables within 6-8 weeks.',
      'Client approvals on photo selection for albums required within 30 days of receiving gallery.',
      'StudioCore reserves rights to display wedding media on official creative portfolio and social channels.'
    ]
  },
  thankYouPage: {
    kicker: 'GRATITUDE',
    heading: 'Thank You For Choosing Us',
    text: 'We are truly thrilled and honored to be a part of your once-in-a-lifetime journey. Let us create magic together!',
    contactPerson: 'Sushant Sharma',
    phone: '+91 98765 43210',
    email: 'hello@studiocore.in',
    website: 'www.studiocore.in',
    social: '@studiocoreweddings',
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
  const gstPct = Number(p?.gstPct ?? p?.gstPercent ?? 0);
  const gstAmount = Math.round(gross * (gstPct / 100));
  const netTotal = gross + gstAmount;
  return { base, disc, accom, travel, addl, gross, gstPct, gstAmount, netTotal };
}

/**
 * Normalizes input document payload, merging on top of the User's Active Default Template (baseTemplate).
 * Preserves the user's design themes, fonts, colors, branding, custom pages, and default copy!
 */
export function normalizeQuotationData(rawInput: any, baseTemplate?: any) {
  const d = baseTemplate && typeof baseTemplate === 'object' && Object.keys(baseTemplate).length > 0 
    ? baseTemplate 
    : DEFAULT_AIRY_PROPOSAL;

  if (!rawInput || typeof rawInput !== 'object') return d;

  // 1. Unwrap root wrappers if present ({ quotation: { ... } } or { pages: { ... } })
  let loaded = rawInput;
  if (loaded.quotation && typeof loaded.quotation === 'object') {
    loaded = { ...loaded, ...loaded.quotation };
  }
  const pagesObj = loaded.pages && typeof loaded.pages === 'object' ? loaded.pages : loaded;

  // 2. Normalize Cover
  const coverSrc = loaded.cover || pagesObj.cover || {};
  const groomName = coverSrc.groomName ?? (d.cover?.groomName || 'Rahul');
  const brideName = coverSrc.brideName ?? (d.cover?.brideName || 'Neha');
  const coupleName = coverSrc.coupleName || (coverSrc.groomName && coverSrc.brideName ? `${coverSrc.groomName} & ${coverSrc.brideName}` : (loaded.client?.client_name || d.cover?.coupleName || 'Couple Name'));
  const eventType = coverSrc.eventType ?? coverSrc.title ?? coverSrc.event_type ?? d.cover?.eventType ?? 'Wedding Photography & Films';
  const locationName = coverSrc.locationName !== undefined ? coverSrc.locationName : (coverSrc.wedding_location || coverSrc.city || d.cover?.locationName || '');
  const weddingDate = coverSrc.weddingDate || coverSrc.quotation_date || coverSrc.wedding_date || d.cover?.weddingDate || '';

  const cover = {
    ...(d.cover || {}),
    ...coverSrc,
    groomName,
    brideName,
    coupleName,
    eventType,
    locationName,
    weddingDate,
    sideOption: coverSrc.sideOption || d.cover?.sideOption || 'A Wedding Story',
    brandName: coverSrc.brandName || d.cover?.brandName || 'STUDIOCORE WEDDINGS',
    brandLogoUrl: coverSrc.brandLogoUrl || d.cover?.brandLogoUrl || '',
    brandLogoSize: coverSrc.brandLogoSize || d.cover?.brandLogoSize || 80,
    photoUrl: coverSrc.photoUrl !== undefined ? coverSrc.photoUrl : (d.cover?.photoUrl || ''),
    photoHeight: coverSrc.photoHeight ?? d.cover?.photoHeight ?? 360,
    photoWidth: coverSrc.photoWidth ?? d.cover?.photoWidth ?? 75,
    photoFocalY: coverSrc.photoFocalY ?? d.cover?.photoFocalY ?? 50,
    bgOpacity: coverSrc.bgOpacity ?? d.cover?.bgOpacity ?? 40,
    frameShape: coverSrc.frameShape || d.cover?.frameShape || 'rounded',
    imagePosition: coverSrc.imagePosition || d.cover?.imagePosition || 'bottom',
  };

  // 3. Normalize About Us (Preserves template photo & text if AI doesn't pass new copy)
  const aboutSrc = loaded.aboutUs || pagesObj.about_us || {};
  const aboutUs = {
    ...(d.aboutUs || {}),
    ...aboutSrc,
    kicker: aboutSrc.kicker || d.aboutUs?.kicker || 'WHO WE ARE',
    heading: aboutSrc.heading || d.aboutUs?.heading || 'Preserving Emotions & Creating Timeless Visual Legacies',
    text: aboutSrc.text || d.aboutUs?.text || 'We are a dedicated team of visual artists crafting heartfelt wedding films and editorial photographs that feel as timeless as your love.',
    signature: aboutSrc.signature || d.aboutUs?.signature || '— StudioCore Photography Crew',
    photo: aboutSrc.photo !== undefined ? aboutSrc.photo : (d.aboutUs?.photo || ''),
  };

  // 4. Normalize Pre-Wedding Shoot Details
  const shootSrc = loaded.shootDetails || pagesObj.pre_wedding || {};
  const shootVisible = shootSrc.visible !== undefined 
    ? Boolean(shootSrc.visible) 
    : Boolean(shootSrc.crewText || shootSrc.deliverablesText || d.shootDetails?.visible);

  const shootDetails = {
    ...(d.shootDetails || {}),
    ...shootSrc,
    visible: shootVisible,
    kicker: shootSrc.kicker || d.shootDetails?.kicker || 'CHAPTER ONE',
    heading: shootSrc.heading || d.shootDetails?.heading || 'Pre-Wedding Creative Session',
    daysText: shootSrc.daysText || d.shootDetails?.daysText || '1 Full Day Creative Session',
    crewText: shootSrc.crewText !== undefined ? shootSrc.crewText : (d.shootDetails?.crewText || ''),
    deliverablesHeading: shootSrc.deliverablesHeading || d.shootDetails?.deliverablesHeading || 'Curated Session Deliverables',
    deliverablesText: shootSrc.deliverablesText !== undefined ? shootSrc.deliverablesText : (d.shootDetails?.deliverablesText || ''),
    showExclusionsNote: shootSrc.showExclusionsNote !== undefined ? Boolean(shootSrc.showExclusionsNote) : true,
    photo: shootSrc.photo !== undefined ? shootSrc.photo : (d.shootDetails?.photo || ''),
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
  } else if (Array.isArray(d.functionsPage?.items)) {
    funcItems = d.functionsPage.items;
  }

  const functionsPage = {
    ...(d.functionsPage || {}),
    ...funcsSrc,
    kicker: funcsSrc.kicker || d.functionsPage?.kicker || 'CELEBRATIONS',
    heading: funcsSrc.heading || d.functionsPage?.heading || 'Functions & Crew Coverage',
    items: funcItems
  };

  // 6. Normalize Deliverables Page
  const delivSrc = loaded.deliverablesPage || pagesObj.deliverables || {};
  let delivItems: string[] = [];
  if (Array.isArray(delivSrc.selectedItems) && delivSrc.selectedItems.length > 0) {
    delivItems = delivSrc.selectedItems;
  } else if (Array.isArray(delivSrc.items) && delivSrc.items.length > 0) {
    delivItems = delivSrc.items;
  } else if (Array.isArray(d.deliverablesPage?.selectedItems)) {
    delivItems = d.deliverablesPage.selectedItems;
  }

  const combinedOptions = Array.from(new Set([
    ...(d.deliverablesPage?.availableOptions || []),
    ...(Array.isArray(delivSrc.availableOptions) ? delivSrc.availableOptions : []),
    ...delivItems
  ]));

  const deliverablesPage = {
    ...(d.deliverablesPage || {}),
    ...delivSrc,
    kicker: delivSrc.kicker || d.deliverablesPage?.kicker || 'FINAL OUTPUTS',
    heading: delivSrc.heading || d.deliverablesPage?.heading || 'Curated Deliverables & Keepsakes',
    selectedItems: delivItems,
    availableOptions: combinedOptions
  };

  // 7. Normalize Special Value Additions
  const valAddSrc = loaded.specialValueAdditions || pagesObj.special_value_additions || {};
  const valAddItems = Array.isArray(valAddSrc.selectedItems)
    ? valAddSrc.selectedItems
    : (Array.isArray(valAddSrc.items) ? valAddSrc.items : (d.specialValueAdditions?.selectedItems || []));

  const valCombinedOptions = Array.from(new Set([
    ...(d.specialValueAdditions?.availableOptions || []),
    ...(Array.isArray(valAddSrc.availableOptions) ? valAddSrc.availableOptions : []),
    ...valAddItems
  ]));

  const specialValueAdditions = {
    ...(d.specialValueAdditions || {}),
    ...valAddSrc,
    kicker: valAddSrc.kicker || d.specialValueAdditions?.kicker || 'COMPLIMENTARY GIFTS',
    heading: valAddSrc.heading || d.specialValueAdditions?.heading || 'Special Value Additions',
    selectedItems: valAddItems,
    availableOptions: valCombinedOptions,
    note: valAddSrc.note || d.specialValueAdditions?.note || ''
  };

  // 8. Normalize Pricing Page
  const pricingSrc = loaded.pricingPage || pagesObj.pricing || {};
  const basePrice = Number(pricingSrc.basePrice ?? pricingSrc.total_amount ?? pricingSrc.base ?? d.pricingPage?.basePrice ?? 150000);
  const discountAmount = Number(pricingSrc.discountAmount ?? pricingSrc.discount ?? 0);
  const gstPct = Number(pricingSrc.gstPct ?? pricingSrc.gstPercent ?? (d.pricingPage?.gstPct || 0));
  const travelCharges = Number(pricingSrc.travelCharges ?? pricingSrc.travel ?? 0);
  const accommodationCharges = Number(pricingSrc.accommodationCharges ?? pricingSrc.accommodation ?? 0);
  const additionalCharges = Number(pricingSrc.additionalCharges ?? pricingSrc.additional ?? 0);

  const pricingPage = {
    ...(d.pricingPage || {}),
    ...pricingSrc,
    kicker: pricingSrc.kicker || d.pricingPage?.kicker || 'INVESTMENT SUMMARY',
    heading: pricingSrc.heading || d.pricingPage?.heading || 'Commercial Proposal & Package Investment',
    basePrice,
    discountAmount,
    gstPct,
    travelCharges,
    accommodationCharges,
    additionalCharges,
    showExclusionsNote: pricingSrc.showExclusionsNote !== undefined ? Boolean(pricingSrc.showExclusionsNote) : true,
    note: pricingSrc.note || d.pricingPage?.note || ''
  };

  // 9. Normalize Payment Terms Page
  const payTermsSrc = loaded.paymentTermsPage || pagesObj.payment_terms || {};
  const netAmount = Math.max(0, basePrice - discountAmount + travelCharges + accommodationCharges + additionalCharges);

  let paySteps = payTermsSrc.steps || [];
  if (!Array.isArray(paySteps) || paySteps.length === 0) {
    if (Array.isArray(d.paymentTermsPage?.steps) && d.paymentTermsPage.steps.length > 0) {
      paySteps = d.paymentTermsPage.steps.map((s: any) => ({
        ...s,
        amount: Math.round(netAmount * (parseInt(s.pct, 10) || 30) / 100)
      }));
    } else {
      paySteps = [
        { name: 'Advance Token', pct: '25%', amount: Math.round(netAmount * 0.25), status: 'Pending' },
        { name: 'On Event Day', pct: '50%', amount: Math.round(netAmount * 0.50), status: 'Pending' },
        { name: 'On Final Delivery', pct: '25%', amount: Math.round(netAmount * 0.25), status: 'Pending' }
      ];
    }
  } else {
    paySteps = paySteps.map((s: any) => ({
      name: s.name || 'Payment Milestone',
      pct: s.pct || '30%',
      amount: Number(s.amount || 0),
      status: s.status || 'Pending'
    }));
  }

  const paymentTermsPage = {
    ...(d.paymentTermsPage || {}),
    ...payTermsSrc,
    kicker: payTermsSrc.kicker || d.paymentTermsPage?.kicker || 'SCHEDULE',
    heading: payTermsSrc.heading || d.paymentTermsPage?.heading || 'Payment Milestones & Commercial Terms',
    steps: paySteps,
    note: payTermsSrc.note || d.paymentTermsPage?.note || ''
  };

  // 10. Normalize Thank You Page
  const thankSrc = loaded.thankYouPage || pagesObj.thank_you || {};
  const thankYouPage = {
    ...(d.thankYouPage || {}),
    ...thankSrc,
    contactPerson: thankSrc.contactPerson || thankSrc.signature || d.thankYouPage?.contactPerson || 'Studio Owner',
    phone: thankSrc.phone || d.thankYouPage?.phone || '',
    email: thankSrc.email || d.thankYouPage?.email || '',
    website: thankSrc.website || d.thankYouPage?.website || '',
    social: thankSrc.social || d.thankYouPage?.social || '',
    photo: thankSrc.photo !== undefined ? thankSrc.photo : (d.thankYouPage?.photo || ''),
  };

  // 11. Normalize Terms Page
  const termsSrc = loaded.termsPage || pagesObj.terms_conditions || {};
  const termsPage = {
    ...(d.termsPage || {}),
    ...termsSrc,
    visible: termsSrc.visible !== undefined ? Boolean(termsSrc.visible) : (d.termsPage?.visible ?? true),
    terms: Array.isArray(termsSrc.terms) && termsSrc.terms.length > 0 ? termsSrc.terms : (d.termsPage?.terms || [])
  };

  // 12. Calculate Active Page Sequence from Page Visibility Flags
  const toPageSequenceItem = (rawItem: any): PageSequenceItem => {
    if (typeof rawItem === 'string') {
      const std = STANDARD_PAGE_DEFINITIONS.find(s => s.type === rawItem);
      return {
        id: `${rawItem}-std`,
        type: rawItem,
        label: std?.label || rawItem.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        isStandard: !!std
      };
    }
    if (rawItem && typeof rawItem === 'object') {
      const typeStr = rawItem.type || rawItem.id || 'cover';
      const std = STANDARD_PAGE_DEFINITIONS.find(s => s.type === typeStr);
      return {
        id: rawItem.id || `${typeStr}-std`,
        type: typeStr,
        label: rawItem.label || std?.label || typeStr,
        isStandard: rawItem.isStandard ?? !!std,
        customId: rawItem.customId
      };
    }
    return { id: 'cover-std', type: 'cover', label: 'Cover Page', isStandard: true };
  };

  let finalPageSequence: PageSequenceItem[] = [];

  if (Array.isArray(loaded.pageSequence) && loaded.pageSequence.length > 0) {
    finalPageSequence = loaded.pageSequence.map(toPageSequenceItem);
  } else if (Array.isArray(d.pageSequence) && d.pageSequence.length > 0) {
    finalPageSequence = d.pageSequence
      .map(toPageSequenceItem)
      .filter((p: PageSequenceItem) => {
        if (p.type === 'shootDetails' && !shootDetails.visible) return false;
        if (p.type === 'termsPage' && termsPage.visible === false) return false;
        return true;
      });
  } else {
    const rawTypes: string[] = ['cover', 'aboutUs'];
    if (shootDetails.visible) rawTypes.push('shootDetails');
    rawTypes.push('functionsPage');
    rawTypes.push('deliverablesPage');
    if (specialValueAdditions.selectedItems && specialValueAdditions.selectedItems.length > 0) {
      rawTypes.push('specialValueAdditions');
    }
    rawTypes.push('pricingPage');
    if (paymentTermsPage.steps && paymentTermsPage.steps.length > 0) {
      rawTypes.push('paymentTermsPage');
    }

    const addOnsSrc = loaded.addOnsPage || pagesObj.add_ons;
    if (addOnsSrc?.visible === true && Array.isArray(addOnsSrc.items) && addOnsSrc.items.length > 0) {
      rawTypes.push('addOnsPage');
    }

    if (termsPage.visible !== false) rawTypes.push('termsPage');
    rawTypes.push('thankYouPage');

    finalPageSequence = rawTypes.map(toPageSequenceItem);
  }

  return {
    ...d,
    ...loaded,
    look: loaded.look || d.look || 'cyprus-sand-dune',
    theme: loaded.theme || d.theme || d.look || 'cyprus-sand-dune',
    primaryFont: loaded.primaryFont || d.primaryFont || 'Cormorant Garamond',
    secondaryFont: loaded.secondaryFont || d.secondaryFont || 'Plus Jakarta Sans',
    designName: loaded.designName || d.designName || 'Minimalist Airy Proposal',
    colorPalette: loaded.colorPalette || d.colorPalette,
    cover,
    aboutUs,
    shootDetails,
    functionsPage,
    deliverablesPage,
    specialValueAdditions,
    pricingPage,
    paymentTermsPage,
    termsPage,
    thankYouPage,
    customPages: Array.isArray(loaded.customPages) && loaded.customPages.length > 0 ? loaded.customPages : (d.customPages || []),
    pageSequence: finalPageSequence
  };
}
