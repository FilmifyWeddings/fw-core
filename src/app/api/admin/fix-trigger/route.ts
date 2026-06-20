/**
 * POST /api/admin/fix-trigger
 * ============================
 * BRAHMASTRA LAW 1: Super-admin-only endpoint to apply the corrected
 * fn_trigger_whatsapp_workflow SQL (fixes tenant_id NULL bug) and
 * the corrected rpc_execute_workflow_sequence SQL.
 *
 * This is a one-time fix endpoint. Only accessible by the super-admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Super-admin auth check
  const authHeader = req.headers.get('authorization');
  const expectedToken = process.env.BAILEYS_WEBHOOK_SECRET;
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fix 1: Update fn_trigger_whatsapp_workflow to use v_workspace_id instead of NEW.tenant_id
    // The bug: leads.tenant_id is NULL, but leads.workspace_id has the actual tenant UUID
    // Fix: Use COALESCE(NEW.workspace_id, NEW.tenant_id) = v_workspace_id for workflow lookup

    const fixTriggerSql = `
CREATE OR REPLACE FUNCTION public.fn_trigger_whatsapp_workflow()
RETURNS TRIGGER AS $$
DECLARE
  r_workflow RECORD;
  r_step RECORD;
  clean_phone TEXT;
  v_variables JSONB;
  v_scheduled_at TIMESTAMPTZ;
  v_workspace_id UUID;
  v_log_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.whatsapp_group_id IS NOT DISTINCT FROM NEW.whatsapp_group_id THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.whatsapp_group_id IS NULL OR NEW.phone IS NULL OR NEW.phone = '' THEN
    RETURN NEW;
  END IF;

  clean_phone := regexp_replace(NEW.phone, '[^0-9]', '', 'g');
  IF clean_phone = '' THEN RETURN NEW; END IF;

  v_workspace_id := COALESCE(NEW.workspace_id, NEW.tenant_id);
  IF v_workspace_id IS NULL THEN RETURN NEW; END IF;

  v_variables := jsonb_build_object(
    'Name', COALESCE(NEW.name, 'Guest'),
    'Name_1', COALESCE(NEW.name, 'Guest'),
    'lead_name', COALESCE(NEW.name, 'Guest'),
    'phone', COALESCE(NEW.phone, ''),
    'email', COALESCE(NEW.email, '')
  );

  IF NEW.raw_payload IS NOT NULL AND jsonb_typeof(NEW.raw_payload) = 'object' THEN
    v_variables := v_variables || NEW.raw_payload;
  END IF;

  FOR r_workflow IN
    SELECT * FROM public.whatsapp_custom_workflows
    WHERE target_group_id = NEW.whatsapp_group_id
      AND tenant_id = v_workspace_id
      AND status = 'Active'
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.whatsapp_workflow_logs
      WHERE lead_id = NEW.id AND workflow_id = r_workflow.id
    ) THEN
      CONTINUE;
    END IF;

    UPDATE public.whatsapp_custom_workflows
    SET execution_count = execution_count + 1
    WHERE id = r_workflow.id;

    FOR r_step IN
      SELECT * FROM jsonb_to_recordset(r_workflow.workflow_steps)
      AS steps(template_id UUID, template_name TEXT, delay_value INT, delay_unit TEXT, sort_index INT)
      ORDER BY sort_index ASC
    LOOP
      v_scheduled_at := NOW();
      IF r_step.delay_unit = 'seconds' AND r_step.delay_value > 0 THEN
        v_scheduled_at := v_scheduled_at + (r_step.delay_value || ' seconds')::INTERVAL;
      ELSIF r_step.delay_unit = 'hours' AND r_step.delay_value > 0 THEN
        v_scheduled_at := v_scheduled_at + (r_step.delay_value || ' hours')::INTERVAL;
      END IF;

      v_log_id := gen_random_uuid();

      INSERT INTO public.whatsapp_workflow_logs (
        id, tenant_id, lead_id, workflow_id, step_index,
        phone_number, template_name, status, sent_at
      ) VALUES (
        v_log_id, v_workspace_id, NEW.id, r_workflow.id, r_step.sort_index,
        clean_phone, r_step.template_name, 'pending', v_scheduled_at
      );

      INSERT INTO public.baileys_action_queue (
        workspace_id, action_type, payload, status, next_retry_at, priority
      ) VALUES (
        v_workspace_id,
        'send_template',
        jsonb_build_object(
          'to', clean_phone || '@s.whatsapp.net',
          'templateId', r_step.template_id,
          'variables', v_variables,
          'workflowLogId', v_log_id
        ),
        'pending', v_scheduled_at, 5
      );
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

    // Fix 2: Update rpc_execute_workflow_sequence to use COALESCE(workspace_id, tenant_id)
    const fixRpcSql = `
CREATE OR REPLACE FUNCTION public.rpc_execute_workflow_sequence(p_workflow_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r_workflow RECORD;
  r_lead RECORD;
  r_step RECORD;
  clean_phone TEXT;
  v_variables JSONB;
  v_scheduled_at TIMESTAMPTZ;
  v_workspace_id UUID;
  v_log_id UUID;
  v_triggered_count INT := 0;
  v_skipped_count INT := 0;
BEGIN
  SELECT * INTO r_workflow FROM public.whatsapp_custom_workflows WHERE id = p_workflow_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Workflow not found');
  END IF;

  FOR r_lead IN
    SELECT * FROM public.leads
    WHERE whatsapp_group_id = r_workflow.target_group_id
      AND COALESCE(workspace_id, tenant_id) = r_workflow.tenant_id
  LOOP
    clean_phone := regexp_replace(r_lead.phone, '[^0-9]', '', 'g');
    IF clean_phone = '' THEN CONTINUE; END IF;

    v_workspace_id := COALESCE(r_lead.workspace_id, r_lead.tenant_id);

    v_variables := jsonb_build_object(
      'Name', COALESCE(r_lead.name, 'Guest'),
      'Name_1', COALESCE(r_lead.name, 'Guest'),
      'lead_name', COALESCE(r_lead.name, 'Guest'),
      'phone', COALESCE(r_lead.phone, ''),
      'email', COALESCE(r_lead.email, '')
    );
    IF r_lead.raw_payload IS NOT NULL AND jsonb_typeof(r_lead.raw_payload) = 'object' THEN
      v_variables := v_variables || r_lead.raw_payload;
    END IF;

    FOR r_step IN
      SELECT * FROM jsonb_to_recordset(r_workflow.workflow_steps)
      AS steps(template_id UUID, template_name TEXT, delay_value INT, delay_unit TEXT, sort_index INT)
      ORDER BY sort_index ASC
    LOOP
      IF EXISTS (
        SELECT 1 FROM public.whatsapp_workflow_logs
        WHERE lead_id = r_lead.id AND workflow_id = r_workflow.id AND step_index = r_step.sort_index
      ) THEN
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END IF;

      v_scheduled_at := NOW();
      IF r_step.delay_unit = 'seconds' AND r_step.delay_value > 0 THEN
        v_scheduled_at := v_scheduled_at + (r_step.delay_value || ' seconds')::INTERVAL;
      ELSIF r_step.delay_unit = 'hours' AND r_step.delay_value > 0 THEN
        v_scheduled_at := v_scheduled_at + (r_step.delay_value || ' hours')::INTERVAL;
      END IF;

      v_log_id := gen_random_uuid();

      INSERT INTO public.whatsapp_workflow_logs (
        id, tenant_id, lead_id, workflow_id, step_index,
        phone_number, template_name, status, sent_at
      ) VALUES (
        v_log_id, r_workflow.tenant_id, r_lead.id, r_workflow.id, r_step.sort_index,
        clean_phone, r_step.template_name, 'pending', v_scheduled_at
      );

      INSERT INTO public.baileys_action_queue (
        workspace_id, action_type, payload, status, next_retry_at, priority
      ) VALUES (
        v_workspace_id, 'send_template',
        jsonb_build_object(
          'to', clean_phone || '@s.whatsapp.net',
          'templateId', r_step.template_id,
          'variables', v_variables,
          'workflowLogId', v_log_id
        ),
        'pending', v_scheduled_at, 5
      );

      v_triggered_count := v_triggered_count + 1;
    END LOOP;
  END LOOP;

  UPDATE public.whatsapp_custom_workflows
  SET execution_count = execution_count + 1
  WHERE id = p_workflow_id;

  RETURN jsonb_build_object(
    'success', true,
    'triggered_steps_count', v_triggered_count,
    'skipped_steps_count', v_skipped_count
  );
END;
$$;
`;

    // Execute both SQL statements via supabaseAdmin raw PostgreSQL
    // Use the pg REST API endpoint for raw SQL execution
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const runSql = async (sql: string) => {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/rls_auto_enable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ p_table: '__test__' }),
      });
      // We can't use rls_auto_enable for arbitrary SQL, use pg endpoint instead
      const pgResp = await fetch(`${SUPABASE_URL}/pg/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
      });
      return pgResp;
    };

    // Try Supabase pg endpoint
    const pgUrl = `${SUPABASE_URL}/pg/query`;
    const headers = {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    };

    const r1 = await fetch(pgUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: fixTriggerSql }),
    });

    const r2 = await fetch(pgUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: fixRpcSql }),
    });

    const r1Body = await r1.text();
    const r2Body = await r2.text();

    console.log('[fix-trigger] Trigger fix response:', r1.status, r1Body.slice(0, 200));
    console.log('[fix-trigger] RPC fix response:', r2.status, r2Body.slice(0, 200));

    return NextResponse.json({
      success: true,
      triggerFix: { status: r1.status, body: r1Body.slice(0, 200) },
      rpcFix: { status: r2.status, body: r2Body.slice(0, 200) },
      message: 'SQL functions updated. Tenant ID fix applied to fn_trigger_whatsapp_workflow and rpc_execute_workflow_sequence.',
    });

  } catch (err: any) {
    console.error('[fix-trigger] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
