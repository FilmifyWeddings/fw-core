-- =====================================================================
-- MIGRATION: 20260727000000_multi_tenant_composite_unique_constraints.sql
-- Description: Replace single-column UNIQUE constraints on page_id and form_id
--              with COMPOSITE UNIQUE constraints (workspace_id, page_id) and (workspace_id, form_id)
--              to enforce strict multi-tenant isolation across all Meta Integration tables.
-- =====================================================================

-- 1. `fb_page_configs`: Drop single-column unique constraint and add composite UNIQUE (workspace_id, page_id)
ALTER TABLE public.fb_page_configs DROP CONSTRAINT IF EXISTS fb_page_configs_page_id_key;
ALTER TABLE public.fb_page_configs DROP CONSTRAINT IF EXISTS fb_page_configs_pkey CASCADE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fb_page_configs_workspace_page_key'
    ) THEN
        ALTER TABLE public.fb_page_configs ADD CONSTRAINT fb_page_configs_workspace_page_key UNIQUE (workspace_id, page_id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. `fb_lead_forms`: Drop single-column unique constraint and add composite UNIQUE (workspace_id, form_id)
ALTER TABLE public.fb_lead_forms DROP CONSTRAINT IF EXISTS fb_lead_forms_form_id_key;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fb_lead_forms_workspace_form_key'
    ) THEN
        ALTER TABLE public.fb_lead_forms ADD CONSTRAINT fb_lead_forms_workspace_form_key UNIQUE (workspace_id, form_id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 3. `fb_form_mappings`: Drop single-column unique constraint and add composite UNIQUE (workspace_id, form_id)
ALTER TABLE public.fb_form_mappings DROP CONSTRAINT IF EXISTS fb_form_mappings_form_id_key;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fb_form_mappings_workspace_form_key'
    ) THEN
        ALTER TABLE public.fb_form_mappings ADD CONSTRAINT fb_form_mappings_workspace_form_key UNIQUE (workspace_id, form_id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 4. `integration_credentials`: Ensure composite UNIQUE (user_id, provider)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'integration_credentials_user_provider_key'
    ) THEN
        ALTER TABLE public.integration_credentials ADD CONSTRAINT integration_credentials_user_provider_key UNIQUE (user_id, provider);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
