-- ==============================================================================
-- MULTI-TENANT FIX: Composite Unique Constraint for Leads (workspace_id, meta_lead_id)
-- ==============================================================================
-- Drops any global single-column constraint/index on meta_lead_id so that multiple
-- workspaces can sync the same Facebook Page / Lead Ads without collision.
-- Adds composite UNIQUE(workspace_id, meta_lead_id) for safe workspace isolation.
-- ==============================================================================

-- 1. Drop global single-column constraints/indexes on meta_lead_id if they exist
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_meta_lead_id_key;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_meta_lead_id_unique;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_meta_lead_id_uq;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS unique_meta_lead_id;

DROP INDEX IF EXISTS public.leads_meta_lead_id_key;
DROP INDEX IF EXISTS public.idx_leads_meta_lead_id_unique;
DROP INDEX IF EXISTS public.idx_leads_meta_lead_id;

-- 2. Drop existing composite constraint if previously created
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_workspace_meta_lead_unique;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_workspace_id_meta_lead_id_key;

-- 3. Add composite unique constraint per workspace
ALTER TABLE public.leads 
  ADD CONSTRAINT leads_workspace_meta_lead_unique UNIQUE (workspace_id, meta_lead_id);

-- 4. Create optimized index for workspace-scoped meta lead queries
CREATE INDEX IF NOT EXISTS idx_leads_workspace_meta_lead_id 
  ON public.leads(workspace_id, meta_lead_id) 
  WHERE meta_lead_id IS NOT NULL;

-- 5. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
