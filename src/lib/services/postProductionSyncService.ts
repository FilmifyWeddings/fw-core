import { supabase } from '@/lib/supabase';
import { PostProductionDeliverable } from '@/app/workspace/post-production/components/DeliverableCategorySection';


export interface PostProductionComment {
  id: string;
  deliverable_id: string;
  user_id?: string;
  author_name: string;
  comment_text: string;
  created_at: string;
}

/**
 * Categorize a deliverable item into Photos, Videos, or Albums.
 */
export function categorizeDeliverable(text: string): 'Photos' | 'Videos' | 'Albums' {
  const t = (text || '').toLowerCase();
  // Photo Calendar, Wall Calendar, Table Calendar, etc. are Album / Print deliverables, NOT Photos!
  if (/calendar/i.test(t)) return 'Albums';
  if (/album|book|photobook|sheet|print|flush\s*mount|magazine|box|frame/i.test(t)) return 'Albums';
  if (/video|film|teaser|reel|cinemat|trailer|footage|highlight/i.test(t)) return 'Videos';
  return 'Photos';
}

/**
 * Determine the specific event segment (Pre-Wedding, Wedding, Haldi, Sangeet, Reception, etc.)
 */
export function determineDeliverableSegment(eventTitle: string, itemText: string): string {
  const et = (eventTitle || '').trim();
  const etLow = et.toLowerCase();
  const combined = (eventTitle + ' ' + itemText).toLowerCase();

  if (/pre-wedding|pre\s*wedding|pre\s*shoot/i.test(combined) || /pre-wedding|pre\s*wedding/i.test(etLow)) {
    return 'Pre-Wedding';
  }
  if (/wedding/i.test(etLow) || /wedding/i.test(combined)) {
    return 'Wedding';
  }
  if (/reception/i.test(etLow)) {
    return 'Reception';
  }
  if (/haldi/i.test(etLow)) {
    return 'Haldi';
  }
  if (/mehendi|mehndi/i.test(etLow)) {
    return 'Mehendi';
  }
  if (/sangeet/i.test(etLow)) {
    return 'Sangeet';
  }
  if (/engagement|roka|ring\s*ceremony/i.test(etLow)) {
    return 'Engagement';
  }
  if (/cocktail/i.test(etLow)) {
    return 'Cocktail';
  }
  if (et) {
    return et.charAt(0).toUpperCase() + et.slice(1);
  }
  return 'Wedding';
}

/**
 * Cleans a raw deliverable string into a refined title, stripping redundant prefixes/suffixes.
 */
export function cleanDeliverableTitle(text: string): string {
  if (!text) return '';
  let t = text.trim();

  // Strip leading prefixes like "Complimentary ", "Free ", "Bonus "
  t = t.replace(/^(?:complimentary|free|bonus)\s+/i, '');

  // Strip leading list enumeration like "1. ", "1) ", "• ", "- ", "* "
  t = t.replace(/^[\s•*–-]*\d+[\.)\]]\s*/, '');
  t = t.replace(/^[\s•*–-]+\s*/, '');

  // Strip leading duration like "1-2 min ", "1-2 Minute ", "15-20 min ", "3-4 min ", "2-3 Hours "
  t = t.replace(/^\d+(?:\s*(?:-|to)\s*\d+|\+)?\s*(?:minutes?|mins?|hours?|hrs?|seconds?|secs?)\s*(?:video|film)?\s*/i, '');

  // Strip leading count for reels or specific deliverables (e.g. "3 Instagram Reels" -> "Instagram Reels", "1 Teaser Video" -> "Teaser Video")
  t = t.replace(/^\d+\s+(?=(?:teaser|film|reels?|video|albums?|books?|calendars?|highlights?|instagram\s+reels?|drone)\b)/i, '');

  // Remove parenthetical durations or specs like "(1-2 Min)", "(15-20 Min)", "(40 Pages)"
  t = t.replace(/\s*\(\s*\d+(?:-\d+)?\s*(?:minutes?|mins?|hours?|hrs?|seconds?|secs?|pages?|sheets?)\s*\)/gi, '');

  // Remove trailing dashed specs
  t = t.replace(/\s*-\s*\d+(?:-\d+)?\s*(?:minutes?|mins?|hours?|hrs?|seconds?|secs?)$/i, '');

  // Clean extra spaces
  t = t.replace(/\s+/g, ' ').trim();

  if (t.length > 0) {
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return text.trim();
}

