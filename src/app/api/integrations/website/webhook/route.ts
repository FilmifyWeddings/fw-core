import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST webhook handler for personal portfolio websites (WordPress / Elementor / Webflow)
// Expects: POST /api/integrations/website/webhook?key=web_sec_xxxxxx
export async function POST(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const webhookKey = searchParams.get('key');

    if (!webhookKey) {
      console.error('[Website Webhook] Missing secret key parameter.');
      return NextResponse.json({ error: 'Missing webhook secret key' }, { status: 400 });
    }

    // 1. Fetch matching integration credential using service role client (bypasses RLS for public endpoint)
    const { data: credential, error: credErr } = await supabaseAdmin
      .from('integration_credentials')
      .select('user_id, status')
      .eq('webhook_secret_key', webhookKey)
      .maybeSingle();

    if (credErr || !credential) {
      console.error('[Website Webhook] Invalid webhook key or database query issue.', credErr);
      return NextResponse.json({ error: 'Invalid webhook secret key' }, { status: 401 });
    }

    if (credential.status !== 'connected') {
      console.error('[Website Webhook] Integration status is disconnected.');
      return NextResponse.json({ error: 'Integration is inactive' }, { status: 403 });
    }

    const workspaceId = credential.user_id;

    // 2. Parse incoming POST payload
    const body = await req.json();
    console.log('[Website Webhook] Received payload for workspace:', workspaceId, body);

    // Map common fields dynamically
    const name = body.name || body.full_name || body.first_name || 'Website Lead';
    const email = body.email || body.email_address || '';
    const phone = body.phone || body.phone_number || body.mobile || '';

    if (!phone) {
      console.error('[Website Webhook] Ingestion failed: Missing phone number.');
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Check if lead already exists to prevent duplication
    const { data: existingLead } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('phone', phone)
      .maybeSingle();

    if (existingLead) {
      console.log('[Website Webhook] Lead with this phone number already exists:', existingLead.id);
      return NextResponse.json({ success: true, message: 'Lead already exists', id: existingLead.id }, { status: 200 });
    }

    // Evaluate lead score based on budget if supplied
    const budget = body.budget || body.estimated_budget || '';
    const isHighValue = budget.toLowerCase().includes('lakh') || budget.replace(/[^0-9]/g, '') > '100000';
    const score = isHighValue ? 'High-Value 🔥' : 'Warm 👍';

    // 3. Insert lead securely bound under the workspace ID (Law 1 Multi-Tenancy)
    const { data: newLead, error: insertErr } = await supabaseAdmin
      .from('leads')
      .insert({
        workspace_id: workspaceId,
        name,
        email,
        phone,
        source: 'website',
        status: 'new',
        score,
        score_reason: budget ? `Budget of ${budget} detected.` : 'Captured via Website Form Integration.',
        raw_payload: body
      })
      .select('id')
      .single();

    if (insertErr || !newLead) {
      console.error('[Website Webhook] Database lead insertion failed:', insertErr);
      return NextResponse.json({ error: 'Lead insertion failed' }, { status: 500 });
    }

    // 4. Log live activity log
    await supabaseAdmin.from('live_logs').insert({
      workspace_id: workspaceId,
      lead_id: newLead.id,
      event_type: 'webhook_ingested',
      message: `Lead ingested from custom website form: "${name}". Score: ${score}.`,
      metadata: { budget, venue: body.venue || '' }
    });

    // Return immediate success 201 Created (Law 3 Asynchronous Background Workers)
    console.log('[Website Webhook] Ingestion successful:', newLead.id);
    return NextResponse.json({ success: true, id: newLead.id }, { status: 201 });

  } catch (err: any) {
    console.error('[Website Webhook] Internal server error:', err);
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}
