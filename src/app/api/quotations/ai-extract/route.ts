import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { DEFAULT_AIRY_PROPOSAL } from '@/lib/quotation-defaults';

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
 * Executes AI Extraction using OpenAI API (if OPENAI_API_KEY present) or Gemini API (if GEMINI_API_KEY present),
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

INSTRUCTIONS:
1. Extract couple names (Groom & Bride), event type, wedding location, dates.
2. Extract all event functions (Haldi, Mehendi, Sangeet, Wedding, Reception, Engagement, etc.) with dates, times, venues, and team coverage (photographers, cinematographers, drone, live streaming).
3. Extract deliverables (photos, videos, reels, albums, USB, RAW files, SDE).
4. Extract pricing details (base price, travel, accommodation, discount, GST, total).
5. Extract payment terms & milestones.
6. Extract terms & conditions and special notes.
7. NEVER invent data not in context. Use null for missing fields.
8. Support custom values if not matching default options.
9. If two values conflict, flag them in the conflicts array.

Return ONLY a JSON object with:
{
  "couple": { "groomName": string | null, "brideName": string | null, "coupleName": string | null },
  "cover": { "eventType": string | null, "locationName": string | null, "weddingDate": string | null },
  "functions": [
    { "name": string, "date": string | null, "venue": string | null, "photographers": number | null, "cinematographers": number | null, "drone": boolean }
  ],
  "deliverables": [string],
  "pricing": { "basePrice": number | null, "discountAmount": number | null, "travelCharges": number | null, "accommodationCharges": number | null, "totalAmount": number | null },
  "payment_schedule": [ { "name": string, "pct": string, "amount": number | null } ],
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
  const leadInfo = contextData.lead_info || {};
  const raw = contextData.raw_form_fields || {};
  const meta = contextData.meta_fields || {};
  const notes = `${contextData.notes_and_comments || ''} ${contextData.additional_user_notes || ''}`;

  const fullText = `${JSON.stringify(raw)} ${JSON.stringify(meta)} ${notes}`.toLowerCase();

  // 1. Couple & Names
  let leadName = leadInfo.name || raw.name || raw.client_name || raw.full_name || '';
  let groomName = '';
  let brideName = '';

  if (leadName.includes('&')) {
    const parts = leadName.split('&');
    groomName = parts[0].trim();
    brideName = parts[1].trim();
  } else if (leadName.toLowerCase().includes(' weds ')) {
    const parts = leadName.split(/weds/i);
    groomName = parts[0].trim();
    brideName = parts[1].trim();
  } else {
    groomName = leadName || 'Groom';
    brideName = 'Bride';
  }

  // 2. Dates
  let weddingDate = raw.event_date || raw.wedding_date || raw.date || null;
  if (!weddingDate) {
    const dateMatch = notes.match(/\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(?:\d{2,4})?)\b/i);
    if (dateMatch) weddingDate = dateMatch[1];
  }

  // 3. Location / Venue
  let location = raw.venue || raw.location || raw.city || raw.destination || null;
  if (!location) {
    const locMatch = notes.match(/(?:at|in|venue|location)[:\s]+([A-Za-z0-9\s,]+)/i);
    if (locMatch) location = locMatch[1].split('.')[0].trim();
  }

  // 4. Budget / Pricing
  let budget: number | null = null;
  const rawBudget = raw.budget || raw.package_budget || raw.pricing || null;
  if (rawBudget) {
    const num = parseInt(String(rawBudget).replace(/[^0-9]/g, ''));
    if (!isNaN(num) && num > 0) budget = num;
  }
  if (!budget) {
    const bMatch = notes.match(/(?:₹|rs\.?|inr|budget)[:\s]*([0-9,]+(?:\s*lakh|\s*k)?)/i);
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

  // 5. Functions & Coverage
  const functions: any[] = [];
  const functionNames = ['Haldi', 'Mehendi', 'Sangeet', 'Wedding', 'Reception', 'Engagement', 'Cocktail', 'Mayra', 'Ganesh Puja'];
  functionNames.forEach(fn => {
    if (fullText.includes(fn.toLowerCase())) {
      functions.push({
        name: fn,
        date: weddingDate,
        venue: location,
        photographers: fullText.includes('photo') ? 2 : 1,
        cinematographers: fullText.includes('video') || fullText.includes('cinema') ? 2 : 1,
        drone: fullText.includes('drone')
      });
    }
  });

  if (functions.length === 0) {
    functions.push({
      name: 'Wedding Ceremony',
      date: weddingDate,
      venue: location,
      photographers: 2,
      cinematographers: 2,
      drone: fullText.includes('drone')
    });
  }

  // 6. Deliverables
  const deliverables: string[] = [
    'Full Ultra HD Super-Fine Raw Photos',
    'High Resolution Edited Photos (300+)',
    'Cinematic Teaser (3-5 Mins)',
    'Traditional Wedding Film (30-45 Mins)'
  ];
  if (fullText.includes('reel')) deliverables.push('Instagram Reels Package (5 Reels)');
  if (fullText.includes('drone')) deliverables.push('Drone Aerial Videography');
  if (fullText.includes('album')) deliverables.push('Premium Photobook Album');

  // 7. Conflicts detection
  const conflicts: any[] = [];
  if (raw.event_date && notes.includes('date') && !notes.includes(raw.event_date)) {
    const noteDateMatch = notes.match(/\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i);
    if (noteDateMatch && noteDateMatch[0] !== raw.event_date) {
      conflicts.push({
        field: 'wedding_date',
        values: [raw.event_date, noteDateMatch[0]],
        message: `Conflict in Wedding Date: Lead form states "${raw.event_date}" vs notes state "${noteDateMatch[0]}"`
      });
    }
  }

  // 8. Missing Information
  const missingInformation: string[] = [];
  if (!location) missingInformation.push('Wedding venue / location');
  if (!budget) missingInformation.push('Package pricing & investment');
  if (!weddingDate) missingInformation.push('Wedding date');

  return {
    couple: { groomName, brideName, coupleName: `${groomName} & ${brideName}` },
    cover: { eventType: 'Wedding', locationName: location || 'MUMBAI', weddingDate },
    functions,
    deliverables,
    pricing: { basePrice: budget || 150000, discountAmount: 0, travelCharges: 0, accommodationCharges: 0, totalAmount: budget || 150000 },
    payment_schedule: [
      { name: 'Advance Booking', pct: '25%', amount: budget ? Math.round(budget * 0.25) : 37500 },
      { name: 'On Event Day', pct: '50%', amount: budget ? Math.round(budget * 0.50) : 75000 },
      { name: 'On Delivery', pct: '25%', amount: budget ? Math.round(budget * 0.25) : 37500 }
    ],
    missingInformation,
    conflicts
  };
}

