import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

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

    // 2. Fetch or create moodboard for this client
    let { data: moodboard, error: mbErr } = await supabaseAdmin
      .from('client_moodboards')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle();

    if (!moodboard) {
      const generatedToken = crypto.randomBytes(16).toString('hex');
      const { data: newMb, error: createErr } = await supabaseAdmin
        .from('client_moodboards')
        .insert({
          workspace_id: workspaceId || client.workspace_id,
          client_id: clientId,
          token: generatedToken,
          status: 'DRAFT',
          completion_percentage: 0,
        })
        .select()
        .single();

      if (createErr) {
        console.error('[Moodboard Auto-Create Error]:', createErr);
        return NextResponse.json({ error: createErr.message }, { status: 500 });
      }
      moodboard = newMb;
    }

    return NextResponse.json({
      success: true,
      moodboard,
      client,
    });
  } catch (error: any) {
    console.error('[Moodboard Client GET Route Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

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

    const { data: existing } = await supabaseAdmin
      .from('client_moodboards')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Moodboard not found for this client' }, { status: 404 });
    }

    const updatePayload: Record<string, any> = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    delete updatePayload.id;
    delete updatePayload.client_id;
    delete updatePayload.created_at;

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
