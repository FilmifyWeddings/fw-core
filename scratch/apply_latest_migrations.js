import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local manually
const envPath = '.env.local';
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function runMigrationFile(filename) {
  console.log(`\n--- Running migration: ${filename} ---`);
  const sqlPath = path.join('supabase/migrations', filename);
  if (!fs.existsSync(sqlPath)) {
    console.error(`File does not exist: ${sqlPath}`);
    return;
  }
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.warn(`exec_sql failed for ${filename}:`, error.message);
    const { data: d2, error: e2 } = await supabase.rpc('execute_sql', { query: sql });
    if (e2) {
      console.error(`execute_sql also failed for ${filename}:`, e2.message);
    } else {
      console.log(`Success via execute_sql for ${filename}!`);
    }
  } else {
    console.log(`Success via exec_sql for ${filename}!`);
  }
}

async function main() {
  await runMigrationFile('20260619000006_whatsapp_persistent_storage.sql');
  await runMigrationFile('20260620000001_whatsapp_workflow_groups.sql');
}

main();
