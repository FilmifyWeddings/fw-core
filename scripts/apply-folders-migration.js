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
CREATE TABLE IF NOT EXISTS public.quotation_folders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid DEFAULT auth.uid(),
    name text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.quotation_folders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quotation_folders'
      AND policyname = 'Users can manage their own folders'
  ) THEN
    CREATE POLICY "Users can manage their own folders"
      ON public.quotation_folders FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.quotation_folders(id) ON DELETE SET NULL;
`;

async function applyMigration() {
  console.log(`Applying folders migration to Supabase project: ${projectRef}...`);
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
