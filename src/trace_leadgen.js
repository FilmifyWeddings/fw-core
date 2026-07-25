const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
let envVars = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      envVars[key] = val;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function traceLeadgen() {
  const targetLeadgenId = '2876512756030547';
  const targetPageId = '110156851793416';
  const targetFormId = '2061895324719028';

  console.log(`=== TRACING LEADGEN ID: ${targetLeadgenId} ===`);

  // 1. Check `leads` table for this leadgen_id
  const { data: leads, error: leadErr } = await supabaseAdmin
    .from('leads')
    .select('*');

  console.log('\n--- 1. LEADS TABLE AUDIT ---');
  console.log('Total Leads Count in DB:', leads?.length || 0);

  const matchedLead = (leads || []).find(l => {
    if (l.id === targetLeadgenId || l.phone?.includes(targetLeadgenId)) return true;
    if (l.raw_payload) {
      const rawStr = JSON.stringify(l.raw_payload);
      if (rawStr.includes(targetLeadgenId)) return true;
    }
    return false;
  });

  if (matchedLead) {
    console.log('✅ MATCHED LEAD IN LEADS TABLE:');
    console.log(JSON.stringify(matchedLead, null, 2));
  } else {
    console.log(`❌ NO ROW IN 'leads' TABLE FOR leadgen_id: ${targetLeadgenId}`);
    if (leads && leads.length > 0) {
      console.log('Sample existing lead sources:', leads.map(l => ({ id: l.id, name: l.name, source: l.source, created_at: l.created_at })));
    }
  }

  // 2. Check `fb_page_configs` for Page Access Token
  console.log('\n--- 2. PAGE ACCESS TOKEN CHECK ---');
  const { data: pageConfig } = await supabaseAdmin
    .from('fb_page_configs')
    .select('*')
    .eq('page_id', targetPageId)
    .maybeSingle();

  console.log('fb_page_configs for page 110156851793416:', pageConfig ? {
    page_name: pageConfig.page_name,
    page_id: pageConfig.page_id,
    token_preview: pageConfig.page_access_token ? `${pageConfig.page_access_token.slice(0, 15)}...` : 'MISSING',
    is_active: pageConfig.is_active,
  } : 'NOT FOUND');

  // 3. Test Meta Graph API call with Page Access Token
  if (pageConfig?.page_access_token && !pageConfig.page_access_token.startsWith('test_')) {
    console.log('\n--- 3. LIVE META GRAPH API QUERY FOR LEADGEN ID ---');
    const graphUrl = `https://graph.facebook.com/v20.0/${targetLeadgenId}?fields=id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id&access_token=${pageConfig.page_access_token}`;
    console.log('Querying Graph API URL:', graphUrl.replace(pageConfig.page_access_token, 'PAGE_TOKEN_REDACTED'));

    try {
      const gRes = await fetch(graphUrl);
      const gData = await gRes.json();
      console.log('Graph API HTTP Status:', gRes.status);
      console.log('Graph API JSON Response:', JSON.stringify(gData, null, 2));
    } catch (err) {
      console.error('Graph API Exception:', err);
    }
  }

  // 4. Check `live_logs` audit trail
  console.log('\n--- 4. LIVE_LOGS AUDIT TRAIL ---');
  const { data: logs } = await supabaseAdmin
    .from('live_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (logs && logs.length > 0) {
    logs.forEach(l => {
      console.log(`[${l.created_at}] [${l.event_type}] ${l.message}`);
    });
  } else {
    console.log('No live_logs entries found.');
  }

  // 5. Check `fb_form_mappings`
  console.log('\n--- 5. FB_FORM_MAPPINGS AUDIT ---');
  const { data: formMapping } = await supabaseAdmin
    .from('fb_form_mappings')
    .select('*')
    .eq('form_id', targetFormId);

  console.log('fb_form_mappings for form 2061895324719028:', formMapping);
}

traceLeadgen();
