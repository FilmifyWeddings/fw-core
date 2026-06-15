import { Lead, SequenceStep } from '@/types';
import { supabaseAdmin } from './supabase';

/**
 * Replaces placeholders in template with dynamic lead attributes.
 * Handles fallback syntax: {{variable || 'fallback'}} or {{variable | default('fallback')}}
 */
export function injectPlaceholders(template: string, lead: Lead, scheduledDate: Date): string {
  let text = template;
  
  const leadName = lead.name || '';
  const eventDateStr = lead.raw_payload.event_date || '';
  
  let daysLeftStr = '';
  if (eventDateStr) {
    const eventDate = new Date(eventDateStr);
    const timeDiff = eventDate.getTime() - scheduledDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    daysLeftStr = daysDiff > 0 ? String(daysDiff) : '0';
  }

  // Pre-process standard keys
  const replacements: Record<string, string> = {
    lead_name: leadName,
    event_date: eventDateStr,
    days_left_for_wedding: daysLeftStr,
  };

  // Replace default patterns first
  text = text.replace(/\{\{\s*lead_name\s*\}\}/g, leadName || 'there');
  text = text.replace(/\{\{\s*event_date\s*\}\}/g, eventDateStr || 'your special day');
  text = text.replace(/\{\{\s*days_left_for_wedding\s*\}\}/g, daysLeftStr || 'some');

  // Handle advanced fallback structures like {{lead_name || "Guest"}} or {{venue | default("your venue")}}
  const advancedRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*(?:\|\||\|default\s*\(?|\|)\s*['"]?([^'"}()]+)['"]?\)?\s*\}\}/g;
  text = text.replace(advancedRegex, (match, key, fallback) => {
    let val = '';
    if (replacements[key] !== undefined) {
      val = replacements[key];
    } else {
      val = lead.raw_payload[key] || '';
    }
    return val ? String(val) : fallback.trim();
  });

  // Re-check simple custom payload key placeholders
  const simpleRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  text = text.replace(simpleRegex, (match, key) => {
    if (replacements[key] !== undefined) return replacements[key];
    return lead.raw_payload[key] ? String(lead.raw_payload[key]) : '';
  });

  return text;
}

/**
 * Queries active sequence steps and populates the WhatsApp queue_messages table.
 */
export async function queueDripsForLead(workspaceId: string, lead: Lead): Promise<boolean> {
  try {
    // 1. Fetch active sequences
    const { data: sequences, error: seqErr } = await supabaseAdmin
      .from('sequences')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true);

    if (seqErr) throw seqErr;
    if (!sequences || sequences.length === 0) {
      console.log('No active campaigns/sequences found for workspace', workspaceId);
      return false;
    }

    const sequenceIds = sequences.map(s => s.id);

    // 2. Fetch steps for active sequences
    const { data: steps, error: stepErr } = await supabaseAdmin
      .from('sequence_steps')
      .select('*')
      .in('sequence_id', sequenceIds)
      .order('step_number', { ascending: true });

    if (stepErr) throw stepErr;
    if (!steps || steps.length === 0) {
      console.log('No sequence steps configured for active sequences.');
      return false;
    }

    const leadCreatedAt = new Date(lead.created_at);

    // 3. Loop and schedule
    const queuedItems = [];
    for (const step of steps) {
      // Calculate scheduled_for timestamp (Timestamp-Match Rule: preserves exact hour/minute of lead creation)
      const scheduledFor = new Date(leadCreatedAt.getTime());
      scheduledFor.setDate(scheduledFor.getDate() + step.delay_days);

      // Inject variables into message body
      const messageBody = injectPlaceholders(step.message_template, lead, scheduledFor);

      queuedItems.push({
        workspace_id: workspaceId,
        lead_id: lead.id,
        sequence_step_id: step.id,
        scheduled_for: scheduledFor.toISOString(),
        message_body: messageBody,
        status: 'pending',
        retry_count: 0,
      });
    }

    if (queuedItems.length > 0) {
      const { error: insertErr } = await supabaseAdmin
        .from('queue_messages')
        .insert(queuedItems);

      if (insertErr) throw insertErr;

      // Log scheduling success
      await supabaseAdmin.from('live_logs').insert({
        workspace_id: workspaceId,
        lead_id: lead.id,
        event_type: 'drip_scheduled',
        message: `Scheduled ${queuedItems.length} drip messages for lead "${lead.name || lead.phone}".`,
        metadata: { scheduledCount: queuedItems.length },
      });
    }

    return true;
  } catch (err: any) {
    console.error('queueDripsForLead error:', err);
    await supabaseAdmin.from('live_logs').insert({
      workspace_id: workspaceId,
      lead_id: lead.id,
      event_type: 'drip_scheduling_failed',
      message: `Failed to schedule drips: ${err.message || err}`,
      metadata: { error: String(err) },
    });
    return false;
  }
}
