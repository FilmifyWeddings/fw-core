import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: Real Meta Graph API Fetching & Supabase Synchronization
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const metaParam = searchParams.get('meta');
    const isUrlConnected = metaParam === 'connected' || searchParams.has('pages');

    let accessToken: string | null = searchParams.get('access_token');
    const workspaceId = '00000000-0000-0000-0000-000000000000';

    // 1. Fetch User Access Token from Supabase if not in query
    if (!accessToken) {
      // Try integration_credentials
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
        // Try profiles
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

    let leadForms: Array<{
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
    }> = [];

    let fetchSource = 'none';

    // 2. Call Meta Graph API with Access Token if available
    if (accessToken) {
      try {
        const pagesRes = await fetch(
          `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,access_token&access_token=${accessToken}`
        );

        if (pagesRes.ok) {
          const pagesData = await pagesRes.json();
          if (pagesData.data && Array.isArray(pagesData.data) && pagesData.data.length > 0) {
            fetchSource = 'graph_api_me_accounts';
            const upsertData: any[] = [];

            for (const item of pagesData.data) {
              const pageObj = {
                page_id: item.id,
                page_name: item.name,
                page_category: item.category || 'Facebook Business Page',
                is_active: true,
                page_access_token: item.access_token || accessToken,
              };

              pages.push(pageObj);

              upsertData.push({
                workspace_id: workspaceId,
                page_id: item.id,
                page_name: item.name,
                page_category: item.category,
                page_access_token: item.access_token || accessToken,
                is_active: true,
                updated_at: new Date().toISOString(),
              });

              // Fetch Leadgen Forms for this Page
              if (item.access_token) {
                try {
                  const formsRes = await fetch(
                    `https://graph.facebook.com/v19.0/${item.id}/leadgen_forms?fields=id,name,status,leads_count,questions&access_token=${item.access_token}`
                  );
                  if (formsRes.ok) {
                    const formsData = await formsRes.json();
                    if (formsData.data && Array.isArray(formsData.data)) {
                      formsData.data.forEach((f: any) => {
                        leadForms.push({
                          form_id: f.id,
                          name: f.name,
                          status: (f.status || 'ACTIVE').toUpperCase() as any,
                          page_id: item.id,
                          page_name: item.name,
                          ad_account_name: item.name + ' Ad Account',
                          is_active: true,
                          sync_count: f.leads_count || 0,
                          last_lead_time: 'Active',
                          questions_count: f.questions?.length || 0,
                        });
                      });
                    }
                  }
                } catch (formErr: any) {
                  console.warn(`[Meta Sync API] Leadgen forms error for page ${item.id}:`, formErr.message);
                }
              }
            }

            // Save/Upsert Pages to Supabase 'fb_page_configs' table
            if (upsertData.length > 0) {
              const { error: upsertErr } = await supabaseAdmin
                .from('fb_page_configs')
                .upsert(upsertData, { onConflict: 'workspace_id,page_id' });

              if (upsertErr) {
                console.error('[Meta Sync API] Supabase upsert error:', upsertErr.message);
              }
            }
          }
        } else {
          const errJson = await pagesRes.json().catch(() => ({}));
          console.warn('[Meta Sync API] /me/accounts Graph API warning:', errJson?.error?.message || pagesRes.status);
        }
      } catch (graphErr: any) {
        console.error('[Meta Sync API] Graph API Exception:', graphErr.message);
      }
    }

    // 3. Fallback: Query Supabase 'fb_page_configs' table if pages array is still empty
    if (pages.length === 0) {
      try {
        const { data: dbPages, error: dbErr } = await supabaseAdmin
          .from('fb_page_configs')
          .select('*')
          .eq('is_active', true);

        if (!dbErr && dbPages && dbPages.length > 0) {
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
                  `https://graph.facebook.com/v19.0/${p.page_id}/leadgen_forms?fields=id,name,status,leads_count,questions&access_token=${p.page_access_token}`
                );
                if (formsRes.ok) {
                  const formsData = await formsRes.json();
                  if (formsData.data && Array.isArray(formsData.data)) {
                    formsData.data.forEach((f: any) => {
                      leadForms.push({
                        form_id: f.id,
                        name: f.name,
                        status: (f.status || 'ACTIVE').toUpperCase() as any,
                        page_id: p.page_id,
                        page_name: p.page_name,
                        ad_account_name: p.page_name + ' Ad Account',
                        is_active: true,
                        sync_count: f.leads_count || 0,
                        last_lead_time: 'Active',
                        questions_count: f.questions?.length || 0,
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
      debug: {
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

// POST: Handle Disconnect / Clear Meta token from Supabase DB
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
