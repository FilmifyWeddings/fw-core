-- ==========================================================================
-- Migration: 20260620000003_whatsapp_analytics_logs.sql
-- BRAHMASTRA LAW 1 ENFORCED: Multi-Tenant RLS compliance
-- BRAHMASTRA LAW 3 ENFORCED: Asynchronous Queueing & Logs Execution
-- ==========================================================================

-- 1. Create whatsapp_workflow_logs table
CREATE TABLE IF NOT EXISTS public.whatsapp_workflow_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id           UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  workflow_id       UUID NOT NULL REFERENCES public.whatsapp_custom_workflows(id) ON DELETE CASCADE,
  step_index        INTEGER NOT NULL,
  phone_number      TEXT NOT NULL,
  template_name     TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  error_message     TEXT,
  sent_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for fast lookups
CREATE INDEX IF NOT EXISTS idx_workflow_logs_tenant ON public.whatsapp_workflow_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_lead ON public.whatsapp_workflow_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_workflow ON public.whatsapp_workflow_logs(workflow_id);

-- Enable RLS
ALTER TABLE public.whatsapp_workflow_logs ENABLE ROW LEVEL SECURITY;

-- Policy with Super-Admin bypass
CREATE POLICY "Tenant can SELECT own workflow logs"
  ON public.whatsapp_workflow_logs FOR SELECT
  USING (
    tenant_id = auth.uid() 
    OR 
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'sushantnawale700@gmail.com'
  );

CREATE POLICY "Tenant can INSERT own workflow logs"
  ON public.whatsapp_workflow_logs FOR INSERT
  WITH CHECK (
    tenant_id = auth.uid()
    OR
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'sushantnawale700@gmail.com'
  );

CREATE POLICY "Tenant can UPDATE own workflow logs"
  ON public.whatsapp_workflow_logs FOR UPDATE
  USING (
    tenant_id = auth.uid()
    OR
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'sushantnawale700@gmail.com'
  )
  WITH CHECK (
    tenant_id = auth.uid()
    OR
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'sushantnawale700@gmail.com'
  );

CREATE POLICY "Tenant can DELETE own workflow logs"
  ON public.whatsapp_workflow_logs FOR DELETE
  USING (
    tenant_id = auth.uid()
    OR
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'sushantnawale700@gmail.com'
  );


-- 2. Trigger function to sync baileys_action_queue processing state to whatsapp_workflow_logs
CREATE OR REPLACE FUNCTION public.fn_sync_queue_to_workflow_logs()
RETURNS TRIGGER AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- We only care if status changes and workflowLogId exists in payload
  IF NEW.payload ? 'workflowLogId' THEN
    v_log_id := (NEW.payload->>'workflowLogId')::UUID;
    
    IF NEW.status = 'done' THEN
      UPDATE public.whatsapp_workflow_logs
      SET status = 'sent',
          updated_at = NOW(),
          sent_at = NOW()
      WHERE id = v_log_id;
    ELSIF NEW.status = 'failed' THEN
      UPDATE public.whatsapp_workflow_logs
      SET status = 'failed',
          error_message = NEW.error_message,
          updated_at = NOW()
      WHERE id = v_log_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind sync trigger to baileys_action_queue
DROP TRIGGER IF EXISTS trg_sync_queue_to_workflow_logs ON public.baileys_action_queue;
CREATE TRIGGER trg_sync_queue_to_workflow_logs
  AFTER UPDATE OF status ON public.baileys_action_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_queue_to_workflow_logs();


