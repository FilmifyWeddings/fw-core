-- Migration: Extended Studio Settings Column
-- Adds JSONB storage for general studio configurations (prefixes, categories, templates, deliverables)

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS studio_settings JSONB DEFAULT '{}'::jsonb NOT NULL;
