import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

const DEFAULT_SETTINGS = {
  // Leads & Pipeline
  lead_default_owner: 'Unassigned',
  lead_budget_ranges: ['₹50k - ₹1L', '₹1L - ₹2.5L', '₹2.5L - ₹5L', '₹5L+'],
  lead_sources: [
    { id: 's1', name: 'Facebook Ads', color: '#1A73E8' },
    { id: 's2', name: 'Instagram Ads', color: '#8E24AA' },
    { id: 's3', name: 'Google Ads', color: '#C5221F' },
    { id: 's4', name: 'Website', color: '#137333' },
    { id: 's5', name: 'Referral', color: '#F4511E' },
    { id: 's6', name: 'WhatsApp Direct', color: '#137333' },
  ],
  lead_stages: [
    { id: 'new', name: 'Inquiry / New', color: '#1A73E8' },
    { id: 'contacted', name: 'Contacted', color: '#8E24AA' },
    { id: 'cool', name: 'Cool / Warm', color: '#F4511E' },
    { id: 'hot', name: 'Hot 🔥', color: '#C5221F' },
    { id: 'booked', name: 'Booked', color: '#137333' },
    { id: 'won', name: 'Won 🎉', color: '#137333' },
    { id: 'lost', name: 'Lost ❌', color: '#616161' },
  ],
  lead_auto_assign_strategy: 'round_robin',
  lead_auto_assign_enabled: false,

  // Quotations & Proposals
  quotation_pdf_theme: 'royal_gold',
  quotation_pdf_terms: 'Deliverables will be compiled and sent within 45 days of wedding event completion.',
  quotation_default_expiry_days: 14,
  quotation_currency: 'INR',
  contract_clauses: '1. Standard contract terms apply for all assignments.\n2. Final deliverables delivered post clearance.',

  // Finance & Invoices
  sequence_invoices_prefix: 'INV-2026-',
  sequence_projects_prefix: 'PRJ-2026-',
  invoice_gst_percent: 18,
  invoice_payment_terms: '50% Retainer for booking lock, 50% on Event Date',
  invoice_upi_id: 'studio@upi',
  invoice_bank_details: 'HDFC Bank, Acc: 50100987654321, IFSC: HDFC0001234',
  expense_categories: ['Marketing', 'Crew Travel', 'Equipment', 'Editor Pay', 'Misc'],

  // Attendance & Geofence
  geofence_radius_meters: 100,
  shift_start_time: '09:30',
  grace_period_minutes: 15,
  break_limit_minutes: 60,

  // Meta & Integrations
  meta_auto_sync_enabled: true,
  meta_default_whatsapp_group: null,

  // Team
  lead_owners: ['Unassigned', 'Sahil Dhonde', 'Sushant Nawale', 'Production Team'],
};

/**
 * GET /api/settings?workspace_id=XXX
 * Returns complete page-wise settings for the authenticated workspace.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedWorkspaceId = searchParams.get('workspace_id');

    const authResult = await verifyMetaAuth(req, requestedWorkspaceId);
    let workspaceId = authResult.workspaceId || requestedWorkspaceId || '';

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'A valid workspace_id or auth session is required' }, { status: 401 });
    }

    // Fetch from workspace_settings
    const { data: dbSettings } = await supabaseAdmin
      .from('workspace_settings')
      .select('config')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    // Fetch profile workspace_name
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, workspace_name')
      .eq('id', workspaceId)
      .maybeSingle();

    const mergedSettings = {
      ...DEFAULT_SETTINGS,
      ...(dbSettings?.config || {}),
      studio_name: profile?.workspace_name || 'Studio Core Workspace',
      studio_email: profile?.email || '',
    };

    return NextResponse.json({
      success: true,
      workspace_id: workspaceId,
      settings: mergedSettings,
    });
  } catch (err: any) {
    console.error('[Settings GET API Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

/**
 * POST /api/settings
 * Body: { workspace_id?: string, settings: Partial<typeof DEFAULT_SETTINGS> }
 * Saves workspace configuration to Supabase.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedWorkspaceId = body.workspace_id;

    const authResult = await verifyMetaAuth(req, requestedWorkspaceId);
    let workspaceId = authResult.workspaceId || requestedWorkspaceId || '';

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'A valid workspace_id or auth session is required' }, { status: 401 });
    }
    const newSettings = body.settings || {};

    // Fetch existing settings
    const { data: existing } = await supabaseAdmin
      .from('workspace_settings')
      .select('config')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    const updatedConfig = {
      ...(existing?.config || DEFAULT_SETTINGS),
      ...newSettings,
      updated_at: new Date().toISOString(),
    };

    // Upsert into workspace_settings
    const { error: upsertErr } = await supabaseAdmin
      .from('workspace_settings')
      .upsert({
        workspace_id: workspaceId,
        config: updatedConfig,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id' });

    if (upsertErr) {
      console.warn('[Workspace Settings Upsert Warning]:', upsertErr.message);
    }

    // Sync lead_stages to crm_stages table in Supabase
    if (Array.isArray(newSettings.lead_stages) && newSettings.lead_stages.length > 0) {
      try {
        await supabaseAdmin
          .from('crm_stages')
          .delete()
          .eq('workspace_id', workspaceId);

        const stagesToInsert = newSettings.lead_stages.map((st: any, idx: number) => ({
          workspace_id: workspaceId,
          name: st.name,
          color: st.color || '#3b82f6',
          position: typeof st.position === 'number' ? st.position : idx,
        }));

        await supabaseAdmin
          .from('crm_stages')
          .insert(stagesToInsert);
      } catch (stErr: any) {
        console.warn('[Settings Stages DB Sync Warning]:', stErr.message);
      }
    }

    // Update profile workspace_name if provided
    if (newSettings.studio_name) {
      await supabaseAdmin
        .from('profiles')
        .update({ workspace_name: newSettings.studio_name, updated_at: new Date().toISOString() })
        .eq('id', workspaceId);
    }

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
      settings: updatedConfig,
    });
  } catch (err: any) {
    console.error('[Settings POST API Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message || 'Failed to save settings' }, { status: 500 });
  }
}
