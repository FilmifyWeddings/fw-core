import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get('page_id') || '110156851793416';
    const workspaceId = '00000000-0000-0000-0000-000000000000';

    let initialToken: string | null = searchParams.get('access_token');

    // Step 1: Retrieve stored token from fb_page_configs or integration_credentials
    if (!initialToken) {
      try {
        const { data: pageCfg } = await supabaseAdmin
          .from('fb_page_configs')
          .select('page_access_token')
          .eq('page_id', pageId)
          .limit(1)
          .single();

        if (pageCfg?.page_access_token) {
          initialToken = pageCfg.page_access_token;
        }
      } catch (err: any) {}
    }

    if (!initialToken) {
      try {
        const { data: cred } = await supabaseAdmin
          .from('integration_credentials')
          .select('access_token')
          .eq('provider', 'meta')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (cred?.access_token) initialToken = cred.access_token;
      } catch (err: any) {}
    }

    let freshPageToken: string | null = null;
    let pageInfo: any = null;

    // Step 2: FORCE PAGE TOKEN EXCHANGE
    // GET /110156851793416?fields=id,name,access_token,category
    if (initialToken) {
      try {
        const pageRes = await fetch(
          `https://graph.facebook.com/v19.0/${pageId}?fields=id,name,access_token,category&access_token=${initialToken}`
        );
        if (pageRes.ok) {
          pageInfo = await pageRes.json();
          if (pageInfo.access_token) {
            freshPageToken = pageInfo.access_token;
            console.log(`[Meta Forms API] Successfully exchanged token for FRESH Page Access Token for ${pageId}!`);

            try {
              await supabaseAdmin.from('fb_page_configs').upsert({
                workspace_id: workspaceId,
                page_id: pageId,
                page_name: pageInfo.name || 'Filmify Weddings',
                page_category: pageInfo.category || 'Wedding Service',
                page_access_token: freshPageToken,
                is_active: true,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'workspace_id,page_id' });
            } catch (dbErr: any) {}
          }
        }
      } catch (err: any) {
        console.warn('[Meta Forms API] Page token exchange warning:', err.message);
      }
    }

    const tokenToUse = freshPageToken || initialToken;
    let rawMetaFormsRes: any = null;
    const fetchedForms: any[] = [];

    // Step 3: FETCH FORMS WITH FRESH PAGE ACCESS TOKEN (limit=100)
    if (tokenToUse) {
      try {
        console.log(`[Meta Forms API] Fetching leadgen_forms for page ${pageId} with limit=100...`);
        const formsRes = await fetch(
          `https://graph.facebook.com/v19.0/${pageId}/leadgen_forms?fields=id,name,status,created_time,leads_count&limit=100&access_token=${tokenToUse}`
        );
        rawMetaFormsRes = await formsRes.json().catch(() => ({}));

        if (formsRes.ok && rawMetaFormsRes.data && Array.isArray(rawMetaFormsRes.data)) {
          console.log(`[Meta Forms API] EXACT FORMS RETURNED FROM META GRAPH API: ${rawMetaFormsRes.data.length}`);
          rawMetaFormsRes.data.forEach((f: any) => {
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
        } else {
          console.warn('[Meta Forms API] Graph API leadgen_forms error or empty:', rawMetaFormsRes);
        }
      } catch (graphErr: any) {
        console.error('[Meta Forms API] Graph API Exception:', graphErr.message);
      }
    }

    // Step 4: UPSERT ALL RETURNED FORMS INTO Supabase fb_lead_forms
    if (fetchedForms.length > 0) {
      try {
        console.log(`[Meta Forms API] Upserting ${fetchedForms.length} real forms into Supabase fb_lead_forms...`);
        await supabaseAdmin
          .from('fb_lead_forms')
          .upsert(fetchedForms, { onConflict: 'form_id' });
      } catch (dbUpsertErr: any) {
        console.warn('[Meta Forms API] fb_lead_forms upsert warning:', dbUpsertErr.message);
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
    } catch (readErr: any) {}

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
      meta_graph_api_debug: {
        tokenUsed: tokenToUse ? 'YES' : 'NO',
        freshPageTokenObtained: !!freshPageToken,
        metaFormsCountReturned: rawMetaFormsRes?.data?.length || 0,
        rawMetaFormsRes,
      },
    });
  } catch (error: any) {
    console.error('[Meta Forms API Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch Meta lead forms' },
      { status: 500 }
    );
  }
}
