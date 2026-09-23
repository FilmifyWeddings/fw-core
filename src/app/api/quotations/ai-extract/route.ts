import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { DEFAULT_AIRY_PROPOSAL, normalizeQuotationData } from '@/lib/quotation-defaults';
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
  if (userNotes.startsWith('{') || userNotes.includes('{')) {
    try {
      const jsonMatch = userNotes.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.quotation || parsed.pages || parsed.cover || parsed.functionsPage || parsed.functions_coverage || parsed.pricingPage) {
          console.log('[AI Extract] Direct JSON detected from prompt input - using direct mapping');
          return mapAiOutputToQuotationDocument(parsed, baseSchema, contextData);
        }
      }
    } catch (e) {
      console.warn('[Direct JSON Parse Warning]:', e);
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
    * "Cinematographer", "Traditional Photographer", "Candid Photographer", "Traditional Videographer", "Semi Cinematic", "Semi Standard", "Social Media Person", "Reel Creator", "Live Videography", "Drone Pilot", "Assistant", "Team Manager", "Makeup Artist", "Family Photographer".
    * If user mentions "semi-kinematic" or "semi-cinematic", output exact name "Semi Cinematic".
    * If user mentions "semi-standard" or "semi-traditional", output exact name "Semi Standard".
    * (Custom roles also allowed).

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
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';

  // Try OpenAI API with strict 3-second timeout
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
          max_tokens: 1200
        }),
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) aiRawOutput = JSON.parse(content);
      }
    } catch (e) {
      console.warn('[OpenAI Call Warning/Timeout]:', e);
    }
  }

  // Try Gemini API if OpenAI failed or key absent with strict 3-second timeout
  if (!aiRawOutput && geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText + "\nRespond strictly in valid JSON." }] }],
          generationConfig: { responseMimeType: 'application/json' }
        }),
        signal: AbortSignal.timeout(3000)
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
      console.warn('[Gemini Call Warning/Timeout]:', e);
    }
  }

  // Fallback: Intelligent Heuristic Extraction Engine
  if (!aiRawOutput) {
    aiRawOutput = fallbackHeuristicExtractor(contextData);
  }

  // Map AI Output into StudioCore Quotation Schema
  return mapAiOutputToQuotationDocument(aiRawOutput, baseSchema, contextData);
}
