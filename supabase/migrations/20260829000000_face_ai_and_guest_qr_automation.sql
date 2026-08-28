-- ==============================================================================
-- StudioCore Face AI Engine & Pre-Event QR Auto-Dispatch Migration
-- ==============================================================================

-- 1. Extend event_galleries with Publishing Status and Automation Tracking
ALTER TABLE event_galleries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'UNPUBLISHED'; -- 'DRAFT' | 'UNPUBLISHED' | 'PUBLISHED'
ALTER TABLE event_galleries ADD COLUMN IF NOT EXISTS auto_notify_enabled BOOLEAN DEFAULT true;
ALTER TABLE event_galleries ADD COLUMN IF NOT EXISTS total_registered_guests INT DEFAULT 0;
ALTER TABLE event_galleries ADD COLUMN IF NOT EXISTS total_notified_guests INT DEFAULT 0;
ALTER TABLE event_galleries ADD COLUMN IF NOT EXISTS qr_code_svg TEXT;

-- 2. Photo Faces Table (Stores 1 to N detected faces per photo with 512-D vectors)
CREATE TABLE IF NOT EXISTS photo_faces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  gallery_id UUID REFERENCES event_galleries(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES gallery_photos(id) ON DELETE CASCADE,
  bounding_box JSONB DEFAULT '{"x": 0, "y": 0, "w": 100, "h": 100}'::jsonb,
  embedding JSONB NOT NULL, -- 512-dimensional normalized vector
  confidence NUMERIC DEFAULT 0.95,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Pre-Event Guest Registrations (Guests scanning QR before/during wedding)
CREATE TABLE IF NOT EXISTS event_guest_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  gallery_id UUID REFERENCES event_galleries(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  guest_email TEXT,
  selfie_url TEXT,
  face_embedding JSONB NOT NULL, -- 512-D vector from selfie
  access_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  matched_photo_ids JSONB DEFAULT '[]'::jsonb,
  notification_status TEXT DEFAULT 'PENDING', -- 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED'
  whatsapp_sent_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(gallery_id, guest_phone)
);

-- 4. Guest Delivery Logs (Audit trail for WhatsApp & Email Auto-Dispatch)
CREATE TABLE IF NOT EXISTS guest_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  gallery_id UUID REFERENCES event_galleries(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES event_guest_registrations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- 'WHATSAPP' | 'EMAIL'
  status TEXT NOT NULL DEFAULT 'DELIVERED', -- 'DELIVERED' | 'FAILED' | 'PENDING'
  recipient TEXT NOT NULL,
  matched_count INT DEFAULT 0,
  payload JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_photo_faces_gallery ON photo_faces(gallery_id);
CREATE INDEX IF NOT EXISTS idx_photo_faces_photo ON photo_faces(photo_id);
CREATE INDEX IF NOT EXISTS idx_guest_reg_gallery ON event_guest_registrations(gallery_id);
CREATE INDEX IF NOT EXISTS idx_guest_reg_workspace ON event_guest_registrations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_guest_reg_token ON event_guest_registrations(access_token);
CREATE INDEX IF NOT EXISTS idx_guest_logs_gallery ON guest_delivery_logs(gallery_id);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE photo_faces ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_guest_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_delivery_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow photo_faces access') THEN
    CREATE POLICY "Allow photo_faces access" ON photo_faces FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow guest_registrations access') THEN
    CREATE POLICY "Allow guest_registrations access" ON event_guest_registrations FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow delivery_logs access') THEN
    CREATE POLICY "Allow delivery_logs access" ON guest_delivery_logs FOR ALL USING (true);
  END IF;
END $$;
