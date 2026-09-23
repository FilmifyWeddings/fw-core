import { DEFAULT_AIRY_PROPOSAL, normalizeQuotationData } from '@/lib/quotation-defaults';
import { isPlaceholderCoupleName } from '@/lib/quotation-finance-sync';

/**
 * Standardized Crew Role Normalization Dictionary with Intelligent Fuzzy Matching
 */
export function normalizeCrewRoleName(rawRole: string): string {
  if (!rawRole) return 'Candid Photographer';
  const s = rawRole.toLowerCase().trim();

  // 0. Semi Cinematic / Semi Kinematic (MUST be checked before general Cinematographer!)
  if (
    s.includes('semi-cinematic') || 
    s.includes('semi cinematic') || 
    s.includes('semi-kinematic') || 
    s.includes('semi kinematic') || 
    s.includes('semi-cine') || 
    s.includes('semi cine') || 
    s.includes('semi cinema') || 
    s === 'sc' || 
    s === 'scv'
  ) {
    return 'Semi Cinematic';
  }

  // 0.1 Semi Standard / Semi Traditional (MUST be checked before general Traditional!)
  if (
    s.includes('semi-standard') || 
    s.includes('semi standard') || 
    s.includes('semi-traditional') || 
    s.includes('semi traditional') || 
    s.includes('semi-trad') || 
    s.includes('semi trad') || 
    s === 'ss' || 
    s === 'stv' || 
    s === 'sst'
  ) {
    return 'Semi Standard';
  }

  // 1. Cinematographer & all variations / spelling mistakes
  if (
    s.includes('cinematog') || 
    s.includes('cinematrap') ||
    s.includes('cinematraf') ||
    s.includes('cinematic') || 
    s.includes('cinema') || 
    s.includes('cine video') || 
    s.includes('cine') || 
    s === 'cv'
  ) {
    return 'Cinematographer';
  }

  // 2. Candid Photographer & spelling mistakes
  if (
    s.includes('candid photo') || 
    s.includes('candid photog') || 
    s.includes('candid') || 
    s.includes('candit') || 
    s.includes('kandid') || 
    s === 'cp'
  ) {
    return 'Candid Photographer';
  }

  // 3. Traditional Photographer
  if (
    s.includes('traditional photo') || 
    s.includes('trad photo') || 
    s.includes('tred photo') || 
    s.includes('treational photo') ||
    s.includes('trad photog') ||
    s === 'tp'
  ) {
    return 'Traditional Photographer';
  }

  // 4. Traditional Videographer
  if (
    s.includes('traditional video') || 
    s.includes('trad video') || 
    s.includes('tred video') || 
    s.includes('tred videography') ||
    s.includes('trad videop') ||
    s === 'tv'
  ) {
    return 'Traditional Videographer';
  }

  // 5. Drone Pilot
  if (s.includes('drone') || s.includes('dron') || s.includes('aerial') || s === 'dp') {
    return 'Drone Pilot';
  }

  // 6. Assistant / Helper
  if (s.includes('assistant') || s.includes('asistant') || s === 'ass' || s.includes('helper') || s.includes('light boy') || s.includes('lightman')) {
    return 'Assistant / Helper';
  }

  // 7. Social Media / Reels
  if (s.includes('social media') || s.includes('story creator') || s.includes('reel') || s.includes('reels') || s === 'rc') {
    return 'Social Media Reels Creator';
  }

  // 8. Live streaming
  if (s.includes('live') || s.includes('streaming') || s.includes('led') || s === 'ls') {
    return 'Live Stream Operator';
  }

  // 9. Teaser
  if (s.includes('teaser') || s === 'ts') {
    return 'Teaser Specialist';
  }

  // 10. Editors
  if (s.includes('photo edit') || s.includes('retouch') || s === 'pe') {
    return 'Photo Editor / Retoucher';
  }
  if (s.includes('video edit') || s === 've') {
    return 'Video Editor';
  }
  if (s.includes('album') || s === 'ad') {
    return 'Album Designer';
  }

  // Capitalize custom role nicely
  return rawRole.trim().replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Intelligent Fallback Extraction Engine when LLM API keys are not present
 */
export function fallbackHeuristicExtractor(contextData: any) {
  const userNotes = (contextData.additional_user_notes || '').trim();

  // If user pasted valid JSON directly into AI prompt notes, parse and unwrap it
  if (userNotes.startsWith('{') || userNotes.includes('{')) {
    try {
      const jsonMatch = userNotes.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.quotation || parsed.pages || parsed.cover || parsed.functionsPage || parsed.functions_coverage || parsed.pricingPage) {
          return mapAiOutputToQuotationDocument(parsed, {}, contextData);
        }
      }
    } catch (e) {}
  }

  const leadInfo = contextData.lead_info || {};
  const raw = contextData.raw_form_fields || {};
  const meta = contextData.meta_fields || {};
  const notes = `${userNotes}\n${contextData.notes_and_comments || ''}`;
  const fullText = `${notes} ${JSON.stringify(raw)} ${JSON.stringify(meta)}`.toLowerCase();

  // 1. Couple & Names
  let leadName = '';
  const noteNameMatch = userNotes.match(/(?:couple|client|bride|groom|name)[:\s]+([A-Za-z0-9\s&]+)/i);
  if (noteNameMatch) {
    leadName = noteNameMatch[1].split('\n')[0].trim();
  }

  // Check for "Quotation for X & Y" or "quote for X & Y"
  if (!leadName) {
    const forMatch = userNotes.match(/(?:quotation\s+for|quote\s+for|proposal\s+for|for)\s+([A-Za-z0-9\s&]+?)(?:\s+(?:wedding|reception|event|pre-wedding|haldi|sangeet|on|date|budget|\d)|$)/i);
    if (forMatch && forMatch[1].trim()) {
      leadName = forMatch[1].trim();
    }
  }

  // Check for standalone couple name pattern e.g. "Sagar & Vruddhi" or "Sagar weds Vruddhi"
  if (!leadName) {
    const couplePatternMatch = userNotes.match(/\b([A-Za-z]{2,25}\s*(?:&|weds|and|\+)\s*[A-Za-z]{2,25})\b/i);
    if (couplePatternMatch && couplePatternMatch[1].trim()) {
      leadName = couplePatternMatch[1].trim();
    }
  }

  if (!leadName) {
    leadName = leadInfo.name || raw.name || raw.client_name || raw.full_name || '';
  }

  let groomName = '';
  let brideName = '';
  let coupleName = '';

  if (leadName.includes('&')) {
    const parts = leadName.split('&');
    groomName = parts[0].trim();
    brideName = parts[1].trim();
    coupleName = `${groomName} & ${brideName}`;
  } else if (leadName.toLowerCase().includes(' weds ')) {
    const parts = leadName.split(/weds/i);
    groomName = parts[0].trim();
    brideName = parts[1].trim();
    coupleName = `${groomName} & ${brideName}`;
  } else if (leadName.toLowerCase().includes(' and ')) {
    const parts = leadName.split(/and/i);
    groomName = parts[0].trim();
    brideName = parts[1].trim();
    coupleName = `${groomName} & ${brideName}`;
  } else {
    groomName = leadName || 'Client';
    brideName = 'Partner';
    coupleName = leadName || 'Valued Client';
  }

  // 2. Event Type
  let eventType = 'Wedding';
  const hasPreWed = fullText.includes('pre wedding') || fullText.includes('pre-wedding') || fullText.includes('prewedding');
  const hasWed = fullText.includes('wedding') || fullText.includes('marriage') || fullText.includes('shaadi');
  const hasEng = fullText.includes('engagement') || fullText.includes('roka') || fullText.includes('ring ceremony');

  if (hasPreWed && hasWed) {
    eventType = 'Pre-Wedding & Wedding';
  } else if (hasPreWed && !hasWed) {
    eventType = 'Pre-Wedding';
  } else if (hasEng && !hasWed) {
    eventType = 'Engagement';
  } else if (fullText.includes('reception')) {
    eventType = 'Wedding & Reception';
  } else if (fullText.includes('maternity')) {
    eventType = 'Maternity Shoot';
  }

  // 3. Location / Venue
  let location = '';
  if (userNotes) {
    const locMatch = userNotes.match(/(?:at|in|venue|location|city|destination)[:\s]+([A-Za-z0-9\s,]+)/i);
    if (locMatch) {
      location = locMatch[1].split('\n')[0].trim();
    }
  }
  if (!location) {
    location = raw.venue || raw.location || raw.city || raw.destination || '';
  }

  // 4. Dates
  let weddingDate = '';
  const dateMatch = userNotes.match(/\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(?:\d{2,4})?)\b/i);
  if (dateMatch) {
    weddingDate = dateMatch[1];
  } else if (raw.event_date || raw.wedding_date || raw.date) {
    weddingDate = raw.event_date || raw.wedding_date || raw.date;
  }
  const isDateNotFixed = !weddingDate || fullText.includes('not fix') || fullText.includes('not fixed') || fullText.includes('tbd');
  if (isDateNotFixed && !weddingDate) {
    weddingDate = 'Date Not Fixed';
  }

  // 5. Budget / Pricing
  let budget: number | null = null;
  if (userNotes) {
    const bMatch = userNotes.match(/(?:₹|rs\.?|inr|budget|price|cost|investment|amount)[:\s]*([0-9,]+(?:\s*lakh|\s*k)?)/i) ||
                   userNotes.match(/\b([0-9]{2,3},[0-9]{3})\b/);
    if (bMatch) {
      let valStr = bMatch[1].toLowerCase();
      if (valStr.includes('lakh') || valStr.includes('l')) {
        const val = parseFloat(valStr.replace(/[^0-9.]/g, ''));
        if (!isNaN(val)) budget = Math.round(val * 100000);
      } else if (valStr.includes('k')) {
        const val = parseFloat(valStr.replace(/[^0-9.]/g, ''));
        if (!isNaN(val)) budget = Math.round(val * 1000);
      } else {
        const num = parseInt(valStr.replace(/[^0-9]/g, ''));
        if (!isNaN(num)) budget = num;
      }
    }
  }
  if (!budget) {
    const rawBudget = raw.budget || raw.package_budget || raw.pricing || null;
    if (rawBudget) {
      const num = parseInt(String(rawBudget).replace(/[^0-9]/g, ''));
      if (!isNaN(num) && num > 0) budget = num;
    }
  }
  const finalBudget = budget || 150000;

  // Extract custom times and location from notes
  let customStartTime = '';
  let customEndTime = '';
  const startMatch = userNotes.match(/(?:startTime|start_time|start|from|timing)[:\s]+["']?([0-9]{1,2}(?::[0-9]{2})?\s*(?:AM|PM|am|pm)?)["']?/i);
  if (startMatch) customStartTime = startMatch[1].trim();

  const endMatch = userNotes.match(/(?:endTime|end_time|end|to)[:\s]+["']?([0-9]{1,2}(?::[0-9]{2})?\s*(?:AM|PM|am|pm)?)["']?/i);
  if (endMatch) customEndTime = endMatch[1].trim();

  if (!location) {
    const locMatch2 = userNotes.match(/(?:location|venue)[:\s]+["']?([^"\n,}]+)["']?/i);
    if (locMatch2) location = locMatch2[1].trim();
  }

  // Extract requirements from notes if specified
  const parsedRequirements: any[] = [];

  // Check for Semi Cinematic / Semi Kinematic
  if (
    fullText.includes('semi-cinematic') || 
    fullText.includes('semi cinematic') || 
    fullText.includes('semi-kinematic') || 
    fullText.includes('semi kinematic') || 
    fullText.includes('semi cine') ||
    fullText.includes('semi-cine')
  ) {
    parsedRequirements.push({ name: 'Semi Cinematic', qty: 1 });
  }

  // Check for Semi Standard / Semi Traditional
  if (
    fullText.includes('semi-standard') || 
    fullText.includes('semi standard') || 
    fullText.includes('semi-traditional') || 
    fullText.includes('semi traditional') || 
    fullText.includes('semi trad') ||
    fullText.includes('semi-trad')
  ) {
    parsedRequirements.push({ name: 'Semi Standard', qty: 1 });
  }

  const reqMatches = [...userNotes.matchAll(/(?:name|role)?[:\s]*["']?([A-Za-z\s]+(?:Photographer|Videographer|Cinematographer|Drone|Pilot|Assistant|Creator|Person))["']?/gi)];
  if (reqMatches.length > 0) {
    reqMatches.forEach((m) => {
      const normalized = normalizeCrewRoleName(m[1]);
      if (normalized && !parsedRequirements.some(r => r.name === normalized)) {
        parsedRequirements.push({ name: normalized, qty: 1 });
      }
    });
  }
  const defaultRequirements = parsedRequirements.length > 0 ? parsedRequirements : [
    { name: 'Candid Photographer', qty: 1 },
    { name: 'Cinematographer', qty: 1 }
  ];

  // 6. Functions & Coverage Extraction
  const functions: any[] = [];
  const knownEvents = [
    { key: 'haldi + sangeet', name: 'Haldi + Sangeet' },
    { key: 'haldi', name: 'Haldi Ceremony' },
    { key: 'mehendi', name: 'Mehendi Ceremony' },
    { key: 'sangeet', name: 'Sangeet Night' },
    { key: 'wedding', name: 'Wedding Ceremony' },
    { key: 'reception', name: 'Reception' },
    { key: 'engagement', name: 'Ring Ceremony' },
    { key: 'cocktail', name: 'Cocktail Party' },
    { key: 'mayra', name: 'Mayra Function' },
    { key: 'ganesh puja', name: 'Ganesh Puja' }
  ];

  // Check multi-event combinations first
  let remainingText = fullText;
  if (remainingText.includes('haldi') && remainingText.includes('sangeet') && (remainingText.includes('same day') || remainingText.includes('haldi + sangeet') || remainingText.includes('haldi & sangeet'))) {
    functions.push({
      id: 'func-ai-1',
      name: 'Haldi + Sangeet',
      date: weddingDate || 'Date Not Fixed',
      dateNotFixed: isDateNotFixed,
      startTime: customStartTime,
      endTime: customEndTime,
      location: location || '',
      requirements: defaultRequirements,
      notes: ''
    });
    remainingText = remainingText.replace(/haldi/g, '').replace(/sangeet/g, '');
  }

  knownEvents.forEach((evt, idx) => {
    if (remainingText.includes(evt.key)) {
      functions.push({
        id: `func-ai-${idx + 2}`,
        name: evt.name,
        date: weddingDate || 'Date Not Fixed',
        dateNotFixed: isDateNotFixed,
        startTime: customStartTime,
        endTime: customEndTime,
        location: location || '',
        requirements: defaultRequirements,
        notes: ''
      });
    }
  });

  if (functions.length === 0) {
    functions.push({
      id: 'func-ai-def',
      name: 'Wedding Ceremony',
      date: weddingDate || 'Date Not Fixed',
      dateNotFixed: isDateNotFixed,
      startTime: customStartTime,
      endTime: customEndTime,
      location: location || '',
      requirements: defaultRequirements,
      notes: ''
    });
  }

  // 7. Deliverables
  const deliverables: string[] = [
    'Full Ultra HD Super-Fine Raw Photos',
    'High Resolution Edited Photos (300+)',
    'Cinematic Teaser (3-5 Mins)',
    'Traditional Wedding Film (30-45 Mins)'
  ];
  if (fullText.includes('reel')) deliverables.push('Instagram Reels Package (5 Reels)');
  if (fullText.includes('drone')) deliverables.push('Drone Aerial Videography');
  if (fullText.includes('album') || fullText.includes('photobook')) deliverables.push('Premium Photobook Album');

  // 8. Payment Schedule Installments (Custom percentages)
  let paymentSteps: any[] = [];
  if (fullText.includes('30%') && fullText.includes('50%') && fullText.includes('20%')) {
    paymentSteps = [
      { name: 'Advance Token', pct: '30%', amount: Math.round(finalBudget * 0.30), status: 'Pending' },
      { name: 'On Event Day', pct: '50%', amount: Math.round(finalBudget * 0.50), status: 'Pending' },
      { name: 'On Final Delivery', pct: '20%', amount: Math.round(finalBudget * 0.20), status: 'Pending' }
    ];
  } else if (fullText.includes('50%') && (fullText.includes('50%') || fullText.includes('half'))) {
    paymentSteps = [
      { name: 'Advance Booking', pct: '50%', amount: Math.round(finalBudget * 0.50), status: 'Pending' },
      { name: 'On Event Day / Delivery', pct: '50%', amount: Math.round(finalBudget * 0.50), status: 'Pending' }
    ];
  } else if (fullText.includes('20%') && fullText.includes('40%')) {
    paymentSteps = [
      { name: 'Advance Token', pct: '20%', amount: Math.round(finalBudget * 0.20), status: 'Pending' },
      { name: 'On Event Day', pct: '40%', amount: Math.round(finalBudget * 0.40), status: 'Pending' },
      { name: 'On Final Delivery', pct: '40%', amount: Math.round(finalBudget * 0.40), status: 'Pending' }
    ];
  } else {
    paymentSteps = [
      { name: 'Advance Booking Token', pct: '25%', amount: Math.round(finalBudget * 0.25), status: 'Pending' },
      { name: 'On Wedding Event Day', pct: '50%', amount: Math.round(finalBudget * 0.50), status: 'Pending' },
      { name: 'On Final Deliverables', pct: '25%', amount: Math.round(finalBudget * 0.25), status: 'Pending' }
    ];
  }

  return {
    cover: {
      coupleName,
      groomName,
      brideName,
      eventType,
      locationName: location
    },
    shootDetails: {
      visible: hasPreWed,
      daysText: '1 Day Shoot',
      crewText: 'Candid Photography\nCinematography\nDrone Pilot',
      deliverablesText: 'Full Ultra HD Super-Fine Raw Photos\nApprox. 50 High Resolution Edited Images\n1 Teaser Video Reel',
      showExclusionsNote: true
    },
    functionsPage: {
      items: functions
    },
    deliverablesPage: {
      selectedItems: deliverables
    },
    specialValueAdditions: {
      selectedItems: fullText.includes('free drone') ? ['Complimentary Drone Coverage'] : [],
      note: ''
    },
    pricingPage: {
      basePrice: finalBudget,
      discountAmount: 0,
      gstPct: 0,
      travelCharges: 0,
      accommodationCharges: 0,
      additionalCharges: 0,
      showExclusionsNote: true,
      note: ''
    },
    paymentTermsPage: {
      steps: paymentSteps
    },
    missingInformation: location ? [] : ['Wedding venue / location'],
    conflicts: []
  };
}

/**
 * Maps raw AI extraction result into the exact StudioCore Quotation JSON document structure.
 */
export function mapAiOutputToQuotationDocument(aiData: any, baseSchema: any, contextData: any) {
  const rootObj = aiData.quotation || aiData;

  // Check if user's notes or prompt explicitly confirmed any payment/advance was already received
  const allUserNotes = [
    contextData?.additionalNotes,
    contextData?.leadNotes,
    contextData?.notes,
    aiData?.notes
  ].filter(Boolean).join(' ').toLowerCase();

  const hasExplicitPaymentReceived = /\b(advance received|advance paid|already paid|already received|payment received|token received|token paid|amount received|amount paid)\b/i.test(allUserNotes);

  // Check if rootObj is ALREADY a structured StudioCore Quotation JSON document
  if (rootObj.cover || rootObj.functionsPage || rootObj.pricingPage || rootObj.pages) {
    const normDoc = normalizeQuotationData(rootObj, baseSchema);

    // Strictly ensure payment milestones default to Pending unless explicitly paid
    if (normDoc.paymentTermsPage?.steps && Array.isArray(normDoc.paymentTermsPage.steps)) {
      normDoc.paymentTermsPage.steps = normDoc.paymentTermsPage.steps.map((s: any) => {
        const stepStatusLower = String(s.status || '').toLowerCase().trim();
        const isPaid = (stepStatusLower === 'completed' || stepStatusLower === 'paid') && hasExplicitPaymentReceived;
        return {
          ...s,
          status: isPaid ? 'Completed' : 'Pending'
        };
      });
    }

    // Normalize crew role names across all functions in the document
    if (normDoc.functionsPage?.items && Array.isArray(normDoc.functionsPage.items)) {
      normDoc.functionsPage.items = normDoc.functionsPage.items.map((fn: any) => ({
        ...fn,
        name: fn.name || 'Wedding',
        date: fn.date || (fn.dateNotFixed ? 'Date Not Fixed' : 'Date Not Fixed'),
        dateNotFixed: fn.dateNotFixed ?? (!fn.date || fn.date === 'Date Not Fixed'),
        startTime: fn.startTime || '',
        endTime: fn.endTime || '',
        location: fn.location || '',
        notes: fn.notes || '',
        requirements: Array.isArray(fn.requirements)
          ? fn.requirements.map((r: any) => ({
              name: normalizeCrewRoleName(typeof r === 'string' ? r : r.name || ''),
              qty: Number(r.qty || 1)
            }))
          : [
              { name: 'Candid Photographer', qty: 1 },
              { name: 'Cinematographer', qty: 1 }
            ]
      }));
    }

    // Ensure showExclusionsNote is default ON (true)
    if (normDoc.shootDetails) normDoc.shootDetails.showExclusionsNote = true;
    if (normDoc.pricingPage) normDoc.pricingPage.showExclusionsNote = true;

    const cName = normDoc.cover?.coupleName || (normDoc.cover?.groomName ? `${normDoc.cover.groomName} & ${normDoc.cover.brideName}` : 'Client & Partner');
    const baseP = normDoc.pricingPage?.basePrice || 0;
    const discP = normDoc.pricingPage?.discountAmount || 0;
    const travP = normDoc.pricingPage?.travelCharges || 0;
    const accP = normDoc.pricingPage?.accommodationCharges || 0;
    const totAmount = baseP - discP + travP + accP;

    const summary = {
      coupleName: cName,
      weddingDate: normDoc.functionsPage?.items?.[0]?.date || normDoc.cover?.weddingDate || 'Date TBD',
      location: normDoc.cover?.locationName || 'Location TBD',
      functionsCount: normDoc.functionsPage?.items?.length || 0,
      functionsList: (normDoc.functionsPage?.items || []).map((f: any) => f.name),
      photographers: 2,
      cinematographers: 2,
      totalInvestment: `₹${totAmount.toLocaleString('en-IN')}`
    };

    return {
      document: normDoc,
      summary,
      missingInformation: [],
      conflicts: []
    };
  }

  const doc = JSON.parse(JSON.stringify(baseSchema));

  const cover = aiData.cover || aiData.couple || {};
  const shootDetails = aiData.shootDetails || {};
  const functionsPage = aiData.functionsPage || {};
  const deliverablesPage = aiData.deliverablesPage || {};
  const specialValueAdditions = aiData.specialValueAdditions || {};
  const pricingPage = aiData.pricingPage || aiData.pricing || {};
  const paymentTermsPage = aiData.paymentTermsPage || aiData.payment_schedule || {};

  // 1. Cover Page
  if (!doc.cover) doc.cover = {};
  if (cover.coupleName) doc.cover.coupleName = cover.coupleName;
  if (cover.groomName) doc.cover.groomName = cover.groomName;
  if (cover.brideName) doc.cover.brideName = cover.brideName;
  if (cover.eventType) doc.cover.eventType = cover.eventType;
  doc.cover.locationName = cover.locationName || '';

  // 2. Pre-Wedding Shoot Details Page
  if (shootDetails.visible || shootDetails.daysText || shootDetails.crewText) {
    if (!doc.shootDetails) doc.shootDetails = {};
    doc.shootDetails.visible = true;
    doc.shootDetails.daysText = shootDetails.daysText || '1 Day Shoot';
    if (shootDetails.crewText) doc.shootDetails.crewText = shootDetails.crewText;
    if (shootDetails.deliverablesText) doc.shootDetails.deliverablesText = shootDetails.deliverablesText;
    doc.shootDetails.showExclusionsNote = true;
  }

  // 3. Functions Page
  if (!doc.functionsPage) doc.functionsPage = {};
  const rawFuncs = functionsPage.items || aiData.functions || [];
  if (Array.isArray(rawFuncs) && rawFuncs.length > 0) {
    doc.functionsPage.items = rawFuncs.map((fn: any, idx: number) => {
      let requirementsList: { name: string; qty: number }[] = [];
      if (Array.isArray(fn.requirements)) {
        requirementsList = fn.requirements.map((r: any) => ({
          name: normalizeCrewRoleName(typeof r === 'string' ? r : r.name || ''),
          qty: Number(r.qty || 1)
        }));
      } else {
        if (fn.photographers) requirementsList.push({ name: 'Candid Photographer', qty: Number(fn.photographers) });
        if (fn.cinematographers) requirementsList.push({ name: 'Cinematographer', qty: Number(fn.cinematographers) });
        if (fn.drone) requirementsList.push({ name: 'Drone Pilot', qty: 1 });
      }

      if (requirementsList.length === 0) {
        requirementsList = [
          { name: 'Candid Photographer', qty: 1 },
          { name: 'Cinematographer', qty: 1 }
        ];
      }

      const isNotFixed = fn.dateNotFixed ?? (!fn.date || fn.date === 'Date Not Fixed' || fn.date === 'TBD');

      return {
        id: fn.id || `func-ai-${Date.now()}-${idx}`,
        name: fn.name || `Function ${idx + 1}`,
        date: isNotFixed ? 'Date Not Fixed' : fn.date,
        dateNotFixed: isNotFixed,
        startTime: fn.startTime || '',
        endTime: fn.endTime || '',
        location: fn.location || fn.venue || '',
        requirements: requirementsList,
        notes: fn.notes || ''
      };
    });
  }

  // 4. Deliverables Page
  if (!doc.deliverablesPage) doc.deliverablesPage = {};
  const rawDeliv = deliverablesPage.selectedItems || aiData.deliverables || [];
  if (Array.isArray(rawDeliv) && rawDeliv.length > 0) {
    doc.deliverablesPage.selectedItems = rawDeliv;
  }

  // 5. Special Value Additions Page
  if (!doc.specialValueAdditions) doc.specialValueAdditions = {};
  const rawSpecial = specialValueAdditions.selectedItems || [];
  if (Array.isArray(rawSpecial)) {
    doc.specialValueAdditions.selectedItems = rawSpecial;
  }

  // 6. Pricing Page
  if (!doc.pricingPage) doc.pricingPage = {};
  if (pricingPage.basePrice !== undefined) doc.pricingPage.basePrice = Number(pricingPage.basePrice);
  if (pricingPage.discountAmount !== undefined) doc.pricingPage.discountAmount = Number(pricingPage.discountAmount);
  if (pricingPage.gstPct !== undefined) doc.pricingPage.gstPct = Number(pricingPage.gstPct);
  if (pricingPage.travelCharges !== undefined) doc.pricingPage.travelCharges = Number(pricingPage.travelCharges);
  if (pricingPage.accommodationCharges !== undefined) doc.pricingPage.accommodationCharges = Number(pricingPage.accommodationCharges);
  if (pricingPage.additionalCharges !== undefined) doc.pricingPage.additionalCharges = Number(pricingPage.additionalCharges);
  doc.pricingPage.showExclusionsNote = true;

  // 7. Payment Terms Page
  if (!doc.paymentTermsPage) doc.paymentTermsPage = {};
  const rawSteps = paymentTermsPage.steps || (Array.isArray(paymentTermsPage) ? paymentTermsPage : aiData.payment_schedule) || [];
  if (Array.isArray(rawSteps) && rawSteps.length > 0) {
    doc.paymentTermsPage.steps = rawSteps.map((step: any) => {
      const stepStatusLower = String(step.status || '').toLowerCase().trim();
      const isPaid = (stepStatusLower === 'completed' || stepStatusLower === 'paid') && hasExplicitPaymentReceived;
      return {
        name: step.name || 'Payment Milestone',
        pct: step.pct || '30%',
        amount: Number(step.amount || 0),
        status: isPaid ? 'Completed' : 'Pending'
      };
    });
  }

  // Calculate Summary
  const coupleName = doc.cover.coupleName || `${doc.cover.groomName || 'Client'} & ${doc.cover.brideName || 'Partner'}`;
  const totalAmount = (doc.pricingPage.basePrice || 150000) - (doc.pricingPage.discountAmount || 0) + (doc.pricingPage.travelCharges || 0) + (doc.pricingPage.accommodationCharges || 0) + (doc.pricingPage.additionalCharges || 0);

  const summary = {
    coupleName,
    weddingDate: doc.functionsPage?.items?.[0]?.date || 'Date TBD',
    location: doc.cover.locationName || 'Location TBD',
    functionsCount: doc.functionsPage?.items?.length || 0,
    functionsList: (doc.functionsPage?.items || []).map((f: any) => f.name),
    photographers: 2,
    cinematographers: 2,
    totalInvestment: `₹${totalAmount.toLocaleString('en-IN')}`
  };

  const normalizedFinalDoc = normalizeQuotationData(doc, baseSchema);

  return {
    document: normalizedFinalDoc,
    summary,
    missingInformation: aiData.missingInformation || [],
    conflicts: aiData.conflicts || []
  };
}
