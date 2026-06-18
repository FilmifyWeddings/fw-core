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

async function main() {
  console.log('--- Fixing missing profile row ---');
  
  const userId = 'f0635313-586c-406c-bda7-03c81a1343d3';
  const email = 'filmifyweddings@gmail.com';
  const workspaceName = 'Filmify Weddings Studio';
  
  const { data, error } = await supabase.from('profiles').insert({
    id: userId,
    workspace_name: workspaceName,
    whastboost_status: 'disconnected'
  }).select();
  
  if (error) {
    console.error('Failed to create profile row:', error.message);
  } else {
    console.log('Successfully created profile row:', data);
  }
}

main();
