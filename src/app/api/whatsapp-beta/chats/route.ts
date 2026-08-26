import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * GET /api/whatsapp-beta/chats
 * Fetches recent chat threads with latest messages, unread counts, and contact details
 */
export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspace_id');
    const search = req.nextUrl.searchParams.get('search') || '';

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'workspace_id is required' }, { status: 400 });
    }

    // 1. Fetch contacts
    let contactsQuery = supabaseAdmin
      .from('evolution_contacts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false });

    const { data: contacts, error: contErr } = await contactsQuery;
    if (contErr) throw contErr;

    // 2. Fetch distinct recent messages per remote_jid
    const { data: messages, error: msgErr } = await supabaseAdmin
      .from('evolution_messages')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('timestamp', { ascending: false })
      .limit(500);

    if (msgErr) throw msgErr;

    // 3. Aggregate threads by remote_jid
    const threadsMap = new Map<string, any>();

    // First populate from contacts
    (contacts || []).forEach(c => {
      threadsMap.set(c.jid, {
        jid: c.jid,
        name: c.name || c.push_name || c.phone || 'WhatsApp Contact',
        push_name: c.push_name,
        phone: c.phone || c.jid.split('@')[0],
        profile_pic_url: c.profile_pic_url,
        unread_count: 0,
        last_message: null,
        last_message_time: c.updated_at || c.created_at,
      });
    });

    // Then merge latest messages and compute unread count
    (messages || []).forEach(m => {
      const existing = threadsMap.get(m.remote_jid) || {
        jid: m.remote_jid,
        name: m.remote_jid.split('@')[0],
        push_name: null,
        phone: m.remote_jid.split('@')[0],
        profile_pic_url: null,
        unread_count: 0,
        last_message: null,
        last_message_time: m.timestamp,
      };

      if (!existing.last_message) {
        existing.last_message = m;
        existing.last_message_time = m.timestamp;
      }

      if (!m.from_me && m.status !== 'READ') {
        existing.unread_count = (existing.unread_count || 0) + 1;
      }

      threadsMap.set(m.remote_jid, existing);
    });

    let threads = Array.from(threadsMap.values()).sort((a, b) => {
      const timeA = new Date(a.last_message_time || 0).getTime();
      const timeB = new Date(b.last_message_time || 0).getTime();
      return timeB - timeA;
    });

    if (search) {
      const q = search.toLowerCase();
      threads = threads.filter(t => 
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.phone && t.phone.toLowerCase().includes(q)) ||
        (t.last_message?.content && t.last_message.content.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      success: true,
      chats: threads,
      total: threads.length,
    });
  } catch (err: any) {
    console.error('[Evolution Chats GET Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
