/**
 * ══════════════════════════════════════════════════════════════════
 * FW CORE — Custom Workflow Execution Engine
 * ══════════════════════════════════════════════════════════════════
 *
 * Handles:
 *  1. Token resolution:  {{trigger.phone}} → actual value
 *  2. Step dispatch:     whatsapp_send, google_sheet_append,
 *                        google_contact_create, whatsapp_delay_sequence,
 *                        http_request, whatsapp_group_alert
 *  3. Run logging:       writes to workflow_runs + workflow_step_logs
 * ══════════════════════════════════════════════════════════════════
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { sendMessageServerless } from '@/lib/baileys-serverless';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TriggerType = 'facebook_lead' | 'webhook' | 'manual' | 'crm_entry';

export type StepType =
  | 'whatsapp_send'
  | 'whatsapp_group_alert'
  | 'google_sheet_append'
  | 'google_contact_create'
  | 'whatsapp_delay_sequence'
  | 'http_request';

export interface WorkflowStep {
  id: string;
  type: StepType;
  label: string;
  config: Record<string, unknown>;
}

export interface WorkflowDefinition {
  id: string;
  workspace_id: string;
  name: string;
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown>;
  steps: WorkflowStep[];
  is_enabled: boolean;
}

export interface StepExecutionResult {
  success: boolean;
  output: Record<string, unknown>;
  error?: string;
}

// ─── Token Resolver ───────────────────────────────────────────────────────────
// Replaces {{trigger.field}} and {{step_N.field}} tokens with actual values.
// context = { trigger: {...}, step_0: {...}, step_1: {...}, ... }

function resolveTokens(
  value: unknown,
  context: Record<string, Record<string, unknown>>
): unknown {
  if (typeof value === 'string') {
    return value.replace(/\{\{(\w+)\.([^}]+)\}\}/g, (match, source, field) => {
      const src = context[source];
      if (!src) return match;
      // Support nested paths: step_1.lead.phone → context.step_1.lead.phone
      const parts = field.split('.');
      let v: unknown = src;
      for (const part of parts) {
        if (v === null || v === undefined) return match;
        v = (v as Record<string, unknown>)[part];
      }
      return v !== undefined && v !== null ? String(v) : match;
    });
  }
  if (Array.isArray(value)) {
    return value.map(v => resolveTokens(v, context));
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = resolveTokens(v, context);
    }
    return result;
  }
  return value;
}

function resolveStepConfig(
  config: Record<string, unknown>,
  context: Record<string, Record<string, unknown>>
): Record<string, unknown> {
  return resolveTokens(config, context) as Record<string, unknown>;
}

// ─── Step Dispatchers ─────────────────────────────────────────────────────────

async function executeWhatsAppSend(
  config: Record<string, unknown>,
  workspaceId: string,
  supabaseAdmin: SupabaseClient
): Promise<StepExecutionResult> {
  const to = config.to as string;
  const message = (config.message as string) || (config.text as string) || '';
  const templateId = config.template_id as string | undefined;
  const mediaUrl = config.media_url as string | undefined;

  if (!to) return { success: false, output: {}, error: 'Missing "to" phone/JID' };

  let result;
  if (templateId) {
    // Template-based send
    result = await sendMessageServerless(supabaseAdmin, workspaceId, {
      to,
      type: 'template' as any,
      templateId,
      variables: (config.variables as Record<string, string>) || {},
    } as any);
  } else if (mediaUrl) {
    const mimeType = (config.mime_type as string) || 'image/jpeg';
    const mediaType = mimeType.startsWith('video/') ? 'video' : 'image';
    result = await sendMessageServerless(supabaseAdmin, workspaceId, {
      to,
      type: mediaType as any,
      mediaUrl,
      caption: message,
      mimeType,
    });
  } else {
    result = await sendMessageServerless(supabaseAdmin, workspaceId, {
      to,
      type: 'text',
      text: message,
    });
  }

  return {
    success: result.success,
    output: { waMessageId: result.waMessageId },
    error: result.error,
  };
}

async function executeWhatsAppGroupAlert(
  config: Record<string, unknown>,
  workspaceId: string,
  supabaseAdmin: SupabaseClient
): Promise<StepExecutionResult> {
  const groupJid = config.group_jid as string;
  const message = (config.message as string) || '';

  if (!groupJid) return { success: false, output: {}, error: 'Missing group_jid' };

  const result = await sendMessageServerless(supabaseAdmin, workspaceId, {
    to: groupJid,
    type: 'text',
    text: message,
  });

  return {
    success: result.success,
    output: { waMessageId: result.waMessageId },
    error: result.error,
  };
}

async function executeGoogleSheetAppend(
  config: Record<string, unknown>,
  workspaceId: string,
  supabaseAdmin: SupabaseClient
): Promise<StepExecutionResult> {
  // Get Google OAuth token from integration_credentials
  const { data: creds } = await supabaseAdmin
    .from('integration_credentials')
    .select('access_token, refresh_token')
    .eq('user_id', workspaceId)
    .eq('provider', 'google')
    .maybeSingle();

  if (!creds?.access_token) {
    return { success: false, output: {}, error: 'Google not connected. Please link Google in Integrations.' };
  }

  const spreadsheetId = config.spreadsheet_id as string;
  const range = (config.range as string) || 'Sheet1!A:Z';
  const values = config.values as string[][];

  if (!spreadsheetId || !values) {
    return { success: false, output: {}, error: 'Missing spreadsheet_id or values' };
  }

  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${creds.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return { success: false, output: {}, error: `Sheets API error: ${err}` };
    }

    const data = await res.json();
    return {
      success: true,
      output: { updatedRange: data.updates?.updatedRange, updatedRows: data.updates?.updatedRows },
    };
  } catch (err: any) {
    return { success: false, output: {}, error: err.message };
  }
}

async function executeGoogleContactCreate(
  config: Record<string, unknown>,
  workspaceId: string,
  supabaseAdmin: SupabaseClient
): Promise<StepExecutionResult> {
  const { data: creds } = await supabaseAdmin
    .from('integration_credentials')
    .select('access_token')
    .eq('user_id', workspaceId)
    .eq('provider', 'google')
    .maybeSingle();

  if (!creds?.access_token) {
    return { success: false, output: {}, error: 'Google not connected.' };
  }

  const name = config.name as string;
  const phone = config.phone as string;
  const email = config.email as string | undefined;

  const person: Record<string, unknown> = {
    names: [{ displayName: name, givenName: name }],
    phoneNumbers: phone ? [{ value: phone, type: 'mobile' }] : [],
    emailAddresses: email ? [{ value: email, type: 'work' }] : [],
  };

  try {
    const res = await fetch('https://people.googleapis.com/v1/people:createContact', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(person),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, output: {}, error: `People API error: ${err}` };
    }

    const data = await res.json();
    return { success: true, output: { resourceName: data.resourceName } };
  } catch (err: any) {
    return { success: false, output: {}, error: err.message };
  }
}

async function executeDelayedWhatsAppSequence(
  config: Record<string, unknown>,
  workspaceId: string,
  supabaseAdmin: SupabaseClient
): Promise<StepExecutionResult> {
  const to = config.to as string;
  const templateId = config.template_id as string;
  const delayDays = Number(config.delay_days) || 1;
  const delaySeconds = delayDays * 86400;

  const scheduledAt = new Date(Date.now() + delaySeconds * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from('baileys_action_queue')
    .insert({
      workspace_id: workspaceId,
      action_type: 'send_template',
      payload: { to, templateId, variables: config.variables || {} },
      scheduled_at: scheduledAt,
      priority: 5,
    });

  if (error) return { success: false, output: {}, error: error.message };

  return {
    success: true,
    output: { scheduled_at: scheduledAt, delay_days: delayDays },
  };
}

async function executeHttpRequest(
  config: Record<string, unknown>
): Promise<StepExecutionResult> {
  const url = config.url as string;
  const method = ((config.method as string) || 'POST').toUpperCase();
  const headers = (config.headers as Record<string, string>) || {};
  const body = config.body;

  if (!url) return { success: false, output: {}, error: 'Missing URL' };

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: method !== 'GET' ? JSON.stringify(body) : undefined,
    });

    const responseText = await res.text();
    let responseData: unknown = responseText;
    try { responseData = JSON.parse(responseText); } catch { /* not JSON */ }

    return {
      success: res.ok,
      output: { status: res.status, response: responseData },
      error: res.ok ? undefined : `HTTP ${res.status}: ${responseText.slice(0, 200)}`,
    };
  } catch (err: any) {
    return { success: false, output: {}, error: err.message };
  }
}

