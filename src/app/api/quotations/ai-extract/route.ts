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

Analyze the following lead and quotation context:

${JSON.stringify(leanPromptContext, null, 2)}

MULTILINGUAL & INDIAN WEDDING CULTURE MANDATE:
- The input notes or voice speech can be in Hindi, Marathi, English, Gujarati, Hinglish, or a mixed blend of Indian languages.
- You MUST comprehend Indian cultural wedding ceremonies and translate function names into clean, elegant professional English:
  * "हळद" / "हल्दी" / "Pithi" -> "Haldi Ceremony" (or "Haldi + Sangeet" if on the same date)
  * "संगीत" / "Sangeet" -> "Sangeet Night"
  * "मेहंदी" / "Mehendi" -> "Mehendi Ceremony"
  * "लग्न" / "शादी" / "Phere" / "Vivah" / "Barat" -> "Wedding Ceremony"
  * "साखरपुडा" / "सगाई" / "Ring Ceremony" / "Roka" -> "Engagement Ceremony"
  * "रिसेप्शन" / "Reception" -> "Reception"
  * "प्री-वेडिंग" / "Pre-wedding shoot" -> Put in shootDetails
- Extract couple names accurately from Indian language sentences:
  * e.g. "अथर्व आणि साक्षी" / "अथर्व और साक्षी" -> coupleName: "Atharva & Sakshi", groomName: "Atharva", brideName: "Sakshi"
- Indian Number & Currency Parsing:
  * "2.5 लाख" / "2.5L" / "अडीच लाख" -> 250000
  * "3 लाख" / "3L" -> 300000
  * "50 हजार" / "50k" -> 50000
  * "80k" -> 80000
- Crew Roles Translation:
  * "कैंडिड" / "Candid" -> "Candid Photographer"
  * "सिनेमैटो" / "Cinematography" / "Cinematographer" -> "Cinematographer"
  * "ड्रोन" / "Drone" -> "Drone Pilot"
  * "ट्रैडिशनल" / "Traditional" -> "Traditional Photographer"

PAGE-BY-PAGE RULES & MAPPING:
1. COVER (cover):
- coupleName: Exact couple name (e.g. "Sagar & Vruddhi").
- groomName: Groom name (e.g. "Sagar").
- brideName: Bride name (e.g. "Vruddhi").
- eventType: Title (e.g. "Wedding", "Pre-Wedding", "Pre-Wedding & Wedding", "Engagement", "Reception", "Maternity").
- locationName: SINGLE PRIMARY COVER LOCATION ONLY!
  * Strict Priority Order for Cover Location:
    1. Main Wedding ceremony venue/city (HIGHEST PRIORITY - e.g. "Taj Lake Palace, Udaipur").
    2. Reception or Engagement venue (if no Wedding venue specified).
    3. First mentioned venue/city.
  * NEVER concatenate multiple different event locations onto the cover page (NEVER output "Home, Sangeet Hall, Taj Lake Palace").
  * Individual event venues must stay inside their respective function cards in functionsPage.items!
  * If NOT mentioned anywhere, keep EMPTY string "" (DO NOT invent fake locations).

2. ABOUT US: Keep template defaults.

3. PRE-WEDDING SHOOT (shootDetails) - DEDICATED SEPARATE PAGE:
- If pre-wedding (or "previewing" / "pre wedding") is mentioned or requested:
  - visible: true
  - daysText: e.g. "1 Day Shoot" (Default) or "2 Days Shoot"
  - crewText: "Candid Photography\\nCinematography\\nDrone Pilot"
  - deliverablesText: Expected pre-wedding deliverables (e.g. "Full Ultra HD Super-Fine Raw Photos\\nApprox. 50 High Resolution Edited Images\\n1 Teaser Video Reel")
  - showExclusionsNote: true
- CRITICAL PRE-WEDDING ISOLATION RULE: Pre-Wedding has its own separate dedicated page (shootDetails)! ALL pre-wedding coverage details and ALL pre-wedding deliverables MUST be placed SOLELY on this shootDetails page!

