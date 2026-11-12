import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { DEFAULT_AIRY_PROPOSAL, normalizeQuotationData, sanitizeAndParseJson } from '@/lib/quotation-defaults';
import { resolveUserDefaultQuotationTemplate } from '@/lib/quotation-template-resolver';
import {
  normalizeCrewRoleName,
  fallbackHeuristicExtractor,
  mapAiOutputToQuotationDocument,
  detectPreWeddingIntent,
  detectPreWeddingNegation,
  detectSpecialValueIntent,
  resolveStudioFunctionName,
  buildScopedShortcutPromptHints
} from '@/lib/ai-quotation-extractor';
import { DEFAULT_EVENT_TYPES, DEFAULT_CREW_ROLES } from '@/lib/workspace-settings';

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
    const { userId, isSuperAdmin } = await resolveRequestUser(req);
    const body = await req.json().catch(() => ({}));
    const { leadId, quotationId, explicitTemplateId, selectedTemplateId, currentDocument, additionalNotes } = body;

    const isAuthenticatedUser = Boolean(userId && userId !== 'demo_user');
    let workspaceId = body.workspaceId || userId;
    const [{ data: profile }, { data: memberships }, { data: matchedLead }] = await Promise.all([
      isAuthenticatedUser
        ? supabaseAdmin
            .from('profiles')
            .select('id, workspace_id, workspace_name')
            .eq('id', userId)
            .maybeSingle()
        : Promise.resolve({ data: null } as any),
      isAuthenticatedUser
        ? supabaseAdmin
            .from('workspace_members')
            .select('workspace_id')
            .eq('user_id', userId)
        : Promise.resolve({ data: null } as any),
      leadId && leadId !== 'draft'
        ? supabaseAdmin
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);

    const authorizedWsSet = new Set<string>(
      [
        userId,
        profile?.id,
        profile?.workspace_id,
        ...(Array.isArray(memberships) ? memberships.map((m: any) => m?.workspace_id) : []),
      ].filter((id): id is string => Boolean(id && id !== 'demo_user'))
    );

    const canAccessWorkspace = (ws?: string | null): boolean => {
      if (!ws) return false;
      if (!isAuthenticatedUser || isSuperAdmin) return true;
      return authorizedWsSet.has(ws);
    };

    const requestedWsId = canAccessWorkspace(body.workspaceId) ? body.workspaceId : null;
    workspaceId = requestedWsId || profile?.workspace_id || profile?.id || userId;

    // 1. Fetch Lead or Synthesize from Document (only trust lead.workspace_id if authorized)
    let lead: any = null;
    if (matchedLead) {
      lead = matchedLead;
      if (matchedLead.workspace_id && canAccessWorkspace(matchedLead.workspace_id)) {
        workspaceId = matchedLead.workspace_id;
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

    // 2 & 3. Resolve existing/template doc + ALWAYS fetch authoritative DB Studio Settings for authenticated users
    // (never skip DB lookup due to stale client body.studioSettings, and enforce strict multi-tenant isolation!)
    const candidateWsIds = Array.from(new Set([
      workspaceId,
      profile?.workspace_id,
      profile?.id,
      userId,
      canAccessWorkspace(matchedLead?.workspace_id) ? matchedLead?.workspace_id : null,
      requestedWsId,
    ].filter((id): id is string => Boolean(id && id !== 'demo_user'))));

    const hasValidClientDoc = Boolean(
      currentDocument &&
      typeof currentDocument === 'object' &&
      (currentDocument.cover || currentDocument.functionsPage || currentDocument.pages)
    );
    const hasClientSettings = Boolean(body.studioSettings && body.studioSettings.aiRules);
    const hasClientEvents = Array.isArray(body.studioEventTypes) && body.studioEventTypes.length > 0;
    const hasClientRoles = Array.isArray(body.studioCrewRoles) && body.studioCrewRoles.length > 0;

    const shouldQuerySettingsFromDb = candidateWsIds.length > 0 && (isAuthenticatedUser || !hasClientSettings);
    const shouldQueryEventsFromDb = candidateWsIds.length > 0 && (isAuthenticatedUser || !hasClientEvents);
    const shouldQueryRolesFromDb = candidateWsIds.length > 0 && (isAuthenticatedUser || !hasClientRoles);

    const resolveDocPromise = async () => {
      if (quotationId) {
        if (hasValidClientDoc) return currentDocument;
        const { data: qDoc } = await supabaseAdmin
          .from('quotation_documents')
          .select('content_json')
          .or(`template_id.eq.${quotationId},id.eq.${quotationId}`)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (qDoc?.content_json) return qDoc.content_json;
        const { data: qRecord } = await supabaseAdmin
          .from('quotations')
          .select('content_json')
          .eq('id', quotationId)
          .maybeSingle();
        return qRecord?.content_json || currentDocument || null;
      }
      if (hasValidClientDoc) return currentDocument;
      const templateToUse = explicitTemplateId || selectedTemplateId || body.templateId;
      try {
        const resolved = await resolveUserDefaultQuotationTemplate(
          workspaceId,
          userId,
          templateToUse
        );
        if (resolved?.document) return resolved.document;
      } catch (e) {
        console.warn('[AI Extract] Could not resolve template:', e);
      }
      return DEFAULT_AIRY_PROPOSAL;
    };

    const [resolvedDoc, settingsRes, eventsRes, rolesRes] = await Promise.all([
      resolveDocPromise().catch(() => currentDocument || DEFAULT_AIRY_PROPOSAL),
      shouldQuerySettingsFromDb
        ? supabaseAdmin
            .from('workspace_quotation_settings')
            .select('workspace_id, settings, updated_at')
            .in('workspace_id', candidateWsIds)
            .order('updated_at', { ascending: false })
        : Promise.resolve({ data: null } as any),
      shouldQueryEventsFromDb
        ? supabaseAdmin
            .from('workspace_event_types')
            .select('workspace_id, id, name, category, display_order')
            .in('workspace_id', candidateWsIds)
            .order('display_order', { ascending: true })
            .order('name', { ascending: true })
        : Promise.resolve({ data: null } as any),
      shouldQueryRolesFromDb
        ? supabaseAdmin
            .from('master_crew_roles')
            .select('workspace_id, id, name, short_code, category, display_order')
            .in('workspace_id', candidateWsIds)
            .order('display_order', { ascending: true })
        : Promise.resolve({ data: null } as any),
    ]);

    const existingDoc: any = resolvedDoc || DEFAULT_AIRY_PROPOSAL;

    // Assemble Combined Context Text
    const rawPayload = lead.raw_payload || {};
    const metaPayload = lead.raw_meta_payload || {};
    const commentsText = Array.isArray(lead.comments) ? lead.comments.map((c: any) => c.text || '').join('\n') : '';

    let studioSettings: any = null;
    if (Array.isArray(settingsRes?.data)) {
      for (const cWsId of candidateWsIds) {
        const hit = settingsRes.data.find((r: any) => r.workspace_id === cWsId && r.settings && typeof r.settings === 'object');
        if (hit) {
          studioSettings = hit.settings;
          break;
        }
      }
    }
    if (!studioSettings && (!isAuthenticatedUser || hasClientSettings)) {
      studioSettings = body.studioSettings || null;
    }

    let studioEventTypes: any[] = [];
    if (Array.isArray(eventsRes?.data)) {
      for (const cWsId of candidateWsIds) {
        const matched = eventsRes.data.filter((e: any) => e.workspace_id === cWsId && String(e?.category || '').toLowerCase() !== 'ritual');
        if (matched.length > 0) {
          studioEventTypes = matched;
          break;
        }
      }
    }
    if (studioEventTypes.length === 0 && hasClientEvents) {
      studioEventTypes = body.studioEventTypes.filter((e: any) => typeof e === 'string' || String(e?.category || '').toLowerCase() !== 'ritual');
    }
    if (studioEventTypes.length === 0) studioEventTypes = DEFAULT_EVENT_TYPES;

    let studioCrewRoles: any[] = [];
    if (Array.isArray(rolesRes?.data)) {
      for (const cWsId of candidateWsIds) {
        const matched = rolesRes.data.filter((r: any) => r.workspace_id === cWsId);
        if (matched.length > 0) {
          studioCrewRoles = matched;
          break;
        }
      }
    }
    if (studioCrewRoles.length === 0 && hasClientRoles) {
      studioCrewRoles = body.studioCrewRoles;
    }
    if (studioCrewRoles.length === 0) studioCrewRoles = DEFAULT_CREW_ROLES;

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
      studioSettings: studioSettings || null,
      studioEventTypes,
      studioCrewRoles
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
      engine: (extractionResult as any).engine || { provider: 'gemini', model: 'gemini-3.1-flash-lite' }
    });
  } catch (error: any) {
    console.error('[AI Extract Error]:', error);
    return NextResponse.json({ error: error.message || 'AI extraction failed' }, { status: 500 });
  }
}

