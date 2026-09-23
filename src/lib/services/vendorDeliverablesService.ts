import { supabase, supabaseAdmin } from '@/lib/supabase';

export type AssignmentCategory = 
  | 'all' 
  | 'shoot' 
  | 'video_editing' 
  | 'photo_editing' 
  | 'album_design' 
  | 'album_printing';

export interface VendorAlbumOrder {
  id: string;
  workspace_id: string;
  partner_id: string;
  partner_name: string;
  partner_email?: string;
  client_id?: string;
  client_name: string;
  project_id?: string;
  deliverable_id?: string;
  category?: AssignmentCategory; // 'shoot', 'video_editing', 'photo_editing', 'album_design', 'album_printing'
  item_title?: string;
  specs?: string;
  service_type?: string;
  album_type: string; // Used as deliverable / task title
  sheet_count: number;
  page_count: number;
  rate_per_sheet: number;
  rate_per_page?: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  order_status: string; // 'Pending / Upcoming', 'In Progress / In Design', 'Client Review', 'Changes Requested', 'Sent for Printing', 'Completed'
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID';
  order_date: string;
  due_date?: string;
  delivery_date?: string;
  pdf_proof_url?: string;
  drive_folder_url?: string;
  notes?: string;
  comments?: Array<{
    id: string;
    author: string;
    text: string;
    time: string;
    reminder_at?: string;
    is_voice?: boolean;
  }>;
  created_at?: string;
  updated_at?: string;
}

export type VendorAssignmentOrder = VendorAlbumOrder;

