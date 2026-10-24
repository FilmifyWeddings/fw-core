-- Migration: Studio Subtitle & Branding Persistence
-- Non-destructive additive column migration

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS studio_subtitle TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS studio_subtitle TEXT;
