-- ==============================================================================
-- Add event_type to event_galleries for Wedding, Haldi, Sangeet, Corporate, etc.
-- ==============================================================================

-- 1. Add event_type column if it doesn't already exist
ALTER TABLE IF EXISTS event_galleries 
ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'Wedding';

-- 2. Performance Index for fast filtering by event type
CREATE INDEX IF NOT EXISTS idx_event_galleries_type ON event_galleries(event_type);
