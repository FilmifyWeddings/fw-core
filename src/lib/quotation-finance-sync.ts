import type { ClientFinanceRecord, FinanceMilestoneItem } from '@/types';
import { supabaseAdmin } from '@/lib/supabase';
import { SUPER_ADMIN_ID } from '@/lib/auth/admin-guard';
import { parseQuotationDeliverables } from '@/lib/services/postProductionSyncService';

export interface ExtractedQuotationFinancials {
  base_package_price: number;
  discount_amount: number;
  accommodation_charges: number;
  travel_charges: number;
  additional_charges: number;
  subtotal_amount: number;
  gst_rate: number;
  gst_amount: number;
  final_total_amount: number;
  received_amount: number;
  pending_amount: number;
  payment_status: 'paid' | 'partially_paid' | 'pending';
  milestones: FinanceMilestoneItem[];
  event_date?: string | null;
  event_type?: string | null;
}

/**
 * Normalizes any free-text date (e.g. "10 FEB 26", "10 Feb 2026", "10/02/2026", "2026-02-10", "Booking Date", "Event Day")
 * into standard HTML-compatible ISO format "YYYY-MM-DD".
 */
export function normalizeToIsoDate(rawDate?: any, fallbackDate?: string | null): string {
  const fallback = fallbackDate && fallbackDate.includes('-')
    ? fallbackDate.split('T')[0]
    : new Date().toISOString().split('T')[0];

  if (!rawDate) return fallback;

  const dateStr = String(rawDate).trim();
  if (!dateStr || dateStr.toLowerCase() === 'undefined' || dateStr.toLowerCase() === 'null' || dateStr.toLowerCase() === 'dd-mm-yyyy') {
    return fallback;
  }

  const lower = dateStr.toLowerCase();

  // Relative quotation payment step descriptors
  if (lower.includes('booking') || lower.includes('token') || lower.includes('advance') || lower.includes('signing')) {
    return fallbackDate ? fallbackDate.split('T')[0] : new Date().toISOString().split('T')[0];
  }
  if (lower.includes('wedding') || lower.includes('event') || lower.includes('stage') || lower.includes('shoot')) {
    return fallback;
  }
  if (lower.includes('delivery') || lower.includes('handover') || lower.includes('settlement') || lower.includes('final')) {
    try {
      const base = new Date(fallback);
      if (!isNaN(base.getTime())) {
        base.setDate(base.getDate() + 30);
        return base.toISOString().split('T')[0];
      }
    } catch (_) {}
    return fallback;
  }

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Timestamp format like 2026-02-10T00:00:00.000Z
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }

  const MONTHS: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  try {
    const parts = dateStr.split(/[\s\-\/\.]+/);
    if (parts.length === 3) {
      const p0 = parts[0];
      const p1 = parts[1].toLowerCase().slice(0, 3);
      const p2 = parts[2];

      // Case: "10 FEB 26" or "10-Feb-2026" or "10/Feb/2026"
      if (MONTHS[p1]) {
        const day = p0.padStart(2, '0');
        const month = MONTHS[p1];
        const year = p2.length === 2 ? `20${p2}` : p2;
        return `${year}-${month}-${day}`;
      }

      // Case: "FEB 10 2026"
      const p0m = p0.toLowerCase().slice(0, 3);
      if (MONTHS[p0m]) {
        const month = MONTHS[p0m];
        const day = p1.padStart(2, '0');
        const year = p2.length === 2 ? `20${p2}` : p2;
        return `${year}-${month}-${day}`;
      }

      // Case: DD/MM/YYYY or DD-MM-YYYY
      if (p2.length === 4 && !isNaN(Number(p0)) && !isNaN(Number(parts[1]))) {
        return `${p2}-${parts[1].padStart(2, '0')}-${p0.padStart(2, '0')}`;
      }

      // Case: DD/MM/YY
      if (p2.length === 2 && !isNaN(Number(p0)) && !isNaN(Number(parts[1]))) {
        return `20${p2}-${parts[1].padStart(2, '0')}-${p0.padStart(2, '0')}`;
      }
    }

    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch (_) {}

  return fallback;
}

export const TEMPLATE_PLACEHOLDER_NAMES = new Set([
  'yash & twinkle',
  'yash and twinkle',
  'twinkle & yash',
  'rahul & neha',
  'rahul and neha',
  'neha & rahul',
  'valued client',
  'wedding client',
  'couple',
  'demo',
  'sample',
  'bride & groom',
  'groom & bride',
  'client',
  'default client'
]);

export function isPlaceholderCoupleName(name?: string | null): boolean {
  if (!name) return true;
  const clean = name.toLowerCase().trim();
  if (!clean || clean === 'undefined' || clean === 'null') return true;
  return TEMPLATE_PLACEHOLDER_NAMES.has(clean);
}

/**
 * Extracts the primary couple name from any quotation content_json payload (cover page, meta, etc.),
 * prioritizing the couple name entered on the quotation over raw lead names,
 * while strictly ignoring template dummy placeholder names like 'YASH & TWINKLE' or 'Rahul & Neha'.
 */
export function extractCoupleNameFromQuotation(
  contentJson: any,
  fallbackName?: string | null
): string {
  const safeFallback = (fallbackName && !isPlaceholderCoupleName(fallbackName)) ? fallbackName.trim() : '';

  if (!contentJson || typeof contentJson !== 'object') {
    return safeFallback || 'Wedding Client';
  }

  const cover = contentJson.cover || {};
  const meta = contentJson.meta || {};

  // 1. Explicit couple name in cover (if not a placeholder)
  const coverCoupleName = typeof cover.coupleName === 'string' ? cover.coupleName.trim() : '';
  if (coverCoupleName && !isPlaceholderCoupleName(coverCoupleName)) {
    return coverCoupleName;
  }

  // 2. Groom & Bride combined from cover (if not a placeholder)
  const groom = typeof cover.groomName === 'string' ? cover.groomName.trim() : '';
  const bride = typeof cover.brideName === 'string' ? cover.brideName.trim() : '';
  if (groom && bride) {
    const combined = `${groom} & ${bride}`;
    if (!isPlaceholderCoupleName(combined)) {
      return combined;
    }
  }
  if (groom && !isPlaceholderCoupleName(groom)) return groom;
  if (bride && !isPlaceholderCoupleName(bride)) return bride;

  // 3. Fallback lead couple name if available
  if (safeFallback) {
    return safeFallback;
  }

  // 4. Client name in quotation root or meta
  const rootClient = typeof contentJson.client_name === 'string' ? contentJson.client_name.trim() : '';
  if (rootClient && !isPlaceholderCoupleName(rootClient)) {
    return rootClient;
  }

  const metaClient = typeof meta.client_name === 'string' ? meta.client_name.trim() : '';
  if (metaClient && !isPlaceholderCoupleName(metaClient)) {
    return metaClient;
  }

  const metaCouple = typeof meta.couple_name === 'string' ? meta.couple_name.trim() : '';
  if (metaCouple && !isPlaceholderCoupleName(metaCouple)) {
    return metaCouple;
  }

  // 5. Project name if it contains wedding couple
  const metaProj = typeof meta.project_name === 'string' ? meta.project_name.trim() : '';
  if (metaProj && (metaProj.includes('&') || metaProj.toLowerCase().includes('wedding'))) {
    const cleaned = metaProj.replace(/\bwedding\b/gi, '').replace(/\bphotography\b/gi, '').replace(/[-–—]/g, '').trim();
    if (cleaned && !isPlaceholderCoupleName(cleaned)) return cleaned;
  }

  return (coverCoupleName && !isPlaceholderCoupleName(coverCoupleName)) 
    ? coverCoupleName 
    : (safeFallback || fallbackName || 'Wedding Client').trim();
}

