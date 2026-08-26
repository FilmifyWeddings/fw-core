-- ==============================================================================
-- EVOLUTION API WHATSAPP WEB (BETA) SCHEMA
-- ==============================================================================

-- 1. Workspace Evolution Instances
CREATE TABLE IF NOT EXISTS public.evolution_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE,
  instance_name TEXT NOT NULL,
  api_key TEXT,
  phone_number TEXT,
  profile_name TEXT,
  profile_pic_url TEXT,
  connection_status TEXT DEFAULT 'DISCONNECTED', -- 'DISCONNECTED', 'CONNECTING', 'CONNECTED'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Synced WhatsApp Contacts
CREATE TABLE IF NOT EXISTS public.evolution_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  jid TEXT NOT NULL,
  name TEXT,
  push_name TEXT,
  phone TEXT,
  profile_pic_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, jid)
);

-- 3. Synced WhatsApp Messages (Lightweight Metadata only, zero heavy blobs)
CREATE TABLE IF NOT EXISTS public.evolution_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  message_id TEXT NOT NULL,
  remote_jid TEXT NOT NULL,
  from_me BOOLEAN DEFAULT false,
  message_type TEXT DEFAULT 'text', -- 'text', 'image', 'audio', 'video', 'document', 'sticker', etc.
  content TEXT,
  media_url TEXT,
  status TEXT DEFAULT 'SENT', -- 'PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED'
  timestamp TIMESTAMPTZ DEFAULT now(),
  raw_payload JSONB DEFAULT '{}'::jsonb,
  UNIQUE(workspace_id, message_id)
);

-- 4. Fast query indexes for real-time chat & inbox performance
CREATE INDEX IF NOT EXISTS idx_evolution_instances_workspace ON public.evolution_instances(workspace_id);
CREATE INDEX IF NOT EXISTS idx_evolution_contacts_workspace ON public.evolution_contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_evolution_contacts_jid ON public.evolution_contacts(workspace_id, jid);
CREATE INDEX IF NOT EXISTS idx_evolution_messages_chat ON public.evolution_messages(workspace_id, remote_jid, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_evolution_messages_time ON public.evolution_messages(workspace_id, timestamp DESC);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.evolution_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_messages ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'evolution_instances' AND policyname = 'Workspaces can manage their evolution instances'
  ) THEN
    CREATE POLICY "Workspaces can manage their evolution instances"
      ON public.evolution_instances FOR ALL
      USING (auth.uid() = workspace_id)
      WITH CHECK (auth.uid() = workspace_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'evolution_contacts' AND policyname = 'Workspaces can manage their evolution contacts'
  ) THEN
    CREATE POLICY "Workspaces can manage their evolution contacts"
      ON public.evolution_contacts FOR ALL
      USING (auth.uid() = workspace_id)
      WITH CHECK (auth.uid() = workspace_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'evolution_messages' AND policyname = 'Workspaces can manage their evolution messages'
  ) THEN
    CREATE POLICY "Workspaces can manage their evolution messages"
      ON public.evolution_messages FOR ALL
      USING (auth.uid() = workspace_id)
      WITH CHECK (auth.uid() = workspace_id);
  END IF;
END $do$;

-- 6. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.evolution_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.evolution_contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.evolution_messages;

-- 7. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
