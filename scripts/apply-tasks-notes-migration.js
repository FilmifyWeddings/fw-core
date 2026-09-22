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
const migrationFilePath = path.join(__dirname, '../supabase/migrations/20260924_tasks_and_notes_complete_system.sql');
const MIGRATION_SQL = fs.readFileSync(migrationFilePath, 'utf8');

async function applyMigration() {
  console.log(`Applying Tasks & Notes migration to Supabase project: ${projectRef}...`);
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
      console.log('Tasks & Notes migration applied successfully!');
    } else {
      console.error('Migration failed via Management API. Proceeding with service role fallback.');
    }
  } catch (err) {
    console.error('Error applying migration:', err);
  }
}

applyMigration();