/**
 * Extracts and calculates exact financial numbers and payment milestones
 * from any quotation content_json payload (Airy proposal, classic, or custom).
 */
export function extractFinancialsFromQuotation(
  contentJson: any,
  fallbackEventDate?: string | null
): ExtractedQuotationFinancials {
  if (!contentJson || typeof contentJson !== 'object') {
    return {
      base_package_price: 0,
      discount_amount: 0,
      accommodation_charges: 0,
      travel_charges: 0,
      additional_charges: 0,
      subtotal_amount: 0,
      gst_rate: 0,
      gst_amount: 0,
      final_total_amount: 0,
      received_amount: 0,
      pending_amount: 0,
      payment_status: 'pending',
      milestones: []
    };
  }

  // 1. Extract pricing page
  const pricing = contentJson.pricingPage || contentJson.pricing || {};
  const base = Math.max(0, Math.round(Number(pricing.basePrice ?? pricing.subTotalAmount ?? pricing.base ?? 0)));
  const discount = Math.max(0, Math.round(Number(pricing.discountAmount ?? pricing.discount ?? 0)));
  const accommodation = Math.max(0, Math.round(Number(pricing.accommodationCharges ?? pricing.accommodation ?? 0)));
  const travel = Math.max(0, Math.round(Number(pricing.travelCharges ?? pricing.travel ?? 0)));
  const customAddl = Array.isArray(pricing.additionalChargesList)
    ? pricing.additionalChargesList.reduce((sum: number, c: any) => sum + (Number(c?.amount) || 0), 0)
    : 0;
  const additional = Math.max(0, Math.round(Number(pricing.additionalCharges ?? pricing.additional ?? 0))) + customAddl;

  // Calculate gross / subtotal
  let subtotal = Math.max(0, base - discount + accommodation + travel + additional);
  if (subtotal === 0 && pricing.subTotalAmount) {
    subtotal = Math.max(0, Math.round(Number(pricing.subTotalAmount)));
  }

  const gstRate = Math.max(0, Number(pricing.gstPct ?? pricing.gstPercent ?? 0));
  const gstAmount = Math.round((subtotal * gstRate) / 100);
  const finalTotal = subtotal + gstAmount;

  // 2. Extract Event Date & Type from cover
  const cover = contentJson.cover || {};
  let rawEventDate = cover.eventDate || cover.weddingDate || cover.wedding_date || fallbackEventDate || null;
  const eventDate = rawEventDate ? normalizeToIsoDate(rawEventDate, fallbackEventDate) : null;
  const eventType = cover.eventType || contentJson.eventGroup || 'Wedding Photography';

  // 3. Extract payment schedule / milestones
  const schedule = contentJson.paymentTermsPage || contentJson.payment_schedule || contentJson.paymentSchedule || {};
  const rawSteps = Array.isArray(schedule.steps) ? schedule.steps : (Array.isArray(schedule.items) ? schedule.items : []);

  let milestones: FinanceMilestoneItem[] = [];
  let calculatedReceived = 0;

  if (rawSteps.length > 0) {
    milestones = rawSteps.map((step: any, idx: number) => {
      const stepName = String(step.stepName || step.name || step.title || step.step || step.label || `Milestone ${idx + 1}`).trim();
      let stepAmount = Number(step.amount ?? step.price ?? step.val ?? 0);

      // If amount is 0 but percentage string is provided (e.g. "30%"), calculate from final total
      if (stepAmount === 0 && (step.pct || step.percent)) {
        const pctNum = parseFloat(String(step.pct || step.percent).replace('%', ''));
        if (!isNaN(pctNum) && pctNum > 0) {
          stepAmount = Math.round((finalTotal * pctNum) / 100);
        }
      }

      stepAmount = Math.round(stepAmount);

      const statusLower = String(step.status || 'pending').toLowerCase();
      const isCompleted = statusLower === 'completed' || statusLower === 'paid' || statusLower === 'received';
      const status: 'completed' | 'pending' = isCompleted ? 'completed' : 'pending';

      const rawStepDate = step.date || step.due_date || step.dueDate || eventDate;
      const dueDate = normalizeToIsoDate(rawStepDate, eventDate);
      const paymentMode = step.payment_mode || step.paymentMode || 'UPI';
      const paidDate = isCompleted ? normalizeToIsoDate(step.paid_date || step.paidDate || rawStepDate, dueDate) : null;

      if (isCompleted) {
        calculatedReceived += Math.max(0, stepAmount);
      }

      return {
        id: step.id || `m_${idx + 1}_${Date.now()}`,
        step_name: stepName,
        title: stepName,
        due_date: dueDate,
        amount: stepAmount,
        status,
        payment_mode: paymentMode,
        paid_date: paidDate
      };
    });
  }

  const receivedAmount = Math.max(0, calculatedReceived);
  const pendingAmount = Math.max(0, finalTotal - receivedAmount);
  const paymentStatus: 'paid' | 'partially_paid' | 'pending' =
    pendingAmount === 0 && finalTotal > 0
      ? 'paid'
      : receivedAmount > 0
      ? 'partially_paid'
      : 'pending';

  return {
    base_package_price: base,
    discount_amount: discount,
    accommodation_charges: accommodation,
    travel_charges: travel,
    additional_charges: additional,
    subtotal_amount: subtotal,
    gst_rate: gstRate,
    gst_amount: gstAmount,
    final_total_amount: finalTotal,
    received_amount: receivedAmount,
    pending_amount: pendingAmount,
    payment_status: paymentStatus,
    milestones,
    event_date: eventDate,
    event_type: eventType
  };
}

/**
 * Strictly finds ONLY the marked Final Quotation for a given lead ID.
 * Returns null if no quotation is explicitly marked as final or chosen by user.
 */
export async function findFinalQuotationForLead(supabaseClient: any, leadId: string) {
  if (!leadId) return null;

  try {
    const leadShortId = leadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    const { data: docs, error: docErr } = await supabaseClient
      .from('quotation_documents')
      .select('id, template_id, lead_id, version, lead_version, content_json, created_at, updated_at')
      .or(`lead_id.eq.${leadId},template_id.ilike.%${leadShortId}%`)
      .order('created_at', { ascending: false });

    if (!docErr && docs && docs.length > 0) {
      const finalDoc = docs.find((d: any) => d.content_json?.is_final === true || d.is_final === true);
      if (finalDoc) return finalDoc;
    }

    // Check leads table for final_quotation_id
    const { data: lead } = await supabaseClient
      .from('leads')
      .select('final_quotation_id, quotation_id')
      .eq('id', leadId)
      .maybeSingle();

    if (lead?.final_quotation_id && docs) {
      const match = docs.find((d: any) => d.template_id === lead.final_quotation_id || d.id === lead.final_quotation_id);
      if (match) return match;
    }
  } catch (err) {
    console.warn('[QuotationSync] Error finding final quotation for lead:', err);
  }

  return null;
}

