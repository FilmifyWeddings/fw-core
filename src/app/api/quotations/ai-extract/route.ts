import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { DEFAULT_AIRY_PROPOSAL, normalizeQuotationData } from '@/lib/quotation-defaults';
import { resolveUserDefaultQuotationTemplate } from '@/lib/quotation-template-resolver';

export const maxDuration = 60; // 60 seconds timeout for AI generation

/**
 * Authoritative Server-Side AI Quotation Extraction API
 * Constructs contextual prompt from:
 * 1. Current Lead Record (name, phone, email, raw_payload, comments, etc.)
 * 2. Current Quotation Document (if editing an existing version)
 * 3. Optional user-pasted extra notes (WhatsApp messages, client requirements, etc.)
 * 4. Actual StudioCore Quotation JSON Schema
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, userEmail } = await resolveRequestUser(req);
    const body = await req.json().catch(() => ({}));
    const { leadId, quotationId, additionalNotes } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    let workspaceId = userId;
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, workspace_name')
      .eq('id', userId)
      .maybeSingle();
    if (profile?.id) workspaceId = profile.id;

    // 1. Fetch & Verify Lead Ownership
    const { data: lead, error: leadErr } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .maybeSingle();

    if (leadErr || !lead) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 });
    }

    // Verify workspace access (unless super admin)
    if (userEmail !== 'sushantnawale700@gmail.com' && lead.workspace_id && lead.workspace_id !== workspaceId && lead.workspace_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized access to lead' }, { status: 403 });
    }

    // 2. Fetch Existing Quotation Document if quotationId / templateId provided
    let existingDoc: any = null;
    const targetQId = quotationId || body.templateId;
    if (targetQId) {
      const { data: qDoc } = await supabaseAdmin
        .from('quotation_documents')
        .select('content_json')
        .eq('template_id', targetQId)
        .maybeSingle();

      if (qDoc?.content_json) {
        existingDoc = qDoc.content_json;
      } else {
        const { data: qRecord } = await supabaseAdmin
          .from('quotations')
          .select('content_json')
          .eq('id', targetQId)
          .maybeSingle();
        if (qRecord?.content_json) existingDoc = qRecord.content_json;
      }
    }

    // STRICT GUARANTEE: If no document exists, resolve user's active default quotation template
    if (!existingDoc) {
      const resolvedDefault = await resolveUserDefaultQuotationTemplate(workspaceId, userId);
      existingDoc = resolvedDefault.document || DEFAULT_AIRY_PROPOSAL;
    }

    // 3. Assemble Combined Context Text
    const rawPayload = lead.raw_payload || {};
    const metaPayload = lead.raw_meta_payload || {};
    const commentsText = Array.isArray(lead.comments) ? lead.comments.map((c: any) => c.text || '').join('\n') : '';

    const contextData = {
      lead_info: {
        lead_id: lead.id,
        name: lead.name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        status: lead.status || '',
        score: lead.score || '',
        created_at: lead.created_at || ''
      },
      raw_form_fields: rawPayload,
      meta_fields: metaPayload,
      notes_and_comments: commentsText,
      additional_user_notes: additionalNotes || '',
      existing_quotation: existingDoc || null
    };

    console.log('[AI EXTRACTION REQUEST]', {
      leadId,
      workspaceId,
      targetQId: targetQId || 'NEW',
      hasAdditionalNotes: !!additionalNotes
    });

    // 4. Perform AI Extraction
    const extractionResult = await performAiExtraction(contextData, existingDoc);

    return NextResponse.json({
      success: true,
      extractedDocument: extractionResult.document,
      summary: extractionResult.summary,
      missingInformation: extractionResult.missingInformation,
      conflicts: extractionResult.conflicts,
      verification_required: extractionResult.conflicts.length > 0
    });
  } catch (error: any) {
    console.error('[AI Extract Error]:', error);
    return NextResponse.json({ error: error.message || 'AI extraction failed' }, { status: 500 });
  }
}

/**
 * Standardized Crew Role Normalization Dictionary
 */
