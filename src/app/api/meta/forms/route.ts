import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get('page_id') || '110156851793416';
    const workspaceId = '00000000-0000-0000-0000-000000000000';

    let userAccessToken: string | null = searchParams.get('access_token');
    let pageAccessToken: string | null = null;

    // Step 1: Retrieve stored token from fb_page_configs or integration_credentials
    try {
      const { data: pageCfg } = await supabaseAdmin
        .from('fb_page_configs')
        .select('page_access_token')
        .eq('page_id', pageId)
        .limit(1)
        .single();

      if (pageCfg?.page_access_token) {
        pageAccessToken = pageCfg.page_access_token;
      }
    } catch (err: any) {}

    try {
      const { data: cred } = await supabaseAdmin
        .from('integration_credentials')
        .select('access_token')
        .eq('provider', 'meta')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (cred?.access_token) {
        userAccessToken = cred.access_token;
      }
    } catch (err: any) {}

    const tokenToUse = userAccessToken || pageAccessToken;
    const formsMap = new Map<string, any>();

    if (tokenToUse) {
      // Step 2A: Query /me/accounts to get FRESH Page Access Token for pageId
      try {
        console.log('[Meta Forms API] Querying /me/accounts for fresh Page Access Token...');
        const meAccountsRes = await fetch(
          `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&limit=100&access_token=${tokenToUse}`
        );
        if (meAccountsRes.ok) {
          const meAccountsData = await meAccountsRes.json();
          if (meAccountsData.data && Array.isArray(meAccountsData.data)) {
            const matchedAcc = meAccountsData.data.find((a: any) => a.id === pageId);
            if (matchedAcc?.access_token) {
              pageAccessToken = matchedAcc.access_token;
              console.log(`[Meta Forms API] Found page ${pageId} in /me/accounts! Page Access Token obtained.`);
            }
          }
        }
      } catch (err: any) {
        console.warn('[Meta Forms API] /me/accounts lookup warning:', err.message);
      }

      // Step 2B: Direct Page Token Exchange fallback if pageAccessToken still null
      if (!pageAccessToken) {
        try {
          const pageRes = await fetch(
            `https://graph.facebook.com/v19.0/${pageId}?fields=id,name,access_token&access_token=${tokenToUse}`
          );
          if (pageRes.ok) {
            const pageData = await pageRes.json();
            if (pageData.access_token) pageAccessToken = pageData.access_token;
          }
        } catch (err: any) {}
      }

      const activeToken = pageAccessToken || tokenToUse;

      // Step 3: Query Page Leadgen Forms with activeToken (limit=100)
      try {
        console.log(`[Meta Forms API] Querying /${pageId}/leadgen_forms with limit=100...`);
        const pageFormsRes = await fetch(
          `https://graph.facebook.com/v19.0/${pageId}/leadgen_forms?fields=id,name,status,created_time,leads_count&limit=100&access_token=${activeToken}`
        );
        if (pageFormsRes.ok) {
          const pageFormsData = await pageFormsRes.json();
          if (pageFormsData.data && Array.isArray(pageFormsData.data)) {
            console.log(`[Meta Forms API] Page leadgen_forms returned ${pageFormsData.data.length} items!`);
            pageFormsData.data.forEach((f: any) => {
              formsMap.set(f.id, {
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
        }
      } catch (err: any) {
        console.warn('[Meta Forms API] Page forms query exception:', err.message);
      }

      // Step 4: Query Ad Accounts Leadgen Forms (/me/adaccounts)
      try {
        console.log('[Meta Forms API] Querying /me/adaccounts for Ads Manager forms...');
        const adAccRes = await fetch(
          `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_id&access_token=${tokenToUse}`
        );
        if (adAccRes.ok) {
          const adAccData = await adAccRes.json();
          if (adAccData.data && Array.isArray(adAccData.data)) {
            for (const adAcc of adAccData.data) {
              try {
                const adFormsRes = await fetch(
                  `https://graph.facebook.com/v19.0/${adAcc.id}/leadgen_forms?fields=id,name,status,created_time,leads_count,page_id&limit=100&access_token=${tokenToUse}`
                );
                if (adFormsRes.ok) {
                  const adFormsData = await adFormsRes.json();
                  if (adFormsData.data && Array.isArray(adFormsData.data)) {
                    adFormsData.data.forEach((f: any) => {
                      if (!formsMap.has(f.id)) {
                        formsMap.set(f.id, {
                          workspace_id: workspaceId,
                          page_id: f.page_id || pageId,
                          form_id: f.id,
                          form_name: f.name || 'Meta Lead Form',
                          status: (f.status || 'ACTIVE').toUpperCase(),
                          leads_count: f.leads_count || 0,
                          created_time: f.created_time || new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                        });
                      }
                    });
                  }
                }
              } catch (err: any) {}
            }
          }
        }
      } catch (err: any) {}
    }

    const fetchedForms = Array.from(formsMap.values());

    // Step 5: Upsert into Supabase fb_lead_forms
    if (fetchedForms.length > 0) {
      try {
        await supabaseAdmin
          .from('fb_lead_forms')
          .upsert(fetchedForms, { onConflict: 'form_id' });
      } catch (dbErr: any) {
        console.warn('[Meta Forms API] fb_lead_forms upsert warning:', dbErr.message);
      }
    }

    // Step 6: Read all forms from Supabase fb_lead_forms
    let finalForms: any[] = [];
    try {
      const { data: dbForms } = await supabaseAdmin
        .from('fb_lead_forms')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbForms && dbForms.length > 0) {
        finalForms = dbForms.map(f => ({
          form_id: f.form_id,
          name: f.form_name,
          status: (f.status || 'ACTIVE').toUpperCase(),
          page_id: f.page_id || pageId,
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
        page_id: f.page_id || pageId,
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
