import type { ClientFinanceRecord, FinanceMilestoneItem } from '@/types';

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
 * Normalizes any free-text date (e.g. "10 FEB 26", "10 Feb 2026", "10/02/2026", "2026-02-10")
 * into standard HTML-compatible ISO format "YYYY-MM-DD".
 */
export function normalizeToIsoDate(rawDate?: any, fallbackDate?: string | null): string {
  const fallback = fallbackDate && fallbackDate.includes('-') ? fallbackDate.split('T')[0] : new Date().toISOString().split('T')[0];
  if (!rawDate) return fallback;

  const dateStr = String(rawDate).trim();
  if (!dateStr || dateStr.toLowerCase() === 'dd-mm-yyyy' || dateStr.toLowerCase() === 'undefined' || dateStr.toLowerCase() === 'null') {
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

  try {
    const parts = dateStr.split(/[\s\-\/\.]+/);
    if (parts.length === 3) {
      // Case "10 FEB 26" -> parts: ["10", "FEB", "26"]
      if (parts[2].length === 2) {
        const fullYear = `20${parts[2]}`;
        const parsed = new Date(`${parts[0]} ${parts[1]} ${fullYear}`);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }
      }
      // Case DD/MM/YYYY
      if (parts[2].length === 4 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch (_) {}

  return fallback;
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
    const { data: docs, error: docErr } = await supabaseClient
      .from('quotation_documents')
      .select('id, template_id, lead_id, version, lead_version, content_json, created_at, updated_at')
      .or(`lead_id.eq.${leadId},template_id.eq.FW-L-${leadId},template_id.eq.FW-Q-${leadId}`)
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
    const { data: docs, error: docErr } = await supabaseClient
      .from('quotation_documents')
      .select('id, template_id, lead_id, version, lead_version, content_json, created_at, updated_at')
      .or(`lead_id.eq.${leadId},template_id.eq.FW-L-${leadId},template_id.eq.FW-Q-${leadId}`)
      .order('created_at', { ascending: false });

    if (!docErr && docs && docs.length > 0) {
      return docs.map((d: any) => {
        const v = Number(d.lead_version || d.version || 1);
        const financials = d.content_json ? extractFinancialsFromQuotation(d.content_json) : null;
        const couple = d.content_json?.cover?.coupleName || d.content_json?.cover?.groomName || '';
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
  venue_name?: string | null;
  venue_map_link?: string | null;
  roll_call_time?: string | null;
  dismissal_estimate_time?: string | null;
  shift_hours_slot?: string | null;
  operational_notes?: string | null;
  roles: string[];
}

/**
 * Extracts structured sub-events, dates, timings, venues, slots, notes, and crew
 * from any quotation content_json payload (Airy proposal, classic, or custom).
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
      const date = item.date ? normalizeToIsoDate(item.date, fallbackEventDate) : (fallbackEventDate || new Date().toISOString().split('T')[0]);
      const venue = String(item.location || item.venue || fallbackVenue || '').trim();
      const startTime = String(item.startTime || item.start_time || item.time || '10:00 AM').trim();
      const endTime = String(item.endTime || item.end_time || '06:00 PM').trim();
      const slot = String(item.durationSlot || item.slot || item.shift || 'Full Day').trim();
      const notes = String(item.notes || item.description || '').trim();

      // Extract required crew roles
      const roles: string[] = [];
      if (Array.isArray(item.requirements)) {
        item.requirements.forEach((req: any) => {
          if (typeof req === 'string') {
            roles.push(req);
          } else if (typeof req === 'object' && req !== null) {
            const roleName = String(req.name || req.role || req.title || 'Crew').trim();
            const qty = Math.max(1, parseInt(String(req.qty || req.count || 1), 10) || 1);
            for (let i = 0; i < qty; i++) {
              roles.push(roleName);
            }
          }
        });
      } else if (Array.isArray(item.crew)) {
        roles.push(...item.crew);
      } else if (Array.isArray(item.roles)) {
        roles.push(...item.roles);
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

  // 2. Shoot Details Page (Pre-Wedding Shoot) - ONLY if shootDetails is explicitly included in pageSequence and enabled!
  const hasShootInSequence = Array.isArray(contentJson.pageSequence) && contentJson.pageSequence.some((p: any) => p?.type === 'shootDetails' || p?.id === 'shootDetails');
  const isShootEnabled = hasShootInSequence && contentJson.shootDetails?.enabled !== false;

  if (isShootEnabled && contentJson.shootDetails && (contentJson.shootDetails.heading || contentJson.shootDetails.daysText)) {
    const shoot = contentJson.shootDetails;
    const shootTitle = String(shoot.heading || 'Pre-Wedding Shoot').trim();
    const alreadyExists = subEvents.some(s => s.event_title.toLowerCase() === shootTitle.toLowerCase());
    if (!alreadyExists) {
      const shootRoles: string[] = [];
      if (shoot.crewText) {
        const lines = String(shoot.crewText).split('\n').map(l => l.trim()).filter(Boolean);
        shootRoles.push(...lines);
      }

      const rawShootDate = shoot.date || shoot.eventDate || shoot.shootDate || null;
      const shootDate = rawShootDate ? normalizeToIsoDate(rawShootDate, fallbackEventDate) : 'Date Not Fixed';

      subEvents.push({
        event_title: shootTitle,
        event_date: shootDate,
        venue_name: shoot.location || shoot.venue || fallbackVenue || null,
        roll_call_time: '09:00 AM',
        dismissal_estimate_time: '06:00 PM',
        shift_hours_slot: shoot.daysText || '1 Day Shoot',
        operational_notes: shoot.deliverablesText || null,
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
        const roles = Array.isArray(ev.crew) ? ev.crew : (Array.isArray(ev.roles) ? ev.roles : ['Traditional Photographer', 'Cinematographer']);

        subEvents.push({
          event_title: title,
          event_date: date,
          venue_name: venue || null,
          roll_call_time: startTime,
          dismissal_estimate_time: endTime,
          shift_hours_slot: slot,
          operational_notes: notes || null,
          roles: roles
        });
      }
    }
  }

  return subEvents;
}

/**
 * Synchronizes quotation sub-events (dates, timings, venue, slots, notes, crew)
 * into Team Manager / Bookings & Events (fw_projects + fw_sub_events + fw_assignments).
 */
export async function syncQuotationToTeamManagerEvents(
  supabaseClient: any,
  leadId: string,
  contentJson: any,
  clientName: string,
  workspaceId: string,
  fallbackEventDate?: string | null,
  fallbackVenue?: string | null
) {
  if (!clientName || !contentJson) return null;

  try {
    const extractedEvents = extractSubEventsFromQuotation(contentJson, fallbackEventDate, fallbackVenue);
    if (extractedEvents.length === 0) return null;

    // 1. Find or create master project in fw_projects
    let targetProjectId: string | null = null;

    const { data: existingProjects } = await supabaseClient
      .from('fw_projects')
      .select('id, client_name, project_manager_name, project_manager_id')
      .ilike('client_name', `%${clientName}%`);

    const firstSubEventDate = extractedEvents[0]?.event_date || fallbackEventDate || new Date().toISOString().split('T')[0];
    const firstSubEventVenue = extractedEvents[0]?.venue_name || fallbackVenue || null;

    if (existingProjects && existingProjects.length > 0) {
      targetProjectId = existingProjects[0].id;
      // Update main date & venue if updated
      await supabaseClient
        .from('fw_projects')
        .update({
          main_date: firstSubEventDate,
          main_venue: firstSubEventVenue,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetProjectId);
    } else {
      const { data: newProj, error: projErr } = await supabaseClient
        .from('fw_projects')
        .insert([{
          client_name: clientName,
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

    // 2. Fetch existing sub-events & assignments to preserve existing crew assignments if any
    const { data: existingSubEvents } = await supabaseClient
      .from('fw_sub_events')
      .select('id, event_title')
      .eq('project_id', targetProjectId);

    const existingAssignedMap: Record<string, string> = {};

    if (existingSubEvents && existingSubEvents.length > 0) {
      const subEventIds = existingSubEvents.map((e: any) => e.id);
      const { data: existingAssignments } = await supabaseClient
        .from('fw_assignments')
        .select('sub_event_id, required_role, assigned_member_id')
        .in('sub_event_id', subEventIds)
        .not('assigned_member_id', 'is', null);

      if (existingAssignments) {
        existingAssignments.forEach((a: any) => {
          const se = existingSubEvents.find((e: any) => e.id === a.sub_event_id);
          if (se && a.assigned_member_id) {
            const key = `${se.event_title}|${a.required_role}`;
            existingAssignedMap[key] = a.assigned_member_id;
          }
        });
      }

      // Delete old assignments and sub_events to cleanly sync with final quotation events
      await supabaseClient.from('fw_assignments').delete().in('sub_event_id', subEventIds);
      await supabaseClient.from('fw_sub_events').delete().eq('project_id', targetProjectId);
    }

    // 3. Insert fresh sub-events and restore assignments where applicable
    for (const ev of extractedEvents) {
      const subEventPayload = {
        project_id: targetProjectId,
        event_title: ev.event_title,
        event_date: ev.event_date,
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
        const assignmentsPayload = ev.roles.map(role => {
          const preservedMember = existingAssignedMap[`${ev.event_title}|${role}`] || null;
          return {
            project_id: targetProjectId,
            sub_event_id: insertedSubEvent.id,
            sub_event_name: ev.event_title,
            sub_event_date: ev.event_date,
            start_time: ev.roll_call_time || '10:00 AM',
            end_time: ev.dismissal_estimate_time || '06:00 PM',
            required_role: role,
            assigned_member_id: preservedMember,
            status: preservedMember ? 'assigned' : 'pending'
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
