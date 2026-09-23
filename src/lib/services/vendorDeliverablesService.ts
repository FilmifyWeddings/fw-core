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
  assignment_id?: string;
  payout_id?: string;
  category?: AssignmentCategory; // 'shoot', 'video_editing', 'photo_editing', 'album_design', 'album_printing'
  event_name?: string; // e.g. "Wedding", "Reception", "Engagement", "Sangeet", "Haldi"
  event_date?: string; // e.g. "2026-10-15"
  event_time?: string; // e.g. "09:00 AM - 02:00 PM"
  role?: string; // e.g. "Candid Photography", "Cinematography", "Traditional Video", "Drone Pilot"
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
    formatted_time?: string;
    reminder_at?: string;
    is_voice?: boolean;
  }>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Formats note date and time cleanly: e.g. "24 Sep 2026, 04:20 AM"
 */
export function formatNoteDateTime(dateInput?: string | Date): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = hours.toString().padStart(2, '0');

  return `${day} ${month} ${year}, ${formattedHours}:${minutes} ${ampm}`;
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

    // AUTO-SYNC 1.2: Also check post_production_projects JSON deliverables
    try {
      const { data: allProjects } = await supabaseAdmin
        .from('post_production_projects')
        .select('id, client_id, deliverables');

      if (allProjects && allProjects.length > 0) {
        const clientIds = [...new Set(allProjects.map((p: any) => p.client_id).filter(Boolean))];
        const { data: clients } = await supabaseAdmin
          .from('workspace_clients')
          .select('id, name')
          .in('id', clientIds);
        const cMap = new Map<string, string>();
        (clients || []).forEach((c: any) => cMap.set(c.id, c.name));

        for (const proj of allProjects) {
          const clientName = cMap.get(proj.client_id) || 'Valued Couple';
          const delivList = Array.isArray(proj.deliverables) ? proj.deliverables : [];
          for (const d of delivList) {
            const matchesMember = 
              (d.assigned_member_id && d.assigned_member_id === vendorId) ||
              (d.assigned_to && vendorName && d.assigned_to.toLowerCase().includes(vendorName.toLowerCase()));

            if (matchesMember) {
              const cat = detectDeliverableCategory(d.category, d.title);
              const exists = orderList.some(
                o => o.deliverable_id === d.id || (d.id && o.id === `order_${String(d.id).replace('deliv_', '')}`)
              );
              if (!exists) {
                const rawSpecs = String(d.specs || d.count || '');
                const sheetCount = parseInt(rawSpecs.replace(/\D/g, '')) || (cat === 'album_design' || cat === 'album_printing' ? 30 : 1);
                let defaultRate = 2500;
                if (cat === 'video_editing') defaultRate = 4500;
                else if (cat === 'photo_editing') defaultRate = 3000;
                else if (cat === 'album_design') defaultRate = sheetCount * 150;
                else if (cat === 'album_printing') defaultRate = sheetCount * 220;

                const newOrder: VendorAlbumOrder = {
                  id: `order_${String(d.id || Math.random().toString(36).substring(7)).replace('deliv_', '')}`,
                  workspace_id: workspaceId || 'ws_default',
                  partner_id: vendorId,
                  partner_name: d.assigned_to || vendorName || 'Team Specialist',
                  partner_email: vendorEmail || '',
                  client_name: clientName,
                  project_id: proj.id,
                  deliverable_id: d.id,
                  category: cat,
                  item_title: d.title || 'Deliverable Task',
                  specs: rawSpecs || `${sheetCount} Sheets`,
                  service_type: cat === 'video_editing' ? 'Video Editing' : cat === 'photo_editing' ? 'Photo Editing' : cat === 'album_printing' ? 'Album Printing' : 'Album Designing',
                  album_type: d.title || (cat === 'video_editing' ? 'Wedding Film Edit' : cat === 'photo_editing' ? 'Photo Retouching' : 'Signature Photobook'),
                  sheet_count: sheetCount,
                  page_count: sheetCount * 2,
                  rate_per_sheet: cat === 'album_design' ? 150 : 0,
                  total_amount: defaultRate,
                  paid_amount: 0,
                  balance_amount: defaultRate,
                  order_status: normalizeVendorOrderStatus(d.status),
                  payment_status: 'PENDING',
                  order_date: new Date().toISOString().split('T')[0],
                  due_date: d.due_date ? new Date(d.due_date).toISOString().split('T')[0] : '',
                  notes: d.notes || '',
                  comments: [],
                  created_at: d.created_at || new Date().toISOString()
                };
                orderList.push(newOrder);
              }
            }
          }
        }
      }
    } catch (jsonErr) {
      console.warn('[vendorDeliverablesService] JSON deliverables sync error:', jsonErr);
    }

    // AUTO-SYNC 2: Check fw_assignments and crew_assignments_finance for Shoots assigned to this member
    try {
      const { data: assignments } = await supabaseAdmin
        .from('fw_assignments')
        .select('*')
        .eq('assigned_member_id', vendorId);

      if (assignments && assignments.length > 0) {
        const isStrictUuid = (val: any): boolean => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
        const subEventIds = [...new Set(assignments.map((a: any) => a.sub_event_id).filter(isStrictUuid))];
        const projectIds = [...new Set(assignments.map((a: any) => a.project_id || a.event_id).filter(isStrictUuid))];

        const [subEventsRes, projectsRes] = await Promise.all([
          subEventIds.length > 0
            ? supabaseAdmin.from('fw_sub_events').select('id, project_id, event_title, event_date, venue_name, start_time_12h, end_time_12h, start_time, end_time').in('id', subEventIds)
            : Promise.resolve({ data: [] }),
          projectIds.length > 0
            ? supabaseAdmin.from('fw_projects').select('id, client_name, main_date, main_venue').in('id', projectIds)
            : Promise.resolve({ data: [] })
        ]);

        const subEventsMap = new Map<string, any>();
        (subEventsRes.data || []).forEach((se: any) => subEventsMap.set(se.id, se));

        const projectsMap = new Map<string, any>();
        (projectsRes.data || []).forEach((p: any) => projectsMap.set(p.id, p));

        for (const assign of assignments) {
          const se = assign.sub_event_id ? subEventsMap.get(assign.sub_event_id) : null;
          const proj = (assign.project_id ? projectsMap.get(assign.project_id) : null) || (se?.project_id ? projectsMap.get(se.project_id) : null);

          const clientName = proj?.client_name || assign.client_name || 'Valued Couple';
          const eventName = se?.event_title || assign.sub_event_name || 'Wedding Event';
          const eventDate = se?.event_date || assign.event_date || assign.sub_event_date || proj?.main_date || '';

          // Timing calculation
          let eventTime = '';
          if (se?.start_time_12h) {
            eventTime = se.end_time_12h ? `${se.start_time_12h} - ${se.end_time_12h}` : se.start_time_12h;
          } else if (se?.start_time) {
            eventTime = se.end_time ? `${se.start_time} - ${se.end_time}` : se.start_time;
          } else if (assign.start_time) {
            eventTime = assign.end_time ? `${assign.start_time} - ${assign.end_time}` : assign.start_time;
          }

          const role = assign.required_role || assign.role || 'Photographer';
          const agreed = Number(assign.agreed_amount ?? assign.rate ?? 0); // ₹0 if not set!
          const paid = Number(assign.advance_amount ?? assign.paid_amount ?? 0);
          const balance = Math.max(0, agreed - paid);

          const shootId = `shoot_assign_${assign.id}`;

          const existingIdx = orderList.findIndex(
            o => o.id === shootId || 
                 o.assignment_id === assign.id || 
                 (o.category === 'shoot' && o.client_name === clientName && (o.event_name === eventName || o.album_type === eventName))
          );

          if (existingIdx >= 0) {
            const existing = orderList[existingIdx];
            const updatedShoot: VendorAlbumOrder = {
              ...existing,
              assignment_id: assign.id,
              client_name: clientName,
              event_name: eventName,
              event_date: eventDate,
              event_time: eventTime,
              role: role,
              item_title: eventName,
              album_type: eventName,
              service_type: role,
              total_amount: existing.total_amount !== undefined && existing.total_amount !== 5000 ? existing.total_amount : agreed,
              paid_amount: existing.paid_amount || paid,
              balance_amount: Math.max(0, (existing.total_amount !== undefined && existing.total_amount !== 5000 ? existing.total_amount : agreed) - (existing.paid_amount || paid)),
              payment_status: (Math.max(0, (existing.total_amount || agreed) - (existing.paid_amount || paid)) === 0 && (existing.total_amount || agreed) > 0) ? 'PAID' : (existing.paid_amount || paid) > 0 ? 'PARTIAL' : 'PENDING'
            };
            orderList[existingIdx] = updatedShoot;
          } else {
            const shootOrder: VendorAlbumOrder = {
              id: shootId,
              workspace_id: workspaceId || assign.workspace_id || 'ws_default',
              partner_id: vendorId,
              partner_name: vendorName || 'Freelance Specialist',
              partner_email: vendorEmail || '',
              client_name: clientName,
              project_id: assign.project_id || se?.project_id || '',
              assignment_id: assign.id,
              category: 'shoot',
              event_name: eventName,
              event_date: eventDate,
              event_time: eventTime,
              role: role,
              item_title: eventName,
              specs: eventTime ? `${eventDate} • ${eventTime}` : eventDate || 'Scheduled Shoot',
              service_type: role,
              album_type: eventName,
              sheet_count: 1,
              page_count: 1,
              rate_per_sheet: 0,
              total_amount: agreed,
              paid_amount: paid,
              balance_amount: balance,
              order_status: assign.status === 'completed' ? 'Completed' : 'In Progress',
              payment_status: balance === 0 && agreed > 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING',
              order_date: eventDate || assign.created_at || new Date().toISOString().split('T')[0],
              due_date: eventDate || '',
              notes: assign.notes || '',
              comments: [],
              created_at: assign.created_at || new Date().toISOString()
            };

            try {
              await supabaseAdmin.from('partner_album_orders').upsert(shootOrder);
            } catch (err) {
              console.warn('[vendorDeliverablesService] Upsert shoot error:', err);
            }

            orderList.push(shootOrder);
          }
        }
      }
    } catch (shootErr) {
      console.warn('[vendorDeliverablesService] Shoot assignments sync error:', shootErr);
    }

    // AUTO-SYNC 3: Check team_event_payouts for any shoot payouts recorded for this member
    try {
      const { data: payouts } = await supabaseAdmin
        .from('team_event_payouts')
        .select('*')
        .eq('member_id', vendorId);

      if (payouts && payouts.length > 0) {
        for (const p of payouts) {
          const clientName = p.client_name || 'Valued Couple';
          const eventName = p.event_name || 'Wedding Event';
          const eventDate = p.event_date || '';
          const eventTime = p.start_time ? (p.end_time ? `${p.start_time} - ${p.end_time}` : p.start_time) : '';
          const role = p.role || 'Freelance Specialist';
          const agreed = Number(p.agreed_amount || 0);
          const paid = Number(p.paid_amount || 0);
          const balance = Number(p.balance_amount !== undefined ? p.balance_amount : Math.max(0, agreed - paid));
          const shootId = `shoot_payout_${p.id}`;

          const existingIdx = orderList.findIndex(
            o => o.id === shootId || 
                 o.payout_id === p.id ||
                 (o.category === 'shoot' && o.client_name === clientName && (o.event_name === eventName || o.album_type === eventName))
          );

          if (existingIdx >= 0) {
            const existing = orderList[existingIdx];
            orderList[existingIdx] = {
              ...existing,
              payout_id: p.id,
              client_name: clientName,
              event_name: eventName,
              event_date: eventDate,
              event_time: eventTime,
              role: role,
              item_title: eventName,
              album_type: eventName,
              service_type: role,
              total_amount: existing.total_amount !== undefined && existing.total_amount !== 5000 ? existing.total_amount : agreed,
              paid_amount: existing.paid_amount || paid,
              balance_amount: Math.max(0, (existing.total_amount !== undefined && existing.total_amount !== 5000 ? existing.total_amount : agreed) - (existing.paid_amount || paid)),
              payment_status: (Math.max(0, (existing.total_amount || agreed) - (existing.paid_amount || paid)) === 0 && (existing.total_amount || agreed) > 0) ? 'PAID' : (existing.paid_amount || paid) > 0 ? 'PARTIAL' : 'PENDING'
            };
          } else {
            const shootOrder: VendorAlbumOrder = {
              id: shootId,
              workspace_id: workspaceId || p.workspace_id || 'ws_default',
              partner_id: vendorId,
              partner_name: vendorName || p.member_name || 'Freelance Specialist',
              partner_email: vendorEmail || '',
              client_name: clientName,
              project_id: p.project_id || '',
              payout_id: p.id,
              category: 'shoot',
              event_name: eventName,
              event_date: eventDate,
              event_time: eventTime,
              role: role,
              item_title: eventName,
              specs: eventTime ? `${eventDate} • ${eventTime}` : eventDate || 'Scheduled Shoot',
              service_type: role,
              album_type: eventName,
              sheet_count: 1,
              page_count: 1,
              rate_per_sheet: 0,
              total_amount: agreed,
              paid_amount: paid,
              balance_amount: balance,
              order_status: p.status === 'PAID' || balance === 0 ? 'Completed' : 'In Progress',
              payment_status: balance === 0 && agreed > 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING',
              order_date: eventDate || p.created_at || new Date().toISOString().split('T')[0],
              due_date: eventDate || '',
              notes: p.notes || '',
              comments: [],
              created_at: p.created_at || new Date().toISOString()
            };

            try {
              await supabaseAdmin.from('partner_album_orders').upsert(shootOrder);
            } catch (err) {
              console.warn('[vendorDeliverablesService] Upsert shoot payout error:', err);
            }

            orderList.push(shootOrder);
          }
        }
      }
    } catch (payoutErr) {
      console.warn('[vendorDeliverablesService] team_event_payouts sync error:', payoutErr);
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
    assignment_id: order.assignment_id || '',
    payout_id: order.payout_id || '',
    category: cat,
    event_name: order.event_name || order.item_title || order.album_type || 'Event',
    event_date: order.event_date || order.due_date || '',
    event_time: order.event_time || '',
    role: order.role || order.service_type || '',
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
    due_date: order.due_date || order.event_date || '',
    delivery_date: order.delivery_date || '',
    pdf_proof_url: order.pdf_proof_url || '',
    drive_folder_url: order.drive_folder_url || '',
    notes: order.notes || '',
    comments: order.comments || [],
    updated_at: new Date().toISOString()
  };

  try {
    await supabaseAdmin.from('partner_album_orders').upsert(payload);

    // BI-DIRECTIONAL SYNC: If deliverable_id exists, sync back to post_production_deliverables
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

    // BI-DIRECTIONAL SYNC: If assignment_id exists, sync amounts to fw_assignments
    if (payload.assignment_id) {
      await supabaseAdmin
        .from('fw_assignments')
        .update({
          agreed_amount: payload.total_amount,
          paid_amount: payload.paid_amount,
          advance_amount: payload.paid_amount,
          balance_amount: payload.balance_amount,
          payment_status: payload.payment_status === 'PAID' ? 'completed' : payload.payment_status === 'PARTIAL' ? 'partial' : 'pending',
          notes: payload.notes || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.assignment_id);
    }

    // BI-DIRECTIONAL SYNC: If payout_id exists, sync amounts to team_event_payouts
    if (payload.payout_id) {
      await supabaseAdmin
        .from('team_event_payouts')
        .update({
          agreed_amount: payload.total_amount,
          paid_amount: payload.paid_amount,
          balance_amount: payload.balance_amount,
          status: payload.payment_status === 'PAID' ? 'PAID' : payload.payment_status === 'PARTIAL' ? 'PARTIAL' : 'PENDING',
          notes: payload.notes || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.payout_id);
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
    let { data: order } = await supabaseAdmin
      .from('partner_album_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (!order) {
      // Create a fallback order if not already in table
      const placeholder: Partial<VendorAlbumOrder> = {
        id: orderId,
        partner_id: 'unknown',
        partner_name: 'Team Specialist',
        client_name: 'Valued Couple',
        album_type: 'Assignment Note',
        total_amount: 0,
        paid_amount: 0,
        balance_amount: 0,
        order_status: 'In Progress',
        payment_status: 'PENDING',
        order_date: new Date().toISOString().split('T')[0],
        comments: []
      };
      const { data: inserted } = await supabaseAdmin
        .from('partner_album_orders')
        .insert(placeholder)
        .select()
        .single();
      order = inserted;
    }

    if (!order) return null;

    const existingComments = Array.isArray(order.comments) ? order.comments : [];
    const now = new Date();
    const newComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      author: comment.author || 'Studio Lead',
      text: comment.text,
      time: now.toISOString(),
      formatted_time: formatNoteDateTime(now),
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

    // If reminder_at is set, schedule in post_production_reminders
    if (comment.reminder_at) {
      try {
        const remTitle = `Reminder for ${order.client_name} (${order.event_name || order.album_type || 'Shoot'}): ${comment.text}`;
        await supabaseAdmin.from('post_production_reminders').insert([{
          workspace_id: order.workspace_id || 'ws_default',
          deliverable_id: order.deliverable_id || order.id,
          project_id: order.project_id || null,
          title: remTitle,
          reminder_text: remTitle,
          reminder_at: new Date(comment.reminder_at).toISOString(),
          status: 'pending'
        }]);
      } catch (_) {}
    }

    return updated as VendorAlbumOrder;
  } catch (err) {
    console.error('[vendorDeliverablesService] addVendorOrderComment error:', err);
    return null;
  }
}
