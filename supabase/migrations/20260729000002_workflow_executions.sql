-- Migration: Workflow Executions and Steps telemetries
-- Creates workflow_executions and workflow_execution_steps tables,
-- and defines trigger to sync from whatsapp_workflow_logs.

CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.whatsapp_custom_workflows(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'STOPPED', 'CANCELLED')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, workflow_id)
);

CREATE TABLE IF NOT EXISTS public.workflow_execution_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  template_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'STOPPED', 'CANCELLED')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(execution_id, step_index)
);

-- RLS policies for workflow_executions
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow workspace owner access to executions'
  ) THEN
    CREATE POLICY "Allow workspace owner access to executions"
      ON public.workflow_executions FOR ALL USING (auth.uid() = tenant_id);
  END IF;
END $$;

-- RLS policies for workflow_execution_steps
ALTER TABLE public.workflow_execution_steps ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow workspace owner access to execution steps'
  ) THEN
    CREATE POLICY "Allow workspace owner access to execution steps"
      ON public.workflow_execution_steps FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.workflow_executions e 
          WHERE e.id = workflow_execution_steps.execution_id 
            AND e.tenant_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Grant permissions for service_role
GRANT ALL ON public.workflow_executions TO service_role;
GRANT ALL ON public.workflow_execution_steps TO service_role;

-- Sync function from whatsapp_workflow_logs to workflow_executions & workflow_execution_steps
CREATE OR REPLACE FUNCTION public.fn_sync_log_to_execution()
RETURNS TRIGGER AS $$
DECLARE
  v_execution_id UUID;
  v_execution_status TEXT;
  v_all_completed BOOLEAN;
  v_any_failed BOOLEAN;
  v_any_stopped BOOLEAN;
  v_step_status TEXT;
BEGIN
  -- Determine step status mapping
  IF NEW.status = 'failed' THEN
    IF NEW.error_message = 'Cancelled by operator' OR NEW.error_message = 'Stopped by operator' THEN
      v_step_status := 'STOPPED';
    ELSE
      v_step_status := 'FAILED';
    END IF;
  ELSIF NEW.status IN ('sent', 'delivered', 'read') THEN
    v_step_status := 'COMPLETED';
  ELSE
    v_step_status := 'PENDING';
  END IF;

  -- 1. Get or create the execution record
  INSERT INTO public.workflow_executions (tenant_id, contact_id, workflow_id, status, error_message, created_at, updated_at)
  VALUES (NEW.tenant_id, NEW.lead_id, NEW.workflow_id, 'PENDING', NULL, NEW.sent_at, NEW.updated_at)
  ON CONFLICT (contact_id, workflow_id) DO UPDATE
    SET updated_at = NOW()
  RETURNING id INTO v_execution_id;

  -- 2. Insert/upsert the execution step
  INSERT INTO public.workflow_execution_steps (execution_id, step_index, template_name, status, error_message, created_at, updated_at)
  VALUES (
    v_execution_id,
    NEW.step_index,
    NEW.template_name,
    v_step_status,
    NEW.error_message,
    NEW.sent_at,
    NEW.updated_at
  )
  ON CONFLICT (execution_id, step_index) DO UPDATE
    SET status = EXCLUDED.status,
        error_message = EXCLUDED.error_message,
        updated_at = NOW();

  -- 3. Recalculate parent execution status based on all steps of the execution
  SELECT 
    bool_or(status = 'FAILED'),
    bool_or(status = 'STOPPED' OR status = 'CANCELLED'),
    bool_and(status = 'COMPLETED')
  INTO v_any_failed, v_any_stopped, v_all_completed
  FROM public.workflow_execution_steps
  WHERE execution_id = v_execution_id;

  IF v_any_stopped THEN
    v_execution_status := 'STOPPED';
  ELSIF v_any_failed THEN
    v_execution_status := 'FAILED';
  ELSIF v_all_completed THEN
    v_execution_status := 'COMPLETED';
  ELSE
    v_execution_status := 'RUNNING';
  END IF;

  UPDATE public.workflow_executions
  SET status = v_execution_status,
      error_message = (
        SELECT error_message 
        FROM public.workflow_execution_steps 
        WHERE execution_id = v_execution_id AND status IN ('FAILED', 'STOPPED') AND error_message IS NOT NULL 
        LIMIT 1
      ),
      updated_at = NOW()
  WHERE id = v_execution_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on whatsapp_workflow_logs
DROP TRIGGER IF EXISTS trg_sync_log_to_execution ON public.whatsapp_workflow_logs;
CREATE TRIGGER trg_sync_log_to_execution
  AFTER INSERT OR UPDATE ON public.whatsapp_workflow_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_log_to_execution();

-- Update fn_sync_queue_to_workflow_logs to support failure_reason fallback
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
          error_message = COALESCE(NEW.error_message, NEW.failure_reason),
          updated_at = NOW()
      WHERE id = v_log_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rebind sync trigger to baileys_action_queue
DROP TRIGGER IF EXISTS trg_sync_queue_to_workflow_logs ON public.baileys_action_queue;
CREATE TRIGGER trg_sync_queue_to_workflow_logs
  AFTER UPDATE OF status ON public.baileys_action_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_queue_to_workflow_logs();

