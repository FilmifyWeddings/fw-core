'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, TrendingUp, CreditCard, Receipt, Users, Plus, Search, Filter, 
  Calendar, CheckCircle2, Clock, AlertTriangle, ArrowUpRight, ArrowDownRight, 
  FileText, Download, Printer, ExternalLink, ChevronDown, ChevronUp, Edit3, 
  Trash2, X, RefreshCw, Sparkles, Phone, Calculator, Tag, PieChart, Wallet, ArrowRight, Bell, Send, Check, Crown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { extractFinancialsFromQuotation } from '@/lib/quotation-finance-sync';
import { LeadQuotationModal } from '@/components/dashboard/lead-quotation-modal';
import { InvoiceModalDialog } from '@/components/finance/invoice-modal-dialog';
import type { 
  WorkspaceClient, ClientFinanceRecord, FinanceMilestoneItem, FinanceExpenseItem, Lead, LeadStatus, LeadScore
} from '@/types';

// Default expense categories
const DEFAULT_EXPENSE_CATEGORIES = [
  'Photographer Payout',
  'Cinematographer Payout',
  'Video Editor Payout',
  'Drone Operator Payout',
  'Travel & Flights',
  'Hotel & Accommodation',
  'Equipment Rental',
  'Hard Drives & Delivery',
  'Studio Rent & Utilities',
  'Marketing & Meta Ads',
  'Software & Subscriptions',
  'Miscellaneous'
];

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'clients' | 'expenses' | 'analytics'>('clients');
  const [clients, setClients] = useState<WorkspaceClient[]>([]);
  const [financeRecords, setFinanceRecords] = useState<ClientFinanceRecord[]>([]);
  const [expenses, setExpenses] = useState<FinanceExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partially_paid' | 'paid'>('all');
  
  // Expanded client cards set
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Category list for expenses
  const [expenseCategories, setExpenseCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);

  // Modals state
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState<{
    open: boolean;
    client?: WorkspaceClient;
    financeRecord?: ClientFinanceRecord;
    milestoneId?: string;
  }>({ open: false });

  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    payment_mode: 'UPI',
    reference_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
    target_milestone_id: ''
  });

  const [showAddStepModal, setShowAddStepModal] = useState<{
    open: boolean;
    recordId?: string;
  }>({ open: false });

  const [stepFormData, setStepFormData] = useState({
    step_name: '',
    due_date: new Date().toISOString().split('T')[0],
    amount: ''
  });

  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState({
    expense_type: 'project_expense' as const,
    category: 'Travel & Flights',
    title: '',
    amount: '',
    paid_to: '',
    payment_mode: 'UPI',
    payment_date: new Date().toISOString().split('T')[0],
    client_id: '',
    notes: ''
  });

  const [showInvoiceModal, setShowInvoiceModal] = useState<{
    open: boolean;
    client?: WorkspaceClient;
    financeRecord?: ClientFinanceRecord;
  }>({ open: false });

  // Lead Quotation Version Modal state
  const [quotationModalLead, setQuotationModalLead] = useState<Lead | null>(null);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [defaultQuotationTemplate, setDefaultQuotationTemplate] = useState<any>(null);

