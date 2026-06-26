-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: Custom Workflows — Automation Builder Engine
-- Tables: custom_workflows, workflow_runs, workflow_step_logs
-- All tables are workspace_id RLS-isolated (BRAHMASTRA Law 1)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. custom_workflows ────────────────────────────────────────────────────────
-- Stores the workflow definition: trigger type + config, array of action steps
CREATE TABLE IF NOT EXISTS public.custom_workflows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  is_enabled      BOOLEAN NOT NULL DEFAULT true,
  -- Trigger configuration
  trigger_type    TEXT NOT NULL DEFAULT 'manual'
                    CHECK (trigger_type IN ('facebook_lead', 'webhook', 'manual', 'crm_entry')),
  trigger_config  JSONB NOT NULL DEFAULT '{}',
  -- Steps: ordered array of action step definitions
  -- Each step: { id, type, label, config: { ... field values with {{token}} references } }
  steps           JSONB NOT NULL DEFAULT '[]',
  -- Stats
  run_count       INTEGER NOT NULL DEFAULT 0,
  last_run_at     TIMESTAMP WITH TIME ZONE,
  last_run_status TEXT CHECK (last_run_status IN ('success', 'failed', 'partial', NULL)),
  -- Timestamps
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.custom_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_workflows_rls"
  ON public.custom_workflows FOR ALL
  USING (auth.uid() = workspace_id)
  WITH CHECK (auth.uid() = workspace_id);

CREATE INDEX IF NOT EXISTS idx_custom_workflows_workspace
  ON public.custom_workflows(workspace_id, is_enabled);

-- ── 2. workflow_runs ───────────────────────────────────────────────────────────
-- One row per execution run — header record
CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id     UUID REFERENCES public.custom_workflows(id) ON DELETE CASCADE NOT NULL,
  workspace_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- Execution
  status          TEXT NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running', 'success', 'failed', 'partial')),
  trigger_type    TEXT NOT NULL,
  trigger_payload JSONB NOT NULL DEFAULT '{}',
  -- Progress
  steps_total     INTEGER NOT NULL DEFAULT 0,
  steps_completed INTEGER NOT NULL DEFAULT 0,
  steps_failed    INTEGER NOT NULL DEFAULT 0,
  -- Timing
  started_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  completed_at    TIMESTAMP WITH TIME ZONE,
  duration_ms     INTEGER,
  -- Error
  error_message   TEXT
);

ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_runs_rls"
  ON public.workflow_runs FOR ALL
  USING (auth.uid() = workspace_id)
  WITH CHECK (auth.uid() = workspace_id);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow
  ON public.workflow_runs(workflow_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_workspace
  ON public.workflow_runs(workspace_id, started_at DESC);

-- ── 3. workflow_step_logs ──────────────────────────────────────────────────────
-- One row per step per run — granular execution trace
CREATE TABLE IF NOT EXISTS public.workflow_step_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          UUID REFERENCES public.workflow_runs(id) ON DELETE CASCADE NOT NULL,
  workflow_id     UUID REFERENCES public.custom_workflows(id) ON DELETE CASCADE NOT NULL,
  workspace_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- Step identity
  step_index      INTEGER NOT NULL,
  step_id         TEXT NOT NULL,
  step_type       TEXT NOT NULL,
  step_label      TEXT,
  -- Execution
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'running', 'success', 'failed', 'skipped')),
  -- Data (token-resolved input config + action output)
  input_data      JSONB NOT NULL DEFAULT '{}',
  output_data     JSONB NOT NULL DEFAULT '{}',
  error_message   TEXT,
  -- Timing
  started_at      TIMESTAMP WITH TIME ZONE,
  completed_at    TIMESTAMP WITH TIME ZONE,
  duration_ms     INTEGER
);

ALTER TABLE public.workflow_step_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_step_logs_rls"
  ON public.workflow_step_logs FOR ALL
  USING (auth.uid() = workspace_id)
  WITH CHECK (auth.uid() = workspace_id);

CREATE INDEX IF NOT EXISTS idx_workflow_step_logs_run
  ON public.workflow_step_logs(run_id, step_index);

-- ── 4. Auto-update trigger for custom_workflows.updated_at ────────────────────
CREATE OR REPLACE FUNCTION public.fn_update_custom_workflow_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_custom_workflow_updated_at ON public.custom_workflows;
CREATE TRIGGER trg_custom_workflow_updated_at
  BEFORE UPDATE ON public.custom_workflows
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_custom_workflow_timestamp();

-- ── 5. RPC: bump run stats on workflow after a run completes ──────────────────
CREATE OR REPLACE FUNCTION public.rpc_bump_workflow_run_stats(
  p_workflow_id UUID,
  p_status TEXT
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.custom_workflows
  SET
    run_count       = run_count + 1,
    last_run_at     = timezone('utc', now()),
    last_run_status = p_status
  WHERE id = p_workflow_id;
END;
$$;
