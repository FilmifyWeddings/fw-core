-- ================================================================
-- Migration: Add contact_group_id to fb_form_mappings
-- File: 20260729000003_fb_mappings_contact_group.sql
-- ================================================================

ALTER TABLE public.fb_form_mappings
  ADD COLUMN IF NOT EXISTS contact_group_id UUID REFERENCES public.whatsapp_contact_groups(id) ON DELETE SET NULL;
