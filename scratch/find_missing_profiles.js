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
  console.log('--- Finding missing profiles ---');
  
  // 1. Fetch auth users
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error('Error fetching auth users:', authErr.message);
    return;
  }
  const authUsers = authData.users;
  console.log(`Total users in auth.users: ${authUsers.length}`);
  
  // 2. Fetch profiles
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('id, workspace_name');
  if (profErr) {
    console.error('Error fetching profiles:', profErr.message);
    return;
  }
  console.log(`Total rows in public.profiles: ${profiles.length}`);
  
  const profileIds = new Set(profiles.map(p => p.id));
  
  // 3. Find mismatch
  const missing = [];
  authUsers.forEach(user => {
    if (!profileIds.has(user.id)) {
      missing.push({
        id: user.id,
        email: user.email,
        created_at: user.created_at
      });
    }
  });
  
  if (missing.length > 0) {
    console.log('Missing profiles for auth.users:', missing);
  } else {
    console.log('All auth users have matching rows in public.profiles.');
  }
}

main();
