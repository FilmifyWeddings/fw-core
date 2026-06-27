-- Migration: Add config column to integration_credentials table
-- Allows storing spreadsheet configuration, mapping settings, and row sync state

ALTER TABLE public.integration_credentials 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb NOT NULL;
