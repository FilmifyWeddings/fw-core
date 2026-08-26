import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * GET /api/whatsapp-beta/messages
 * Retrieves conversation message history for a specific remote_jid
 */
export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspace_id');
    const remoteJid = req.nextUrl.searchParams.get('remote_jid');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '100', 10);

    if (!workspaceId || !remoteJid) {
      return NextResponse.json({ 
        success: false, 
        error: 'workspace_id and remote_jid are required' 
      }, { status: 400 });
    }

    const { data: messages, error } = await supabaseAdmin
      .from('evolution_messages')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('remote_jid', remoteJid)
      .order('timestamp', { ascending: true })
      .limit(limit);

    if (error) throw error;

    // Mark incoming messages as READ in DB
    supabaseAdmin
      .from('evolution_messages')
      .update({ status: 'READ' })
      .eq('workspace_id', workspaceId)
      .eq('remote_jid', remoteJid)
      .eq('from_me', false)
      .neq('status', 'READ')
      .then(() => {});

    return NextResponse.json({
      success: true,
      remote_jid: remoteJid,
      messages: messages || [],
      count: messages?.length || 0,
    });
  } catch (err: any) {
    console.error('[Evolution Messages GET Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
