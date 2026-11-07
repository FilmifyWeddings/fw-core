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

    let workspaceId = body.workspaceId || userId;
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, workspace_name')
      .eq('id', userId)
      .maybeSingle();
    if (profile?.id && !body.workspaceId) workspaceId = profile.id;

    // 1. Fetch Lead or Synthesize from Document
    let lead: any = null;
    if (leadId && leadId !== 'draft') {
      const { data: matchedLead } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .maybeSingle();
      if (matchedLead) {
        lead = matchedLead;
        if (matchedLead.workspace_id) workspaceId = matchedLead.workspace_id;
      }
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

    // Fetch Studio Quotation Settings (Deliverables, AI Rules, Shortcuts)
    let studioSettings: any = body.studioSettings || null;
    try {
      const { data: quoteSettingsRow } = await supabaseAdmin
        .from('workspace_quotation_settings')
        .select('settings')
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      if (quoteSettingsRow?.settings && typeof quoteSettingsRow.settings === 'object') {
        studioSettings = quoteSettingsRow.settings;
      }
    } catch (e) {
      console.warn('[AI Extract] Could not fetch workspace_quotation_settings:', e);
    }

    const contextData = {
      lead_info: {
        lead_id: lead.id,
        name: lead.name || rawPayload.client_name || rawPayload.couple_name || '',
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
      existing_quotation: existingDoc || null,
      studioSettings: studioSettings || null
    };

    console.log('[AI EXTRACTION REQUEST]', {
      leadId,
      workspaceId,
      targetQId: quotationId || 'NEW',
      hasAdditionalNotes: !!additionalNotes,
      hasStudioSettings: !!studioSettings
    });

    // 4. Perform AI Extraction
    const extractionResult = await performAiExtraction(contextData, existingDoc, studioSettings);

    return NextResponse.json({
      success: true,
      extractedDocument: extractionResult.document,
      summary: extractionResult.summary,
      missingInformation: extractionResult.missingInformation,
      conflicts: extractionResult.conflicts,
      verification_required: extractionResult.conflicts.length > 0,
      engine: (extractionResult as any).engine || { provider: 'gemini', model: 'gemini-3.8-flash' }
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
async function performAiExtraction(contextData: any, baseDoc: any, studioSettings: any = null) {
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

  // 🧠 1. STUDIO AI TRAINING & TRIGGER EXPANSION ENGINE
  const studioDeliverables: any[] = Array.isArray(studioSettings?.deliverables) ? studioSettings.deliverables : [];
  const studioAiRules = studioSettings?.aiRules || {};
  const studioCustomInstructions = (studioAiRules.customInstructions || '').trim();
  const studioShortcuts: any[] = Array.isArray(studioAiRules.shortcuts) ? studioAiRules.shortcuts : [];

  let expandedNotes = userNotes;
  const detectedShortcuts: string[] = [];

  for (const sc of studioShortcuts) {
    if (!sc.trigger) continue;
    const triggerLower = sc.trigger.toLowerCase().trim();
    const hasTrigger = userNotes.toLowerCase().includes(triggerLower) ||
      triggerLower.split(/\s+/).every((w: string) => userNotes.toLowerCase().includes(w));

    if (hasTrigger) {
      detectedShortcuts.push(sc.trigger);
      let expansion = `\n[STUDIO TRIGGER DETECTED: "${sc.trigger}"]`;
      if (sc.mappedDeliverables?.length) {
        expansion += `\n- Studio Deliverables to include: ${sc.mappedDeliverables.join(', ')}`;
      }
      if (sc.mappedCrew?.length) {
        expansion += `\n- Studio Crew Requirements: ${sc.mappedCrew.map((c: any) => `${c.qty}x ${c.name}`).join(', ')}`;
      }
      if (sc.mappedPrice) {
        expansion += `\n- Package Base Price: ₹${sc.mappedPrice}`;
      }
      expandedNotes += expansion;
    }
  }

  // If user says "all deliverables" or "all deliverables add" or "सभी डिलीवरेबल्स":
  const isAllDeliverablesSpoken = /\b(?:all\s*deliverable\s*add|all\s*deliverables\s*add|all\s*deliverables|all\s*deliverable|all\s*droppers|ऑल\s*डिलीवरेबल्स(?:\s*ऐड)?|सभी\s*डिलीवरेबल्स(?:\s*ऐड)?|saare\s*deliverables|सारे\s*डिलीवरेबल्स)\b/i.test(userNotes);

  if (isAllDeliverablesSpoken) {
    if (studioDeliverables.length > 0) {
      const allDelivTitles = studioDeliverables.map((d: any) => typeof d === 'string' ? d : d.title).filter(Boolean);
      expandedNotes += `\n[STUDIO TRIGGER DETECTED: "all deliverables"]\n- Deliverables: ${allDelivTitles.join(', ')}`;
    } else {
      expandedNotes += `\n[STUDIO TRIGGER DETECTED: "all droppers"]\n- Deliverables: 1 Teaser Video (1-2 Min), 1 Main Highlight Film (15-20 Min), Traditional Long Video (2-3 Hours), Custom Printed Coffee Table Album, All Raw Photos & Footage in Hard Drive, 3 Instagram Reels`;
    }
  }

  if (!detectedShortcuts.some((s) => s.toLowerCase().includes('standard crew')) && /\b(standard crew|स्टैंडर्ड टीम)\b/i.test(userNotes)) {
    expandedNotes += `\n[STUDIO TRIGGER DETECTED: "standard crew"]\n- Crew: 2x Candid Photographer, 2x Cinematographer, 1x Traditional Videographer, 1x Drone Pilot`;
  }

  const leanPromptContext = {
    lead_info: contextData.lead_info,
    raw_form_fields: contextData.raw_form_fields,
    meta_fields: contextData.meta_fields,
    notes_and_comments: contextData.notes_and_comments,
    additional_user_notes: expandedNotes
  };

  const promptText = `
You are StudioCore AI — an intelligent quotation data extraction assistant for professional wedding photographers.

==================================================
🎯 YOUR TASK:
Analyze the client requirements, notes, or spoken conversation provided and convert them into a 100% structured StudioCore Quotation JSON document.
${studioCustomInstructions ? `
==================================================
🏢 STUDIO-SPECIFIC CUSTOM AI TRAINING RULES (APPLY WITH HIGHEST PRIORITY):
${studioCustomInstructions}
` : ''}
${studioDeliverables.length > 0 ? `
==================================================
📋 STUDIO'S OFFICIAL DELIVERABLES CATALOG (PREFER SELECTING FROM THIS LIST):
${studioDeliverables.map((d: any) => `- "${d.title}"`).join('\n')}
` : ''}
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
- selectedItems: Array of professional English strings from the official catalog (e.g. "Cinematic Wedding Highlight Film", "Cinematic Wedding Teaser", "Professionally Designed Wedding Album", "Mini Photo Book", "All Raw Photographs", "1 Year Google Drive Access").
- NEVER include pre-wedding deliverables here; those belong solely on shootDetails.

5. ZERO HALLUCINATION & STRICT DATA FIDELITY:
- ONLY include functions and services explicitly mentioned in user notes or expanded via detected studio triggers.
- If user did not mention pre-wedding shoot, keep shootDetails.visible = false.
- Synchronize 100% of user data into the quotation JSON without missing or adding extra dummy items.
- Preserve technical and brand words (e.g., 'Gemini', 'ChatGPT', 'Antigravity', '4K Cinema', 'Drone') accurately.

5. MATHEMATICAL PRICING EVALUATION & METHOD CALCULATION (pricingPage):
- You MUST perform intelligent mathematical method evaluation (like ChatGPT and Gemini calculators):
  * PER-DAY / PER-EVENT MULTIPLICATION:
    - e.g. "35,000 per day for 2 days" -> basePrice = 35000 * 2 = 70000.
    - e.g. "40k per day for 3 days event" -> basePrice = 40000 * 3 = 120000.
  * MULTI-EVENT SUMMATION:
    - e.g. "Haldi 25k, Sangeet 35k, Wedding 70k" -> basePrice = 25000 + 35000 + 70000 = 130000.
  * INDIAN DENOMINATIONS & NUMBER WORDS:
    - "2.5 lakh" / "2.5 लाख" / "ढाई लाख" / "अडीच लाख" = 250000.
    - "1.5 lakh" / "1.5 लाख" / "डेढ़ लाख" = 150000.
    - "1.8 lakh" / "एक लाख अस्सी हजार" = 180000.
    - "25k" / "25 thousand" / "पच्चीस हजार" = 25000.
    - "50k" / "50 thousand" / "पचास हजार" = 50000.
  * DISCOUNTS & SPECIAL OFFERS:
    - Flat discount: "25,000 discount" / "25k off" -> discountAmount: 25000.
    - Percentage discount: "10% discount on 2 lakh" -> discountAmount: 20000.
    - Regular vs offer: "1.8 lakh regular, 1.5 lakh offer" -> basePrice: 180000, discountAmount: 30000.
    - If NO discount mentioned, discountAmount MUST strictly be 0.
  * TRAVEL & STAY CHARGES:
    - travelCharges: e.g. "15000 travel charges" -> 15000.
    - accommodationCharges: e.g. "10000 hotel/stay" -> 10000.
  * ADD-ONS & EXTRAS (additionalCharges):
    - Extra services: e.g. "20000 album add-on, 15000 drone" -> 35000.
  * TAXES / GST (gstPct):
    - If user specifies GST (e.g. "18% GST" or "GST 18%"): gstPct: 18, else 0.
  * NET TOTAL FORMULA:
    Net Total = (basePrice - discountAmount + travelCharges + accommodationCharges + additionalCharges) * (1 + gstPct / 100).
  * showExclusionsNote: true.
  * note: Descriptive summary of calculation method (e.g. "₹35,000/day x 2 days + ₹20,000 album with ₹10,000 discount applied").

6. PAYMENT TERMS & SCHEDULE (paymentTermsPage):
- steps: Array of payment milestones with exact rupee amounts computed from Net Total:
  * Percentage Milestones:
    - e.g. 30% Advance Token, 50% On Event Day, 20% On Final Delivery (or whatever ratio user specifies like 25%/50%/25% or 50%/50%).
    - Calculate exact rupee amount for EACH step based on Net Total: Net Total * (pct / 100).
    - Ensure the sum of all step amounts strictly equals Net Total!
  * Flat Advance:
    - If user specifies a flat advance (e.g. "₹25,000 advance received"):
      Step 1: "Advance Token", amount: 25000, pct: calculated percentage. Status: "Completed" (if user confirmed payment was received/paid/diya), else "Pending".
      Balance remaining milestones to strictly equal Net Total.
  * All step statuses default to "Pending" unless explicitly confirmed as paid.

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
  let activeEngineProvider = 'heuristic';
  let activeEngineModel = 'fallback';
  let activeKeyHint = '';

  const rawGeminiKeys = (process.env.GEMINI_API_KEY || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  const openAiKey = process.env.OPENAI_API_KEY || '';

  // 1. PRIMARY ENGINE: Google Gemini (Tier 1 Paid Plan with gemini-3.8-flash & gemini-flash-latest Priority)
  if (rawGeminiKeys.length > 0) {
    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.5-flash'];
    for (const currentKey of rawGeminiKeys) {
      if (aiRawOutput) break;
      for (const model of candidateModels) {
        if (aiRawOutput) break;
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`;
          const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: promptText },
                    { text: `Please extract 100% structured quotation JSON from this context:\n${JSON.stringify(leanPromptContext, null, 2)}` }
                  ]
                }
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
                maxOutputTokens: 3500
              }
            }),
            signal: AbortSignal.timeout(15000)
          });
          if (geminiRes.ok) {
            const geminiJson = await geminiRes.json();
            const content = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
            if (content) {
              aiRawOutput = sanitizeAndParseJson(content);
              activeEngineProvider = 'gemini';
              activeEngineModel = model;
              activeKeyHint = `${currentKey.slice(0, 14)}...${currentKey.slice(-6)}`;
              console.log(`[AI Extract] Successfully generated via Gemini (${model}) using key: ${activeKeyHint}`);
              break;
            }
          } else {
            const errText = await geminiRes.text().catch(() => '');
            console.warn(`[Gemini ${model} Error on key ${currentKey.slice(0, 10)}...]:`, geminiRes.status, errText.slice(0, 150));
          }
        } catch (e: any) {
          console.warn(`[Gemini ${model} Exception]:`, e?.message || e);
        }
      }
    }
  }

  // 2. SECONDARY ENGINE: OpenAI GPT-4o-mini Fallback
  if (!aiRawOutput && openAiKey) {
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
          max_tokens: 3000
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) {
          aiRawOutput = sanitizeAndParseJson(content);
          activeEngineProvider = 'openai';
          activeEngineModel = 'gpt-4o-mini';
          console.log('[AI Extract] Fallback generated via OpenAI GPT-4o-mini');
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
  const mappedResult = mapAiOutputToQuotationDocument(aiRawOutput, baseSchema, contextData);
  return {
    ...mappedResult,
    engine: {
      provider: activeEngineProvider,
      model: activeEngineModel,
      activeKey: activeKeyHint || (rawGeminiKeys[0] ? `${rawGeminiKeys[0].slice(0, 14)}...${rawGeminiKeys[0].slice(-6)}` : 'N/A')
    }
  };
}
