import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

function sanitizeWhatsappLink(val?: string | null): string {
  const trimmed = String(val || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\/chat\.whatsapp\.com\/(\d+|[^/]*@g\.us)\/?$/i.test(trimmed)) return '';
  if (/^(\d+|[^/]*@g\.us)$/.test(trimmed)) return '';
  return trimmed;
}

function sanitizeWhatsappGroupId(val?: string | null): string {
  const trimmed = String(val || '').trim();
  if (!trimmed) return '';
  return trimmed.toLowerCase().endsWith('@g.us') ? trimmed : '';
}

function deriveSixDigitPin(client: { id?: string; phone?: string | null }): string {
  const digits = (client.phone || '').replace(/[^0-9]/g, '');
  if (digits.length >= 6) {
    const candidate = digits.slice(-6);
    if (candidate !== '123456' && candidate !== '000000') return candidate;
  }
  const seed = String(client.id || '000000');
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const code = 100000 + (Math.abs(hash) % 900000);
  return code === 123456 ? '123457' : String(code);
}

function parseClientNotesExtended(client: any) {
  const fallbackCode = `CL-${(client.id || '0000').slice(0, 6).toUpperCase()}`;
  const defaultPin = deriveSixDigitPin(client);
  const defaultToken = client.id || `token_${Date.now()}`;

  let client_code = fallbackCode;
  let whatsapp_group_link = '';
  let whatsapp_group_id = '';
  let portal_token = defaultToken;
  let portal_pin = defaultPin;
  let raw_stored_pin = '';
  let portal_enabled = true;
  let project_manager_id = client.project_manager_id || '';
  let project_manager_name = client.project_manager_name || '';
  let project_manager_email = client.project_manager_email || '';
  let project_manager_phone = client.project_manager_phone || '';

  let events: any[] = [];
  let plain_notes = client.notes || '';
  let studio_comments: any[] = [];

  if (client.notes && typeof client.notes === 'string') {
    const rawTrimmed = client.notes.trim();
    const fBrace = rawTrimmed.indexOf('{');
    const lBrace = rawTrimmed.lastIndexOf('}');
    if (fBrace !== -1 && lBrace !== -1 && lBrace > fBrace) {
      try {
        const parsed = JSON.parse(rawTrimmed.substring(fBrace, lBrace + 1));
        if (parsed.client_code) client_code = parsed.client_code;
        if (parsed.whatsapp_group_link) whatsapp_group_link = sanitizeWhatsappLink(parsed.whatsapp_group_link);
        if (parsed.whatsapp_group_id) whatsapp_group_id = sanitizeWhatsappGroupId(parsed.whatsapp_group_id);
        if (parsed.portal_token) portal_token = parsed.portal_token;
        if (parsed.portal_pin) {
          raw_stored_pin = String(parsed.portal_pin).trim();
          portal_pin = /^\d{6}$/.test(raw_stored_pin) ? raw_stored_pin : defaultPin;
        }
        if (typeof parsed.portal_enabled === 'boolean') portal_enabled = parsed.portal_enabled;
        if (!project_manager_id && parsed.project_manager_id) project_manager_id = parsed.project_manager_id;
        if (!project_manager_name && parsed.project_manager_name) project_manager_name = parsed.project_manager_name;
        if (!project_manager_email && parsed.project_manager_email) project_manager_email = parsed.project_manager_email;
        if (!project_manager_phone && parsed.project_manager_phone) project_manager_phone = parsed.project_manager_phone;
        if (Array.isArray(parsed.events)) events = parsed.events;
        if (Array.isArray(parsed.studio_comments)) studio_comments = parsed.studio_comments;
        plain_notes = parsed.notes || parsed.plain_notes || '';
      } catch (_) {}
    }
  }

  return {
    client_code,
    whatsapp_group_link,
    whatsapp_group_id,
    portal_token,
    portal_pin,
    raw_stored_pin,
    portal_enabled,
    project_manager_id,
    project_manager_name,
    project_manager_email,
    project_manager_phone,
    events,
    plain_notes,
    studio_comments
  };
}

