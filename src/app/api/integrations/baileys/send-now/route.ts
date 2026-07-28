import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messageId, workspaceId } = body;

    if (!messageId || !workspaceId) {
      return NextResponse.json({ success: false, error: 'Missing messageId or workspaceId' }, { status: 400 });
    }

    const { data: message, error: fetchErr } = await supabaseAdmin
      .from('baileys_messages')
      .select('*')
      .eq('id', messageId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (fetchErr || !message) {
      return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
    }

    const cleanPhone = message.chat_jid.replace(/[^0-9]/g, '');
    const jid = `${cleanPhone}@s.whatsapp.net`;

    const { error: insertErr } = await supabaseAdmin
      .from('baileys_action_queue')
      .insert({
        workspace_id: workspaceId,
        action_type: 'send_text',
        payload: {
          to: jid,
          text: message.message_text || '',
          mediaUrl: message.media_url || null,
          mimeType: message.media_mime || null,
        },
        status: 'pending',
        priority: 1,
        created_at: new Date().toISOString(),
      });

    if (insertErr) throw insertErr;

    await supabaseAdmin
      .from('baileys_messages')
      .update({ status: 'queued', error_message: null })
      .eq('id', messageId);

    return NextResponse.json({ success: true, message: 'Message re-queued for immediate send' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