/**
 * Intelligent parser for deliverable specs, counts, and durations.
 * Only extracts if explicitly present in the text. Does NOT invent demo minutes or counts!
 */
export function extractDeliverableSpecs(text: string): string | null {
  if (!text) return null;
  const t = text.trim();

  // 1. Explicit video/film minutes, hours, or seconds (e.g. "1-2 Min", "1-2 Minute", "15-20 Min", "25-40 Mins", "60+ Mins", "2-3 Hours", "60-Sec")
  const durationMatch = t.match(/\(?\b(\d+(?:\s*(?:-|to)\s*\d+|\+)?\s*(?:minutes?|mins?|hours?|hrs?|seconds?|secs?))\b\)?/i);

  // 2. Explicit photo counts with optional qualifiers in between
  // e.g. "75-80 Master Edited Raw Photos", "Approx. 50 High Resolution Edited Images", "3 Save The Dates Photos", "500 Photos"
  const photoMatch = t.match(/(?:(?:approx\.?\s*)?(\d+(?:\s*-\s*\d+)?|\d+\+?)\s*(?:(?:master|retouched|edited|raw|high-res|high\s+resolution|color\s*-?\s*graded|super-fine|selected|save\s+the\s+dates?)\s+)*(?:photos?|images?|pics?|stills?))/i);

  // 3. Explicit reel counts (e.g. "3 Instagram Reels", "1 countdown reel", "2 Reels")
  const reelMatch = t.match(/\b(\d+)\s*(?:instagram\s+|count\s*down\s+|video\s+)?reels?\b/i);

  // 4. Drone footage / shots count (e.g. "30 Drone Cinematic Footage", "30 Drone Shots")
  const droneMatch = t.match(/\b(\d+)\s*(?:drone\s*(?:cinematic\s*)?(?:footage|shots?|clips?))\b/i);

  // 5. Explicit album/book counts (exclude dimensions like 12 x 36 Inches)
  // Match "Mini Album Book x 2", "Photo Calendar x 2", "2x Flush Mount Album", "30 Sheets x 2"
  const albumCountMatch = t.match(/(?:(?:mini\s*)?(?:photo\s*)?books?|calendars?|albums?|sheets?)\s*[x\u00D7]\s*(\d+)(?!\s*(?:inches?|in\b|cm\b|mm\b))/i) ||
    t.match(/\b(?:[x\u00D7]\s*(\d+)|\b(\d+)\s*[x\u00D7])(?!\s*(?:inches?|in\b|cm\b|mm\b|\d))/i);

  const albumPagesMatch = t.match(/\(?\b(\d+\s*(?:sheets?|pages?))\b\)?/i);

  const parts: string[] = [];

  if (albumCountMatch) {
    const qty = albumCountMatch[1] || albumCountMatch[2];
    if (qty) parts.push(`${qty} Qty`);
  }

  if (durationMatch) {
    parts.push(durationMatch[1].trim());
  }

  if (photoMatch) {
    const count = photoMatch[1].trim();
    parts.push(`${count} Photos`);
  } else if (reelMatch) {
    const count = reelMatch[1].trim();
    parts.push(`${count} Reel${Number(count) > 1 ? 's' : ''}`);
  } else if (droneMatch) {
    const count = droneMatch[1].trim();
    parts.push(`${count} Shots`);
  }

  if (albumPagesMatch && !parts.some(p => p.includes('Photos') || p.includes('Sheet') || p.includes('Page'))) {
    parts.push(albumPagesMatch[1].trim());
  }

  if (parts.length > 0) {
    return parts.join(' • ');
  }

  // Simple album quantity prefix e.g. "2 Albums" or "3 Mini Books"
  const prefixMatch = t.match(/^(\d+)\s+(Albums?|Mini\s*Books?|Calendars?|Photo\s*Books?)/i);
  if (prefixMatch) {
    return `${prefixMatch[1]} ${prefixMatch[2]}`;
  }

  return null;
}

