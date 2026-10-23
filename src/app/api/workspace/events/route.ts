import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { DEFAULT_EVENT_TYPES } from '@/lib/workspace-settings';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workspace/events?workspace_id=...
 */
export async function GET(req: NextRequest) {
  try {
    const wsId = req.nextUrl.searchParams.get('workspace_id');
    if (!wsId) {
      return NextResponse.json({ success: false, error: 'Missing workspace_id' }, { status: 400 });
    }

    // Direct query using supabaseAdmin
    const { data, error } = await supabaseAdmin
      .from('workspace_event_types')
      .select('*')
      .eq('workspace_id', wsId)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('[API workspace/events GET Error]:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (data && data.length > 0) {
      return NextResponse.json({ success: true, events: data });
    }

    // Auto-seed defaults if brand-new workspace
    const defaultInserts = DEFAULT_EVENT_TYPES.map((def, idx) => ({
      workspace_id: wsId,
      name: def.name,
      category: def.category || 'General',
      is_default: true,
      display_order: idx,
      updated_at: new Date().toISOString()
    }));

    const { data: seeded, error: seedErr } = await supabaseAdmin
      .from('workspace_event_types')
      .insert(defaultInserts)
      .select('*');

    if (seedErr) {
      console.warn('[API workspace/events Seed Note]:', seedErr.message);
      return NextResponse.json({ success: true, events: DEFAULT_EVENT_TYPES });
    }

    return NextResponse.json({ success: true, events: seeded || DEFAULT_EVENT_TYPES });
  } catch (err: any) {
    console.error('[API workspace/events GET Exception]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/workspace/events
 * Body: { workspace_id, name, category, display_order }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspace_id: wsId, name, category = 'General', display_order = 99 } = body;

    const cleanName = (name || '').trim();
    if (!wsId || !cleanName) {
      return NextResponse.json({ success: false, error: 'Missing workspace_id or name' }, { status: 400 });
    }

    // 1. Case-insensitive duplicate check
    const { data: existing } = await supabaseAdmin
      .from('workspace_event_types')
      .select('id, name')
      .eq('workspace_id', wsId)
      .ilike('name', cleanName)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: false,
        error: `The function "${cleanName}" already exists in your workspace.`,
        duplicate: true,
        existing
      }, { status: 409 });
    }

    // 2. Insert new event type
    const payload = {
      workspace_id: wsId,
      name: cleanName,
      category: category || 'General',
      is_default: false,
      display_order: typeof display_order === 'number' ? display_order : 99,
      updated_at: new Date().toISOString()
    };

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('workspace_event_types')
      .insert([payload])
      .select()
      .single();

    if (insertErr) {
      console.error('[API workspace/events POST Error]:', insertErr.message);
      return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, event: inserted });
  } catch (err: any) {
    console.error('[API workspace/events POST Exception]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/workspace/events
 * Body: { id, name, category, workspace_id, display_order }
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, category = 'General', workspace_id: wsId, display_order } = body;

    const cleanName = (name || '').trim();
    if (!id || !cleanName || !wsId) {
      return NextResponse.json({ success: false, error: 'Missing id, name, or workspace_id' }, { status: 400 });
    }

    // 1. Check duplicate with another event
    const { data: duplicate } = await supabaseAdmin
      .from('workspace_event_types')
      .select('id, name')
      .eq('workspace_id', wsId)
      .ilike('name', cleanName)
      .neq('id', id)
      .maybeSingle();

    if (duplicate) {
      return NextResponse.json({
        success: false,
        error: `Another function named "${cleanName}" already exists.`,
        duplicate: true
      }, { status: 409 });
    }

    // 2. Update record
    const updates: any = {
      name: cleanName,
      category: category || 'General',
      updated_at: new Date().toISOString()
    };
    if (typeof display_order === 'number') {
      updates.display_order = display_order;
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('workspace_event_types')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', wsId)
      .select()
      .single();

    if (updateErr) {
      console.error('[API workspace/events PUT Error]:', updateErr.message);
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, event: updated });
  } catch (err: any) {
    console.error('[API workspace/events PUT Exception]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/workspace/events?id=...&workspace_id=...&name=...
 */
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    const wsId = req.nextUrl.searchParams.get('workspace_id');
    const name = req.nextUrl.searchParams.get('name');

    if (!wsId || (!id && !name)) {
      return NextResponse.json({ success: false, error: 'Missing workspace_id and id or name' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('workspace_event_types')
      .delete()
      .eq('workspace_id', wsId);

    if (id && !id.startsWith('def_') && !id.startsWith('ev_')) {
      query = query.eq('id', id);
    } else if (name) {
      query = query.eq('name', name);
    } else {
      query = query.eq('id', id);
    }

    const { error: delErr } = await query;
    if (delErr) {
      console.error('[API workspace/events DELETE Error]:', delErr.message);
      return NextResponse.json({ success: false, error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API workspace/events DELETE Exception]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
