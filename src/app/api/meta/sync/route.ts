import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: Sync connected pages and forms from Supabase & Graph API
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const metaParam = searchParams.get('meta');
    const isUrlConnected = metaParam === 'connected' || searchParams.has('pages');

    // 1. Fetch connected pages from Supabase 'fb_page_configs' table
    let dbPages: any[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('fb_page_configs')
        .select('*')
        .eq('is_active', true);

      if (!error && data && data.length > 0) {
        dbPages = data;
      }
    } catch (dbErr: any) {
      console.warn('[Meta Sync API] Supabase DB fetch warning:', dbErr.message);
    }

    const isConnected = dbPages.length > 0 || isUrlConnected;

    if (!isConnected) {
      return NextResponse.json({
        success: true,
        isConnected: false,
        accountName: null,
        adAccountId: null,
        pages: [],
        leadForms: [],
        totalLeadsSynced: 0,
      });
    }

    const pages = dbPages.map(p => ({
      page_id: p.page_id,
      page_name: p.page_name,
      page_category: p.page_category || 'Facebook Page',
      is_active: p.is_active ?? true,
      page_access_token: p.page_access_token || '',
    }));

    const leadForms: Array<{
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

    // For each active page, fetch real Instant Lead Forms from Meta Graph API
    for (const page of pages) {
      if (page.page_access_token) {
        try {
          const formsRes = await fetch(
            `https://graph.facebook.com/v19.0/${page.page_id}/leadgen_forms?fields=id,name,status,questions&access_token=${page.page_access_token}`
          );
          if (formsRes.ok) {
            const formsData = await formsRes.json();
            if (formsData.data && Array.isArray(formsData.data)) {
              formsData.data.forEach((f: any) => {
                leadForms.push({
                  form_id: f.id,
                  name: f.name,
                  status: (f.status || 'ACTIVE').toUpperCase() as any,
                  page_id: page.page_id,
                  page_name: page.page_name,
                  ad_account_name: page.page_name + ' Ad Account',
                  is_active: true,
                  sync_count: 0,
                  last_lead_time: 'Active',
                  questions_count: f.questions?.length || 0,
                });
              });
            }
          }
        } catch (graphErr: any) {
          console.warn(`[Meta Sync API] Graph API exception for page ${page.page_id}:`, graphErr.message);
        }
      }
    }

    const totalLeadsSynced = leadForms.reduce((acc, f) => acc + f.sync_count, 0);

    return NextResponse.json({
      success: true,
      isConnected: true,
      accountName: pages[0]?.page_name || 'Facebook Account (Connected)',
      adAccountId: 'act_' + (pages[0]?.page_id || 'managed'),
      pages,
      leadForms,
      totalLeadsSynced,
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
      const { error } = await supabaseAdmin
        .from('fb_page_configs')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .neq('page_id', '0');

      if (error) {
        console.error('[Meta Disconnect DB Error]:', error.message);
      }

      return NextResponse.json({ success: true, isConnected: false });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
