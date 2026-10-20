-- ==============================================================================
-- Add is_face_ai_enabled to event_galleries
-- Enables or disables AI Face Recognition per event gallery
-- ==============================================================================

-- 1. Add is_face_ai_enabled column with default TRUE (existing events remain enabled)
ALTER TABLE IF EXISTS event_galleries 
ADD COLUMN IF NOT EXISTS is_face_ai_enabled BOOLEAN DEFAULT true;

-- 2. Performance Index for fast filtering by Face AI mode
CREATE INDEX IF NOT EXISTS idx_event_galleries_face_ai ON event_galleries(is_face_ai_enabled);
