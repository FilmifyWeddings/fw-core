import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  if (line && line.includes('=')) {
    const parts = line.split('=');
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    env[key] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Connecting to:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  try {
    const { data, error } = await supabase
      .from('crm_stages')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Query error:', error);
    } else {
      console.log('Success! Table exists. Data:', data);
    }
  } catch (err) {
    console.error('Fatal:', err);
  }
}

test();