/**
 * Retrieves all quotation versions for a lead, formatted with extracted financials.
 */
export async function findAllQuotationsForLead(supabaseClient: any, leadId: string) {
  if (!leadId) return [];

  try {
    const leadShortId = leadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    const { data: docs, error: docErr } = await supabaseClient
      .from('quotation_documents')
      .select('id, template_id, lead_id, version, lead_version, content_json, created_at, updated_at')
      .or(`lead_id.eq.${leadId},template_id.ilike.%${leadShortId}%`)
      .order('created_at', { ascending: false });

    if (!docErr && docs && docs.length > 0) {
      return docs.map((d: any) => {
        const v = Number(d.lead_version || d.version || 1);
        const financials = d.content_json ? extractFinancialsFromQuotation(d.content_json) : null;
        const couple = extractCoupleNameFromQuotation(d.content_json, '');
        return {
          id: d.id,
          template_id: d.template_id,
          version: v,
          title: couple ? `${couple} (V${v})` : `Quotation Version ${v}`,
          is_final: d.content_json?.is_final === true || d.is_final === true,
          created_at: d.created_at,
          financials
        };
      });
    }
  } catch (err) {
    console.warn('[QuotationSync] Error finding all quotations for lead:', err);
  }

  return [];
}

/**
 * Finds the latest quotation document for a given lead ID.
 */
