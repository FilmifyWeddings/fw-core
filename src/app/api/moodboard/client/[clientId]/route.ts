import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// GET: Fetch all moodboards for this client
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const { searchParams } = new URL(req.url);
    const requestedWorkspaceId = searchParams.get('workspace_id');

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    // 1. Verify Authentication
    const authResult = await verifyMetaAuth(req, requestedWorkspaceId);
    let workspaceId = authResult.workspaceId || requestedWorkspaceId || authResult.userId;

    // Fetch client to confirm workspace ownership
    const { data: client, error: clientErr } = await supabaseAdmin
      .from('workspace_clients')
      .select('*')
      .eq('id', clientId)
      .maybeSingle();

    if (clientErr || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (!workspaceId) {
      workspaceId = client.workspace_id;
    }

    // 2. Fetch all moodboards for this client
    let { data: moodboards, error: mbErr } = await supabaseAdmin
      .from('client_moodboards')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });

    if (mbErr) {
      console.warn('[Moodboard Client GET Warning]:', mbErr.message);
    }

    // If none exists, return empty list so the user can click "Add Moodboard" in center
    if (!moodboards) {
      moodboards = [];
    }

    return NextResponse.json({
      success: true,
      moodboards,
      moodboard: moodboards.length > 0 ? moodboards[0] : null,
      client,
    });
  } catch (error: any) {
    console.error('[Moodboard Client GET Route Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new event moodboard OR update an existing one
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    const body = await req.json();

    // Fetch client to ensure workspace_id
    const { data: client, error: clientErr } = await supabaseAdmin
      .from('workspace_clients')
      .select('id, workspace_id, event_type, name')
      .eq('id', clientId)
      .maybeSingle();

    if (clientErr || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Action 1: Create a NEW moodboard for this client (e.g. Wedding, Haldi, Reception)
    if (body.action === 'create' || (!body.id && !body.moodboard_id && body.event_type)) {
      const generatedToken = crypto.randomBytes(16).toString('hex');
      const eventType = body.event_type || client.event_type || 'Wedding';
      const title = body.title || `${eventType} Moodboard`;

      const { data: newMb, error: createErr } = await supabaseAdmin
        .from('client_moodboards')
        .insert({
          workspace_id: client.workspace_id,
          client_id: clientId,
          token: generatedToken,
          event_type: eventType,
          title: title,
          status: 'DRAFT',
          completion_percentage: 0,
          couple_photos: body.couple_photos || [],
          shoot_coordination: body.shoot_coordination || {
            bride_coordinator: { name: '', phone: '', relation: 'Bride Coordinator' },
            groom_coordinator: { name: '', phone: '', relation: 'Groom Coordinator' },
          },
          shoot_places: body.shoot_places || [],
          photo_references: body.photo_references || [],
          video_references: body.video_references || [],
        })
        .select()
        .single();

      if (createErr) {
        console.error('[Moodboard Create Error]:', createErr);
        return NextResponse.json({ error: createErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        moodboard: newMb,
        message: 'New event moodboard created successfully.',
      });
    }

    // Action 2: Update existing moodboard by ID or by Client ID
    const targetMoodboardId = body.id || body.moodboard_id;

    let query = supabaseAdmin.from('client_moodboards').select('*');
    if (targetMoodboardId) {
      query = query.eq('id', targetMoodboardId);
    } else {
      query = query.eq('client_id', clientId);
    }

    const { data: existing, error: existErr } = await query.maybeSingle();

    if (existErr || !existing) {
      return NextResponse.json({ error: 'Moodboard not found' }, { status: 404 });
    }

    const updatePayload: Record<string, any> = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    delete updatePayload.id;
    delete updatePayload.moodboard_id;
    delete updatePayload.action;
    delete updatePayload.client_id;
    delete updatePayload.created_at;

    if (body.bride_coordinators !== undefined) {
      updatePayload.bride_coordinator = body.bride_coordinators;
      delete updatePayload.bride_coordinators;
    }
    if (body.groom_coordinators !== undefined) {
      updatePayload.groom_coordinator = body.groom_coordinators;
      delete updatePayload.groom_coordinators;
    }
    if (body.payment_contacts !== undefined) {
      updatePayload.payment_contact = body.payment_contacts;
      delete updatePayload.payment_contacts;
    }
    if (body.inspiration_links !== undefined) {
      updatePayload.photo_references = body.inspiration_links;
      delete updatePayload.inspiration_links;
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('client_moodboards')
      .update(updatePayload)
      .eq('id', existing.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      moodboard: updated,
    });
  } catch (error: any) {
    console.error('[Moodboard Client POST Route Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Delete a specific moodboard
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const { searchParams } = new URL(req.url);
    const moodboardId = searchParams.get('id');

    if (!clientId || !moodboardId) {
      return NextResponse.json({ error: 'Client ID and Moodboard ID are required' }, { status: 400 });
    }

    const { error: delErr } = await supabaseAdmin
      .from('client_moodboards')
      .delete()
      .eq('id', moodboardId)
      .eq('client_id', clientId);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Moodboard deleted successfully.',
    });
  } catch (error: any) {
    console.error('[Moodboard Client DELETE Route Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
