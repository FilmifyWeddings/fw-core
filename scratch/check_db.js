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

async function check() {
  try {
    console.log('--- Checking leads columns ---');
    const { data: leads, error: leadsErr } = await supabase.from('leads').select('*').limit(1);
    if (leadsErr) {
      console.error('Leads select error:', leadsErr.message);
    } else {
      console.log('Columns in leads:', leads.length > 0 ? Object.keys(leads[0]) : 'No data, columns: unknown');
      console.log('Sample Lead:', leads[0]);
    }

    console.log('\n--- Checking whatsapp_contact_groups ---');
    const { data: groups, error: groupsErr } = await supabase.from('whatsapp_contact_groups').select('*').limit(1);
    if (groupsErr) {
      console.error('Groups select error:', groupsErr.message);
    } else {
      console.log('Columns in whatsapp_contact_groups:', groups.length > 0 ? Object.keys(groups[0]) : 'No data');
      console.log('Sample Group:', groups[0]);
    }

    console.log('\n--- Checking whatsapp_custom_workflows ---');
    const { data: workflows, error: wfsErr } = await supabase.from('whatsapp_custom_workflows').select('*').limit(1);
    if (wfsErr) {
      console.error('Workflows select error:', wfsErr.message);
    } else {
      console.log('Columns in whatsapp_custom_workflows:', workflows.length > 0 ? Object.keys(workflows[0]) : 'No data');
      console.log('Sample Workflow:', workflows[0]);
    }

    console.log('\n--- Checking whatsapp_workflow_logs ---');
    const { data: logs, error: logsErr } = await supabase.from('whatsapp_workflow_logs').select('*').limit(1);
    if (logsErr) {
      console.error('Logs select error:', logsErr.message);
    } else {
      console.log('Columns in whatsapp_workflow_logs:', logs.length > 0 ? Object.keys(logs[0]) : 'No data');
    }

  } catch (err) {
    console.error('Execution error:', err);
  }
}

check();
