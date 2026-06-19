const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
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
const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20260619000000_crm_kanban.sql'), 'utf-8');

async function main() {
  console.log('Attempting to run CRM Kanban SQL migration via RPC...');
  // Try 'exec_sql'
  const { data: d1, error: e1 } = await supabase.rpc('exec_sql', { sql });
  if (e1) {
    console.warn('exec_sql failed:', e1.message);
    // Try 'execute_sql'
    const { data: d2, error: e2 } = await supabase.rpc('execute_sql', { query: sql });
    if (e2) {
      console.error('execute_sql failed:', e2.message);
    } else {
      console.log('Success via execute_sql!', d2);
    }
  } else {
    console.log('Success via exec_sql!', d1);
  }
}

main();
