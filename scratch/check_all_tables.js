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

const TABLES = [
  'profiles',
  'leads',
  'field_mappings',
  'sequences',
  'sequence_steps',
  'queue_messages',
  'live_logs',
  'templates',
  'table_layouts',
  'whatsapp_automations',
  'whatsapp_automation_logs',
  'baileys_sessions',
  'baileys_chats',
  'baileys_contacts',
  'baileys_messages',
  'app_features',
  'integration_credentials',
  'app_versions',
  'user_telemetry_metrics',
  'crm_stages',
  'client_quotations',
  'team_tasks',
  'tenant_storage_tiers',
  'workspace_members',
  'services',
  'packages',
  'expenses',
  'client_comments',
  'tenant_whatsapp_templates',
  'whatsapp_workflow_sequences',
  'whatsapp_contact_groups',
  'whatsapp_custom_workflows'
];

async function checkAll() {
  const existing = [];
  const missing = [];

  for (const table of TABLES) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error && error.message.includes('schema cache')) {
      missing.push(table);
    } else {
      existing.push(table);
    }
  }

  console.log('--- EXISTING TABLES ---');
  console.log(existing);
  console.log('--- MISSING TABLES ---');
  console.log(missing);
}

checkAll();
