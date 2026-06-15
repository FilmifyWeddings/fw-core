import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Helper to inject lead variables into template bodies
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

// Function to call WhatsBoost or Mock sending WhatsApp message
async function sendWhatsAppTemplateMessage(
  workspaceId: string,
  phone: string,
  templateName: string,
  lead: any
) {
  try {
    // 1. Fetch profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (!profile) {
      return { success: false, error: 'Workspace profile not found' };
    }

    // 2. Fetch template details
    const { data: template } = await supabaseAdmin
      .from('whatsapp_templates')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('name', templateName)
      .maybeSingle();

    if (!template) {
      return { success: false, error: `Template "${templateName}" not found in workspace templates.` };
    }

    // 3. Check credentials and status
    const app_key = process.env.WHASTBOOST_APP_KEY || profile.whastboost_app_key;
    const auth_key = process.env.WHASTBOOST_AUTH_KEY || profile.whastboost_token;
    const isMock = !auth_key || auth_key === 'mock-token' || profile.whastboost_status !== 'connected';

    const cleanPhone = phone.replace(/\+/g, '').trim();

    if (isMock) {
      // Simulation mode
      // If template name contains "fail" or 15% random chance of failure to test retry
      const shouldFail = templateName.toLowerCase().includes('fail') || Math.random() < 0.15;
      if (shouldFail) {
        return {
          success: false,
          error: 'WhatsBoost API Mock Error: Gateway returned status 503 (Device session inactive).'
        };
      }

      return {
        success: true,
        messageId: `mock-wamid.${Math.random().toString(36).substring(2).toUpperCase()}`
      };
    }

    // Real API Call
    // Convert template name to slug
    const templateSlug = template.name.toLowerCase().trim().replace(/\s+/g, '_');
    
    // We send using FormData multipart/form-data as per WhatsBoost spec
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
    
    // WhatsBoost returns { status: true, messageId: '...' } or similar on success
    if (res.ok && (data.status === true || data.success === true || data.messageId)) {
      return { success: true, messageId: data.messageId || 'wamid.sent' };
    } else {
      return { success: false, error: data.message || data.error || `WhatsBoost returned error code: ${res.status}` };
    }
  } catch (err: any) {
    console.error('sendWhatsAppTemplateMessage error:', err);
    return { success: false, error: err.message || 'Connection timeout to WhatsBoost.' };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lead } = body;

    if (!lead || !lead.id || !lead.workspace_id || !lead.phone) {
      return NextResponse.json({ success: false, error: 'Missing lead parameters (id, workspace_id, phone)' }, { status: 400 });
    }

    const workspaceId = lead.workspace_id;
    const phone = lead.phone;

    // 1. Check for Active Welcome Automation
    const { data: welcomeAutomation } = await supabaseAdmin
      .from('whatsapp_automations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('automation_type', 'welcome')
      .eq('is_active', true)
      .maybeSingle();

    let welcomeScheduled = 0;
    let welcomeSentImmediately = 0;

    if (welcomeAutomation && Array.isArray(welcomeAutomation.steps) && welcomeAutomation.steps.length > 0) {
      let cumulativeDelay = 0;
      const baseTime = new Date(lead.created_at || new Date().toISOString());

      for (let i = 0; i < welcomeAutomation.steps.length; i++) {
        const step = welcomeAutomation.steps[i];
        const stepNum = i + 1;
        const delaySeconds = parseInt(step.delay_seconds || step.delaySeconds || '0', 10);
        cumulativeDelay += delaySeconds;

        const scheduledTime = new Date(baseTime.getTime() + cumulativeDelay * 1000);

        // Check if log already exists to prevent duplication
        const { data: existingLog } = await supabaseAdmin
          .from('whatsapp_automation_logs')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('lead_id', lead.id)
          .eq('automation_type', 'welcome')
          .eq('step_number', stepNum)
          .maybeSingle();

        if (!existingLog) {
          // Check if it should be executed immediately (delay = 0 or scheduled time has passed)
          const isImmediate = scheduledTime.getTime() <= (Date.now() + 2000); // 2 second threshold

          // Insert Log Row
          const { data: insertedLog, error: logErr } = await supabaseAdmin
            .from('whatsapp_automation_logs')
            .insert({
              workspace_id: workspaceId,
              lead_id: lead.id,
              automation_type: 'welcome',
              step_number: stepNum,
              template_name: step.template_name || step.templateName,
              phone: phone,
              scheduled_for: scheduledTime.toISOString(),
              status: 'pending' // Insert as pending initially
            })
            .select()
            .single();

          if (logErr) {
            console.error('Error inserting welcome log:', logErr);
            continue;
          }

          welcomeScheduled++;

          if (isImmediate && insertedLog) {
            // Execute send immediately
            const sendResult = await sendWhatsAppTemplateMessage(
              workspaceId,
              phone,
              step.template_name || step.templateName,
              lead
            );

            // Update Log
            await supabaseAdmin
              .from('whatsapp_automation_logs')
              .update({
                status: sendResult.success ? 'sent' : 'failed',
                sent_at: sendResult.success ? new Date().toISOString() : null,
                error_message: sendResult.success ? null : sendResult.error,
                updated_at: new Date().toISOString()
              })
              .eq('id', insertedLog.id);

            // Add Live Activity Log
            await supabaseAdmin.from('live_logs').insert({
              workspace_id: workspaceId,
              lead_id: lead.id,
              event_type: sendResult.success ? 'whatsapp_sent' : 'whatsapp_failed',
              message: sendResult.success
                ? `Welcome Msg Step ${stepNum} (Instant) sent successfully to ${lead.name || phone}.`
                : `Welcome Msg Step ${stepNum} failed to send to ${lead.name || phone}: ${sendResult.error}`,
              metadata: {
                logId: insertedLog.id,
                template: step.template_name || step.templateName,
                status: sendResult.success ? 'sent' : 'failed',
                error: sendResult.success ? null : sendResult.error
              }
            });

            if (sendResult.success) {
              welcomeSentImmediately++;
            }
          }
        }
      }
    }

    // 2. Check for Active Followups Automation
    const { data: followupAutomation } = await supabaseAdmin
      .from('whatsapp_automations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('automation_type', 'followup')
      .eq('is_active', true)
      .maybeSingle();

    let followupsScheduled = 0;

    if (followupAutomation && Array.isArray(followupAutomation.steps) && followupAutomation.steps.length > 0) {
      const baseTime = new Date(lead.created_at || new Date().toISOString());

      for (let i = 0; i < followupAutomation.steps.length; i++) {
        const step = followupAutomation.steps[i];
        const stepNum = i + 1;
        const daysDelay = parseInt(step.day || step.delay_days || '1', 10);

        // Schedule at the same time of lead creation on day +N
        const scheduledTime = new Date(baseTime.getTime());
        scheduledTime.setDate(scheduledTime.getDate() + daysDelay);

        // Check if log already exists
        const { data: existingLog } = await supabaseAdmin
          .from('whatsapp_automation_logs')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('lead_id', lead.id)
          .eq('automation_type', 'followup')
          .eq('step_number', stepNum)
          .maybeSingle();

        if (!existingLog) {
          await supabaseAdmin
            .from('whatsapp_automation_logs')
            .insert({
              workspace_id: workspaceId,
              lead_id: lead.id,
              automation_type: 'followup',
              step_number: stepNum,
              template_name: step.template_name || step.templateName,
              phone: phone,
              scheduled_for: scheduledTime.toISOString(),
              status: 'pending'
            });

          followupsScheduled++;
        }
      }

      if (followupsScheduled > 0) {
        // Log follow-up scheduling
        await supabaseAdmin.from('live_logs').insert({
          workspace_id: workspaceId,
          lead_id: lead.id,
          event_type: 'drip_scheduled',
          message: `Scheduled ${followupsScheduled} day-wise follow-up drip templates for ${lead.name || phone}.`,
          metadata: { count: followupsScheduled }
        });
      }
    }

    return NextResponse.json({
      success: true,
      welcomeScheduled,
      welcomeSentImmediately,
      followupsScheduled
    });

  } catch (err: any) {
    console.error('Trigger Automation Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
