import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { getGoogleCreds } from '@/lib/google-auth';
import { syncLeadToGoogleContacts } from '@/lib/google-contacts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getAuthWorkspaceId(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (token) {
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await supabaseUser.auth.getUser(token);
    if (user?.id) return user.id;
  }
  const { searchParams } = new URL(req.url);
  return searchParams.get('workspace_id') || searchParams.get('workspaceId') || null;
}

export async function GET(req: NextRequest) {
  try {
    const workspaceId = await getAuthWorkspaceId(req);
    if (!workspaceId) {
      return NextResponse.json({ connected: false, error: 'Missing workspace context' }, { status: 400 });
    }

    // Check integration credentials
    const { data: credsList, error: credsErr } = await supabaseAdmin
      .from('integration_credentials')
      .select('id, user_id, provider, status, config, access_token, refresh_token')
      .eq('user_id', workspaceId)
      .in('provider', ['google_contacts', 'google'])
      .order('updated_at', { ascending: false });

    if (credsErr) {
      console.error('[Google Contacts Status] Database error:', credsErr);
      return NextResponse.json({ connected: false, error: credsErr.message }, { status: 500 });
    }

    const creds = credsList?.find(c => c.provider === 'google_contacts' && c.status === 'connected')
      || credsList?.find(c => c.status === 'connected');

    if (!creds) {
      return NextResponse.json({
        connected: false,
        connectedEmail: '',
        selectedLabelId: '',
        selectedLabelName: '',
        labels: [],
      });
    }

    const config = (creds.config as Record<string, any>) || {};
    const connectedEmail = config.connected_email || '';
    const connectedName = config.connected_name || '';
    const selectedLabelId = config.contacts_label_id || '';
    const selectedLabelName = config.contacts_label_name || '';

    // Fetch user contact groups / labels from Google People API
    let labels: Array<{ id: string; name: string; memberCount: number }> = [];
    try {
      const activeCreds = await getGoogleCreds(supabaseAdmin, workspaceId, 'google_contacts');
      if (activeCreds?.access_token) {
        let token = activeCreds.access_token;
        let res = await fetch('https://people.googleapis.com/v1/contactGroups?pageSize=100', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (res.status === 401) {
          const refreshed = await getGoogleCreds(supabaseAdmin, workspaceId, 'google_contacts', true);
          if (refreshed?.access_token) {
            token = refreshed.access_token;
            res = await fetch('https://people.googleapis.com/v1/contactGroups?pageSize=100', {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
          }
        }

        if (res.ok) {
          const data = await res.json();
          labels = (data.contactGroups || [])
            .filter((g: any) => g.groupType === 'USER_CONTACT_GROUP')
            .map((g: any) => ({
              id: g.resourceName,
              name: g.name,
              memberCount: g.memberCount || 0,
            }));
        }
      }
    } catch (labelsErr) {
      console.warn('[Google Contacts GET] Warning fetching contact groups:', labelsErr);
    }

    return NextResponse.json({
      connected: true,
      connectedEmail,
      connectedName,
      selectedLabelId,
      selectedLabelName,
      labels,
    });
  } catch (err: any) {
    console.error('[Google Contacts GET] Exception:', err);
    return NextResponse.json({ connected: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, workspaceId: bodyWorkspaceId, labelId } = body;

    let workspaceId = bodyWorkspaceId;
    if (!workspaceId) {
      workspaceId = await getAuthWorkspaceId(req);
    }

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Missing leadId' }, { status: 400 });
    }

    // Load Lead to sync
    const { data: lead, error: leadErr } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .maybeSingle();

    if (leadErr || !lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const targetWorkspaceId = workspaceId || lead.workspace_id || lead.tenant_id;
    if (!targetWorkspaceId) {
      return NextResponse.json({ success: false, error: 'Missing workspace context' }, { status: 400 });
    }

    // Call real sync function with isolated workspace and optional override labelId
    const result = await syncLeadToGoogleContacts(targetWorkspaceId, lead, labelId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        contactId: result.contactId,
        duplicate: result.duplicate,
        message: result.message,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.message,
      }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Google contacts sync error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