/**
 * Parses all deliverables from a quotation object.
 * Deeply analyzes modern quotation content_json (Pre-Wedding Shoot & Deliverables page)
 * as well as legacy events, canvas_data, and add_ons.
 */
export function parseQuotationDeliverables(q: any): {
  deliverables: PostProductionDeliverable[];
  enabledSegments: string[];
} {
  if (!q) return { deliverables: [], enabledSegments: ['Wedding'] };
  const result: PostProductionDeliverable[] = [];
  const seen = new Set<string>();
  const discoveredSegments = new Set<string>(['Wedding']);

  const addUniqueItem = (
    title: string,
    segment: string,
    category: 'Photos' | 'Videos' | 'Albums',
    notes: string,
    specs?: string | null
  ) => {
    const cleanTitle = cleanDeliverableTitle(title);
    if (!cleanTitle) return;
    const cleanSegment = segment.trim() || 'Wedding';
    const key = cleanSegment.toLowerCase() + '_' + category.toLowerCase() + '_' + cleanTitle.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      discoveredSegments.add(cleanSegment);
      result.push({
        id: 'deliv_' + Date.now() + '_' + Math.random().toString(36).substring(7),
        project_id: q.project_id || undefined,
        segment: cleanSegment,
        category,
        title: cleanTitle,
        specs: specs || null,
        count: specs || null,
        status: 'Upcoming',
        assigned_member_id: null,
        assigned_to: null,
        due_date: null,
        notes,
        comments_count: 0,
        is_custom: false,
      });
    }
  };

  // 1. PRIMARY SOURCE: Parse modern quotation content_json
  let doc: any = null;
  if (q.content_json) {
    try {
      doc = typeof q.content_json === 'string' ? JSON.parse(q.content_json) : q.content_json;
    } catch (_) {}
  }

  if (doc) {
    const pageSequence = Array.isArray(doc.pageSequence) ? doc.pageSequence : [];
    
    // 1.1 Pre-Wedding Shoot Page (shootDetails)
    const hasPreWeddingPage = pageSequence.length > 0
      ? pageSequence.some((p: any) => p?.type === 'shootDetails' || p?.id === 'shootDetails' || p === 'shootDetails' || String(p?.id || '').startsWith('shoot'))
      : Boolean(doc.shootDetails?.deliverablesText?.trim() || doc.shootDetails?.daysText);

    if (hasPreWeddingPage && doc.shootDetails) {
      discoveredSegments.add('Pre-Wedding');
      const delivRaw = doc.shootDetails.deliverablesText;
      const lines: string[] = [];

      if (typeof delivRaw === 'string') {
        lines.push(...delivRaw.split(/[\n|;]+/).map((s: string) => s.trim()).filter(Boolean));
      } else if (Array.isArray(doc.shootDetails.selectedItems)) {
        lines.push(...doc.shootDetails.selectedItems.map((s: any) => String(s).trim()).filter(Boolean));
      }

      lines.forEach((line) => {
        const category = categorizeDeliverable(line);
        const specs = extractDeliverableSpecs(line);
        addUniqueItem(line, 'Pre-Wedding', category, 'From Pre-Wedding Shoot Page', specs);
      });
    }

    // 1.2 Deliverables Page ("WHAT WE DELIVER")
    const hasDeliverablesPage = pageSequence.length > 0
      ? pageSequence.some((p: any) => p?.type === 'deliverablesPage' || p?.id === 'deliverablesPage' || p === 'deliverablesPage' || String(p?.id || '').startsWith('deliv'))
      : Boolean(doc.deliverablesPage?.selectedItems?.length || doc.deliverablesPage?.items?.length);

    if (hasDeliverablesPage && doc.deliverablesPage) {
      const items: string[] = Array.isArray(doc.deliverablesPage.selectedItems)
        ? doc.deliverablesPage.selectedItems
        : Array.isArray(doc.deliverablesPage.items)
        ? doc.deliverablesPage.items
        : [];

      items.forEach((item) => {
        const str = String(item).trim();
        if (str) {
          const isPreWedItem = /pre-wedding|pre\s*wedding/i.test(str);
          const segment = (isPreWedItem && hasPreWeddingPage) ? 'Pre-Wedding' : 'Wedding';
          const category = categorizeDeliverable(str);
          const specs = extractDeliverableSpecs(str);
          addUniqueItem(str, segment, category, 'From Quotation Deliverables Page', specs);
        }
      });
    }

    // 1.3 Special Value Additions (Complimentary items)
    if (doc.specialValueAdditions && Array.isArray(doc.specialValueAdditions.selectedItems)) {
      doc.specialValueAdditions.selectedItems.forEach((item: string) => {
        const str = String(item).trim();
        if (str) {
          const isPreWed = /pre-wedding|pre\s*wedding/i.test(str);
          const segment = (isPreWed && hasPreWeddingPage) ? 'Pre-Wedding' : 'Wedding';
          const category = categorizeDeliverable(str);
          const specs = extractDeliverableSpecs(str);
          addUniqueItem(str, segment, category, 'From Special Value Additions', specs);
        }
      });
    }

    // 1.4 Functions Page Items
    if (doc.functionsPage && Array.isArray(doc.functionsPage.items)) {
      doc.functionsPage.items.forEach((func: any) => {
        const funcName = (func.name || func.title || '').trim();
        if (Array.isArray(func.deliverables)) {
          func.deliverables.forEach((d: string) => {
            const str = String(d).trim();
            if (str) {
              const seg = funcName || 'Wedding';
              const category = categorizeDeliverable(str);
              const specs = extractDeliverableSpecs(str);
              addUniqueItem(str, seg, category, 'From Function: ' + seg, specs);
            }
          });
        }
      });
    }
  }

  // 2. SECONDARY / LEGACY FALLBACK: Events list deliverables
  if (result.length === 0) {
    const events = Array.isArray(q.events) ? q.events : [];
    const hasEventDeliverables = events.some((ev: any) => Array.isArray(ev.deliverables) && ev.deliverables.length > 0);

    if (hasEventDeliverables) {
      events.forEach((ev: any) => {
        const evTitle = ev.title || ev.name || '';
        const delivs = Array.isArray(ev.deliverables) ? ev.deliverables : [];
        delivs.forEach((d: string) => {
          if (typeof d === 'string' && d.trim()) {
            const segment = determineDeliverableSegment(evTitle, d);
            const category = categorizeDeliverable(d);
            const specs = extractDeliverableSpecs(d);
            addUniqueItem(d, segment, category, 'From Event: ' + evTitle, specs);
          }
        });
      });
    }
  }

  // 3. LEGACY Canvas Data fallback
  if (result.length === 0 && q.canvas_data) {
    try {
      const cd = typeof q.canvas_data === 'string' ? JSON.parse(q.canvas_data) : q.canvas_data;
      if (Array.isArray(cd)) {
        cd.forEach((page: any) => {
          if (Array.isArray(page.paginatedDelivs)) {
            page.paginatedDelivs.forEach((itemText: string) => {
              if (typeof itemText === 'string' && itemText.trim()) {
                const segment = determineDeliverableSegment('', itemText);
                const category = categorizeDeliverable(itemText);
                const specs = extractDeliverableSpecs(itemText);
                addUniqueItem(itemText, segment, category, 'From Quotation Canvas', specs);
              }
            });
          }

          if (Array.isArray(page.elements)) {
            page.elements.forEach((el: any) => {
              if (el.content === 'deliverables-list' && Array.isArray(el.gridItems)) {
                el.gridItems.forEach((gi: any) => {
                  const clean = (gi.content || gi.title || '').trim();
                  if (clean) {
                    const segment = determineDeliverableSegment('', clean);
                    const category = categorizeDeliverable(clean);
                    const specs = extractDeliverableSpecs(clean);
                    addUniqueItem(clean, segment, category, 'From Quotation Deliverables Page', specs);
                  }
                });
              }
            });
          }
        });
      }
    } catch (_) {}
  }

  // 4. Add-ons from quotation root
  const addOns = Array.isArray(q.add_ons) ? q.add_ons : [];
  addOns.forEach((addon: any) => {
    if (addon.selected !== false && addon.title) {
      const clean = addon.title.trim();
      const segment = determineDeliverableSegment('', clean);
      const category = categorizeDeliverable(clean);
      const specs = extractDeliverableSpecs(clean);
      addUniqueItem(clean, segment, category, 'From Quotation Add-On', specs);
    }
  });

  return {
    deliverables: result,
    enabledSegments: Array.from(discoveredSegments),
  };
}

