import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { DEFAULT_CREW_ROLES, CORE_DEFAULT_ROLE_NAMES, isCoreDefaultRole } from '@/lib/workspace-settings';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workspace/crew-roles?workspace_id=...
 */
export async function GET(req: NextRequest) {
  try {
    const wsId = req.nextUrl.searchParams.get('workspace_id');
    if (!wsId) {
      return NextResponse.json({ success: false, error: 'Missing workspace_id' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('master_crew_roles')
      .select('*')
      .eq('workspace_id', wsId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[API workspace/crew-roles GET Error]:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (data && data.length > 0) {
      return NextResponse.json({ success: true, roles: data });
    }

    // Auto-seed default 8 core roles if brand-new workspace
    const seedPayload = DEFAULT_CREW_ROLES.map((role, idx) => ({
      workspace_id: wsId,
      created_by: wsId,
      name: role.name,
      short_code: role.short_code,
      is_customized: false,
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data: seeded, error: seedErr } = await supabaseAdmin
      .from('master_crew_roles')
      .insert(seedPayload)
      .select();

    if (seedErr) {
      console.warn('[API workspace/crew-roles Seed Note]:', seedErr.message);
      return NextResponse.json({ success: true, roles: DEFAULT_CREW_ROLES });
    }

    return NextResponse.json({ success: true, roles: seeded || DEFAULT_CREW_ROLES });
  } catch (err: any) {
    console.error('[API workspace/crew-roles GET Exception]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/workspace/crew-roles
 * Body: { workspace_id, name, short_code, category }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspace_id: wsId, name, short_code: shortCode, category = 'Photography' } = body;

    const cleanName = (name || '').trim();
    const cleanCode = (shortCode || '').trim().toUpperCase();

    if (!wsId || !cleanName || !cleanCode) {
      return NextResponse.json({ success: false, error: 'Missing workspace_id, name, or short_code' }, { status: 400 });
    }

    // 1. Duplicate check by name
    const { data: existingName } = await supabaseAdmin
      .from('master_crew_roles')
      .select('id, name, short_code')
      .eq('workspace_id', wsId)
      .ilike('name', cleanName)
      .maybeSingle();

    if (existingName) {
      return NextResponse.json({
        success: false,
        error: `Crew role "${cleanName}" already exists.`,
        duplicate: true,
        existing: existingName
      }, { status: 409 });
    }

    // 2. Duplicate check by short code
    const { data: existingCode } = await supabaseAdmin
      .from('master_crew_roles')
      .select('id, name, short_code')
      .eq('workspace_id', wsId)
      .ilike('short_code', cleanCode)
      .maybeSingle();

    if (existingCode) {
      return NextResponse.json({
        success: false,
        error: `Short code "${cleanCode}" is already in use by role "${existingCode.name}".`,
        duplicate: true,
        existing: existingCode
      }, { status: 409 });
    }

    // 3. Insert new custom role
    const payload = {
      workspace_id: wsId,
      created_by: wsId,
      name: cleanName,
      short_code: cleanCode,
      category,
      is_customized: true,
      is_default: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('master_crew_roles')
      .insert([payload])
      .select()
      .single();

    if (insertErr) {
      console.error('[API workspace/crew-roles POST Error]:', insertErr.message);
      return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, role: inserted });
  } catch (err: any) {
    console.error('[API workspace/crew-roles POST Exception]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/workspace/crew-roles
 * Body: { id, name, short_code, workspace_id, category }
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, short_code: shortCode, workspace_id: wsId, category } = body;

    const cleanName = (name || '').trim();
    const cleanCode = (shortCode || '').trim().toUpperCase();

    if (!id || !cleanName || !cleanCode || !wsId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Fetch existing role
    const { data: existing } = await supabaseAdmin
      .from('master_crew_roles')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', wsId)
      .single();

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
    }

    // Core default roles cannot be edited
    if (isCoreDefaultRole(existing.name)) {
      return NextResponse.json({
        success: false,
        error: `"${existing.name}" is a core permanent studio role and cannot be modified.`
      }, { status: 403 });
    }

    // 2. Duplicate checks against other roles
    const { data: duplicateName } = await supabaseAdmin
      .from('master_crew_roles')
      .select('id, name')
      .eq('workspace_id', wsId)
      .ilike('name', cleanName)
      .neq('id', id)
      .maybeSingle();

    if (duplicateName) {
      return NextResponse.json({
        success: false,
        error: `Another crew role named "${cleanName}" already exists.`,
        duplicate: true
      }, { status: 409 });
    }

    const { data: duplicateCode } = await supabaseAdmin
      .from('master_crew_roles')
      .select('id, name')
      .eq('workspace_id', wsId)
      .ilike('short_code', cleanCode)
      .neq('id', id)
      .maybeSingle();

    if (duplicateCode) {
      return NextResponse.json({
        success: false,
        error: `Short code "${cleanCode}" is already in use by role "${duplicateCode.name}".`,
        duplicate: true
      }, { status: 409 });
    }

    // 3. Update record
    const updates: any = {
      name: cleanName,
      short_code: cleanCode,
      updated_at: new Date().toISOString()
    };
    if (category) updates.category = category;

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('master_crew_roles')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', wsId)
      .select()
      .single();

    if (updateErr) {
      console.error('[API workspace/crew-roles PUT Error]:', updateErr.message);
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, role: updated });
  } catch (err: any) {
    console.error('[API workspace/crew-roles PUT Exception]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/workspace/crew-roles?id=...&workspace_id=...
 */
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    const wsId = req.nextUrl.searchParams.get('workspace_id');

    if (!id || !wsId) {
      return NextResponse.json({ success: false, error: 'Missing id or workspace_id' }, { status: 400 });
    }

    // 1. Fetch role to check if default
    const { data: existing } = await supabaseAdmin
      .from('master_crew_roles')
      .select('id, name, is_default')
      .eq('id', id)
      .eq('workspace_id', wsId)
      .maybeSingle();

    if (existing && (existing.is_default || isCoreDefaultRole(existing.name))) {
      return NextResponse.json({
        success: false,
        error: `"${existing.name}" is a core permanent studio role and cannot be deleted.`
      }, { status: 403 });
    }

    // 2. Delete record
    const { error: delErr } = await supabaseAdmin
      .from('master_crew_roles')
      .delete()
      .eq('id', id)
      .eq('workspace_id', wsId);

    if (delErr) {
      console.error('[API workspace/crew-roles DELETE Error]:', delErr.message);
      return NextResponse.json({ success: false, error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API workspace/crew-roles DELETE Exception]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
