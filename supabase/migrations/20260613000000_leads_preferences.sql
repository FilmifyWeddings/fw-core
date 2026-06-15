-- Migration: Add Leads Table preferences to profiles
-- Stores the active/visible columns configuration and their order per workspace user

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS leads_table_preferences jsonb DEFAULT '{}'::jsonb;