export interface VendorStatement {
  id: string;
  workspace_id: string;
  vendor_id: string;
  vendor_name: string;
  vendor_email?: string;
  statement_number: string;
  statement_date: string;
  start_date?: string;
  end_date?: string;
  order_ids: string[];
  items_json: Array<{
    order_id: string;
    client_name: string;
    album_type: string;
    category?: string;
    specs?: string;
    sheet_count: number;
    page_count: number;
    total_amount: number;
    paid_amount: number;
    balance_amount: number;
    order_status: string;
    payment_status: string;
    due_date?: string;
  }>;
  total_albums: number;
  total_sheets: number;
  subtotal: number;
  paid_amount: number;
  balance_due: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

const LOCAL_STORAGE_KEY_PREFIX = 'sc_vendor_album_orders_';

/**
 * Normalizes status strings into standard readable status with 3D color styling
 */
export function normalizeVendorOrderStatus(raw?: string): string {
  if (!raw) return 'Pending Design';
  const s = raw.toLowerCase().trim();
  if (s.includes('sent') || s.includes('print')) return 'Sent for Printing';
  if (s.includes('review') || s.includes('under review')) return 'Client Review';
  if (s.includes('change') || s.includes('revision') || s.includes('modifi')) return 'Changes Requested';
  if (s.includes('progress') || s.includes('design') || s.includes('editing')) return 'In Progress';
  if (s.includes('done') || s.includes('completed') || s.includes('delivered')) return 'Completed';
  if (s.includes('upcoming') || s.includes('pending') || s.includes('todo')) return 'Pending Design';
  return raw;
}

/**
 * Detects assignment category from deliverable data
 */
export function detectDeliverableCategory(category?: string, title?: string, role?: string): AssignmentCategory {
  const combined = `${category || ''} ${title || ''} ${role || ''}`.toLowerCase();
  if (combined.includes('print') || combined.includes('lab') || combined.includes('binding')) return 'album_printing';
  if (combined.includes('album') || combined.includes('book') || combined.includes('sheet') || combined.includes('flush mount')) return 'album_design';
  if (combined.includes('video') || combined.includes('film') || combined.includes('teaser') || combined.includes('trailer') || combined.includes('reel') || combined.includes('cinemat') || combined.includes('editor')) return 'video_editing';
  if (combined.includes('photo') || combined.includes('stills') || combined.includes('retouch') || combined.includes('color grade')) return 'photo_editing';
  if (combined.includes('shoot') || combined.includes('candid') || combined.includes('drone') || combined.includes('traditional') || combined.includes('photographer') || combined.includes('cinematographer')) return 'shoot';
  return 'album_design';
}

/**
 * Fetch All Orders / Deliverables / Shoots for a vendor / team member with bi-directional Post-Production sync
 */
export async function fetchVendorAlbumOrders(
  workspaceId: string,
  vendorId: string,
  vendorEmail?: string,
  vendorName?: string
): Promise<VendorAlbumOrder[]> {
  try {
    let query = supabaseAdmin
      .from('partner_album_orders')
      .select('*');

    if (vendorId) {
      const emailFilter = vendorEmail ? `,partner_email.ilike.%${vendorEmail}%` : '';
      query = query.or(`partner_id.eq.${vendorId}${emailFilter}`);
    }

    if (workspaceId && workspaceId !== 'all') {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data: dbOrders, error } = await query.order('created_at', { ascending: false });

    const orderList: VendorAlbumOrder[] = Array.isArray(dbOrders) ? [...dbOrders] : [];

    // AUTO-SYNC 1: Check post_production_deliverables for ALL categories (Videos, Photos, Albums, Printing)
    try {
      let delivQuery = supabaseAdmin
        .from('post_production_deliverables')
        .select('*');

      if (vendorId) {
        const nameFilter = vendorName ? `,assigned_to.ilike.%${vendorName}%` : '';
        delivQuery = delivQuery.or(`assigned_member_id.eq.${vendorId}${nameFilter}`);
      }

      const { data: deliverables } = await delivQuery;

      if (deliverables && deliverables.length > 0) {
        const projectIds = [...new Set(deliverables.map((d: any) => d.project_id).filter(Boolean))];
        const projectClientMap = new Map<string, string>();

        if (projectIds.length > 0) {
          const { data: projects } = await supabaseAdmin
            .from('post_production_projects')
            .select('id, client_id')
            .in('id', projectIds);

          const clientIds = [...new Set((projects || []).map((p: any) => p.client_id).filter(Boolean))];
          if (clientIds.length > 0) {
            const { data: clients } = await supabaseAdmin
              .from('workspace_clients')
              .select('id, name')
              .in('id', clientIds);

            const cMap = new Map<string, string>();
            (clients || []).forEach((c: any) => cMap.set(c.id, c.name));

            (projects || []).forEach((p: any) => {
              if (cMap.has(p.client_id)) {
                projectClientMap.set(p.id, cMap.get(p.client_id)!);
              }
            });
          }
        }

        // Bridge deliverables across all categories into orderList
        for (const deliv of deliverables) {
          const cat = detectDeliverableCategory(deliv.category, deliv.title);
          const exists = orderList.some(
            o => o.deliverable_id === deliv.id || (deliv.id && o.id === `order_${deliv.id.replace('deliv_', '')}`)
          );

          if (!exists) {
            const clientName = projectClientMap.get(deliv.project_id) || 'Valued Couple';
            const rawSpecs = String(deliv.specs || deliv.count || '');
            const sheetCount = parseInt(rawSpecs.replace(/\D/g, '')) || (cat === 'album_design' || cat === 'album_printing' ? 30 : 1);
            
            let defaultRate = 2500;
            if (cat === 'video_editing') defaultRate = 4500;
            else if (cat === 'photo_editing') defaultRate = 3000;
            else if (cat === 'album_design') defaultRate = sheetCount * 150;
            else if (cat === 'album_printing') defaultRate = sheetCount * 220;

            const newOrder: VendorAlbumOrder = {
              id: `order_${deliv.id.replace('deliv_', '')}`,
              workspace_id: workspaceId || deliv.workspace_id || 'ws_default',
              partner_id: vendorId,
              partner_name: deliv.assigned_to || vendorName || 'Team Specialist',
              partner_email: vendorEmail || '',
              client_name: clientName,
              project_id: deliv.project_id,
              deliverable_id: deliv.id,
              category: cat,
              item_title: deliv.title || 'Deliverable Task',
              specs: rawSpecs || `${sheetCount} Sheets`,
              service_type: cat === 'video_editing' ? 'Video Editing' : cat === 'photo_editing' ? 'Photo Editing' : cat === 'album_printing' ? 'Album Printing' : 'Album Designing',
              album_type: deliv.title || (cat === 'video_editing' ? 'Wedding Film Edit' : cat === 'photo_editing' ? 'Photo Retouching' : 'Signature Photobook'),
              sheet_count: sheetCount,
              page_count: sheetCount * 2,
              rate_per_sheet: cat === 'album_design' ? 150 : 0,
              total_amount: defaultRate,
              paid_amount: 0,
              balance_amount: defaultRate,
              order_status: normalizeVendorOrderStatus(deliv.status),
              payment_status: 'PENDING',
              order_date: new Date().toISOString().split('T')[0],
              due_date: deliv.due_date ? new Date(deliv.due_date).toISOString().split('T')[0] : '',
              notes: deliv.notes || '',
              comments: [],
              created_at: deliv.created_at || new Date().toISOString()
            };

            // Attempt save to DB in background
            try {
              await supabaseAdmin.from('partner_album_orders').upsert(newOrder);
            } catch (_) {}
            orderList.push(newOrder);
          }
        }
      }
    } catch (syncErr) {
      console.warn('[vendorDeliverablesService] Deliverables auto-sync error:', syncErr);
    }

    // AUTO-SYNC 2: Check fw_assignments and crew_assignments_finance for Shoots assigned to this member
    try {
      const { data: assignments } = await supabaseAdmin
        .from('fw_assignments')
        .select('*')
        .eq('assigned_member_id', vendorId);

      if (assignments && assignments.length > 0) {
        for (const assign of assignments) {
          const shootId = `shoot_${assign.id || assign.sub_event_id || Math.random().toString(36).substring(7)}`;
          const exists = orderList.some(o => o.id === shootId || (o.category === 'shoot' && o.client_name === assign.client_name && o.item_title === assign.role));
          if (!exists) {
            const agreed = Number(assign.agreed_amount || assign.rate || 0) || 5000;
            const paid = Number(assign.paid_amount || assign.advance_amount || 0);
            const balance = Math.max(0, agreed - paid);

            const shootOrder: VendorAlbumOrder = {
              id: shootId,
              workspace_id: workspaceId || assign.workspace_id || 'ws_default',
              partner_id: vendorId,
              partner_name: vendorName || 'Freelance Specialist',
              partner_email: vendorEmail || '',
              client_name: assign.client_name || 'Client Wedding',
              project_id: assign.project_id || '',
              category: 'shoot',
              item_title: assign.role || 'Wedding Shoot',
              specs: assign.event_date ? `Shoot Date: ${assign.event_date}` : 'Full Day Shoot',
              service_type: 'Freelance Shoot',
              album_type: assign.role ? `${assign.role} Shoot` : 'Wedding Event Shoot',
              sheet_count: 1,
              page_count: 1,
              rate_per_sheet: 0,
              total_amount: agreed,
              paid_amount: paid,
              balance_amount: balance,
              order_status: assign.status === 'completed' ? 'Completed' : 'In Progress',
              payment_status: balance === 0 && agreed > 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING',
              order_date: assign.event_date || assign.created_at || new Date().toISOString().split('T')[0],
              due_date: assign.event_date || '',
              notes: assign.notes || '',
              comments: [],
              created_at: assign.created_at || new Date().toISOString()
            };
            orderList.push(shootOrder);
          }
        }
      }
    } catch (shootErr) {
      console.warn('[vendorDeliverablesService] Shoot assignments sync error:', shootErr);
    }

    if (orderList.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${workspaceId}_${vendorId}`, JSON.stringify(orderList));
    }

    return orderList;
  } catch (err) {
    console.error('[vendorDeliverablesService] fetchVendorAlbumOrders error:', err);
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${workspaceId}_${vendorId}`);
      if (local) {
        try { return JSON.parse(local); } catch (_) {}
      }
    }
    return [];
  }
}

