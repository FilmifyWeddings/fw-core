-- ============================================================
-- BRAHMASTRA PERFORMANCE INDEXING MIGRATION
-- Migration: 20260618000002_performance_indexes.sql
-- Law 4 Compliance: Ultra-fast sub-10ms query lookups
-- Covers: All user_id/workspace_id FK columns, status, event_id,
--         scheduled_for, and composite hot-path indexes
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- SECTION 1: CORE TENANCY ISOLATION INDEXES
-- These cover the most frequent RLS-filtered queries: .eq('workspace_id', uid)
-- ────────────────────────────────────────────────────────────

-- Profiles table: covered by PK (id = auth.uid()), no additional index needed
-- Already has: PRIMARY KEY on id

-- Leads: workspace_id + created_at for sorted list views
CREATE INDEX IF NOT EXISTS idx_leads_workspace_created
  ON public.leads(workspace_id, created_at DESC);

-- Leads: workspace_id + status for filtered pipeline views (CRM board)
CREATE INDEX IF NOT EXISTS idx_leads_workspace_status
  ON public.leads(workspace_id, status);

-- Leads: workspace_id + score for AI scoring filters
CREATE INDEX IF NOT EXISTS idx_leads_workspace_score
  ON public.leads(workspace_id, score);

-- Leads: phone lookup for deduplication on webhook ingress
CREATE INDEX IF NOT EXISTS idx_leads_phone_workspace
  ON public.leads(phone, workspace_id);

-- ────────────────────────────────────────────────────────────
-- SECTION 2: SEQUENCE & DRIP ENGINE INDEXES
-- ────────────────────────────────────────────────────────────

-- Sequences: active sequences per workspace (hot query in queueDripsForLead)
CREATE INDEX IF NOT EXISTS idx_sequences_workspace_active
  ON public.sequences(workspace_id, is_active)
  WHERE is_active = TRUE;

-- Sequence Steps: all steps for a given sequence_id (hot join path)
CREATE INDEX IF NOT EXISTS idx_sequence_steps_seq_order
  ON public.sequence_steps(sequence_id, step_number ASC);

-- ────────────────────────────────────────────────────────────
-- SECTION 3: QUEUE MESSAGES — CRITICAL HOT PATH
-- Worker polls this table every few seconds. Must be <5ms.
-- ────────────────────────────────────────────────────────────

-- Primary polling index: status=pending, ordered by scheduled_for
-- Partial index = only indexes PENDING rows → massive speedup
CREATE INDEX IF NOT EXISTS idx_queue_messages_pending_scheduled
  ON public.queue_messages(workspace_id, scheduled_for ASC)
  WHERE status = 'pending';

-- Retry index: finds retryable failed messages efficiently
CREATE INDEX IF NOT EXISTS idx_queue_messages_retry
  ON public.queue_messages(workspace_id, retry_count, status)
  WHERE status = 'failed';

-- Lead-level status query (to show all messages for one lead)
CREATE INDEX IF NOT EXISTS idx_queue_messages_lead_id
  ON public.queue_messages(lead_id, status);

-- ────────────────────────────────────────────────────────────
-- SECTION 4: LIVE LOGS — AUDIT TRAIL INDEXES
-- ────────────────────────────────────────────────────────────

-- Most recent events per workspace (dashboard feed)
CREATE INDEX IF NOT EXISTS idx_live_logs_workspace_time
  ON public.live_logs(workspace_id, created_at DESC);

-- Filter by event_type (e.g. 'whatsapp_failed', 'webhook_ingested')
CREATE INDEX IF NOT EXISTS idx_live_logs_event_type
  ON public.live_logs(workspace_id, event_type, created_at DESC);

-- Lead activity trail (click on a lead → see all events)
CREATE INDEX IF NOT EXISTS idx_live_logs_lead_id
  ON public.live_logs(lead_id, created_at DESC)
  WHERE lead_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- SECTION 5: INTEGRATION CREDENTIALS INDEXES
-- ────────────────────────────────────────────────────────────

-- Per-user provider lookup (used in fetchCreds)
CREATE INDEX IF NOT EXISTS idx_integration_credentials_user_provider
  ON public.integration_credentials(user_id, provider);