/**
 * Detects if existing deliverables are stale/hardcoded demo seeds from leads/page.tsx
 */
export function isDemoDeliverables(deliverables: any[]): boolean {
  if (!deliverables || deliverables.length === 0) return false;
  return deliverables.some(d => 
    d.id?.startsWith('deliv_photo_1_') || 
    d.id?.startsWith('deliv_photo_2_') || 
    d.id?.startsWith('deliv_photo_3_') || 
    d.id?.startsWith('deliv_video_1_') || 
    d.id?.startsWith('deliv_video_2_') || 
    d.id?.startsWith('deliv_video_3_') || 
    d.id?.startsWith('deliv_video_4_') || 
    d.id?.startsWith('deliv_album_1_') || 
    d.id?.startsWith('deliv_album_2_') || 
    d.assigned_to === 'Vikram (Photo Retoucher)' ||
    d.assigned_to === 'Amit (Senior Video Editor)' ||
    d.assigned_to === 'Rahul (Teaser Specialist)' ||
    d.assigned_to === 'Suresh (Traditional Editor)' ||
    d.assigned_to === 'Rohan (Album Designer)' ||
    d.assigned_to === 'Priya (Reels Specialist)' ||
    (d.title === 'Edited Photos' && d.count === '500 Photos') ||
    (d.title === 'Cinematic Film' && d.count === '25 Mins')
  );
}

