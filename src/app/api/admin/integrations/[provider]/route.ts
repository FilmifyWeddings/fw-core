import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { isUserSuperAdmin } from '@/lib/auth/admin-guard';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    if (!isUserSuperAdmin(user)) return NextResponse.json({ error: 'Forbidden: Super Admin only' }, { status: 403 });

    const { provider } = await params;

    // Map URL slug → database provider name
    const credProvider = provider === 'whatsapp' ? 'whatsapp' :
                         provider === 'meta-ads' ? 'meta' :
                         provider === 'gmail-smtp' ? 'smtp' :
                         provider === 'google-contacts' ? 'google' :
                         provider === 'google-calendar' ? 'google' :
                         provider === 'wordpress' ? 'custom_website' : provider;

    // ── Fetch integration credentials across all users ─────────────────────────
    const { data: credentials } = await supabaseAdmin
      .from('integration_credentials')
      .select('*')
      .eq('provider', credProvider);

    // ── WhatsApp-specific data ─────────────────────────────────────────────────
    let deviceSessions: any[] = [];
    let messageLogs: any[] = [];
    let failedMessages: any[] = [];
    let templateStats: any[] = [];

    if (provider === 'whatsapp') {
      // Device sessions
      const { data: sessions } = await supabaseAdmin
        .from('whatsapp_sessions')
        .select('*')
        .order('created_at', { ascending: false });
      deviceSessions = sessions || [];

      // Message logs (last 200)
      const { data: logs } = await supabaseAdmin
        .from('whatsapp_message_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      messageLogs = logs || [];

      // Failed messages subset
      failedMessages = messageLogs.filter(l => l.status === 'failed' || l.status === 'error');

      // Templates
      const { data: templates } = await supabaseAdmin
        .from('message_templates')
        .select('id, name, category, status, created_at');
      templateStats = templates || [];
    }

    // ── Fetch profiles + auth emails ───────────────────────────────────────────
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id, workspace_name');
    const profileMap = new Map((profiles || []).map(p => [p.id, p.workspace_name]));

    const emailMap: Record<string, string> = {};
    try {
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      if (authUsers?.users) {
        authUsers.users.forEach(u => { if (u.email) emailMap[u.id] = u.email; });
      }
    } catch (_) { /* silent */ }

    // ── Connected users list ───────────────────────────────────────────────────
    const connectedUsers = (credentials || []).filter(c => c.status === 'connected').map(c => ({
      user_id: c.user_id,
      workspace_name: profileMap.get(c.user_id) || 'Unknown Workspace',
      email: emailMap[c.user_id] || 'N/A',
      status: c.status,
      connected_at: c.updated_at || c.created_at,
    }));

    // ── WhatsApp device enrichment ─────────────────────────────────────────────
    const enrichedDevices = deviceSessions.map(s => ({
      ...s,
      workspace_name: profileMap.get(s.user_id) || 'Unknown',
      email: emailMap[s.user_id] || 'N/A',
      message_count: messageLogs.filter(l => l.user_id === s.user_id).length,
      failed_count: failedMessages.filter(l => l.user_id === s.user_id).length,
    }));

    // ── Summary stats ──────────────────────────────────────────────────────────
    const summary = {
      totalConnected: connectedUsers.length,
      totalDevices: enrichedDevices.length,
      totalMessagesSent: messageLogs.filter(l => l.status === 'sent' || l.status === 'delivered').length,
      totalMessagesFailed: failedMessages.length,
      totalTemplates: templateStats.length,
    };

    return NextResponse.json({
      success: true,
      provider,
      summary,
      connectedUsers,
      deviceSessions: enrichedDevices,
      messageLogs: messageLogs.slice(0, 100),
      failedMessages: failedMessages.slice(0, 50),
      templateStats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
