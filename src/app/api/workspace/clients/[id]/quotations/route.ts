import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';
import { loadClientQuotationsFast } from '@/lib/client-quotations-loader';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workspace/clients/[id]/quotations?workspace_id=...
 * Ultra-fast dedicated endpoint for client quotation versions & final status (<100ms, ~5-15KB).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const clientIdOrCode = resolvedParams?.id;
    if (!clientIdOrCode) {
      return NextResponse.json({ error: 'Missing client identifier' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const requestedWsId = searchParams.get('workspace_id');

    const auth = await verifyMetaAuth(req, requestedWsId);
    if (!auth.authorized) {
      return auth.errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveWsId = auth.workspaceId || requestedWsId;
    if (!effectiveWsId) {
      return NextResponse.json({ error: 'Missing workspace identifier' }, { status: 400 });
    }

    const clientCols = 'id, lead_id, workspace_id, user_id, name, phone, total_package_amount, final_quotation_id, notes';

    let foundClient: any = null;
    const { data: directClient } = await supabaseAdmin
      .from('workspace_clients')
      .select(clientCols)
      .eq('id', clientIdOrCode)
      .maybeSingle();

    if (directClient) {
      foundClient = directClient;
    } else {
      const { data: wsClients } = await supabaseAdmin
        .from('workspace_clients')
        .select(clientCols)
        .or(`workspace_id.eq.${effectiveWsId},user_id.eq.${effectiveWsId}`);

      if (wsClients && wsClients.length > 0) {
        foundClient = wsClients.find((c: any) => {
          if (c.id === clientIdOrCode) return true;
          if (c.notes && typeof c.notes === 'string') {
            const match = c.notes.match(/\[code:([^\]]+)\]/i);
            if (match && match[1].toLowerCase() === clientIdOrCode.toLowerCase()) return true;
          }
          return false;
        });
      }
    }

    if (!foundClient) {
      return NextResponse.json({ error: 'Client record not found in workspace' }, { status: 404 });
    }

    const clientWsId = foundClient.workspace_id || foundClient.user_id || effectiveWsId;
    if (clientWsId && clientWsId !== effectiveWsId && auth.workspaceId !== clientWsId) {
      const crossAuth = await verifyMetaAuth(req, clientWsId);
      if (!crossAuth.authorized) {
        return NextResponse.json({ error: 'Access denied to this client record' }, { status: 403 });
      }
    }

    const { quotationDocs, resolvedLeadId, finalTargetId } = await loadClientQuotationsFast(
      foundClient,
      clientWsId
    );

    return NextResponse.json(
      {
        success: true,
        clientId: foundClient.id,
        leadId: resolvedLeadId,
        finalTargetId,
        quotationDocs,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    console.error('[API /workspace/clients/[id]/quotations GET] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch client quotations' },
      { status: 500 }
    );
  }
}
