import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get('page_id') || '110156851793416';
    const workspaceId = '00000000-0000-0000-0000-000000000000';

    let pageAccessToken: string | null = null;
    let userAccessToken: string | null = null;

    // Step 1: Lookup stored Page Access Token from fb_page_configs
    try {
      const { data: pageConfig } = await supabaseAdmin
        .from('fb_page_configs')
        .select('page_access_token')
        .eq('page_id', pageId)
        .limit(1)
        .single();

      if (pageConfig?.page_access_token) {
        pageAccessToken = pageConfig.page_access_token;
      }
    } catch (err: any) {
      console.warn('[Meta Forms API] Page token lookup warning:', err.message);
    }

    // Step 2: Fallback User Token from integration_credentials
    try {
      const { data: credData } = await supabaseAdmin
        .from('integration_credentials')
        .select('access_token')
        .eq('provider', 'meta')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (credData?.access_token) {
        userAccessToken = credData.access_token;
      }
    } catch (err: any) {}

    const tokenToUse = pageAccessToken || userAccessToken;
    const fetchedForms: any[] = [];

    // Step 3: Direct Loop Query to Meta Graph API with limit=100
    if (tokenToUse) {
      try {
        console.log(`[Meta Forms API] Fetching leadgen_forms with limit=100 for page ${pageId}...`);
        const formsRes = await fetch(
          `https://graph.facebook.com/v19.0/${pageId}/leadgen_forms?fields=id,name,status,created_time,leads_count&limit=100&access_token=${tokenToUse}`
        );

        if (formsRes.ok) {
          const formsData = await formsRes.json();
          if (formsData.data && Array.isArray(formsData.data)) {
            console.log(`[Meta Forms API] Successfully fetched ${formsData.data.length} real lead forms from Graph API!`);
            formsData.data.forEach((f: any) => {
              fetchedForms.push({
                workspace_id: workspaceId,
                page_id: pageId,
                form_id: f.id,
                form_name: f.name || 'Meta Lead Form',
                status: (f.status || 'ACTIVE').toUpperCase(),
                leads_count: f.leads_count || 0,
                created_time: f.created_time || new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
            });
          }
        } else {
          const errBody = await formsRes.json().catch(() => ({}));
          console.warn('[Meta Forms API] Graph API error response:', errBody);
        }
      } catch (graphErr: any) {
        console.error('[Meta Forms API] Graph API Exception:', graphErr.message);
      }
    }

    // Step 4: Upsert ALL returned forms directly into Supabase fb_lead_forms table
    if (fetchedForms.length > 0) {
      try {
        console.log(`[Meta Forms API] Upserting ${fetchedForms.length} real forms into Supabase fb_lead_forms...`);
        const { error: upsertErr } = await supabaseAdmin
          .from('fb_lead_forms')
          .upsert(fetchedForms, { onConflict: 'form_id' });

        if (upsertErr) {
          console.warn('[Meta Forms API] Supabase fb_lead_forms upsert warning:', upsertErr.message);
        }
      } catch (dbErr: any) {
        console.warn('[Meta Forms API] Database upsert exception:', dbErr.message);
      }
    }

    // Step 5: Read directly from fb_lead_forms table in Supabase
    let finalForms: any[] = [];
    try {
      const { data: dbForms } = await supabaseAdmin
        .from('fb_lead_forms')
        .select('*')
        .eq('page_id', pageId)
        .order('created_at', { ascending: false });

      if (dbForms && dbForms.length > 0) {
        finalForms = dbForms.map(f => ({
          form_id: f.form_id,
          name: f.form_name,
          status: (f.status || 'ACTIVE').toUpperCase(),
          page_id: f.page_id,
          page_name: 'Filmify Weddings',
          ad_account_name: 'Filmify Weddings Ad Account',
          is_active: true,
          sync_count: f.leads_count || 0,
          last_lead_time: f.created_time || 'Active',
          questions_count: 5,
        }));
      }
    } catch (readErr: any) {
      console.warn('[Meta Forms API] Read from fb_lead_forms warning:', readErr.message);
    }

    // Fallback to in-memory fetchedForms if DB query returned 0 items
    if (finalForms.length === 0 && fetchedForms.length > 0) {
      finalForms = fetchedForms.map(f => ({
        form_id: f.form_id,
        name: f.form_name,
        status: f.status,
        page_id: f.page_id,
        page_name: 'Filmify Weddings',
        ad_account_name: 'Filmify Weddings Ad Account',
        is_active: true,
        sync_count: f.leads_count || 0,
        last_lead_time: f.created_time || 'Active',
        questions_count: 5,
      }));
    }

    return NextResponse.json({
      success: true,
      page_id: pageId,
      forms: finalForms,
      total_forms: finalForms.length,
    });
  } catch (error: any) {
    console.error('[Meta Forms API Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch Meta lead forms' },
      { status: 500 }
    );
  }
}