/**
 * Finds the most relevant finalized or approved quotation for a client.
 */
export function findClientFinalQuotation(client: { id: string; name?: string; lead_id?: string | null }, quotations: any[]): any | null {
  if (!quotations || quotations.length === 0 || !client) return null;
  const clientNameLower = (client.name || '').toLowerCase().trim();
  const leadId = (client as any).lead_id ? String((client as any).lead_id).toLowerCase().trim() : '';
  const leadShortId = leadId ? leadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) : '';

  const matched = quotations.filter(q => {
    if (!q) return false;

    // 1. Match by client ID
    if (q.client_id && q.client_id === client.id) return true;

    // 2. Match by lead ID
    if (leadId && (q.lead_id === leadId || q.client_id === leadId)) return true;

    // 3. Match by template_id or quotation_number containing lead ID or short code
    const qNum = (q.quotation_number || q.template_id || q.id || '').toLowerCase();
    if (leadShortId && leadShortId.length >= 4 && qNum.includes(leadShortId)) return true;
    if (leadId && leadId.length >= 6 && qNum.includes(leadId)) return true;

    // 4. Exact match by Client Name (STRICT: non-empty and at least 3 chars)
    const qName = (q.client_name || q.content_json?.meta?.client_name || q.document_json?.meta?.client_name || '').toLowerCase().trim();
    if (clientNameLower && qName && clientNameLower.length >= 3 && qName.length >= 3) {
      if (qName === clientNameLower) return true;
    }

    // 5. Exact match by Couple Names (STRICT: non-empty and at least 3 chars)
    const qCouple = (q.couple_names || q.content_json?.cover?.coupleName || q.document_json?.cover?.coupleName || '').toLowerCase().trim();
    if (clientNameLower && qCouple && clientNameLower.length >= 3 && qCouple.length >= 3) {
      if (qCouple === clientNameLower) return true;
    }

    return false;
  });

  if (matched.length === 0) return null;

  const approved = matched.find(q => 
    q.is_final === true || 
    q.content_json?.is_final === true ||
    q.document_json?.is_final === true ||
    ['approved', 'accepted', 'finalized', 'booked'].includes((q.status || '').toLowerCase())
  );

  return approved || matched[0];
}

