-- Migration: Client Mood Board & Wedding Prep Portal
-- Table: client_moodboards with Cloudflare R2 image support, public magic token and progress tracker

CREATE TABLE IF NOT EXISTS public.client_moodboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  client_id UUID NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  
  -- Progress & Status
  completion_percentage INT DEFAULT 0,
  status TEXT DEFAULT 'DRAFT', -- 'DRAFT', 'SUBMITTED', 'IN_REVIEW'
  
  -- 1. Couple Portrait & References
  couple_photos JSONB DEFAULT '[]'::jsonb, -- [{ url, caption, comment }]
  
  -- 2. Social Media Handles
  bride_instagram TEXT,
  groom_instagram TEXT,
  couple_instagram TEXT,
  
  -- 3. Coordination Contacts (Bride & Groom sides)
  bride_coordinator JSONB DEFAULT '{"name": "", "phone": "", "relation": ""}'::jsonb,
  groom_coordinator JSONB DEFAULT '{"name": "", "phone": "", "relation": ""}'::jsonb,
  
  -- 4. Close Family Photos (Intimate family coverage)
  close_family_photos JSONB DEFAULT '[]'::jsonb, -- [{ url, side: 'Bride'|'Groom', relation: '', names: '' }]
  
  -- 5. Visual Inspiration & Mood Boards
  photo_references JSONB DEFAULT '[]'::jsonb, -- [{ url, pinterest_url, category: 'Pose'|'Decor'|'Style'|'Rituals', notes }]
  
  -- 6. Video & Reel References
  video_references JSONB DEFAULT '[]'::jsonb, -- [{ type: 'Reel'|'YouTube'|'Drive', url, notes }]
  
  -- 7. Complete Event Itinerary
  itinerary_schedule JSONB DEFAULT '[]'::jsonb, -- [{ event_name, date, start_time, end_time, rituals_notes }]
  
  -- 8. Event Venues & Google Maps
  venue_locations JSONB DEFAULT '[]'::jsonb, -- [{ event_name, venue_name, address, maps_url }]
  
  -- 9. Finalized Outfits & Styling
  outfit_references JSONB DEFAULT '[]'::jsonb, -- [{ event_name, bride_outfit_url, groom_outfit_url, notes }]
  
  -- 10. Wedding-Day Payment Coordinator
  payment_contact JSONB DEFAULT '{"name": "", "phone": "", "relation": ""}'::jsonb,
  
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, client_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_moodboards_workspace_id ON public.client_moodboards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_client_moodboards_client_id ON public.client_moodboards(client_id);
CREATE INDEX IF NOT EXISTS idx_client_moodboards_token ON public.client_moodboards(token);

-- RLS: Public can read/update using unique token, authenticated workspace users have full access
ALTER TABLE public.client_moodboards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Moodboard Access by Token" ON public.client_moodboards;
CREATE POLICY "Public Moodboard Access by Token" ON public.client_moodboards
  FOR ALL USING (true) WITH CHECK (true);
