import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id');

    let query = supabaseAdmin
      .from('storage_memory_cards')
      .select('*')
      .order('card_name', { ascending: true });

    if (workspaceId && workspaceId !== '00000000-0000-0000-0000-000000000000') {
      query = query.or(`workspace_id.eq.${workspaceId},workspace_id.eq.00000000-0000-0000-0000-000000000000`);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[StorageCards API] DB select error:', error.message);
      return NextResponse.json({ success: true, cards: [] });
    }

    return NextResponse.json({ success: true, cards: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      workspace_id,
      card_name,
      card_type = 'SD_CARD',
      capacity_gb = 128,
      speed_class = 'V90 300MB/s',
      serial_number,
      color_tag = '#F59E0B',
      status = 'AVAILABLE',
      assigned_to_crew_name,
      notes,
    } = body;

    if (!card_name || !card_name.trim()) {
      return NextResponse.json({ success: false, error: 'card_name is required' }, { status: 400 });
    }

    const effectiveWs = workspace_id || '00000000-0000-0000-0000-000000000000';

    const cardPayload: any = {
      workspace_id: effectiveWs,
      card_name: card_name.trim(),
      card_type,
      capacity_gb: Number(capacity_gb) || 128,
      speed_class: speed_class || '',
      serial_number: serial_number || '',
      color_tag: color_tag || '#F59E0B',
      status: status || 'AVAILABLE',
      assigned_to_crew_name: assigned_to_crew_name || null,
      notes: notes || '',
      updated_at: new Date().toISOString(),
    };

    if (id) {
      const { data, error } = await supabaseAdmin
        .from('storage_memory_cards')
        .update(cardPayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, card: data });
    } else {
      const { data, error } = await supabaseAdmin
        .from('storage_memory_cards')
        .upsert(cardPayload, { onConflict: 'workspace_id,card_name' })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, card: data });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('storage_memory_cards')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Card deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