function normalizeCrewRoleName(rawRole: string): string {
  if (!rawRole) return 'Candid Photographer';
  const s = rawRole.toLowerCase().trim();
  if (s.includes('cinematog') || s === 'cv' || s.includes('cine video') || s.includes('cinematic video') || s === 'cinematic') {
    return 'Cinematographer';
  }
  if (s.includes('traditional photo') || s === 'tp' || s.includes('trad photo') || s.includes('tred photo') || s.includes('treational photo')) {
    return 'Traditional Photographer';
  }
  if (s.includes('candid photo') || s === 'cp' || s.includes('candid photog') || s.includes('candid photos')) {
    return 'Candid Photographer';
  }
  if (s.includes('traditional video') || s === 'tv' || s.includes('trad video') || s.includes('tred video') || s.includes('tred videography')) {
    return 'Traditional Videographer';
  }
  if (s.includes('social media') || s.includes('story creator') || s.includes('social media manager')) {
    return 'Social Media Person';
  }
  if (s.includes('semi cine') || s.includes('semi-cine') || s.includes('sami cinematic')) {
    return 'Semi Cinematic';
  }
  if (s.includes('reel') || s.includes('reels') || s.includes('reel person') || s.includes('reel creator') || s.includes('reel maker')) {
    return 'Reel Creator';
  }
  if (s.includes('live') || s.includes('streaming') || s.includes('led') || s.includes('live videography')) {
    return 'Live Videography';
  }
  if (s.includes('drone') || s.includes('aerial')) {
    return 'Drone Pilot';
  }
  if (s.includes('assistant') || s === 'ass' || s.includes('helper') || s.includes('light boy')) {
    return 'Assistant';
  }
  if (s.includes('team manager') || s === 'tm' || s.includes('coordinator') || s.includes('event manager')) {
    return 'Team Manager';
  }
  if (s.includes('makeup') || s === 'mua' || s.includes('makup artist')) {
    return 'Makeup Artist';
  }
  if (s.includes('family photo') || s.includes('family photography') || s.includes('family photos')) {
    return 'Family Photographer';
  }
  // Capitalize custom role nicely
  return rawRole.trim().replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Executes AI Extraction using OpenAI API or Gemini API,
 * or falls back to an intelligent structured extraction engine.
 */
async function performAiExtraction(contextData: any, baseDoc: any) {
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const baseSchema = baseDoc ? JSON.parse(JSON.stringify(baseDoc)) : JSON.parse(JSON.stringify(DEFAULT_AIRY_PROPOSAL));

  const promptText = `
You are StudioCore AI — an intelligent quotation data extraction assistant for professional wedding photographers.

Analyze the following lead and quotation context:

${JSON.stringify(contextData, null, 2)}

PAGE-BY-PAGE RULES & MAPPING:
1. COVER (cover):
- coupleName: Exact couple name (e.g. "Sagar & Vruddhi").
- groomName: Groom name (e.g. "Sagar").
- brideName: Bride name (e.g. "Vruddhi").
- eventType: Title (e.g. "Wedding", "Pre-Wedding", "Pre-Wedding & Wedding", "Engagement", "Reception", "Maternity").
- locationName: Exact city/venue if mentioned. If NOT mentioned, keep it EMPTY string "" (DO NOT invent fake locations).

2. ABOUT US: Keep template defaults.

3. PRE-WEDDING SHOOT (shootDetails):
- If pre-wedding is mentioned or requested:
  - visible: true
  - daysText: e.g. "1 Day Shoot" (Default) or "2 Days Shoot"
  - crewText: "Candid Photography\\nCinematography\\nDrone Pilot"
  - deliverablesText: Expected pre-wedding deliverables
  - showExclusionsNote: true

4. FUNCTIONS & COVERAGE (functionsPage):
- items: Array of event objects:
  - id: Unique string "func_1", "func_2", etc.
  - name: Function name. Combine multi-events on same slot with " + " (e.g. "Haldi + Sangeet").
  - date: Exact date string if specified, or "Date Not Fixed" with dateNotFixed: true if not specified.
  - startTime / endTime: Exact time if specified, else EMPTY string "".
  - location: Venue or city if specified, else EMPTY string "".
  - notes: Special notes if specified, else EMPTY string "".
  - requirements: Array of { name: string, qty: number } using standard normalized names:
    * "Cinematographer", "Traditional Photographer", "Candid Photographer", "Traditional Videographer", "Social Media Person", "Semi Cinematic", "Reel Creator", "Live Videography", "Drone Pilot", "Assistant", "Team Manager", "Makeup Artist", "Family Photographer". (Custom roles allowed).

5. DELIVERABLES (deliverablesPage):
- selectedItems: Array of deliverable strings requested by user.

6. SPECIAL VALUE ADDITIONS (specialValueAdditions):
- selectedItems: Array of complimentary bonus items. If none, empty array [].

7. PRICING (pricingPage):
- basePrice: Total amount / package budget (Number).
- discountAmount, gstPct, travelCharges, accommodationCharges, additionalCharges (Numbers, default 0 if not mentioned).
- showExclusionsNote: true.

8. PAYMENT TERMS & SCHEDULE (paymentTermsPage):
- steps: Array of [{ name: string, pct: string, amount: number, status: "Pending" }]. Calculate amounts based on percentage breakdown if given.

OUTPUT FORMAT:
Return ONLY a valid JSON object matching:
{
  "cover": { "coupleName": string, "groomName": string, "brideName": string, "eventType": string, "locationName": string },
  "shootDetails": { "visible": boolean, "daysText": string, "crewText": string, "deliverablesText": string, "showExclusionsNote": boolean },
  "functionsPage": {
    "items": [
      {
        "id": string,
        "name": string,
        "date": string,
        "dateNotFixed": boolean,
        "startTime": string,
        "endTime": string,
        "location": string,
        "requirements": [ { "name": string, "qty": number } ],
        "notes": string
      }
    ]
  },
  "deliverablesPage": { "selectedItems": [string] },
  "specialValueAdditions": { "selectedItems": [string], "note": string },
  "pricingPage": { "basePrice": number, "discountAmount": number, "gstPct": number, "travelCharges": number, "accommodationCharges": number, "additionalCharges": number, "showExclusionsNote": boolean, "note": string },
  "paymentTermsPage": { "steps": [ { "name": string, "pct": string, "amount": number, "status": string } ] },
  "missingInformation": [string],
  "conflicts": [ { "field": string, "values": [string] } ]
}
`;

  let aiRawOutput: any = null;

  // Try OpenAI API
  if (openAiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: promptText }],
          response_format: { type: 'json_object' },
          temperature: 0.2
        })
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) aiRawOutput = JSON.parse(content);
      }
    } catch (e) {
      console.warn('[OpenAI Call Warning]:', e);
    }
  }

  // Try Gemini API if OpenAI failed or key absent
  if (!aiRawOutput && geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText + "\nRespond strictly in valid JSON." }] }]
        })
      });
      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) aiRawOutput = JSON.parse(jsonMatch[0]);
        }
      }
    } catch (e) {
      console.warn('[Gemini Call Warning]:', e);
    }
  }

  // Fallback: Intelligent Heuristic Extraction Engine
  if (!aiRawOutput) {
    aiRawOutput = fallbackHeuristicExtractor(contextData);
  }

  // Map AI Output into StudioCore Quotation Schema
  return mapAiOutputToQuotationDocument(aiRawOutput, baseSchema, contextData);
}