/**
 * Synchronize or initialize deliverables from quotation if none exist.
 */
export function autoSyncClientDeliverables(
  client: { id: string; name?: string; lead_id?: string | null },
  quotations: any[],
  currentDeliverables: PostProductionDeliverable[]
): {
  deliverables: PostProductionDeliverable[];
  enabledSegments?: string[];
  quotationId?: string | null;
  quotationTitle?: string | null;
  wasSynced: boolean;
} {
  const isDemo = isDemoDeliverables(currentDeliverables);
  if (currentDeliverables && currentDeliverables.length > 0 && !isDemo) {
    return {
      deliverables: currentDeliverables,
      wasSynced: false,
    };
  }

  const finalQuotation = findClientFinalQuotation(client, quotations);
  let parsed: PostProductionDeliverable[] = [];
  let enabledSegments: string[] = [];
  let qId: string | null = null;
  let qTitle: string | null = null;

  if (finalQuotation) {
    const parsedData = parseQuotationDeliverables(finalQuotation);
    parsed = parsedData.deliverables;
    enabledSegments = parsedData.enabledSegments;
    qId = finalQuotation.id;
    qTitle = finalQuotation.title || finalQuotation.quotation_number || 'Final Quotation';
  }

  // Fallback: If no deliverables from quotation, check client.notes events expected_deliverables
  if (parsed.length === 0 && (client as any)?.notes) {
    try {
      const raw = (client as any).notes;
      if (typeof raw === 'string' && raw.trim().startsWith('{')) {
        const parsedNotes = JSON.parse(raw);
        if (Array.isArray(parsedNotes.events)) {
          parsedNotes.events.forEach((ev: any) => {
            const expDelivs = ev.expected_deliverables;
            if (typeof expDelivs === 'string' && expDelivs.trim()) {
              const items = expDelivs.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean);
              items.forEach((itemText: string) => {
                const seg = determineDeliverableSegment(ev.name || 'Wedding', itemText);
                const cat = categorizeDeliverable(itemText);
                const specs = extractDeliverableSpecs(itemText);
                const key = seg.toLowerCase() + '_' + cat.toLowerCase() + '_' + itemText.toLowerCase();
                if (!parsed.some(d => (d.segment.toLowerCase() + '_' + d.category.toLowerCase() + '_' + d.title.toLowerCase()) === key)) {
                  parsed.push({
                    id: 'deliv_ev_' + Date.now() + '_' + Math.random().toString(36).substring(7),
                    segment: seg,
                    category: cat,
                    title: itemText,
                    specs: specs || null,
                    count: specs || null,
                    status: 'Upcoming',
                    assigned_member_id: null,
                    assigned_to: null,
                    due_date: null,
                    notes: 'From Booking Event: ' + (ev.name || 'Wedding'),
                    comments_count: 0,
                    is_custom: false,
                  });
                }
              });
            }
          });
        }
      }
    } catch (_) {}
  }

  // Final strict deduplication by segment + category + clean title
  const finalUnique: PostProductionDeliverable[] = [];
  const seenSet = new Set<string>();
  for (const d of parsed) {
    const key = `${(d.segment || 'Wedding').toLowerCase()}_${(d.category || 'Photos').toLowerCase()}_${cleanDeliverableTitle(d.title || '').toLowerCase()}`;
    if (!seenSet.has(key)) {
      seenSet.add(key);
      finalUnique.push(d);
    }
  }

  return {
    deliverables: finalUnique,
    enabledSegments: enabledSegments.length > 0 ? enabledSegments : undefined,
    quotationId: qId,
    quotationTitle: qTitle,
    wasSynced: finalUnique.length > 0,
  };
}

/**
 * Persist deliverables changes to post_production_projects and post_production_deliverables
 */
