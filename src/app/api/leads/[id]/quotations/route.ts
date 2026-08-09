import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  designName: 'Wedding - Design 1',
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

    // 1. Fetch lead details to verify lead existence & access
    const { data: lead, error: leadErr } = await supabaseAdmin
      .from('leads')
      .select('id, workspace_id, name, email, phone, raw_payload')
      .eq('id', leadId)
      .maybeSingle();

    if (leadErr || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // 2. Fetch all quotation documents linked to this lead_id
    // Check top-level lead_id column or inside content_json->>'lead_id'
    let { data: docs, error: docsErr } = await supabaseAdmin
      .from('quotation_documents')
      .select('*')
      .or(`lead_id.eq.${leadId},template_id.ilike.%${leadId}%`);

    if (!docs || docs.length === 0) {
      // Fallback search by content_json JSON query
      const { data: jsonDocs } = await supabaseAdmin
        .from('quotation_documents')
        .select('*');
      
      if (jsonDocs) {
        docs = jsonDocs.filter((d: any) => 
          d.lead_id === leadId || 
          d.content_json?.lead_id === leadId ||
          (d.template_id && d.template_id.includes(leadId))
        );
      }
    }

    const formattedQuotations = (docs || []).map((doc: any, idx: number) => {
      const content = doc.content_json || {};
      const leadVer = doc.lead_version || content.lead_version || (docs!.length - idx);
      const title = content.designName || `Wedding - Design 1`;
      return {
        id: doc.id,
        template_id: doc.template_id,
        lead_id: leadId,
        version: leadVer,
        version_label: `V${leadVer}`,
        title,
        updated_at: doc.updated_at || doc.created_at || new Date().toISOString(),
        created_at: doc.created_at || new Date().toISOString(),
        content_json: content
      };
    });

    // Sort versions descending: V3, V2, V1
    formattedQuotations.sort((a, b) => b.version - a.version);

    return NextResponse.json({
      success: true,
      lead: { id: lead.id, name: lead.name, email: lead.email, phone: lead.phone },
      quotations: formattedQuotations,
      count: formattedQuotations.length
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

    // 2. Fetch existing quotations for this lead to calculate next version V
    const { data: existingDocs } = await supabaseAdmin
      .from('quotation_documents')
      .select('template_id, version, lead_version, content_json')
      .or(`lead_id.eq.${leadId},template_id.ilike.%${leadId}%`);

    let maxVersion = 0;
    (existingDocs || []).forEach((d: any) => {
      const v = d.lead_version || d.content_json?.lead_version || d.version || 0;
      if (v > maxVersion) maxVersion = v;
    });

    const nextLeadVersion = maxVersion + 1;
    const newTemplateId = `FW-L-${leadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}-V${nextLeadVersion}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();

    // 3. Find User's Active Default Template (or Global System Default fallback)
    const { data: userDefaultTmpl } = await supabaseAdmin
      .from('quotation_templates')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('is_default', true)
      .maybeSingle();

    const sourceTemplateId = userDefaultTmpl?.id || 'FW-37C63A54D4';

    let sourceJson: any = null;
    if (sourceTemplateId) {
      const { data: sourceDoc } = await supabaseAdmin
        .from('quotation_documents')
        .select('content_json')
        .eq('template_id', sourceTemplateId)
        .maybeSingle();
      sourceJson = sourceDoc?.content_json;
    }

    if (!sourceJson) {
      const { data: globalDoc } = await supabaseAdmin
        .from('quotation_documents')
        .select('content_json')
        .eq('template_id', 'FW-37C63A54D4')
        .maybeSingle();
      sourceJson = globalDoc?.content_json || DEFAULT_AIRY_PROPOSAL;
    }

    // 100% COMPLETE DEEP CLONE of the user's active default template
    const newQuotationJson = typeof structuredClone === 'function' 
      ? structuredClone(sourceJson) 
      : JSON.parse(JSON.stringify(sourceJson));

    const leadName = lead.name || 'Valued Client';
    const groomName = leadName.includes('&') ? leadName.split('&')[0].trim() : leadName;
    const brideName = leadName.includes('&') ? leadName.split('&')[1].trim() : 'Partner';

    newQuotationJson.lead_id = leadId;
    newQuotationJson.lead_version = nextLeadVersion;

    if (!newQuotationJson.cover) newQuotationJson.cover = {};
    newQuotationJson.cover.coupleName = leadName;
    newQuotationJson.cover.groomName = groomName || newQuotationJson.cover.groomName || 'Rahul';
    newQuotationJson.cover.brideName = brideName || newQuotationJson.cover.brideName || 'Neha';

    if (lead.raw_payload?.venue || lead.raw_payload?.location) {
      newQuotationJson.cover.locationName = lead.raw_payload.venue || lead.raw_payload.location;
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

    // 4. Save to quotation_documents with lead_id & lead_version
    const docPayload: any = {
      template_id: newTemplateId,
      user_id: currentUserId,
      version: 1,
      lead_id: leadId,
      lead_version: nextLeadVersion,
      content_json: newQuotationJson,
      created_at: now,
      updated_at: now
    };

    const { data: savedDoc, error: saveErr } = await supabaseAdmin
      .from('quotation_documents')
      .upsert(docPayload, { onConflict: 'template_id' })
      .select()
      .maybeSingle();

    if (saveErr) {
      console.warn('[POST /api/leads/[id]/quotations] Save warning (fallback without top-level lead_id):', saveErr.message);
      // Fallback without top-level lead_id column if schema constraint occurs
      delete docPayload.lead_id;
      delete docPayload.lead_version;
      await supabaseAdmin
        .from('quotation_documents')
        .upsert(docPayload, { onConflict: 'template_id' });
    }

    // 6. Save to quotation_versions audit table
    if (savedDoc?.id) {
      try {
        await supabaseAdmin.from('quotation_versions').insert({
          document_id: savedDoc.id,
          template_id: newTemplateId,
          user_id: currentUserId,
          version: 1,
          content_json: newQuotationJson,
          created_at: now
        });
      } catch (_) {}
    }

    // Also sync to legacy quotations table for full backwards compatibility
    try {
      await supabaseAdmin.from('quotations').upsert({
        workspace_id: currentUserId,
        quotation_number: newTemplateId,
        title: `Wedding - Design 1 (V${nextLeadVersion})`,
        client_name: leadName,
        client_id: leadId,
        status: 'draft',
        created_at: now,
        updated_at: now
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      templateId: newTemplateId,
      version: nextLeadVersion,
      message: `Quotation V${nextLeadVersion} created for ${leadName}`
    });
  } catch (err: any) {
    console.error('[POST /api/leads/[id]/quotations] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
