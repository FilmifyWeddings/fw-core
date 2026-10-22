const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing required environment variables in .env.local.');
  process.exit(1);
}

const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

const MIGRATION_SQL = `
-- 1. Add clients_access and client_modules_access to studio_member_permissions
ALTER TABLE IF EXISTS public.studio_member_permissions 
ADD COLUMN IF NOT EXISTS clients_access TEXT DEFAULT 'NONE',
ADD COLUMN IF NOT EXISTS client_modules_access JSONB DEFAULT '["overview","quotations","events","moodboard","tasks","post_production","finance"]'::jsonb;

-- 2. Add clients_access and client_modules_access to member_permissions
ALTER TABLE IF EXISTS public.member_permissions 
ADD COLUMN IF NOT EXISTS clients_access TEXT DEFAULT 'NONE',
ADD COLUMN IF NOT EXISTS client_modules_access JSONB DEFAULT '["overview","quotations","events","moodboard","tasks","post_production","finance"]'::jsonb;

-- 3. Create client_audit_logs table for date-wise client history
CREATE TABLE IF NOT EXISTS public.client_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    actor_id TEXT,
    actor_name TEXT,
    actor_email TEXT,
    actor_role TEXT,
    module TEXT NOT NULL,
    action_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_audit_logs_client ON public.client_audit_logs (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_audit_logs_workspace ON public.client_audit_logs (workspace_id);

ALTER TABLE public.client_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'client_audit_logs'
      AND policyname = 'Allow all authenticated users access to client_audit_logs'
  ) THEN
    CREATE POLICY "Allow all authenticated users access to client_audit_logs"
      ON public.client_audit_logs FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
`;

async function applyMigration() {
  console.log(`Applying client permissions and audit logs migration to Supabase project: ${projectRef}...`);
  try {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ query: MIGRATION_SQL }),
      }
    );

    const body = await res.text();
    console.log(`Response status: ${res.status}`);
    console.log(`Response body: ${body.slice(0, 500)}`);

    if (res.ok) {
      console.log('Migration applied successfully!');
    } else {
      console.error('Migration failed.');
    }
  } catch (err) {
    console.error('Error applying migration:', err);
  }
}

applyMigration();
