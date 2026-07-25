import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/meta/status?workspace_id=XXX
 * Returns Meta Connection Status, Profile Info, Pages Count, Lead Forms List & Error Logs.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id') || '00000000-0000-0000-0000-000000000000';

  try {
    // 1. Connection Info
    const { data: conn } = await supabaseAdmin
      .from('meta_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    // Legacy fallback check
    let isConnected = !!conn?.access_token && conn?.is_valid !== false;
    let userName = conn?.meta_user_name || 'Filmify Meta Admin';
    let connectedDate = conn?.created_at || null;
    let expiresAt = conn?.expires_at || null;

    if (!conn) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('meta_access_token, updated_at')
        .eq('id', workspaceId)
        .maybeSingle();
      if (profile?.meta_access_token) {
        isConnected = true;
        userName = 'Studio Meta Admin';
        connectedDate = profile.updated_at;
      }
    }

    // 2. Fetch Pages
    const { data: pagesData } = await supabaseAdmin
      .from('meta_pages')
      .select('*')
      .eq('workspace_id', workspaceId);

    let pages = pagesData || [];

    // Fallback if meta_pages empty -> check fb_page_configs
    if (pages.length === 0) {
      const { data: fbPages } = await supabaseAdmin
        .from('fb_page_configs')
        .select('*')
        .eq('workspace_id', workspaceId);
      if (fbPages && fbPages.length > 0) {
        pages = fbPages.map((p: any) => ({
          page_id: p.page_id,
          page_name: p.page_name,
          page_category: p.page_category || 'Business Page',
          is_active: p.is_active ?? true,
          is_webhook_subscribed: true,
        }));
      }
    }

    // 3. Fetch Lead Forms
    const { data: formsData } = await supabaseAdmin
      .from('meta_lead_forms')
      .select('*')
      .eq('workspace_id', workspaceId);

    let forms = formsData || [];

    // Fallback if meta_lead_forms empty -> check fb_form_mappings
    if (forms.length === 0) {
      const { data: fbForms } = await supabaseAdmin
        .from('fb_form_mappings')
        .select('*')
        .eq('workspace_id', workspaceId);
      if (fbForms && fbForms.length > 0) {
        forms = fbForms.map((f: any) => ({
          form_id: f.form_id,
          page_id: f.page_id,
          form_name: f.form_name || 'Instant Lead Form',
          status: 'ACTIVE',
          questions_count: 5,
          sync_count: f.sync_count || 0,
          is_active: f.is_active ?? true,
        }));
      }
    }

    // 4. Fetch Recent Error Logs
    const { data: errorLogs } = await supabaseAdmin
      .from('meta_error_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(10);

    // 5. Fetch Sync Logs
    const { data: syncLogs } = await supabaseAdmin
      .from('meta_sync_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(15);

    return NextResponse.json({
      success: true,
      connection: {
        is_connected: isConnected,
        user_name: userName,
        connected_date: connectedDate,
        expires_at: expiresAt,
        token_status: isConnected ? 'User Long-Lived Token (60 Days / Auto-Renew)' : 'Disconnected',
      },
      counts: {
        pages_count: pages.length,
        forms_count: forms.length,
        active_forms_count: forms.filter((f: any) => f.is_active).length,
      },
      pages,
      forms,
      error_logs: errorLogs || [],
      sync_logs: syncLogs || [],
    });

  } catch (err: any) {
    console.error('[Meta Status API Error]:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to fetch Meta integration status',
      connection: { is_connected: false },
      pages: [],
      forms: [],
    }, { status: 500 });
  }
}
