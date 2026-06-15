-- ============================================================
-- BAILEYS ENGINE — ISOLATED DATABASE SCHEMA
-- Zero touch to existing WhastBoost tables. Fully isolated.
-- ============================================================

-- 1. ENUM: Message delivery status (WhatsApp protocol states)
DO $$ BEGIN
  CREATE TYPE baileys_msg_status AS ENUM ('queued', 'sent', 'delivered', 'read', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. ENUM: Connection state for a session
DO $$ BEGIN
  CREATE TYPE baileys_conn_state AS ENUM ('disconnected', 'connecting', 'open');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. ENUM: Action queue operation types
DO $$ BEGIN
  CREATE TYPE baileys_action_type AS ENUM ('send_text', 'send_media', 'send_template', 'group_dispatch', 'reconnect');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TABLE 1: baileys_sessions
-- Stores Baileys auth state JSON per workspace.
-- One row per workspace. Upserted on every creds.update event.
-- ============================================================
CREATE TABLE IF NOT EXISTS baileys_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL UNIQUE,  -- FK to auth.users (workspace owner)
  phone_number     TEXT,                  -- Linked WhatsApp number (populated after connect)
  conn_state       baileys_conn_state NOT NULL DEFAULT 'disconnected',
  qr_string        TEXT,                  -- Raw QR data string (worker writes, UI reads)
  qr_expires_at    TIMESTAMPTZ,           -- QR expires after ~60s
  creds_json       TEXT,                  -- Encrypted Baileys auth state JSON blob
  keys_json        TEXT,                  -- Encrypted signal keys JSON blob
  last_connected   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION baileys_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS baileys_sessions_updated_at ON baileys_sessions;
CREATE TRIGGER baileys_sessions_updated_at
  BEFORE UPDATE ON baileys_sessions
  FOR EACH ROW EXECUTE FUNCTION baileys_set_updated_at();

-- RLS
ALTER TABLE baileys_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can access their session"
  ON baileys_sessions FOR ALL
  USING (workspace_id = auth.uid());

-- ============================================================
-- TABLE 2: baileys_messages
-- Tracks every sent/received message with delivery status.
-- ============================================================
CREATE TABLE IF NOT EXISTS baileys_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL,
  lead_id          UUID,                  -- Optional: link to leads table
  wa_message_id    TEXT UNIQUE,           -- WhatsApp's own message ID (for status tracking)
  chat_jid         TEXT NOT NULL,         -- WhatsApp JID of contact/group (e.g. "91XXXXXXXXXX@s.whatsapp.net")
  direction        TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  message_text     TEXT,                  -- Plain text body
  media_url        TEXT,                  -- Supabase storage URL for media
  media_type       TEXT,                  -- 'image' | 'video' | 'document' | 'audio'
  media_mime       TEXT,                  -- MIME type for media
  status           baileys_msg_status NOT NULL DEFAULT 'queued',
  delivered_at     TIMESTAMPTZ,           -- When double tick received
  read_at          TIMESTAMPTZ,           -- When blue tick received
  error_message    TEXT,                  -- If failed, why
  template_id      UUID,                  -- Optional: link to baileys_templates
  metadata         JSONB DEFAULT '{}'::jsonb,  -- Extra fields (e.g. button replies)
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_baileys_messages_workspace ON baileys_messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_baileys_messages_chat_jid ON baileys_messages(workspace_id, chat_jid, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_baileys_messages_lead ON baileys_messages(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_baileys_messages_wa_id ON baileys_messages(wa_message_id) WHERE wa_message_id IS NOT NULL;

ALTER TABLE baileys_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can access their messages"
  ON baileys_messages FOR ALL
  USING (workspace_id = auth.uid());

-- ============================================================
-- TABLE 3: baileys_templates
-- Custom message templates with {{placeholder}} support.
-- Isolated from WhastBoost templates.
-- ============================================================
CREATE TABLE IF NOT EXISTS baileys_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL,
  name             TEXT NOT NULL,
  body_text        TEXT NOT NULL,         -- Template body with {lead_name}, {wedding_date}, etc.
  media_url        TEXT,                  -- Optional header media
  media_type       TEXT,                  -- 'image' | 'video' | 'document'
  placeholders     TEXT[] DEFAULT '{}',   -- Extracted placeholder list e.g. ['{lead_name}']
  category         TEXT DEFAULT 'general', -- 'welcome' | 'followup' | 'general'
  is_active        BOOLEAN DEFAULT TRUE,
  usage_count      INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS baileys_templates_updated_at ON baileys_templates;
CREATE TRIGGER baileys_templates_updated_at
  BEFORE UPDATE ON baileys_templates
  FOR EACH ROW EXECUTE FUNCTION baileys_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_baileys_templates_workspace ON baileys_templates(workspace_id, is_active);

ALTER TABLE baileys_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can manage their templates"
  ON baileys_templates FOR ALL
  USING (workspace_id = auth.uid());

-- ============================================================
-- TABLE 4: baileys_action_queue
-- Bridge table: Next.js writes, Railway Worker reads + executes.
-- Worker deletes row after processing (or marks failed).
-- ============================================================
CREATE TABLE IF NOT EXISTS baileys_action_queue (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL,
  action_type      baileys_action_type NOT NULL,
  payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- payload examples:
  -- send_text:     { to: "91XXXXXXXXXX@s.whatsapp.net", text: "Hello!" }
  -- send_media:    { to: "...", mediaUrl: "...", caption: "...", mimeType: "..." }
  -- send_template: { to: "...", templateId: "uuid", variables: { lead_name: "Raj" } }
  -- group_dispatch:{ groupJid: "...", leadData: { name: "...", source: "..." } }
  priority         INTEGER DEFAULT 5,    -- 1 = highest, 10 = lowest
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  attempt_count    INTEGER DEFAULT 0,
  error_message    TEXT,
  result_message_id TEXT,                -- Populated by worker on success
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_baileys_queue_pending ON baileys_action_queue(workspace_id, status, priority, created_at)
  WHERE status = 'pending';

-- Enable Realtime for this table (worker will subscribe to new inserts)
ALTER TABLE baileys_action_queue REPLICA IDENTITY FULL;

ALTER TABLE baileys_action_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can manage their action queue"
  ON baileys_action_queue FOR ALL
  USING (workspace_id = auth.uid());

-- Service role bypass (worker uses service role key)
CREATE POLICY "Service role has full access to action queue"
  ON baileys_action_queue FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to sessions"
  ON baileys_sessions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to messages"
  ON baileys_messages FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- TABLE 5: baileys_chats
-- Synced contact/chat list for WhatsApp Web UI sidebar.
-- Worker populates this from 'chats.set' and 'contacts.update' events.
-- ============================================================
CREATE TABLE IF NOT EXISTS baileys_chats (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL,
  jid              TEXT NOT NULL,         -- WhatsApp JID
  display_name     TEXT,                  -- Contact name from WhatsApp
  phone_number     TEXT,                  -- Extracted phone
  is_group         BOOLEAN DEFAULT FALSE,
  unread_count     INTEGER DEFAULT 0,
  last_message     TEXT,                  -- Snippet of last message
  last_message_at  TIMESTAMPTZ,
  profile_pic_url  TEXT,
  metadata         JSONB DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, jid)
);

DROP TRIGGER IF EXISTS baileys_chats_updated_at ON baileys_chats;
CREATE TRIGGER baileys_chats_updated_at
  BEFORE UPDATE ON baileys_chats
  FOR EACH ROW EXECUTE FUNCTION baileys_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_baileys_chats_workspace ON baileys_chats(workspace_id, last_message_at DESC);

ALTER TABLE baileys_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can access their chats"
  ON baileys_chats FOR ALL
  USING (workspace_id = auth.uid());

CREATE POLICY "Service role has full access to chats"
  ON baileys_chats FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- SUPABASE REALTIME: Enable for worker subscription
-- ============================================================
-- Run in Supabase Dashboard → Database → Replication → Enable these tables:
-- baileys_action_queue, baileys_sessions, baileys_messages
-- (Cannot be done via SQL migration — do it manually in dashboard)
