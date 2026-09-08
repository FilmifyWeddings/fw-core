-- Migration: Specs, custom categories, and event sync for Post-Production Deliverables
-- Date: 2026-09-08

-- 1. Ensure deliverable specs, unit, and order columns exist
ALTER TABLE public.post_production_deliverables 
ADD COLUMN IF NOT EXISTS specs TEXT,             -- e.g. '25 Mins', '500 Photos', '40 Pages'
ADD COLUMN IF NOT EXISTS custom_category_name TEXT;

-- 2. Index for project deliverables lookup
CREATE INDEX IF NOT EXISTS idx_pp_deliverables_lookup 
ON public.post_production_deliverables(project_id, segment, category);
