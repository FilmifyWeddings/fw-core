import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import type { WorkspaceClient, ClientFinanceRecord, FinanceMilestoneItem } from '@/types';

export interface ParsedClientFinanceRow {
  rawIndex: number;
  clientName: string;
  location: string;
  eventType: string;
  eventDate: string | null;
  fixAmount: number;
  tokenAmount: number;
  addOnAmount: number;
  advPayAmount: number;
  firstStepAmount: number;
  afterShootAmount: number;
  afterDeliverablesAmount: number;
  remainingAmount: number;
  isAllClear: boolean;
  calculatedTotal: number;
  calculatedReceived: number;
  calculatedPending: number;
  milestones: FinanceMilestoneItem[];
  isValid: boolean;
  validationErrors: string[];
}

/**
 * Infer event type from client name or text if empty
 */
export function inferEventType(name: string, rawType?: string): string {
  if (rawType && rawType.trim() && rawType.trim().toLowerCase() !== 'shoot') {
    const t = rawType.trim();
    if (/wed/i.test(t)) return 'Wedding Photography';
    if (/pre.*wed/i.test(t)) return 'Pre-Wedding Shoot';
    if (/eng/i.test(t)) return 'Engagement & Roka';
    if (/matern/i.test(t)) return 'Maternity Shoot';
    if (/office|corp/i.test(t)) return 'Office & Corporate Event';
    if (/model/i.test(t)) return 'Model Portfolio Shoot';
    if (/reel/i.test(t)) return 'Reel & Social Media Shoot';
    if (/ceremony|nam/i.test(t)) return 'Naming Ceremony';
    if (/haldi/i.test(t)) return 'Haldi & Mehndi';
    if (/sangeet/i.test(t)) return 'Sangeet & Reception';
    return t;
  }

  const n = (name || '').toLowerCase();
  if (n.includes('prewed') || n.includes('pre wed') || n.includes('pre-wed')) return 'Pre-Wedding Shoot';
  if (n.includes('wed') || n.includes('wedding')) return 'Wedding Photography';
  if (n.includes('eng') || n.includes('engagement') || n.includes('roka')) return 'Engagement & Roka';
  if (n.includes('maternity') || n.includes('baby')) return 'Maternity Shoot';
  if (n.includes('office') || n.includes('corporate')) return 'Office & Corporate Event';
  if (n.includes('model') || n.includes('portfolio')) return 'Model Portfolio Shoot';
  if (n.includes('reel')) return 'Reel & Social Media Shoot';
  if (n.includes('ceremony') || n.includes('naming')) return 'Naming Ceremony';
  if (n.includes('haldi') || n.includes('mehndi')) return 'Haldi & Mehndi';
  if (n.includes('reception') || n.includes('sangeet')) return 'Sangeet & Reception';

  return 'Wedding Photography';
}

/**
 * Clean and parse numeric currency string
 */
export function parseNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
  const clean = String(val).replace(/[^0-9.-]/g, '').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.round(num);
}

/**
 * Parse boolean / checkbox value from Excel cell
 */
export function parseBoolean(val: any): boolean {
  if (val === true || val === 1 || val === '1') return true;
  if (!val) return false;
  const str = String(val).toLowerCase().trim();
  return (
    str === 'true' || 
    str === 'yes' || 
    str === 'y' || 
    str === 'checked' || 
    str === 'clear' || 
    str === 'all clear' || 
    str === 'completed' || 
    str === 'paid' ||
    str === 'ok'
  );
}

/**
 * Normalize Excel dates (handles serial numbers, dd/mm/yyyy, ISO strings)
 */
export function parseExcelDate(val: any): string | null {
  if (!val) return null;

  // If already YYYY-MM-DD
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    return val.trim();
  }

  // If Excel numeric serial date (e.g. 45678)
  if (typeof val === 'number' && val > 20000 && val < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const dateObj = new Date(excelEpoch.getTime() + val * 86400000);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString().split('T')[0];
    }
  }

  const str = String(val).trim();
  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Find object property key using fuzzy match
 */
function getFuzzyValue(row: Record<string, any>, possibleKeys: string[]): any {
  const normalizedRowKeys = Object.keys(row).map(k => ({
    original: k,
    normalized: k.toLowerCase().replace(/[^a-z0-9]/g, '')
  }));

  for (const target of possibleKeys) {
    const normTarget = target.toLowerCase().replace(/[^a-z0-9]/g, '');
    const found = normalizedRowKeys.find(item => item.normalized === normTarget || item.normalized.includes(normTarget));
    if (found) {
      return row[found.original];
    }
  }
  return undefined;
}

