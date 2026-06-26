/**
 * ══════════════════════════════════════════════════════════════════
 * FW CORE — Custom Workflow Execution Engine (Visual Graph)
 * ══════════════════════════════════════════════════════════════════
 *
 * Handles:
 *  1. Graph-based recursive left-to-right execution of steps
 *  2. Token resolution: {{trigger.field}}, {{nodeId.field}}, {{step_N.field}}
 *  3. Branching execution through Router Nodes
 *  4. Deep Google Sheets mapping (aligning columns to worksheet headers)
 *  5. Scheduling Delay Nodes by computing next_retry_at
 *  6. Run logging to workflow_runs + workflow_step_logs
 * ══════════════════════════════════════════════════════════════════
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { sendMessageServerless } from '@/lib/baileys-serverless';
import { getGoogleCreds } from '@/lib/google-auth';

// ─── Types ────────────────────────────────────────────────────────────────────
export type TriggerType = 'facebook_lead' | 'webhook' | 'manual' | 'crm_entry';

export type StepType =
  | 'whatsapp_send'
  | 'whatsapp_group_alert'
  | 'google_sheet_append'
  | 'google_contact_create'
  | 'http_request'
  | 'delay'
  | 'router';

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
  steps: any; // Can be JSON Graph { nodes: Node[], edges: Edge[] } or legacy WorkflowStep[]
  is_enabled: boolean;
}

export interface StepExecutionResult {
  success: boolean;
  output: Record<string, unknown>;
  error?: string;
}

// ─── Token Resolver ───────────────────────────────────────────────────────────
// Replaces {{trigger.field}}, {{nodeId.field}}, and {{step_N.field}} tokens with values.
function resolveTokens(
  value: unknown,
  context: Record<string, Record<string, unknown>>
): unknown {
  if (typeof value === 'string') {
    return value.replace(/\{\{(\w+)\.([^}]+)\}\}/g, (match, source, field) => {
      const src = context[source];
      if (!src) return match;
      // Support nested paths
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

// ─── Condition Evaluator ─────────────────────────────────────────────────────
function evaluateCondition(
  condition: string,
  context: Record<string, Record<string, unknown>>
): boolean {
  if (!condition || condition.trim() === '') return true;

  // Resolve tokens inside condition string first
  const resolved = String(resolveTokens(condition, context));

  try {
    if (resolved.includes('==')) {
      const [left, right] = resolved.split('==').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
      return left === right;
    }
    if (resolved.includes('!=')) {
      const [left, right] = resolved.split('!=').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
      return left !== right;
    }
    if (resolved.toLowerCase().includes('contains')) {
      const [left, right] = resolved.split(/contains/i).map(s => s.trim().replace(/^['"]|['"]$/g, ''));
      return left.toLowerCase().includes(right.toLowerCase());
    }
  } catch (err) {
    console.error('[workflow-engine] Condition parsing error:', err);
  }

  return resolved.toLowerCase() === 'true' || resolved === '1';
}

// ─── Step Dispatchers ─────────────────────────────────────────────────────────

async function executeWhatsAppSend(
  config: Record<string, unknown>,
  workspaceId: string,
  supabaseAdmin: SupabaseClient,
  scheduledAt: string | null
): Promise<StepExecutionResult> {
  const to = config.to as string;
  const message = (config.message as string) || '';
  const templateId = config.template_id as string | undefined;

  if (!to) return { success: false, output: {}, error: 'Missing "to" phone/JID' };

  // If a scheduled timestamp is provided, we route it directly into the background queue loop
  if (scheduledAt) {
    const payload = templateId
      ? { to, templateId, variables: (config.variables as Record<string, string>) || {} }
      : { to, text: message };

    const actionType = templateId ? 'send_template' : 'send_text';

    const { error } = await supabaseAdmin
      .from('baileys_action_queue')
      .insert({
        workspace_id: workspaceId,
        action_type: actionType,
        payload,
        status: 'pending',
        next_retry_at: scheduledAt,
        priority: 5,
      });

    if (error) return { success: false, output: {}, error: `Queue schedule failed: ${error.message}` };
    return { success: true, output: { status: 'scheduled', scheduled_at: scheduledAt } };
  }

  // Immediate execution (manual test runs)
  let result;
  if (templateId) {
    result = await sendMessageServerless(supabaseAdmin, workspaceId, {
      to,
      type: 'template' as any,
      templateId,
      variables: (config.variables as Record<string, string>) || {},
    } as any);
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
  supabaseAdmin: SupabaseClient,
  scheduledAt: string | null
): Promise<StepExecutionResult> {
  const groupJid = config.group_jid as string;
  const message = (config.message as string) || '';

  if (!groupJid) return { success: false, output: {}, error: 'Missing group_jid' };

  // If scheduled timestamp is provided, enqueue it
  if (scheduledAt) {
    const { error } = await supabaseAdmin
      .from('baileys_action_queue')
      .insert({
        workspace_id: workspaceId,
        action_type: 'send_text',
        payload: { to: groupJid, text: message },
        status: 'pending',
        next_retry_at: scheduledAt,
        priority: 5,
      });

    if (error) return { success: false, output: {}, error: `Queue schedule failed: ${error.message}` };
    return { success: true, output: { status: 'scheduled', scheduled_at: scheduledAt } };
  }

  // Immediate execution
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
  const creds = await getGoogleCreds(supabaseAdmin, workspaceId);
  if (!creds?.access_token) {
    return { success: false, output: {}, error: 'Google Account not connected.' };
  }

  const spreadsheetId = config.spreadsheet_id as string;
  const sheetName = config.sheet_name as string;
  const valuesMapping = (config.values_mapping as Record<string, string>) || {};

  if (!spreadsheetId || !sheetName) {
    return { success: false, output: {}, error: 'Missing spreadsheetId or sheetName' };
  }

  try {
    // 1. Fetch worksheet header row columns to align the mapped data fields
    const range = `${sheetName}!A1:Z1`;
    const rangeRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      { headers: { Authorization: `Bearer ${creds.access_token}` } }
    );

    if (!rangeRes.ok) {
      const errText = await rangeRes.text();
      return { success: false, output: {}, error: `Sheets API Header Fetch error: ${errText}` };
    }

    const rangeData = await rangeRes.json();
    const headers: string[] = (rangeData.values || [])[0] || [];

    if (headers.length === 0) {
      return { success: false, output: {}, error: 'Worksheet headers row is empty.' };
    }

    // 2. Build the values row array corresponding exactly to worksheet header names
    const rowValues = headers.map(header => {
      const value = valuesMapping[header.trim()];
      return value !== undefined && value !== null ? String(value) : '';
    });

    // 3. Append aligned values row to Google Spreadsheet
    const appendRange = `${sheetName}!A:Z`;
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(appendRange)}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${creds.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [rowValues] }),
      }
    );

    if (!appendRes.ok) {
      const err = await appendRes.text();
      return { success: false, output: {}, error: `Sheets API Append error: ${err}` };
    }

    const data = await appendRes.json();
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
  const creds = await getGoogleCreds(supabaseAdmin, workspaceId);
  if (!creds?.access_token) {
    return { success: false, output: {}, error: 'Google Account not connected.' };
  }

  const name = config.name as string;
  const phone = config.phone as string;
  const email = config.email as string | undefined;

  if (!name) return { success: false, output: {}, error: 'Missing name' };

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

async function executeHttpRequest(
  config: Record<string, unknown>
): Promise<StepExecutionResult> {
  const url = config.url as string;
  const method = ((config.method as string) || 'POST').toUpperCase();
  const bodyJson = config.body_json as string | undefined;

  if (!url) return { success: false, output: {}, error: 'Missing URL' };

  try {
    let bodyObj: unknown = undefined;
    if (bodyJson && method !== 'GET') {
      try {
        bodyObj = JSON.parse(bodyJson);
      } catch {
        bodyObj = bodyJson; // fallback as raw text
      }
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: bodyObj ? JSON.stringify(bodyObj) : undefined,
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

// ─── Convert Legacy steps array to graph structure (for runtime fallback) ─────
function convertLegacyStepsToGraph(
  steps: WorkflowStep[],
  triggerType: TriggerType,
  triggerConfig: Record<string, unknown>
) {
  const nodes: any[] = [];
  const edges: any[] = [];

  // Add Trigger Node
  nodes.push({
    id: 'trigger_root',
    type: 'triggerNode',
    data: { type: triggerType, label: 'Trigger', config: triggerConfig },
  });

  let lastId = 'trigger_root';
  steps.forEach((step, idx) => {
    const nodeId = step.id || `step_${idx}`;
    const isDelay = step.type === ('whatsapp_delay_sequence' as any);
    const nodeType = isDelay ? 'delayNode' : 'actionNode';

    let config = step.config || {};
    if (isDelay) {
      config = {
        delay_value: config.delay_days || 1,
        delay_unit: 'days',
      };
    }

    nodes.push({
      id: nodeId,
      type: nodeType,
      data: {
        type: isDelay ? 'delay' : step.type,
        label: step.label || step.type,
        config,
      },
    });

    edges.push({
      id: `edge_${lastId}_${nodeId}`,
      source: lastId,
      target: nodeId,
    });

    lastId = nodeId;
  });

  return { nodes, edges };
}

// ─── Main Execution Runner ────────────────────────────────────────────────────

export async function executeWorkflow(
  workflow: WorkflowDefinition,
  triggerPayload: Record<string, unknown>,
  supabaseAdmin: SupabaseClient
): Promise<{ runId: string; success: boolean; stepsCompleted: number; stepsFailed: number }> {
  const workspaceId = workflow.workspace_id;

  // Resolve steps graph or fall back to legacy array conversion
  let graphNodes: any[] = [];
  let graphEdges: any[] = [];

  const rawSteps = workflow.steps;
  if (rawSteps && rawSteps.nodes && Array.isArray(rawSteps.nodes)) {
    graphNodes = rawSteps.nodes;
    graphEdges = rawSteps.edges || [];
  } else if (Array.isArray(rawSteps)) {
    const graph = convertLegacyStepsToGraph(rawSteps, workflow.trigger_type, workflow.trigger_config);
    graphNodes = graph.nodes;
    graphEdges = graph.edges;
  } else {
    // Fail immediately if no steps configured
    return { runId: '', success: false, stepsCompleted: 0, stepsFailed: 0 };
  }

  // Create the run record
  const { data: runRecord, error: runInsertError } = await supabaseAdmin
    .from('workflow_runs')
    .insert({
      workflow_id: workflow.id,
      workspace_id: workspaceId,
      status: 'running',
      trigger_type: workflow.trigger_type,
      trigger_payload: triggerPayload,
      steps_total: graphNodes.length - 1, // Exclude trigger node
    })
    .select('id')
    .single();

  if (runInsertError || !runRecord) {
    console.error('[workflow-engine] Failed to create run record:', runInsertError);
    return { runId: '', success: false, stepsCompleted: 0, stepsFailed: 0 };
  }

  const runId = runRecord.id;

  // Execution Context holding outputs maps
  const context: Record<string, Record<string, unknown>> = {
    trigger: triggerPayload,
  };

  // Keep track of topological execution index to support {{step_N}} tokens
  let stepExecutionIndex = 0;
  let stepsCompleted = 0;
  let stepsFailed = 0;
  let overallSuccess = true;

  // Find root/trigger node
  const triggerNode = graphNodes.find(n => n.type === 'triggerNode');
  if (!triggerNode) {
    await supabaseAdmin
      .from('workflow_runs')
      .update({ status: 'failed', error_message: 'Trigger node not found.' })
      .eq('id', runId);
    return { runId, success: false, stepsCompleted: 0, stepsFailed: 0 };
  }

  // Populate trigger output
  context[triggerNode.id] = triggerPayload;
  context['trigger'] = triggerPayload;

  // Adjacency mapping of edges (source -> edges)
  const sourceEdgesMap: Record<string, any[]> = {};
  graphEdges.forEach(edge => {
    if (!sourceEdgesMap[edge.source]) {
      sourceEdgesMap[edge.source] = [];
    }
    sourceEdgesMap[edge.source].push(edge);
  });

  // Recursive graph execution traversal
  async function runNodeBranch(
    currNodeId: string,
    currentScheduledAt: string | null
  ): Promise<void> {
    const outgoingEdges = sourceEdgesMap[currNodeId] || [];
    if (outgoingEdges.length === 0) return;

    for (const edge of outgoingEdges) {
      const childNode = graphNodes.find(n => n.id === edge.target);
      if (!childNode) continue;

      let nextScheduledAt = currentScheduledAt;

      // Handle Router Branch Selection
      if (childNode.type === 'routerNode') {
        const branchConfig = edge.sourceHandle;
        const routerConfig = childNode.data?.config || {};
        const branches = routerConfig.branches || [];
        const activeBranch = branches.find((b: any) => b.id === branchConfig);

        if (activeBranch && activeBranch.condition) {
          const pass = evaluateCondition(activeBranch.condition, context);
          if (!pass) {
            console.log(`[workflow-engine] Branch condition not met for Router node '${childNode.id}' on edge '${edge.id}'. Skipping path.`);
            continue;
          }
        }
        // Router nodes execute instantly without actions, we bypass to their children directly
        await runNodeBranch(childNode.id, nextScheduledAt);
        continue;
      }

      // Handle Delay / Wait logic
      if (childNode.type === 'delayNode') {
        const delayConfig = childNode.data?.config || {};
        const delayVal = Number(delayConfig.delay_value) || 5;
        const delayUnit = String(delayConfig.delay_unit || 'minutes').toLowerCase();

        let multiplier = 60;
        if (delayUnit === 'seconds') multiplier = 1;
        if (delayUnit === 'hours') multiplier = 3600;
        if (delayUnit === 'days') multiplier = 86400;

        const delayMs = delayVal * multiplier * 1000;

        if (triggerPayload._test_run) {
          // Inline wait for short delay testing
          const inlineDelay = Math.min(delayMs, 10_000); // Max 10s timeout during manual test run
          console.log(`[workflow-engine] Testing delay inline: Wait ${inlineDelay}ms...`);
          await new Promise(r => setTimeout(r, inlineDelay));
        } else {
          // Accumulate scheduled timing timestamp for actual run
          const baseTime = nextScheduledAt ? new Date(nextScheduledAt).getTime() : Date.now();
          nextScheduledAt = new Date(baseTime + delayMs).toISOString();
        }

        // Delay node resolves instantly, pass to children
        await runNodeBranch(childNode.id, nextScheduledAt);
        continue;
      }

      // Handle standard Actions
      const stepIndex = stepExecutionIndex++;
      const stepStartedAt = new Date().toISOString();

      // Log step starting status
      const { data: stepLog } = await supabaseAdmin
        .from('workflow_step_logs')
        .insert({
          run_id: runId,
          workflow_id: workflow.id,
          workspace_id: workspaceId,
          step_index: stepIndex,
          step_id: childNode.id,
          step_type: childNode.data.type,
          step_label: childNode.data.label,
          status: 'running',
          started_at: stepStartedAt,
          input_data: childNode.data.config || {},
        })
        .select('id')
        .single();

      // Resolve variables inside configuration
      const resolvedConfig = resolveStepConfig(childNode.data.config || {}, context);

      let result: StepExecutionResult;
      const t0 = Date.now();

      try {
        switch (childNode.data.type) {
          case 'whatsapp_send':
            result = await executeWhatsAppSend(resolvedConfig, workspaceId, supabaseAdmin, nextScheduledAt);
            break;
          case 'whatsapp_group_alert':
            result = await executeWhatsAppGroupAlert(resolvedConfig, workspaceId, supabaseAdmin, nextScheduledAt);
            break;
          case 'google_sheet_append':
            result = await executeGoogleSheetAppend(resolvedConfig, workspaceId, supabaseAdmin);
            break;
          case 'google_contact_create':
            result = await executeGoogleContactCreate(resolvedConfig, workspaceId, supabaseAdmin);
            break;
          case 'http_request':
            result = await executeHttpRequest(resolvedConfig);
            break;
          default:
            result = { success: false, output: {}, error: `Unknown action step type: ${childNode.data.type}` };
        }
      } catch (err: any) {
        result = { success: false, output: {}, error: err.message || 'Unknown execution error' };
      }

      const durationMs = Date.now() - t0;

      // Update step execution log status
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

      // Add output data to context maps
      context[childNode.id] = result.output;
      context[`step_${stepIndex}`] = result.output;

      if (result.success) {
        stepsCompleted++;
      } else {
        stepsFailed++;
        overallSuccess = false;
      }

      // Recurse along downstream branches
      await runNodeBranch(childNode.id, nextScheduledAt);
    }
  }

  // Traverse starting from Trigger root node
  await runNodeBranch(triggerNode.id, null);

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

// ─── Public helper: extracts available variables list for the configuration UI 
export function getAvailableTokens(
  steps: any,
  triggerType: TriggerType
): { token: string; label: string; source: string }[] {
  const tokens: { token: string; label: string; source: string }[] = [];

  // Trigger default outputs
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

  // Parse nodes outputs if it is a graph
  if (steps && steps.nodes && Array.isArray(steps.nodes)) {
    const nodes = steps.nodes;
    nodes.forEach((node: any) => {
      if (node.type === 'triggerNode') return;

      const nodeOutputFields: Record<string, { field: string; label: string }[]> = {
        whatsapp_send: [{ field: 'waMessageId', label: 'WA Message ID' }],
        whatsapp_group_alert: [{ field: 'waMessageId', label: 'WA Message ID' }],
        google_sheet_append: [
          { field: 'updatedRange', label: 'Updated Range' },
          { field: 'updatedRows', label: 'Updated Rows Count' },
        ],
        google_contact_create: [{ field: 'resourceName', label: 'Contact Resource Name' }],
        http_request: [
          { field: 'status', label: 'HTTP Status' },
          { field: 'response', label: 'Response Body' },
        ],
        delay: [{ field: 'scheduled_at', label: 'Scheduled Time' }],
      };

      const fields = nodeOutputFields[node.data?.type] || [];
      fields.forEach(({ field, label }) => {
        tokens.push({
          token: `{{${node.id}.${field}}}`,
          label: `${node.data?.label || node.id}: ${label}`,
          source: node.id,
        });
      });
    });
  }

  return tokens;
}