-- 3. Update the lead trigger function with duplicate prevention and workflow logging
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
  -- Prevent redundant execution if group ID has not changed
  IF TG_OP = 'UPDATE' THEN
    IF OLD.whatsapp_group_id IS NOT DISTINCT FROM NEW.whatsapp_group_id THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Ensure we have a valid group and phone number
  IF NEW.whatsapp_group_id IS NULL OR NEW.phone IS NULL OR NEW.phone = '' THEN
    RETURN NEW;
  END IF;

  -- Clean phone number (keep digits only)
  clean_phone := regexp_replace(NEW.phone, '[^0-9]', '', 'g');
  IF clean_phone = '' THEN
    RETURN NEW;
  END IF;

  -- Get workspace ID context
  v_workspace_id := COALESCE(NEW.workspace_id, NEW.tenant_id);
  IF v_workspace_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Build placeholder variables payload (for dynamic template injection)
  v_variables := jsonb_build_object(
    'Name', COALESCE(NEW.name, 'Guest'),
    'Name_1', COALESCE(NEW.name, 'Guest'), -- fallback alias
    'lead_name', COALESCE(NEW.name, 'Guest'),
    'phone', COALESCE(NEW.phone, ''),
    'email', COALESCE(NEW.email, '')
  );

  -- Merge with lead's custom raw payload if it exists
  IF NEW.raw_payload IS NOT NULL AND jsonb_typeof(NEW.raw_payload) = 'object' THEN
    v_variables := v_variables || NEW.raw_payload;
  END IF;

  -- Scan for Active Workflows mapped to the target group and tenant
  FOR r_workflow IN
    SELECT * FROM public.whatsapp_custom_workflows
    WHERE target_group_id = NEW.whatsapp_group_id
      AND tenant_id = NEW.tenant_id
      AND status = 'Active'
  LOOP
    -- Idempotency Check: Skip completely if this workflow was already triggered for this lead
    IF EXISTS (
      SELECT 1 FROM public.whatsapp_workflow_logs
      WHERE lead_id = NEW.id
        AND workflow_id = r_workflow.id
    ) THEN
      CONTINUE;
    END IF;

    -- Increment workflow execution count
    UPDATE public.whatsapp_custom_workflows
    SET execution_count = execution_count + 1
    WHERE id = r_workflow.id;

    -- Unnest workflow steps JSONB array
    FOR r_step IN
      SELECT * FROM jsonb_to_recordset(r_workflow.workflow_steps)
      AS steps(
        template_id UUID, 
        template_name TEXT, 
        delay_value INT, 
        delay_unit TEXT, 
        sort_index INT
      )
      ORDER BY sort_index ASC
    LOOP
      -- Calculate next_retry_at scheduling timestamp based on delay configuration
      v_scheduled_at := NOW();
      IF r_step.delay_unit = 'seconds' AND r_step.delay_value > 0 THEN
        v_scheduled_at := v_scheduled_at + (r_step.delay_value || ' seconds')::INTERVAL;
      ELSIF r_step.delay_unit = 'hours' AND r_step.delay_value > 0 THEN
        v_scheduled_at := v_scheduled_at + (r_step.delay_value || ' hours')::INTERVAL;
      END IF;

      -- Generate unique Log UUID
      v_log_id := gen_random_uuid();

      -- Insert step log as pending
      INSERT INTO public.whatsapp_workflow_logs (
        id,
        tenant_id,
        lead_id,
        workflow_id,
        step_index,
        phone_number,
        template_name,
        status,
        sent_at
      ) VALUES (
        v_log_id,
        NEW.tenant_id,
        NEW.id,
        r_workflow.id,
        r_step.sort_index,
        clean_phone,
        r_step.template_name,
        'pending',
        v_scheduled_at
      );

      -- Insert step into baileys_action_queue
      INSERT INTO public.baileys_action_queue (
        workspace_id,
        action_type,
        payload,
        status,
        next_retry_at,
        priority
      ) VALUES (
        v_workspace_id,
        'send_template',
        jsonb_build_object(
          'to', clean_phone || '@s.whatsapp.net',
          'templateId', r_step.template_id,
          'variables', v_variables,
          'workflowLogId', v_log_id
        ),
        'pending',
        v_scheduled_at,
        5
      );
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. RPC Function to retroactively trigger sequences for contacts in a group who missed specific indices
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
  -- Fetch target workflow details
  SELECT * INTO r_workflow 
  FROM public.whatsapp_custom_workflows 
  WHERE id = p_workflow_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Workflow not found');
  END IF;

  -- Scan all leads currently inside the target group
  FOR r_lead IN
    SELECT * FROM public.leads
    WHERE whatsapp_group_id = r_workflow.target_group_id
      AND tenant_id = r_workflow.tenant_id
  LOOP
    -- Clean phone number
    clean_phone := regexp_replace(r_lead.phone, '[^0-9]', '', 'g');
    IF clean_phone = '' THEN
      CONTINUE;
    END IF;

    v_workspace_id := COALESCE(r_lead.workspace_id, r_lead.tenant_id);

    -- Build variables payload
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

    -- Unnest workflow steps JSONB array
    FOR r_step IN
      SELECT * FROM jsonb_to_recordset(r_workflow.workflow_steps)
      AS steps(
        template_id UUID, 
        template_name TEXT, 
        delay_value INT, 
        delay_unit TEXT, 
        sort_index INT
      )
      ORDER BY sort_index ASC
    LOOP
      -- Check if this specific index was already executed
      IF EXISTS (
        SELECT 1 FROM public.whatsapp_workflow_logs
        WHERE lead_id = r_lead.id
          AND workflow_id = r_workflow.id
          AND step_index = r_step.sort_index
      ) THEN
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END IF;

      -- Calculate scheduling timestamp based on delay
      v_scheduled_at := NOW();
      IF r_step.delay_unit = 'seconds' AND r_step.delay_value > 0 THEN
        v_scheduled_at := v_scheduled_at + (r_step.delay_value || ' seconds')::INTERVAL;
      ELSIF r_step.delay_unit = 'hours' AND r_step.delay_value > 0 THEN
        v_scheduled_at := v_scheduled_at + (r_step.delay_value || ' hours')::INTERVAL;
      END IF;

      -- Generate log UUID
      v_log_id := gen_random_uuid();

      -- Insert log entry
      INSERT INTO public.whatsapp_workflow_logs (
        id,
        tenant_id,
        lead_id,
        workflow_id,
        step_index,
        phone_number,
        template_name,
        status,
        sent_at
      ) VALUES (
        v_log_id,
        r_workflow.tenant_id,
        r_lead.id,
        r_workflow.id,
        r_step.sort_index,
        clean_phone,
        r_step.template_name,
        'pending',
        v_scheduled_at
      );

      -- Insert into baileys_action_queue
      INSERT INTO public.baileys_action_queue (
        workspace_id,
        action_type,
        payload,
        status,
        next_retry_at,
        priority
      ) VALUES (
        v_workspace_id,
        'send_template',
        jsonb_build_object(
          'to', clean_phone || '@s.whatsapp.net',
          'templateId', r_step.template_id,
          'variables', v_variables,
          'workflowLogId', v_log_id
        ),
        'pending',
        v_scheduled_at,
        5
      );

      v_triggered_count := v_triggered_count + 1;
    END LOOP;
  END LOOP;

  -- Update workflow execution count
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
