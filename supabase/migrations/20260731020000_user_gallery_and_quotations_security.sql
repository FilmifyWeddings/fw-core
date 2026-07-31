-- Migration: User Gallery Images Table & Row Level Security (RLS)
-- Enables per-user isolation for quotations and user gallery images

-- 1. Create user_gallery_images table for managing user image storage & limits
CREATE TABLE IF NOT EXISTS public.user_gallery_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    compression_quality TEXT DEFAULT 'high',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user query filtering
CREATE INDEX IF NOT EXISTS idx_user_gallery_images_workspace ON public.user_gallery_images(workspace_id);

-- Enable RLS
ALTER TABLE public.user_gallery_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if present
DROP POLICY IF EXISTS "Users can only access their own gallery images" ON public.user_gallery_images;

-- Policy: User can only select, insert, update, delete their own images
CREATE POLICY "Users can only access their own gallery images" ON public.user_gallery_images
    FOR ALL USING (auth.uid() = workspace_id OR workspace_id IS NULL)
    WITH CHECK (auth.uid() = workspace_id OR workspace_id IS NULL);