/**
 * Save or Update an Assignment / Deliverable / Album Order with Bi-Directional Post-Production Sync
 */
export async function saveVendorAlbumOrder(
  workspaceId: string,
  order: Partial<VendorAlbumOrder> & { partner_id: string; client_name: string }
): Promise<VendorAlbumOrder> {
  const cat = order.category || detectDeliverableCategory(undefined, order.album_type || order.item_title);
  const sheetCount = Number(order.sheet_count) || (cat === 'album_design' || cat === 'album_printing' ? 30 : 1);
  const pageCount = Number(order.page_count) || sheetCount * 2;
  const ratePerSheet = Number(order.rate_per_sheet) || 0;
  const totalAmount = order.total_amount !== undefined 
    ? Number(order.total_amount) 
    : (ratePerSheet > 0 ? sheetCount * ratePerSheet : 3500);
  const paidAmount = Number(order.paid_amount) || 0;
  const balanceAmount = Math.max(0, totalAmount - paidAmount);
  const paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' = 
    balanceAmount === 0 && totalAmount > 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'PENDING';

  const payload: VendorAlbumOrder = {
    id: order.id || `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    workspace_id: workspaceId,
    partner_id: order.partner_id,
    partner_name: order.partner_name || 'Team Specialist',
    partner_email: order.partner_email || '',
    client_id: order.client_id || '',
    client_name: order.client_name,
    project_id: order.project_id || '',
    deliverable_id: order.deliverable_id || '',
    category: cat,
    item_title: order.item_title || order.album_type || 'Creative Task',
    specs: order.specs || (cat === 'album_design' || cat === 'album_printing' ? `${sheetCount} Sheets (${pageCount} Pages)` : `${sheetCount} Qty`),
    service_type: order.service_type || (cat === 'video_editing' ? 'Video Editing' : cat === 'photo_editing' ? 'Photo Editing' : cat === 'album_printing' ? 'Album Printing' : cat === 'shoot' ? 'Freelance Shoot' : 'Album Designing'),
    album_type: order.album_type || order.item_title || 'Creative Task',
    sheet_count: sheetCount,
    page_count: pageCount,
    rate_per_sheet: ratePerSheet,
    rate_per_page: Number(order.rate_per_page) || 0,
    total_amount: totalAmount,
    paid_amount: paidAmount,
    balance_amount: balanceAmount,
    order_status: normalizeVendorOrderStatus(order.order_status),
    payment_status: paymentStatus,
    order_date: order.order_date || new Date().toISOString().split('T')[0],
    due_date: order.due_date || '',
    delivery_date: order.delivery_date || '',
    pdf_proof_url: order.pdf_proof_url || '',
    drive_folder_url: order.drive_folder_url || '',
    notes: order.notes || '',
    comments: order.comments || [],
    updated_at: new Date().toISOString()
  };

  try {
    await supabaseAdmin.from('partner_album_orders').upsert(payload);

    // BI-DIRECTIONAL SYNC: If deliverable_id exists, sync status, specs, due_date and notes back to post_production_deliverables
    if (payload.deliverable_id) {
      await supabaseAdmin
        .from('post_production_deliverables')
        .update({
          status: payload.order_status,
          specs: payload.specs || `${payload.sheet_count} Sheets`,
          due_date: payload.due_date ? new Date(payload.due_date).toISOString() : null,
          notes: payload.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.deliverable_id);
    }
  } catch (err) {
    console.warn('[vendorDeliverablesService] DB save error:', err);
  }

  // Update Local Cache
  if (typeof window !== 'undefined') {
    const key = `${LOCAL_STORAGE_KEY_PREFIX}${workspaceId}_${payload.partner_id}`;
    const raw = localStorage.getItem(key);
    let list: VendorAlbumOrder[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(o => o.id === payload.id);
    if (idx >= 0) list[idx] = payload;
    else list.unshift(payload);
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('vendor_orders_updated', { detail: { order: payload } }));
  }

  return payload;
}

/**
 * Add Comment & AI Voice Note to an Assignment / Order
 */
export async function addVendorOrderComment(
  orderId: string,
  comment: {
    author: string;
    text: string;
    reminder_at?: string;
    is_voice?: boolean;
  }
): Promise<VendorAlbumOrder | null> {
  try {
    const { data: order } = await supabaseAdmin
      .from('partner_album_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (!order) return null;

    const existingComments = Array.isArray(order.comments) ? order.comments : [];
    const newComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      author: comment.author || 'Studio Lead',
      text: comment.text,
      time: new Date().toISOString(),
      reminder_at: comment.reminder_at || undefined,
      is_voice: Boolean(comment.is_voice)
    };

    const updatedComments = [...existingComments, newComment];

    const { data: updated, error } = await supabaseAdmin
      .from('partner_album_orders')
      .update({
        comments: updatedComments,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return updated as VendorAlbumOrder;
  } catch (err) {
    console.error('[vendorDeliverablesService] addVendorOrderComment error:', err);
    return null;
  }
}
