import { supabase, supabaseAdmin } from '@/lib/supabase';

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
  album_type: string;
  sheet_count: number;
  page_count: number;
  rate_per_sheet: number;
  rate_per_page?: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  order_status: string; // 'Pending Design', 'In Design', 'Client Review', 'Changes Requested', 'Sent for Printing', 'Completed'
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
 * Normalizes status strings into standard readable status
 */
export function normalizeVendorOrderStatus(raw?: string): string {
  if (!raw) return 'Pending Design';
  const s = raw.toLowerCase().trim();
  if (s.includes('sent') || s.includes('print')) return 'Sent for Printing';
  if (s.includes('review')) return 'Client Review';
  if (s.includes('change') || s.includes('revision')) return 'Changes Requested';
  if (s.includes('progress') || s.includes('designing') || s.includes('in design')) return 'In Design';
  if (s.includes('done') || s.includes('completed') || s.includes('delivered')) return 'Completed';
  return 'Pending Design';
}

/**
 * Fetch Album Orders for a vendor with bi-directional Post-Production sync
 */
export async function fetchVendorAlbumOrders(
  workspaceId: string,
  vendorId: string,
  vendorEmail?: string
): Promise<VendorAlbumOrder[]> {
  try {
    let query = supabaseAdmin
      .from('partner_album_orders')
      .select('*');

    if (vendorId) {
      query = query.or(`partner_id.eq.${vendorId},partner_email.ilike.%${vendorEmail || vendorId}%`);
    }

    if (workspaceId && workspaceId !== 'all') {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data: dbOrders, error } = await query.order('created_at', { ascending: false });

    const orderList: VendorAlbumOrder[] = Array.isArray(dbOrders) ? [...dbOrders] : [];

    // AUTO-SYNC: Also check post_production_deliverables for albums assigned to this vendor
    try {
      let delivQuery = supabaseAdmin
        .from('post_production_deliverables')
        .select('*');

      if (vendorId) {
        delivQuery = delivQuery.or(`assigned_member_id.eq.${vendorId},assigned_to.ilike.%${vendorId}%`);
      }

      const { data: deliverables } = await delivQuery;

      if (deliverables && deliverables.length > 0) {
        // Fetch project and client details for project_ids
        const projectIds = [...new Set(deliverables.map((d: any) => d.project_id).filter(Boolean))];
        let projectClientMap = new Map<string, string>();

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

        // Bridge missing album deliverables into partner_album_orders
        for (const deliv of deliverables) {
          const isAlbum = /album|book/i.test(deliv.category || '') || /album|book/i.test(deliv.title || '');
          if (!isAlbum) continue;

          const exists = orderList.some(
            o => o.deliverable_id === deliv.id || (o.client_name && o.client_name === projectClientMap.get(deliv.project_id))
          );

          if (!exists) {
            const clientName = projectClientMap.get(deliv.project_id) || 'Valued Couple';
            const sheetCount = parseInt(String(deliv.specs || deliv.count || '30').replace(/\D/g, '')) || 30;
            const newOrder: VendorAlbumOrder = {
              id: `album_${deliv.id.replace('deliv_', '')}`,
              workspace_id: workspaceId || deliv.workspace_id || 'ws_default',
              partner_id: vendorId,
              partner_name: deliv.assigned_to || 'Album Designer',
              partner_email: vendorEmail || '',
              client_name: clientName,
              project_id: deliv.project_id,
              deliverable_id: deliv.id,
              album_type: deliv.title || 'Signature Photobook',
              sheet_count: sheetCount,
              page_count: sheetCount * 2,
              rate_per_sheet: 150,
              total_amount: sheetCount * 150,
              paid_amount: 0,
              balance_amount: sheetCount * 150,
              order_status: normalizeVendorOrderStatus(deliv.status),
              payment_status: 'PENDING',
              order_date: new Date().toISOString().split('T')[0],
              due_date: deliv.due_date ? new Date(deliv.due_date).toISOString().split('T')[0] : '',
              notes: deliv.notes || '',
              comments: [],
              created_at: deliv.created_at || new Date().toISOString()
            };

            // Save to DB and add to list
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
 * Save or Update an Album Order
 */
export async function saveVendorAlbumOrder(
  workspaceId: string,
  order: Partial<VendorAlbumOrder> & { partner_id: string; client_name: string }
): Promise<VendorAlbumOrder> {
  const sheetCount = Number(order.sheet_count) || 30;
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
    id: order.id || `album_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    workspace_id: workspaceId,
    partner_id: order.partner_id,
    partner_name: order.partner_name || 'Album Designer',
    partner_email: order.partner_email || '',
    client_id: order.client_id || '',
    client_name: order.client_name,
    project_id: order.project_id || '',
    deliverable_id: order.deliverable_id || '',
    album_type: order.album_type || 'Signature Photobook',
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

    // If deliverable_id exists, sync status back to post_production_deliverables
    if (payload.deliverable_id) {
      await supabaseAdmin
        .from('post_production_deliverables')
        .update({
          status: payload.order_status,
          specs: `${payload.sheet_count} Sheets (${payload.page_count} Pages)`,
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
 * Add Comment & AI Voice Note to an Album Order
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
