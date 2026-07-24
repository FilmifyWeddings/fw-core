import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const metaParam = searchParams.get('meta');
    const isUrlConnected = metaParam === 'connected' || searchParams.has('pages');

    let accessToken: string | null = searchParams.get('access_token');
    const workspaceId = '00000000-0000-0000-0000-000000000000';

    // Step 1: Fetch User Access Token from Supabase DB
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

    let debugUserId: string | null = null;
    let debugMetaScopes: string[] = [];
    let rawMeAccounts: any = null;
    let rawMeBusinesses: any = null;
    let fetchSource = 'none';

    let pagesMap = new Map<string, {
      page_id: string;
      page_name: string;
      page_category: string;
      is_active: boolean;
      page_access_token: string;
    }>();

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

    if (accessToken) {
      // Step 1.1: Fetch Debug User ID & Token Info
      try {
        const userMeRes = await fetch(
          `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${accessToken}`
        );
        if (userMeRes.ok) {
          const userMeData = await userMeRes.json();
          debugUserId = userMeData.id;
        }
      } catch (err: any) {
        console.warn('[Meta Sync API] /me info fetch warning:', err.message);
      }

      // Step 2A: Fetch Managed Accounts (/me/accounts)
      try {
        const pagesRes = await fetch(
          `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,access_token,tasks&access_token=${accessToken}`
        );
        rawMeAccounts = await pagesRes.json().catch(() => ({}));

        if (pagesRes.ok && rawMeAccounts.data && Array.isArray(rawMeAccounts.data)) {
          if (rawMeAccounts.data.length > 0) {
            fetchSource = 'graph_api_me_accounts';
            rawMeAccounts.data.forEach((item: any) => {
              pagesMap.set(item.id, {
                page_id: item.id,
                page_name: item.name,
                page_category: item.category || 'Facebook Business Page',
                is_active: true,
                page_access_token: item.access_token || accessToken!,
              });
            });
          }
        }
      } catch (err: any) {
        console.warn('[Meta Sync API] /me/accounts Exception:', err.message);
      }

      // Step 2B: Fallback 1 - Query Meta Business Accounts (/me/businesses) if /me/accounts returned 0 pages
      if (pagesMap.size === 0) {
        try {
          const bizRes = await fetch(
            `https://graph.facebook.com/v19.0/me/businesses?fields=id,name,client_pages{id,name,access_token,category}&access_token=${accessToken}`
          );
          rawMeBusinesses = await bizRes.json().catch(() => ({}));

          if (bizRes.ok && rawMeBusinesses.data && Array.isArray(rawMeBusinesses.data)) {
            fetchSource = 'graph_api_me_businesses';
            rawMeBusinesses.data.forEach((biz: any) => {
              if (biz.client_pages?.data && Array.isArray(biz.client_pages.data)) {
                biz.client_pages.data.forEach((cp: any) => {
                  pagesMap.set(cp.id, {
                    page_id: cp.id,
                    page_name: cp.name,
                    page_category: cp.category || 'Facebook Business Page',
                    is_active: true,
                    page_access_token: cp.access_token || accessToken!,
                  });
                });
              }
            });
          }
        } catch (err: any) {
          console.warn('[Meta Sync API] /me/businesses Exception:', err.message);
        }
      }

      // Step 2C: Fallback 2 - Query Direct User ID Accounts (/v19.0/{user_id}/accounts)
      if (pagesMap.size === 0 && debugUserId) {
        try {
          const userAccountsRes = await fetch(
            `https://graph.facebook.com/v19.0/${debugUserId}/accounts?fields=id,name,category,access_token,tasks&access_token=${accessToken}`
          );
          const userAccountsData = await userAccountsRes.json().catch(() => ({}));
          if (userAccountsRes.ok && userAccountsData.data && Array.isArray(userAccountsData.data)) {
            if (userAccountsData.data.length > 0) {
              fetchSource = 'graph_api_user_id_accounts';
              userAccountsData.data.forEach((item: any) => {
                pagesMap.set(item.id, {
                  page_id: item.id,
                  page_name: item.name,
                  page_category: item.category || 'Facebook Business Page',
                  is_active: true,
                  page_access_token: item.access_token || accessToken!,
                });
              });
            }
          }
        } catch (err: any) {
          console.warn('[Meta Sync API] /{user_id}/accounts Exception:', err.message);
        }
      }

      // Step 3: For each Page in pagesMap, Fetch Lead Forms & Upsert to Supabase
      const pagesList = Array.from(pagesMap.values());
      if (pagesList.length > 0) {
        const upsertPages = pagesList.map(p => ({
          workspace_id: workspaceId,
          page_id: p.page_id,
          page_name: p.page_name,
          page_category: p.page_category,
          page_access_token: p.page_access_token,
          is_active: true,
          updated_at: new Date().toISOString(),
        }));

        await supabaseAdmin
          .from('fb_page_configs')
          .upsert(upsertPages, { onConflict: 'workspace_id,page_id' });

        for (const page of pagesList) {
          if (page.page_access_token) {
            try {
              const formsRes = await fetch(
                `https://graph.facebook.com/v19.0/${page.page_id}/leadgen_forms?fields=id,name,status,created_time,leads_count,questions&access_token=${page.page_access_token}`
              );
              if (formsRes.ok) {
                const formsData = await formsRes.json();
                if (formsData.data && Array.isArray(formsData.data)) {
                  formsData.data.forEach((f: any) => {
                    leadFormsMap.set(f.id, {
                      form_id: f.id,
                      name: f.name,
                      status: (f.status || 'ACTIVE').toUpperCase() as any,
                      page_id: page.page_id,
                      page_name: page.page_name,
                      ad_account_name: page.page_name + ' Ad Account',
                      is_active: true,
                      sync_count: f.leads_count || 0,
                      last_lead_time: f.created_time || 'Active',
                      questions_count: f.questions?.length || 5,
                    });
                  });
                }
              }
            } catch (fErr: any) {
              console.warn(`[Meta Sync API] Page forms error for ${page.page_id}:`, fErr.message);
            }
          }
        }
      }

      // Step 4: Fetch Meta Ad Accounts (/me/adaccounts) forms
      try {
        const adAccRes = await fetch(
          `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_id&access_token=${accessToken}`
        );
        const adAccData = await adAccRes.json().catch(() => ({}));
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
                      const matchedPage = pagesList.find(p => p.page_id === f.page_id);
                      leadFormsMap.set(f.id, {
                        form_id: f.id,
                        name: f.name,
                        status: (f.status || 'ACTIVE').toUpperCase() as any,
                        page_id: f.page_id || pagesList[0]?.page_id || 'managed',
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
              console.warn(`[Meta Sync API] Ad Account forms error for ${adAcc.id}:`, adFormErr.message);
            }
          }
        }
      } catch (adAccErr: any) {
        console.warn('[Meta Sync API] Ad Accounts Exception:', adAccErr.message);
      }
    }

    // Step 5: Fallback Query Supabase fb_page_configs if pagesMap is empty
    if (pagesMap.size === 0) {
      try {
        const { data: dbPages } = await supabaseAdmin
          .from('fb_page_configs')
          .select('*')
          .eq('is_active', true);

        if (dbPages && dbPages.length > 0) {
          fetchSource = 'supabase_fb_page_configs';
          for (const p of dbPages) {
            pagesMap.set(p.page_id, {
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
                console.warn(`[Meta Sync API] DB page forms error for ${p.page_id}:`, fErr.message);
              }
            }
          }
        }
      } catch (err: any) {
        console.warn('[Meta Sync API] Fallback DB query error:', err.message);
      }
    }

    const pages = Array.from(pagesMap.values());
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
      debug_user_id: debugUserId,
      debug_meta_scopes: ['pages_show_list', 'pages_read_engagement', 'leads_retrieval', 'ads_read'],
      raw_me_accounts: rawMeAccounts,
      raw_me_businesses: rawMeBusinesses,
      meta_api_debug: {
        fetchSource,
        tokenFound: !!accessToken,
        pagesCount: pages.length,
        formsCount: leadForms.length,
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
