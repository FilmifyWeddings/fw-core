-- ─────────────────────────────────────────────────────────────
-- ENTERPRISE META LEAD ADS INTEGRATION SCHEMA
-- ─────────────────────────────────────────────────────────────

-- 1. Meta Connections (Tokens & Account Identity)
CREATE TABLE IF NOT EXISTS meta_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id VARCHAR(255) NOT NULL UNIQUE,
  meta_user_id VARCHAR(255) NOT NULL,
  meta_user_name VARCHAR(255) NOT NULL,
  meta_user_email VARCHAR(255),
  access_token TEXT NOT NULL,
  token_type VARCHAR(50) DEFAULT 'USER_LONG_LIVED',
  expires_at TIMESTAMPTZ,
  is_valid BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Meta Connected Pages
CREATE TABLE IF NOT EXISTS meta_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id VARCHAR(255) NOT NULL,
  page_id VARCHAR(255) NOT NULL,
  page_name VARCHAR(255) NOT NULL,
  page_category VARCHAR(255),
  page_access_token TEXT NOT NULL,
  picture_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_webhook_subscribed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, page_id)
);

-- 3. Meta Lead Forms (Instant Lead Forms)
CREATE TABLE IF NOT EXISTS meta_lead_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id VARCHAR(255) NOT NULL,
  page_id VARCHAR(255) NOT NULL,
  form_id VARCHAR(255) NOT NULL,
  form_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  questions_count INT DEFAULT 0,
  sync_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, form_id)
);

-- 4. Meta Lead Sync Audit Logs
CREATE TABLE IF NOT EXISTS meta_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id VARCHAR(255) NOT NULL,
  lead_id VARCHAR(255),
  leadgen_id VARCHAR(255) NOT NULL,
  form_id VARCHAR(255),
  page_id VARCHAR(255),
  lead_name VARCHAR(255),
  lead_phone VARCHAR(255),
  lead_email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'SYNCED',
  duplicate_status VARCHAR(50) DEFAULT 'UNIQUE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Meta Error Logs (Human Readable Error Tracking)
CREATE TABLE IF NOT EXISTS meta_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id VARCHAR(255) NOT NULL,
  error_type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  error_details JSONB,
  resolution_hint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meta_pages_workspace ON meta_pages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meta_forms_workspace ON meta_lead_forms(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meta_forms_page ON meta_lead_forms(page_id);
CREATE INDEX IF NOT EXISTS idx_meta_sync_leadgen ON meta_sync_logs(leadgen_id);
