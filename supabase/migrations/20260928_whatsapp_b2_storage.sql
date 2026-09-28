-- ==============================================================================
-- BACKBLAZE B2 WHATSAPP MEDIA STORAGE & QUOTA TRACKING
-- ==============================================================================
-- Safe & Idempotent Migration:
-- 1. Table: fw_whatsapp_media_files (Logs all uploaded B2 WhatsApp media)
-- 2. View: vw_workspace_whatsapp_storage_usage (Calculates storage usage per workspace)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.fw_whatsapp_media_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL,
    file_key TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL,
    media_category TEXT DEFAULT 'document', -- 'quotation', 'invoice', 'flyer', 'image', 'document'
    signed_url TEXT,
    expires_at TIMESTAMPTZ,
    b2_bucket TEXT DEFAULT 'studiocore-whatsapp-media',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fw_whatsapp_media_files_ws ON public.fw_whatsapp_media_files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fw_whatsapp_media_files_cat ON public.fw_whatsapp_media_files(workspace_id, media_category);
CREATE INDEX IF NOT EXISTS idx_fw_whatsapp_media_files_created ON public.fw_whatsapp_media_files(created_at DESC);

-- View: vw_workspace_whatsapp_storage_usage (500 MB quota tracking)
DROP VIEW IF EXISTS public.vw_workspace_whatsapp_storage_usage CASCADE;

CREATE VIEW public.vw_workspace_whatsapp_storage_usage AS
SELECT
    workspace_id,
    COUNT(id)::int AS total_files,
    COALESCE(SUM(file_size_bytes), 0)::bigint AS total_bytes,
    ROUND(COALESCE(SUM(file_size_bytes), 0)::numeric / (1024 * 1024), 2) AS total_mb,
    500.00 AS quota_mb,
    ROUND((COALESCE(SUM(file_size_bytes), 0)::numeric / (500.0 * 1024 * 1024)) * 100, 2) AS usage_percent
FROM public.fw_whatsapp_media_files
GROUP BY workspace_id;

-- Enable RLS
ALTER TABLE public.fw_whatsapp_media_files ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'fw_whatsapp_media_files' 
          AND policyname = 'fw_whatsapp_media_files_all_access'
    ) THEN
        CREATE POLICY fw_whatsapp_media_files_all_access ON public.fw_whatsapp_media_files
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
