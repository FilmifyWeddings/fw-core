-- Migration: Add raw_payload JSONB column to event_galleries for storing custom visual presentation designs
ALTER TABLE IF EXISTS public.event_galleries
ADD COLUMN IF NOT EXISTS raw_payload JSONB DEFAULT '{}'::jsonb;

-- Optional index for faster JSON queries
CREATE INDEX IF NOT EXISTS idx_event_galleries_raw_payload ON public.event_galleries USING gin (raw_payload);