/**
 * Parse raw excel sheet array of objects into structured records
 */
export function parseExcelRows(rawRows: Array<Record<string, any>>): ParsedClientFinanceRow[] {
  return rawRows.map((row, idx) => {
    const errors: string[] = [];

    // 1. Client Name
    const rawName = getFuzzyValue(row, ['client name', 'clint name', 'name', 'client', 'customer', 'couple']) || '';
    const clientName = String(rawName).trim();
    if (!clientName) {
      errors.push('Client Name is required');
    }

    // 2. Client Location
    const rawLocation = getFuzzyValue(row, ['client location', 'clinte loction', 'clinte location', 'location', 'city', 'venue', 'place']) || '';
    const location = String(rawLocation).trim();

    // 3. Shoot / Event Type
    const rawShoot = getFuzzyValue(row, ['shoot', 'event type', 'shoot / event type', 'type', 'event', 'category']) || '';
    const eventType = inferEventType(clientName, rawShoot ? String(rawShoot) : undefined);

    // 4. Date
    const rawDate = getFuzzyValue(row, ['date', 'event date', 'shoot date', 'wedding date']);
    const eventDate = parseExcelDate(rawDate);

    // 5. Financial Amounts
    const fixAmount = parseNumber(getFuzzyValue(row, ['fix amount', 'fixed amount', 'package amount', 'total package', 'amount', 'total']));
    const tokenAmount = parseNumber(getFuzzyValue(row, ['tokan amount', 'token amount', 'token', 'booking token', 'token advance']));
    const addOnAmount = parseNumber(getFuzzyValue(row, ['add on', 'addon', 'add ons', 'extra charges', 'additional']));
    const advPayAmount = parseNumber(getFuzzyValue(row, ['adv pay', 'advance pay', 'advance payment', 'advance', 'adv']));
    const firstStepAmount = parseNumber(getFuzzyValue(row, ['1st step', 'first step', 'step 1', 'installment 1', '1st installment']));
    const afterShootAmount = parseNumber(getFuzzyValue(row, ['after shoot', 'post shoot', 'shoot day payment', 'on shoot']));
    const afterDeliverablesAmount = parseNumber(getFuzzyValue(row, ['after dileverebles', 'after deliverables', 'deliverables', 'delivery payment', 'on delivery', 'final step']));
    const remainingAmount = parseNumber(getFuzzyValue(row, ['remaning', 'remaining', 'balance', 'pending', 'due amount']));

    // 6. All Clear boolean
    const rawAllClear = getFuzzyValue(row, ['all clear', 'clear', 'cleared', 'paid', 'status', 'is clear']);
    const isAllClear = parseBoolean(rawAllClear);

    // Calculations
    const calculatedTotal = fixAmount + addOnAmount;
    let calculatedReceived = 0;
    const milestones: FinanceMilestoneItem[] = [];
    const nowStr = new Date().toISOString().split('T')[0];
    const defaultDate = eventDate || nowStr;

    // Build milestones
    if (tokenAmount > 0) {
      milestones.push({
        id: `ms_tok_${idx}_${Date.now()}`,
        step_name: 'Token Booking Amount',
        title: 'Token Booking Amount',
        amount: tokenAmount,
        status: 'completed',
        due_date: defaultDate,
        paid_date: defaultDate,
        payment_mode: 'UPI'
      });
      calculatedReceived += tokenAmount;
    }

    if (advPayAmount > 0) {
      milestones.push({
        id: `ms_adv_${idx}_${Date.now()}`,
        step_name: 'Advance Payment',
        title: 'Advance Payment',
        amount: advPayAmount,
        status: 'completed',
        due_date: defaultDate,
        paid_date: defaultDate,
        payment_mode: 'Bank Transfer'
      });
      calculatedReceived += advPayAmount;
    }

    if (firstStepAmount > 0) {
      milestones.push({
        id: `ms_step1_${idx}_${Date.now()}`,
        step_name: '1st Installment',
        title: '1st Installment',
        amount: firstStepAmount,
        status: 'completed',
        due_date: defaultDate,
        paid_date: defaultDate,
        payment_mode: 'UPI'
      });
      calculatedReceived += firstStepAmount;
    }

    if (afterShootAmount > 0) {
      milestones.push({
        id: `ms_shoot_${idx}_${Date.now()}`,
        step_name: 'After Shoot Payment',
        title: 'After Shoot Payment',
        amount: afterShootAmount,
        status: 'completed',
        due_date: defaultDate,
        paid_date: defaultDate,
        payment_mode: 'Bank Transfer'
      });
      calculatedReceived += afterShootAmount;
    }

    if (afterDeliverablesAmount > 0) {
      milestones.push({
        id: `ms_deliv_${idx}_${Date.now()}`,
        step_name: 'Final Deliverables Payment',
        title: 'Final Deliverables Payment',
        amount: afterDeliverablesAmount,
        status: 'completed',
        due_date: defaultDate,
        paid_date: defaultDate,
        payment_mode: 'UPI'
      });
      calculatedReceived += afterDeliverablesAmount;
    }

    let calculatedPending = 0;

    if (isAllClear) {
      // 100% Cleared Green Row
      calculatedReceived = calculatedTotal > 0 ? calculatedTotal : calculatedReceived;
      calculatedPending = 0;
      milestones.forEach(m => {
        m.status = 'completed';
        if (!m.paid_date) m.paid_date = defaultDate;
      });
    } else {
      // Pending balance exists
      calculatedPending = remainingAmount > 0 
        ? remainingAmount 
        : Math.max(0, calculatedTotal - calculatedReceived);

      if (calculatedPending > 0) {
        milestones.push({
          id: `ms_rem_${idx}_${Date.now()}`,
          step_name: 'Pending Balance',
          title: 'Pending Balance',
          amount: calculatedPending,
          status: 'pending',
          due_date: defaultDate,
          payment_mode: undefined
        });
      }
    }

    return {
      rawIndex: idx + 1,
      clientName,
      location,
      eventType,
      eventDate,
      fixAmount,
      tokenAmount,
      addOnAmount,
      advPayAmount,
      firstStepAmount,
      afterShootAmount,
      afterDeliverablesAmount,
      remainingAmount,
      isAllClear,
      calculatedTotal,
      calculatedReceived,
      calculatedPending,
      milestones,
      isValid: errors.length === 0,
      validationErrors: errors
    };
  });
}

