-- ==============================================================================
-- MIGRATION: 20261120000000_enterprise_speed_composite_indexes_and_rls.sql
-- PURPOSE: Enterprise-Grade Speed, High-Concurrency Index Scans & Zero-Lag Queries
-- ==============================================================================

-- 1. SCALAR RLS OPTIMIZATION HELPER
-- Replaces expensive per-row subqueries with STABLE in-memory cached evaluator
CREATE OR REPLACE FUNCTION public.current_auth_uid()
RETURNS uuid
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT auth.uid();
$$;

-- 2. LEADS COMPOSITE B-TREE INDEXES
CREATE INDEX IF NOT EXISTS idx_leads_workspace_created_desc 
  ON public.leads (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_workspace_status 
  ON public.leads (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_leads_workspace_updated_desc 
  ON public.leads (workspace_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_client_id 
  ON public.leads (client_id) WHERE client_id IS NOT NULL;

-- 3. QUOTATIONS COMPOSITE B-TREE INDEXES
CREATE INDEX IF NOT EXISTS idx_quotations_workspace_created_desc 
  ON public.quotations (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotations_workspace_status 
  ON public.quotations (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_quotations_lead_id 
  ON public.quotations (lead_id) WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quotations_client_id 
  ON public.quotations (client_id) WHERE client_id IS NOT NULL;

-- 4. WORKSPACE CLIENTS & FINANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_workspace_clients_ws_created 
  ON public.workspace_clients (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_clients_user_id 
  ON public.workspace_clients (user_id);

CREATE INDEX IF NOT EXISTS idx_client_finance_records_ws 
  ON public.client_finance_records (workspace_id);

CREATE INDEX IF NOT EXISTS idx_client_finance_records_client 
  ON public.client_finance_records (client_id);

-- 5. WORKSPACE MEMBERS & GRANULAR RBAC INDEXES
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws_user 
  ON public.workspace_members (workspace_id, user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_email 
  ON public.workspace_members (email);

CREATE INDEX IF NOT EXISTS idx_studio_member_perms_ws_user 
  ON public.studio_member_permissions (workspace_id, user_id);

-- 6. WEDDING PROJECTS, EVENTS & CREW ASSIGNMENTS (TEAM MANAGER)
CREATE INDEX IF NOT EXISTS idx_fw_projects_workspace_created 
  ON public.fw_projects (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fw_sub_events_project_date 
  ON public.fw_sub_events (project_id, event_date);

CREATE INDEX IF NOT EXISTS idx_fw_sub_events_date 
  ON public.fw_sub_events (event_date);

CREATE INDEX IF NOT EXISTS idx_fw_assignments_sub_event_member 
  ON public.fw_assignments (sub_event_id, member_id);

-- 7. VIDEO REVIEW & COMMERCE INDEXES
CREATE INDEX IF NOT EXISTS idx_review_projects_workspace_created 
  ON public.review_projects (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_videos_project_created 
  ON public.review_videos (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_comments_video 
  ON public.review_comments (video_id, timestamp_seconds);

-- 8. PHOTO GALLERY & EVENT MEDIA INDEXES
CREATE INDEX IF NOT EXISTS idx_gallery_events_workspace_created 
  ON public.gallery_events (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gallery_photos_gallery_created 
  ON public.gallery_photos (gallery_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gallery_photos_is_favorite 
  ON public.gallery_photos (gallery_id) WHERE is_favorite = true;

-- 9. WHATSAPP & AUTOMATION PIPELINE INDEXES
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_ws_created 
  ON public.whatsapp_messages (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_workflows_ws_active 
  ON public.whatsapp_workflows (workspace_id, is_active);

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_ws 
  ON public.whatsapp_instances (workspace_id);

-- 10. REFRESH QUERY PLANNER STATISTICS
ANALYZE public.leads;
ANALYZE public.quotations;
ANALYZE public.workspace_clients;
ANALYZE public.workspace_members;
ANALYZE public.fw_projects;
ANALYZE public.fw_sub_events;
ANALYZE public.fw_assignments;
