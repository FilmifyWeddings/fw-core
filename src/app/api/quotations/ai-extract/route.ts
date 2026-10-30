import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { DEFAULT_AIRY_PROPOSAL, normalizeQuotationData, sanitizeAndParseJson } from '@/lib/quotation-defaults';
import { resolveUserDefaultQuotationTemplate } from '@/lib/quotation-template-resolver';
import {
  normalizeCrewRoleName,
  fallbackHeuristicExtractor,
  mapAiOutputToQuotationDocument
} from '@/lib/ai-quotation-extractor';

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
    const { leadId, quotationId, explicitTemplateId, selectedTemplateId, currentDocument, additionalNotes } = body;

    let workspaceId = userId;
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, workspace_name')
      .eq('id', userId)
      .maybeSingle();
    if (profile?.id) workspaceId = profile.id;

    // 1. Fetch Lead or Synthesize from Document
    let lead: any = null;
    if (leadId && leadId !== 'draft') {
      const { data: matchedLead } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .maybeSingle();
      if (matchedLead) lead = matchedLead;
    }

    if (!lead) {
      lead = {
        id: leadId || quotationId || 'draft',
        name: body.clientName || currentDocument?.cover?.coupleName || 'Client',
        phone: '',
        email: '',
        status: 'Active',
        raw_payload: {},
        comments: []
      };
    }

    // 2. Fetch Existing Quotation Document or use currentDocument
    let existingDoc: any = currentDocument || null;
    if (!existingDoc && quotationId) {
      const { data: qDoc } = await supabaseAdmin
        .from('quotation_documents')
        .select('content_json')
        .or(`template_id.eq.${quotationId},id.eq.${quotationId}`)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (qDoc?.content_json) {
        existingDoc = qDoc.content_json;
      } else {
        const { data: qRecord } = await supabaseAdmin
          .from('quotations')
          .select('content_json')
          .eq('id', quotationId)
          .maybeSingle();
        if (qRecord?.content_json) existingDoc = qRecord.content_json;
      }
    }

    // STRICT GUARANTEE: If no document exists, resolve the explicitly selected template (or user default template)
    if (!existingDoc) {
      const templateToUse = explicitTemplateId || selectedTemplateId || body.templateId;
      const resolvedDefault = await resolveUserDefaultQuotationTemplate(
        workspaceId, 
        userId, 
        templateToUse
      );
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
      targetQId: quotationId || 'NEW',
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
 * Executes AI Extraction using OpenAI API or Gemini API,
 * or falls back to an intelligent structured extraction engine.
 */
async function performAiExtraction(contextData: any, baseDoc: any) {
  const userNotes = (contextData.additional_user_notes || '').trim();
  const baseSchema = baseDoc ? JSON.parse(JSON.stringify(baseDoc)) : JSON.parse(JSON.stringify(DEFAULT_AIRY_PROPOSAL));

  // PRIORITY 1: If user pasted valid structured JSON directly into AI prompt notes, parse and map immediately!
  const directParsed = sanitizeAndParseJson(userNotes);
  if (directParsed && typeof directParsed === 'object') {
    const root = directParsed.quotation || directParsed;
    if (root.cover || root.pages || root.functionsPage || root.functions_coverage || root.pricingPage || root.shootDetails) {
      console.log('[AI Extract] Direct JSON detected from prompt input - using direct mapping');
      return mapAiOutputToQuotationDocument(directParsed, baseSchema, contextData);
    }
  }

  const leanPromptContext = {
    lead_info: contextData.lead_info,
    raw_form_fields: contextData.raw_form_fields,
    meta_fields: contextData.meta_fields,
    notes_and_comments: contextData.notes_and_comments,
    additional_user_notes: contextData.additional_user_notes
  };

  const promptText = `
You are StudioCore AI — an intelligent quotation data extraction assistant for professional wedding photographers.

==================================================
🎯 YOUR TASK:
Analyze the client requirements, notes, or spoken conversation provided and convert them into a 100% structured StudioCore Quotation JSON document.

==================================================
🌟 CRITICAL TOP PRIORITY OVERRIDE MANDATES (MUST FOLLOW):

1. COUPLE NAME, EVENT TYPE & ROLES (HIGHEST PRIORITY):
- If user notes, prompt, or speech mentions ANY couple name (e.g. "सागर और रिद्धि" / "Sagar & Riddhi", "रोहन और सिमरन", "Atharva & Sakshi"):
  THIS STRICTLY AND ABSOLUTELY OVERRIDES any existing lead name or default template name!
- ALWAYS transliterate/translate names into clean Latin/English Title Case:
  * coupleName: "Sagar & Riddhi"
  * groomName: "Sagar"
  * brideName: "Riddhi"
- EVENT TYPE (cover.eventType):
  * Concise standard event type: e.g. "Wedding", "Pre-Wedding & Wedding", "Engagement", or "Reception".
  * NEVER append the word "Quotation" to eventType (e.g. "Wedding", NOT "Wedding Quotation").
- NEVER output Devanagari script for coupleName, groomName, brideName, or ceremony names. Always output polished English!
- Only use lead_info.name if NO couple name is stated anywhere in the user notes.

2. INDIAN CEREMONY NAMES & MULTI-DAY RESOLUTION:
- ALWAYS translate Hindi/Marathi/regional function names to clean standard English:
  * "वेडिंग" / "शादी" / "लग्न" / "फेरे" / "Barat" -> "Wedding Ceremony"
  * "हल्दी" / "हळद" / "Pithi" -> "Haldi Ceremony"
  * "घर पे एंट्री शूट" / "एंट्री" / "गृह प्रवेश" / "घर का शूट" -> "Home Entry Shoot"
  * "संगीत" -> "Sangeet Night"
  * "मेहंदी" -> "Mehendi Ceremony"
  * "सगाई" / "रिंग सेरेमनी" / "साखरपुडा" / "Roka" -> "Engagement Ceremony"
  * "रिसेप्शन" -> "Reception"
- DATES RESOLUTION & STRICT FORMAT:
  * Every date MUST strictly be formatted as "DD - MMM - YYYY" (e.g. "11 - Nov - 2026", "12 - Nov - 2026", "13 - Nov - 2026").
  * Default year is 2026.
  * Multi-day relative dates resolution: If user says "11 नवंबर" and then "नेक्स्ट डे पे हल्दी" (next day Haldi) and "उसके नेक्स्ट डे पे घर पे शूट" (next day after that home shoot):
    - Wedding Ceremony: "11 - Nov - 2026"
    - Haldi Ceremony: "12 - Nov - 2026"
    - Home Entry Shoot: "13 - Nov - 2026"
- TIMINGS & TIMES:
  * Convert times to standard 12-hour format with AM/PM (e.g. startTime: "11:00 AM", endTime: "11:00 PM", or "07:00 PM" - "11:00 PM").
  * For duration-only shoots like "घर पे 2 आवर्स का शूट", put startTime: "", endTime: "", and notes: "2 Hours Duration Coverage".

3. CREW REQUIREMENTS NORMALIZATION:
- In functionsPage.items, each item MUST have:
  "requirements": [ { "name": string, "qty": number } ]
- Use exact standardized role names:
  * "Traditional Photographer"
  * "Traditional Videographer"
  * "Candid Photographer"
  * "Cinematographer"
  * "Drone Pilot"
  * "Semi Cinematic"
  * "Semi Standard"
  * "Social Media Person"
  * "Reel Creator"
- If user mentions "कैन्डिड फोटोग्राफी, सिनेमैटोग्राफी, ट्रेडिशनल वीडियो और ट्रेडिशनल फोटो", output:
  [
    { "name": "Traditional Photographer", "qty": 1 },
    { "name": "Traditional Videographer", "qty": 1 },
    { "name": "Candid Photographer", "qty": 1 },
    { "name": "Cinematographer", "qty": 1 }
  ]

4. DELIVERABLES (deliverablesPage):
- selectedItems: Array of professional English strings (e.g. "Cinematic Wedding Highlight Film", "Cinematic Wedding Teaser", "Professionally Designed Wedding Album", "Mini Photo Book", "All Raw Photographs", "1 Year Google Drive Access").
- NEVER include pre-wedding deliverables here; those belong solely on shootDetails.

5. PRICING (pricingPage):
- STRICT PRICING & DISCOUNT LOGIC (REGULAR PRICE VS BEST OFFER PRICE):
  * basePrice (regularPrice): The gross standard regular package price before discount (Integer, e.g. 120000).
  * discountAmount: Difference between basePrice and best offer price (e.g. 120000 - 90000 = 30000).
  * If user mentions "एक लाख बीस हजार का कोटेशन लेकिन 90,000 में दे रहे हैं" -> basePrice: 120000, discountAmount: 30000.
  * If NO discount/offer mentioned, discountAmount MUST STRICTLY BE 0.
  * showExclusionsNote: true.
  * note: Summary of pricing (e.g. "Special offer package of ₹90,000 for Sagar & Riddhi").

6. PAYMENT TERMS (paymentTermsPage):
- steps: Array of payment milestones with custom percentages & amounts based on net price.
  * e.g. [{ "name": "Advance Token", "pct": "30%", "amount": 27000, "status": "Pending" }, { "name": "On Wedding Day", "pct": "50%", "amount": 45000, "status": "Pending" }, { "name": "On Final Delivery", "pct": "20%", "amount": 18000, "status": "Pending" }]
  * All step statuses MUST strictly be "Pending".

7. PRE-WEDDING SHOOT (shootDetails) - DEDICATED SEPARATE PAGE:
- If and ONLY IF pre-wedding is requested, set visible: true.
- If user did NOT explicitly request a pre-wedding shoot, keep visible: false!

==================================================
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
  const openAiKey = process.env.OPENAI_API_KEY || '';

  // 1. PRIMARY ENGINE: OpenAI GPT-4o-mini (Industry Standard Quotation Intelligence)
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
          messages: [
            { role: 'system', content: promptText },
            { role: 'user', content: `Please extract structured quotation JSON from this context:\n${JSON.stringify(leanPromptContext, null, 2)}` }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 1500
        }),
        signal: AbortSignal.timeout(30000)
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) {
          aiRawOutput = JSON.parse(content);
          console.log('[AI Extract] Successfully generated via OpenAI GPT-4o-mini');
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn('[OpenAI Call Error]:', res.status, errJson?.error?.code || errJson?.error?.message);
      }
    } catch (e: any) {
      console.warn('[OpenAI Call Exception/Timeout]:', e?.message || e);
    }
  }

  // Pre-wedding strict isolation check: if user did not ask for pre-wedding, keep shootDetails.visible = false
  if (aiRawOutput?.shootDetails) {
    const hasPreWedKeyword = /\b(pre-wedding|prewedding|pre wedding|previewing)\b/i.test(userNotes);
    if (!hasPreWedKeyword) {
      aiRawOutput.shootDetails.visible = false;
    }
  }

  // Fallback: Intelligent Heuristic Extraction Engine
  if (!aiRawOutput) {
    aiRawOutput = fallbackHeuristicExtractor(contextData);
  }

  // Map AI Output into StudioCore Quotation Schema
  return mapAiOutputToQuotationDocument(aiRawOutput, baseSchema, contextData);
}