export async function findLatestQuotationForLead(supabaseClient: any, leadId: string) {
  if (!leadId) return null;

  try {
    const finalDoc = await findFinalQuotationForLead(supabaseClient, leadId);
    if (finalDoc) return finalDoc;

    const { data: docs, error: docErr } = await supabaseClient
      .from('quotation_documents')
      .select('id, template_id, lead_id, version, lead_version, content_json, created_at, updated_at')
      .or(`lead_id.eq.${leadId},template_id.eq.FW-L-${leadId},template_id.eq.FW-Q-${leadId}`)
      .order('created_at', { ascending: false });

    if (!docErr && docs && docs.length > 0) {
      // Find highest version or latest created
      const sorted = [...docs].sort((a: any, b: any) => {
        const verA = Number(a.lead_version || a.version || 0);
        const verB = Number(b.lead_version || b.version || 0);
        if (verA !== verB) return verB - verA;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
      return sorted[0];
    }

    // Fallback: check quotations table
    const { data: quotes } = await supabaseClient
      .from('quotations')
      .select('id, quotation_number, client_id, client_name, title, status, financials, content_json, updated_at')
      .or(`client_id.eq.${leadId},quotation_number.eq.FW-L-${leadId},quotation_number.eq.FW-Q-${leadId}`)
      .order('updated_at', { ascending: false });

    if (quotes && quotes.length > 0) {
      return {
        id: quotes[0].id,
        template_id: quotes[0].quotation_number,
        lead_id: leadId,
        version: 1,
        content_json: quotes[0].content_json || {
          pricingPage: {
            basePrice: quotes[0].financials?.total_amount || 0
          }
        },
        created_at: quotes[0].updated_at,
        updated_at: quotes[0].updated_at
      };
    }
  } catch (err) {
    console.warn('[QuotationSync] Error finding latest quotation for lead:', err);
  }

  return null;
}

/**
 * Synchronizes a lead's latest quotation to its linked client & finance records.
 */
export async function syncLeadQuotationToFinance(
  supabaseClient: any,
  leadId: string,
  clientId: string,
  workspaceId: string
) {
  if (!leadId || !clientId) return null;

  try {
    const latestQuote = await findLatestQuotationForLead(supabaseClient, leadId);
    if (!latestQuote || !latestQuote.content_json) return null;

    const financials = extractFinancialsFromQuotation(latestQuote.content_json);

    // 1. Update workspace_clients total & paid amount
    await supabaseClient
      .from('workspace_clients')
      .update({
        total_package_amount: financials.final_total_amount,
        paid_amount: financials.received_amount,
        event_type: financials.event_type || undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId);

    // 2. Upsert client_finance_records
    const financePayload = {
      user_id: workspaceId,
      workspace_id: workspaceId,
      client_id: clientId,
      base_package_price: financials.base_package_price,
      discount_amount: financials.discount_amount,
      accommodation_charges: financials.accommodation_charges,
      travel_charges: financials.travel_charges,
      additional_charges: financials.additional_charges,
      subtotal_amount: financials.subtotal_amount,
      gst_rate: financials.gst_rate,
      gst_amount: financials.gst_amount,
      final_total_amount: financials.final_total_amount,
      received_amount: financials.received_amount,
      pending_amount: financials.pending_amount,
      payment_status: financials.payment_status,
      milestones: financials.milestones,
      updated_at: new Date().toISOString()
    };

    const { data: existing } = await supabaseClient
      .from('client_finance_records')
      .select('id')
      .eq('client_id', clientId)
      .maybeSingle();

    if (existing) {
      await supabaseClient
        .from('client_finance_records')
        .update(financePayload)
        .eq('client_id', clientId);
    } else {
      await supabaseClient
        .from('client_finance_records')
        .insert([{ ...financePayload, created_at: new Date().toISOString() }]);
    }

    return financials;
  } catch (err) {
    console.error('[QuotationSync] Exception syncing quotation to finance:', err);
    return null;
  }
}

export interface ExtractedSubEvent {
  event_title: string;
  event_date: string;
  is_date_tbd?: boolean;
  venue_name?: string | null;
  venue_map_link?: string | null;
  roll_call_time?: string | null;
  dismissal_estimate_time?: string | null;
  shift_hours_slot?: string | null;
  operational_notes?: string | null;
  roles: string[];
}

export function isNonCrewItem(str: string): boolean {
  const lower = String(str || '').toLowerCase().trim();
  return (
    lower.includes('changing room') ||
    lower.includes('portable changing') ||
    lower.includes('vanity') ||
    lower.includes('makeup room') ||
    lower.includes('dressing room') ||
    lower.includes('tent') ||
    lower.includes('props')
  );
}

/**
 * Normalizes a role string into a standard Crew Role title (e.g. "Cinematic" -> "Cinematographer").
 */
export function normalizeRoleName(rawRole: string): string {
  const trimmed = String(rawRole || '').trim();
  if (!trimmed || isNonCrewItem(trimmed)) return '';

  const lower = trimmed.toLowerCase();

  // Cinematography / Cinematic
  if (lower.includes('cinemat') || lower.includes('cinematic')) {
    return 'Cinematographer';
  }
  // Candid Photography
  if (lower.includes('candid')) {
    return 'Candid Photographer';
  }
  // Traditional Photography
  if (lower.includes('traditional') && (lower.includes('photo') || !lower.includes('video'))) {
    return 'Traditional Photographer';
  }
  // Traditional Video
  if (lower.includes('traditional') && (lower.includes('video') || lower.includes('movie'))) {
    return 'Traditional Videographer';
  }
  // Drone
  if (lower.includes('drone')) {
    return 'Drone Pilot';
  }
  // Assistant
  if (lower.includes('assistant') || lower.includes('helper') || lower.includes('light')) {
    return 'Assistant';
  }
  // Reels
  if (lower.includes('reel')) {
    return 'Reels Creator';
  }
  // Family
  if (lower.includes('family')) {
    return 'Family Photographer';
  }

  // Strip trailing plural 's' if not ending in 'ss'
  let clean = trimmed;
  if (clean.length > 3 && clean.endsWith('s') && !clean.endsWith('ss')) {
    clean = clean.slice(0, -1);
  }

  return clean;
}

function parseStringCrewRequirement(str: string): { role: string; count: number }[] {
  const trimmed = str.trim();
  if (!trimmed || isNonCrewItem(trimmed)) return [];

  // Split multiple lines or comma-separated roles if any
  if (trimmed.includes('\n') || (trimmed.includes(',') && !trimmed.includes('('))) {
    const parts = trimmed.split(/[\n,]+/).map(p => p.trim()).filter(Boolean);
    const result: { role: string; count: number }[] = [];
    for (const p of parts) {
      result.push(...parseStringCrewRequirement(p));
    }
    return result;
  }

  // 1. Prefix count: e.g. "2 Cinematographers", "2x Drone Pilot", "2 - Assistant", "2: Cinematic"
  const prefixMatch = trimmed.match(/^(\d+)\s*(?:x|\*|:|-)?\s+(.+)$/i);
  if (prefixMatch) {
    if (isNonCrewItem(prefixMatch[2])) return [];
    const count = Math.max(1, parseInt(prefixMatch[1], 10) || 1);
    const role = normalizeRoleName(prefixMatch[2]);
    return role ? [{ role, count }] : [];
  }

  // 2. Suffix count with separator: e.g. "Cinematographer x 2", "Cinematic (2)", "Assistant: 2", "Cinematic - 2"
  const suffixMatch = trimmed.match(/^(.+?)\s*(?:x|\*|:|-|\()\s*(\d+)\s*\)?$/i);
  if (suffixMatch) {
    if (isNonCrewItem(suffixMatch[1])) return [];
    const role = normalizeRoleName(suffixMatch[1]);
    const count = Math.max(1, parseInt(suffixMatch[2], 10) || 1);
    return role ? [{ role, count }] : [];
  }

  // 3. Trailing space + number: e.g. "Cinematographer 2", "Assistant 1"
  const trailingMatch = trimmed.match(/^(.+?)\s+(\d+)$/);
  if (trailingMatch) {
    if (isNonCrewItem(trailingMatch[1])) return [];
    const role = normalizeRoleName(trailingMatch[1]);
    const count = Math.max(1, parseInt(trailingMatch[2], 10) || 1);
    return role ? [{ role, count }] : [];
  }

  // Default: count 1
  const role = normalizeRoleName(trimmed);
  return role ? [{ role, count: 1 }] : [];
}

/**
 * Parses any requirement representation (object, string with prefix/suffix count, etc.)
 * and returns the normalized role name along with the exact count.
 */
export function parseCrewRequirement(req: any): { role: string; count: number }[] {
  if (!req) return [];

  // If object with name and qty / count
  if (typeof req === 'object' && req !== null) {
    const rawName = String(req.name || req.role || req.title || '').trim();
    if (isNonCrewItem(rawName)) return [];
    let count = Math.max(1, parseInt(String(req.qty ?? req.count ?? req.quantity ?? 1), 10) || 1);

    // If count is 1, check if the string inside name has an embedded count (e.g. name: "2 Cinematographers")
    if (count === 1 && rawName) {
      const parsedFromName = parseStringCrewRequirement(rawName);
      if (parsedFromName.length > 0) {
        return parsedFromName;
      }
    }

    const role = normalizeRoleName(rawName || 'Crew');
    return role ? [{ role, count }] : [];
  }

  // If string
  if (typeof req === 'string') {
    return parseStringCrewRequirement(req);
  }

  return [];
}

/**
 * Extracts structured sub-events, dates, timings, venues, slots, notes, and crew
 * from any quotation content_json payload (Airy proposal, classic, or custom).
 * Respects crew count multipliers (e.g. Cinematic: 2 -> 2 slots).
 */
export function extractSubEventsFromQuotation(
  contentJson: any,
  fallbackEventDate?: string | null,
  fallbackVenue?: string | null
): ExtractedSubEvent[] {
  if (!contentJson || typeof contentJson !== 'object') return [];

  const subEvents: ExtractedSubEvent[] = [];

  // 1. Functions Page (Modern Quotation Builder)
  const funcPage = contentJson.functionsPage || contentJson.functions || {};
  const funcItems = Array.isArray(funcPage.items) ? funcPage.items : (Array.isArray(funcPage) ? funcPage : []);

  if (funcItems.length > 0) {
    for (const item of funcItems) {
      const title = String(item.name || item.title || item.event_title || 'Wedding Event').trim();
      const isDateTbd = Boolean(item.dateNotFixed || !item.date || String(item.date).toLowerCase().includes('tbd') || String(item.date).toLowerCase().includes('not fixed'));
      const date = item.date ? normalizeToIsoDate(item.date, fallbackEventDate) : (fallbackEventDate || new Date().toISOString().split('T')[0]);
      const venue = String(item.location || item.venue || fallbackVenue || '').trim();
      const startTime = String(item.startTime || item.start_time || item.time || '10:00 AM').trim();
      const endTime = String(item.endTime || item.end_time || '06:00 PM').trim();
      const slot = String(item.durationSlot || item.slot || item.shift || 'Full Day').trim();
      const notes = String(item.notes || item.description || '').trim();

      // Extract required crew roles with multiplier expansion
      const roles: string[] = [];
      const rawRequirements = Array.isArray(item.requirements)
        ? item.requirements
        : (Array.isArray(item.crew) ? item.crew : (Array.isArray(item.roles) ? item.roles : []));

      if (rawRequirements.length > 0) {
        for (const req of rawRequirements) {
          const parsedList = parseCrewRequirement(req);
          for (const p of parsedList) {
            for (let c = 0; c < p.count; c++) {
              roles.push(p.role);
            }
          }
        }
      }

      subEvents.push({
        event_title: title,
        event_date: date,
        is_date_tbd: isDateTbd,
        venue_name: venue || null,
        roll_call_time: startTime,
        dismissal_estimate_time: endTime,
        shift_hours_slot: slot,
        operational_notes: notes || null,
        roles: roles.length > 0 ? roles : ['Traditional Photographer', 'Cinematographer']
      });
    }
  }

  // 2. Shoot Details Page (Pre-Wedding Shoot) - if shootDetails exists and is enabled
  const hasShootInSequence = !Array.isArray(contentJson.pageSequence) || contentJson.pageSequence.length === 0 || contentJson.pageSequence.some((p: any) => p?.type === 'shootDetails' || p?.id === 'shootDetails');
  const isShootEnabled = hasShootInSequence && contentJson.shootDetails?.enabled !== false && contentJson.shootDetails?.visible !== false;

  if (isShootEnabled && contentJson.shootDetails && (contentJson.shootDetails.heading || contentJson.shootDetails.daysText || contentJson.shootDetails.date || contentJson.shootDetails.location || contentJson.shootDetails.crewText)) {
    const shoot = contentJson.shootDetails;
    const shootTitle = String(shoot.heading || 'Pre-Wedding Shoot').trim();
    const alreadyExists = subEvents.some(s => s.event_title.toLowerCase() === shootTitle.toLowerCase());
    if (!alreadyExists) {
      const shootRoles: string[] = [];
      if (shoot.crewText) {
        const lines = String(shoot.crewText).split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          const parsedList = parseCrewRequirement(line);
          for (const p of parsedList) {
            for (let c = 0; c < p.count; c++) {
              shootRoles.push(p.role);
            }
          }
        }
      }

      const rawShootDate = shoot.date || shoot.eventDate || shoot.shootDate || null;
      const isDateTbd = !rawShootDate || String(rawShootDate).toLowerCase().includes('tbd') || String(rawShootDate).toLowerCase().includes('not fixed');
      const shootDate = rawShootDate ? normalizeToIsoDate(rawShootDate, fallbackEventDate) : 'Date Not Fixed';

      subEvents.push({
        event_title: shootTitle,
        event_date: shootDate,
        is_date_tbd: isDateTbd,
        venue_name: shoot.location || shoot.venue || fallbackVenue || null,
        roll_call_time: '09:00 AM',
        dismissal_estimate_time: '06:00 PM',
        shift_hours_slot: shoot.daysText || '1 Day Shoot',
        // Operational notes for the event should be operational notes/description, NOT deliverables!
        operational_notes: shoot.notes || shoot.description || null,
        roles: shootRoles.length > 0 ? shootRoles : ['Candid Photographer', 'Cinematographer']
      });
    }
  }

  // 3. Fallback: Classic events / event_schedule / wedding_events
  if (subEvents.length === 0) {
    const rawList = contentJson.events || contentJson.event_schedule || contentJson.wedding_events || [];
    if (Array.isArray(rawList) && rawList.length > 0) {
      for (const ev of rawList) {
        const title = String(ev.title || ev.name || ev.event_name || 'Wedding Event').trim();
        const date = ev.date || ev.event_date ? normalizeToIsoDate(ev.date || ev.event_date, fallbackEventDate) : (fallbackEventDate || new Date().toISOString().split('T')[0]);
        const venue = String(ev.venue || ev.location || fallbackVenue || '').trim();
        const startTime = String(ev.start_time || ev.time || '10:00 AM').trim();
        const endTime = String(ev.end_time || '06:00 PM').trim();
        const slot = String(ev.slot || ev.shift || 'Full Day').trim();
        const notes = String(ev.notes || ev.description || '').trim();

        const roles: string[] = [];
        const rawCrew = Array.isArray(ev.crew) ? ev.crew : (Array.isArray(ev.roles) ? ev.roles : []);
        if (rawCrew.length > 0) {
          for (const req of rawCrew) {
            const parsedList = parseCrewRequirement(req);
            for (const p of parsedList) {
              for (let c = 0; c < p.count; c++) {
                roles.push(p.role);
              }
            }
          }
        }

        subEvents.push({
          event_title: title,
          event_date: date,
          venue_name: venue || null,
          roll_call_time: startTime,
          dismissal_estimate_time: endTime,
          shift_hours_slot: slot,
          operational_notes: notes || null,
          roles: roles.length > 0 ? roles : ['Traditional Photographer', 'Cinematographer']
        });
      }
    }
  }

  return subEvents;
}

/**
 * Synchronizes quotation sub-events (dates, timings, venue, slots, notes, crew)
 * into Team Manager / Bookings & Events (fw_projects + fw_sub_events + fw_assignments).
 * Non-destructively preserves already assigned crew members slot-by-slot.
 */
export async function syncQuotationToTeamManagerEvents(
  supabaseClient: any,
  leadId: string,
  contentJson: any,
  clientName: string,
  workspaceId: string,
  fallbackEventDate?: string | null,
  fallbackVenue?: string | null,
  clientId?: string | null
) {
  if (!clientName || !contentJson) return null;

  try {
    const extractedEvents = extractSubEventsFromQuotation(contentJson, fallbackEventDate, fallbackVenue);
    if (extractedEvents.length === 0) return null;

    // Deduplicate extractedEvents strictly by normalized event_title
    const uniqueEvents: ExtractedSubEvent[] = [];
    const seenTitles = new Set<string>();
    for (const ev of extractedEvents) {
      const key = ev.event_title.trim().toLowerCase();
      if (!seenTitles.has(key)) {
        seenTitles.add(key);
        uniqueEvents.push(ev);
      }
    }

    // 1. Find or create master project in fw_projects scoped by user_id / workspaceId
    let targetProjectId: string | null = null;

    let projQuery = supabaseClient
      .from('fw_projects')
      .select('id, client_name, project_manager_name, project_manager_id, client_id')
      .eq('user_id', workspaceId);

    if (clientId) {
      projQuery = projQuery.or(`client_id.eq.${clientId},client_name.ilike.%${clientName.trim()}%`);
    } else {
      projQuery = projQuery.ilike('client_name', `%${clientName.trim()}%`);
    }

    const { data: existingProjects } = await projQuery;

    const firstSubEventDate = uniqueEvents[0]?.event_date || fallbackEventDate || new Date().toISOString().split('T')[0];
    const firstSubEventVenue = uniqueEvents[0]?.venue_name || fallbackVenue || 'TBD Venue';

    if (existingProjects && existingProjects.length > 0) {
      targetProjectId = existingProjects[0].id;
      // Update client_name to couple name, main date & venue, and link client_id
      await supabaseClient
        .from('fw_projects')
        .update({
          client_name: clientName.trim(),
          client_id: clientId || existingProjects[0].client_id || null,
          main_date: firstSubEventDate,
          main_venue: firstSubEventVenue,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetProjectId);
    } else {
      const { data: newProj, error: projErr } = await supabaseClient
        .from('fw_projects')
        .insert([{
          client_name: clientName.trim(),
          client_id: clientId || null,
          main_date: firstSubEventDate,
          main_venue: firstSubEventVenue,
          user_id: workspaceId,
          status: 'active'
        }])
        .select()
        .single();

      if (projErr) throw projErr;
      if (newProj) targetProjectId = newProj.id;
    }

    if (!targetProjectId) return null;

    // 2. Fetch existing sub-events & assignments to preserve existing crew assignments slot-by-slot
    const { data: existingSubEvents } = await supabaseClient
      .from('fw_sub_events')
      .select('id, event_title')
      .eq('project_id', targetProjectId);

    // Multi-member preservation queue: Map of `event_title|role` -> Array<{ memberId, agreedAmount, notes }>
    const existingAssignedMap = new Map<string, Array<{ memberId: string; agreedAmount?: number | null; notes?: string | null }>>();

    if (existingSubEvents && existingSubEvents.length > 0) {
      const subEventIds = existingSubEvents.map((e: any) => e.id);
      const { data: existingAssignments } = await supabaseClient
        .from('fw_assignments')
        .select('sub_event_id, required_role, assigned_member_id, agreed_amount, notes')
        .in('sub_event_id', subEventIds)
        .not('assigned_member_id', 'is', null);

      if (existingAssignments) {
        existingAssignments.forEach((a: any) => {
          const se = existingSubEvents.find((e: any) => e.id === a.sub_event_id);
          if (se && a.assigned_member_id && a.required_role) {
            const key = `${se.event_title.trim().toLowerCase()}|${a.required_role.trim().toLowerCase()}`;
            if (!existingAssignedMap.has(key)) {
              existingAssignedMap.set(key, []);
            }
            existingAssignedMap.get(key)!.push({
              memberId: a.assigned_member_id,
              agreedAmount: a.agreed_amount,
              notes: a.notes
            });
          }
        });
      }

      // Delete old assignments and sub_events to cleanly sync with final quotation events
      await supabaseClient.from('fw_assignments').delete().in('sub_event_id', subEventIds);
      await supabaseClient.from('fw_sub_events').delete().eq('project_id', targetProjectId);
    }

    // 3. Insert fresh unique sub-events and restore assignments slot-by-slot
    for (const ev of uniqueEvents) {
      const isDateTbd = Boolean(ev.is_date_tbd || !ev.event_date || ev.event_date === 'Date Not Fixed' || ev.event_date.toLowerCase().includes('tbd'));
      const subEventPayload = {
        project_id: targetProjectId,
        event_title: ev.event_title,
        event_date: isDateTbd ? null : ev.event_date,
        is_date_tbd: isDateTbd,
        venue_name: ev.venue_name || null,
        venue_map_link: ev.venue_map_link || null,
        roll_call_time: ev.roll_call_time || '10:00 AM',
        dismissal_estimate_time: ev.dismissal_estimate_time || '06:00 PM',
        shift_hours_slot: ev.shift_hours_slot || 'Full Day',
        operational_notes: ev.operational_notes || null,
        roles: ev.roles,
        user_id: workspaceId
      };

      const { data: insertedSubEvent, error: seErr } = await supabaseClient
        .from('fw_sub_events')
        .insert([subEventPayload])
        .select()
        .single();

      if (!seErr && insertedSubEvent && ev.roles.length > 0) {
        const assignmentsPayload = ev.roles.map((role) => {
          const key = `${ev.event_title.trim().toLowerCase()}|${role.trim().toLowerCase()}`;
          const memberQueue = existingAssignedMap.get(key) || [];
          const preserved = memberQueue.shift() || null;

          return {
            project_id: targetProjectId,
            sub_event_id: insertedSubEvent.id,
            sub_event_name: ev.event_title,
            sub_event_date: isDateTbd ? (fallbackEventDate || new Date().toISOString().split('T')[0]) : ev.event_date,
            start_time: ev.roll_call_time || '10:00 AM',
            end_time: ev.dismissal_estimate_time || '06:00 PM',
            required_role: role,
            assigned_member_id: preserved?.memberId || null,
            agreed_amount: preserved?.agreedAmount || null,
            notes: preserved?.notes || null,
            status: preserved?.memberId ? 'assigned' : 'pending',
            user_id: workspaceId,
            workspace_id: workspaceId,
            client_name: clientName.trim()
          };
        });

        await supabaseClient.from('fw_assignments').insert(assignmentsPayload);
      }
    }

    return targetProjectId;
  } catch (err) {
    console.error('[QuotationSync] Error syncing quotation to team manager:', err);
    return null;
  }
}

/**
 * Authoritative Central Sync:
 * Synchronizes a Booked Lead or Final Quotation across:
 * 1. Client Directory (`workspace_clients` & `clients`)
 * 2. Finance & Payments (`client_finance_records` & `finance_records`)
 * 3. Booking Events (`fw_projects`, `fw_sub_events`, `fw_assignments`)
 * 4. Post Production (`post_production_projects`, `post_production_project_config`, `post_production_deliverables`)
 * 5. CRM Lead (`leads` table with client_id, couple_name, couple_names, booked status)
 *
 * All entities are strictly named after the Couple Name (e.g. "Rohan & Sneha Wedding" / "Rohan & Sneha").
 */
// In-memory lock map to serialize concurrent syncs for the same leadId
const activeLeadSyncs = new Map<string, Promise<any>>();

export async function syncBookedLeadOrFinalQuotation({
  leadId,
  quotationId,
  workspaceId: explicitWorkspaceId,
  forceBookedStatus = true,
  supabaseClient = supabaseAdmin
}: {
  leadId: string;
  quotationId?: string | null;
  workspaceId?: string | null;
  forceBookedStatus?: boolean;
  supabaseClient?: any;
}): Promise<{
  success: boolean;
  coupleName: string;
  workspaceClientId: string | null;
  leadId: string;
} | null> {
  if (!leadId) return null;

  if (activeLeadSyncs.has(leadId)) {
    try {
      return await activeLeadSyncs.get(leadId);
    } catch (_) {}
  }

  const syncPromise = (async () => {
    try {
      const now = new Date().toISOString();

      // 1. Fetch Lead
      const { data: lead, error: leadErr } = await supabaseClient
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .maybeSingle();

      if (leadErr || !lead) {
        console.warn(`[syncBookedLeadOrFinalQuotation] Lead not found or error: ${leadId}`, leadErr);
        return null;
      }

      const workspaceId = lead.workspace_id || explicitWorkspaceId || lead.tenant_id || lead.created_by_user_id || SUPER_ADMIN_ID;

      // 2. Fetch Target Quotation (either specified quotationId, or final_quotation_id, or latest quotation)
      let finalDoc: any = null;
      const targetQId = quotationId || lead.final_quotation_id || lead.raw_payload?.final_quotation_id;

      if (targetQId) {
        const { data: doc } = await supabaseClient
          .from('quotation_documents')
          .select('id, template_id, lead_id, version, lead_version, content_json')
          .or(`template_id.eq.${targetQId},id.eq.${targetQId}`)
          .maybeSingle();
        if (doc) finalDoc = doc;
      }

      if (!finalDoc) {
        finalDoc = await findFinalQuotationForLead(supabaseClient, leadId);
      }
      if (!finalDoc) {
        finalDoc = await findLatestQuotationForLead(supabaseClient, leadId);
      }

      // 3. Extract Couple Name strictly (Prioritizes quotation cover couple name over raw contact person)
      const rawPayload = lead.raw_payload || {};
      const leadContactName = rawPayload.couple_name 
        || rawPayload.couple_names 
        || (lead as any).couple_names 
        || lead.client_name 
        || lead.name 
        || 'Valued Client';

      const coupleName = finalDoc?.content_json
        ? extractCoupleNameFromQuotation(finalDoc.content_json, leadContactName)
        : leadContactName;

      const eventDate = lead.event_date || finalDoc?.content_json?.meta?.event_date || null;
      const mainVenue = lead.location || finalDoc?.content_json?.meta?.venue || finalDoc?.content_json?.cover?.locationName || finalDoc?.content_json?.cover?.venue || 'TBD Venue';
      const financials = extractFinancialsFromQuotation(finalDoc?.content_json, eventDate);
      const eventType = financials.event_type || lead.event_type || 'Wedding Photography';

      // 4. Update or Insert Client Directory (workspace_clients & clients)
      let workspaceClientId: string | null = null;

      const { data: existingWsClients } = await supabaseClient
        .from('workspace_clients')
        .select('id, name')
        .or(`lead_id.eq.${leadId},id.eq.${leadId}`)
        .order('created_at', { ascending: true });

      let existingWsClient = existingWsClients?.[0];

      if (!existingWsClient && coupleName) {
        const { data: clientByName } = await supabaseClient
          .from('workspace_clients')
          .select('id, name')
          .eq('workspace_id', workspaceId)
          .ilike('name', coupleName.trim())
          .maybeSingle();
        if (clientByName) existingWsClient = clientByName;
      }

      const extendedNotesPayload = JSON.stringify({
        client_code: `CL-${Math.floor(1000 + Math.random() * 9000)}`,
        whatsapp_group_link: lead.whatsapp_group_id ? `https://chat.whatsapp.com/${lead.whatsapp_group_id}` : '',
        whatsapp_group_id: lead.whatsapp_group_id || '',
        portal_token: `tok_${Date.now()}_${Math.random().toString(36).substring(5)}`,
        portal_pin: '1234',
        portal_enabled: true,
        plain_notes: `Auto-synced from Booked CRM Lead (${coupleName})`,
        notes: `Auto-synced from Booked CRM Lead (${coupleName})`,
        events: eventDate ? [
          {
            id: `ev_${Date.now()}`,
            name: eventType,
            date: eventDate,
            time_start: '',
            time_end: '',
            venue: (mainVenue && mainVenue !== 'TBD Venue') ? mainVenue : '',
            city: lead.city || '',
            assigned_crew: ''
          }
        ] : []
      });

      const wsClientPayload = {
        user_id: workspaceId,
        workspace_id: workspaceId,
        lead_id: leadId,
        name: coupleName.trim(),
        phone: lead.phone || null,
        email: lead.email || null,
        event_type: eventType,
        event_date: eventDate,
        total_package_amount: financials.final_total_amount,
        paid_amount: financials.received_amount,
        status: 'active',
        notes: extendedNotesPayload,
        updated_at: now
      };

      if (existingWsClient?.id) {
        workspaceClientId = existingWsClient.id;
        await supabaseClient
          .from('workspace_clients')
          .update(wsClientPayload)
          .eq('id', workspaceClientId);
      } else {
        const { data: clientByName } = await supabaseClient
          .from('workspace_clients')
          .select('id')
          .eq('workspace_id', workspaceId)
          .ilike('name', coupleName.trim())
          .maybeSingle();

        if (clientByName?.id) {
          workspaceClientId = clientByName.id;
          await supabaseClient
            .from('workspace_clients')
            .update({ ...wsClientPayload, id: workspaceClientId })
            .eq('id', workspaceClientId);
        } else {
          const { data: newWsClient } = await supabaseClient
            .from('workspace_clients')
            .insert({
              ...wsClientPayload,
              created_at: now
            })
            .select('id')
            .single();
          workspaceClientId = newWsClient?.id || null;
        }
      }

      // Sync legacy clients table for backward compatibility
      try {
        if (workspaceId) {
          const { data: existingLegacy } = await supabaseClient
            .from('clients')
            .select('id')
            .eq('workspace_id', workspaceId)
            .ilike('name', coupleName.trim())
            .maybeSingle();

          if (existingLegacy?.id) {
            await supabaseClient
              .from('clients')
              .update({
                name: coupleName.trim(),
                phone: lead.phone || null,
                email: lead.email || null,
                updated_at: now
              })
              .eq('id', existingLegacy.id);
          } else {
            await supabaseClient
              .from('clients')
              .insert({
                workspace_id: workspaceId,
                name: coupleName.trim(),
                phone: lead.phone || null,
                email: lead.email || null,
                created_at: now,
                updated_at: now
              });
          }
        }
      } catch (_) {}

      // 5. Upsert client_finance_records (Finance Page primary source of truth)
      if (workspaceClientId) {
        const clientFinPayload = {
          user_id: workspaceId,
          workspace_id: workspaceId,
          client_id: workspaceClientId,
          base_package_price: financials.base_package_price || financials.subtotal_amount,
          discount_amount: financials.discount_amount || 0,
          accommodation_charges: financials.accommodation_charges || 0,
          travel_charges: financials.travel_charges || 0,
          additional_charges: financials.additional_charges || 0,
          subtotal_amount: financials.subtotal_amount,
          gst_rate: financials.gst_rate || 0,
          gst_amount: financials.gst_amount || 0,
          final_total_amount: financials.final_total_amount,
          received_amount: financials.received_amount,
          pending_amount: financials.pending_amount,
          payment_status: financials.payment_status,
          milestones: financials.milestones,
          notes: `Auto-generated from Quotation (${coupleName}).`,
          updated_at: now
        };

        const { data: existingFin } = await supabaseClient
          .from('client_finance_records')
          .select('id')
          .eq('client_id', workspaceClientId)
          .maybeSingle();

        if (existingFin?.id) {
          await supabaseClient
            .from('client_finance_records')
            .update(clientFinPayload)
            .eq('id', existingFin.id);
        } else {
          await supabaseClient
            .from('client_finance_records')
            .insert({
              ...clientFinPayload,
              created_at: now
            });
        }

        // Legacy finance_records
        try {
          if (workspaceId) {
            const { data: existingLegacyFin } = await supabaseClient
              .from('finance_records')
              .select('id')
              .eq('workspace_id', workspaceId)
              .or(`client_name.ilike.${coupleName.trim()},lead_id.eq.${leadId}`)
              .maybeSingle();

            const legacyFinPayload = {
              workspace_id: workspaceId,
              client_id: workspaceClientId,
              lead_id: leadId,
              client_name: coupleName.trim(),
              event_name: eventType,
              event_date: eventDate,
              base_package_price: financials.base_package_price || financials.subtotal_amount,
              discount_amount: financials.discount_amount || 0,
              accommodation_charges: financials.accommodation_charges || 0,
              travel_charges: financials.travel_charges || 0,
              additional_charges: financials.additional_charges || 0,
              subtotal_amount: financials.subtotal_amount,
              gst_rate: financials.gst_rate || 0,
              gst_amount: financials.gst_amount || 0,
              final_total_amount: financials.final_total_amount,
              received_amount: financials.received_amount,
              pending_amount: financials.pending_amount,
              payment_status: financials.payment_status,
              payment_type: 'custom',
              notes: `Auto-generated from Quotation (${coupleName}).`,
              updated_at: now
            };

            if (existingLegacyFin?.id) {
              await supabaseClient
                .from('finance_records')
                .update(legacyFinPayload)
                .eq('id', existingLegacyFin.id);
            } else {
              await supabaseClient
                .from('finance_records')
                .insert({ ...legacyFinPayload, created_at: now });
            }
          }
        } catch (_) {}
      }

      // 6. Booking Events Sync: fw_projects + fw_sub_events + fw_assignments
      let targetProjectId: string | null = null;
      try {
        if (workspaceId && finalDoc?.content_json) {
          targetProjectId = await syncQuotationToTeamManagerEvents(
            supabaseClient,
            leadId,
            finalDoc.content_json,
            coupleName,
            workspaceId,
            eventDate,
            mainVenue,
            workspaceClientId
          );
        } else if (workspaceId) {
          // Create master project if doesn't exist
          const { data: existingProjs } = await supabaseClient
            .from('fw_projects')
            .select('id')
            .eq('user_id', workspaceId)
            .or(`client_id.eq.${workspaceClientId},client_name.ilike.%${coupleName.trim()}%`);

          if (!existingProjs || existingProjs.length === 0) {
            const { data: createdProj } = await supabaseClient
              .from('fw_projects')
              .insert([{
                client_name: coupleName.trim(),
                client_id: workspaceClientId || null,
                main_date: eventDate || now.split('T')[0],
                main_venue: mainVenue,
                user_id: workspaceId,
                status: 'active'
              }])
              .select('id')
              .single();
            targetProjectId = createdProj?.id || null;
          } else {
            targetProjectId = existingProjs[0].id;
            await supabaseClient
              .from('fw_projects')
              .update({
                client_name: coupleName.trim(),
                client_id: workspaceClientId || null,
                main_date: eventDate || undefined,
                main_venue: mainVenue || undefined,
                updated_at: now
              })
              .eq('id', targetProjectId);
          }
        }
      } catch (tmErr) {
        console.error('[syncBookedLeadOrFinalQuotation] Error syncing team manager:', tmErr);
      }

      // 7. Post-Production Sync: post_production_projects + deliverables
      try {
        if (workspaceId && finalDoc?.content_json) {
          const parsed = parseQuotationDeliverables(finalDoc);
          const clientTargets = [workspaceClientId, leadId].filter(Boolean) as string[];
          const ppNotes = `quotation_id:${finalDoc.template_id || quotationId || ''};quotation_title:${finalDoc.content_json?.meta?.project_name || `${coupleName} Wedding`};pp_config:${encodeURIComponent(JSON.stringify({ enabled_segments: parsed.enabledSegments }))};`;

          for (const cId of clientTargets) {
            const { data: existingPPP } = await supabaseClient
              .from('post_production_projects')
              .select('id')
              .eq('client_id', cId)
              .maybeSingle();

            if (existingPPP) {
              await supabaseClient
                .from('post_production_projects')
                .update({
                  deliverables: parsed.deliverables,
                  notes: ppNotes,
                  overall_status: 'active',
                  updated_at: now
                })
                .eq('id', existingPPP.id);
            } else {
              await supabaseClient
                .from('post_production_projects')
                .insert({
                  user_id: workspaceId,
                  workspace_id: workspaceId,
                  client_id: cId,
                  deliverables: parsed.deliverables,
                  notes: ppNotes,
                  overall_status: 'active',
                  created_at: now,
                  updated_at: now
                });
            }
          }

          // Link post-production config & deliverables across both workspaceClientId and targetProjectId
          const configTargets = [workspaceClientId, targetProjectId].filter(Boolean) as string[];
          for (const pId of configTargets) {
            try {
              await supabaseClient
                .from('post_production_project_config')
                .upsert({
                  project_id: pId,
                  enabled_segments: parsed.enabledSegments || ['Wedding'],
                  updated_at: now
                }, { onConflict: 'project_id' });
            } catch (_) {}

            try {
              await supabaseClient
                .from('post_production_deliverables')
                .delete()
                .eq('project_id', pId);

              if (parsed.deliverables && parsed.deliverables.length > 0) {
                const rowsToInsert = parsed.deliverables.map((deliv: any) => ({
                  project_id: pId,
                  segment: deliv.segment || 'Wedding',
                  category: deliv.category || 'Photos',
                  title: deliv.title,
                  specs: deliv.specs || deliv.count || null,
                  status: 'Upcoming',
                  is_custom: false,
                  updated_at: now
                }));
                await supabaseClient.from('post_production_deliverables').insert(rowsToInsert);
              }
            } catch (_) {}
          }
        }
      } catch (ppErr) {
        console.error('[syncBookedLeadOrFinalQuotation] Error syncing post production:', ppErr);
      }

      // 8. Update Lead Record with client_id, couple_name, stage_id, and status
      try {
        let bookedStageId: string | null = null;
        if (forceBookedStatus) {
          try {
            const targetWs = lead.workspace_id || workspaceId;
            const { data: wsStages } = await supabaseClient
              .from('crm_stages')
              .select('id, name')
              .or(`workspace_id.eq.${targetWs},workspace_id.eq.${workspaceId}`);

            const matchedStage = (wsStages || []).find((s: any) =>
              s.id === 'booked' || String(s.name || '').toLowerCase().includes('book')
            );
            if (matchedStage?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matchedStage.id)) {
              bookedStageId = matchedStage.id;
            }
          } catch (_) {}
        }

        const updatedPayload = {
          ...(lead.raw_payload || {}),
          couple_name: coupleName.trim(),
          couple_names: coupleName.trim(),
          client_id: workspaceClientId,
          ...(quotationId ? { final_quotation_id: quotationId } : {}),
          ...(forceBookedStatus ? { stage: 'booked', ...(bookedStageId ? { stage_id: bookedStageId } : {}) } : {})
        };

        const updatePayload: any = {
          client_id: workspaceClientId,
          ...(quotationId ? { final_quotation_id: quotationId } : {}),
          raw_payload: updatedPayload,
          updated_at: now
        };

        if (forceBookedStatus) {
          updatePayload.status = 'closed';
          if (bookedStageId) {
            updatePayload.stage_id = bookedStageId;
          }
        }

        await supabaseClient
          .from('leads')
          .update(updatePayload)
          .eq('id', leadId);

        // Also ensure quotations table is flagged is_final = true
        if (quotationId) {
          try {
            await supabaseClient
              .from('quotations')
              .update({
                is_final: true,
                status: 'accepted',
                updated_at: now
              })
              .or(`quotation_number.eq.${quotationId},id.eq.${quotationId}`);
          } catch (qErr) {
            console.warn('[syncBookedLeadOrFinalQuotation] quotations sync notice:', qErr);
          }
        }
      } catch (leadUpErr) {
        console.error('[syncBookedLeadOrFinalQuotation] Error updating lead payload:', leadUpErr);
      }

      return {
        success: true,
        coupleName: coupleName.trim(),
        workspaceClientId,
        leadId
      };
    } catch (err: any) {
      console.error('[syncBookedLeadOrFinalQuotation] Exception:', err);
      return null;
    }
  })();

  activeLeadSyncs.set(leadId, syncPromise);
  try {
    return await syncPromise;
  } finally {
    activeLeadSyncs.delete(leadId);
  }
}