// ─── Main Execution Runner ────────────────────────────────────────────────────

export async function executeWorkflow(
  workflow: WorkflowDefinition,
  triggerPayload: Record<string, unknown>,
  supabaseAdmin: SupabaseClient
): Promise<{ runId: string; success: boolean; stepsCompleted: number; stepsFailed: number }> {
  const workspaceId = workflow.workspace_id;

  // Create the run record
  const { data: runRecord, error: runInsertError } = await supabaseAdmin
    .from('workflow_runs')
    .insert({
      workflow_id: workflow.id,
      workspace_id: workspaceId,
      status: 'running',
      trigger_type: workflow.trigger_type,
      trigger_payload: triggerPayload,
      steps_total: workflow.steps.length,
    })
    .select('id')
    .single();

  if (runInsertError || !runRecord) {
    console.error('[workflow-engine] Failed to create run record:', runInsertError);
    return { runId: '', success: false, stepsCompleted: 0, stepsFailed: 0 };
  }

  const runId = runRecord.id;
  const context: Record<string, Record<string, unknown>> = {
    trigger: triggerPayload,
  };

  let stepsCompleted = 0;
  let stepsFailed = 0;
  let overallSuccess = true;

  // Execute steps sequentially
  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    const stepStartedAt = new Date().toISOString();

    // Insert step log as 'running'
    const { data: stepLog } = await supabaseAdmin
      .from('workflow_step_logs')
      .insert({
        run_id: runId,
        workflow_id: workflow.id,
        workspace_id: workspaceId,
        step_index: i,
        step_id: step.id,
        step_type: step.type,
        step_label: step.label,
        status: 'running',
        started_at: stepStartedAt,
        input_data: step.config,
      })
      .select('id')
      .single();

    // Resolve tokens in step config
    const resolvedConfig = resolveStepConfig(step.config, context);

    let result: StepExecutionResult;
    const t0 = Date.now();

    try {
      switch (step.type) {
        case 'whatsapp_send':
          result = await executeWhatsAppSend(resolvedConfig, workspaceId, supabaseAdmin);
          break;
        case 'whatsapp_group_alert':
          result = await executeWhatsAppGroupAlert(resolvedConfig, workspaceId, supabaseAdmin);
          break;
        case 'google_sheet_append':
          result = await executeGoogleSheetAppend(resolvedConfig, workspaceId, supabaseAdmin);
          break;
        case 'google_contact_create':
          result = await executeGoogleContactCreate(resolvedConfig, workspaceId, supabaseAdmin);
          break;
        case 'whatsapp_delay_sequence':
          result = await executeDelayedWhatsAppSequence(resolvedConfig, workspaceId, supabaseAdmin);
          break;
        case 'http_request':
          result = await executeHttpRequest(resolvedConfig);
          break;
        default:
          result = { success: false, output: {}, error: `Unknown step type: ${step.type}` };
      }
    } catch (err: any) {
      result = { success: false, output: {}, error: err.message || 'Unknown error' };
    }

    const durationMs = Date.now() - t0;

    // Update step log
    if (stepLog?.id) {
      await supabaseAdmin
        .from('workflow_step_logs')
        .update({
          status: result.success ? 'success' : 'failed',
          output_data: result.output,
          error_message: result.error || null,
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
        })
        .eq('id', stepLog.id);
    }

    // Accumulate context for next steps
    context[`step_${i}`] = result.output;

    if (result.success) {
      stepsCompleted++;
    } else {
      stepsFailed++;
      overallSuccess = false;
      // Continue executing remaining steps (partial run)
    }
  }

  const finalStatus = stepsFailed === 0 ? 'success' : (stepsCompleted > 0 ? 'partial' : 'failed');

  // Update run record
  await supabaseAdmin
    .from('workflow_runs')
    .update({
      status: finalStatus,
      steps_completed: stepsCompleted,
      steps_failed: stepsFailed,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now(),
    })
    .eq('id', runId);

  // Bump workflow stats
  await supabaseAdmin.rpc('rpc_bump_workflow_run_stats', {
    p_workflow_id: workflow.id,
    p_status: finalStatus,
  });

  return { runId, success: overallSuccess, stepsCompleted, stepsFailed };
}

