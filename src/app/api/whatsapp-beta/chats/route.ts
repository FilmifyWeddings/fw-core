import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { formatJid } from '@/lib/evolution-api';

export const runtime = 'nodejs';

/**
 * GET /api/whatsapp-beta/chats
 * Fetches recent chat threads with latest messages, unread counts, and contact details.
 * Seamlessly integrates WhatsApp contacts with StudioCore CRM Leads & Clients.
 */
export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspace_id');
    const search = req.nextUrl.searchParams.get('search') || '';

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'workspace_id is required' }, { status: 400 });
    }

    // 1. Fetch WhatsApp Contacts from evolution_contacts
    const { data: contacts } = await supabaseAdmin
      .from('evolution_contacts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false });

    // 2. Fetch CRM Leads for this workspace
    const { data: leads } = await supabaseAdmin
      .from('leads')
      .select('id, full_name, phone, email, notes, shoot_type, status, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .not('phone', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200);

    // 3. Fetch CRM Clients
    const { data: clients } = await supabaseAdmin
      .from('clients')
      .select('id, name, phone, email, created_at')
      .eq('workspace_id', workspaceId)
      .not('phone', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    // 4. Fetch recent messages
    const { data: messages } = await supabaseAdmin
      .from('evolution_messages')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('timestamp', { ascending: false })
      .limit(1000);

    // 5. Fetch whatsapp workflow logs
    const { data: logs } = await supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('id, lead_id, recipient, message_content, status, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(200);

    // 6. Aggregate threads by normalized remote_jid
    const threadsMap = new Map<string, any>();

    // A. Add from WhatsApp contacts
    (contacts || []).forEach(c => {
      const cleanDigits = (c.phone || c.jid.split('@')[0] || '').replace(/[^0-9]/g, '');
      const jid = cleanDigits ? `${cleanDigits}@s.whatsapp.net` : c.jid;
      threadsMap.set(jid, {
        jid,
        name: c.name || c.push_name || (cleanDigits ? `+${cleanDigits}` : 'WhatsApp Contact'),
        push_name: c.push_name,
        phone: cleanDigits || c.phone,
        profile_pic_url: c.profile_pic_url,
        unread_count: 0,
        last_message: null,
        last_message_time: c.updated_at || c.created_at,
        is_lead: false,
      });
    });

    // B. Merge CRM Leads
    const contactsToSeed: any[] = [];
    (leads || []).forEach(l => {
      const cleanDigits = (l.phone || '').replace(/[^0-9]/g, '');
      if (!cleanDigits || cleanDigits.length < 8) return;
      const formattedPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
      const jid = `${formattedPhone}@s.whatsapp.net`;

      const existing = threadsMap.get(jid);
      if (existing) {
        if (!existing.name || existing.name.startsWith('+') || existing.name === 'WhatsApp Contact') {
          existing.name = l.full_name || existing.name;
        }
        existing.lead_id = l.id;
        existing.shoot_type = l.shoot_type;
        existing.lead_status = l.status;
        existing.is_lead = true;
      } else {
        threadsMap.set(jid, {
          jid,
          name: l.full_name || `+${formattedPhone}`,
          push_name: l.full_name,
          phone: formattedPhone,
          profile_pic_url: null,
          unread_count: 0,
          last_message: null,
          last_message_time: l.updated_at || l.created_at,
          lead_id: l.id,
          shoot_type: l.shoot_type,
          lead_status: l.status,
          is_lead: true,
        });

        contactsToSeed.push({
          workspace_id: workspaceId,
          jid,
          name: l.full_name || `+${formattedPhone}`,
          push_name: l.full_name,
          phone: formattedPhone,
          updated_at: new Date().toISOString(),
        });
      }
    });

    // C. Merge CRM Clients
    (clients || []).forEach(cl => {
      const cleanDigits = (cl.phone || '').replace(/[^0-9]/g, '');
      if (!cleanDigits || cleanDigits.length < 8) return;
      const formattedPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
      const jid = `${formattedPhone}@s.whatsapp.net`;

      const existing = threadsMap.get(jid);
      if (existing) {
        if (!existing.name || existing.name.startsWith('+')) {
          existing.name = cl.name || existing.name;
        }
        existing.client_id = cl.id;
      } else {
        threadsMap.set(jid, {
          jid,
          name: cl.name || `+${formattedPhone}`,
          push_name: cl.name,
          phone: formattedPhone,
          profile_pic_url: null,
          unread_count: 0,
          last_message: null,
          last_message_time: cl.created_at,
          client_id: cl.id,
          is_lead: false,
        });
      }
    });

    // D. Auto-seed any missing leads into evolution_contacts in background
    if (contactsToSeed.length > 0) {
      supabaseAdmin
        .from('evolution_contacts')
        .upsert(contactsToSeed.slice(0, 50), { onConflict: 'workspace_id,jid' })
        .then(() => {});
    }

    // E. Merge latest messages
    (messages || []).forEach(m => {
      const cleanDigits = (m.remote_jid || '').replace(/[^0-9]/g, '');
      const jid = cleanDigits ? `${cleanDigits}@s.whatsapp.net` : m.remote_jid;

      let existing = threadsMap.get(jid);
      if (!existing) {
        existing = {
          jid,
          name: cleanDigits ? `+${cleanDigits}` : 'WhatsApp Contact',
          push_name: null,
          phone: cleanDigits,
          profile_pic_url: null,
          unread_count: 0,
          last_message: null,
          last_message_time: m.timestamp,
          is_lead: false,
        };
      }

      if (!existing.last_message) {
        existing.last_message = m;
        existing.last_message_time = m.timestamp;
      }

      if (!m.from_me && m.status !== 'READ') {
        existing.unread_count = (existing.unread_count || 0) + 1;
      }

      threadsMap.set(jid, existing);
    });

    // F. Merge logs if message history was empty
    (logs || []).forEach(lg => {
      const cleanDigits = (lg.recipient || '').replace(/[^0-9]/g, '');
      if (!cleanDigits) return;
      const jid = `${cleanDigits.length === 10 ? '91' + cleanDigits : cleanDigits}@s.whatsapp.net`;

      const existing = threadsMap.get(jid);
      if (existing && !existing.last_message) {
        existing.last_message = {
          content: lg.message_content || 'Automated message sent',
          from_me: true,
          status: lg.status === 'success' ? 'SENT' : 'PENDING',
          timestamp: lg.created_at,
          message_type: 'text',
        };
        existing.last_message_time = lg.created_at;
      }
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
        (t.shoot_type && t.shoot_type.toLowerCase().includes(q)) ||
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
