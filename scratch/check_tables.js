const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
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

async function check() {
  console.log('--- Checking app_versions table ---');
  const { data: v, error: ve } = await supabase.from('app_versions').select('*');
  console.log('Versions:', v, 'Error:', ve?.message);

  console.log('--- Checking user_telemetry_metrics table ---');
  const { data: t, error: te } = await supabase.from('user_telemetry_metrics').select('*');
  console.log('Telemetry:', t, 'Error:', te?.message);
}

check();