export async function persistDeliverablesDecoupled(params: {
  workspaceId: string;
  clientId: string;
  projectId?: string;
  deliverables: PostProductionDeliverable[];
  projectManagerId?: string | null;
  projectManagerName?: string | null;
  overallStatus?: string;
  notes?: string | null;
}) {
  const {
    workspaceId,
    clientId,
    projectId,
    deliverables,
    projectManagerId,
    projectManagerName,
    overallStatus = 'active',
    notes,
  } = params;

  try {
    const payload: any = {
      client_id: clientId,
      project_manager_id: projectManagerId,
      project_manager_name: projectManagerName,
      overall_status: overallStatus,
      deliverables: deliverables,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    };

    const { data: updateData } = await supabase
      .from('post_production_projects')
      .update(payload)
      .eq('client_id', clientId)
      .select('id');

    if (!updateData || updateData.length === 0) {
      await supabase.from('post_production_projects').insert([{
        user_id: workspaceId,
        workspace_id: workspaceId,
        ...payload,
        created_at: new Date().toISOString(),
      }]);
    }

    if (projectId && Array.isArray(deliverables)) {
      try {
        const targetIds = Array.from(new Set([projectId, clientId, updateData?.[0]?.id].filter(Boolean)));
        for (const tId of targetIds) {
          await supabase
            .from('post_production_deliverables')
            .delete()
            .eq('project_id', tId);
        }

        // Deduplicate deliverables before inserting
        const seen = new Set<string>();
        const uniqueDeliverables = deliverables.filter(deliv => {
          const key = (deliv.segment || 'Wedding').toLowerCase() + '___' + (deliv.category || 'Photos').toLowerCase() + '___' + (deliv.title || '').trim().toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        if (uniqueDeliverables.length > 0) {
          const rowsToInsert = uniqueDeliverables.map(deliv => ({
            project_id: projectId,
            segment: deliv.segment || 'Wedding',
            category: deliv.category || 'Photos',
            custom_category_name: deliv.custom_category_name || null,
            title: deliv.title,
            specs: deliv.specs || deliv.count || null,
            status: deliv.status || 'Upcoming',
            assigned_member_id: deliv.assigned_member_id || null,
            due_date: deliv.due_date || deliv.deadline || null,
            notes: deliv.notes || null,
            is_custom: deliv.is_custom || false,
            updated_at: new Date().toISOString(),
          }));
          await supabase.from('post_production_deliverables').insert(rowsToInsert);
        }
      } catch (delivErr) {
        console.warn('Error syncing post_production_deliverables:', delivErr);
      }
    }
  } catch (err) {
    console.warn('Error persisting post-production deliverables:', err);
  }
}

/**
 * Fetch comments for a specific deliverable.
 */
export async function fetchDeliverableComments(deliverableId: string): Promise<PostProductionComment[]> {
  if (!deliverableId) return [];
  try {
    const { data, error } = await supabase
      .from('post_production_comments')
      .select('*')
      .eq('deliverable_id', deliverableId)
      .order('created_at', { ascending: true });

    if (error) {
      return [];
    }
    return data || [];
  } catch (_) {
    return [];
  }
}

/**
 * Add a new comment to a deliverable.
 */
export async function addDeliverableComment(params: {
  deliverableId: string;
  authorName: string;
  commentText: string;
  userId?: string;
}): Promise<PostProductionComment | null> {
  const { deliverableId, authorName, commentText, userId } = params;
  if (!deliverableId || !commentText.trim()) return null;

  try {
    const { data, error } = await supabase
      .from('post_production_comments')
      .insert({
        deliverable_id: deliverableId,
        user_id: userId || undefined,
        author_name: authorName || 'Studio Lead',
        comment_text: commentText.trim(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.warn('Comment insert error:', error.message);
      return {
        id: 'local_cm_' + Date.now(),
        deliverable_id: deliverableId,
        author_name: authorName || 'Studio Lead',
        comment_text: commentText.trim(),
        created_at: new Date().toISOString(),
      };
    }

    return data;
  } catch (_) {
    return {
      id: 'local_cm_' + Date.now(),
      deliverable_id: deliverableId,
      author_name: authorName || 'Studio Lead',
      comment_text: commentText.trim(),
      created_at: new Date().toISOString(),
    };
  }
}
