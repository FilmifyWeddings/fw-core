import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local manually
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  });
} catch (e) {
  console.log('Error reading .env.local:', e.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  console.log('--- Inspecting auth.users and profiles ---');
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  if (pErr) console.error('Profiles err:', pErr.message);
  else console.log('Profiles in DB:', profiles);

  console.log('--- Inspecting whatsapp_contact_groups ---');
  const { data: groups, error: gErr } = await supabase.from('whatsapp_contact_groups').select('*');
  if (gErr) console.error('Groups err:', gErr.message);
  else console.log('Groups in DB:', groups);

  console.log('--- Inspecting whatsapp_custom_workflows ---');
  const { data: workflows, error: wErr } = await supabase.from('whatsapp_custom_workflows').select('*');
  if (wErr) console.error('Workflows err:', wErr.message);
  else console.log('Workflows in DB:', workflows);
}

check();
