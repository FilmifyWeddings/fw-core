import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { formatJid } from '@/lib/evolution-api';

export const runtime = 'nodejs';

function formatPhoneDisplay(digits: string): string {
  const clean = digits.replace(/[^0-9]/g, '');
  if (!clean) return '';
  if (clean.length === 12 && clean.startsWith('91')) {
    return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return `+${clean}`;
}

/**
 * GET /api/whatsapp-beta/chats
 * Fetches recent chat threads with latest messages, unread counts, and contact details.
 * Seamlessly integrates mobile WhatsApp chats (baileys_chats) with StudioCore CRM Leads & Clients.
 */
export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspace_id');
    const search = req.nextUrl.searchParams.get('search') || '';

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'workspace_id is required' }, { status: 400 });
    }

    // 1. Fetch Phone WhatsApp Chats from baileys_chats
    const { data: bChats } = await supabaseAdmin
      .from('baileys_chats')
      .select('*')
      .order('last_message_at', { ascending: false })
      .limit(300);

    // 2. Fetch WhatsApp Contacts from evolution_contacts
    const { data: contacts } = await supabaseAdmin
      .from('evolution_contacts')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(300);

    // 3. Fetch CRM Leads
    let { data: leads } = await supabaseAdmin
      .from('leads')
      .select('id, full_name, phone, email, notes, shoot_type, status, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .not('phone', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200);

    if (!leads || leads.length === 0) {
      const { data: fallbackLeads } = await supabaseAdmin
        .from('leads')
        .select('id, full_name, phone, email, notes, shoot_type, status, created_at, updated_at')
        .not('phone', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200);
      leads = fallbackLeads;
    }

    // 4. Fetch CRM Clients
    let { data: clients } = await supabaseAdmin
      .from('clients')
      .select('id, name, phone, email, created_at')
      .eq('workspace_id', workspaceId)
      .not('phone', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!clients || clients.length === 0) {
      const { data: fallbackClients } = await supabaseAdmin
        .from('clients')
        .select('id, name, phone, email, created_at')
        .not('phone', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);
      clients = fallbackClients;
    }

    // 5. Fetch recent messages from evolution_messages
    const { data: messages } = await supabaseAdmin
      .from('evolution_messages')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1000);

    // 6. Fetch recent messages from baileys_messages
    const { data: bMessages } = await supabaseAdmin
      .from('baileys_messages')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(500);

    // 7. Fetch whatsapp workflow logs
    const { data: logs } = await supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('id, lead_id, recipient, message_content, status, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    // 8. Aggregate threads by normalized remote_jid
    const threadsMap = new Map<string, any>();

    // A. Add from baileys_chats (mobile chats sync)
    (bChats || []).forEach(bc => {
      if (!bc.jid || bc.jid === 'status@broadcast' || bc.jid.endsWith('@broadcast')) return;

      const isGroup = bc.jid.endsWith('@g.us') || (bc.is_group === true && !bc.jid.endsWith('@lid'));
      const cleanDigits = (bc.phone_number || bc.jid.split('@')[0] || '').replace(/[^0-9]/g, '');
      const jid = bc.jid;

      const hasSubject = bc.display_name && !bc.display_name.startsWith('+') && !bc.display_name.startsWith('12036');
      let displayName = hasSubject ? bc.display_name : null;

      if (!displayName) {
        if (isGroup) {
          displayName = 'WhatsApp Group';
        } else if (cleanDigits && cleanDigits.length >= 10 && cleanDigits.length <= 13) {
          displayName = formatPhoneDisplay(cleanDigits);
        } else {
          displayName = 'WhatsApp Contact';
        }
      }

      const lastTime = bc.last_message_at || bc.updated_at || bc.created_at;

      threadsMap.set(jid, {
        jid,
        name: displayName,
        push_name: hasSubject ? bc.display_name : null,
        phone: isGroup ? '' : (cleanDigits.length <= 13 ? cleanDigits : ''),
        profile_pic_url: bc.profile_pic_url,
        unread_count: bc.unread_count || 0,
        last_message: bc.last_message ? {
          content: bc.last_message,
          timestamp: lastTime,
          status: 'READ',
        } : null,
        last_message_time: lastTime,
        is_group: isGroup,
        is_lead: false,
      });
    });

    // B. Add from evolution_contacts
    (contacts || []).forEach(c => {
      if (!c.jid || c.jid === 'status@broadcast' || c.jid.endsWith('@broadcast')) return;

      const isGroup = c.jid.endsWith('@g.us');
      const cleanDigits = (c.phone || c.jid.split('@')[0] || '').replace(/[^0-9]/g, '');
      const jid = c.jid;

      const existing = threadsMap.get(jid);
      const hasRealName = c.name && !c.name.startsWith('+') && !c.name.startsWith('12036');
      const hasPushName = c.push_name && !c.push_name.startsWith('+') && !c.push_name.startsWith('12036');

      if (existing) {
        if (hasPushName && !existing.push_name) existing.push_name = c.push_name;
        if (hasRealName && (existing.name === 'WhatsApp Group' || existing.name === 'WhatsApp Contact' || existing.name.startsWith('+'))) {
          existing.name = c.name;
        }
        if (!existing.profile_pic_url && c.profile_pic_url) existing.profile_pic_url = c.profile_pic_url;
      } else {
        threadsMap.set(jid, {
          jid,
          name: hasRealName ? c.name : (hasPushName ? c.push_name : (isGroup ? 'WhatsApp Group' : formatPhoneDisplay(cleanDigits) || 'WhatsApp Contact')),
          push_name: c.push_name,
          phone: isGroup ? '' : (cleanDigits.length <= 13 ? cleanDigits : ''),
          profile_pic_url: c.profile_pic_url,
          unread_count: 0,
          last_message: null,
          last_message_time: c.updated_at || c.created_at,
          is_group: isGroup,
          is_lead: false,
        });
      }
    });

    // C. Merge CRM Leads
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
          name: l.full_name || formatPhoneDisplay(formattedPhone),
          push_name: l.full_name,
          phone: formattedPhone,
          profile_pic_url: null,
          unread_count: 0,
          last_message: null,
          last_message_time: l.updated_at || l.created_at,
          lead_id: l.id,
          shoot_type: l.shoot_type,
          lead_status: l.status,
          is_group: false,
          is_lead: true,
        });
      }
    });

    // D. Merge CRM Clients
    (clients || []).forEach(cl => {
      const cleanDigits = (cl.phone || '').replace(/[^0-9]/g, '');
      if (!cleanDigits || cleanDigits.length < 8) return;
      const formattedPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
      const jid = `${formattedPhone}@s.whatsapp.net`;

      const existing = threadsMap.get(jid);
      if (existing) {
        if (!existing.name || existing.name.startsWith('+') || existing.name === 'WhatsApp Contact') {
          existing.name = cl.name || existing.name;
        }
        existing.client_id = cl.id;
      } else {
        threadsMap.set(jid, {
          jid,
          name: cl.name || formatPhoneDisplay(formattedPhone),
          push_name: cl.name,
          phone: formattedPhone,
          profile_pic_url: null,
          unread_count: 0,
          last_message: null,
          last_message_time: cl.created_at,
          client_id: cl.id,
          is_group: false,
          is_lead: false,
        });
      }
    });

    // E. Merge messages from evolution_messages
    (messages || []).forEach(m => {
      if (!m.remote_jid || m.remote_jid === 'status@broadcast' || m.remote_jid.endsWith('@broadcast')) return;

      const cleanDigits = (m.remote_jid || '').replace(/[^0-9]/g, '');
      const isGroup = m.remote_jid.endsWith('@g.us');
      const jid = m.remote_jid;

      let existing = threadsMap.get(jid);
      if (!existing) {
        existing = {
          jid,
          name: isGroup ? 'WhatsApp Group' : formatPhoneDisplay(cleanDigits) || 'WhatsApp Contact',
          push_name: null,
          phone: isGroup ? '' : (cleanDigits.length <= 13 ? cleanDigits : ''),
          profile_pic_url: null,
          unread_count: 0,
          last_message: null,
          last_message_time: m.timestamp,
          is_group: isGroup,
          is_lead: false,
        };
      }

      const msgTime = new Date(m.timestamp).getTime();
      const existingTime = new Date(existing.last_message_time || 0).getTime();

      if (!existing.last_message || msgTime >= existingTime) {
        existing.last_message = m;
        existing.last_message_time = m.timestamp;
      }

      if (!m.from_me && m.status !== 'READ') {
        existing.unread_count = (existing.unread_count || 0) + 1;
      }

      threadsMap.set(jid, existing);
    });

    // F. Merge messages from baileys_messages
    (bMessages || []).forEach(bm => {
      if (!bm.chat_jid || bm.chat_jid === 'status@broadcast' || bm.chat_jid.endsWith('@broadcast')) return;

      const cleanDigits = (bm.chat_jid || '').replace(/[^0-9]/g, '');
      const isGroup = bm.chat_jid.endsWith('@g.us');
      const jid = bm.chat_jid;

      let existing = threadsMap.get(jid);
      if (!existing) {
        existing = {
          jid,
          name: isGroup ? 'WhatsApp Group' : formatPhoneDisplay(cleanDigits) || 'WhatsApp Contact',
          push_name: null,
          phone: isGroup ? '' : (cleanDigits.length <= 13 ? cleanDigits : ''),
          profile_pic_url: null,
          unread_count: 0,
          last_message: null,
          last_message_time: bm.sent_at,
          is_group: isGroup,
          is_lead: false,
        };
      }

      const msgTime = new Date(bm.sent_at).getTime();
      const existingTime = new Date(existing.last_message_time || 0).getTime();

      if (!existing.last_message || msgTime >= existingTime) {
        existing.last_message = {
          content: bm.message_text,
          from_me: bm.direction === 'outbound',
          status: 'READ',
          timestamp: bm.sent_at,
          message_type: 'text',
        };
        existing.last_message_time = bm.sent_at;
      }

      threadsMap.set(jid, existing);
    });

    // G. Merge logs if message history was empty
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

    // STRICT RECENT SORTING (Newest active conversation on top)
    let threads = Array.from(threadsMap.values()).sort((a, b) => {
      const timeA = new Date(a.last_message_time || a.last_message?.timestamp || 0).getTime();
      const timeB = new Date(b.last_message_time || b.last_message?.timestamp || 0).getTime();
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
