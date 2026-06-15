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
  console.error('Missing env variables', { supabaseUrl: !!supabaseUrl, serviceKey: !!supabaseServiceKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  console.log('--- Checking DB tables and logs ---');
  
  // 1. Check whatsapp_automations
  try {
    const { data, error } = await supabase
      .from('whatsapp_automations')
      .select('*');
    
    if (error) {
      console.error('Error fetching whatsapp_automations:', error.message);
    } else {
      console.log('whatsapp_automations contents:', JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error('whatsapp_automations query threw:', e.message);
  }

  // 2. Check whatsapp_automation_logs
  try {
    const { data, error } = await supabase
      .from('whatsapp_automation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Error fetching whatsapp_automation_logs:', error.message);
    } else {
      console.log('whatsapp_automation_logs latest logs:', JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error('whatsapp_automation_logs query threw:', e.message);
  }

  // 3. Check leads
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('Error fetching leads:', error.message);
    } else {
      console.log('leads latest contents:', JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error('leads query threw:', e.message);
  }
}

check();
