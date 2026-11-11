import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveUserDefaultQuotationTemplate } from '@/lib/quotation-template-resolver';
import { extractFinancialsFromQuotation, extractCoupleNameFromQuotation, syncQuotationToTeamManagerEvents, isPlaceholderCoupleName } from '@/lib/quotation-finance-sync';
import { pruneDocumentForListCache } from '@/lib/storage-safety';
import { isInvalidCoupleName } from '@/lib/ai-quotation-extractor';
import { clearLeadSummaryCache } from '@/lib/quotation-summary-cache';

const isBadVersionTitle = (title?: string | null): boolean => {
  if (!title) return true;
  const trimmed = String(title).trim();
  if (!trimmed || trimmed.startsWith('FW-')) return true;
  if (/^(?:Wedding Quotation|Wedding - Design 1|Quotation Template)$/i.test(trimmed)) return true;
  if (/^[।|.,:;!?'"\-–—\s]*(?:उनकी|इनकी|उनका|उनके|उनको|मेरी|हमारी)/i.test(trimmed)) return true;
  const prefix = trimmed.split(/\s*-\s*/)[0]?.trim();
  if (prefix && isInvalidCoupleName(prefix)) return true;
  return false;
};

const pickCleanCouple = (...candidates: Array<string | null | undefined>): string => {
  for (const c of candidates) {
    if (c && !isInvalidCoupleName(c)) {
      return String(c)
        .replace(/^[\s।|.,:;!?'"\-–—]+|[\s।|.,:;!?'"\-–—]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }
  return 'Couple';
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

const DEFAULT_PAGE_SEQUENCE = [
  { id: 'cover', type: 'cover', label: 'Cover Page' },
  { id: 'aboutUs', type: 'aboutUs', label: 'About Us' },
  { id: 'shootDetails', type: 'shootDetails', label: 'Pre-Wedding Shoot' },
  { id: 'functionsPage', type: 'functionsPage', label: 'Functions & Coverage' },
  { id: 'deliverablesPage', type: 'deliverablesPage', label: 'Deliverables' },
  { id: 'specialValueAdditions', type: 'specialValueAdditions', label: 'Special Value Additions' },
  { id: 'pricingPage', type: 'pricingPage', label: 'Pricing Details' },
  { id: 'paymentTermsPage', type: 'paymentTermsPage', label: 'Payment Terms' },
  { id: 'addOnsPage', type: 'addOnsPage', label: 'Add-Ons & Extras' },
  { id: 'termsPage', type: 'termsPage', label: 'Terms & Conditions' },
  { id: 'thankYouPage', type: 'thankYouPage', label: 'Thank You' },
];

const DEFAULT_AIRY_PROPOSAL = {
  designName: 'Premium',
  eventGroup: 'Wedding',
  look: 'Cyprus & Sand Dune',
  primaryFont: "'Cormorant Garamond', serif",
  secondaryFont: "'Plus Jakarta Sans', sans-serif",
  pageSequence: DEFAULT_PAGE_SEQUENCE,
  customPages: {},

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
    frameShape: 'arch',
    imagePosition: 'center',
  },
  
  aboutUs: {
    kicker: 'INTRODUCTION',
    heading: 'ABOUT US',
    text: 'Glowwed films strive to capture your love story in the most gracious way possible. All the memories of your event will be hand-picked with precision and made into films & photographs that you can cherish forever',
    signature: 'FOUNDER & DIRECTOR, AS',
    bottomBannerPhoto: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=80',
    bottomBannerHeight: 380,
    frameShape: 'full-width',
    photoFocalY: 50,
    photoWidth: 100,
    bgOpacity: 40,
    imagePosition: 'bottom',
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
    frameShape: 'arch',
    imagePosition: 'bottom',
    showExclusionsNote: false,
    exclusionsNote: 'This excludes travel, accommodation, food & any add-on services.',
  },

  functionsPage: {
    kicker: 'EVENT SCHEDULE',
    heading: 'Functions & Coverage',
    photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
    photoHeight: 380,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'arch',
    imagePosition: 'bottom',
    items: [
      {
        id: 'func-1',
        name: 'Haldi & Sangeet',
        date: '4 MAR 26',
        dateNotFixed: false,
        startTime: '10:00 AM',
        endTime: '05:00 PM',
        durationSlot: '7 Hours',
        location: 'JW MARRIOTT, MUMBAI',
        requirements: [
          { name: 'Candid Photography', qty: 2 },
          { name: 'Cinematography', qty: 2 },
          { name: 'Drone', qty: 1 },
        ],
        notes: 'Includes traditional setup & evening sangeet performances coverage.',
      },
      {
        id: 'func-2',
        name: 'Wedding',
        date: '5 MAR 26',
        dateNotFixed: false,
        startTime: '04:00 PM',
        endTime: '11:00 PM',
        durationSlot: '7 Hours',
        location: 'PALACE GROUNDS, MUMBAI',
        requirements: [
          { name: 'Candid Photography', qty: 2 },
          { name: 'Cinematography', qty: 2 },
          { name: 'Drone', qty: 1 },
          { name: 'Traditional Video', qty: 1 },
        ],
        notes: 'Varmala & Pheras high speed cinema capture.',
      }
    ]
  },

  deliverablesPage: {
    kicker: 'WHAT WE DELIVER',
    heading: 'DELIVERABLES',
    selectedItems: [
      '1 Teaser Video (1-2 Min)',
      '1 Main Highlight Film (15-20 Min)',
      '3 Instagram Reels',
      'All Raw Photos & Footage in Hard Drive',
      '75-80 Retouched High-Res Images'
    ],
    availableOptions: [
      '1 Teaser Video (1-2 Min)',
      '1 Main Highlight Film (15-20 Min)',
      '3 Instagram Reels',
      'All Raw Photos & Footage in Hard Drive',
      '75-80 Retouched High-Res Images'
    ]
  },

  specialValueAdditions: {
    kicker: 'EXCLUSIVE OFFERING',
    heading: 'Special Value Additions',
    selectedItems: [
      'Complimentary Same-Day Edit Reel',
      'Exclusive Pre-Wedding Drone Coverage',
      'Custom Leather-Bound Signature Album'
    ],
    availableOptions: [
      'Complimentary Same-Day Edit Reel',
      'Exclusive Pre-Wedding Drone Coverage',
      'Custom Leather-Bound Signature Album'
    ]
  },

  pricingPage: {
    kicker: 'INVESTMENT SUMMARY',
    heading: 'Pricing Details',
    packageTitle: 'Complete Wedding Experience',
    subTotalText: 'Sub Total',
    subTotalAmount: 250000,
    discountText: 'Special Discount',
    discountAmount: 25000,
    showGst: true,
    gstPercent: 18,
    finalAmount: 265500,
    showExclusionsNote: false,
    exclusionsNote: 'This excludes travel, accommodation, food & any add-on services.',
  },

  paymentTermsPage: {
    kicker: 'TERMS OF PAYMENT',
    heading: 'Payment Schedule',
    steps: [
      { id: 'p1', percent: '25%', title: 'Advance Booking', subtitle: 'To lock dates & team' },
      { id: 'p2', percent: '50%', title: 'On Event Day', subtitle: 'Before start of main function' },
      { id: 'p3', percent: '25%', title: 'On Final Delivery', subtitle: 'Upon preview approval' },
    ]
  },

  addOnsPage: {
    kicker: 'OPTIONAL EXTRAS',
    heading: 'Add-Ons & Extras',
    items: [
      { id: 'a1', title: 'Extra Traditional Video Team', price: '₹15,000 / Day' },
      { id: 'a2', title: 'Live Streaming Setup (YouTube HD)', price: '₹25,000 / Event' },
      { id: 'a3', title: 'Parent Keepsake Album (Mini)', price: '₹12,000 / Piece' }
    ]
  },

  termsPage: {
    kicker: 'POLICY & GUIDELINES',
    heading: 'Terms & Conditions',
    termsList: [
      'Travel and accommodation outside Mumbai to be borne by the client.',
      'Raw footage delivery requires client to provide an external SSD/HDD.',
      'Copyright of all imagery remains with Filmify Weddings for portfolio showcase.',
      'Booking amount is non-refundable upon date cancellation.'
    ]
  },

  thankYouPage: {
    kicker: 'THANK YOU',
    heading: 'WE LOOK FORWARD TO CAPTURING YOUR MEMORIES',
    message: 'Let us create timeless cinema together.',
    contactPhone: '+91 98765 43210',
    contactEmail: 'hello@filmifyweddings.com',
    contactWebsite: 'www.filmifyweddings.com'
  }
};

// GET /api/leads/[id]/quotations - Fetch all quotation versions for a specific lead
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const includeFull = req.nextUrl.searchParams.get('includeFull') === 'true';
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    let userId: string | null = null;
    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    const leadShortLower = leadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase();
    const leadShortUpper = leadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
    const leadShort6Lower = leadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toLowerCase();
    const leadShort6Upper = leadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();

    // 1. Fetch lead details first to collect all known quotation IDs & cached metadata
    const { data: leadRow } = await supabaseAdmin
      .from('leads')
      .select('id, workspace_id, name, full_name, email, phone, quotation_id, final_quotation_id, raw_payload')
      .eq('id', leadId)
      .maybeSingle();

    const effectiveLead: any = leadRow || {
      id: leadId,
      workspace_id: null,
      name: 'Client',
      full_name: 'Client',
      email: '',
      phone: '',
      quotation_id: null,
      final_quotation_id: null,
      raw_payload: {}
    };

    const rawPayload = effectiveLead.raw_payload || {};
    const knownIds = new Set<string>();
    if (effectiveLead.quotation_id) knownIds.add(effectiveLead.quotation_id);
    if (effectiveLead.final_quotation_id) knownIds.add(effectiveLead.final_quotation_id);
    if (rawPayload.quotation_id) knownIds.add(rawPayload.quotation_id);
    if (rawPayload.final_quotation_id) knownIds.add(rawPayload.final_quotation_id);
    const rawVersions: any[] = Array.isArray(rawPayload.quotation_versions) ? rawPayload.quotation_versions : [];
    const rawVersionByTid = new Map<string, any>();
    rawVersions.forEach((v: any) => {
      if (v.id) {
        knownIds.add(v.id);
        rawVersionByTid.set(String(v.id).toUpperCase(), v);
      }
      if (v.template_id) {
        knownIds.add(v.template_id);
        rawVersionByTid.set(String(v.template_id).toUpperCase(), v);
      }
    });

    const knownIdsList = Array.from(knownIds);

    // Build resilient OR filter for quotation_documents (includes upper & lower case matches)
    const docOrFilters = [
      `lead_id.eq.${leadId}`,
      `template_id.ilike.%${leadShortLower}%`,
      `template_id.ilike.%${leadShortUpper}%`
    ];
    if (knownIdsList.length > 0) {
      docOrFilters.push(`template_id.in.(${knownIdsList.map(id => `"${id}"`).join(',')})`);
      const validUuids = knownIdsList.filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
      if (validUuids.length > 0) {
        docOrFilters.push(`id.in.(${validUuids.map(id => `"${id}"`).join(',')})`);
      }
    }

    // 2. Fetch quotation documents (scalar-only unless includeFull=true to avoid 6MB TOAST decompression!),
    // responses & legacy quotes in parallel for <500ms latency
    const docSelectCols = includeFull
      ? 'id, template_id, lead_id, version, lead_version, content_json, created_at, updated_at'
      : 'id, template_id, lead_id, version, lead_version, created_at, updated_at';
    const quoteSelectCols = includeFull
      ? 'id, quotation_number, title, status, client_name, couple_names, client_notes, canvas_data, public_token, is_final, created_at, updated_at'
      : 'id, quotation_number, title, status, client_name, couple_names, client_notes, public_token, is_final, created_at, updated_at';

    const [docsRes, responsesRes, quotesRes] = await Promise.all([
      supabaseAdmin
        .from('quotation_documents')
        .select(docSelectCols as any)
        .or(docOrFilters.join(',')),
      supabaseAdmin
        .from('quotation_responses')
        .select('quotation_id, lead_version, response_type, client_name, client_notes, budget_amount, created_at')
        .eq('lead_id', leadId),
      supabaseAdmin
        .from('quotations')
        .select(quoteSelectCols as any)
        .or(`client_id.eq.${leadId},quotation_number.ilike.%${leadShortLower}%,quotation_number.ilike.%${leadShortUpper}%`)
    ]);

    // 3. Process quotation documents specifically for this lead with case-insensitive matching
    const matchedDocs: any[] = ((docsRes.data || []) as any[]).filter((doc: any) => {
      const docLeadId = doc.lead_id || doc.content_json?.lead_id;
      if (docLeadId && docLeadId === leadId) return true;
      if (doc.template_id) {
        const tidUpper = String(doc.template_id).toUpperCase();
        if (tidUpper.includes(leadShortUpper) || tidUpper.includes(leadShort6Upper)) return true;
        if (knownIdsList.some(k => tidUpper.includes(String(k).toUpperCase()))) return true;
      }
      return false;
    });

    // Auto-heal rows in quotation_documents where lead_id is missing
    matchedDocs.forEach((doc: any) => {
      if (!doc.lead_id) {
        supabaseAdmin.from('quotation_documents').update({ lead_id: leadId }).eq('id', doc.id).then(() => {});
      }
    });

    const allResponses: any[] = (responsesRes.data || []) as any[];
    const allQuotes: any[] = (quotesRes.data || []) as any[];

    const finalTargetId = (effectiveLead as any).final_quotation_id || (effectiveLead as any).raw_payload?.final_quotation_id;

    // Identify explicit lead_version > 0 docs so unversioned auto-stubs (lead_version: null & version: 1) never hide them
    const explicitVerNums = new Set<number>();
    matchedDocs.forEach((d: any) => {
      if (d.lead_version !== null && d.lead_version !== undefined && Number(d.lead_version) > 0) {
        explicitVerNums.add(Number(d.lead_version));
      }
    });

    const findMatchingQuote = (doc: any) =>
      allQuotes.find((q: any) =>
        q.id === doc.template_id ||
        q.quotation_number === doc.template_id ||
        q.id === doc.id ||
        (q.quotation_number && doc.template_id && (q.quotation_number.includes(doc.template_id) || doc.template_id.includes(q.quotation_number)))
      );

    // Filter out unversioned empty auto-draft stubs superseded by explicit lead_version docs
    const orphanSupersededTids = new Set<string>();
    const activeMatchedDocs = matchedDocs.filter((d: any) => {
      const tidUpper = String(d.template_id || d.id || '').toUpperCase();
      const matchedQ = findMatchingQuote(d);
      const rawVer = rawVersionByTid.get(tidUpper);
      const isFinalMatch = Boolean(
        (finalTargetId && (finalTargetId === d.template_id || finalTargetId === d.id)) ||
        matchedQ?.is_final === true ||
        matchedQ?.status === 'accepted' ||
        rawVer?.is_final === true
      );
      const explicitVer = (d.lead_version !== null && d.lead_version !== undefined && Number(d.lead_version) > 0)
        ? Number(d.lead_version)
        : 0;
      const tidVerMatch = typeof d.template_id === 'string' ? d.template_id.match(/-V(\d+)-/i) : null;
      const tidVer = tidVerMatch ? parseInt(tidVerMatch[1], 10) : 0;

      if (!explicitVer && Number(d.version || 1) === 1 && !matchedQ && !isFinalMatch) {
        if ((tidVer > 0 && explicitVerNums.has(tidVer)) || (explicitVerNums.size > 0 && isBadVersionTitle(rawVer?.title))) {
          orphanSupersededTids.add(tidUpper);
          return false;
        }
      }
      return true;
    });

    // Lightweight targeted enrichment ONLY for docs whose clean title/couple isn't in raw_payload or quotations yet
    const docMetaById = new Map<string, any>();
    if (!includeFull) {
      const missingMetaIds = activeMatchedDocs
        .filter((d: any) => {
          const tidUpper = String(d.template_id || d.id || '').toUpperCase();
          const matchedQ = findMatchingQuote(d);
          const rawVer = rawVersionByTid.get(tidUpper);
          const hasValidQuoteTitle = matchedQ && !isBadVersionTitle(matchedQ.title);
          const hasValidRawMeta = rawVer && (!isBadVersionTitle(rawVer.title) || (rawVer.couple_name && !isInvalidCoupleName(rawVer.couple_name)));
          return !hasValidQuoteTitle && !hasValidRawMeta;
        })
        .map((d: any) => d.id)
        .filter(Boolean);

      if (missingMetaIds.length > 0 && missingMetaIds.length <= 6) {
        try {
          const metaFetchPromise = supabaseAdmin
            .from('quotation_documents')
            .select([
              'id',
              'couple_name:content_json->cover->>coupleName',
              'groom_name:content_json->cover->>groomName',
              'bride_name:content_json->cover->>brideName',
              'event_type:content_json->cover->>eventType',
              'location_name:content_json->cover->>locationName',
              'design_name:content_json->>designName',
              'doc_title:content_json->>title',
              'event_group:content_json->>eventGroup',
              'doc_is_final:content_json->>is_final',
              'final_amount:content_json->pricingPage->>finalAmount'
            ].join(','))
            .in('id', missingMetaIds);
          const { data: metaRows } = await Promise.race([
            metaFetchPromise,
            new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 2800))
          ]);
          (metaRows || []).forEach((m: any) => {
            if (m?.id) docMetaById.set(m.id, m);
          });
        } catch (_) {}
      }
    }

    // Merge docs from quotation_documents and any legacy quotes from quotations table
    const docTemplateIds = new Set(activeMatchedDocs.map((d: any) => String(d.template_id).toUpperCase()));
    const legacyOnlyQuotes = allQuotes.filter((q: any) => {
      const qIdU = String(q.id || '').toUpperCase();
      const qNumU = String(q.quotation_number || '').toUpperCase();
      return !docTemplateIds.has(qIdU) && !docTemplateIds.has(qNumU);
    });

    // Merge any version recorded in raw_payload.quotation_versions not present in docsRes or orphan-superseded
    const missingRawVersions = rawVersions.filter((rv: any) => {
      const rId = String(rv.template_id || rv.id || '').toUpperCase();
      if (!rId || orphanSupersededTids.has(rId)) return false;
      const rvVer = Number(rv.version || 0);
      if (rvVer > 0 && explicitVerNums.has(rvVer) && isBadVersionTitle(rv.title)) return false;
      return !docTemplateIds.has(rId) && !legacyOnlyQuotes.some((q: any) =>
        String(q.id || '').toUpperCase() === rId || String(q.quotation_number || '').toUpperCase() === rId
      );
    });

    const combinedList = [
      ...activeMatchedDocs,
      ...legacyOnlyQuotes.map((q: any, i: number) => ({
        id: q.id,
        template_id: q.quotation_number || q.id,
        lead_id: leadId,
        version: (activeMatchedDocs.length || 0) + i + 1,
        lead_version: (activeMatchedDocs.length || 0) + i + 1,
        content_json: includeFull ? (q.canvas_data || q.content_json || {}) : {},
        created_at: q.created_at || new Date().toISOString(),
        updated_at: q.updated_at || q.created_at || new Date().toISOString()
      })),
      ...missingRawVersions.map((rv: any, i: number) => ({
        id: rv.id || `raw_v_${rv.version || i + 1}`,
        template_id: rv.template_id || rv.id,
        lead_id: leadId,
        version: rv.version || i + 1,
        lead_version: rv.version || i + 1,
        content_json: includeFull ? (rv.content_json || {}) : {},
        created_at: rv.created_at || new Date().toISOString(),
        updated_at: rv.updated_at || rv.created_at || new Date().toISOString()
      }))
    ];

    // Prioritize explicit lead_version > 0 docs first, then sort chronologically
    const sortedDocs = combinedList.sort((a: any, b: any) => {
      const aExp = (a.lead_version !== null && a.lead_version !== undefined && Number(a.lead_version) > 0) ? 1 : 0;
      const bExp = (b.lead_version !== null && b.lead_version !== undefined && Number(b.lead_version) > 0) ? 1 : 0;
      if (aExp !== bExp) return bExp - aExp;
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });

    const formattedQuotations = sortedDocs.map((doc: any, idx: number) => {
      const content = doc.content_json || {};
      const extractedMeta = docMetaById.get(doc.id);
      const tidUpper = String(doc.template_id || doc.id || '').toUpperCase();
      const rawVer = rawVersionByTid.get(tidUpper);
      const matchingQuote = findMatchingQuote(doc);

      const tidVerMatch = typeof doc.template_id === 'string' ? doc.template_id.match(/-V(\d+)-/i) : null;
      const tidVer = tidVerMatch ? parseInt(tidVerMatch[1], 10) : null;

      // Strictly prefer explicit doc.lead_version > content.lead_version > rawVer.version > tidVer > doc.version
      const explicitLeadVer = (doc.lead_version !== null && doc.lead_version !== undefined && Number(doc.lead_version) > 0)
        ? Number(doc.lead_version)
        : null;
      const resolvedVer = explicitLeadVer
        || (Number(content.lead_version) > 0 ? Number(content.lead_version) : null)
        || (rawVer?.version && Number(rawVer.version) > 0 ? Number(rawVer.version) : null)
        || tidVer
        || (doc.version && Number(doc.version) > 0 ? Number(doc.version) : null);
      const leadVer = resolvedVer || (idx + 1);

      const cover = content.cover || {};
      const coverCouple = cover.coupleName
        || (cover.groomName && cover.brideName ? `${cover.groomName} & ${cover.brideName}` : (cover.groomName || cover.brideName || ''))
        || extractedMeta?.couple_name
        || (extractedMeta?.groom_name && extractedMeta?.bride_name ? `${extractedMeta.groom_name} & ${extractedMeta.bride_name}` : (extractedMeta?.groom_name || extractedMeta?.bride_name || ''));

      const rawTitlePrefix = rawVer?.title && !isBadVersionTitle(rawVer.title)
        ? String(rawVer.title).split(/\s*-\s*/)[0]?.trim()
        : null;

      const coupleName = pickCleanCouple(
        coverCouple,
        rawVer?.couple_name,
        rawTitlePrefix,
        matchingQuote?.couple_names,
        matchingQuote?.client_name,
        effectiveLead.raw_payload?.couple_name,
        effectiveLead.raw_payload?.couple_names,
        (effectiveLead as any).couple_names,
        (effectiveLead as any).full_name,
        effectiveLead.name
      );

      const eventType = cover.eventType
        || extractedMeta?.event_type
        || content.eventGroup
        || extractedMeta?.event_group
        || 'Wedding';

      const cleanEventType = String(eventType).replace(/quotation/i, '').trim() || 'Wedding';
      const customMetaDesign = (!isBadVersionTitle(extractedMeta?.design_name) ? extractedMeta.design_name : null)
        || (!isBadVersionTitle(content.designName) ? content.designName : null)
        || (!isBadVersionTitle(matchingQuote?.title) ? matchingQuote?.title : null)
        || (!isBadVersionTitle(rawVer?.title) ? rawVer?.title : null);

      const title = customMetaDesign || `${coupleName} - ${cleanEventType} Quotation`;

      const versionResponsesList = allResponses.filter((r: any) =>
        r.quotation_id === doc.template_id || Number(r.lead_version) === Number(leadVer)
      );

      const versionResponses = versionResponsesList.map((r: any) => {
        if (r.response_type === 'accepted') {
          return {
            type: 'accepted',
            label: '✓ Accepted',
            clientName: r.client_name,
            clientNotes: r.client_notes,
            created_at: r.created_at
          };
        } else {
          return {
            type: 'budget_discussion',
            label: 'Budget Discussion',
            budgetAmount: r.budget_amount,
            clientName: r.client_name,
            clientNotes: r.client_notes,
            created_at: r.created_at
          };
        }
      });

      const responseBadge = versionResponses[0] || null;

      const isFinal = Boolean(
        (finalTargetId && (
          finalTargetId === doc.template_id ||
          finalTargetId === doc.id ||
          (matchingQuote && (matchingQuote.id === finalTargetId || matchingQuote.quotation_number === finalTargetId)) ||
          (doc.template_id && (finalTargetId.includes(doc.template_id) || doc.template_id.includes(finalTargetId)))
        )) ||
        content.is_final === true ||
        extractedMeta?.doc_is_final === 'true' ||
        rawVer?.is_final === true ||
        (matchingQuote as any)?.is_final === true ||
        matchingQuote?.status === 'accepted'
      );

      const displayTitle = isFinal
        ? `${coupleName || 'Client'} - Final Quotation`
        : title;

      const baseItem = {
        id: doc.id,
        template_id: doc.template_id,
        lead_id: leadId,
        version: leadVer,
        version_label: `V${leadVer}`,
        title: displayTitle,
        couple_name: coupleName,
        content_json: includeFull ? content : {
          designName: displayTitle,
          eventGroup: cleanEventType,
          cover: {
            coupleName,
            eventType: cleanEventType,
            locationName: cover.locationName || extractedMeta?.location_name || ''
          },
          ...(extractedMeta?.final_amount ? { pricingPage: { finalAmount: Number(extractedMeta.final_amount) || undefined } } : {})
        },
        is_final: isFinal,
        updated_at: doc.updated_at || doc.created_at || new Date().toISOString(),
        created_at: doc.created_at || new Date().toISOString(),
        public_token: matchingQuote?.public_token || null,
        responseBadge,
        responses: versionResponses
      };

      return includeFull ? baseItem : {
        ...pruneDocumentForListCache(baseItem),
        public_token: baseItem.public_token,
        responseBadge: baseItem.responseBadge,
        responses: baseItem.responses
      };
    });

    // Deduplicate STRICTLY by canonical template_id (never silently drop a distinct version on version-number collision!)
    const seenTids = new Set<string>();
    const uniqueQuotations: typeof formattedQuotations = [];
    for (const q of formattedQuotations) {
      const tid = String(q.template_id || q.id).toUpperCase();
      if (!tid || seenTids.has(tid)) continue;
      seenTids.add(tid);
      uniqueQuotations.push(q);
    }

    // Sort versions descending for modal display: V3, V2, V1 (tie-break by updated_at desc)
    uniqueQuotations.sort((a, b) => {
      if (b.version !== a.version) return b.version - a.version;
      return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime();
    });

    // Sync cleaned lightweight versions into lead.raw_payload whenever items or titles differ (fixes corrupted/stale cache)
    try {
      const existingRaw = effectiveLead.raw_payload || {};
      const existingVers = Array.isArray(existingRaw.quotation_versions) ? existingRaw.quotation_versions : [];
      const sig = (arr: any[]) =>
        arr.map(x => `${x.template_id || x.id}:${x.version}:${x.title || ''}:${Boolean(x.is_final)}`).join('|');

      const lightweightVersions = uniqueQuotations.map(q => ({
        id: q.id,
        template_id: q.template_id,
        version: q.version,
        version_label: q.version_label,
        title: q.title,
        couple_name: q.couple_name,
        is_final: q.is_final,
        created_at: q.created_at,
        updated_at: q.updated_at
      }));

      if (sig(existingVers) !== sig(lightweightVersions)) {
        supabaseAdmin.from('leads').update({
          raw_payload: {
            ...existingRaw,
            quotation_versions: lightweightVersions
          }
        }).eq('id', leadId).then(() => {
          clearLeadSummaryCache(effectiveLead.workspace_id || undefined);
        });
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      lead: { id: effectiveLead.id, name: effectiveLead.name, email: effectiveLead.email, phone: effectiveLead.phone },
      quotations: uniqueQuotations,
      count: uniqueQuotations.length
    });
  } catch (err: any) {
    console.error('[GET /api/leads/[id]/quotations] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/leads/[id]/quotations - Create a new quotation version linked to lead
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    let currentUserId = 'demo_user';
    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        currentUserId = user.id;
      }
    }

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    // 1. Fetch lead details from Supabase
    const { data: lead, error: leadErr } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .maybeSingle();

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found in Supabase' }, { status: 404 });
    }

    // 2. Fetch existing quotations (scalar-only) for this lead to calculate next version V
    const leadShort8 = leadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    const { data: existingDocs } = await supabaseAdmin
      .from('quotation_documents')
      .select('id, template_id, version, lead_version')
      .or(`lead_id.eq.${leadId},template_id.ilike.%${leadShort8}%`);

    let maxVersion = 0;
    (existingDocs || []).forEach((d: any) => {
      const explicitV = Number(d.lead_version) > 0 ? Number(d.lead_version) : 0;
      const tidMatch = typeof d.template_id === 'string' ? d.template_id.match(/-V(\d+)-/i) : null;
      const tidV = tidMatch ? parseInt(tidMatch[1], 10) : 0;
      const fallbackV = Number(d.version) > 1 ? Number(d.version) : 0;
      const v = explicitV || tidV || fallbackV;
      if (v > maxVersion) maxVersion = v;
    });
    const rawVersList: any[] = Array.isArray(lead.raw_payload?.quotation_versions) ? lead.raw_payload.quotation_versions : [];
    rawVersList.forEach((rv: any) => {
      const rvV = Number(rv?.version) || 0;
      if (rvV > maxVersion) maxVersion = rvV;
    });

    const nextLeadVersion = maxVersion + 1;
    const effectiveWsId = lead.workspace_id || currentUserId;
    const newTemplateId = `FW-L-${leadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}-V${nextLeadVersion}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();

    const body = await req.json().catch(() => ({}));
    const explicitTemplateId = body.explicitTemplateId || body.templateId;
    const sourceQuotationId = body.sourceQuotationId || body.sourceVersionId || body.fromVersionId;

    // 3. Source Document Resolution (Clone from existing quotation version if sourceQuotationId provided, else default template)
    let sourceJson: any = null;
    let sourceTemplateId = explicitTemplateId;

    if (sourceQuotationId) {
      const isIdUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sourceQuotationId);
      const { data: srcDoc } = await (isIdUuid
        ? supabaseAdmin
            .from('quotation_documents')
            .select('*')
            .or(`template_id.eq.${sourceQuotationId},id.eq.${sourceQuotationId}`)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : supabaseAdmin
            .from('quotation_documents')
            .select('*')
            .eq('template_id', sourceQuotationId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle());

      if (srcDoc?.content_json || srcDoc?.document_json) {
        sourceJson = srcDoc.content_json || srcDoc.document_json;
      } else {
        const { data: legacyQ } = await supabaseAdmin
          .from('quotations')
          .select('*')
          .or(`id.eq.${sourceQuotationId},quotation_number.eq.${sourceQuotationId}`)
          .maybeSingle();
        if (legacyQ?.content_json || legacyQ?.canvas_data) {
          sourceJson = legacyQ.content_json || legacyQ.canvas_data;
        }
      }
    }

    if (!sourceJson) {
      // Authoritative Default Template Resolution from Supabase
      const resolvedDefault = await resolveUserDefaultQuotationTemplate(currentUserId, currentUserId, explicitTemplateId);
      sourceTemplateId = resolvedDefault.templateId;
      sourceJson = resolvedDefault.document || DEFAULT_AIRY_PROPOSAL;
    }

    // 100% COMPLETE DEEP CLONE of the resolved document
    const newQuotationJson = typeof structuredClone === 'function' 
      ? structuredClone(sourceJson) 
      : JSON.parse(JSON.stringify(sourceJson));

    // Explicitly guarantee chosen template design tokens are preserved
    newQuotationJson.look = sourceJson.look || newQuotationJson.look || 'cyprus-sand-dune';
    newQuotationJson.theme = sourceJson.theme || sourceJson.look || newQuotationJson.theme || newQuotationJson.look;
    newQuotationJson.primaryFont = sourceJson.primaryFont || newQuotationJson.primaryFont || 'Cormorant Garamond';
    newQuotationJson.secondaryFont = sourceJson.secondaryFont || newQuotationJson.secondaryFont || 'Plus Jakarta Sans';
    if (sourceJson.colorPalette && !newQuotationJson.colorPalette) {
      newQuotationJson.colorPalette = sourceJson.colorPalette;
    }

    const rawLeadCouple = 
      lead.raw_payload?.couple_name ||
      lead.raw_payload?.couple_names ||
      (lead as any).couple_names ||
      (lead.name && !['client', 'valued client', 'lead'].includes(lead.name.toLowerCase().trim()) ? lead.name : '') ||
      (lead.client_name && !['client', 'valued client', 'lead'].includes(lead.client_name.toLowerCase().trim()) ? lead.client_name : '') ||
      lead.name ||
      'Valued Client';

    const leadName = rawLeadCouple;
    const groomName = rawLeadCouple.includes('&') ? rawLeadCouple.split('&')[0].trim() : rawLeadCouple;
    const brideName = rawLeadCouple.includes('&') ? rawLeadCouple.split('&')[1].trim() : 'Partner';

    newQuotationJson.lead_id = leadId;
    newQuotationJson.lead_version = nextLeadVersion;
    newQuotationJson.version = nextLeadVersion;
    newQuotationJson.is_final = false;

    if (!newQuotationJson.cover) newQuotationJson.cover = {};
    newQuotationJson.cover.coupleName = rawLeadCouple;
    newQuotationJson.cover.groomName = groomName;
    newQuotationJson.cover.brideName = brideName;

    if (lead.raw_payload?.venue || lead.raw_payload?.location) {
      newQuotationJson.cover.locationName = lead.raw_payload.venue || lead.raw_payload.location;
    }

    const eventType = newQuotationJson.cover?.eventType || 'Wedding';
    const quotationTitle = `${rawLeadCouple} - ${eventType} Quotation V${nextLeadVersion}`;
    newQuotationJson.designName = quotationTitle;
    newQuotationJson.title = quotationTitle;

    // Ensure payment term steps have unique IDs
    if (newQuotationJson.paymentTermsPage?.steps && Array.isArray(newQuotationJson.paymentTermsPage.steps)) {
      newQuotationJson.paymentTermsPage.steps = newQuotationJson.paymentTermsPage.steps.map((s: any, idx: number) => ({
        ...s,
        id: s.id || `pt_${Date.now()}_${idx}_${Math.random().toString(36).substring(7)}`,
        stepName: s.stepName || s.name || `Installment #${idx + 1}`,
        name: s.name || s.stepName || `Installment #${idx + 1}`
      }));
    }

    if (Array.isArray(newQuotationJson.pageSequence)) {
      newQuotationJson.pageSequence = newQuotationJson.pageSequence.map((p: any) => ({
        ...p,
        id: 'page_' + Math.random().toString(36).substring(2, 9)
      }));
    }

    if (Array.isArray(newQuotationJson.customPages)) {
      newQuotationJson.customPages = newQuotationJson.customPages.map((cp: any) => ({
        ...cp,
        id: 'cpage_' + Math.random().toString(36).substring(2, 9)
      }));
    }

    // 4. Save to quotation_documents with workspace_id, lead_id & lead_version
    const docPayload: any = {
      template_id: newTemplateId,
      workspace_id: effectiveWsId,
      user_id: currentUserId,
      version: nextLeadVersion,
      lead_id: leadId,
      lead_version: nextLeadVersion,
      content_json: newQuotationJson,
      created_at: now,
      updated_at: now
    };

    const { data: savedDoc, error: saveErr } = await supabaseAdmin
      .from('quotation_documents')
      .upsert(docPayload, { onConflict: 'template_id' })
      .select('id')
      .maybeSingle();

    if (saveErr) {
      console.warn('[POST /api/leads/[id]/quotations] Save warning (fallback without top-level lead_id):', saveErr.message);
      delete docPayload.lead_id;
      delete docPayload.lead_version;
      await supabaseAdmin
        .from('quotation_documents')
        .upsert(docPayload, { onConflict: 'template_id' });
    }

    // 5. Synchronously update leads.raw_payload.quotation_versions & quotations summary, plus clear summary cache
    const criticalSyncPromises: Promise<any>[] = [];

    try {
      const calcFin = extractFinancialsFromQuotation(newQuotationJson);
      criticalSyncPromises.push(
        (async () => {
          try {
            await supabaseAdmin.from('quotations').upsert({
              workspace_id: effectiveWsId,
              user_id: currentUserId,
              quotation_number: newTemplateId,
              title: quotationTitle,
              client_name: leadName,
              couple_names: leadName,
              total_amount: calcFin.final_total_amount,
              client_id: leadId,
              status: 'draft',
              is_final: false,
              created_at: now,
              updated_at: now
            }, { onConflict: 'workspace_id,quotation_number' });
          } catch (_) {}
        })()
      );
    } catch (finErr) {
      console.warn('[leads/[id]/quotations] extractFinancials note:', finErr);
    }

    criticalSyncPromises.push(
      (async () => {
        try {
          const { data: curLead } = await supabaseAdmin
            .from('leads')
            .select('raw_payload')
            .eq('id', leadId)
            .maybeSingle();

          const curRaw = curLead?.raw_payload || {};
          const prevVers = Array.isArray(curRaw.quotation_versions) ? curRaw.quotation_versions : [];
          const newVerEntry = {
            id: savedDoc?.id || newTemplateId,
            template_id: newTemplateId,
            version: nextLeadVersion,
            version_label: `V${nextLeadVersion}`,
            title: quotationTitle,
            couple_name: leadName,
            is_final: false,
            created_at: now,
            updated_at: now
          };
          const updatedVers = [newVerEntry, ...prevVers.filter((v: any) => v.template_id !== newTemplateId)];

          await supabaseAdmin.from('leads').update({
            quotation_id: newTemplateId,
            raw_payload: {
              ...curRaw,
              quotation_versions: updatedVers
            }
          }).eq('id', leadId);
        } catch (_) {}
      })()
    );

    await Promise.allSettled(criticalSyncPromises);
    clearLeadSummaryCache();

    // Non-blocking audit history & live logs
    if (savedDoc?.id) {
      (async () => {
        try {
          await supabaseAdmin.from('quotation_versions').insert({
            document_id: savedDoc.id,
            template_id: newTemplateId,
            user_id: currentUserId,
            version: nextLeadVersion,
            content_json: newQuotationJson,
            created_at: now
          });
        } catch (_) {}
      })();
    }

    (async () => {
      try {
        await supabaseAdmin.from('live_logs').insert({
          workspace_id: effectiveWsId,
          lead_id: leadId,
          event_type: 'lead_activity',
          message: `Created Quotation Version ${nextLeadVersion} ("${quotationTitle}")`,
          metadata: {
            action_type: 'quote_created',
            actor_name: 'Studio Admin',
            version: nextLeadVersion,
            template_id: newTemplateId,
            logged_at: now
          }
        });
      } catch (_) {}
    })();

    return NextResponse.json({
      success: true,
      templateId: newTemplateId,
      version: nextLeadVersion,
      quotation: newQuotationJson,
      message: `Quotation V${nextLeadVersion} created for ${leadName}`
    });
  } catch (err: any) {
    console.error('[POST /api/leads/[id]/quotations] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