function verifyPortalPin(submittedPin: string | null | undefined, portalPin: string, rawStoredPin?: string): boolean {
  const cleanSubmitted = String(submittedPin || '').trim();
  if (!cleanSubmitted) return false;
  if (cleanSubmitted === String(portalPin).trim()) return true;
  if (rawStoredPin && rawStoredPin !== '1234' && rawStoredPin !== '123456' && cleanSubmitted === rawStoredPin) {
    return true;
  }
  return false;
}

async function resolveClientByToken(token: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
  let clientRow: any = null;

  if (isUuid) {
    const { data } = await supabaseAdmin
      .from('workspace_clients')
      .select('*')
      .eq('id', token)
      .maybeSingle();
    clientRow = data;
  }

  if (!clientRow) {
    const { data: matchedClient } = await supabaseAdmin
      .from('workspace_clients')
      .select('*')
      .or(`notes.ilike.%"portal_token":"${token}"%,notes.ilike.%"client_code":"${token}"%`)
      .limit(1)
      .maybeSingle();
    clientRow = matchedClient;
  }

  if (!clientRow) {
    const { data: matchedCode } = await supabaseAdmin
      .from('workspace_clients')
      .select('*')
      .ilike('notes', `%"client_code":"${token.toUpperCase()}"%`)
      .limit(1)
      .maybeSingle();
    clientRow = matchedCode;
  }

  return clientRow;
}

async function resolveStudioBranding(clientRow: any) {
  let studioName = 'Filmify Weddings';
  let studioLogo = '';
  let studioPhone = '';
  let studioEmail = '';
  let studioWebsite = '';
  let studioInstagram = '';

  try {
    let ownerId = clientRow.user_id;

    if (clientRow.workspace_id) {
      const { data: wsData } = await supabaseAdmin
        .from('workspaces')
        .select('id, name, logo_url, owner_id')
        .eq('id', clientRow.workspace_id)
        .maybeSingle();

      if (wsData) {
        if (wsData.name) studioName = wsData.name;
        if (wsData.logo_url) studioLogo = wsData.logo_url;
        if (wsData.owner_id) ownerId = wsData.owner_id;
      }
    }

    if (ownerId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', ownerId)
        .maybeSingle();

      if (profile) {
        const prefs = (profile.leads_table_preferences as any) || {};
        const settings = (profile.studio_settings as any) || {};

        studioName =
          profile.business_name ||
          profile.company ||
          prefs.invoice_company_name ||
          profile.workspace_name ||
          studioName ||
          profile.full_name ||
          'Filmify Weddings';

        studioLogo = profile.logo_url || studioLogo || prefs.invoice_qr_image_url || '';
        studioPhone = profile.phone || prefs.invoice_phone || settings.phone || '';
        studioEmail = profile.email || prefs.invoice_email || settings.email || '';
        studioWebsite = profile.website || prefs.invoice_website || settings.website || '';
        studioInstagram = profile.instagram_handle || profile.instagram || prefs.invoice_instagram || settings.instagram || '';
      }
    }
  } catch (brandErr) {
    console.warn('[Client Portal API] Studio branding lookup warning:', brandErr);
  }

  return {
    name: studioName,
    logo: studioLogo,
    phone: studioPhone,
    email: studioEmail,
    website: studioWebsite,
    instagram: studioInstagram,
  };
}

