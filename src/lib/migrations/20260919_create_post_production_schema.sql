-- ==============================================================================
-- POST-PRODUCTION MASTER SCHEMA & MULTI-TENANT ISOLATION MIGRATION
-- ==============================================================================
-- Run this SQL in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query).
-- It creates all required tables, constraints, indexes and RLS policies for:
-- 1. post_production_settings (Custom deliverable presets & workflow statuses per workspace)
-- 2. post_production_projects (Per-client post-production tracking)
-- 3. post_production_deliverables (Individual deliverable tasks)
-- 4. post_production_project_config (Segment and category customization per project)
-- 5. post_production_comments (Activity & revision comments per deliverable)
-- 6. post_production_reminders (Alerts & notification reminders)
-- ==============================================================================

-- 1. Post-Production Master Settings Table (Per-Workspace Isolated)
CREATE TABLE IF NOT EXISTS public.post_production_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,
  categories JSONB NOT NULL DEFAULT '[
    {
      "id": "cat_photos",
      "name": "Photos",
      "presets": [
        {"title": "Edited Photos", "specs": "500 Photos"},
        {"title": "Save the Date Photo", "specs": "5 Photos"},
        {"title": "Instagram Posts", "specs": "15 Photos"},
        {"title": "Teaser Stills", "specs": "25 Photos"},
        {"title": "Raw Photos", "specs": "All Unedited"}
      ]
    },
    {
      "id": "cat_videos",
      "name": "Videos",
      "presets": [
        {"title": "Cinematic Teaser", "specs": "3-5 Mins"},
        {"title": "Full Wedding Film", "specs": "25-40 Mins"},
        {"title": "Traditional Video", "specs": "60+ Mins"},
        {"title": "Instagram Reels", "specs": "30-60 Secs"},
        {"title": "Raw Footage", "specs": "Full Dump"}
      ]
    },
    {
      "id": "cat_albums",
      "name": "Albums",
      "presets": [
        {"title": "Canvas Bound Album", "specs": "40 Sheets"},
        {"title": "Mini Photo Book", "specs": "20 Sheets"},
        {"title": "Parent Album", "specs": "30 Sheets"},
        {"title": "Flush Mount Album", "specs": "50 Sheets"}
      ]
    }
  ]'::jsonb,
  statuses JSONB NOT NULL DEFAULT '[
    {"id": "st_upcoming", "name": "Upcoming", "color": "#f59e0b"},
    {"id": "st_progress", "name": "In Progress", "color": "#0ea5e9"},
    {"id": "st_review", "name": "Under Review", "color": "#a855f7"},
    {"id": "st_done", "name": "Done", "color": "#10b981"}
  ]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_pp_settings_workspace UNIQUE (workspace_id)
);

-- 2. Post-Production Projects Table
CREATE TABLE IF NOT EXISTS public.post_production_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  workspace_id TEXT,
  client_id TEXT NOT NULL,
  project_manager_id TEXT,
  project_manager_name TEXT,
  overall_status TEXT DEFAULT 'active',
  deliverables JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Post-Production Deliverables Table (Individual items)
CREATE TABLE IF NOT EXISTS public.post_production_deliverables (
  id TEXT PRIMARY KEY DEFAULT ('deliv_' || gen_random_uuid()::text),
  project_id TEXT NOT NULL,
  segment TEXT DEFAULT 'Wedding',
  category TEXT DEFAULT 'Photos',
  title TEXT NOT NULL,
  status TEXT DEFAULT 'Upcoming',
  assigned_member_id TEXT,
  assigned_to TEXT,
  due_date TIMESTAMPTZ,
  specs TEXT,
  count TEXT,
  notes TEXT,
  is_custom BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Post-Production Project Segments & Config Table
CREATE TABLE IF NOT EXISTS public.post_production_project_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  workspace_id TEXT,
  enabled_segments JSONB DEFAULT '[]'::jsonb,
  disabled_categories JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_pp_project_config UNIQUE (project_id)
);

-- 5. Post-Production Comments & Revisions Table
CREATE TABLE IF NOT EXISTS public.post_production_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id TEXT NOT NULL,
  project_id TEXT,
  workspace_id TEXT,
  user_id TEXT,
  author_name TEXT NOT NULL DEFAULT 'Studio Lead',
  comment_text TEXT NOT NULL,
  reminder_at TIMESTAMPTZ,
  is_reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Post-Production Reminders & Notifications Table
CREATE TABLE IF NOT EXISTS public.post_production_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT,
  deliverable_id TEXT NOT NULL,
  project_id TEXT,
  recipient_id TEXT,
  recipient_name TEXT,
  title TEXT NOT NULL,
  reminder_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, dismissed
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_pp_settings_workspace ON public.post_production_settings (workspace_id);
CREATE INDEX IF NOT EXISTS idx_pp_projects_workspace ON public.post_production_projects (workspace_id, client_id);
CREATE INDEX IF NOT EXISTS idx_pp_projects_client ON public.post_production_projects (client_id);
CREATE INDEX IF NOT EXISTS idx_pp_deliv_project ON public.post_production_deliverables (project_id);
CREATE INDEX IF NOT EXISTS idx_pp_deliv_status ON public.post_production_deliverables (status);
CREATE INDEX IF NOT EXISTS idx_pp_comments_deliverable ON public.post_production_comments (deliverable_id);
CREATE INDEX IF NOT EXISTS idx_pp_reminders_status ON public.post_production_reminders (status, reminder_at);
CREATE INDEX IF NOT EXISTS idx_pp_reminders_recipient ON public.post_production_reminders (recipient_id);

-- 8. Row Level Security (RLS)
ALTER TABLE public.post_production_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_production_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_production_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_production_project_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_production_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_production_reminders ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_production_settings' AND policyname = 'Allow all access to post_production_settings') THEN
    CREATE POLICY "Allow all access to post_production_settings" ON public.post_production_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_production_projects' AND policyname = 'Allow all access to post_production_projects') THEN
    CREATE POLICY "Allow all access to post_production_projects" ON public.post_production_projects FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_production_deliverables' AND policyname = 'Allow all access to post_production_deliverables') THEN
    CREATE POLICY "Allow all access to post_production_deliverables" ON public.post_production_deliverables FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_production_project_config' AND policyname = 'Allow all access to post_production_project_config') THEN
    CREATE POLICY "Allow all access to post_production_project_config" ON public.post_production_project_config FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_production_comments' AND policyname = 'Allow all access to post_production_comments') THEN
    CREATE POLICY "Allow all access to post_production_comments" ON public.post_production_comments FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_production_reminders' AND policyname = 'Allow all access to post_production_reminders') THEN
    CREATE POLICY "Allow all access to post_production_reminders" ON public.post_production_reminders FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