4. FUNCTIONS & COVERAGE (functionsPage) - MAIN WEDDING FUNCTIONS ONLY:
- STRICT NEGATIVE RULE: NEVER add "Pre-Wedding" as an item inside functionsPage.items! Pre-wedding must NEVER appear as an event card under Functions & Coverage. Functions & Coverage is ONLY for wedding events (e.g. Haldi, Mehendi, Sangeet, Wedding Ceremony, Reception).
- CRITICAL SAME-DATE EVENT CONSOLIDATION MANDATE (MUST FOLLOW):
  * If two or more ceremonies/events occur on the SAME DATE or SAME DAY (for example: "22 February ko Haldi aur Sangeet hai", or "Haldi + Sangeet on 22 Feb", or Mehendi & Ring Ceremony on same date):
    YOU MUST COMBINE THEM INTO ONE SINGLE FUNCTION CARD!
    Name it by joining ceremony names with " + " (e.g. "Haldi + Sangeet", "Mehendi + Sangeet", "Puja + Haldi").
    DO NOT create separate cards for events occurring on the same date! Combine their crew requirements into that single card.
  * ONLY create separate cards for events that occur on DIFFERENT DATES (e.g. 21 Feb Mehendi card, 22 Feb Haldi + Sangeet card, 23 Feb Wedding card).
  * REAL CEREMONY NAMES MANDATE: NEVER output generic names like "Event 1", "Event 2", "Function 1", "Function 2". ALWAYS extract and use the real event names (Haldi, Mehendi, Sangeet, Ring Ceremony, Wedding, Reception, Cocktail, Mayra, Ganesh Puja, etc.).
- items: Array of event objects:
  - id: Unique string "func_1", "func_2", etc.
  - name: Function name. Combine multi-events on same date/slot with " + " (e.g. "Haldi + Sangeet").
  - date: CRITICAL DATE FORMAT MANDATE: Every date MUST strictly be formatted as "DD - MMM - YYYY" (e.g. "13 - Dec - 2026", "22 - Feb - 2026"). NEVER output ISO dates like 2026-12-13. If not specified, "Date Not Fixed" with dateNotFixed: true.
  - startTime / endTime: Exact time if specified, else EMPTY string "".
  - location: Venue or city if specified, else EMPTY string "".
  - notes: Special notes if specified, else EMPTY string "".
  - requirements: Array of { name: string, qty: number } using standard normalized names:
    * "Cinematographer", "Traditional Photographer", "Candid Photographer", "Traditional Videographer", "Semi Cinematic", "Semi Standard", "Social Media Person", "Reel Creator", "Live Videography", "Drone Pilot", "Assistant", "Team Manager", "Makeup Artist", "Family Photographer".
    * If user mentions "semi-kinematic" or "semi-cinematic", output exact name "Semi Cinematic".
    * If user mentions "semi-standard" or "semi-traditional", output exact name "Semi Standard".
    * If multiple ceremonies on this card require crew, SUM the quantities together.

5. DELIVERABLES (deliverablesPage) - MAIN WEDDING DELIVERABLES ONLY:
- STRICT NEGATIVE RULE: NEVER include any pre-wedding deliverables (e.g. pre-wedding photos, pre-wedding teaser, pre-wedding reels) in deliverablesPage.selectedItems! All pre-wedding deliverables belong SOLELY on shootDetails.deliverablesText.
- selectedItems: Array of deliverable strings requested by user for the wedding functions.

6. SPECIAL VALUE ADDITIONS (specialValueAdditions):
- selectedItems: Array of complimentary bonus items. If none, empty array [].

7. PRICING (pricingPage):
- STRICT PRICING & DISCOUNT LOGIC (REGULAR PRICE VS BEST OFFER PRICE):
  * regularPrice (or basePrice): The gross standard regular package price before discount (Integer, e.g. 180000). Inspect context (e.g. "₹1,50,000", "2.5L" -> 250000; "90k" -> 90000).
  * bestPrice (or offerPrice): The best offer price given to client (Integer, e.g. 150000).
  * discountAmount: Difference between regularPrice and bestPrice (e.g. 180000 - 150000 = 30000). If NO discount/offer mentioned, discountAmount MUST STRICTLY BE 0.
  * Net Total Calculation: Net Amount = basePrice - discountAmount + travelCharges + accommodationCharges.
- gstPct, travelCharges, accommodationCharges, additionalCharges: Numbers, default 0 if not mentioned.
- showExclusionsNote: true.

8. PAYMENT TERMS & SCHEDULE (paymentTermsPage):
- steps: Array of [{ name: string, pct: string, amount: number, status: "Pending" }]. Calculate amounts based on percentage breakdown if given.
- CRITICAL STATUS RULE: All steps MUST strictly have status "Pending". NEVER default step 1 or any milestone to "Completed" unless the user's prompt or notes explicitly states that the advance or milestone was already received or paid!

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
          messages: [{ role: 'system', content: promptText }],
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

  // Fallback: Intelligent Heuristic Extraction Engine
  if (!aiRawOutput) {
    aiRawOutput = fallbackHeuristicExtractor(contextData);
  }

  // Map AI Output into StudioCore Quotation Schema
  return mapAiOutputToQuotationDocument(aiRawOutput, baseSchema, contextData);
}