async function buildFullPortalPayload(clientRow: any, ext: ReturnType<typeof parseClientNotesExtended>, studioInfo: any) {
    // 3. Fetch Post-Production, Finance, and Moodboard in parallel
    const [postProdRes, financeRes, moodboardRes] = await Promise.all([
      supabaseAdmin.from('post_production_projects').select('*').eq('client_id', clientRow.id).maybeSingle(),
      supabaseAdmin.from('client_finance_records').select('*').eq('client_id', clientRow.id).maybeSingle(),
      supabaseAdmin.from('client_moodboards').select('*').eq('client_id', clientRow.id).maybeSingle(),
    ]);

    // 4. Fetch Quotations & Quotation Documents
    const allQuotes: any[] = [];
    let leadFinalQuoteId: string | null = null;

    if (clientRow.lead_id) {
      // Check quotation_documents by lead_id
      const { data: qDocs } = await supabaseAdmin
        .from('quotation_documents')
        .select('*')
        .eq('lead_id', clientRow.lead_id)
        .order('created_at', { ascending: false });

      if (qDocs && qDocs.length > 0) {
        allQuotes.push(...qDocs);
      }

      // Check leads table for final_quotation_id
      try {
        const { data: leadRow } = await supabaseAdmin
          .from('leads')
          .select('id, final_quotation_id, quotation_id')
          .eq('id', clientRow.lead_id)
          .maybeSingle();

        if (leadRow?.final_quotation_id) {
          leadFinalQuoteId = leadRow.final_quotation_id;
          const already = allQuotes.some(q => q.template_id === leadFinalQuoteId || q.id === leadFinalQuoteId);
          if (!already) {
            const { data: specificQuote } = await supabaseAdmin
              .from('quotation_documents')
              .select('*')
              .or(`id.eq.${leadFinalQuoteId},template_id.eq.${leadFinalQuoteId}`)
              .maybeSingle();

            if (specificQuote) {
              allQuotes.push({ ...specificQuote, is_final: true });
            }
          }
        }
      } catch (_) {}
    }

    // Also check quotation_documents by client_id = lead_id column
    const { data: qClientDocs } = await supabaseAdmin
      .from('quotation_documents')
      .select('*')
      .eq('lead_id', clientRow.id)
      .order('created_at', { ascending: false });

    if (qClientDocs && qClientDocs.length > 0) {
      allQuotes.push(...qClientDocs);
    }

    // Also check quotations table
    try {
      let qQuery = supabaseAdmin.from('quotations').select('*');
      if (clientRow.lead_id) {
        qQuery = qQuery.or(`client_id.eq.${clientRow.id},client_id.eq.${clientRow.lead_id}`);
      } else {
        qQuery = qQuery.eq('client_id', clientRow.id);
      }

      const { data: qRows } = await qQuery.order('created_at', { ascending: false });
      if (qRows && qRows.length > 0) {
        qRows.forEach((q: any) => {
          const key = q.quotation_number || q.id;
          const already = allQuotes.some(ex => ex.id === q.id || ex.template_id === key);
          if (!already) {
            allQuotes.push({
              id: q.id,
              template_id: key,
              title: q.title || `${clientRow.name} Quotation`,
              is_final: q.status === 'accepted' || q.status === 'final' || q.is_final === true,
              total_amount: q.total_amount || clientRow.total_package_amount,
              content_json: q.content_json || {}
            });
          }
        });
      }
    } catch (_) {}

    // Deduplicate quotations
    const uniqueQuotesMap = new Map<string, any>();
    allQuotes.forEach((q, idx) => {
      const key = q.template_id || q.id;
      if (!uniqueQuotesMap.has(key)) {
        const isMarkedFinal = Boolean(
          q.is_final || 
          q.content_json?.is_final === true || 
          (leadFinalQuoteId && (q.template_id === leadFinalQuoteId || q.id === leadFinalQuoteId))
        );
        uniqueQuotesMap.set(key, {
          ...q,
          template_id: key,
          version: q.version || (idx + 1),
          is_final: isMarkedFinal,
          total_amount: q.total_amount || q.content_json?.pricingPage?.finalAmount || q.content_json?.pricing?.finalAmount || clientRow.total_package_amount,
          updated_at: q.updated_at || q.created_at || new Date().toISOString()
        });
      }
    });

    let quotationDocs = Array.from(uniqueQuotesMap.values());
    if (quotationDocs.length > 0 && !quotationDocs.some(q => q.is_final)) {
      quotationDocs[0].is_final = true;
    }
    quotationDocs.sort((a, b) => (b.is_final ? 1 : 0) - (a.is_final ? 1 : 0));

    // 5. Fetch Team Manager / Bookings Sub-Events (fw_projects & fw_sub_events)
    let fwProject = null;
    try {
      let projQuery = supabaseAdmin
        .from('fw_projects')
        .select(`
          *,
          fw_sub_events (
            *,
            fw_assignments (*)
          )
        `);

      if (clientRow.lead_id) {
        projQuery = projQuery.or(`client_id.eq.${clientRow.id},lead_id.eq.${clientRow.lead_id}`);
      } else {
        projQuery = projQuery.eq('client_id', clientRow.id);
      }

      const { data: pData } = await projQuery.maybeSingle();
      if (pData) fwProject = pData;
    } catch (fwErr) {
      console.warn('[Client Portal API] fw_projects fetch warning:', fwErr);
    }

    const { raw_stored_pin: _rawPin, portal_pin: _hiddenPin, ...publicExt } = ext;

    return {
      ok: true,
      client: clientRow,
      ext: publicExt,
      studioInfo,
      quotationDocs,
      postProd: postProdRes.data || null,
      finance: financeRes.data || null,
      moodboard: moodboardRes.data || null,
      fwProject
    };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const token = resolvedParams?.token;

    if (!token) {
      return NextResponse.json({ error: 'Token parameter is missing' }, { status: 400 });
    }

    const clientRow = await resolveClientByToken(token);
    if (!clientRow) {
      return NextResponse.json({
        error: 'Client wedding portal not found or link has expired.'
      }, { status: 404 });
    }

    const ext = parseClientNotesExtended(clientRow);
    const studioInfo = await resolveStudioBranding(clientRow);

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode');
    const pinRequired = ext.portal_enabled !== false;

    if (mode === 'gate') {
      return NextResponse.json({
        ok: true,
        mode: 'gate',
        pinRequired,
        clientSummary: {
          id: clientRow.id,
          name: clientRow.name,
          event_type: clientRow.event_type,
          client_code: ext.client_code,
        },
        studioInfo,
      });
    }

    const submittedPin = searchParams.get('pin') || req.headers.get('x-portal-pin');
    if (pinRequired && !verifyPortalPin(submittedPin, ext.portal_pin, ext.raw_stored_pin)) {
      return NextResponse.json({
        ok: false,
        requiresPin: true,
        pinRequired: true,
        clientSummary: {
          id: clientRow.id,
          name: clientRow.name,
          event_type: clientRow.event_type,
          client_code: ext.client_code,
        },
        studioInfo,
        error: submittedPin ? 'Incorrect PIN. Please check the PIN shared by your studio.' : 'PIN required to access this portal.',
      }, { status: 401 });
    }

    const payload = await buildFullPortalPayload(clientRow, ext, studioInfo);
    return NextResponse.json(payload);

  } catch (err: any) {
    console.error('[Client Portal API ERROR]:', err);
    return NextResponse.json({
      error: 'Internal Server Error',
      detail: err.message || 'Unable to load client portal'
    }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const token = resolvedParams?.token;

    if (!token) {
      return NextResponse.json({ error: 'Token parameter is missing' }, { status: 400 });
    }

    const clientRow = await resolveClientByToken(token);
    if (!clientRow) {
      return NextResponse.json({
        error: 'Client wedding portal not found or link has expired.'
      }, { status: 404 });
    }

    const ext = parseClientNotesExtended(clientRow);
    const body = await req.json().catch(() => ({}));
    const submittedPin = body?.pin ?? req.headers.get('x-portal-pin') ?? '';
    const pinRequired = ext.portal_enabled !== false;

    if (pinRequired && !verifyPortalPin(submittedPin, ext.portal_pin, ext.raw_stored_pin)) {
      return NextResponse.json({
        ok: false,
        error: 'Incorrect PIN. Please check the 6-digit PIN shared by your studio.',
      }, { status: 401 });
    }

    const studioInfo = await resolveStudioBranding(clientRow);
    const payload = await buildFullPortalPayload(clientRow, ext, studioInfo);
    return NextResponse.json(payload);
  } catch (err: any) {
    console.error('[Client Portal API POST ERROR]:', err);
    return NextResponse.json({
      error: 'Internal Server Error',
      detail: err.message || 'Unable to unlock client portal'
    }, { status: 500 });
  }
}
