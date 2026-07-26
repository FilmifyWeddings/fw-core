-- =====================================================================
-- MIGRATION: 20260727100000_add_missing_schema_columns.sql
-- Description: Add missing schema columns referenced by backend routes:
--              1. `fb_lead_forms`: Add `is_active` BOOLEAN DEFAULT true
--              2. `profiles`: Add `full_name` TEXT and `email` TEXT
--              3. `fb_page_configs`: Add `tenant_id` TEXT
-- =====================================================================

-- 1. Add is_active column to fb_lead_forms
ALTER TABLE public.fb_lead_forms 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Add full_name and email columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Add tenant_id column to fb_page_configs
ALTER TABLE public.fb_page_configs 
ADD COLUMN IF NOT EXISTS tenant_id TEXT;