-- Status filter (find all connected users for admin panel)
CREATE INDEX IF NOT EXISTS idx_integration_credentials_status
  ON public.integration_credentials(provider, status);

-- ────────────────────────────────────────────────────────────
-- SECTION 6: BAILEYS ENGINE INDEXES
-- ────────────────────────────────────────────────────────────

-- Sessions: workspace lookup (1-row-per-workspace, but fast upsert path)
CREATE INDEX IF NOT EXISTS idx_baileys_sessions_workspace
  ON public.baileys_sessions(workspace_id);

-- Messages: primary chat lookup (the inbox/conversation view hot path)
-- Already exists in baileys migration but ensuring coverage:
CREATE INDEX IF NOT EXISTS idx_baileys_messages_workspace_chat
  ON public.baileys_messages(workspace_id, chat_jid, sent_at DESC);

-- Messages: status filter for failed/retry dashboard
CREATE INDEX IF NOT EXISTS idx_baileys_messages_status
  ON public.baileys_messages(workspace_id, status)
  WHERE status IN ('failed', 'queued');

-- Messages: lead linkage for lead profile view
CREATE INDEX IF NOT EXISTS idx_baileys_messages_lead_id
  ON public.baileys_messages(lead_id, sent_at DESC)
  WHERE lead_id IS NOT NULL;

-- Action Queue: primary polling index (worker hot path)
-- Already exists in baileys migration — re-creating safely:
CREATE INDEX IF NOT EXISTS idx_baileys_queue_pending_priority
  ON public.baileys_action_queue(workspace_id, priority ASC, created_at ASC)
  WHERE status = 'pending';

-- Action Queue: retry index for exponential backoff processor
CREATE INDEX IF NOT EXISTS idx_baileys_queue_retry
  ON public.baileys_action_queue(workspace_id, attempt_count, status)
  WHERE status IN ('failed', 'processing');

-- Chats: latest message timestamp sort (sidebar ordering)
CREATE INDEX IF NOT EXISTS idx_baileys_chats_workspace_time
  ON public.baileys_chats(workspace_id, last_message_at DESC NULLS LAST);

-- Templates: active templates per workspace
CREATE INDEX IF NOT EXISTS idx_baileys_templates_workspace_active
  ON public.baileys_templates(workspace_id, is_active, category)
  WHERE is_active = TRUE;

-- ────────────────────────────────────────────────────────────
-- SECTION 7: ADMIN TELEMETRY TABLES
-- ────────────────────────────────────────────────────────────

-- User telemetry: last_active for activity sorting in admin panel
CREATE INDEX IF NOT EXISTS idx_user_telemetry_last_active
  ON public.user_telemetry_metrics(user_id, last_active_timestamp DESC);

-- App versions: active version lookup (most common admin query)
CREATE INDEX IF NOT EXISTS idx_app_versions_active
  ON public.app_versions(is_active, created_at DESC)
  WHERE is_active = TRUE;

-- ────────────────────────────────────────────────────────────
-- SECTION 8: ADDITIONAL COMPOSITE INDEXES FOR ADVANCED QUERIES
-- ────────────────────────────────────────────────────────────

-- Field mappings: workspace + key (used in webhook field resolver)
CREATE INDEX IF NOT EXISTS idx_field_mappings_workspace_key
  ON public.field_mappings(workspace_id, meta_field_key);

-- ────────────────────────────────────────────────────────────
-- SECTION 9: MAINTENANCE — ENABLE AUTOVACUUM TUNING HINTS
-- (Apply via Supabase Dashboard → Database → Table Editor → Settings)
-- ────────────────────────────────────────────────────────────
-- Recommended: for high-write tables (queue_messages, baileys_messages, live_logs)
-- ALTER TABLE public.queue_messages SET (autovacuum_vacuum_scale_factor = 0.01);
-- ALTER TABLE public.baileys_messages SET (autovacuum_vacuum_scale_factor = 0.01);
-- ALTER TABLE public.live_logs SET (autovacuum_vacuum_scale_factor = 0.01);
-- This ensures dead tuples are cleaned up faster under heavy write load.

-- ────────────────────────────────────────────────────────────
-- VERIFY: Run this query in Supabase SQL Editor to confirm all indexes
-- SELECT schemaname, tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;
-- ────────────────────────────────────────────────────────────