/**
 * Maps raw AI extraction result into the exact StudioCore Quotation JSON document structure.
 */
function mapAiOutputToQuotationDocument(aiData: any, baseSchema: any, contextData: any) {
  const doc = JSON.parse(JSON.stringify(baseSchema));

  const couple = aiData.couple || {};
  const cover = aiData.cover || {};
  const pricing = aiData.pricing || {};

  // Cover Page
  if (!doc.cover) doc.cover = {};
  if (couple.coupleName) doc.cover.coupleName = couple.coupleName;
  if (couple.groomName) doc.cover.groomName = couple.groomName;
  if (couple.brideName) doc.cover.brideName = couple.brideName;
  if (cover.locationName) doc.cover.locationName = cover.locationName;
  if (cover.eventType) doc.cover.eventType = cover.eventType;

  // Functions Page
  if (!doc.functionsPage) doc.functionsPage = {};
  if (Array.isArray(aiData.functions) && aiData.functions.length > 0) {
    doc.functionsPage.items = aiData.functions.map((fn: any, idx: number) => ({
      id: `func-ai-${Date.now()}-${idx}`,
      name: fn.name || `Function ${idx + 1}`,
      date: fn.date || cover.weddingDate || 'TBD',
      time: fn.time || 'Full Day',
      venue: fn.venue || cover.locationName || 'Venue TBD',
      team: `${fn.photographers || 2} Photographers, ${fn.cinematographers || 2} Cinematographers${fn.drone ? ', Drone' : ''}`
    }));
  }

  // Deliverables Page
  if (!doc.deliverablesPage) doc.deliverablesPage = {};
  if (Array.isArray(aiData.deliverables) && aiData.deliverables.length > 0) {
    doc.deliverablesPage.selectedItems = aiData.deliverables;
  }

  // Pricing Page
  if (!doc.pricingPage) doc.pricingPage = {};
  if (pricing.basePrice) doc.pricingPage.basePrice = Number(pricing.basePrice);
  if (pricing.discountAmount !== undefined) doc.pricingPage.discountAmount = Number(pricing.discountAmount);
  if (pricing.travelCharges !== undefined) doc.pricingPage.travelCharges = Number(pricing.travelCharges);
  if (pricing.accommodationCharges !== undefined) doc.pricingPage.accommodationCharges = Number(pricing.accommodationCharges);

  // Payment Schedule
  if (!doc.paymentTermsPage) doc.paymentTermsPage = {};
  if (Array.isArray(aiData.payment_schedule) && aiData.payment_schedule.length > 0) {
    doc.paymentTermsPage.steps = aiData.payment_schedule.map((step: any) => ({
      name: step.name || 'Payment Milestone',
      pct: step.pct || '30%',
      amount: Number(step.amount || 0),
      status: 'Pending'
    }));
  }

  // Calculate Summary
  const coupleName = doc.cover.coupleName || `${doc.cover.groomName || 'Rahul'} & ${doc.cover.brideName || 'Neha'}`;
  const totalAmount = (doc.pricingPage.basePrice || 150000) - (doc.pricingPage.discountAmount || 0) + (doc.pricingPage.travelCharges || 0) + (doc.pricingPage.accommodationCharges || 0);

  const summary = {
    coupleName,
    weddingDate: cover.weddingDate || doc.functionsPage?.items?.[0]?.date || 'Date TBD',
    location: doc.cover.locationName || 'Location TBD',
    functionsCount: doc.functionsPage?.items?.length || 0,
    functionsList: (doc.functionsPage?.items || []).map((f: any) => f.name),
    photographers: 2,
    cinematographers: 2,
    totalInvestment: `₹${totalAmount.toLocaleString('en-IN')}`
  };

  // Handle Page Sequence Visibility (Remove pages if explicitly not required or empty)
  if (Array.isArray(doc.pageSequence)) {
    let filteredSeq = [...doc.pageSequence];

    // Pre-wedding shoot page check
    const hasPreWedding = aiData.pre_wedding?.pre_wedding_included !== false && (doc.shootDetails?.daysText || doc.shootDetails?.text || contextData.notes_and_comments?.toLowerCase().includes('pre wedding') || contextData.additional_user_notes?.toLowerCase().includes('pre wedding'));
    if (!hasPreWedding) {
      filteredSeq = filteredSeq.filter(p => (typeof p === 'string' ? p : p.id) !== 'shootDetails');
      if (doc.shootDetails) doc.shootDetails.visible = false;
    }

    // Special value additions check
    const hasSpecialValues = doc.specialValueAdditions?.selectedItems && doc.specialValueAdditions.selectedItems.length > 0;
    if (!hasSpecialValues) {
      filteredSeq = filteredSeq.filter(p => (typeof p === 'string' ? p : p.id) !== 'specialValueAdditions');
      if (doc.specialValueAdditions) doc.specialValueAdditions.visible = false;
    }

    // Add-ons page check
    const hasAddOns = doc.addOnsPage?.items && doc.addOnsPage.items.length > 0;
    if (!hasAddOns) {
      filteredSeq = filteredSeq.filter(p => (typeof p === 'string' ? p : p.id) !== 'addOnsPage');
      if (doc.addOnsPage) doc.addOnsPage.visible = false;
    }

    doc.pageSequence = filteredSeq;
  }

  return {
    document: doc,
    summary,
    missingInformation: aiData.missingInformation || [],
    conflicts: aiData.conflicts || []
  };
}
