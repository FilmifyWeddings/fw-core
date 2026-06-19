const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = './.env.local';
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
  console.log('Checking whatsapp_contact_groups table...');
  const { data: gData, error: gError } = await supabase.from('whatsapp_contact_groups').select('id').limit(1);
  if (gError) {
    console.error('whatsapp_contact_groups check failed:', gError.message);
  } else {
    console.log('whatsapp_contact_groups check passed. Data:', gData);
  }

  console.log('Checking whatsapp_custom_workflows table...');
  const { data: wData, error: wError } = await supabase.from('whatsapp_custom_workflows').select('id').limit(1);
  if (wError) {
    console.error('whatsapp_custom_workflows check failed:', wError.message);
  } else {
    console.log('whatsapp_custom_workflows check passed. Data:', wData);
  }
}

check();