/**
 * Executes AI Extraction strictly using Google Gemini API,
 * or falls back cleanly to the local structured extraction engine.
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

  // 🧠 1. SCOPED STUDIO AI TRAINING & PER-EVENT CREW ISOLATION HINTS
  const studioDeliverables: any[] = Array.isArray(studioSettings?.deliverables) ? studioSettings.deliverables : [];
  const studioAiRules = studioSettings?.aiRules || {};
  const studioCustomInstructions = (studioAiRules.customInstructions || '').trim();

  let expandedNotes = userNotes;
  const scopedPromptHints = buildScopedShortcutPromptHints(
    userNotes,
    studioSettings,
    contextData.studioEventTypes || [],
    contextData.studioCrewRoles || []
  );
  if (scopedPromptHints) {
    expandedNotes += `\n\n[SCOPED STUDIO SHORTCUT & DELIVERABLE ANALYSIS — STRICTLY OBEY PER-EVENT SCOPE]:\n${scopedPromptHints}`;
  }

  // If user says "all deliverables" or "all deliverables add" or "सभी डिलीवरेबल्स":
  const isAllDeliverablesSpoken = /\b(?:all\s*deliverable\s*add|all\s*deliverables\s*add|all\s*deliverables|all\s*deliverable|all\s*droppers|ऑल\s*डिलीवरेबल्स(?:\s*ऐड)?|सभी\s*डिलीवरेबल्स(?:\s*ऐड)?|saare\s*deliverables|सारे\s*डिलीवरेबल्स)\b/i.test(userNotes);

  if (isAllDeliverablesSpoken) {
    if (studioDeliverables.length > 0) {
      const allDelivTitles = studioDeliverables.map((d: any) => typeof d === 'string' ? d : d.title).filter(Boolean);
      expandedNotes += `\n[FULL STUDIO DELIVERABLES CATALOG REQUESTED ("all deliverables")]:\n- Include all of: ${allDelivTitles.join(', ')}`;
    } else {
      expandedNotes += `\n[FULL DELIVERABLES REQUESTED]:\n- Include: 1 Teaser Video (1-2 Min), 1 Main Highlight Film (15-20 Min), Traditional Long Video (2-3 Hours), Custom Printed Coffee Table Album, All Raw Photos & Footage in Hard Drive, 3 Instagram Reels`;
    }
  }

  const leanPromptContext = {
    lead_info: contextData.lead_info,
    raw_form_fields: contextData.raw_form_fields,
    meta_fields: contextData.meta_fields,
    notes_and_comments: contextData.notes_and_comments,
    additional_user_notes: expandedNotes
  };

  const studioEventNamesList: string[] = Array.from(
    new Set(
      (Array.isArray(contextData.studioEventTypes) ? contextData.studioEventTypes : [])
        .map((e: any) => (typeof e === 'string' ? e : e?.name || '').trim())
        .filter((n: string) => n && !/pre[\s-]*wed|prewedding|pre[\s-]*shoot/i.test(n))
    )
  );
  const studioCrewRoleNames: string[] = Array.from(
    new Set([
      ...(Array.isArray(contextData.studioCrewRoles) ? contextData.studioCrewRoles : [])
        .map((r: any) => (typeof r === 'string' ? r : r?.name || '').trim())
        .filter(Boolean),
      'Traditional Photographer',
      'Traditional Videographer',
      'Candid Photographer',
      'Cinematographer',
      'Drone Pilot',
      'Semi Cinematic',
      'Semi Standard',
      'Reel Creator'
    ])
  );
  const studioPwReqsList: string[] = Array.isArray(studioSettings?.requirements) ? studioSettings.requirements : [];
  const studioPwDelivsList: string[] = Array.isArray(studioSettings?.preWeddingDeliverables) ? studioSettings.preWeddingDeliverables : [];
  const sampleFunc1 = resolveStudioFunctionName('Haldi', studioEventNamesList);
  const sampleFunc2 = resolveStudioFunctionName('Wedding', studioEventNamesList);

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
==================================================
🗣️ INLINE VOICE-NOTE / PROMPT DIRECTIVES (CRITICAL):
If the user's voice note or text includes ANY training/rule directive alongside event details (for example: "सभी इवेंट में 1 Traditional Photographer ऐड करो", "हर फंक्शन में Drone रखो", "always include Traditional Photographer", etc.), you MUST apply that rule across ALL matching ceremony cards in functionsPage.items WITHOUT dropping any explicitly stated crew roles or items!
${studioEventNamesList.length > 0 ? `
==================================================
🏷️ STUDIO'S OFFICIAL FUNCTIONS / SUB-EVENTS LIST (USE THESE EXACT VERBATIM NAMES FOR ALL CARDS IN functionsPage.items):
${studioEventNamesList.map((name: string) => `- "${name}"`).join('\n')}
CRITICAL: Whenever a ceremony matches one of the studio's official names above, ALWAYS output that EXACT string (letter-for-letter) so Quotations sync 100% with Team Manager & Post-Production! NEVER invent extra suffixes like "Ceremony" or "Night" if the Studio's Official List says "Wedding" or "Haldi" or "Sangeet"!
` : ''}
${studioCrewRoleNames.length > 0 ? `
==================================================
📸 STUDIO'S OFFICIAL CREW ROLES DICTIONARY (USE THESE EXACT NAMES):
${studioCrewRoleNames.map((r: string) => `- "${r}"`).join('\n')}
` : ''}
${studioDeliverables.length > 0 ? `
==================================================
📋 STUDIO'S OFFICIAL DELIVERABLES CATALOG (PREFER SELECTING FROM THIS LIST):
${studioDeliverables.map((d: any) => `- "${d.title}"`).join('\n')}
` : ''}
==================================================
🌟 CRITICAL TOP PRIORITY OVERRIDE MANDATES (MUST FOLLOW):

1. COUPLE NAME, EVENT TYPE & ROLES (HIGHEST PRIORITY):
- If user notes, prompt, or speech mentions ANY couple or client name (e.g. "सागर और रिद्धि" / "Sagar & Riddhi", "O Piya ke liye quotation...", "O Piya ke liye quotion...", "O Piya, total 3 events...", "Rohit ke liye quotation..."):
  THIS STRICTLY AND ABSOLUTELY OVERRIDES any existing lead name or default template name!
- ALWAYS preserve the FULL spoken client/couple name verbatim (including short prefixes like "O" in "O Piya") and transliterate/translate names into clean Latin/English Title Case:
  * Couple example -> coupleName: "Sagar & Riddhi", groomName: "Sagar", brideName: "Riddhi"
  * Single client/brand example ("O Piya ke liye quotation") -> coupleName: "O Piya", groomName: "O Piya", brideName: "" (keep brideName empty; NEVER invent a partner or strip "O")
- EVENT TYPE (cover.eventType):
  * Concise standard event type: e.g. "Wedding", "Pre-Wedding & Wedding", "Engagement", or "Reception".
  * NEVER append the word "Quotation" to eventType (e.g. "Wedding", NOT "Wedding Quotation").
- NEVER output Devanagari script for coupleName, groomName, brideName, or ceremony names. Always output polished English!
- Only use lead_info.name if NO couple name is stated anywhere in the user notes.

2. EXACT STUDIO FUNCTIONS, RELATIVE DATE ARITHMETIC & SEPARATE CARDS MANDATE:
- MATCH EXACT STUDIO SETTINGS NAMES:
  * "वेडिंग" / "शादी" / "लग्न" / "फेरे" / "Barat" -> map to the exact matching studio setting name above (e.g. "${sampleFunc2}").
  * "हल्दी" / "हळद" / "पीठी" / "Pithi" -> map to "${sampleFunc1}".
  * "घर पे एंट्री शूट" / "गृह प्रवेश" / "घर का शूट" -> "Home Entry Shoot" (or matching studio setting name).
  * "संगीत" -> ${resolveStudioFunctionName('Sangeet', studioEventNamesList)}, "मेहंदी" -> ${resolveStudioFunctionName('Mehendi', studioEventNamesList)}, "सगाई"/"रिंग सेरेमनी" -> ${resolveStudioFunctionName('Engagement', studioEventNamesList)}, "रिसेप्शन" -> ${resolveStudioFunctionName('Reception', studioEventNamesList)}.
- RELATIVE DATES & STRICT DATE ARITHMETIC ("DD - MMM - YYYY", default year 2026):
  * Every date MUST strictly be formatted as "DD - MMM - YYYY" (e.g. "10 - Nov - 2026", "11 - Nov - 2026", "01 - Dec - 2026"). Default year is 2026.
  * You MUST compute calendar arithmetic accurately across clauses & month boundaries:
    - "अगले दिन" / "उसके अगले दिन" / "दूसरे दिन" / "नेक्स्ट डे" / "next day" / "following day" / "day after" / "tomorrow" => anchor date + 1 day!
      Example: "Wedding 10 November को है और उसके अगले दिन Haldi है" -> ${sampleFunc2}: "10 - Nov - 2026", ${sampleFunc1}: "11 - Nov - 2026"!
      Example with month rollover: "30 November ko Wedding aur uske agle din Haldi" -> ${sampleFunc2}: "30 - Nov - 2026", ${sampleFunc1}: "01 - Dec - 2026"!
    - "2 दिन बाद" / "2 days later" / "परसों" => + 2 days!
    - "एक दिन पहले" / "पिछले दिन" / "previous day" / "day before" => - 1 day!
    - "उसी दिन" / "सेम डे" / "same day" => exact same date (+0 days)!
- SEPARATE FUNCTION CARDS BY DEFAULT vs EXPLICIT COMBINED CARDS (CRITICAL!):
  * By default, ALWAYS create a SEPARATE function card in functionsPage.items for EVERY ceremony/event mentioned — EVEN IF two ceremonies fall on the SAME date! Each card gets its own name, date, and crew requirements.
  * Example ("दोनों में"): "Wedding 10 November को है और उसके अगले दिन Haldi है, दोनों में 1 Traditional Photographer चाहिए"
    => MUST produce TWO SEPARATE cards:
       1) { name: "${sampleFunc2}", date: "10 - Nov - 2026", requirements: [{ name: "Traditional Photographer", qty: 1 }] }
       2) { name: "${sampleFunc1}", date: "11 - Nov - 2026", requirements: [{ name: "Traditional Photographer", qty: 1 }] }
  * Same-date SEPARATE example: "10 Nov सुबह Haldi में 1 Traditional Photographer और शाम को Wedding में 2 Candid Photographer"
    => MUST produce TWO SEPARATE cards (both on "10 - Nov - 2026") with their own separate crew!
  * EXPLICIT COMBINATION EXCEPTION: ONLY combine ceremonies into a single "${sampleFunc2} + ${sampleFunc1}" card when the user EXPLICITLY says they are together / combined into one day/function (e.g. "Wedding और Haldi एक ही दिन पे है", "Haldi + Sangeet एक साथ में", "combine Haldi and Sangeet on same card").
- TIMINGS & TIMES:
  * Convert times to standard 12-hour format with AM/PM (e.g. startTime: "11:00 AM", endTime: "11:00 PM").
  * If no explicit clock time was stated, keep startTime: "" and endTime: "".
  * For duration-only shoots like "घर पे 2 आवर्स का शूट", put startTime: "", endTime: "", and notes: "2 Hours Duration Coverage".

3. CREW REQUIREMENTS NORMALIZATION & PER-EVENT ISOLATION:
- In functionsPage.items, each item MUST have:
  "requirements": [ { "name": string, "qty": number } ]
- Map all spoken Indian/English crew roles strictly to the Studio's Official Crew Roles Dictionary above (e.g. "Traditional Photographer", "Traditional Videographer", "Candid Photographer", "Cinematographer", "Drone Pilot", "Semi Cinematic", "Semi Standard", "Reel Creator").
- CRITICAL PER-EVENT CREW LOCK: If one event mentions a shortcut/preset like "Standard Crew" (e.g. "Wedding mein Standard Crew") AND another event specifies its own crew or restrictive phrase ("Haldi mein bas 1 Traditional Photographer aur alag crew" / "Haldi needs only 1 Traditional Photographer"), NEVER copy or leak Standard Crew onto Haldi! Obey every [SCOPED STUDIO SHORTCUT] & [EXPLICIT PER-EVENT CREW LOCK] annotation verbatim!
- NOTES FIELD MANDATE (CRITICAL): Keep "notes": "" (empty string) on EVERY event card unless the user explicitly spoke a specific shoot instruction or timing remark (e.g. "2 Hours Duration Coverage", "Bride entry 6 PM"). NEVER copy shortcut trigger names ("Standard Crew", "Premium Crew", "Gold Package", etc.) or generic crew names into "notes"!

4. DELIVERABLES (deliverablesPage):
- selectedItems: Array of genuine photography/video deliverable strings ONLY:
  a) Matching Studio Official Deliverables Catalog items (or ALL catalog items when user says "all deliverables add" / "all deliverables add करना" / "ऑल डिलीवरेबल्स").
  b) Deliverables mapped by any [STUDIO TRIGGER ... -> Deliverables: ...] annotation.
  c) Genuine custom or counted deliverables explicitly spoken in speech/notes — preserve exact counts! E.g. "500 edited photos" / "500 एडिटेड फोटो", "5 Instagram Reels" / "5 रील", "1 Pendrive" / "1 पेनड्राइव", "2 Photo Albums" / "2 एल्बम", "1 Cinematic Teaser Video" / "टीज़र", "Save The Date Video", "Same Day Edit".
- STRICT SANITIZATION: NEVER put voice command triggers ("All Deliverables Add", "All Deliverables Add करना", "Add Karna") or conversational Hindi/Hinglish prose or pricing fragments into selectedItems (e.g. NEVER output "Jo Quotation Mujhe Unko Share Karna Hai Wo 3" or "000 Ka Hai Usme" or "all deliverables add करना"!).
- If a [STUDIO TRIGGER] specifies Deliverables OR user explicitly mentions specific deliverables, include ONLY those items (do NOT pad with unrequested template sample items!).
- If NO deliverables are mentioned and NO [STUDIO TRIGGER] specifies Deliverables, return an empty array [].
- NEVER drop spoken counted deliverables! Note: "5 Reels" / "5 Instagram reels" is a deliverable in deliverablesPage.selectedItems, NOT a Reel Creator crew member unless user asked for Reel Creator crew.
- NEVER include pre-wedding deliverables here; those belong solely on shootDetails.

5. ZERO HALLUCINATION & STRICT DATA FIDELITY:
- ONLY include functions and services explicitly mentioned in user notes or expanded via detected studio triggers.
- NEVER put Pre-Wedding as a function card in functionsPage.items.
- Synchronize 100% of user data into the quotation JSON without missing or adding extra dummy items.

6. MATHEMATICAL PRICING EVALUATION & METHOD CALCULATION (pricingPage):
- Perform exact mathematical method evaluation:
  * PER-DAY / PER-EVENT MULTIPLICATION: e.g. "35,000 per day for 2 days" -> basePrice = 70000.
  * MULTI-EVENT SUMMATION: e.g. "Haldi 25k, Sangeet 35k, Wedding 70k" -> basePrice = 130000.
  * INDIAN DENOMINATIONS: "2.5 lakh"/"ढाई लाख" = 250000, "1.5 lakh"/"डेढ़ लाख" = 150000, "50k"/"पचास हजार" = 50000.
  * DISCOUNTS: Flat ("25k off" -> discountAmount: 25000), Percentage ("10% discount on 2 lakh" -> discountAmount: 20000), Regular vs offer ("1.8L regular, 1.5L offer" -> basePrice: 180000, discountAmount: 30000). Default 0.
  * TRAVEL/ACCOMMODATION/ADD-ONS/GST: Compute accurately; Net Total = (basePrice - discountAmount + travelCharges + accommodationCharges + additionalCharges) * (1 + gstPct / 100).
  * showExclusionsNote: true.

7. PAYMENT TERMS & SCHEDULE (paymentTermsPage):
- Compute exact rupee amounts per milestone summing strictly to Net Total.
- All step statuses MUST default to "Pending" unless explicitly stated as already paid/received.

8. PRE-WEDDING SHOOT PAGE (shootDetails) — STRICT CONDITIONAL VISIBILITY:
- Inspect user's voice note / text message carefully ("pre-wedding", "prewedding", "pre shoot", "प्री वेडिंग", "प्रि वेडिंग", "प्री-वेडिंग", "प्रीवेडिंग", "प्री शूट").
- IF Pre-Wedding is NOT mentioned OR is explicitly declined ("प्री वेडिंग नहीं चाहिए", "no pre-wedding"):
  * YOU MUST set shootDetails.visible = false AND leave daysText: "", crewText: "", deliverablesText: ""!
- IF Pre-Wedding IS explicitly mentioned:
  * Set shootDetails.visible = true.
  * Populate daysText (e.g. "1 Day Shoot" or "2 Days Shoot"), crewText (exact crew mentioned, else studio defaults: ${studioPwReqsList.length > 0 ? studioPwReqsList.slice(0, 3).join(', ') : '1x Candid Photographer, 1x Cinematographer, 1x Drone Pilot'}), and deliverablesText (exact deliverables mentioned, else studio defaults: ${studioPwDelivsList.length > 0 ? studioPwDelivsList.slice(0, 3).join(', ') : 'Full Ultra HD Super-Fine Raw Photos, Approx. 50 High Resolution Edited Images, 1 Teaser Video Reel'}).

9. SPECIAL VALUE ADDITIONS (specialValueAdditions) — STRICT CONDITIONAL VISIBILITY:
- YOU MUST set specialValueAdditions.visible = false and selectedItems: [] UNLESS the user explicitly asks for complimentary / freebie / bonus / special value addition items (e.g. "complimentary", "free drone", "free frame", "free mini album", "bonus", "special value additions", "मुफ़्त", "कॉम्प्लिमेंट्री") OR a [STUDIO TRIGGER] includes Special Value Add-ons!
- Never copy sample freebies if none were spoken or triggered!

==================================================
OUTPUT FORMAT & CRITICAL JSON MANDATE:
- Respond ONLY with 100% valid, parseable JSON matching the exact schema below.
- NO markdown preamble or conversational text.
- NO trailing commas or single quotes. All numbers must be bare numeric literals.
- Strict Date Format: "DD - MMM - YYYY" (e.g. "10 - Nov - 2026"). Default year 2026.

POPULATE THIS EXACT SCHEMA WITH ACTUAL EXTRACTED CLIENT DATA:
{
  "cover": {
    "coupleName": "Sagar & Riddhi",
    "groomName": "Sagar",
    "brideName": "Riddhi",
    "eventType": "Wedding",
    "locationName": "Mumbai"
  },
  "shootDetails": {
    "visible": false,
    "daysText": "",
    "crewText": "",
    "deliverablesText": "",
    "showExclusionsNote": true
  },
  "functionsPage": {
    "items": [
      {
        "id": "func-1",
        "name": ${JSON.stringify(sampleFunc2)},
        "date": "10 - Nov - 2026",
        "dateNotFixed": false,
        "startTime": "",
        "endTime": "",
        "location": "Mumbai",
        "requirements": [
          { "name": "Traditional Photographer", "qty": 1 }
        ],
        "notes": ""
      },
      {
        "id": "func-2",
        "name": ${JSON.stringify(sampleFunc1)},
        "date": "11 - Nov - 2026",
        "dateNotFixed": false,
        "startTime": "",
        "endTime": "",
        "location": "Mumbai",
        "requirements": [
          { "name": "Traditional Photographer", "qty": 1 }
        ],
        "notes": ""
      }
    ]
  },
  "deliverablesPage": {
    "selectedItems": []
  },
  "specialValueAdditions": {
    "visible": false,
    "selectedItems": [],
    "note": ""
  },
  "pricingPage": {
    "basePrice": 200000,
    "discountAmount": 0,
    "gstPct": 0,
    "travelCharges": 0,
    "accommodationCharges": 0,
    "additionalCharges": 0,
    "showExclusionsNote": true,
    "note": ""
  },
  "paymentTermsPage": {
    "steps": [
      { "name": "Advance Token", "pct": "30%", "amount": 60000, "status": "Pending" },
      { "name": "On Event Day", "pct": "50%", "amount": 100000, "status": "Pending" },
      { "name": "On Final Delivery", "pct": "20%", "amount": 40000, "status": "Pending" }
    ]
  }
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

  // 100% Google Gemini Extraction (gemini-3.1-flash-lite -> gemini-3-flash-preview -> gemini-flash-latest)
  if (rawGeminiKeys.length > 0) {
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3-flash-preview', 'gemini-flash-latest'];
    for (const currentKey of rawGeminiKeys) {
      if (aiRawOutput) break;
      for (const model of candidateModels) {
        if (aiRawOutput) break;
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`;
          const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': currentKey
            },
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
                temperature: 0.05,
                maxOutputTokens: 3500,
                ...(model.startsWith('gemini-3') ? { thinkingConfig: { thinkingBudget: 0 } } : {})
              }
            }),
            signal: AbortSignal.timeout(15000)
          });
          if (geminiRes.ok) {
            const geminiJson = await geminiRes.json();
            const parts = geminiJson.candidates?.[0]?.content?.parts || [];
            const content = parts
              .filter((p: any) => !p?.thought && typeof p?.text === 'string')
              .map((p: any) => p.text)
              .join('')
              .trim();
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

  // Pre-wedding & Special Value Additions strict isolation check (Unicode-safe Hindi/Marathi/Hinglish/English)
  const formSignals = [
    contextData?.raw_form_fields?.event_type,
    contextData?.raw_form_fields?.services,
    contextData?.raw_form_fields?.event,
    contextData?.raw_form_fields?.functions
  ].filter(Boolean).join(' ');
  const userNegatedPreWed = detectPreWeddingNegation(userNotes || contextData?.notes_and_comments || '');
  const hasPreWedSignal = !userNegatedPreWed && (
    userNotes
      ? detectPreWeddingIntent(userNotes)
      : (detectPreWeddingIntent(contextData?.notes_and_comments || '') || detectPreWeddingIntent(formSignals))
  );
  const hasSpecialValueSignal =
    detectSpecialValueIntent(userNotes || contextData?.notes_and_comments || '') ||
    scopedPromptHints.includes('Special Value Add-ons:');
  if (aiRawOutput) {
    if (!aiRawOutput.shootDetails) aiRawOutput.shootDetails = {};
    aiRawOutput.shootDetails.visible = hasPreWedSignal;
    if (!hasPreWedSignal) {
      aiRawOutput.shootDetails.daysText = '';
      aiRawOutput.shootDetails.crewText = '';
      aiRawOutput.shootDetails.deliverablesText = '';
    }
    if (!aiRawOutput.specialValueAdditions) aiRawOutput.specialValueAdditions = {};
    aiRawOutput.specialValueAdditions.visible = hasSpecialValueSignal;
    if (!hasSpecialValueSignal) {
      aiRawOutput.specialValueAdditions.selectedItems = [];
      aiRawOutput.specialValueAdditions.note = '';
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
