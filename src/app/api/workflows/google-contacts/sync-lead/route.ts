import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { syncLeadToGoogleContacts } from '@/lib/google-contacts';

export const maxDuration = 45;
export const runtime = 'nodejs';

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  
  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error } = await supabaseUser.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function POST(req: NextRequest) {
  try {
    let workspaceId: string | null = null;
    
    // Check if called with frontend User authentication
    const user = await getAuthUser(req);
    if (user) {
      workspaceId = user.id;
    }

    const { leadId, workspaceId: bodyWorkspaceId } = await req.json();
    
    if (!workspaceId && bodyWorkspaceId) {
      workspaceId = bodyWorkspaceId;
    }

    if (!leadId) {
      return NextResponse.json({ error: 'Missing leadId context' }, { status: 400 });
    }

    // 1. Fetch Lead
    let leadQuery = supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId);
    
    if (workspaceId) {
      leadQuery = leadQuery.eq('workspace_id', workspaceId);
    }

    const { data: lead, error: leadErr } = await leadQuery.maybeSingle();

    if (leadErr || !lead) {
      console.error(`[Google Contacts Sync] Lead not found: ${leadId}`);
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const targetWorkspaceId = workspaceId || lead.workspace_id;
    if (!targetWorkspaceId) {
      return NextResponse.json({ error: 'No workspace context for lead' }, { status: 400 });
    }

    // 2. Perform isolated sync to user's Google Contacts
    const result = await syncLeadToGoogleContacts(targetWorkspaceId, lead);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        contactId: result.contactId,
        duplicate: result.duplicate,
        message: result.message 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.message 
      }, { status: 400 });
    }
  } catch (err: any) {
    console.error('[POST /api/workflows/google-contacts/sync-lead] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