function computeFinanceTotals(
  rec: ClientFinanceRecord, 
  customMilestones?: FinanceMilestoneItem[], 
  overrideReceived?: number
): ClientFinanceRecord {
  const miles = customMilestones !== undefined ? customMilestones : (rec.milestones || []);
  
  // 1. Calculate pricing totals
  const base = Math.max(0, Math.round(Number(rec.base_package_price || 0)));
  const discount = Math.max(0, Math.round(Number(rec.discount_amount || 0)));
  const accom = Math.max(0, Math.round(Number(rec.accommodation_charges || 0)));
  const travel = Math.max(0, Math.round(Number(rec.travel_charges || 0)));
  const addl = Math.max(0, Math.round(Number(rec.additional_charges || 0)));
  const subtotal = Math.max(0, base - discount + accom + travel + addl);
  const gstRate = Number(rec.gst_rate ?? 18);
  const gstAmount = Math.round((subtotal * gstRate) / 100);
  const finalTotal = subtotal + gstAmount;

  // 2. Calculate received amount from completed milestones if milestones exist
  let received = 0;
  if (overrideReceived !== undefined) {
    received = Math.round(overrideReceived);
  } else if (miles.length > 0) {
    received = miles
      .filter(m => m && (m.status === 'completed' || (m as any).status === 'Completed' || (m as any).status === 'PAID'))
      .reduce((sum, m) => sum + Math.round(Number(m.amount || 0)), 0);
  } else {
    received = Math.round(Number(rec.received_amount || 0));
  }

  const pending = Math.max(0, finalTotal - received);
  const paymentStatus = pending === 0 && finalTotal > 0 ? 'paid' : (received > 0 ? 'partially_paid' : 'pending');

  return {
    ...rec,
    base_package_price: base,
    discount_amount: discount,
    accommodation_charges: accom,
    travel_charges: travel,
    additional_charges: addl,
    subtotal_amount: subtotal,
    gst_rate: gstRate,
    gst_amount: gstAmount,
    final_total_amount: finalTotal,
    received_amount: received,
    pending_amount: pending,
    payment_status: paymentStatus,
    milestones: miles
  };
}

  const handleOpenQuotationModalForRecord = (record: ClientFinanceRecord) => {
    const leadId = record.client?.lead_id || record.client_id;
    const constructedLead: Lead = {
      id: leadId,
      name: record.client?.name || 'Client',
      phone: record.client?.phone || '',
      email: record.client?.email || '',
      workspace_id: record.workspace_id,
      status: 'closed' as LeadStatus,
      source: 'Manual',
      score: 'High-Value 🔥' as LeadScore,
      score_reason: 'Booked Client in Finance',
      final_quotation_id: record.final_quotation_id || (record.client as any)?.final_quotation_id || undefined,
      raw_payload: {
        event_date: record.client?.event_date,
        event_type: record.client?.event_type,
        city: (record.client as any)?.city,
        venue: (record.client as any)?.venue,
        client_id: record.client_id
      },
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString()
    };

    setQuotationModalLead(constructedLead);
    setIsQuotationModalOpen(true);
  };

  // Final Quotation sync state
  const [settingFinalLoadingId, setSettingFinalLoadingId] = useState<string | null>(null);

  const handleSetFinalFromFinance = async (leadId: string, quotationId: string, clientId?: string) => {
    if (!leadId || !quotationId || settingFinalLoadingId) return;
    setSettingFinalLoadingId(quotationId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/quotations/set-final', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quotationId,
          leadId
        })
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        await fetchFinanceData();
      } else {
        alert(json.error || 'Failed to set final quotation');
      }
    } catch (err: any) {
      console.error('Error setting final quotation from finance:', err);
      alert('Failed to set final quotation.');
    } finally {
      setSettingFinalLoadingId(null);
    }
  };

  // Fetch Finance Data
  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      // 1. Fetch Clients
      let clientQuery = supabase
        .from('workspace_clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (workspaceId && workspaceId !== 'ws_demo') {
        clientQuery = clientQuery.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
      }

      const { data: clientData } = await clientQuery;
      let clientList = clientData ? [...clientData] : [];

      // 1b. Check for any leads that have final_quotation_id or quotation documents not yet in workspace_clients
      try {
        let leadsQuery = supabase
          .from('leads')
          .select('id, name, client_name, phone, email, location, city, event_date, event_type, final_quotation_id, user_id, workspace_id')
          .not('final_quotation_id', 'is', null);

        if (workspaceId && workspaceId !== 'ws_demo') {
          leadsQuery = leadsQuery.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
        }

        const { data: leadsWithFinal } = await leadsQuery;
        if (leadsWithFinal && leadsWithFinal.length > 0) {
          const existingLeadIds = new Set(clientList.map(c => c.lead_id).filter(Boolean));
          for (const lead of leadsWithFinal) {
            if (!existingLeadIds.has(lead.id)) {
              // Auto-create workspace_client for this lead
              const newClientPayload = {
                lead_id: lead.id,
                name: lead.name || lead.client_name || 'Client',
                phone: lead.phone || '',
                email: lead.email || '',
                city: lead.city || lead.location || '',
                event_type: lead.event_type || 'Wedding',
                event_date: lead.event_date || null,
                total_package_amount: 0,
                paid_amount: 0,
                status: 'active',
                user_id: lead.user_id || workspaceId,
                workspace_id: lead.workspace_id || workspaceId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };

              const { data: createdClient } = await supabase
                .from('workspace_clients')
                .insert([newClientPayload])
                .select('*')
                .single();

              if (createdClient) {
                clientList.unshift(createdClient);
                existingLeadIds.add(lead.id);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Auto-sync leads with final quotations error:', err);
      }

      setClients(clientList);

      if (clientList.length === 0) {
        setFinanceRecords([]);
        setExpenses([]);
        setLoading(false);
        return;
      }

      // 2. Fetch Client Finance Records
      let financeQuery = supabase
        .from('client_finance_records')
        .select('*');

      if (workspaceId && workspaceId !== 'ws_demo') {
        financeQuery = financeQuery.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
      }

      const { data: dbFinances } = await financeQuery;
      const financeMap = new Map<string, any>();
      if (dbFinances) {
        dbFinances.forEach(f => financeMap.set(f.client_id, f));
      }

      // 3. Fetch Quotation Documents for all clients with lead_id
      const leadIds = clientList.filter(c => c.lead_id).map(c => c.lead_id);
      const quoteDocMap = new Map<string, any>();
      const allLeadQuotesMap = new Map<string, any[]>();
      const leadMap = new Map<string, any>();

      const validLeadIds = leadIds.filter(id => id && typeof id === 'string' && id.trim().length > 0 && id.length >= 8);
      if (validLeadIds.length > 0) {
        try {
          const leadShortFilters = validLeadIds.map(id => `template_id.ilike.%${id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}%`);
          const [docsRes, leadsRes] = await Promise.all([
            supabase
              .from('quotation_documents')
              .select('id, template_id, lead_id, version, lead_version, content_json, created_at, updated_at')
              .or(`lead_id.in.(${validLeadIds.join(',')}),${leadShortFilters.join(',')}`)
              .order('created_at', { ascending: false }),
            supabase
              .from('leads')
              .select('id, name, final_quotation_id, quotation_id')
              .in('id', validLeadIds)
          ]);

          if (leadsRes.data) {
            leadsRes.data.forEach(l => leadMap.set(l.id, l));
          }

          const quoteDocs = docsRes.data;
          if (quoteDocs && quoteDocs.length > 0) {
            const leadGroups = new Map<string, any[]>();
            for (const doc of quoteDocs) {
              const matchedLeadId = doc.lead_id || leadIds.find(lid => doc.template_id?.includes(lid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)));
              if (matchedLeadId) {
                if (!leadGroups.has(matchedLeadId)) leadGroups.set(matchedLeadId, []);
                leadGroups.get(matchedLeadId)!.push(doc);
              }
            }

            leadGroups.forEach((docs, leadId) => {
              allLeadQuotesMap.set(leadId, docs);
              const leadObj = leadMap.get(leadId);
              const finalDoc = docs.find(d => 
                d.content_json?.is_final === true || 
                d.is_final === true || 
                (leadObj?.final_quotation_id && (d.template_id === leadObj.final_quotation_id || d.id === leadObj.final_quotation_id))
              );
              if (finalDoc) {
                quoteDocMap.set(leadId, finalDoc);
              }
            });
          }
        } catch (err) {
          console.warn('[Finance] Error fetching quotation documents:', err);
        }
      }

      // 4. Synthesize records with 100% Quotation Fidelity
      const finalRecords: ClientFinanceRecord[] = [];
      const recordsToUpsertInDB: any[] = [];

      for (const c of clientList) {
        const existing = financeMap.get(c.id);
        const leadObj = c.lead_id ? leadMap.get(c.lead_id) : null;
        const leadDocs = c.lead_id ? (allLeadQuotesMap.get(c.lead_id) || []) : [];
        const availableQuotes = leadDocs.map(d => {
          const v = Number(d.lead_version || d.version || 1);
          const f = d.content_json ? extractFinancialsFromQuotation(d.content_json, c.event_date) : null;
          const couple = d.content_json?.cover?.coupleName || d.content_json?.cover?.groomName || '';
          const isFinal = d.content_json?.is_final === true || 
            d.is_final === true || 
            (leadObj?.final_quotation_id && (d.template_id === leadObj.final_quotation_id || d.id === leadObj.final_quotation_id));
          return {
            template_id: d.template_id,
            version: v,
            title: couple ? `${couple} (V${v})` : `Quotation Version ${v}`,
            is_final: Boolean(isFinal),
            created_at: d.created_at,
            financials: f
          };
        });

        let linkedFinalQuote = c.lead_id ? quoteDocMap.get(c.lead_id) : null;
        if (!linkedFinalQuote && leadDocs.length > 0) {
          linkedFinalQuote = leadDocs.find(d => 
            d.content_json?.is_final === true || 
            d.is_final === true || 
            (leadObj?.final_quotation_id && (d.template_id === leadObj.final_quotation_id || d.id === leadObj.final_quotation_id))
          );
        }
        if (!linkedFinalQuote && leadObj?.final_quotation_id && leadDocs.length > 0) {
          linkedFinalQuote = leadDocs.find(d => d.template_id === leadObj.final_quotation_id || d.id === leadObj.final_quotation_id) || leadDocs[0];
        }

        const hasFinalQuotation = Boolean(linkedFinalQuote || leadObj?.final_quotation_id);
        if (!linkedFinalQuote && hasFinalQuotation && leadDocs.length > 0) {
          linkedFinalQuote = leadDocs[0];
        }

        const finalVersion = linkedFinalQuote ? Number(linkedFinalQuote.lead_version || linkedFinalQuote.version || 1) : undefined;
        const qFinancials = linkedFinalQuote && linkedFinalQuote.content_json
          ? extractFinancialsFromQuotation(linkedFinalQuote.content_json, c.event_date)
          : null;

        if (hasFinalQuotation && qFinancials && qFinancials.final_total_amount > 0) {
          // Quotation is the primary source of truth
          const isDbCorruptOrMissing = !existing || 
            Number(existing.final_total_amount) <= 0 || 
            Number(existing.base_package_price) <= 10 || 
            existing.final_total_amount !== qFinancials.final_total_amount;

          const recordData: ClientFinanceRecord = {
            id: existing?.id || `fin_${c.id}`,
            user_id: workspaceId,
            workspace_id: workspaceId,
            client_id: c.id,
            client: c,
            has_final_quotation: true,
            final_quotation_version: finalVersion,
            final_quotation_id: linkedFinalQuote.template_id,
            available_quotations: availableQuotes,
            base_package_price: qFinancials.base_package_price,
            discount_amount: qFinancials.discount_amount,
            accommodation_charges: qFinancials.accommodation_charges,
            travel_charges: qFinancials.travel_charges,
            additional_charges: qFinancials.additional_charges,
            subtotal_amount: qFinancials.subtotal_amount,
            gst_rate: qFinancials.gst_rate,
            gst_amount: qFinancials.gst_amount,
            final_total_amount: qFinancials.final_total_amount,
            received_amount: existing?.received_amount !== undefined && existing.received_amount > qFinancials.received_amount
              ? Math.round(Number(existing.received_amount))
              : qFinancials.received_amount,
            pending_amount: Math.max(0, qFinancials.final_total_amount - (existing?.received_amount !== undefined && existing.received_amount > qFinancials.received_amount ? Number(existing.received_amount) : qFinancials.received_amount)),
            payment_status: (existing?.payment_status && existing.payment_status !== 'pending')
              ? existing.payment_status
              : qFinancials.payment_status,
            milestones: Array.isArray(existing?.milestones) && existing.milestones.length > 0 && !isDbCorruptOrMissing
              ? existing.milestones
              : qFinancials.milestones,
            created_at: existing?.created_at || c.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          finalRecords.push(recordData);

          if (isDbCorruptOrMissing) {
            recordsToUpsertInDB.push({
              user_id: workspaceId,
              workspace_id: workspaceId,
              client_id: c.id,
              base_package_price: recordData.base_package_price,
              discount_amount: recordData.discount_amount,
              accommodation_charges: recordData.accommodation_charges,
              travel_charges: recordData.travel_charges,
              additional_charges: recordData.additional_charges,
              subtotal_amount: recordData.subtotal_amount,
              gst_rate: recordData.gst_rate,
              gst_amount: recordData.gst_amount,
              final_total_amount: recordData.final_total_amount,
              received_amount: recordData.received_amount,
              pending_amount: recordData.pending_amount,
              payment_status: recordData.payment_status,
              milestones: recordData.milestones,
              updated_at: new Date().toISOString()
            });
          }
        } else if (existing) {
          const rawBase = Math.max(0, Math.round(Number(existing.base_package_price) || Number(c.total_package_amount) || 0));
          const discount = Math.max(0, Math.round(Number(existing.discount_amount) || 0));
          const accommodation = Math.max(0, Math.round(Number(existing.accommodation_charges) || 0));
          const travel = Math.max(0, Math.round(Number(existing.travel_charges) || 0));
          const additional = Math.max(0, Math.round(Number(existing.additional_charges) || 0));
          const subtotal = Math.max(0, rawBase - discount + accommodation + travel + additional);
          const gstRate = Number(existing.gst_rate) || 0;
          const gstAmount = Math.round((subtotal * gstRate) / 100);
          const finalTotal = subtotal + gstAmount;
          const received = Math.max(0, Math.round(Number(existing.received_amount) || Number(c.paid_amount) || 0));
          const pending = Math.max(0, finalTotal - received);

          finalRecords.push({
            ...existing,
            client: c,
            has_final_quotation: hasFinalQuotation,
            final_quotation_version: finalVersion,
            final_quotation_id: linkedFinalQuote?.template_id || leadObj?.final_quotation_id || undefined,
            available_quotations: availableQuotes,
            base_package_price: rawBase,
            discount_amount: discount,
            accommodation_charges: accommodation,
            travel_charges: travel,
            additional_charges: additional,
            subtotal_amount: subtotal,
            gst_rate: gstRate,
            gst_amount: gstAmount,
            final_total_amount: finalTotal,
            received_amount: received,
            pending_amount: pending,
            payment_status: pending === 0 && finalTotal > 0 ? 'paid' : received > 0 ? 'partially_paid' : 'pending',
            milestones: Array.isArray(existing.milestones) && existing.milestones.length > 0
              ? existing.milestones
              : generateDefaultMilestones(finalTotal, c.event_date, received)
          });
        } else {
          // Client without quotation or without finalized quotation
          const basePkg = Math.max(0, Math.round(Number(c.total_package_amount) || 0));
          const discount = 0;
          const subtotal = basePkg;
          const gstRate = 0;
          const gstAmount = 0;
          const finalTotal = subtotal;
          const received = Math.max(0, Math.round(Number(c.paid_amount) || 0));
          const pending = Math.max(0, finalTotal - received);
          const defaultMilestones = generateDefaultMilestones(finalTotal, c.event_date, received);

          const newRecord: ClientFinanceRecord = {
            id: `fin_${c.id}`,
            user_id: workspaceId,
            workspace_id: workspaceId,
            client_id: c.id,
            client: c,
            has_final_quotation: hasFinalQuotation,
            final_quotation_version: finalVersion,
            final_quotation_id: linkedFinalQuote?.template_id || leadObj?.final_quotation_id || undefined,
            available_quotations: availableQuotes,
            base_package_price: basePkg,
            discount_amount: discount,
            accommodation_charges: 0,
            travel_charges: 0,
            additional_charges: 0,
            subtotal_amount: subtotal,
            gst_rate: gstRate,
            gst_amount: gstAmount,
            final_total_amount: finalTotal,
            received_amount: received,
            pending_amount: pending,
            payment_status: pending === 0 && finalTotal > 0 ? 'paid' : received > 0 ? 'partially_paid' : 'pending',
            milestones: defaultMilestones,
            created_at: c.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          finalRecords.push(newRecord);
        }
      }

      setFinanceRecords(finalRecords);
      if (finalRecords.length > 0) {
        setExpandedCards(new Set([finalRecords[0].id]));
      }

      // Background persist/heal records
      if (recordsToUpsertInDB.length > 0 && workspaceId !== 'ws_demo') {
        (async () => {
          try {
            for (const item of recordsToUpsertInDB) {
              const { data: existingRec } = await supabase
                .from('client_finance_records')
                .select('id')
                .eq('client_id', item.client_id)
                .maybeSingle();

              if (existingRec) {
                await supabase
                  .from('client_finance_records')
                  .update(item)
                  .eq('client_id', item.client_id);
              } else {
                await supabase
                  .from('client_finance_records')
                  .insert([{ ...item, created_at: new Date().toISOString() }]);
              }

              // Also sync package amount on workspace_clients
              await supabase
                .from('workspace_clients')
                .update({
                  total_package_amount: item.final_total_amount,
                  paid_amount: item.received_amount,
                  updated_at: new Date().toISOString()
                })
                .eq('id', item.client_id);
            }
          } catch (_) {}
        })();
      }

      // 4. Fetch Expenses
      let expenseQuery = supabase
        .from('finance_expenses')
        .select('*')
        .order('payment_date', { ascending: false });

      if (workspaceId && workspaceId !== 'ws_demo') {
        expenseQuery = expenseQuery.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
      }

      const { data: expenseData } = await expenseQuery;
      if (expenseData && expenseData.length > 0) {
        setExpenses(expenseData);
      } else {
        // Initial sample studio expenses
        setExpenses([
          {
            id: 'exp_1',
            workspace_id: workspaceId,
            expense_type: 'team_payout',
            category: 'Photographer Payout',
            title: 'Lead Photographer (Amit) 3-Day Wedding Advance',
            amount: 35000,
            payment_date: '2026-08-01',
            paid_to: 'Amit Sharma',
            payment_mode: 'UPI',
            status: 'paid',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'exp_2',
            workspace_id: workspaceId,
            expense_type: 'project_expense',
            category: 'Travel & Flights',
            title: 'Indigo Flight Tickets Mumbai -> Udaipur (Crew of 4)',
            amount: 24500,
            payment_date: '2026-08-05',
            paid_to: 'Indigo Airlines',
            payment_mode: 'Card',
            status: 'paid',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'exp_3',
            workspace_id: workspaceId,
            expense_type: 'project_expense',
            category: 'Equipment Rental',
            title: 'Sony FX3 + G-Master Lens + Gimbal 3-Day Rental',
            amount: 18000,
            payment_date: '2026-08-08',
            paid_to: 'Pro Cine Equipment Mumbai',
            payment_mode: 'Bank Transfer',
            status: 'paid',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);
      }

    } catch (e) {
      console.error('Error fetching finance data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Helper to generate the 4 default milestones matching user's quotation schedule image
  const generateDefaultMilestones = (totalAmount: number, eventDateStr?: string | null, initialPaid = 25000): FinanceMilestoneItem[] => {
    const eventDate = eventDateStr ? new Date(eventDateStr) : new Date();
    
    // Step 1: Token Booking Amount (~15%)
    const tokenAmount = Math.round(totalAmount * 0.15) || 25000;
    // Step 2: Advance Amount Pre-Event (~45%)
    const advanceAmount = Math.round(totalAmount * 0.45) || 75000;
    // Step 3: On Wedding Day (~30%)
    const weddingDayAmount = Math.round(totalAmount * 0.30) || 50000;
    // Step 4: Final Delivery Amount (~10%)
    const finalDeliveryAmount = Math.max(0, totalAmount - (tokenAmount + advanceAmount + weddingDayAmount));

    const tokenDate = new Date(eventDate.getTime() - 90 * 86400000).toISOString().split('T')[0];
    const preEventDate = new Date(eventDate.getTime() - 15 * 86400000).toISOString().split('T')[0];
    const weddingDate = eventDate.toISOString().split('T')[0];
    const deliveryDate = new Date(eventDate.getTime() + 30 * 86400000).toISOString().split('T')[0];

    return [
      {
        id: `m_1_${Date.now()}`,
        step_name: 'Token Booking Amount',
        due_date: tokenDate,
        amount: tokenAmount,
        status: initialPaid >= tokenAmount ? 'completed' : 'pending',
        payment_mode: 'UPI',
        paid_date: initialPaid >= tokenAmount ? tokenDate : null
      },
      {
        id: `m_2_${Date.now()}`,
        step_name: 'Advance Amount (Pre-Event)',
        due_date: preEventDate,
        amount: advanceAmount,
        status: 'pending',
        payment_mode: 'Bank Transfer'
      },
      {
        id: `m_3_${Date.now()}`,
        step_name: 'On Wedding Day',
        due_date: weddingDate,
        amount: weddingDayAmount,
        status: 'pending',
        payment_mode: 'UPI'
      },
      {
        id: `m_4_${Date.now()}`,
        step_name: 'Final Delivery Amount',
        due_date: deliveryDate,
        amount: finalDeliveryAmount,
        status: 'pending',
        payment_mode: 'Bank Transfer'
      }
    ];
  };

  // Toggle card expansion
  const toggleCard = (recordId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
  };

  // Persist finance record changes to Supabase
  const updateFinanceRecordInDB = async (record: ClientFinanceRecord) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      const payload = {
        user_id: workspaceId,
        workspace_id: workspaceId,
        client_id: record.client_id,
        base_package_price: Math.round(record.base_package_price),
        discount_amount: Math.round(record.discount_amount),
        accommodation_charges: Math.round(record.accommodation_charges),
        travel_charges: Math.round(record.travel_charges),
        additional_charges: Math.round(record.additional_charges),
        subtotal_amount: Math.round(record.subtotal_amount),
        gst_rate: record.gst_rate,
        gst_amount: Math.round(record.gst_amount),
        final_total_amount: Math.round(record.final_total_amount),
        received_amount: Math.round(record.received_amount),
        pending_amount: Math.round(record.pending_amount),
        payment_status: record.payment_status,
        milestones: record.milestones,
        updated_at: new Date().toISOString()
      };

      const { data } = await supabase
        .from('client_finance_records')
        .update(payload)
        .eq('client_id', record.client_id)
        .select('id');

      if (!data || data.length === 0) {
        await supabase
          .from('client_finance_records')
          .insert([{ ...payload, created_at: new Date().toISOString() }]);
      }

      // Also update paid_amount & total_package_amount on workspace_clients table
      await supabase
        .from('workspace_clients')
        .update({
          total_package_amount: Math.round(record.final_total_amount),
          paid_amount: Math.round(record.received_amount),
          updated_at: new Date().toISOString()
        })
        .eq('id', record.client_id);

      // Sync back to Lead Quotation document if linked
      const targetLeadId = record.client?.lead_id;
      if (targetLeadId) {
        (async () => {
          try {
            const { data: quoteDocs } = await supabase
              .from('quotation_documents')
              .select('id, template_id, content_json')
              .or(`lead_id.eq.${targetLeadId},template_id.eq.FW-L-${targetLeadId},template_id.eq.FW-Q-${targetLeadId}`)
              .order('created_at', { ascending: false })
              .limit(1);

            if (quoteDocs && quoteDocs.length > 0) {
              const targetDoc = quoteDocs[0];
              const contentJson = targetDoc.content_json || {};
              
              // Update pricingPage
              contentJson.pricingPage = {
                ...(contentJson.pricingPage || {}),
                basePrice: Math.round(record.base_package_price),
                discountAmount: Math.round(record.discount_amount),
                accommodationCharges: Math.round(record.accommodation_charges),
                travelCharges: Math.round(record.travel_charges),
                additionalCharges: Math.round(record.additional_charges),
                gstPct: record.gst_rate
              };

              // Update paymentTermsPage steps
              if (Array.isArray(record.milestones) && record.milestones.length > 0) {
                contentJson.paymentTermsPage = {
                  ...(contentJson.paymentTermsPage || {}),
                  steps: record.milestones.map((m: any) => ({
                    id: m.id,
                    name: m.step_name,
                    stepName: m.step_name,
                    amount: Math.round(m.amount),
                    status: m.status === 'completed' ? 'Completed' : 'Pending',
                    date: m.due_date,
                    paid_date: m.paid_date,
                    payment_mode: m.payment_mode
                  }))
                };
              }

              await supabase
                .from('quotation_documents')
                .update({
                  content_json: contentJson,
                  updated_at: new Date().toISOString()
                })
                .eq('id', targetDoc.id);
            }
          } catch (syncErr) {
            console.warn('[FinanceToQuotationSync] Error:', syncErr);
          }
        })();
      }

    } catch (e) {
      console.error('Error updating finance record in DB:', e);
    }
  };

  // Handle Pricing Breakdown Field Change (Recalculates Subtotal, GST 18%, and Final Total)
  const handleBreakdownChange = (
    recordId: string, 
    field: keyof ClientFinanceRecord, 
    val: number
  ) => {
    setFinanceRecords(prev => prev.map(rec => {
      if (rec.id === recordId) {
        const updated = { ...rec, [field]: Math.round(val || 0) };
        const finalUpdated = computeFinanceTotals(updated);
        updateFinanceRecordInDB(finalUpdated);
        return finalUpdated;
      }
      return rec;
    }));
  };

  // Handle Milestone Step Name Change
  const handleMilestoneNameChange = (recordId: string, milestoneId: string, newName: string) => {
    setFinanceRecords(prev => prev.map(rec => {
      if (rec.id === recordId) {
        const updatedMilestones = (rec.milestones || []).map(m => {
          if (m.id === milestoneId) {
            return { ...m, step_name: newName };
          }
          return m;
        });
        const updated = computeFinanceTotals(rec, updatedMilestones);
        updateFinanceRecordInDB(updated);
        return updated;
      }
      return rec;
    }));
  };

  // Handle Milestone Amount Change
  const handleMilestoneAmountChange = (recordId: string, milestoneId: string, newAmount: number) => {
    setFinanceRecords(prev => prev.map(rec => {
      if (rec.id === recordId) {
        const updatedMilestones = (rec.milestones || []).map(m => {
          if (m.id === milestoneId) {
            return { ...m, amount: Math.max(0, Math.round(newAmount || 0)) };
          }
          return m;
        });
        const updated = computeFinanceTotals(rec, updatedMilestones);
        updateFinanceRecordInDB(updated);
        return updated;
      }
      return rec;
    }));
  };

  // Handle Milestone Status Toggle
  const handleMilestoneStatusToggle = (recordId: string, milestoneId: string, newStatus: 'completed' | 'pending') => {
    setFinanceRecords(prev => prev.map(rec => {
      if (rec.id === recordId) {
        const updatedMilestones = (rec.milestones || []).map(m => {
          if (m.id === milestoneId) {
            return {
              ...m,
              status: newStatus,
              paid_date: newStatus === 'completed' ? (m.paid_date || new Date().toISOString().split('T')[0]) : undefined
            };
          }
          return m;
        });
        const updated = computeFinanceTotals(rec, updatedMilestones);
        updateFinanceRecordInDB(updated);
        return updated;
      }
      return rec;
    }));
  };

  // Handle Milestone Date Change
  const handleMilestoneDateChange = (recordId: string, milestoneId: string, newDate: string) => {
    setFinanceRecords(prev => prev.map(rec => {
      if (rec.id === recordId) {
        const updatedMilestones = (rec.milestones || []).map(m => {
          if (m.id === milestoneId) {
            return { ...m, due_date: newDate };
          }
          return m;
        });

        const updated = computeFinanceTotals(rec, updatedMilestones);
        updateFinanceRecordInDB(updated);
        return updated;
      }
      return rec;
    }));
  };

  // Handle Deleting a Milestone Step
  const handleDeleteMilestone = (recordId: string, milestoneId: string) => {
    if (!confirm('Are you sure you want to delete this payment milestone step?')) return;

    setFinanceRecords(prev => prev.map(rec => {
      if (rec.id === recordId) {
        const updatedMilestones = (rec.milestones || []).filter(m => m.id !== milestoneId);
        const updated = computeFinanceTotals(rec, updatedMilestones);
        updateFinanceRecordInDB(updated);
        return updated;
      }
      return rec;
    }));
  };

  // Handle Recording a Milestone Payment from Modal
  const handleSaveRecordedPayment = () => {
    if (!showRecordPaymentModal.financeRecord) return;
    const rec = showRecordPaymentModal.financeRecord;
    const paidAmt = Math.round(parseFloat(paymentFormData.amount) || 0);
    if (paidAmt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    let updatedMilestones = Array.isArray(rec.milestones) ? [...rec.milestones] : [];
    
    if (paymentFormData.target_milestone_id) {
      // User clicked "Pay" on a specific milestone
      updatedMilestones = updatedMilestones.map(m => {
        if (m.id === paymentFormData.target_milestone_id) {
          return {
            ...m,
            amount: paidAmt,
            status: 'completed' as const,
            paid_date: paymentFormData.payment_date || new Date().toISOString().split('T')[0],
            payment_mode: paymentFormData.payment_mode || 'UPI',
            reference_id: paymentFormData.reference_id || null,
            notes: paymentFormData.notes || null
          };
        }
        return m;
      });
    } else {
      // General "Record Payment" button at top of card
      const firstPendingIdx = updatedMilestones.findIndex(m => m.status !== 'completed');
      if (firstPendingIdx !== -1) {
        updatedMilestones[firstPendingIdx] = {
          ...updatedMilestones[firstPendingIdx],
          amount: paidAmt,
          status: 'completed' as const,
          paid_date: paymentFormData.payment_date || new Date().toISOString().split('T')[0],
          payment_mode: paymentFormData.payment_mode || 'UPI',
          reference_id: paymentFormData.reference_id || null,
          notes: paymentFormData.notes || null
        };
      } else {
        // Add a new completed milestone for this payment
        updatedMilestones.push({
          id: `m_pay_${Date.now()}`,
          step_name: `Payment (${paymentFormData.payment_mode || 'UPI'})`,
          due_date: paymentFormData.payment_date || new Date().toISOString().split('T')[0],
          paid_date: paymentFormData.payment_date || new Date().toISOString().split('T')[0],
          amount: paidAmt,
          status: 'completed',
          payment_mode: paymentFormData.payment_mode || 'UPI',
          reference_id: paymentFormData.reference_id || null,
          notes: paymentFormData.notes || null
        });
      }
    }

    const updatedRecord = computeFinanceTotals(rec, updatedMilestones);

    setFinanceRecords(prev => prev.map(r => r.id === rec.id ? updatedRecord : r));
    updateFinanceRecordInDB(updatedRecord);

    setShowRecordPaymentModal({ open: false });
    setPaymentFormData({
      amount: '',
      payment_mode: 'UPI',
      reference_id: '',
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
      target_milestone_id: ''
    });
  };

  // Handle Add New Step from Modal
  const handleSaveNewStep = () => {
    if (!showAddStepModal.recordId || !stepFormData.step_name.trim()) {
      alert('Please enter Step Name');
      return;
    }

    const amt = Math.round(parseFloat(stepFormData.amount) || 0);
    const newMilestone: FinanceMilestoneItem = {
      id: `m_step_${Date.now()}`,
      step_name: stepFormData.step_name.trim(),
      due_date: stepFormData.due_date,
      amount: amt,
      status: 'pending',
      payment_mode: 'UPI'
    };

    setFinanceRecords(prev => prev.map(rec => {
      if (rec.id === showAddStepModal.recordId) {
        const updatedMilestones = [...(rec.milestones || []), newMilestone];
        const updated = computeFinanceTotals(rec, updatedMilestones);
        updateFinanceRecordInDB(updated);
        return updated;
      }
      return rec;
    }));

    setShowAddStepModal({ open: false });
    setStepFormData({
      step_name: '',
      due_date: new Date().toISOString().split('T')[0],
      amount: ''
    });
  };

  // Handle Add New Expense
  const handleSaveExpense = async () => {
    const amt = Math.round(parseFloat(expenseFormData.amount) || 0);
    if (!expenseFormData.title || amt <= 0) {
      alert('Please enter Expense Title and a valid Amount.');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      const newExp: FinanceExpenseItem = {
        id: `exp_${Date.now()}`,
        user_id: workspaceId,
        workspace_id: workspaceId,
        client_id: expenseFormData.client_id || null,
        expense_type: expenseFormData.expense_type,
        category: expenseFormData.category,
        title: expenseFormData.title,
        amount: amt,
        paid_to: expenseFormData.paid_to || null,
        payment_mode: expenseFormData.payment_mode,
        payment_date: expenseFormData.payment_date,
        status: 'paid',
        notes: expenseFormData.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setExpenses(prev => [newExp, ...prev]);

      if (workspaceId !== 'ws_demo') {
        await supabase.from('finance_expenses').insert([{
          user_id: workspaceId,
          workspace_id: workspaceId,
          client_id: newExp.client_id,
          expense_type: newExp.expense_type,
          category: newExp.category,
          title: newExp.title,
          amount: newExp.amount,
          paid_to: newExp.paid_to,
          payment_mode: newExp.payment_mode,
          payment_date: newExp.payment_date,
          status: 'paid',
          notes: newExp.notes
        }]);
      }

      setShowAddExpenseModal(false);
      setExpenseFormData({
        expense_type: 'project_expense',
        category: 'Travel & Flights',
        title: '',
        amount: '',
        paid_to: '',
        payment_mode: 'UPI',
        payment_date: new Date().toISOString().split('T')[0],
        client_id: '',
        notes: ''
      });
    } catch (e) {
      console.error('Error saving expense:', e);
    }
  };

  // Totals calculations (Strict Integers, No Floats)
  const totalInvoiced = useMemo(() => {
    return Math.round(financeRecords.reduce((acc, r) => acc + (Number(r.final_total_amount) || 0), 0));
  }, [financeRecords]);

  const totalReceived = useMemo(() => {
    return Math.round(financeRecords.reduce((acc, r) => acc + (Number(r.received_amount) || 0), 0));
  }, [financeRecords]);

  const totalPending = useMemo(() => {
    return Math.max(0, totalInvoiced - totalReceived);
  }, [totalInvoiced, totalReceived]);

  const totalExpensesAmount = useMemo(() => {
    return Math.round(expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0));
  }, [expenses]);

  const netProfit = Math.round(totalReceived - totalExpensesAmount);
  const profitMargin = totalReceived > 0 ? Math.round((netProfit / totalReceived) * 100) : 0;

  // Filtered finance records
  const filteredRecords = useMemo(() => {
    return financeRecords.filter(rec => {
      const clientName = rec.client?.name?.toLowerCase() || '';
      const eventType = rec.client?.event_type?.toLowerCase() || '';
      const query = searchQuery.toLowerCase();

      const matchesSearch = clientName.includes(query) || eventType.includes(query);
      const matchesStatus = statusFilter === 'all' || rec.payment_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [financeRecords, searchQuery, statusFilter]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C2416] pb-24 pt-3 px-4 sm:px-6 lg:px-8 font-sans selection:bg-[#F5EEDC] selection:text-[#8C6D28]">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ─────────────────────────────────────────────────────────────
            HEADER & ACTION BUTTONS (HIGH-END LUXURY CREAM / WARM GOLD)
        ───────────────────────────────────────────────────────────── */}
        <div className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 border border-[#EBE3D5] shadow-[0_4px_25px_-5px_rgba(200,165,110,0.08)] flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E2B857] via-[#D4AF37] to-[#B38728] flex items-center justify-center shadow-md shadow-[#D4AF37]/25 text-white shrink-0">
              <DollarSign className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-[#221B10]">Finance & Payment Milestones</h1>
                <span className="px-3 py-0.5 rounded-full text-xs font-black bg-[#F5EEDC] text-[#8C6D28] border border-[#E3D3AC] tracking-wider uppercase">
                  Studio Suite
                </span>
              </div>
              <p className="text-xs text-[#7A6950] mt-1 font-medium">
                Quotation pricing sync, 4-tier milestone schedules, client invoices, team payouts, and P&L tracking.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowAddExpenseModal(true)}
              className="px-4 py-2.5 text-xs font-bold text-[#4E3B15] bg-[#F7EFCF] hover:bg-[#F2E5B8] border border-[#DFCFA0] rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-[#8C6D28]" />
              + Add Expense / Payout
            </button>

            <Link
              href="/workspace/clients"
              className="px-4 py-2.5 text-xs font-bold text-[#554734] bg-white hover:bg-[#FAF6ED] border border-[#E5DAC8] rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            >
              <Users className="w-4 h-4 text-[#8C7654]" />
              Clients Directory
            </Link>

            <button
              onClick={fetchFinanceData}
              className="p-2.5 text-[#7A6950] hover:text-[#221B10] bg-white hover:bg-[#FAF6ED] border border-[#E5DAC8] rounded-xl transition shadow-2xs cursor-pointer active:scale-95"
              title="Refresh Finance Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#D4AF37]' : ''}`} />
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            FINANCIAL METRIC CARDS (EXACT REPLICA OF USER DESIGN WITH SPARKLINES)
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Gross Invoiced */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-orange-50/90 text-orange-500 border border-orange-100 flex items-center justify-center shrink-0 shadow-2xs">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GROSS INVOICED</p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans tabular-nums mt-0.5">
                  ₹{totalInvoiced.toLocaleString('en-IN')}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{financeRecords.length} Active Contracts</p>
              </div>
            </div>

            {/* Sparkline Graph */}
            <div className="mt-3 -mx-5 -mb-5">
              <svg className="w-full h-10" viewBox="0 0 100 28" fill="none" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="grad-invoiced" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F97316" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#F97316" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M0,22 Q12,24 25,18 T50,20 T75,13 T100,5 L100,28 L0,28 Z" fill="url(#grad-invoiced)" />
                <path d="M0,22 Q12,24 25,18 T50,20 T75,13 T100,5" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* 2. Cash Received */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50/90 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 shadow-2xs">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CASH RECEIVED</p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans tabular-nums mt-0.5">
                  ₹{totalReceived.toLocaleString('en-IN')}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                  <span>{totalInvoiced > 0 ? Math.round((totalReceived / totalInvoiced) * 100) : 0}% Realized</span>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                </p>
              </div>
            </div>

            {/* Sparkline Graph */}
            <div className="mt-3 -mx-5 -mb-5">
              <svg className="w-full h-10" viewBox="0 0 100 28" fill="none" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="grad-received" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M0,23 Q18,24 35,17 T65,19 T85,9 T100,4 L100,28 L0,28 Z" fill="url(#grad-received)" />
                <path d="M0,23 Q18,24 35,17 T65,19 T85,9 T100,4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* 3. Pending Receivables */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50/90 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0 shadow-2xs">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PENDING RECEIVABLES</p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans tabular-nums mt-0.5">
                  ₹{totalPending.toLocaleString('en-IN')}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Scheduled Milestones</p>
              </div>
            </div>

            {/* Sparkline Graph */}
            <div className="mt-3 -mx-5 -mb-5">
              <svg className="w-full h-10" viewBox="0 0 100 28" fill="none" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="grad-pending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M0,22 Q20,24 40,20 T70,16 T90,12 T100,7 L100,28 L0,28 Z" fill="url(#grad-pending)" />
                <path d="M0,22 Q20,24 40,20 T70,16 T90,12 T100,7" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* 4. Team & Expenses */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50/90 text-rose-500 border border-rose-100 flex items-center justify-center shrink-0 shadow-2xs">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TEAM & EXPENSES</p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans tabular-nums mt-0.5">
                  ₹{totalExpensesAmount.toLocaleString('en-IN')}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{expenses.length} Logged Payouts</p>
              </div>
            </div>

            {/* Sparkline Graph */}
            <div className="mt-3 -mx-5 -mb-5">
              <svg className="w-full h-10" viewBox="0 0 100 28" fill="none" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="grad-expense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M0,23 Q25,24 45,21 T75,18 T90,12 T100,5 L100,28 L0,28 Z" fill="url(#grad-expense)" />
                <path d="M0,23 Q25,24 45,21 T75,18 T90,12 T100,5" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* 5. Net Studio Profit */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-50/90 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NET STUDIO PROFIT</p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans tabular-nums mt-0.5">
                  ₹{netProfit.toLocaleString('en-IN')}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                  <span>{profitMargin}% Profit Margin</span>
                  <Sparkles className="w-3 h-3 text-purple-500" />
                </p>
              </div>
            </div>

            {/* Sparkline Graph */}
            <div className="mt-3 -mx-5 -mb-5">
              <svg className="w-full h-10" viewBox="0 0 100 28" fill="none" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="grad-profit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M0,23 Q20,24 40,20 T70,17 T88,10 T100,4 L100,28 L0,28 Z" fill="url(#grad-profit)" />
                <path d="M0,23 Q20,24 40,20 T70,17 T88,10 T100,4" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB SWITCHER & SEARCH / FILTERS STRIP
        ───────────────────────────────────────────────────────────── */}
        <div className="bg-[#FFFDF9] p-3.5 sm:p-4 rounded-3xl border border-[#EBE3D5] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Tabs Capsule */}
          <div className="flex items-center gap-1.5 p-1 bg-[#F5EEDC] border border-[#E5DAC4] rounded-2xl w-full md:w-auto">
            <button
              onClick={() => setActiveTab('clients')}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'clients'
                  ? 'bg-white text-[#221B10] shadow-xs border border-[#E0D3BC]'
                  : 'text-[#7A6950] hover:text-[#221B10]'
              }`}
            >
              <Receipt className="w-4 h-4 text-[#D4AF37]" />
              Client Invoices & Milestones
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'expenses'
                  ? 'bg-white text-[#221B10] shadow-xs border border-[#E0D3BC]'
                  : 'text-[#7A6950] hover:text-[#221B10]'
              }`}
            >
              <CreditCard className="w-4 h-4 text-[#D4AF37]" />
              Team Payouts & Expenses ({expenses.length})
            </button>
          </div>

          {/* Search & Filter */}
          {activeTab === 'clients' && (
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9E8E75]" />
                <input
                  type="text"
                  placeholder="Search client or event..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF7F0] border border-[#E5DAC8] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 text-[#221B10] font-medium placeholder-[#9E8E75]"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 text-xs font-bold bg-[#FAF7F0] border border-[#E5DAC8] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 text-[#3D311F]"
              >
                <option value="all">All Statuses</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Fully Paid</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: CLIENT INVOICES & MILESTONES (PREMIUM CREAM / GOLD CARDS)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
            {loading ? (
              <div className="bg-[#FFFDF9] p-12 rounded-3xl border border-[#EBE3D5] text-center space-y-3 shadow-sm">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin text-[#D4AF37]" />
                <p className="text-sm font-bold text-[#6B5A40]">Loading Client Billing & Milestones...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="bg-[#FFFDF9] p-12 rounded-3xl border border-dashed border-[#E0D3BC] text-center space-y-4 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-[#F5EEDC] text-[#8C6D28] mx-auto flex items-center justify-center">
                  <Receipt className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#221B10]">No Client Finance Records Found</h3>
                  <p className="text-xs text-[#7A6950] max-w-md mx-auto mt-1">
                    Convert leads in Leads CRM or add clients from Client Directory to automatically generate quotation financial breakdowns and payment schedules.
                  </p>
                </div>
                <Link
                  href="/leads"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#D4AF37] to-[#B38728] hover:brightness-105 rounded-xl shadow-md transition"
                >
                  Go to Leads CRM
                </Link>
              </div>
            ) : (
              filteredRecords.map((record) => {
                const isExpanded = expandedCards.has(record.id);
                const client = record.client;
                const milestones = record.milestones || [];
                const progressPct = record.final_total_amount > 0 
                  ? Math.min(100, Math.round((record.received_amount / record.final_total_amount) * 100)) 
                  : 0;

                const clientInitials = client?.name 
                  ? client.name.trim().split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() 
                  : 'CL';

                return (
                  <motion.div
                    key={record.id}
                    layout
                    className="bg-[#FFFDF9] rounded-3xl border border-[#EBE3D5] shadow-[0_4px_24px_-4px_rgba(200,165,110,0.08)] hover:border-[#D4AF37]/70 hover:shadow-[0_10px_35px_-6px_rgba(200,165,110,0.15)] transition-all duration-300 overflow-hidden"
                  >
                    {/* ── CLIENT CARD HEADER ── */}
                    <div className="p-5 sm:p-6 bg-gradient-to-r from-[#FFFDF9] via-[#FAF6ED] to-[#FFFDF9] border-b border-[#EFE8DA] flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                      <div className="flex items-start sm:items-center gap-4">
                        {/* Monogram Avatar Badge */}
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E2B857] via-[#D4AF37] to-[#B38728] text-white font-black text-sm flex items-center justify-center shadow-sm shrink-0 tracking-wider">
                          {clientInitials}
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h2 className="text-xl font-bold text-[#1E170E] tracking-tight">
                              {client?.name || 'Client Name'}
                            </h2>

                            {/* Payment Status Badge */}
                            <span className={`px-3 py-0.5 rounded-full text-[11px] font-extrabold border shadow-2xs ${
                              record.payment_status === 'paid'
                                ? 'bg-[#EAF7EE] text-[#1E7E45] border-[#BCE7CB]'
                                : record.payment_status === 'partially_paid'
                                ? 'bg-[#FDF4DC] text-[#8C6D28] border-[#E8D6A7]'
                                : 'bg-[#FFF1E3] text-[#C4611A] border-[#FCD2B3]'
                            }`}>
                              {record.payment_status === 'paid' ? 'Fully Paid' : record.payment_status === 'partially_paid' ? 'Partially Paid' : 'Pending'}
                            </span>

                            {/* Final Quotation Status Badge */}
                            {record.has_final_quotation ? (
                              <button
                                type="button"
                                onClick={() => handleOpenQuotationModalForRecord(record)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-[#D4AF37] to-[#B38728] text-white border border-[#E6CA65] shadow-xs hover:brightness-105 active:scale-95 transition cursor-pointer"
                                title="Click to view quotation versions or switch final version"
                              >
                                <Crown className="w-3.5 h-3.5 text-[#FFF5D6]" />
                                <span>Final Quotation (V{record.final_quotation_version || 1})</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenQuotationModalForRecord(record)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white hover:bg-[#F9F4E8] text-[#8C6D28] border border-[#E3D4B0] shadow-2xs active:scale-95 transition cursor-pointer"
                                title="Click to select final quotation version"
                              >
                                <Plus className="w-3.5 h-3.5 text-[#8C6D28] stroke-[3]" />
                                <span>Select Final Quotation</span>
                              </button>
                            )}
                          </div>

                          {/* Event details & Contact */}
                          <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3.5 text-xs text-[#7A6950] font-medium">
                            <span className="flex items-center gap-1.5 text-[#634E23] font-bold bg-[#F7EEDC] px-2.5 py-0.5 rounded-lg border border-[#EADBBD]">
                              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                              {client?.event_type || 'Wedding Photography'}
                            </span>
                            <span className="flex items-center gap-1.5 text-[#7A6950]">
                              <Calendar className="w-3.5 h-3.5 text-[#A3927B]" />
                              Event Date: {client?.event_date ? new Date(client.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not Scheduled'}
                            </span>
                            {client?.phone && (
                              <span className="flex items-center gap-1.5 text-[#7A6950] font-mono">
                                <Phone className="w-3 h-3 text-[#A3927B]" />
                                {client.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Amounts Capsule, Quick Actions & Toggle */}
                      <div className="flex flex-wrap items-center gap-3.5">
                        {/* Received vs Pending Progress Mini Capsule */}
                        <div className="bg-white/95 backdrop-blur-sm border border-[#E8DFD0] p-3 px-4 rounded-2xl shadow-2xs flex flex-col justify-center min-w-[210px] space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-black tabular-nums">
                            <span className="text-[#1E7E45] flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-[#2E9B59]" />
                              Rec: ₹{record.received_amount.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[#C4611A] flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-[#E67E22]" />
                              Pend: ₹{record.pending_amount.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-[#EFE8DC] rounded-full overflow-hidden border border-[#E5DAC8]/60">
                            <div 
                              className="h-full bg-gradient-to-r from-[#2E9B59] via-[#E2B857] to-[#D4AF37] rounded-full transition-all duration-500"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-bold text-[#8C7A60] tabular-nums">
                            <span>Total: ₹{record.final_total_amount.toLocaleString('en-IN')}</span>
                            <span className="text-[#8C6D28] font-black">{progressPct}% Paid</span>
                          </div>
                        </div>

                        {/* Quick Record Payment Button */}
                        <button
                          onClick={() => {
                            setShowRecordPaymentModal({
                              open: true,
                              client: client || undefined,
                              financeRecord: record
                            });
                          }}
                          className="px-4 py-2.5 text-xs font-bold text-white bg-[#1E7E45] hover:bg-[#166536] active:scale-95 rounded-xl shadow-xs hover:shadow transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Record Payment
                        </button>

                        {/* Generate Tax Invoice / Receipt Button */}
                        <button
                          onClick={() => {
                            setShowInvoiceModal({
                              open: true,
                              client: client || undefined,
                              financeRecord: record
                            });
                          }}
                          className="px-3.5 py-2.5 text-xs font-bold text-[#503E1A] bg-[#FAF3E0] hover:bg-[#F5EBD0] border border-[#E3D3AC] active:scale-95 rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#8C6D28]" />
                          Invoice
                        </button>

                        {/* Expand / Collapse Button */}
                        <button
                          onClick={() => toggleCard(record.id)}
                          className="p-2.5 text-[#503E1A] bg-[#F5EEDC] hover:bg-[#EFE5CE] active:scale-95 rounded-xl transition cursor-pointer"
                          title={isExpanded ? 'Hide Pricing & Milestones' : 'View Pricing & Milestones'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* ── EXPANDED PRICING BREAKDOWN & PAYMENT SCHEDULE ── */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="p-6 sm:p-8 space-y-6 bg-[#FAF7F2] border-t border-[#EFE8DA]"
                        >
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                            {/* ── LEFT: PRICING DETAILS (WARM LUXURY STUDIO CARD) ── */}
                            <div className="lg:col-span-5 bg-white rounded-3xl border border-[#EBE3D5] p-6 shadow-xs flex flex-col justify-between space-y-5">
                              <div>
                                <div className="flex items-center justify-between pb-3 border-b border-[#EFE8DA]">
                                  <div>
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#8C6D28] bg-[#F5EEDC] px-2.5 py-0.5 rounded-md border border-[#E3D3AC]">
                                      <Calculator className="w-3 h-3 text-[#D4AF37]" /> PRICING BREAKDOWN
                                    </span>
                                    <h3 className="text-base font-bold text-[#1E170E] tracking-tight mt-1.5">Package & Charges</h3>
                                  </div>
                                </div>

                                <div className="space-y-2.5 text-xs mt-4">
                                  {/* Base Package Price */}
                                  <div className="flex items-center justify-between p-3 bg-[#FAF7F2] hover:bg-[#F6F0E6] rounded-2xl border border-[#EDE4D5] transition">
                                    <span className="font-bold text-[#443825]">Base Package Price</span>
                                    <div className="relative inline-flex items-center">
                                      <span className="absolute left-2.5 text-[#9E8E75] font-bold text-xs">₹</span>
                                      <input
                                        type="number"
                                        value={record.base_package_price || 0}
                                        onChange={(e) => handleBreakdownChange(record.id, 'base_package_price', parseFloat(e.target.value) || 0)}
                                        className="w-28 pl-6 pr-2 py-1 text-right font-bold text-[#1E170E] bg-white border border-[#E5DAC8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 font-sans tabular-nums shadow-2xs"
                                      />
                                    </div>
                                  </div>

                                  {/* Discount (Complimentary) */}
                                  <div className="flex items-center justify-between p-3 bg-[#FDF2F0] hover:bg-[#FCEAE7] rounded-2xl border border-[#F6CCC7] transition">
                                    <span className="font-bold text-[#C0392B]">Discount (Complimentary)</span>
                                    <div className="relative inline-flex items-center">
                                      <span className="absolute left-2.5 text-[#E74C3C] font-bold text-xs">₹</span>
                                      <input
                                        type="number"
                                        value={record.discount_amount || 0}
                                        onChange={(e) => handleBreakdownChange(record.id, 'discount_amount', parseFloat(e.target.value) || 0)}
                                        className="w-28 pl-6 pr-2 py-1 text-right font-bold text-[#C0392B] bg-white border border-[#F6CCC7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E74C3C]/30 font-sans tabular-nums shadow-2xs"
                                      />
                                    </div>
                                  </div>

                                  {/* Accommodation Charges */}
                                  <div className="flex items-center justify-between p-3 bg-[#FAF7F2] hover:bg-[#F6F0E6] rounded-2xl border border-[#EDE4D5] transition">
                                    <span className="font-medium text-[#6B5A40]">Accommodation Charges</span>
                                    <div className="relative inline-flex items-center">
                                      <span className="absolute left-2.5 text-[#9E8E75] font-bold text-xs">₹</span>
                                      <input
                                        type="number"
                                        value={record.accommodation_charges || 0}
                                        onChange={(e) => handleBreakdownChange(record.id, 'accommodation_charges', parseFloat(e.target.value) || 0)}
                                        className="w-28 pl-6 pr-2 py-1 text-right font-bold text-[#443825] bg-white border border-[#E5DAC8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 font-sans tabular-nums shadow-2xs"
                                      />
                                    </div>
                                  </div>

                                  {/* Travel Charges */}
                                  <div className="flex items-center justify-between p-3 bg-[#FAF7F2] hover:bg-[#F6F0E6] rounded-2xl border border-[#EDE4D5] transition">
                                    <span className="font-medium text-[#6B5A40]">Travel Charges</span>
                                    <div className="relative inline-flex items-center">
                                      <span className="absolute left-2.5 text-[#9E8E75] font-bold text-xs">₹</span>
                                      <input
                                        type="number"
                                        value={record.travel_charges || 0}
                                        onChange={(e) => handleBreakdownChange(record.id, 'travel_charges', parseFloat(e.target.value) || 0)}
                                        className="w-28 pl-6 pr-2 py-1 text-right font-bold text-[#443825] bg-white border border-[#E5DAC8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 font-sans tabular-nums shadow-2xs"
                                      />
                                    </div>
                                  </div>

                                  {/* Additional Charges */}
                                  <div className="flex items-center justify-between p-3 bg-[#FAF7F2] hover:bg-[#F6F0E6] rounded-2xl border border-[#EDE4D5] transition">
                                    <span className="font-medium text-[#6B5A40]">Additional Charges</span>
                                    <div className="relative inline-flex items-center">
                                      <span className="absolute left-2.5 text-[#9E8E75] font-bold text-xs">₹</span>
                                      <input
                                        type="number"
                                        value={record.additional_charges || 0}
                                        onChange={(e) => handleBreakdownChange(record.id, 'additional_charges', parseFloat(e.target.value) || 0)}
                                        className="w-28 pl-6 pr-2 py-1 text-right font-bold text-[#443825] bg-white border border-[#E5DAC8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 font-sans tabular-nums shadow-2xs"
                                      />
                                    </div>
                                  </div>

                                  {/* Subtotal & GST */}
                                  <div className="pt-3.5 border-t border-[#EFE8DA] space-y-1.5 px-1">
                                    <div className="flex items-center justify-between font-black text-[#1E170E]">
                                      <span>SUBTOTAL (GROSS TOTAL)</span>
                                      <span className="text-sm font-black font-sans tabular-nums">₹{record.subtotal_amount.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[#7A6950] font-bold">
                                      <span>GST ({record.gst_rate}%)</span>
                                      <span className="font-sans tabular-nums">₹{record.gst_amount.toLocaleString('en-IN')}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Final Net Investment Box */}
                              <div className="p-4 sm:p-5 bg-gradient-to-r from-[#F7EAC8] via-[#F3E2B8] to-[#EBD59E] border border-[#DFC885] rounded-2xl flex items-center justify-between shadow-xs mt-4">
                                <div>
                                  <p className="text-[10px] font-black uppercase text-[#634E23] tracking-wider">Final Net Investment</p>
                                  <p className="text-[10px] font-medium text-[#7A6950]">Inclusive of all Taxes & Fees</p>
                                </div>
                                <h4 className="text-xl sm:text-2xl font-black text-[#1E170E] font-sans tabular-nums tracking-tight">
                                  ₹{record.final_total_amount.toLocaleString('en-IN')}
                                </h4>
                              </div>
                            </div>

                            {/* ── RIGHT: PAYMENT TERMS & SCHEDULE (WARM LUXURY STUDIO CARD) ── */}
                            <div className="lg:col-span-7 bg-white rounded-3xl border border-[#EBE3D5] p-6 shadow-xs flex flex-col justify-between space-y-5">
                              <div>
                                <div className="flex items-center justify-between pb-3 border-b border-[#EFE8DA]">
                                  <div>
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#8C6D28] bg-[#F5EEDC] px-2.5 py-0.5 rounded-md border border-[#E3D3AC]">
                                      <Calendar className="w-3 h-3 text-[#D4AF37]" /> SCHEDULE & MILESTONES
                                    </span>
                                    <h3 className="text-base font-bold text-[#1E170E] tracking-tight mt-1.5">Payment Installments</h3>
                                  </div>
                                  <button
                                    onClick={() => setShowAddStepModal({ open: true, recordId: record.id })}
                                    className="px-3.5 py-1.5 text-xs font-bold text-[#4E3B15] bg-[#F7EFCF] hover:bg-[#F2E5B8] border border-[#DFCFA0] rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                                  >
                                    <Plus className="w-3.5 h-3.5 text-[#8C6D28]" />
                                    Add Step
                                  </button>
                                </div>

                                {/* Milestones Table */}
                                <div className="mt-4 overflow-x-auto rounded-2xl border border-[#EDE4D5]">
                                  <table className="w-full text-left text-xs">
                                    <thead>
                                      <tr className="bg-[#F7EEDC] border-b border-[#EADBBD] text-[10px] font-black uppercase text-[#634E23] tracking-wider">
                                        <th className="py-3 px-3.5 font-black">Date</th>
                                        <th className="py-3 px-2.5 font-black">Step Name</th>
                                        <th className="py-3 px-2.5 text-right font-black">Amount</th>
                                        <th className="py-3 px-2.5 text-center font-black">Status</th>
                                        <th className="py-3 px-3.5 text-right font-black">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#EDE4D5] bg-white">
                                      {milestones.map((m) => (
                                        <tr key={m.id} className="hover:bg-[#FAF7F2] transition">
                                          {/* Editable Date Picker */}
                                          <td className="py-3 px-3.5 whitespace-nowrap">
                                            <input
                                              type="date"
                                              value={m.due_date ? m.due_date.split('T')[0] : ''}
                                              onChange={(e) => handleMilestoneDateChange(record.id, m.id, e.target.value)}
                                              className="px-2.5 py-1.5 text-xs font-bold text-[#2A1F08] bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl hover:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 cursor-pointer shadow-2xs font-sans"
                                            />
                                          </td>

                                          {/* Step Name */}
                                          <td className="py-3 px-2.5 font-black text-[#1E170E] min-w-[130px]">
                                            <input
                                              type="text"
                                              value={m.step_name}
                                              onChange={(e) => handleMilestoneNameChange(record.id, m.id, e.target.value)}
                                              className="w-full px-2.5 py-1.5 text-xs font-bold text-[#1E170E] bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl hover:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 shadow-2xs font-sans"
                                            />
                                          </td>

                                          {/* Amount with clean sans-serif font */}
                                          <td className="py-3 px-2.5 text-right font-black font-sans tabular-nums text-[#1E170E] whitespace-nowrap min-w-[110px]">
                                            <div className="relative inline-flex items-center">
                                              <span className="absolute left-2.5 text-[#9E8E75] font-bold text-xs">₹</span>
                                              <input
                                                type="number"
                                                value={Math.round(m.amount) || 0}
                                                onChange={(e) => handleMilestoneAmountChange(record.id, m.id, parseFloat(e.target.value) || 0)}
                                                className="w-24 pl-6 pr-2 py-1.5 text-right text-xs font-black text-[#1E170E] bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl hover:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 shadow-2xs font-sans tabular-nums"
                                              />
                                            </div>
                                          </td>

                                          {/* Status Badge */}
                                          <td className="py-3 px-2.5 text-center whitespace-nowrap">
                                            <button
                                              type="button"
                                              onClick={() => handleMilestoneStatusToggle(record.id, m.id, m.status === 'completed' ? 'pending' : 'completed')}
                                              className={`px-3 py-0.5 rounded-full text-[10px] font-extrabold border cursor-pointer transition shadow-2xs ${
                                                m.status === 'completed'
                                                  ? 'bg-[#EAF7EE] text-[#1E7E45] border-[#BCE7CB] hover:bg-[#D8F2DE]'
                                                  : 'bg-[#FDF4DC] text-[#8C6D28] border-[#E8D6A7] hover:bg-[#F8E7BE]'
                                              }`}
                                              title="Click to toggle Completed / Pending"
                                            >
                                              {m.status === 'completed' ? '✓ Completed' : 'Pending'}
                                            </button>
                                          </td>

                                          {/* Action */}
                                          <td className="py-3 px-3.5 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                              {m.status !== 'completed' ? (
                                                <button
                                                  onClick={() => {
                                                    setShowRecordPaymentModal({
                                                      open: true,
                                                      client: client || undefined,
                                                      financeRecord: record,
                                                      milestoneId: m.id
                                                    });
                                                    setPaymentFormData(prev => ({
                                                      ...prev,
                                                      amount: String(Math.round(m.amount)),
                                                      target_milestone_id: m.id
                                                    }));
                                                  }}
                                                  className="px-3.5 py-1.5 text-[11px] font-bold text-white bg-[#1E7E45] hover:bg-[#166536] active:scale-95 rounded-xl transition shadow-2xs cursor-pointer"
                                                >
                                                  Pay
                                                </button>
                                              ) : (
                                                <span className="text-[10px] font-bold text-[#1E7E45] bg-[#EAF7EE] px-2.5 py-0.5 rounded-lg border border-[#BCE7CB]">
                                                  Paid ({m.payment_mode || 'UPI'})
                                                </span>
                                              )}

                                              {/* Delete Step Button */}
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteMilestone(record.id, m.id)}
                                                className="p-1.5 text-[#9E8E75] hover:text-[#C0392B] hover:bg-[#FDF2F0] rounded-xl transition cursor-pointer"
                                                title="Delete milestone step"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Bottom Summary 3 Badges (Fixed, Received, Pending) */}
                              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#EFE8DA]">
                                {/* Fixed Amount */}
                                <div className="p-3.5 bg-[#FAF7F2] rounded-2xl border border-[#EDE4D5] text-center shadow-2xs">
                                  <p className="text-[10px] font-black uppercase text-[#8C7654] tracking-wider">Fixed Amount</p>
                                  <h5 className="text-base font-black text-[#1E170E] font-sans tabular-nums mt-0.5">
                                    ₹{record.final_total_amount.toLocaleString('en-IN')}
                                  </h5>
                                </div>

                                {/* Received Amount */}
                                <div className="p-3.5 bg-[#EAF7EE] rounded-2xl border border-[#BCE7CB] text-center shadow-2xs">
                                  <p className="text-[10px] font-black uppercase text-[#1E7E45] tracking-wider">Received Amount</p>
                                  <h5 className="text-base font-black text-[#1E7E45] font-sans tabular-nums mt-0.5">
                                    ₹{record.received_amount.toLocaleString('en-IN')}
                                  </h5>
                                </div>

                                {/* Pending Amount */}
                                <div className="p-3.5 bg-[#FDF4DC] rounded-2xl border border-[#E8D6A7] text-center shadow-2xs">
                                  <p className="text-[10px] font-black uppercase text-[#8C6D28] tracking-wider">Pending Amount</p>
                                  <h5 className="text-base font-black text-[#8C6D28] font-sans tabular-nums mt-0.5">
                                    ₹{record.pending_amount.toLocaleString('en-IN')}
                                  </h5>
                                </div>
                              </div>
                            </div>

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: TEAM PAYOUTS & STUDIO EXPENSES
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="bg-[#FFFDF9] p-6 rounded-3xl border border-[#EBE3D5] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#1E170E]">Team Payouts & Studio Expenses</h3>
                <p className="text-xs text-[#7A6950] mt-0.5">Track photographer payouts, travel bookings, gear rentals, and custom studio expenditures.</p>
              </div>
              <button
                onClick={() => setShowAddExpenseModal(true)}
                className="px-4 py-2.5 text-xs font-bold text-[#4E3B15] bg-[#F7EFCF] hover:bg-[#F2E5B8] border border-[#DFCFA0] rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 text-[#8C6D28]" />
                + Record Expense / Payout
              </button>
            </div>

            {expenses.length === 0 ? (
              <div className="bg-[#FFFDF9] p-12 rounded-3xl border border-dashed border-[#E0D3BC] text-center text-[#9E8E75] space-y-2 shadow-xs">
                <CreditCard className="w-8 h-8 mx-auto text-[#D4AF37]" />
                <p className="text-xs font-bold text-[#6B5A40]">No expenses or team payouts recorded yet.</p>
              </div>
            ) : (
              <div className="bg-[#FFFDF9] rounded-3xl border border-[#EBE3D5] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#F7EEDC] border-b border-[#EADBBD] text-[10px] font-black uppercase text-[#634E23] tracking-wider">
                        <th className="py-3.5 px-4 font-black">Date</th>
                        <th className="py-3.5 px-4 font-black">Category</th>
                        <th className="py-3.5 px-4 font-black">Title & Details</th>
                        <th className="py-3.5 px-4 font-black">Linked Client</th>
                        <th className="py-3.5 px-4 font-black">Paid To</th>
                        <th className="py-3.5 px-4 font-black">Payment Mode</th>
                        <th className="py-3.5 px-4 text-right font-black">Amount</th>
                        <th className="py-3.5 px-4 text-center font-black">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDE4D5]">
                      {expenses.map(exp => {
                        const linkedClient = clients.find(c => c.id === exp.client_id);
                        return (
                          <tr key={exp.id} className="hover:bg-[#FAF7F2] transition">
                            <td className="py-3.5 px-4 font-bold text-[#443825] whitespace-nowrap">
                              {new Date(exp.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F5EEDC] text-[#8C6D28] border border-[#E3D3AC]">
                                {exp.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-[#1E170E]">
                              {exp.title}
                              {exp.notes && <span className="block text-[10px] font-normal text-[#8C7654]">{exp.notes}</span>}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-[#6B5A40]">
                              {linkedClient ? `${linkedClient.name}` : '— General'}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-[#6B5A40]">
                              {exp.paid_to || '—'}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-[#6B5A40]">
                              {exp.payment_mode}
                            </td>
                            <td className="py-3.5 px-4 text-right font-black font-sans tabular-nums text-[#C0392B] text-sm whitespace-nowrap">
                              ₹{Math.round(exp.amount).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EAF7EE] text-[#1E7E45] border border-[#BCE7CB]">
                                ✓ Completed
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD NEW STEP (LIGHT THEME POPUP MODAL)
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddStepModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 max-w-md w-full border border-[#EBE3D5] shadow-2xl space-y-5 font-sans"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Add Milestone Step</h3>
                    <p className="text-[11px] text-slate-500">Add a custom milestone to client payment schedule</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAddStepModal({ open: false })}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Step / Milestone Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Pre-Wedding Shoot Balance / Album Delivery"
                    value={stepFormData.step_name}
                    onChange={(e) => setStepFormData(prev => ({ ...prev, step_name: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Due Date</label>
                    <input
                      type="date"
                      value={stepFormData.due_date}
                      onChange={(e) => setStepFormData(prev => ({ ...prev, due_date: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-800 font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 25000"
                      value={stepFormData.amount}
                      onChange={(e) => setStepFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-900 font-sans tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAddStepModal({ open: false })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNewStep}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition"
                >
                  Save Step
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: RECORD PAYMENT
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showRecordPaymentModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 max-w-md w-full border border-[#EBE3D5] shadow-2xl space-y-5 font-sans"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Record Client Payment</h3>
                    <p className="text-[11px] text-slate-500">{showRecordPaymentModal.client?.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowRecordPaymentModal({ open: false })}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600">Payment Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3.5 py-2 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 font-sans tabular-nums"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600">Payment Mode</label>
                    <select
                      value={paymentFormData.payment_mode}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
                      className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-800"
                    >
                      <option value="UPI">UPI (GPay / PhonePe)</option>
                      <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                      <option value="Cash">Cash Deposit</option>
                      <option value="Card">Credit / Debit Card</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600">Payment Date</label>
                    <input
                      type="date"
                      value={paymentFormData.payment_date}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-800 font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">Transaction Ref / UTR (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI/423891024891"
                    value={paymentFormData.reference_id}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, reference_id: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowRecordPaymentModal({ open: false })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRecordedPayment}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition"
                >
                  Save & Update Balance
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD NEW EXPENSE / TEAM PAYOUT (WITH CLIENT DROPDOWN)
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddExpenseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 max-w-md w-full border border-[#EBE3D5] shadow-2xl space-y-5 font-sans"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Record Team Payout / Expense</h3>
                </div>
                <button 
                  onClick={() => setShowAddExpenseModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Select Client Dropdown */}
                <div>
                  <label className="text-xs font-bold text-slate-700">Select Client / Project (Optional)</label>
                  <select
                    value={expenseFormData.client_id}
                    onChange={(e) => setExpenseFormData(prev => ({ ...prev, client_id: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-800"
                  >
                    <option value="">None / General Studio Expense</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.event_type} ({c.event_date ? new Date(c.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Date TBD'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Category</label>
                  <select
                    value={expenseFormData.category}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_CUSTOM__') {
                        const custom = prompt('Enter custom category name:');
                        if (custom && custom.trim()) {
                          setExpenseCategories(prev => [...prev, custom.trim()]);
                          setExpenseFormData(prev => ({ ...prev, category: custom.trim() }));
                        }
                      } else {
                        setExpenseFormData(prev => ({ ...prev, category: e.target.value }));
                      }
                    }}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-800"
                  >
                    {expenseCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__ADD_CUSTOM__" className="font-bold text-amber-700">+ Add Custom Category</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Title / Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Photographer 3-Day Wedding Advance"
                    value={expenseFormData.title}
                    onChange={(e) => setExpenseFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 25000"
                      value={expenseFormData.amount}
                      onChange={(e) => setExpenseFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-3.5 py-2 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-900 font-sans tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Paid To</label>
                    <input
                      type="text"
                      placeholder="e.g. Amit Sharma"
                      value={expenseFormData.paid_to}
                      onChange={(e) => setExpenseFormData(prev => ({ ...prev, paid_to: e.target.value }))}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Payment Mode</label>
                    <select
                      value={expenseFormData.payment_mode}
                      onChange={(e) => setExpenseFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
                      className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-800"
                    >
                      <option value="UPI">UPI (GPay/PhonePe)</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Date</label>
                    <input
                      type="date"
                      value={expenseFormData.payment_date}
                      onChange={(e) => setExpenseFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-800 font-sans"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveExpense}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition"
                >
                  Save Expense
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ENTERPRISE INVOICE & TEMPLATE CUSTOMIZER
      ───────────────────────────────────────────────────────────── */}
      <InvoiceModalDialog
        isOpen={showInvoiceModal.open}
        onClose={() => setShowInvoiceModal({ open: false })}
        client={showInvoiceModal.client || null}
        financeRecord={showInvoiceModal.financeRecord || null}
        defaultQuotationTemplate={defaultQuotationTemplate}
      />

      {/* ─────────────────────────────────────────────────────────────
          MODAL: LEAD QUOTATION VERSION SELECTOR MODAL
      ───────────────────────────────────────────────────────────── */}
      {isQuotationModalOpen && quotationModalLead && (
        <LeadQuotationModal
          isOpen={isQuotationModalOpen}
          onClose={() => {
            setIsQuotationModalOpen(false);
            setQuotationModalLead(null);
            fetchFinanceData();
          }}
          lead={quotationModalLead}
          onFinalSet={async () => {
            await fetchFinanceData();
          }}
        />
      )}

    </div>
  );
}
