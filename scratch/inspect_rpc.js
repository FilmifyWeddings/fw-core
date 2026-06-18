const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const https = require('https');

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

const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;

const req = https.get(url, {
  headers: {
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const openapi = JSON.parse(body);
      console.log('--- Exposed RPC Paths ---');
      const rpcPaths = Object.keys(openapi.paths).filter(p => p.startsWith('/rpc/'));
      console.log(rpcPaths);
    } catch (err) {
      console.error('Failed to parse response:', err.message);
      console.log('Response body snippet:', body.slice(0, 500));
    }
  });
});

req.on('error', err => {
  console.error('Error fetching OpenAPI:', err.message);
});
