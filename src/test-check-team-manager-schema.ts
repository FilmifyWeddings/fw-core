import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    process.env[match[1]] = value.trim();
  }
});

async function checkTeamManagerSchema() {
  console.log('=== CHECKING TEAM MANAGER SUPABASE SCHEMA & COLUMNS ===\n');

  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!, {
    auth: { persistSession: false }
  });

  const tables = ['fw_team_members', 'fw_projects', 'fw_sub_events', 'fw_assignments'];

  for (const t of tables) {
    console.log(`--- Table: ${t} ---`);
    const { data, error } = await supabaseAdmin.from(t).select('*').limit(1);
    if (error) {
      console.error(`Error querying ${t}:`, error.message);
    } else if (data && data.length > 0) {
      console.log(`Columns in ${t}:`, Object.keys(data[0]));
    } else {
      // Try RPC or empty select
      console.log(`Table ${t} exists but is currently empty or returned 0 rows.`);
    }
  }
}

checkTeamManagerSchema().catch(console.error);
