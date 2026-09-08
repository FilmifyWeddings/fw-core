'use client';

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
  if (/album|book|photobook|sheet|print|flush\s*mount/i.test(t)) return 'Albums';
  if (/video|film|teaser|reel|cinemat|trailer|footage|highlight/i.test(t)) return 'Videos';
  return 'Photos';
}

/**
 * Determine if a deliverable belongs to Pre-Wedding or Wedding segment.
 */
export function determineDeliverableSegment(eventTitle: string, itemText: string): 'Pre-Wedding' | 'Wedding' {
  const combined = (eventTitle + ' ' + itemText).toLowerCase();
  if (/pre-wedding|pre\s*wedding|engagement|roka|proposal|save\s*the\s*date/i.test(combined)) {
    return 'Pre-Wedding';
  }
  return 'Wedding';
}

/**
 * Parses all deliverables from a quotation object (events, canvas_data, add_ons).
 */
export function parseQuotationDeliverables(q: any): PostProductionDeliverable[] {
  if (!q) return [];
  const result: PostProductionDeliverable[] = [];
  const seen = new Set<string>();

  const addUniqueItem = (title: string, segment: 'Pre-Wedding' | 'Wedding', category: 'Photos' | 'Videos' | 'Albums', notes: string) => {
    const clean = title.trim();
    if (!clean) return;
    const key = segment + '_' + category + '_' + clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push({
        id: 'deliv_' + Date.now() + '_' + Math.random().toString(36).substring(7),
        project_id: q.project_id || undefined,
        segment,
        category,
        title: clean,
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

  // 1. Events list deliverables
  const events = Array.isArray(q.events) ? q.events : [];
  events.forEach((ev: any) => {
    const evTitle = ev.title || ev.name || '';
    const delivs = Array.isArray(ev.deliverables) ? ev.deliverables : [];
    delivs.forEach((d: string) => {
      if (typeof d === 'string' && d.trim()) {
        const segment = determineDeliverableSegment(evTitle, d);
        const category = categorizeDeliverable(d);
        addUniqueItem(d, segment, category, 'From Event: ' + evTitle);
      }
    });
  });

  // 2. Canvas Data (paginatedDelivs or elements gridItems)
  if (q.canvas_data) {
    try {
      const cd = typeof q.canvas_data === 'string' ? JSON.parse(q.canvas_data) : q.canvas_data;
      if (Array.isArray(cd)) {
        cd.forEach((page: any) => {
          if (Array.isArray(page.paginatedDelivs)) {
            page.paginatedDelivs.forEach((itemText: string) => {
              if (typeof itemText === 'string' && itemText.trim()) {
                const segment = determineDeliverableSegment('', itemText);
                const category = categorizeDeliverable(itemText);
                addUniqueItem(itemText, segment, category, 'From Quotation Canvas');
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
                    addUniqueItem(clean, segment, category, 'From Quotation Deliverables Page');
                  }
                });
              }
            });
          }
        });
      }
    } catch (_) {}
  }

  // 3. Add-ons
  const addOns = Array.isArray(q.add_ons) ? q.add_ons : [];
  addOns.forEach((addon: any) => {
    if (addon.selected !== false && addon.title) {
      const clean = addon.title.trim();
      const segment = determineDeliverableSegment('', clean);
      const category = categorizeDeliverable(clean);
      addUniqueItem(clean, segment, category, 'From Quotation Add-On');
    }
  });

  return result;
}

/**
 * Finds the most relevant finalized or approved quotation for a client.
 */
export function findClientFinalQuotation(client: { id: string; name?: string }, quotations: any[]): any | null {
  if (!quotations || quotations.length === 0) return null;
  const clientNameLower = (client.name || '').toLowerCase().trim();

  const matched = quotations.filter(q => {
    if (q.client_id === client.id) return true;
    const qName = (q.client_name || '').toLowerCase().trim();
    const qCouple = (q.couple_names || '').toLowerCase().trim();
    if (clientNameLower && (qName.includes(clientNameLower) || clientNameLower.includes(qName))) return true;
    if (clientNameLower && (qCouple.includes(clientNameLower) || clientNameLower.includes(qCouple))) return true;
    return false;
  });

  if (matched.length === 0) return null;

  const approved = matched.find(q => 
    q.is_final === true || 
    ['approved', 'accepted', 'finalized', 'booked'].includes((q.status || '').toLowerCase())
  );

  return approved || matched[0];
}

/**
 * Synchronize or initialize deliverables from quotation if none exist.
 */
export function autoSyncClientDeliverables(
  client: { id: string; name?: string },
  quotations: any[],
  currentDeliverables: PostProductionDeliverable[]
): {
  deliverables: PostProductionDeliverable[];
  quotationId?: string | null;
  quotationTitle?: string | null;
  wasSynced: boolean;
} {
  if (currentDeliverables && currentDeliverables.length > 0) {
    return {
      deliverables: currentDeliverables,
      wasSynced: false,
    };
  }

  const finalQuotation = findClientFinalQuotation(client, quotations);
  if (!finalQuotation) {
    return {
      deliverables: [],
      wasSynced: false,
    };
  }

  const parsed = parseQuotationDeliverables(finalQuotation);
  return {
    deliverables: parsed,
    quotationId: finalQuotation.id,
    quotationTitle: finalQuotation.title || finalQuotation.quotation_number || 'Final Quotation',
    wasSynced: parsed.length > 0,
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
      for (const deliv of deliverables) {
        if (deliv.id && deliv.title) {
          try {
            await supabase
              .from('post_production_deliverables')
              .upsert({
                id: deliv.id.includes('-') ? deliv.id : undefined,
                project_id: projectId,
                segment: deliv.segment || 'Wedding',
                category: deliv.category || 'Photos',
                title: deliv.title,
                status: deliv.status || 'Upcoming',
                assigned_member_id: deliv.assigned_member_id || null,
                due_date: deliv.due_date || deliv.deadline || null,
                notes: deliv.notes || null,
                is_custom: deliv.is_custom || false,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'id' });
          } catch (_) {}
        }
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
