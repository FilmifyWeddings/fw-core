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
    { id: 'new', name: 'Inquiry / New', color: '#3b82f6' },
    { id: 'contacted', name: 'Contacted', color: '#8b5cf6' },
    { id: 'cool', name: 'Cool / Warm', color: '#06b6d4' },
    { id: 'hot', name: 'Hot 🔥', color: '#f43f5e' },
    { id: 'booked', name: 'Booked', color: '#84cc16' },
    { id: 'won', name: 'Won 🎉', color: '#10b981' },
    { id: 'lost', name: 'Lost ❌', color: '#f43f5e' },
  ],
  lead_quick_actions: {
    quotation: true,
    call: true,
    mail: true,
    comments: true,
    google_contact: false,
    wgl_alert: false,
    whatsapp: false,
    followup: false,
    delete: false,
  },
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
  invoice_company_name: 'FILMIFY WEDDINGS',
  invoice_tagline: 'Luxury Wedding Photography & Cinematography',
  invoice_gstin: '27AABCF1234F1ZP',
  invoice_address: 'Mumbai, Maharashtra, India',
  invoice_phone: '+91 98765 43210',
  invoice_email: 'info@filmifyweddings.com',
  invoice_bank_name: 'HDFC Bank',
  invoice_account_no: '50200012345678',
  invoice_ifsc: 'HDFC0001234',
  invoice_account_holder: 'Filmify Weddings LLP',
  invoice_upi_id: 'studio@upi',
  invoice_bank_details: 'HDFC Bank, Acc: 50100987654321, IFSC: HDFC0001234',
  invoice_terms: '1. Advance payment is non-refundable upon client cancellation.\n2. Final deliverables delivered post clearance of balance.',
  invoice_footer_note: 'Thank you for choosing Filmify Weddings! This is a computer-generated invoice.',
  invoice_font: 'Cormorant Garamond',
  invoice_theme_color: '#D4AF37',
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

    // Fetch profile workspace_name
    let profile = null;
    try {
      const { data: p } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email, workspace_name')
        .eq('id', workspaceId)
        .maybeSingle();
      profile = p;
    } catch (_) {}

    // 1. Try fetching from Supabase auth user_metadata (Built-in to Supabase Auth)
    let dbConfig: any = null;
    try {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(workspaceId);
      if (u?.user?.user_metadata?.workspace_settings) {
        dbConfig = u.user.user_metadata.workspace_settings;
      }
    } catch (_) {}

    // 2. Try profiles table if user_metadata is empty
    if (!dbConfig) {
      try {
        const { data: pData } = await supabaseAdmin
          .from('profiles')
          .select('leads_table_preferences')
          .eq('id', workspaceId)
          .maybeSingle();
        if (pData?.leads_table_preferences && typeof pData.leads_table_preferences === 'object') {
          dbConfig = pData.leads_table_preferences;
        }
      } catch (_) {}
    }

    // 3. Try workspace_settings table if still empty
    if (!dbConfig) {
      try {
        const { data: dbSettings } = await supabaseAdmin
          .from('workspace_settings')
          .select('config')
          .eq('workspace_id', workspaceId)
          .maybeSingle();
        if (dbSettings?.config) dbConfig = dbSettings.config;
      } catch (_) {}
    }

    if (!dbConfig) dbConfig = {};

    const mergedSettings = {
      ...DEFAULT_SETTINGS,
      ...dbConfig,
      lead_quick_actions: {
        ...DEFAULT_SETTINGS.lead_quick_actions,
        ...(dbConfig.lead_quick_actions || {}),
      },
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
    let existingConfig: any = null;
    try {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(workspaceId);
      if (u?.user?.user_metadata?.workspace_settings) {
        existingConfig = u.user.user_metadata.workspace_settings;
      }
    } catch (_) {}

    if (!existingConfig) {
      try {
        const { data: pData } = await supabaseAdmin
          .from('profiles')
          .select('leads_table_preferences')
          .eq('id', workspaceId)
          .maybeSingle();
        if (pData?.leads_table_preferences) existingConfig = pData.leads_table_preferences;
      } catch (_) {}
    }

    const currentConfig = existingConfig || DEFAULT_SETTINGS;

    const updatedConfig = {
      ...currentConfig,
      ...newSettings,
      lead_quick_actions: newSettings.lead_quick_actions ? {
        ...DEFAULT_SETTINGS.lead_quick_actions,
        ...(currentConfig.lead_quick_actions || {}),
        ...newSettings.lead_quick_actions,
      } : (currentConfig.lead_quick_actions || DEFAULT_SETTINGS.lead_quick_actions),
      updated_at: new Date().toISOString(),
    };

    let savedSuccessfully = false;

    // Persistence Tier 1: Save to Supabase Auth user_metadata (100% Guaranteed Native Supabase Feature)
    try {
      const { data: userData, error: uErr } = await supabaseAdmin.auth.admin.getUserById(workspaceId);
      const existingMeta = userData?.user?.user_metadata || {};
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(workspaceId, {
        user_metadata: {
          ...existingMeta,
          workspace_settings: updatedConfig
        }
      });
      if (!updateErr) savedSuccessfully = true;
    } catch (_) {}

    // Persistence Tier 2: Try profiles table if column exists
    try {
      const { error: pErr } = await supabaseAdmin
        .from('profiles')
        .update({
          leads_table_preferences: updatedConfig
        })
        .eq('id', workspaceId);
      if (!pErr) savedSuccessfully = true;
    } catch (_) {}

    // Persistence Tier 3: Try workspace_settings table if table exists
    try {
      const { error: upsertErr } = await supabaseAdmin
        .from('workspace_settings')
        .upsert({
          workspace_id: workspaceId,
          config: updatedConfig,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id' });
      if (!upsertErr) savedSuccessfully = true;
    } catch (_) {}

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

    // Return success JSON
    return NextResponse.json({
      success: true,
      workspace_id: workspaceId,
      message: 'Settings saved successfully',
      settings: updatedConfig,
      db_persisted: savedSuccessfully,
    });
  } catch (err: any) {
    console.error('[Settings POST API Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message || 'Failed to save settings' }, { status: 500 });
  }
}