/**
 * Generate and download standard sample Excel (.xlsx) template
 */
export function downloadSampleExcelTemplate() {
  const headers = [
    'Client Name',
    'Client Location',
    'Shoot / Event Type',
    'Date',
    'Fix Amount',
    'Token Amount',
    'Add On',
    'Adv Pay',
    '1st Step',
    'After Shoot',
    'After Deliverables',
    'Remaining',
    'All Clear'
  ];

  const sampleRows = [
    {
      'Client Name': 'Gauri & Saket Eng',
      'Client Location': 'Palava',
      'Shoot / Event Type': 'Engagement',
      'Date': '2026-02-15',
      'Fix Amount': 25000,
      'Token Amount': 0,
      'Add On': 0,
      'Adv Pay': 12500,
      '1st Step': 0,
      'After Shoot': 0,
      'After Deliverables': 0,
      'Remaining': 12500,
      'All Clear': false
    },
    {
      'Client Name': 'Twinkle & Yash Wed',
      'Client Location': 'Dahanu',
      'Shoot / Event Type': 'Wedding Photography',
      'Date': '2026-03-20',
      'Fix Amount': 135000,
      'Token Amount': 25000,
      'Add On': 0,
      'Adv Pay': 40000,
      '1st Step': 0,
      'After Shoot': 0,
      'After Deliverables': 0,
      'Remaining': 70000,
      'All Clear': false
    },
    {
      'Client Name': 'Surjit Ji Reel Shoot',
      'Client Location': 'Vashi',
      'Shoot / Event Type': 'Reel Shoot',
      'Date': '2026-01-10',
      'Fix Amount': 2500,
      'Token Amount': 500,
      'Add On': 0,
      'Adv Pay': 2000,
      '1st Step': 0,
      'After Shoot': 0,
      'After Deliverables': 0,
      'Remaining': 0,
      'All Clear': true
    },
    {
      'Client Name': 'Hasna Maternity',
      'Client Location': 'Vashi',
      'Shoot / Event Type': 'Maternity',
      'Date': '2026-01-25',
      'Fix Amount': 5000,
      'Token Amount': 2500,
      'Add On': 0,
      'Adv Pay': 2500,
      '1st Step': 0,
      'After Shoot': 0,
      'After Deliverables': 0,
      'Remaining': 0,
      'All Clear': true
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleRows, { header: headers });

  // Column widths
  ws['!cols'] = [
    { wch: 28 }, // Client Name
    { wch: 18 }, // Location
    { wch: 22 }, // Shoot Type
    { wch: 14 }, // Date
    { wch: 14 }, // Fix Amount
    { wch: 14 }, // Token Amount
    { wch: 12 }, // Add On
    { wch: 14 }, // Adv Pay
    { wch: 12 }, // 1st Step
    { wch: 14 }, // After Shoot
    { wch: 18 }, // After Deliverables
    { wch: 14 }, // Remaining
    { wch: 12 }  // All Clear
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Clients & Finance');

  XLSX.writeFile(wb, 'Filmify_Clients_Finance_Template.xlsx');
}

/**
 * Export current workspace finance data to an Excel spreadsheet
 */
export function exportCurrentFinanceToExcel(
  records: ClientFinanceRecord[],
  clients: WorkspaceClient[]
) {
  const clientMap = new Map<string, WorkspaceClient>();
  clients.forEach(c => clientMap.set(c.id, c));

  const exportRows = records.map((r, idx) => {
    const client = r.client || clientMap.get(r.client_id);
    const milestones = r.milestones || [];
    
    // Find individual milestone amounts if present
    const tokenMilestone = milestones.find(m => /token|booking/i.test(m.step_name || m.title || ''));
    const advMilestone = milestones.find(m => /adv/i.test(m.step_name || m.title || ''));
    const firstStepMilestone = milestones.find(m => /1st|first/i.test(m.step_name || m.title || ''));
    const afterShootMilestone = milestones.find(m => /shoot/i.test(m.step_name || m.title || ''));
    const delivMilestone = milestones.find(m => /deliv|album/i.test(m.step_name || m.title || ''));

    const isAllClear = r.pending_amount === 0 && r.final_total_amount > 0;
    const handledBy = (client as any)?.handled_by || (client as any)?.assigned_team_member_name || 'Unassigned';

    return {
      'Sr No': idx + 1,
      'Client Name': client?.name || 'Client',
      'Client Location': (client as any)?.city || (client as any)?.venue || '—',
      'Shoot / Event Type': client?.event_type || 'Wedding Photography',
      'Event Date': client?.event_date || '—',
      'Fix Amount': Number(r.base_package_price || r.final_total_amount || 0),
      'Token Amount': tokenMilestone ? Number(tokenMilestone.amount || 0) : 0,
      'Add On': Number(r.additional_charges || 0),
      'Adv Pay': advMilestone ? Number(advMilestone.amount || 0) : 0,
      '1st Step': firstStepMilestone ? Number(firstStepMilestone.amount || 0) : 0,
      'After Shoot': afterShootMilestone ? Number(afterShootMilestone.amount || 0) : 0,
      'After Deliverables': delivMilestone ? Number(delivMilestone.amount || 0) : 0,
      'Total Amount': Number(r.final_total_amount || 0),
      'Received Amount': Number(r.received_amount || 0),
      'Remaining': Number(r.pending_amount || 0),
      'All Clear': isAllClear,
      'Payment Status': r.payment_status || (isAllClear ? 'paid' : 'pending'),
      'Handled By': handledBy,
      'Phone': client?.phone || '—'
    };
  });

  const ws = XLSX.utils.json_to_sheet(exportRows);

  ws['!cols'] = [
    { wch: 8 },  // Sr No
    { wch: 28 }, // Client Name
    { wch: 18 }, // Location
    { wch: 22 }, // Event Type
    { wch: 14 }, // Event Date
    { wch: 14 }, // Fix Amount
    { wch: 14 }, // Token Amount
    { wch: 12 }, // Add On
    { wch: 14 }, // Adv Pay
    { wch: 12 }, // 1st Step
    { wch: 14 }, // After Shoot
    { wch: 18 }, // After Deliverables
    { wch: 16 }, // Total Amount
    { wch: 16 }, // Received Amount
    { wch: 14 }, // Remaining
    { wch: 12 }, // All Clear
    { wch: 14 }, // Payment Status
    { wch: 22 }, // Handled By
    { wch: 16 }  // Phone
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Finance Master 2025');

  const todayStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Filmify_Finance_Export_${todayStr}.xlsx`);
}

/**
 * Execute batch import into Supabase workspace_clients and client_finance_records
 */
export async function executeBatchClientFinanceImport(
  parsedRows: ParsedClientFinanceRow[],
  workspaceId: string
): Promise<{ successCount: number; errorCount: number; errors: string[] }> {
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  // 1. Resolve a valid UUID for targetWorkspaceId (PostgreSQL requires UUID syntax)
  let targetWorkspaceId = workspaceId;
  const isValidUuid = (id?: string | null) => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (!isValidUuid(targetWorkspaceId)) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (isValidUuid(session?.user?.id)) {
        targetWorkspaceId = session!.user.id;
      }
    } catch (_) {}
  }

  if (!isValidUuid(targetWorkspaceId)) {
    try {
      const { data: prof } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
      const profId = (prof as any)?.id;
      if (isValidUuid(profId)) {
        targetWorkspaceId = profId;
      } else {
        const { data: cl } = await supabase.from('workspace_clients').select('workspace_id').limit(1).maybeSingle();
        const clWsId = (cl as any)?.workspace_id;
        if (isValidUuid(clWsId)) {
          targetWorkspaceId = clWsId;
        } else {
          targetWorkspaceId = '00000000-0000-0000-0000-000000000000';
        }
      }
    } catch (_) {
      targetWorkspaceId = '00000000-0000-0000-0000-000000000000';
    }
  }

  for (const row of parsedRows) {
    if (!row.isValid) {
      errorCount++;
      errors.push(`Row ${row.rawIndex} (${row.clientName || 'Unknown'}): ${row.validationErrors.join(', ')}`);
      continue;
    }

    try {
      // 1. Check if client with this name already exists in workspace
      let targetClientId: string | null = null;
      const { data: existingClients } = await supabase
        .from('workspace_clients')
        .select('id, name')
        .eq('workspace_id', targetWorkspaceId)
        .ilike('name', row.clientName.trim());

      if (existingClients && existingClients.length > 0) {
        targetClientId = existingClients[0].id;
        // Update existing client
        await supabase
          .from('workspace_clients')
          .update({
            event_type: row.eventType,
            event_date: row.eventDate,
            total_package_amount: row.calculatedTotal,
            paid_amount: row.calculatedReceived,
            status: row.isAllClear || row.calculatedPending === 0 ? 'completed' : 'active',
            notes: row.location ? `City: ${row.location}` : undefined,
            updated_at: new Date().toISOString()
          })
          .eq('id', targetClientId);
      } else {
        // Create new client
        const { data: newClient, error: clientErr } = await supabase
          .from('workspace_clients')
          .insert([{
            workspace_id: targetWorkspaceId,
            name: row.clientName.trim(),
            phone: '',
            event_type: row.eventType,
            event_date: row.eventDate,
            total_package_amount: row.calculatedTotal,
            paid_amount: row.calculatedReceived,
            status: row.isAllClear || row.calculatedPending === 0 ? 'completed' : 'active',
            notes: row.location ? `City: ${row.location}` : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select('id')
          .single();

        if (clientErr || !newClient) {
          throw new Error(clientErr?.message || 'Failed to insert client record');
        }
        targetClientId = newClient.id;
      }

      // 2. Upsert Client Finance Record
      const finPayload = {
        workspace_id: targetWorkspaceId,
        client_id: targetClientId,
        base_package_price: row.fixAmount,
        discount_amount: 0,
        accommodation_charges: 0,
        travel_charges: 0,
        additional_charges: row.addOnAmount,
        subtotal_amount: row.calculatedTotal,
        gst_rate: 0,
        gst_amount: 0,
        final_total_amount: row.calculatedTotal,
        received_amount: row.calculatedReceived,
        pending_amount: row.calculatedPending,
        payment_status: row.isAllClear || row.calculatedPending === 0 ? 'paid' : row.calculatedReceived > 0 ? 'partially_paid' : 'pending',
        milestones: row.milestones,
        updated_at: new Date().toISOString()
      };

      const { data: existingFin } = await supabase
        .from('client_finance_records')
        .select('id')
        .eq('client_id', targetClientId)
        .maybeSingle();

      if (existingFin) {
        await supabase
          .from('client_finance_records')
          .update(finPayload)
          .eq('client_id', targetClientId);
      } else {
        await supabase
          .from('client_finance_records')
          .insert([{ ...finPayload, created_at: new Date().toISOString() }]);
      }

      successCount++;
    } catch (err: any) {
      errorCount++;
      errors.push(`Row ${row.rawIndex} (${row.clientName}): ${err.message || 'Unknown database error'}`);
    }
  }

  // Log batch import in audit log
  try {
    const actorName = 'Excel Importer';
    await supabase.from('finance_audit_logs').insert([{
      id: `log_import_${Date.now()}`,
      workspace_id: targetWorkspaceId,
      user_id: targetWorkspaceId,
      log_type: 'ADJUSTMENT',
      amount: parsedRows.reduce((sum, r) => sum + r.calculatedTotal, 0),
      actor_name: actorName,
      description: `Excel Batch Migration: Imported ${successCount} clients and finance accounts (Errors: ${errorCount})`,
      created_at: new Date().toISOString()
    }]);
  } catch (_) {}

  return { successCount, errorCount, errors };
}