// ─── Public helper: extract available tokens from a workflow for the UI ────────
export function getAvailableTokens(
  steps: WorkflowStep[],
  triggerType: TriggerType
): { token: string; label: string; source: string }[] {
  const tokens: { token: string; label: string; source: string }[] = [];

  // Trigger tokens
  const triggerFields: Record<TriggerType, { field: string; label: string }[]> = {
    facebook_lead: [
      { field: 'name', label: 'Lead Name' },
      { field: 'phone', label: 'Phone Number' },
      { field: 'email', label: 'Email Address' },
      { field: 'city', label: 'City' },
      { field: 'form_id', label: 'Form ID' },
      { field: 'ad_name', label: 'Ad Name' },
      { field: 'created_time', label: 'Created Time' },
    ],
    webhook: [
      { field: 'name', label: 'Name' },
      { field: 'phone', label: 'Phone' },
      { field: 'email', label: 'Email' },
      { field: 'data', label: 'Raw Data' },
    ],
    manual: [
      { field: 'name', label: 'Name' },
      { field: 'phone', label: 'Phone' },
    ],
    crm_entry: [
      { field: 'name', label: 'Lead Name' },
      { field: 'phone', label: 'Phone Number' },
      { field: 'email', label: 'Email' },
      { field: 'status', label: 'Status' },
      { field: 'source', label: 'Source' },
    ],
  };

  for (const { field, label } of (triggerFields[triggerType] || [])) {
    tokens.push({ token: `{{trigger.${field}}}`, label: `Trigger: ${label}`, source: 'trigger' });
  }

  // Step output tokens
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepOutputFields: Record<string, { field: string; label: string }[]> = {
      whatsapp_send: [{ field: 'waMessageId', label: 'WA Message ID' }],
      whatsapp_group_alert: [{ field: 'waMessageId', label: 'WA Message ID' }],
      google_sheet_append: [
        { field: 'updatedRange', label: 'Updated Range' },
        { field: 'updatedRows', label: 'Updated Rows Count' },
      ],
      google_contact_create: [{ field: 'resourceName', label: 'Contact Resource Name' }],
      whatsapp_delay_sequence: [{ field: 'scheduled_at', label: 'Scheduled At' }],
      http_request: [
        { field: 'status', label: 'HTTP Status' },
        { field: 'response', label: 'Response Body' },
      ],
    };

    for (const { field, label } of (stepOutputFields[step.type] || [])) {
      tokens.push({
        token: `{{step_${i}.${field}}}`,
        label: `Step ${i + 1} (${step.label}): ${label}`,
        source: `step_${i}`,
      });
    }
  }

  return tokens;
}
