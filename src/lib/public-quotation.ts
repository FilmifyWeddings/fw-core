import { supabaseAdmin } from '@/lib/supabase';
import { getMediaUrl } from '@/lib/r2-storage';

export interface PublicQuotationMeta {
  targetId: string;
  clientName: string;
  eventType: string;
  studioName: string;
  title: string;
  description: string;
  coverPhoto: string;
  eventDate?: string;
  location?: string;
  totalAmount?: number;
  publicToken: string;
}

function cleanCoupleName(name?: string | null): string {
  if (!name) return '';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower === 'rahul & neha' ||
    lower === 'yash & twinkle' ||
    lower === 'wedding - design 1' ||
    lower === 'system default wedding template' ||
    lower === 'default' ||
    lower === 'untitled'
  ) {
    return '';
  }
  return trimmed;
}

export async function resolvePublicQuotation(token: string): Promise<PublicQuotationMeta | null> {
  if (!token) return null;

  try {
    // 1. Fetch quotation record by public_token
    let { data: quote } = await supabaseAdmin
      .from('quotations')
      .select('id, quotation_number, title, client_name, canvas_data, content_json, workspace_id, user_id, financials, status, public_token')
      .eq('public_token', token)
      .maybeSingle();

    // 2. Fallback: check by quotation_number or id
    if (!quote) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
      let fallbackQuery = supabaseAdmin
        .from('quotations')
        .select('id, quotation_number, title, client_name, canvas_data, content_json, workspace_id, user_id, financials, status, public_token');

      if (isUuid) {
        fallbackQuery = fallbackQuery.or(`id.eq.${token},quotation_number.eq.${token}`);
      } else {
        fallbackQuery = fallbackQuery.eq('quotation_number', token);
      }
      const { data: quoteFallback } = await fallbackQuery.maybeSingle();
      if (quoteFallback) {
        quote = quoteFallback;
      }
    }

    // 3. Fallback: check quotation_documents by template_id
    let docRow: any = null;
    const targetIdCandidate = quote?.quotation_number || quote?.id || token;

    const { data: docData } = await supabaseAdmin
      .from('quotation_documents')
      .select('template_id, content_json, lead_id, workspace_id, user_id')
      .or(`template_id.eq.${token},template_id.eq.${targetIdCandidate}`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (docData) {
      docRow = docData;
    }

    const targetId = quote?.quotation_number || quote?.id || docRow?.template_id || token;
    const contentJson = docRow?.content_json || quote?.content_json || quote?.canvas_data || {};
    const coverObj = contentJson?.cover || {};

    // Resolve Client / Couple Name
    const coverCoupleName = cleanCoupleName(coverObj.coupleName);
    const quoteClientName = cleanCoupleName(quote?.client_name);
    const splitGroomBride = (coverObj.groomName && coverObj.brideName)
      ? `${coverObj.groomName} & ${coverObj.brideName}`
      : '';

    let clientName = coverCoupleName || quoteClientName || cleanCoupleName(splitGroomBride);

    // If still empty, check if quote.title has a couple name pattern (e.g. "Harshita & Pooja - Wedding Quotation")
    if (!clientName && quote?.title) {
      const titleMatch = quote.title.split('-')[0]?.trim();
      const cleanedTitleName = cleanCoupleName(titleMatch);
      if (cleanedTitleName) {
        clientName = cleanedTitleName;
      }
    }

    if (!clientName && contentJson?.designName) {
      const designMatch = String(contentJson.designName).split('-')[0]?.trim();
      const cleanedDesignName = cleanCoupleName(designMatch);
      if (cleanedDesignName) {
        clientName = cleanedDesignName;
      }
    }

    if (!clientName) {
      clientName = 'Valued Client';
    }

    // Resolve Event Type
    const eventType = coverObj.eventType || 'Wedding';

    // Resolve Studio / Brand Name
    const workspaceId = quote?.workspace_id || docRow?.workspace_id;
    let studioName = coverObj.brandName || '';

    if (!studioName && workspaceId) {
      const { data: ws } = await supabaseAdmin
        .from('workspaces')
        .select('name, owner_id')
        .eq('id', workspaceId)
        .maybeSingle();

      const profileId = ws?.owner_id || workspaceId;
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('workspace_name, business_name, company, leads_table_preferences')
        .eq('id', profileId)
        .maybeSingle();

      if (profile) {
        studioName =
          profile.leads_table_preferences?.invoice_company_name ||
          profile.business_name ||
          profile.company ||
          ws?.name ||
          profile.workspace_name ||
          '';
      } else if (ws?.name) {
        studioName = ws.name;
      }
    }

    if (!studioName) {
      studioName = 'Filmify Weddings';
    }

    // Resolve Cover Photo
    let rawPhoto = coverObj.photoUrl || coverObj.photo || coverObj.imageUrl || '';
    let coverPhoto = '';
    if (rawPhoto) {
      if (rawPhoto.startsWith('data:image/')) {
        coverPhoto = rawPhoto;
      } else if (rawPhoto.startsWith('http://') || rawPhoto.startsWith('https://')) {
        coverPhoto = rawPhoto;
      } else {
        const mediaPath = getMediaUrl(rawPhoto);
        coverPhoto = mediaPath.startsWith('http')
          ? mediaPath
          : `https://studiocore.in${mediaPath}`;
      }
    }

    // Resolve Title
    let title = '';
    const quoteTitle = quote?.title?.trim();
    if (
      quoteTitle &&
      !quoteTitle.toLowerCase().startsWith('wedding - design') &&
      quoteTitle.toLowerCase() !== 'system default wedding template' &&
      quoteTitle.toLowerCase() !== 'default' &&
      quoteTitle.toLowerCase() !== 'untitled'
    ) {
      title = quoteTitle;
    } else if (clientName && clientName !== 'Valued Client') {
      title = `${clientName} - ${eventType} Quotation`;
    } else {
      title = `${eventType} Quotation & Proposal`;
    }

    // Resolve Description
    const description = `Personalized ${eventType} Quotation & Service Proposal for ${clientName} crafted by ${studioName}. Review customized packages, deliverables, event schedule, and transparent pricing.`;

    const eventDate = coverObj.eventDate || '';
    const location = coverObj.locationName || coverObj.location || '';
    const totalAmount = quote?.financials?.total_amount || 0;

    return {
      targetId,
      clientName,
      eventType,
      studioName,
      title,
      description,
      coverPhoto,
      eventDate,
      location,
      totalAmount,
      publicToken: quote?.public_token || token,
    };
  } catch (err) {
    console.error('[resolvePublicQuotation error]:', err);
    return null;
  }
}
