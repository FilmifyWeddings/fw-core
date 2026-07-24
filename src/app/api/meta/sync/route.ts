import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const metaParam = searchParams.get('meta');
    const isUrlConnected = metaParam === 'connected' || searchParams.has('pages');

    let accessToken: string | null = searchParams.get('access_token');
    const workspaceId = '00000000-0000-0000-0000-000000000000';

    // Step 1: Get User Long-Lived Access Token from DB if not provided
    if (!accessToken) {
      const { data: credData } = await supabaseAdmin
        .from('integration_credentials')
        .select('access_token')
        .eq('provider', 'meta')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (credData?.access_token) {
        accessToken = credData.access_token;
      } else {
        const { data: profileData } = await supabaseAdmin
          .from('profiles')
          .select('meta_access_token')
          .not('meta_access_token', 'is', null)
          .limit(1)
          .single();

        if (profileData?.meta_access_token) {
          accessToken = profileData.meta_access_token;
        }
      }
    }

    let pages: Array<{
      page_id: string;
      page_name: string;
      page_category: string;
      is_active: boolean;
      page_access_token: string;
    }> = [];

    const leadFormsMap = new Map<string, {
      form_id: string;
      name: string;
      status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
      page_id: string;
      page_name: string;
      ad_account_name: string;
      is_active: boolean;
      sync_count: number;
      last_lead_time?: string;
      questions_count: number;
    }>();

    let metaApiDebug: any = { adAccounts: null, pageAccounts: null };
    let fetchSource = 'none';

    if (accessToken) {
      // Step 2A: Fetch Facebook Pages (/me/accounts)
      try {
        const pagesRes = await fetch(
          `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,access_token,tasks&access_token=${accessToken}`
        );

        const pagesData = await pagesRes.json().catch(() => ({}));
        metaApiDebug.pageAccounts = pagesData;

        if (pagesRes.ok && pagesData.data && Array.isArray(pagesData.data)) {
          fetchSource = 'graph_api_me_accounts';
          const upsertPages: any[] = [];

          for (const item of pagesData.data) {
            const pageToken = item.access_token || accessToken;
            const pageObj = {
              page_id: item.id,
              page_name: item.name,
              page_category: item.category || 'Facebook Business Page',
              is_active: true,
              page_access_token: pageToken,
            };

            pages.push(pageObj);

            upsertPages.push({
              workspace_id: workspaceId,
              page_id: item.id,
              page_name: item.name,
              page_category: item.category,
              page_access_token: pageToken,
              is_active: true,
              updated_at: new Date().toISOString(),
            });

            // Fetch Forms directly from Facebook Page Access Token
            if (pageToken) {
              try {
                const formsRes = await fetch(
                  `https://graph.facebook.com/v19.0/${item.id}/leadgen_forms?fields=id,name,status,created_time,leads_count,questions&access_token=${pageToken}`
                );
                if (formsRes.ok) {
                  const formsData = await formsRes.json();
                  if (formsData.data && Array.isArray(formsData.data)) {
                    formsData.data.forEach((f: any) => {
                      leadFormsMap.set(f.id, {
                        form_id: f.id,
                        name: f.name,
                        status: (f.status || 'ACTIVE').toUpperCase() as any,
                        page_id: item.id,
                        page_name: item.name,
                        ad_account_name: item.name + ' Ad Account',
                        is_active: true,
                        sync_count: f.leads_count || 0,
                        last_lead_time: f.created_time || 'Active',
                        questions_count: f.questions?.length || 5,
                      });
                    });
                  }
                }
              } catch (fErr: any) {
                console.warn(`[Meta Sync API] Page forms fetch error for page ${item.id}:`, fErr.message);
              }
            }
          }

          if (upsertPages.length > 0) {
            await supabaseAdmin
              .from('fb_page_configs')
              .upsert(upsertPages, { onConflict: 'workspace_id,page_id' });
          }
        }
      } catch (graphErr: any) {
        console.error('[Meta Sync API] Pages Graph API Exception:', graphErr.message);
      }

      // Step 2B: Fetch Meta Ad Accounts (/me/adaccounts) to retrieve forms attached to Meta Ads Manager
      try {
        const adAccRes = await fetch(
          `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_id,account_status&access_token=${accessToken}`
        );
        const adAccData = await adAccRes.json().catch(() => ({}));
        metaApiDebug.adAccounts = adAccData;

        if (adAccRes.ok && adAccData.data && Array.isArray(adAccData.data)) {
          for (const adAcc of adAccData.data) {
            try {
              const adFormsRes = await fetch(
                `https://graph.facebook.com/v19.0/${adAcc.id}/leadgen_forms?fields=id,name,status,created_time,leads_count,page_id,questions&access_token=${accessToken}`
              );
              if (adFormsRes.ok) {
                const adFormsData = await adFormsRes.json();
                if (adFormsData.data && Array.isArray(adFormsData.data)) {
                  adFormsData.data.forEach((f: any) => {
                    if (!leadFormsMap.has(f.id)) {
                      const matchedPage = pages.find(p => p.page_id === f.page_id);
                      leadFormsMap.set(f.id, {
                        form_id: f.id,
                        name: f.name,
                        status: (f.status || 'ACTIVE').toUpperCase() as any,
                        page_id: f.page_id || pages[0]?.page_id || 'managed',
                        page_name: matchedPage?.page_name || 'Facebook Ads Campaign',
                        ad_account_name: adAcc.name || ('Ad Account ' + adAcc.account_id),
                        is_active: true,
                        sync_count: f.leads_count || 0,
                        last_lead_time: f.created_time || 'Active',
                        questions_count: f.questions?.length || 5,
                      });
                    }
                  });
                }
              }
            } catch (adFormErr: any) {
              console.warn(`[Meta Sync API] Ad Account forms fetch error for ${adAcc.id}:`, adFormErr.message);
            }
          }
        }
      } catch (adAccErr: any) {
        console.warn('[Meta Sync API] Ad Accounts Graph API Exception:', adAccErr.message);
      }
    }

    // Step 3 Fallback: Query Supabase fb_page_configs if pages array is empty
    if (pages.length === 0) {
      try {
        const { data: dbPages } = await supabaseAdmin
          .from('fb_page_configs')
          .select('*')
          .eq('is_active', true);

        if (dbPages && dbPages.length > 0) {
          fetchSource = 'supabase_fb_page_configs';
          for (const p of dbPages) {
            pages.push({
              page_id: p.page_id,
              page_name: p.page_name,
              page_category: p.page_category || 'Facebook Business Page',
              is_active: p.is_active ?? true,
              page_access_token: p.page_access_token || '',
            });

            if (p.page_access_token) {
              try {
                const formsRes = await fetch(
                  `https://graph.facebook.com/v19.0/${p.page_id}/leadgen_forms?fields=id,name,status,created_time,leads_count,questions&access_token=${p.page_access_token}`
                );
                if (formsRes.ok) {
                  const formsData = await formsRes.json();
                  if (formsData.data && Array.isArray(formsData.data)) {
                    formsData.data.forEach((f: any) => {
                      leadFormsMap.set(f.id, {
                        form_id: f.id,
                        name: f.name,
                        status: (f.status || 'ACTIVE').toUpperCase() as any,
                        page_id: p.page_id,
                        page_name: p.page_name,
                        ad_account_name: p.page_name + ' Ad Account',
                        is_active: true,
                        sync_count: f.leads_count || 0,
                        last_lead_time: f.created_time || 'Active',
                        questions_count: 5,
                      });
                    });
                  }
                }
              } catch (fErr: any) {
                console.warn(`[Meta Sync API] DB page forms fetch error for ${p.page_id}:`, fErr.message);
              }
            }
          }
        }
      } catch (err: any) {
        console.warn('[Meta Sync API] Fallback DB query error:', err.message);
      }
    }

    const leadForms = Array.from(leadFormsMap.values());
    const isConnected = pages.length > 0 || !!accessToken || isUrlConnected;
    const totalLeadsSynced = leadForms.reduce((acc, f) => acc + f.sync_count, 0);

    return NextResponse.json({
      success: true,
      isConnected,
      accountName: pages[0]?.page_name || (isConnected ? 'Meta Business Account' : null),
      adAccountId: pages[0] ? ('act_' + pages[0].page_id) : null,
      pages,
      leadForms,
      totalLeadsSynced,
      meta_api_debug: {
        fetchSource,
        tokenFound: !!accessToken,
        pagesCount: pages.length,
        formsCount: leadForms.length,
        rawMetaResponse: metaApiDebug,
      },
    });
  } catch (error: any) {
    console.error('[Meta Sync API Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync Meta integration data' },
      { status: 500 }
    );
  }
}

// POST: Handle Disconnect
export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json().catch(() => ({ action: 'disconnect' }));

    if (action === 'disconnect') {
      await supabaseAdmin
        .from('fb_page_configs')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .neq('page_id', '0');

      await supabaseAdmin
        .from('integration_credentials')
        .update({ status: 'disconnected', updated_at: new Date().toISOString() })
        .eq('provider', 'meta');

      return NextResponse.json({ success: true, isConnected: false });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
