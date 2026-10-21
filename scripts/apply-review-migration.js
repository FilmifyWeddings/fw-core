const fs = require('fs');
const path = require('path');

// Load environment variables
const envText = (fs.existsSync(path.join(__dirname, '../.env')) ? fs.readFileSync(path.join(__dirname, '../.env'), 'utf8') : '') +
  '\n' +
  (fs.existsSync(path.join(__dirname, '../.env.local')) ? fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8') : '');

const env = {};
envText.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_KEY.');
  process.exit(1);
}

const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

const MIGRATION_SQL = `
-- 1. Ensure review_projects has TEXT workspace_id
ALTER TABLE IF EXISTS public.review_projects ALTER COLUMN workspace_id TYPE TEXT;

-- 2. Ensure review_videos has TEXT workspace_id
ALTER TABLE IF EXISTS public.review_videos ALTER COLUMN workspace_id TYPE TEXT;

-- 3. Ensure review_video_versions has TEXT workspace_id
ALTER TABLE IF EXISTS public.review_video_versions ALTER COLUMN workspace_id TYPE TEXT;

-- 4. Ensure review_comments has TEXT workspace_id
ALTER TABLE IF EXISTS public.review_comments ALTER COLUMN workspace_id TYPE TEXT;

-- 5. Ensure review_shares has TEXT workspace_id
ALTER TABLE IF EXISTS public.review_shares ALTER COLUMN workspace_id TYPE TEXT;

-- 6. Ensure review_approvals has TEXT workspace_id
ALTER TABLE IF EXISTS public.review_approvals ALTER COLUMN workspace_id TYPE TEXT;

-- 7. Ensure review_storage_quotas has TEXT workspace_id
ALTER TABLE IF EXISTS public.review_storage_quotas ALTER COLUMN workspace_id TYPE TEXT;

-- 8. Add is_trial and plan_tier to review_storage_quotas if not exist
ALTER TABLE IF EXISTS public.review_storage_quotas ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT true;
`;

async function run() {
  console.log('Running review schema migration on project:', projectRef);
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: MIGRATION_SQL }),
    });

    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Result:', text.slice(0, 500));
  } catch (err) {
    console.error('Migration error:', err.message);
  }
}

run();
