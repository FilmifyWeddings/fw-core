const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = 'C:/Users/Sahil Dhonde/.gemini/antigravity/scratch/fw-core/.env.local';
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
const sql = fs.readFileSync('C:/Users/Sahil Dhonde/.gemini/antigravity/scratch/fw-core/supabase/migrations/20260613000002_whatsapp_automations.sql', 'utf-8');

async function main() {
  console.log('Attempting to run automations migration SQL via RPC...');
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