/**
 * Intelligent Fallback Extraction Engine when LLM API keys are not present
 */
function fallbackHeuristicExtractor(contextData: any) {
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
      startTime: '',
      endTime: '',
      location: location || '',
      requirements: [
        { name: 'Candid Photographer', qty: 1 },
        { name: 'Cinematographer', qty: 1 },
        { name: 'Traditional Photographer', qty: 1 }
      ],
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
        startTime: '',
        endTime: '',
        location: location || '',
        requirements: [
          { name: 'Candid Photographer', qty: 1 },
          { name: 'Cinematographer', qty: 1 }
        ],
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
      startTime: '',
      endTime: '',
      location: location || '',
      requirements: [
        { name: 'Candid Photographer', qty: 1 },
        { name: 'Cinematographer', qty: 1 }
      ],
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
function mapAiOutputToQuotationDocument(aiData: any, baseSchema: any, contextData: any) {
  const rootObj = aiData.quotation || aiData;

  // Check if rootObj is ALREADY a structured StudioCore Quotation JSON document
  if (rootObj.cover || rootObj.functionsPage || rootObj.pricingPage || rootObj.pages) {
    const normDoc = normalizeQuotationData(rootObj);

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
    doc.paymentTermsPage.steps = rawSteps.map((step: any) => ({
      name: step.name || 'Payment Milestone',
      pct: step.pct || '30%',
      amount: Number(step.amount || 0),
      status: step.status || 'Pending'
    }));
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

  return {
    document: doc,
    summary,
    missingInformation: aiData.missingInformation || [],
    conflicts: aiData.conflicts || []
  };
}
