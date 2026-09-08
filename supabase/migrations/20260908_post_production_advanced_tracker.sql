-- Migration: Advanced Post-Production Tracker & Comments
-- 1. Ensure post_production_deliverables table has advanced tracking attributes
ALTER TABLE public.post_production_deliverables 
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Upcoming',
ADD COLUMN IF NOT EXISTS assigned_member_id UUID REFERENCES public.fw_team_members(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS comments_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE;

-- 2. Dedicated Comments / Activity Trail for Deliverables
CREATE TABLE IF NOT EXISTS public.post_production_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deliverable_id UUID NOT NULL REFERENCES public.post_production_deliverables(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pp_comments_deliverable 
ON public.post_production_comments(deliverable_id);

-- Enable RLS
ALTER TABLE public.post_production_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage comments" ON public.post_production_comments;
CREATE POLICY "Users can manage comments" 
ON public.post_production_comments FOR ALL TO authenticated 
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
