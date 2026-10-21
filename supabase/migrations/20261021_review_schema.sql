-- ==============================================================================
-- StudioCore Review: Full-Scale Video Review, Client Feedback & Approval Schema
-- ==============================================================================

-- 1. Review Projects Table
CREATE TABLE IF NOT EXISTS public.review_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  client_id UUID,
  client_name TEXT,
  client_email TEXT,
  event_date DATE,
  status TEXT DEFAULT 'in_review' CHECK (status IN ('draft', 'in_review', 'changes_requested', 'approved', 'archived')),
  cover_thumbnail_url TEXT,
  assigned_team_member_ids JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_proj_ws ON public.review_projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_review_proj_status ON public.review_projects(status);

-- 2. Review Videos Table (Multiple videos per project, e.g., Teaser, Highlight Film)
CREATE TABLE IF NOT EXISTS public.review_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.review_projects(id) ON DELETE CASCADE,
  workspace_id UUID,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Highlight Film',
  current_version_id UUID,
  status TEXT DEFAULT 'in_review' CHECK (status IN ('draft', 'in_review', 'changes_requested', 'approved')),
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_vid_proj ON public.review_videos(project_id);

-- 3. Review Video Versions Table (V1, V2, V3 with changelog, source type)
CREATE TABLE IF NOT EXISTS public.review_video_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.review_videos(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.review_projects(id) ON DELETE CASCADE,
  workspace_id UUID,
  version_number INT DEFAULT 1,
  version_label TEXT DEFAULT 'V1',
  source_type TEXT DEFAULT 'upload' CHECK (source_type IN ('upload', 'youtube')),
  storage_key TEXT,
  video_url TEXT NOT NULL,
  original_file_url TEXT,
  youtube_video_id TEXT,
  thumbnail_url TEXT,
  duration_seconds NUMERIC DEFAULT 0,
  resolution TEXT DEFAULT '1080p',
  file_size_bytes BIGINT DEFAULT 0,
  changelog_notes TEXT,
  status TEXT DEFAULT 'in_review' CHECK (status IN ('in_review', 'changes_requested', 'approved')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_ver_vid ON public.review_video_versions(video_id);

-- 4. Review Comments & Frame Annotations Table
CREATE TABLE IF NOT EXISTS public.review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.review_video_versions(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.review_videos(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.review_projects(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.review_comments(id) ON DELETE CASCADE,
  timestamp_seconds NUMERIC NOT NULL DEFAULT 0,
  author_name TEXT NOT NULL,
  author_email TEXT,
  author_role TEXT DEFAULT 'reviewer' CHECK (author_role IN ('client', 'editor', 'owner', 'reviewer')),
  content TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  is_internal BOOLEAN DEFAULT false,
  has_annotation BOOLEAN DEFAULT false,
  annotation_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_comm_ver ON public.review_comments(version_id);
CREATE INDEX IF NOT EXISTS idx_review_comm_time ON public.review_comments(version_id, timestamp_seconds);

-- 5. Review Client Share Links Table
CREATE TABLE IF NOT EXISTS public.review_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.review_projects(id) ON DELETE CASCADE,
  workspace_id UUID,
  token TEXT UNIQUE NOT NULL,
  allow_comments BOOLEAN DEFAULT true,
  allow_approvals BOOLEAN DEFAULT true,
  allow_downloads BOOLEAN DEFAULT true,
  require_passcode BOOLEAN DEFAULT false,
  passcode TEXT,
  expires_at TIMESTAMPTZ,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_share_token ON public.review_shares(token);

-- 6. Review Client Approvals & Revision Requests Table
CREATE TABLE IF NOT EXISTS public.review_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.review_projects(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.review_videos(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES public.review_video_versions(id) ON DELETE CASCADE,
  workspace_id UUID,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'changes_requested')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_appr_proj ON public.review_approvals(project_id);

-- 7. Review Storage Quotas Table
CREATE TABLE IF NOT EXISTS public.review_storage_quotas (
  workspace_id UUID PRIMARY KEY,
  quota_bytes BIGINT DEFAULT 53687091200, -- 50 GB default Starter
  used_bytes BIGINT DEFAULT 0,
  tier_name TEXT DEFAULT 'Starter (50GB)',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security (RLS) policies
ALTER TABLE public.review_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_video_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_storage_quotas ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public and service role access to review_projects') THEN
    CREATE POLICY "Allow public and service role access to review_projects" ON public.review_projects FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public and service role access to review_videos') THEN
    CREATE POLICY "Allow public and service role access to review_videos" ON public.review_videos FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public and service role access to review_video_versions') THEN
    CREATE POLICY "Allow public and service role access to review_video_versions" ON public.review_video_versions FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public and service role access to review_comments') THEN
    CREATE POLICY "Allow public and service role access to review_comments" ON public.review_comments FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public and service role access to review_shares') THEN
    CREATE POLICY "Allow public and service role access to review_shares" ON public.review_shares FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public and service role access to review_approvals') THEN
    CREATE POLICY "Allow public and service role access to review_approvals" ON public.review_approvals FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public and service role access to review_storage_quotas') THEN
    CREATE POLICY "Allow public and service role access to review_storage_quotas" ON public.review_storage_quotas FOR ALL USING (true);
  END IF;
END $$;
