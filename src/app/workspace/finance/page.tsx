'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, TrendingUp, CreditCard, Receipt, Users, Plus, Search, Filter, 
  Calendar, CheckCircle2, Clock, AlertTriangle, ArrowUpRight, ArrowDownRight, 
  FileText, Download, Printer, ExternalLink, ChevronDown, ChevronUp, Edit3, 
  Trash2, X, RefreshCw, Sparkles, Tag, PieChart, Wallet, ArrowRight, Bell, Send, Check, Crown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { extractFinancialsFromQuotation } from '@/lib/quotation-finance-sync';
import { LeadQuotationModal } from '@/components/dashboard/lead-quotation-modal';
import type { 
  WorkspaceClient, ClientFinanceRecord, FinanceMilestoneItem, FinanceExpenseItem, Lead
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

  const handleOpenQuotationModalForRecord = (record: ClientFinanceRecord) => {
    const leadId = record.client?.lead_id || record.client_id;
    const constructedLead: Lead = {
      id: leadId,
      name: record.client?.name || 'Client',
      phone: record.client?.phone || '',
      email: record.client?.email || '',
      event_date: record.client?.event_date || null,
      event_type: record.client?.event_type || 'Wedding Photography',
      workspace_id: record.workspace_id,
      status: 'booked',
      source: 'Manual',
      score: 'Hot 🔥',
      score_reason: 'Booked Client in Finance',
      raw_payload: {
        event_date: record.client?.event_date,
        event_type: record.client?.event_type,
        city: record.client?.city,
        venue: record.client?.venue,
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

      if (leadIds.length > 0) {
        try {
          const [docsRes, leadsRes] = await Promise.all([
            supabase
              .from('quotation_documents')
              .select('id, template_id, lead_id, version, lead_version, content_json, created_at, updated_at')
              .in('lead_id', leadIds)
              .order('created_at', { ascending: false }),
            supabase
              .from('leads')
              .select('id, name, final_quotation_id, quotation_id')
              .in('id', leadIds)
          ]);

          if (leadsRes.data) {
            leadsRes.data.forEach(l => leadMap.set(l.id, l));
          }

          const quoteDocs = docsRes.data;
          if (quoteDocs && quoteDocs.length > 0) {
            const leadGroups = new Map<string, any[]>();
            for (const doc of quoteDocs) {
              if (!leadGroups.has(doc.lead_id)) leadGroups.set(doc.lead_id, []);
              leadGroups.get(doc.lead_id)!.push(doc);
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
            has_final_quotation: false,
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
            has_final_quotation: false,
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
        
        // Recalculate Subtotal
        const subtotal = Math.round(
          Number(updated.base_package_price || 0) - 
          Number(updated.discount_amount || 0) + 
          Number(updated.accommodation_charges || 0) + 
          Number(updated.travel_charges || 0) + 
          Number(updated.additional_charges || 0)
        );

        const gstRate = Number(updated.gst_rate || 18);
        const gstAmount = Math.round((subtotal * gstRate) / 100);
        const finalTotal = subtotal + gstAmount;
        const pending = Math.max(0, finalTotal - Math.round(Number(updated.received_amount || 0)));

        const finalUpdated: ClientFinanceRecord = {
          ...updated,
          subtotal_amount: subtotal,
          gst_amount: gstAmount,
          final_total_amount: finalTotal,
          pending_amount: pending,
          payment_status: pending === 0 ? 'paid' : updated.received_amount > 0 ? 'partially_paid' : 'pending'
        };

        updateFinanceRecordInDB(finalUpdated);
        return finalUpdated;
      }
      return rec;
    }));
  };

  // Handle Milestone Date Change
  const handleMilestoneDateChange = (recordId: string, milestoneId: string, newDate: string) => {
    setFinanceRecords(prev => prev.map(rec => {
      if (rec.id === recordId) {
        const updatedMilestones = rec.milestones.map(m => {
          if (m.id === milestoneId) {
            return { ...m, due_date: newDate };
          }
          return m;
        });

        const updated = { ...rec, milestones: updatedMilestones };
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
        const updated = { ...rec, milestones: updatedMilestones };
        updateFinanceRecordInDB(updated);
        return updated;
      }
      return rec;
    }));
  };

  // Handle Recording a Milestone Payment
  const handleSaveRecordedPayment = () => {
    if (!showRecordPaymentModal.financeRecord) return;
    const rec = showRecordPaymentModal.financeRecord;
    const paidAmt = Math.round(parseFloat(paymentFormData.amount) || 0);
    if (paidAmt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    const newReceived = Math.round(rec.received_amount + paidAmt);
    const newPending = Math.max(0, rec.final_total_amount - newReceived);
    const newStatus = newPending === 0 ? 'paid' : 'partially_paid';

    // Update milestones status
    let updatedMilestones = [...rec.milestones];
    if (paymentFormData.target_milestone_id) {
      updatedMilestones = updatedMilestones.map(m => {
        if (m.id === paymentFormData.target_milestone_id) {
          return {
            ...m,
            status: 'completed' as const,
            paid_date: paymentFormData.payment_date,
            payment_mode: paymentFormData.payment_mode,
            reference_id: paymentFormData.reference_id || null,
            notes: paymentFormData.notes || null
          };
        }
        return m;
      });
    }

    const updatedRecord: ClientFinanceRecord = {
      ...rec,
      received_amount: newReceived,
      pending_amount: newPending,
      payment_status: newStatus,
      milestones: updatedMilestones
    };

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
        const updatedMilestones = [...rec.milestones, newMilestone];
        const updated = { ...rec, milestones: updatedMilestones };
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
    <div className="min-h-screen bg-[#FDFCF7] text-slate-900 pb-24 pt-2 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

          {/* ─────────────────────────────────────────────────────────────
              HEADER & ACTION BUTTONS (WARM LIGHT GOLD THEME)
          ───────────────────────────────────────────────────────────── */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-amber-200/70 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center shadow-md shadow-amber-500/20 text-white">
                <DollarSign className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">Finance & Payment Milestones</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100/80 text-amber-800 border border-amber-300">
                    Studio Suite
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quotation pricing sync, 4-tier milestone schedules, client invoices, team payouts, and P&L tracking.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddExpenseModal(true)}
                className="px-4 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                + Add Expense / Payout
              </button>

              <Link
                href="/workspace/clients"
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs"
              >
                <Users className="w-4 h-4 text-slate-500" />
                Clients Directory
              </Link>

              <button
                onClick={fetchFinanceData}
                className="p-2 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition shadow-2xs"
                title="Refresh Finance Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              3D-STYLED FINANCIAL COMMAND CENTER (GOLD / AMBER METRICS)
          ───────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Total Invoiced */}
            <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-amber-400 transition-all">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Gross Invoiced</p>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight font-sans tabular-nums">
                  ₹{totalInvoiced.toLocaleString('en-IN')}
                </h3>
                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{financeRecords.length} Active Contracts</p>
              </div>
              <div className="h-1 w-full bg-amber-500 rounded-full" />
            </div>

            {/* 2. Total Cash Received */}
            <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-emerald-400 transition-all">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Cash Received</p>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-emerald-700 tracking-tight font-sans tabular-nums">
                  ₹{totalReceived.toLocaleString('en-IN')}
                </h3>
                <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                  {totalInvoiced > 0 ? Math.round((totalReceived / totalInvoiced) * 100) : 0}% Realized
                </p>
              </div>
              <div className="h-1 w-full bg-emerald-500 rounded-full" />
            </div>

            {/* 3. Outstanding Receivables */}
            <div className="bg-white p-5 rounded-2xl border border-orange-200 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-orange-400 transition-all">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Pending Receivables</p>
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-orange-700 tracking-tight font-sans tabular-nums">
                  ₹{totalPending.toLocaleString('en-IN')}
                </h3>
                <p className="text-[10px] font-semibold text-orange-600 mt-0.5">Scheduled Milestones</p>
              </div>
              <div className="h-1 w-full bg-orange-500 rounded-full" />
            </div>

            {/* 4. Total Expenses & Payouts */}
            <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-rose-400 transition-all">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Team & Expenses</p>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-rose-700 tracking-tight font-sans tabular-nums">
                  ₹{totalExpensesAmount.toLocaleString('en-IN')}
                </h3>
                <p className="text-[10px] font-semibold text-rose-600 mt-0.5">{expenses.length} Logged Payouts</p>
              </div>
              <div className="h-1 w-full bg-rose-500 rounded-full" />
            </div>

            {/* 5. Net Studio Profit */}
            <div className="bg-gradient-to-br from-amber-500 to-yellow-500 p-5 rounded-2xl border border-amber-400 shadow-md shadow-amber-500/20 text-white flex flex-col justify-between space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-black text-amber-100 uppercase tracking-wider">Net Studio Profit</p>
                <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm text-white flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight font-sans tabular-nums">
                  ₹{netProfit.toLocaleString('en-IN')}
                </h3>
                <p className="text-[11px] font-bold text-amber-100 mt-0.5">
                  {profitMargin}% Profit Margin 🔥
                </p>
              </div>
              <div className="h-1 w-full bg-white/40 rounded-full" />
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              TAB SWITCHER & SEARCH / FILTERS
          ───────────────────────────────────────────────────────────── */}
          <div className="bg-white p-4 rounded-2xl border border-amber-200/70 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-amber-50/70 border border-amber-200/80 rounded-xl w-full md:w-auto">
              <button
                onClick={() => setActiveTab('clients')}
                className={`flex-1 md:flex-none px-4 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center gap-2 ${
                  activeTab === 'clients'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Receipt className="w-4 h-4" />
                Client Invoices & Milestones
              </button>

              <button
                onClick={() => setActiveTab('expenses')}
                className={`flex-1 md:flex-none px-4 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center gap-2 ${
                  activeTab === 'expenses'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Team Payouts & Expenses ({expenses.length})
              </button>
            </div>

            {/* Search & Filter */}
            {activeTab === 'clients' && (
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search client or event..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900 font-medium"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-800"
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
              TAB 1: CLIENT INVOICES & MILESTONES (QUOTATION SYNC)
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'clients' && (
            <div className="space-y-6">
              {loading ? (
                <div className="bg-white p-12 rounded-2xl border border-amber-200 text-center space-y-3 shadow-sm">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin text-amber-600" />
                  <p className="text-sm font-bold text-slate-600">Loading Client Billing & Milestones...</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-dashed border-amber-300 text-center space-y-4 shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
                    <Receipt className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">No Client Finance Records Found</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      Convert leads in Leads CRM or add clients from Client Directory to automatically generate quotation financial breakdowns and payment schedules.
                    </p>
                  </div>
                  <Link
                    href="/leads"
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition"
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

                  return (
                    <motion.div
                      key={record.id}
                      layout
                      className="bg-white rounded-2xl border border-amber-200/90 shadow-sm overflow-hidden transition-all hover:border-amber-300"
                    >
                      {/* ── CLIENT CARD HEADER ── */}
                      <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-50/50 via-white to-amber-50/30 border-b border-amber-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">
                              {client?.name || 'Vinu Bhad & Neha'}
                            </h2>

                            {/* Payment Status Badge */}
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                              record.payment_status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : record.payment_status === 'partially_paid'
                                ? 'bg-amber-100 text-amber-900 border-amber-300 font-black'
                                : 'bg-orange-50 text-orange-700 border-orange-200'
                            }`}>
                              {record.payment_status === 'paid' ? 'Fully Paid' : record.payment_status === 'partially_paid' ? 'Partially Paid' : 'Pending'}
                            </span>

                            {/* Final Quotation Status Badge */}
                            {record.has_final_quotation ? (
                              <button
                                type="button"
                                onClick={() => handleOpenQuotationModalForRecord(record)}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-[#F36F21] text-white border border-amber-400 shadow-2xs hover:brightness-110 active:scale-95 transition cursor-pointer"
                                title="Click to view quotation versions or switch final version"
                              >
                                <Crown className="w-3.5 h-3.5 text-amber-100" />
                                <span>Final Quotation (V{record.final_quotation_version || 1})</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenQuotationModalForRecord(record)}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 active:scale-95 transition cursor-pointer"
                                title="Click to select final quotation version"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
                                <span>Final Quotation Not Selected</span>
                              </button>
                            )}
                          </div>

                          {/* Event details & Contact */}
                          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-600 font-medium">
                            <span className="flex items-center gap-1.5 text-slate-800 font-semibold">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              {client?.event_type || 'Wedding & Reception'}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="flex items-center gap-1.5 text-slate-700">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              Event Date: {client?.event_date ? new Date(client.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '2026-11-18'}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500 font-mono">
                              Phone: {client?.phone || '+919876543210'}
                            </span>
                          </div>
                        </div>

                        {/* Right: Amounts, Quick Actions & Toggle */}
                        <div className="flex flex-wrap items-center gap-4">
                          {/* Received vs Pending Progress Mini Widget */}
                          <div className="space-y-1 text-right min-w-[170px]">
                            <div className="flex items-center justify-between text-xs font-extrabold tabular-nums">
                              <span className="text-emerald-700">Rec: ₹{record.received_amount.toLocaleString('en-IN')}</span>
                              <span className="text-orange-700">Pend: ₹{record.pending_amount.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div 
                                className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full transition-all duration-500"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 tabular-nums">Total: ₹{record.final_total_amount.toLocaleString('en-IN')}</p>
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
                            className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
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
                            className="px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl shadow-xs transition flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Tax Invoice
                          </button>

                          {/* Expand / Collapse Button */}
                          <button
                            onClick={() => toggleCard(record.id)}
                            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                            title={isExpanded ? 'Hide Pricing & Milestones' : 'View Pricing & Milestones'}
                          >
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* ── FINAL QUOTATION SELECTION BANNER (IF NOT FINALIZED) ── */}
                      {!record.has_final_quotation && (
                        <div className="mx-5 sm:mx-6 my-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-dashed border-amber-400/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs shrink-0">
                              <Crown className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 tracking-tight flex flex-wrap items-center gap-2">
                                <span>आपने इस लीड का कोई कोटेशन फाइनल नहीं किया है</span>
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-extrabold uppercase tracking-wider">
                                  Action Required
                                </span>
                              </h4>
                              <p className="text-xs text-slate-600 font-medium mt-0.5">
                                Finance & Payment Schedule me wahi details match hongi jisko aap Final Quotation banayenge.
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenQuotationModalForRecord(record)}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#F36F21] hover:from-amber-600 hover:to-[#E05E10] text-white text-xs font-black shadow-md hover:shadow-lg active:scale-95 transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                          >
                            <Crown className="w-4 h-4 text-amber-100" />
                            <span>Select Final Quotation (वर्जन्स देखें)</span>
                          </button>
                        </div>
                      )}

                      {/* ── EXPANDED PRICING BREAKDOWN & PAYMENT SCHEDULE ── */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="p-5 sm:p-6 space-y-6 bg-amber-50/20 border-t border-amber-100"
                          >
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                              {/* ── LEFT: PRICING DETAILS (EXACT IMAGE 1 REPLICA) ── */}
                              <div className="lg:col-span-5 bg-[#F9F7F1] p-5 rounded-2xl border border-amber-200/90 shadow-2xs space-y-4">
                                <div className="text-center pb-2 border-b border-amber-200/60">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">Investment & Breakdown</p>
                                  <h3 className="text-lg font-black text-slate-900 tracking-wider uppercase font-serif mt-0.5">Pricing Details</h3>
                                </div>

                                <div className="space-y-2 text-xs">
                                  {/* Base Package Price */}
                                  <div className="flex items-center justify-between p-1.5 hover:bg-white rounded-lg transition">
                                    <span className="font-bold text-slate-700">Base Package Price</span>
                                    <input
                                      type="number"
                                      value={record.base_package_price || 0}
                                      onChange={(e) => handleBreakdownChange(record.id, 'base_package_price', parseFloat(e.target.value) || 0)}
                                      className="w-28 text-right font-bold text-slate-900 bg-white border border-slate-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans tabular-nums"
                                    />
                                  </div>

                                  {/* Discount (Complimentary) */}
                                  <div className="flex items-center justify-between p-1.5 hover:bg-white rounded-lg transition">
                                    <span className="font-bold text-rose-600">Discount (Complimentary)</span>
                                    <input
                                      type="number"
                                      value={record.discount_amount || 0}
                                      onChange={(e) => handleBreakdownChange(record.id, 'discount_amount', parseFloat(e.target.value) || 0)}
                                      className="w-28 text-right font-bold text-rose-600 bg-white border border-slate-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans tabular-nums"
                                    />
                                  </div>

                                  {/* Accommodation Charges */}
                                  <div className="flex items-center justify-between p-1.5 hover:bg-white rounded-lg transition">
                                    <span className="font-medium text-slate-600">Accommodation Charges</span>
                                    <input
                                      type="number"
                                      value={record.accommodation_charges || 0}
                                      onChange={(e) => handleBreakdownChange(record.id, 'accommodation_charges', parseFloat(e.target.value) || 0)}
                                      className="w-28 text-right font-bold text-slate-800 bg-white border border-slate-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans tabular-nums"
                                    />
                                  </div>

                                  {/* Travel Charges */}
                                  <div className="flex items-center justify-between p-1.5 hover:bg-white rounded-lg transition">
                                    <span className="font-medium text-slate-600">Travel Charges</span>
                                    <input
                                      type="number"
                                      value={record.travel_charges || 0}
                                      onChange={(e) => handleBreakdownChange(record.id, 'travel_charges', parseFloat(e.target.value) || 0)}
                                      className="w-28 text-right font-bold text-slate-800 bg-white border border-slate-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans tabular-nums"
                                    />
                                  </div>

                                  {/* Additional Charges */}
                                  <div className="flex items-center justify-between p-1.5 hover:bg-white rounded-lg transition">
                                    <span className="font-medium text-slate-600">Additional Charges</span>
                                    <input
                                      type="number"
                                      value={record.additional_charges || 0}
                                      onChange={(e) => handleBreakdownChange(record.id, 'additional_charges', parseFloat(e.target.value) || 0)}
                                      className="w-28 text-right font-bold text-slate-800 bg-white border border-slate-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans tabular-nums"
                                    />
                                  </div>

                                  {/* Subtotal (Gross Total) */}
                                  <div className="flex items-center justify-between pt-2 border-t border-amber-200/80 font-black text-slate-900 px-1.5">
                                    <span>SUBTOTAL (GROSS TOTAL)</span>
                                    <span className="text-sm font-black font-sans tabular-nums">₹{record.subtotal_amount.toLocaleString('en-IN')}</span>
                                  </div>

                                  {/* GST (18%) */}
                                  <div className="flex items-center justify-between px-1.5 text-slate-600 font-bold">
                                    <span>GST ({record.gst_rate}%)</span>
                                    <span className="font-sans tabular-nums">₹{record.gst_amount.toLocaleString('en-IN')}</span>
                                  </div>
                                </div>

                                {/* Final Net Investment Box */}
                                <div className="p-3.5 bg-amber-100/70 border border-amber-300 rounded-xl flex items-center justify-between shadow-2xs">
                                  <div>
                                    <p className="text-[10px] font-black uppercase text-amber-900 tracking-wider">Final Net Investment</p>
                                    <p className="text-[9px] font-medium text-slate-500">Inclusive of all Taxes & Fees</p>
                                  </div>
                                  <h4 className="text-xl font-black text-slate-900 font-sans tabular-nums tracking-tight">
                                    ₹{record.final_total_amount.toLocaleString('en-IN')}
                                  </h4>
                                </div>
                              </div>

                              {/* ── RIGHT: PAYMENT TERMS & SCHEDULE (EXACT IMAGE 2 REPLICA) ── */}
                              <div className="lg:col-span-7 bg-[#F9F7F1] p-5 rounded-2xl border border-amber-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                                    <div>
                                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">Schedule</p>
                                      <h3 className="text-lg font-black text-slate-900 tracking-wider uppercase font-serif">Payment Terms & Schedule</h3>
                                    </div>
                                    <button
                                      onClick={() => setShowAddStepModal({ open: true, recordId: record.id })}
                                      className="px-3 py-1 text-xs font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 rounded-lg transition shadow-2xs flex items-center gap-1"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      Add Step
                                    </button>
                                  </div>

                                  {/* Milestones Table */}
                                  <div className="mt-3 overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                      <thead>
                                        <tr className="border-b border-amber-200/80 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                          <th className="pb-2 font-black">Date</th>
                                          <th className="pb-2 font-black">Steps</th>
                                          <th className="pb-2 text-right font-black">Amount</th>
                                          <th className="pb-2 text-center font-black">Status</th>
                                          <th className="pb-2 text-right font-black">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-amber-100">
                                        {milestones.map((m) => (
                                          <tr key={m.id} className="hover:bg-white/60 transition">
                                            {/* Editable Date Picker */}
                                            <td className="py-2.5 whitespace-nowrap">
                                              <input
                                                type="date"
                                                value={m.due_date ? m.due_date.split('T')[0] : ''}
                                                onChange={(e) => handleMilestoneDateChange(record.id, m.id, e.target.value)}
                                                className="px-2 py-1 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg hover:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-2xs font-sans"
                                              />
                                            </td>

                                            {/* Step Name */}
                                            <td className="py-2.5 font-black text-slate-900">
                                              {m.step_name}
                                            </td>

                                            {/* Amount with clean sans-serif font */}
                                            <td className="py-2.5 text-right font-black font-sans tabular-nums text-slate-900 whitespace-nowrap">
                                              ₹{Math.round(m.amount).toLocaleString('en-IN')}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-2.5 text-center">
                                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                                m.status === 'completed'
                                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                                              }`}>
                                                {m.status === 'completed' ? '✓ Completed' : 'Pending'}
                                              </span>
                                            </td>

                                            {/* Action */}
                                            <td className="py-2.5 text-right whitespace-nowrap">
                                              <div className="flex items-center justify-end gap-1.5">
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
                                                    className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-2xs cursor-pointer"
                                                  >
                                                    Pay
                                                  </button>
                                                ) : (
                                                  <span className="text-[10px] font-bold text-emerald-600">Paid ({m.payment_mode || 'UPI'})</span>
                                                )}

                                                {/* Delete Step Button */}
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeleteMilestone(record.id, m.id)}
                                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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
                                <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-amber-200/80">
                                  {/* Fixed Amount */}
                                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-center shadow-2xs">
                                    <p className="text-[9px] font-black uppercase text-slate-400">Fixed Amount</p>
                                    <h5 className="text-sm font-black text-slate-900 font-sans tabular-nums mt-0.5">
                                      ₹{record.final_total_amount.toLocaleString('en-IN')}
                                    </h5>
                                  </div>

                                  {/* Received Amount */}
                                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-center shadow-2xs">
                                    <p className="text-[9px] font-black uppercase text-emerald-700">Received Amount</p>
                                    <h5 className="text-sm font-black text-emerald-800 font-sans tabular-nums mt-0.5">
                                      ₹{record.received_amount.toLocaleString('en-IN')}
                                    </h5>
                                  </div>

                                  {/* Pending Amount */}
                                  <div className="p-2.5 bg-amber-100/80 rounded-xl border border-amber-300 text-center shadow-2xs">
                                    <p className="text-[9px] font-black uppercase text-amber-900">Pending Amount</p>
                                    <h5 className="text-sm font-black text-amber-950 font-sans tabular-nums mt-0.5">
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
              <div className="bg-white p-5 rounded-2xl border border-amber-200/70 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Team Payouts & Studio Expenses</h3>
                  <p className="text-xs text-slate-500">Track photographer payouts, travel bookings, gear rentals, and custom studio expenditures.</p>
                </div>
                <button
                  onClick={() => setShowAddExpenseModal(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  + Record Expense / Payout
                </button>
              </div>

              {expenses.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 space-y-2">
                  <CreditCard className="w-8 h-8 mx-auto" />
                  <p className="text-xs font-semibold">No expenses or team payouts recorded yet.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          <th className="py-3 px-4 font-black">Date</th>
                          <th className="py-3 px-4 font-black">Category</th>
                          <th className="py-3 px-4 font-black">Title & Details</th>
                          <th className="py-3 px-4 font-black">Linked Client</th>
                          <th className="py-3 px-4 font-black">Paid To</th>
                          <th className="py-3 px-4 font-black">Payment Mode</th>
                          <th className="py-3 px-4 text-right font-black">Amount</th>
                          <th className="py-3 px-4 text-center font-black">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {expenses.map(exp => {
                          const linkedClient = clients.find(c => c.id === exp.client_id);
                          return (
                            <tr key={exp.id} className="hover:bg-amber-50/20 transition">
                              <td className="py-3 px-4 font-bold text-slate-700 whitespace-nowrap">
                                {new Date(exp.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  {exp.category}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-extrabold text-slate-900">
                                {exp.title}
                                {exp.notes && <span className="block text-[10px] font-normal text-slate-500">{exp.notes}</span>}
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-600">
                                {linkedClient ? `${linkedClient.name}` : '— General'}
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-700">
                                {exp.paid_to || '—'}
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-600">
                                {exp.payment_mode}
                              </td>
                              <td className="py-3 px-4 text-right font-black font-sans tabular-nums text-rose-600 text-sm whitespace-nowrap">
                                ₹{Math.round(exp.amount).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Paid
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
              className="bg-white rounded-2xl p-6 max-w-md w-full border border-amber-200 shadow-2xl space-y-4 font-sans"
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
              className="bg-white rounded-2xl p-6 max-w-md w-full border border-amber-200 shadow-2xl space-y-4 font-sans"
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
              className="bg-white rounded-2xl p-6 max-w-md w-full border border-amber-200 shadow-2xl space-y-4 font-sans"
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
          MODAL: TAX INVOICE & RECEIPT GENERATOR (PRINT READY)
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showInvoiceModal.open && showInvoiceModal.client && showInvoiceModal.financeRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 my-8"
            >
              {/* Header with Print button */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-bold text-slate-900">Tax Invoice & Payment Receipt</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print / Save PDF
                  </button>
                  <button
                    onClick={() => setShowInvoiceModal({ open: false })}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Invoice Printable Document */}
              <div className="space-y-6 text-slate-900">
                {/* Brand & Invoice Title */}
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight font-serif text-slate-900">FILMIFY WEDDINGS</h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Luxury Wedding Photography & Cinematography</p>
                    <p className="text-[11px] text-slate-400 mt-1">GSTIN: 27AABCF1234F1ZP • Mumbai, India</p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-amber-100 text-amber-900 font-black text-xs rounded-lg uppercase tracking-wider">
                      Tax Invoice
                    </span>
                    <p className="text-xs font-bold font-sans tabular-nums text-slate-800 mt-2">INV-{showInvoiceModal.financeRecord.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-[11px] text-slate-500">Date: {new Date().toLocaleDateString('en-IN')}</p>
                  </div>
                </div>

                {/* Billed To */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex justify-between items-start text-xs">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Billed To</p>
                    <h4 className="text-sm font-black text-slate-900 mt-0.5">{showInvoiceModal.client.name}</h4>
                    <p className="text-slate-600">{showInvoiceModal.client.phone} • {showInvoiceModal.client.email || 'client@studio.com'}</p>
                    <p className="text-slate-600 font-medium mt-0.5">{showInvoiceModal.client.event_type} ({showInvoiceModal.client.event_date || '2026-11-18'})</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Payment Status</p>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      {showInvoiceModal.financeRecord.payment_status === 'paid' ? 'Fully Paid' : 'Partially Paid'}
                    </span>
                  </div>
                </div>

                {/* Itemized Table */}
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-500">
                      <th className="pb-2 font-black">Description / Service</th>
                      <th className="pb-2 text-right font-black">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2 font-bold text-slate-800">Base Wedding Coverage Package</td>
                      <td className="py-2 text-right font-bold font-sans tabular-nums">₹{showInvoiceModal.financeRecord.base_package_price.toLocaleString('en-IN')}</td>
                    </tr>
                    {showInvoiceModal.financeRecord.discount_amount > 0 && (
                      <tr>
                        <td className="py-2 font-bold text-rose-600">Discount (Complimentary)</td>
                        <td className="py-2 text-right font-bold font-sans tabular-nums text-rose-600">-₹{showInvoiceModal.financeRecord.discount_amount.toLocaleString('en-IN')}</td>
                      </tr>
                    )}
                    {showInvoiceModal.financeRecord.accommodation_charges > 0 && (
                      <tr>
                        <td className="py-2 text-slate-600 font-medium">Accommodation Charges</td>
                        <td className="py-2 text-right font-bold font-sans tabular-nums">₹{showInvoiceModal.financeRecord.accommodation_charges.toLocaleString('en-IN')}</td>
                      </tr>
                    )}
                    {showInvoiceModal.financeRecord.travel_charges > 0 && (
                      <tr>
                        <td className="py-2 text-slate-600 font-medium">Travel Charges</td>
                        <td className="py-2 text-right font-bold font-sans tabular-nums">₹{showInvoiceModal.financeRecord.travel_charges.toLocaleString('en-IN')}</td>
                      </tr>
                    )}
                    <tr className="border-t border-slate-200 font-black">
                      <td className="py-2">SUBTOTAL</td>
                      <td className="py-2 text-right font-sans tabular-nums font-black">₹{showInvoiceModal.financeRecord.subtotal_amount.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="text-slate-600">
                      <td className="py-2">GST ({showInvoiceModal.financeRecord.gst_rate}%)</td>
                      <td className="py-2 text-right font-sans tabular-nums">₹{showInvoiceModal.financeRecord.gst_amount.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="border-t-2 border-slate-900 font-black text-sm">
                      <td className="py-3 text-slate-900">GRAND TOTAL</td>
                      <td className="py-3 text-right font-sans tabular-nums font-black text-slate-900">₹{showInvoiceModal.financeRecord.final_total_amount.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Received vs Pending Box */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                  <div>
                    <span className="font-bold text-emerald-800 block">Total Amount Received:</span>
                    <span className="text-base font-black font-sans tabular-nums text-emerald-700">₹{showInvoiceModal.financeRecord.received_amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-amber-900 block">Balance Pending:</span>
                    <span className="text-base font-black font-sans tabular-nums text-amber-950">₹{showInvoiceModal.financeRecord.pending_amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Footer Notes & Bank */}
                <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
                  <p className="font-bold text-slate-700">Bank Details for Payment:</p>
                  <p>HDFC Bank • A/C: 50200012345678 • IFSC: HDFC0001234 • UPI: filmifyweddings@hdfcbank</p>
                  <p className="italic text-[10px] text-slate-400 mt-2">Thank you for choosing Filmify Weddings! This is a computer-generated tax invoice.</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
