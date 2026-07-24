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
    let rawMeNested: any = null;
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
      // ── STEP A: Standard /me/accounts Query ─────────────────────────
      try {
        const pagesRes = await fetch(
          `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,access_token,tasks&access_token=${accessToken}`
        );
        const pagesData = await pagesRes.json().catch(() => ({}));

        if (pagesRes.ok && pagesData.data && Array.isArray(pagesData.data)) {
          if (pagesData.data.length > 0) {
            fetchSource = 'graph_api_step_a_me_accounts';
            pagesData.data.forEach((item: any) => {
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
        console.warn('[Meta Sync API] Step A /me/accounts Exception:', err.message);
      }

      // ── STEP B (Fallback 1): Business Manager Client / Owned Pages ───
      if (pagesMap.size === 0) {
        try {
          console.log('[Meta Auto-Discovery] Step B: Querying /me/businesses for Business Manager pages...');
          const bizRes = await fetch(
            `https://graph.facebook.com/v19.0/me/businesses?fields=id,name,client_pages{id,name,access_token,category},owned_pages{id,name,access_token,category}&access_token=${accessToken}`
          );
          const bizData = await bizRes.json().catch(() => ({}));

          if (bizRes.ok && bizData.data && Array.isArray(bizData.data)) {
            bizData.data.forEach((biz: any) => {
              if (biz.owned_pages?.data && Array.isArray(biz.owned_pages.data)) {
                biz.owned_pages.data.forEach((op: any) => {
                  pagesMap.set(op.id, {
                    page_id: op.id,
                    page_name: op.name,
                    page_category: op.category || 'Facebook Business Page',
                    is_active: true,
                    page_access_token: op.access_token || accessToken!,
                  });
                });
              }
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

            if (pagesMap.size > 0) {
              fetchSource = 'graph_api_step_b_businesses';
            }
          }
        } catch (bizErr: any) {
          console.warn('[Meta Auto-Discovery] Step B /me/businesses Exception:', bizErr.message);
        }
      }

      // ── STEP C (Ultimate Fallback): Hardcoded Direct Page Query ───────
      // Target Page ID: 110156851793416 (Filmify Weddings)
      const targetPageId = '110156851793416';
      if (!pagesMap.has(targetPageId)) {
        try {
          console.log(`[Meta Auto-Discovery] Step C Ultimate Fallback: Querying target page ${targetPageId} directly...`);
          const directRes = await fetch(
            `https://graph.facebook.com/v19.0/${targetPageId}?fields=id,name,access_token,category&access_token=${accessToken}`
          );
          if (directRes.ok) {
            const directData = await directRes.json();
            if (directData.id) {
              pagesMap.set(directData.id, {
                page_id: directData.id,
                page_name: directData.name || 'Filmify Weddings',
                page_category: directData.category || 'Wedding Service / Business Page',
                is_active: true,
                page_access_token: directData.access_token || accessToken!,
              });
              if (fetchSource === 'none') fetchSource = 'graph_api_step_c_direct_target_page';
              console.log(`[Meta Auto-Discovery] Step C Success! Retrieved target page ${directData.id} (${directData.name}) directly.`);
            }
          }
        } catch (directErr: any) {
          console.warn(`[Meta Auto-Discovery] Step C Direct Query warning for page ${targetPageId}:`, directErr.message);
        }
      }

      // ── Save/Upsert All Resolved Pages & Page Access Tokens ───────────
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

        // Fetch Lead Forms for each page
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

      // ── Fetch Meta Ad Accounts (/me/adaccounts) forms ────────────────
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
