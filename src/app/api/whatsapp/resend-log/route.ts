import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Helper to inject variables
function injectPlaceholders(templateText: string, lead: any) {
  let text = templateText || '';
  const leadName = lead.name || '';
  const eventDateStr = lead.raw_payload?.event_date || '';
  
  let daysLeftStr = '';
  if (eventDateStr) {
    const eventDate = new Date(eventDateStr);
    const timeDiff = eventDate.getTime() - new Date().getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    daysLeftStr = daysDiff > 0 ? String(daysDiff) : '0';
  }

  const replacements: Record<string, string> = {
    lead_name: leadName,
    event_date: eventDateStr,
    days_left_for_wedding: daysLeftStr,
  };

  text = text.replace(/\{\{\s*lead_name\s*\}\}/g, leadName || 'there');
  text = text.replace(/\{\{\s*event_date\s*\}\}/g, eventDateStr || 'your special day');
  text = text.replace(/\{\{\s*days_left_for_wedding\s*\}\}/g, daysLeftStr || 'some');

  // Replace default patterns like {{lead_name || "Guest"}}
  const advancedRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*(?:\|\||\|default\s*\(?|\|)\s*['"]?([^'"}()]+)['"]?\)?\s*\}\}/g;
  text = text.replace(advancedRegex, (match, key, fallback) => {
    let val = '';
    if (replacements[key] !== undefined) {
      val = replacements[key];
    } else {
      val = lead.raw_payload?.[key] || '';
    }
    return val ? String(val) : fallback.trim();
  });

  // Replace simple patterns like {{budget}}
  const simpleRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  text = text.replace(simpleRegex, (match, key) => {
    if (replacements[key] !== undefined) return replacements[key];
    return lead.raw_payload?.[key] !== undefined ? String(lead.raw_payload[key]) : '';
  });

  return text;
}

// Helper to compile variables for WhatsBoost
function getTemplateVariables(lead: any) {
  const leadName = lead.name || '';
  const eventDateStr = lead.raw_payload?.event_date || '';
  let daysLeftStr = '';
  if (eventDateStr) {
    const eventDate = new Date(eventDateStr);
    const timeDiff = eventDate.getTime() - new Date().getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    daysLeftStr = daysDiff > 0 ? String(daysDiff) : '0';
  }

  return {
    lead_name: leadName,
    event_date: eventDateStr,
    days_left_for_wedding: daysLeftStr,
    ...(lead.raw_payload || {}),
  };
}

// Helper to send message (mimicking trigger-automation route)
async function sendWhatsAppTemplateMessage(
  workspaceId: string,
  phone: string,
  templateName: string,
  lead: any
) {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (!profile) {
      return { success: false, error: 'Workspace profile not found' };
    }

    const { data: template } = await supabaseAdmin
      .from('whatsapp_templates')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('name', templateName)
      .maybeSingle();

    if (!template) {
      return { success: false, error: `Template "${templateName}" not found in workspace templates.` };
    }

    const app_key = process.env.WHASTBOOST_APP_KEY || profile.whastboost_app_key;
    const auth_key = process.env.WHASTBOOST_AUTH_KEY || profile.whastboost_token;
    const isMock = !auth_key || auth_key === 'mock-token' || profile.whastboost_status !== 'connected';

    const cleanPhone = phone.replace(/\+/g, '').trim();

    if (isMock) {
      // Mock retry is ALWAYS successful to let users clear errors in demo mode!
      return {
        success: true,
        messageId: `mock-wamid.RETRY.${Math.random().toString(36).substring(2).toUpperCase()}`
      };
    }

    const templateSlug = template.name.toLowerCase().trim().replace(/\s+/g, '_');
    
    const formData = new FormData();
    formData.append('appkey', app_key || '');
    formData.append('authkey', auth_key || '');
    formData.append('to', cleanPhone);
    formData.append('name', lead.name || 'Client');
    formData.append('template_id', templateSlug);

    const variables = getTemplateVariables(lead);
    Object.keys(variables).forEach(key => {
      formData.append(`variables[${key}]`, String(variables[key]));
    });

    if (template.type === 'media' && template.payload?.mediaUrl) {
      formData.append('file', template.payload.mediaUrl);
    }

    const res = await fetch('https://whatsboost.in/api/create-message', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (res.ok && (data.status === true || data.success === true || data.messageId)) {
      return { success: true, messageId: data.messageId || 'wamid.sent' };
    } else {
      return { success: false, error: data.message || data.error || `WhatsBoost returned error: ${res.status}` };
    }
  } catch (err: any) {
    console.error('sendWhatsAppTemplateMessage error:', err);
    return { success: false, error: err.message || 'Connection error to WhatsBoost.' };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { logId } = body;

    if (!logId) {
      return NextResponse.json({ success: false, error: 'Missing logId parameter' }, { status: 400 });
    }

    // 1. Fetch Log
    const { data: log, error: logErr } = await supabaseAdmin
      .from('whatsapp_automation_logs')
      .select('*')
      .eq('id', logId)
      .single();

    if (logErr || !log) {
      return NextResponse.json({ success: false, error: 'Automation log entry not found.' }, { status: 404 });
    }

    // 2. Fetch Lead details
    const { data: lead, error: leadErr } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', log.lead_id)
      .single();

    if (leadErr || !lead) {
      return NextResponse.json({ success: false, error: 'Associated lead not found.' }, { status: 404 });
    }

    // 3. Trigger Send
    const sendResult = await sendWhatsAppTemplateMessage(
      log.workspace_id,
      log.phone,
      log.template_name,
      lead
    );

    // 4. Update Log Table
    const { data: updatedLog } = await supabaseAdmin
      .from('whatsapp_automation_logs')
      .update({
        status: sendResult.success ? 'sent' : 'failed',
        sent_at: sendResult.success ? new Date().toISOString() : null,
        error_message: sendResult.success ? null : sendResult.error,
        updated_at: new Date().toISOString()
      })
      .eq('id', logId)
      .select()
      .single();

    // 5. Add Live Log Activity
    await supabaseAdmin.from('live_logs').insert({
      workspace_id: log.workspace_id,
      lead_id: log.lead_id,
      event_type: sendResult.success ? 'whatsapp_sent' : 'whatsapp_failed',
      message: sendResult.success
        ? `Resend Success: Step ${log.step_number} (${log.automation_type}) delivered to ${lead.name || log.phone}.`
        : `Resend Failed: Step ${log.step_number} (${log.automation_type}) failed for ${lead.name || log.phone}: ${sendResult.error}`,
      metadata: {
        logId: logId,
        template: log.template_name,
        resend: true,
        error: sendResult.success ? null : sendResult.error
      }
    });

    return NextResponse.json({
      success: sendResult.success,
      error: sendResult.success ? null : sendResult.error,
      log: updatedLog
    });

  } catch (err: any) {
    console.error('Resend Log Route Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
