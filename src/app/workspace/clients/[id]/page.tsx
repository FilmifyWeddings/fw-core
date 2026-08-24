'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Phone, Mail, Calendar, DollarSign, Clock, CheckCircle2, 
  AlertTriangle, ExternalLink, Share2, Copy, Check, X, Plus, 
  Trash2, Edit3, MessageSquare, Send, Bell, Film, BookOpen, 
  Camera, Layers, Lock, ShieldCheck, Sparkles, MapPin, Users as UsersIcon,
  FileText, Download, Printer, RefreshCw, Key, MessageCircle, Link2,
  ArrowLeft, CheckSquare, Play, ChevronRight, Crown, Eye, Pencil, CheckCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AiMicButton from '@/components/AiMicButton';
import { InvoiceModalDialog } from '@/components/finance/invoice-modal-dialog';
import { 
  parseClientExtended, serializeClientExtended, type ClientEventItem, type ClientExtendedData 
} from '@/components/clients/client-insider-modal';
import type { 
  WorkspaceClient, PostProductionProject, DeliverableItem, ClientFinanceRecord, DeliverableStatus, DeliverableComment
} from '@/types';

// Helper to compute initials from client name
function getClientInitials(name: string): string {
  if (!name) return 'CL';
  const clean = name.replace(/&/g, ' ').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface QuotationVersionItem {
  id?: string;
  template_id: string;
  lead_id?: string;
  version: number;
  version_label?: string;
  title: string;
  is_final?: boolean;
  updated_at: string;
  created_at: string;
  public_token?: string;
  total_amount?: number;
  financials?: {
    total_amount?: number;
  };
  content_json?: any;
}

export default function ClientWorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientIdOrCode = (params?.id as string) || '';

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<WorkspaceClient | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'quotations' | 'events' | 'post_production' | 'finance'>('overview');

  // Extended fields state
  const [extended, setExtended] = useState<ClientExtendedData>({
    client_code: '',
    whatsapp_group_link: '',
    whatsapp_group_id: '',
    portal_token: '',
    portal_pin: '',
    portal_enabled: true,
    events: [],
    plain_notes: ''
  });

  // Profile Edit fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [status, setStatus] = useState<'active' | 'completed' | 'archived'>('active');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Tab 2: Quotations & Versions (Synced with Leads CRM)
  const [quotationDocs, setQuotationDocs] = useState<QuotationVersionItem[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [settingFinalId, setSettingFinalId] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);

  // Tab 3: Events & Bookings
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEventName, setNewEventName] = useState('Sangeet & Cocktail');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTimeStart, setNewEventTimeStart] = useState('06:00 PM');
  const [newEventTimeEnd, setNewEventTimeEnd] = useState('11:00 PM');
  const [newEventVenue, setNewEventVenue] = useState('');
  const [newEventCity, setNewEventCity] = useState('');
  const [newEventCrew, setNewEventCrew] = useState('2 Photographers, 2 Cinematographers, 1 Drone Pilot');

  // Tab 4: Post-Production
  const [postProductionProject, setPostProductionProject] = useState<PostProductionProject | null>(null);
  const [loadingPostProd, setLoadingPostProd] = useState(false);

  // Tab 5: Finance & Milestones
  const [financeRecord, setFinanceRecord] = useState<ClientFinanceRecord | null>(null);
  const [loadingFinance, setLoadingFinance] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('UPI');
  const [payRef, setPayRef] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  // Load client data by ID or Code
  useEffect(() => {
    fetchClientFullData();
  }, [clientIdOrCode]);

  const fetchClientFullData = async () => {
    setLoading(true);
    setErrorMsg(null);

    if (!clientIdOrCode) {
      setErrorMsg('Client identifier missing.');
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      // 1. Try finding client by id
      let { data: foundClient } = await supabase
        .from('workspace_clients')
        .select('*')
        .eq('id', clientIdOrCode)
        .maybeSingle();

      // If not found by id, search all clients for matching client_code in notes
      if (!foundClient) {
        let query = supabase.from('workspace_clients').select('*');
        if (workspaceId !== 'ws_demo') {
          query = query.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
        }
        const { data: allClients } = await query;
        if (allClients) {
          const match = allClients.find(c => {
            const ext = parseClientExtended(c);
            return ext.client_code.toLowerCase() === clientIdOrCode.toLowerCase() || c.id === clientIdOrCode;
          });
          if (match) foundClient = match;
        }
      }

      if (!foundClient) {
        setErrorMsg('Client record not found in workspace.');
        setLoading(false);
        return;
      }

      setClient(foundClient);
      const ext = parseClientExtended(foundClient);
      setExtended(ext);
      setName(foundClient.name || '');
      setPhone(foundClient.phone || '');
      setEmail(foundClient.email || '');
      setEventType(foundClient.event_type || 'Wedding');
      setEventDate(foundClient.event_date || '');
      setStatus(foundClient.status || 'active');

      // Fetch All Tabs Data
      await Promise.all([
        fetchLeadQuotationVersions(foundClient),
        fetchPostProduction(foundClient),
        fetchFinanceAndSyncMilestones(foundClient)
      ]);

    } catch (e) {
      console.error('Error fetching client workspace data:', e);
      setErrorMsg('Failed to load client details.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 1. FETCH QUOTATION VERSIONS (SYNCED WITH LEADS CRM)
  // ─────────────────────────────────────────────────────────────
  const fetchLeadQuotationVersions = async (c: WorkspaceClient) => {
    setLoadingQuotes(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const targetLeadId = c.lead_id;

      if (targetLeadId) {
        // Fetch through identical Leads CRM endpoint
        const res = await fetch(`/api/leads/${targetLeadId}/quotations`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const text = await res.text();
        const json = text ? JSON.parse(text) : {};

        if (json.success && Array.isArray(json.quotations) && json.quotations.length > 0) {
          setQuotationDocs(json.quotations);
          setLoadingQuotes(false);
          return;
        }
      }

      // Fallback: Direct database query on quotation_documents & quotations
      let docsQuery = supabase.from('quotation_documents').select('*').order('created_at', { ascending: false });
      if (c.lead_id) {
        docsQuery = docsQuery.or(`lead_id.eq.${c.lead_id},template_id.ilike.%${c.lead_id.slice(0, 8)}%`);
      } else {
        docsQuery = docsQuery.eq('client_id', c.id);
      }

      const { data: docs } = await docsQuery;

      if (docs && docs.length > 0) {
        const formatted: QuotationVersionItem[] = docs.map((d, idx) => ({
          id: d.id,
          template_id: d.template_id || d.id,
          lead_id: d.lead_id,
          version: d.version || (idx + 1),
          version_label: `Version ${d.version || (idx + 1)}`,
          title: d.title || d.content_json?.heroPage?.coupleNames || `Quotation Version ${idx + 1}`,
          is_final: d.is_final || d.content_json?.is_final === true,
          updated_at: d.updated_at || d.created_at,
          created_at: d.created_at,
          public_token: d.public_token || d.content_json?.public_token,
          total_amount: d.content_json?.pricingPage?.finalAmount || d.content_json?.pricing?.finalAmount || c.total_package_amount,
          content_json: d.content_json
        }));
        setQuotationDocs(formatted);
      } else {
        // Check quotations table
        const { data: qRows } = await supabase.from('quotations').select('*').eq('client_id', c.id).order('created_at', { ascending: false });
        if (qRows && qRows.length > 0) {
          const formatted: QuotationVersionItem[] = qRows.map((q, idx) => ({
            id: q.id,
            template_id: q.quotation_number || q.id,
            version: idx + 1,
            title: q.title || `Quotation ${q.quotation_number || idx + 1}`,
            is_final: q.status === 'accepted' || q.status === 'final',
            updated_at: q.updated_at || q.created_at,
            created_at: q.created_at,
            public_token: q.public_token,
            total_amount: q.total_amount || c.total_package_amount
          }));
          setQuotationDocs(formatted);
        } else {
          setQuotationDocs([]);
        }
      }
    } catch (e) {
      console.error('Error fetching quotation versions:', e);
    } finally {
      setLoadingQuotes(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 2. SET FINAL QUOTATION (TWO-WAY SYNC WITH LEADS CRM)
  // ─────────────────────────────────────────────────────────────
  const handleSetFinalQuotation = async (q: QuotationVersionItem) => {
    if (!client || settingFinalId) return;
    setSettingFinalId(q.template_id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const targetLeadId = client.lead_id || client.id;

      // 1. Call standard set-final API
      await fetch('/api/quotations/set-final', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quotationId: q.template_id,
          leadId: targetLeadId
        })
      });

      // 2. Direct database update for instant reactive UI
      await supabase
        .from('quotation_documents')
        .update({ is_final: false })
        .or(`lead_id.eq.${targetLeadId},template_id.ilike.%${targetLeadId.slice(0, 8)}%`);

      await supabase
        .from('quotation_documents')
        .update({ is_final: true, updated_at: new Date().toISOString() })
        .eq('template_id', q.template_id);

      if (client.lead_id) {
        await supabase
          .from('leads')
          .update({ final_quotation_id: q.template_id, updated_at: new Date().toISOString() })
          .eq('id', client.lead_id);
      }

      // Update local state
      setQuotationDocs(prev => prev.map(item => ({
        ...item,
        is_final: item.template_id === q.template_id
      })));

      // Sync finance
      fetchFinanceAndSyncMilestones(client);
    } catch (e) {
      console.error('Error setting final quotation:', e);
    } finally {
      setSettingFinalId(null);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. FETCH POST-PRODUCTION
  // ─────────────────────────────────────────────────────────────
  const fetchPostProduction = async (c: WorkspaceClient) => {
    setLoadingPostProd(true);
    try {
      const { data } = await supabase
        .from('post_production_projects')
        .select('*')
        .eq('client_id', c.id)
        .maybeSingle();

      if (data) {
        setPostProductionProject(data);
      }
    } catch (e) {
      console.error('Error fetching post production:', e);
    } finally {
      setLoadingPostProd(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 4. FETCH FINANCE & SYNC MILESTONES (PREVENT MISMATCH)
  // ─────────────────────────────────────────────────────────────
  const fetchFinanceAndSyncMilestones = async (c: WorkspaceClient) => {
    setLoadingFinance(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      // 1. Fetch from client_finance_records
      let { data: finRow } = await supabase
        .from('client_finance_records')
        .select('*')
        .eq('client_id', c.id)
        .maybeSingle();

      const totalPkg = Number(c.total_package_amount) || 150000;
      const totalPaid = Number(c.paid_amount) || 0;

      // If no finance record exists or milestones empty, generate synced default milestones
      if (!finRow || !finRow.milestones || finRow.milestones.length === 0) {
        const tokenAmt = Math.round(totalPkg * 0.15);
        const advAmt = Math.round(totalPkg * 0.35);
        const eventAmt = Math.round(totalPkg * 0.35);
        const finalAmt = Math.max(0, totalPkg - (tokenAmt + advAmt + eventAmt));

        const baseDate = c.event_date ? new Date(c.event_date) : new Date();
        const tokenDate = new Date().toISOString().split('T')[0];
        const preEventDate = new Date(baseDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const weddingDate = baseDate.toISOString().split('T')[0];
        const deliveryDate = new Date(baseDate.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Cumulative milestone calculation
        const milestones = [
          {
            id: `m_1_${c.id.slice(0, 6)}`,
            step_name: 'Token Booking Amount (15%)',
            amount: tokenAmt,
            due_date: tokenDate,
            status: totalPaid >= tokenAmt ? 'completed' : 'pending',
            payment_mode: 'UPI',
            paid_date: totalPaid >= tokenAmt ? tokenDate : null
          },
          {
            id: `m_2_${c.id.slice(0, 6)}`,
            step_name: 'Advance Amount - Pre-Event (35%)',
            amount: advAmt,
            due_date: preEventDate,
            status: totalPaid >= (tokenAmt + advAmt) ? 'completed' : 'pending',
            payment_mode: 'Bank Transfer',
            paid_date: totalPaid >= (tokenAmt + advAmt) ? preEventDate : null
          },
          {
            id: `m_3_${c.id.slice(0, 6)}`,
            step_name: 'On Wedding Day (35%)',
            amount: eventAmt,
            due_date: weddingDate,
            status: totalPaid >= (tokenAmt + advAmt + eventAmt) ? 'completed' : 'pending',
            payment_mode: 'UPI',
            paid_date: totalPaid >= (tokenAmt + advAmt + eventAmt) ? weddingDate : null
          },
          {
            id: `m_4_${c.id.slice(0, 6)}`,
            step_name: 'Final Delivery & Album Handover (15%)',
            amount: finalAmt,
            due_date: deliveryDate,
            status: totalPaid >= totalPkg && totalPkg > 0 ? 'completed' : 'pending',
            payment_mode: 'Bank Transfer',
            paid_date: totalPaid >= totalPkg && totalPkg > 0 ? deliveryDate : null
          }
        ];

        const newRec = {
          user_id: workspaceId,
          workspace_id: workspaceId,
          client_id: c.id,
          base_package_price: totalPkg,
          discount_amount: 0,
          accommodation_charges: 0,
          travel_charges: 0,
          additional_charges: 0,
          subtotal_amount: totalPkg,
          gst_rate: 0,
          gst_amount: 0,
          final_total_amount: totalPkg,
          received_amount: totalPaid,
          pending_amount: Math.max(0, totalPkg - totalPaid),
          payment_status: totalPaid >= totalPkg && totalPkg > 0 ? 'paid' : totalPaid > 0 ? 'partially_paid' : 'unpaid',
          milestones: milestones,
          updated_at: new Date().toISOString()
        };

        if (workspaceId !== 'ws_demo') {
          const { data: savedRec } = await supabase
            .from('client_finance_records')
            .upsert([newRec], { onConflict: 'client_id' })
            .select('*')
            .maybeSingle();

          if (savedRec) finRow = savedRec;
          else finRow = newRec as any;
        } else {
          finRow = newRec as any;
        }
      }

      setFinanceRecord(finRow);
    } catch (e) {
      console.error('Error fetching finance:', e);
    } finally {
      setLoadingFinance(false);
    }
  };

  // Toggle Milestone Paid/Pending Status
  const handleToggleMilestone = async (milestoneId: string, currentStatus: string) => {
    if (!client || !financeRecord) return;
    const newStatus = currentStatus === 'completed' || currentStatus === 'paid' ? 'pending' : 'completed';

    const updatedMilestones = (financeRecord.milestones || []).map(m => {
      if (m.id === milestoneId) {
        return {
          ...m,
          status: newStatus,
          paid_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null
        };
      }
      return m;
    });

    // Recompute total received from completed milestones
    const totalReceived = updatedMilestones
      .filter(m => m.status === 'completed' || m.status === 'paid')
      .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

    const totalPkg = financeRecord.final_total_amount || client.total_package_amount || 0;
    const newPending = Math.max(0, totalPkg - totalReceived);
    const newPaymentStatus = totalReceived >= totalPkg && totalPkg > 0 ? 'paid' : totalReceived > 0 ? 'partially_paid' : 'unpaid';

    const updatedRecord = {
      ...financeRecord,
      received_amount: totalReceived,
      pending_amount: newPending,
      payment_status: newPaymentStatus,
      milestones: updatedMilestones,
      updated_at: new Date().toISOString()
    };

    setFinanceRecord(updatedRecord);
    setClient(prev => prev ? ({ ...prev, paid_amount: totalReceived }) : null);

    // Sync to Supabase
    try {
      await supabase
        .from('client_finance_records')
        .update({
          received_amount: totalReceived,
          pending_amount: newPending,
          payment_status: newPaymentStatus,
          milestones: updatedMilestones,
          updated_at: new Date().toISOString()
        })
        .eq('client_id', client.id);

      await supabase
        .from('workspace_clients')
        .update({
          paid_amount: totalReceived,
          updated_at: new Date().toISOString()
        })
        .eq('id', client.id);
    } catch (e) {
      console.error('Error updating milestone status:', e);
    }
  };

  // Save Client Details
  const handleSaveClientDetails = async () => {
    if (!client) return;
    setIsSaving(true);
    try {
      const serializedNotes = serializeClientExtended(extended);
      const updatedFields: Partial<WorkspaceClient> = {
        name,
        phone,
        email: email.trim() || null,
        event_type: eventType,
        event_date: eventDate || null,
        status,
        notes: serializedNotes,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('workspace_clients')
        .update(updatedFields)
        .eq('id', client.id);

      if (error) throw error;

      setClient(prev => prev ? ({ ...prev, ...updatedFields }) : null);
      alert('Client details saved successfully!');
    } catch (e: any) {
      console.error('Error saving client details:', e);
      alert(`Failed to save: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Add Ceremony Event
  const handleAddEvent = () => {
    if (!newEventName.trim() || !client) return;

    const newEv: ClientEventItem = {
      id: `ev_${Date.now()}`,
      name: newEventName.trim(),
      date: newEventDate || eventDate || new Date().toISOString().split('T')[0],
      time_start: newEventTimeStart,
      time_end: newEventTimeEnd,
      venue: newEventVenue.trim() || 'Main Venue',
      city: newEventCity.trim() || 'Mumbai',
      assigned_crew: newEventCrew.trim()
    };

    const updatedEvents = [...extended.events, newEv];
    const newExt = { ...extended, events: updatedEvents };
    setExtended(newExt);

    const serializedNotes = serializeClientExtended(newExt);
    supabase.from('workspace_clients').update({ notes: serializedNotes }).eq('id', client.id).then();

    setShowAddEventModal(false);
    setNewEventName('');
    setNewEventVenue('');
  };

  // Delete Ceremony Event
  const handleDeleteEvent = (evId: string) => {
    if (!client || !confirm('Are you sure you want to delete this ceremony?')) return;
    const updatedEvents = extended.events.filter(e => e.id !== evId);
    const newExt = { ...extended, events: updatedEvents };
    setExtended(newExt);

    const serializedNotes = serializeClientExtended(newExt);
    supabase.from('workspace_clients').update({ notes: serializedNotes }).eq('id', client.id).then();
  };

  // Deliverable Update in Post-Production
  const handleDeliverableUpdate = (deliverableId: string, field: keyof DeliverableItem, value: any) => {
    if (!postProductionProject || !client) return;

    const updatedDeliverables = postProductionProject.deliverables.map(d => {
      if (d.id === deliverableId) return { ...d, [field]: value };
      return d;
    });

    const updatedProj = { ...postProductionProject, deliverables: updatedDeliverables };
    setPostProductionProject(updatedProj);

    supabase
      .from('post_production_projects')
      .update({ deliverables: updatedDeliverables, updated_at: new Date().toISOString() })
      .eq('id', postProductionProject.id)
      .then();
  };

  // Record Payment
  const handleRecordPayment = async () => {
    if (!client) return;
    const numAmt = parseFloat(payAmount) || 0;
    if (numAmt <= 0) return;

    const newPaid = (client.paid_amount || 0) + numAmt;
    const totalPkg = client.total_package_amount || 0;
    const newPaymentStatus = newPaid >= totalPkg ? 'paid' : 'partially_paid';

    try {
      await supabase
        .from('workspace_clients')
        .update({ paid_amount: newPaid, updated_at: new Date().toISOString() })
        .eq('id', client.id);

      if (financeRecord) {
        const newPending = Math.max(0, (financeRecord.final_total_amount || totalPkg) - newPaid);
        
        // Update milestone status based on new paid amount
        let cumulative = 0;
        const updatedMilestones = (financeRecord.milestones || []).map(m => {
          cumulative += Number(m.amount) || 0;
          const isDone = newPaid >= cumulative;
          return {
            ...m,
            status: isDone ? 'completed' : m.status === 'completed' ? 'completed' : 'pending',
            paid_date: isDone && !m.paid_date ? payDate : m.paid_date
          };
        });

        await supabase
          .from('client_finance_records')
          .update({
            received_amount: newPaid,
            pending_amount: newPending,
            payment_status: newPaymentStatus,
            milestones: updatedMilestones,
            updated_at: new Date().toISOString()
          })
          .eq('client_id', client.id);
      }

      setClient({ ...client, paid_amount: newPaid });
      setShowPaymentModal(false);
      setPayAmount('');
      setPayRef('');
      fetchFinanceAndSyncMilestones(client);
    } catch (e) {
      console.error('Error recording payment:', e);
      alert('Error recording payment.');
    }
  };

  const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/p/client/${extended.portal_token}` : `/p/client/${extended.portal_token}`;

  const copyPortalLink = () => {
    const textToCopy = `StudioCore Wedding Portal\n🔗 Link: ${portalUrl}\n🔐 Access PIN: ${extended.portal_pin}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const shareOnWhatsApp = () => {
    const msg = `Namaste ${name} Ji! 🙏\nHere is your personal StudioCore Wedding Portal to access your Event Schedule, Quotations, Post-Production status & Google Drive delivery links:\n\n🔗 *Portal Link:* ${portalUrl}\n🔐 *Access PIN:* ${extended.portal_pin}\n\nPlease enter your 4-digit PIN to access your wedding space anytime!`;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}` 
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  // Loading View
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] p-12 text-center text-slate-900 space-y-4">
        <RefreshCw className="w-10 h-10 mx-auto animate-spin text-amber-600" />
        <h2 className="text-base font-black">Loading Client 360 Workspace...</h2>
        <p className="text-xs text-slate-500 font-medium">Fetching client profiles, quotations, events, post-production and finance.</p>
      </div>
    );
  }

  // Error View
  if (errorMsg || !client) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] p-12 text-center text-slate-900 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Client Workspace Not Found</h2>
        <p className="text-xs text-slate-600 max-w-md mx-auto">{errorMsg || 'Please return to Clients Directory.'}</p>
        <Link
          href="/workspace/clients"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-500 font-black text-xs text-slate-900 rounded-xl shadow-xs transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients Directory
        </Link>
      </div>
    );
  }

  const clientInitials = getClientInitials(name);

  // Group deliverables by category
  const photoDeliverables = postProductionProject?.deliverables.filter(d => d.category === 'photos') || [];
  const videoDeliverables = postProductionProject?.deliverables.filter(d => d.category === 'videos') || [];
  const albumDeliverables = postProductionProject?.deliverables.filter(d => d.category === 'albums') || [];
  const customDeliverables = postProductionProject?.deliverables.filter(d => !['photos', 'videos', 'albums'].includes(d.category)) || [];

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-900 pb-24 pt-2 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── BREADCRUMB & BACK BUTTON ── */}
        <div className="flex items-center justify-between">
          <Link
            href="/workspace/clients"
            className="inline-flex items-center gap-2 text-xs font-black text-slate-600 hover:text-amber-900 bg-white hover:bg-amber-50/70 border border-[#EAE5DA] px-3.5 py-2 rounded-xl transition shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 text-amber-600" />
            Back to Clients Directory
          </Link>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span>Clients</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-black">{name}</span>
          </div>
        </div>

        {/* ── CLIENT HERO PROFILE CARD (INITIALS AVATAR - NO HEX CODE) ── */}
        <div className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 border border-[#EAE5DA] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* INITIALS GRADIENT AVATAR */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-slate-950 flex items-center justify-center font-black text-2xl sm:text-3xl shrink-0 shadow-md border border-amber-300 select-none tracking-wider">
              {clientInitials}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{name}</h1>
                <span className="px-3 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 font-mono shadow-2xs">
                  {extended.client_code}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                  status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {status === 'completed' ? 'Completed' : 'Active Client'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600 font-medium">
                <span className="flex items-center gap-1.5 text-slate-900 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  {eventType}
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Event Date: {eventDate ? new Date(eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Not set'}
                </span>
                {phone && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {phone}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Action: Share Client Portal */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowShareModal(true)}
              className="px-5 py-3 text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-2xl shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              Share Client Portal & PIN
            </button>
          </div>
        </div>

        {/* ── CLIENT WORKSPACE TABS NAVIGATION ── */}
        <div className="flex border-b border-[#EAE5DA] bg-[#FAF8F2] p-1.5 rounded-2xl gap-1 overflow-x-auto shadow-2xs">
          {[
            { id: 'overview', label: 'Overview & Profile', icon: User },
            { id: 'quotations', label: 'Quotations & Versions', icon: FileText },
            { id: 'events', label: 'Events & Bookings', icon: Calendar },
            { id: 'post_production', label: 'Post-Production Checklist', icon: Film },
            { id: 'finance', label: 'Finance & Invoices', icon: DollarSign },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  active 
                    ? 'bg-amber-400 text-slate-900 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: OVERVIEW & PROFILE
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Contact Info Card */}
              <div className="bg-[#FFFDF9] p-6 rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <User className="w-4 h-4 text-amber-600" />
                  Client Profile & Contact Information
                </h3>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Client / Couple Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Email ID</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="client@gmail.com"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-semibold text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Event Type</label>
                      <input
                        type="text"
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Main Event Date</label>
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* WhatsApp Group & Portal Access Card */}
              <div className="bg-[#FFFDF9] p-6 rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    WhatsApp Group & Client Portal
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">WhatsApp Group Invite Link</label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://chat.whatsapp.com/..."
                          value={extended.whatsapp_group_link}
                          onChange={(e) => setExtended(prev => ({ ...prev, whatsapp_group_link: e.target.value }))}
                          className="flex-1 px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-mono text-xs text-slate-900 focus:outline-none"
                        />
                        {extended.whatsapp_group_link && (
                          <a
                            href={extended.whatsapp_group_link}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center gap-1 transition"
                          >
                            Open <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">WhatsApp Group ID (JID)</label>
                        <input
                          type="text"
                          placeholder="1203630...@g.us"
                          value={extended.whatsapp_group_id}
                          onChange={(e) => setExtended(prev => ({ ...prev, whatsapp_group_id: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-mono text-xs text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">4-Digit Security PIN</label>
                        <input
                          type="text"
                          maxLength={6}
                          value={extended.portal_pin}
                          onChange={(e) => setExtended(prev => ({ ...prev, portal_pin: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-mono font-black text-amber-900 text-sm"
                        />
                      </div>
                    </div>

                    <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="font-black text-amber-900 text-xs">Public Client Portal</p>
                        <p className="text-[11px] text-amber-700 font-mono truncate max-w-[260px]">{portalUrl}</p>
                      </div>
                      <button
                        onClick={copyPortalLink}
                        className="px-3.5 py-2 bg-white hover:bg-amber-100 border border-amber-300 rounded-xl text-xs font-bold text-amber-900 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedLink ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    onClick={handleSaveClientDetails}
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-amber-400 hover:bg-amber-500 font-black text-xs text-slate-900 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                  >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save Client Details
                  </button>
                </div>
              </div>
            </div>

            {/* Studio Internal Notes with AI Mic */}
            <div className="bg-[#FFFDF9] p-6 rounded-3xl border border-[#EAE5DA] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-600" />
                  Internal Studio Notes & Special Instructions
                </h3>
                <AiMicButton
                  size="sm"
                  buttonText="Voice AI Note"
                  onInsertComment={(text) => {
                    setExtended(prev => ({
                      ...prev,
                      plain_notes: prev.plain_notes ? `${prev.plain_notes}\n${text}` : text
                    }));
                  }}
                />
              </div>
              <textarea
                rows={3}
                value={extended.plain_notes}
                onChange={(e) => setExtended(prev => ({ ...prev, plain_notes: e.target.value }))}
                placeholder="Type private studio instructions, music preferences, special client requests..."
                className="w-full px-4 py-3 bg-white border border-[#EAE5DA] rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
              />
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: QUOTATIONS & VERSIONS (TWO-WAY SYNCED WITH LEADS CRM)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'quotations' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Quotation Proposal Versions</h3>
                <p className="text-xs text-slate-500 font-medium">All proposal versions from CRM. The Final accepted quotation is highlighted in emerald green.</p>
              </div>
              <button
                onClick={() => fetchLeadQuotationVersions(client)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-[#EAE5DA] rounded-xl transition flex items-center gap-1.5 shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingQuotes ? 'animate-spin text-amber-600' : ''}`} />
                Sync Versions
              </button>
            </div>

            {loadingQuotes ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 mx-auto animate-spin text-amber-600" />
                <p className="text-xs font-bold">Loading proposal versions from CRM...</p>
              </div>
            ) : quotationDocs.length === 0 ? (
              <div className="p-10 text-center bg-[#FFFDF9] rounded-3xl border border-dashed border-[#EAE5DA] space-y-3 shadow-xs">
                <FileText className="w-10 h-10 mx-auto text-amber-500" />
                <h4 className="text-sm font-black text-slate-900">No Quotations Found For This Client</h4>
                <p className="text-xs text-slate-500">Quotations created in the Leads CRM will appear here automatically.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {quotationDocs.map((doc, idx) => {
                  const isFinal = doc.is_final;
                  const qNum = doc.template_id || `Q-${idx + 1}`;
                  const totalAmt = doc.total_amount || doc.financials?.total_amount || doc.content_json?.pricingPage?.finalAmount || client.total_package_amount || 0;

                  return (
                    <div
                      key={doc.template_id || doc.id || idx}
                      className={`p-5 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                        isFinal 
                          ? 'bg-gradient-to-r from-emerald-50/90 via-[#FFFDF9] to-emerald-50/50 border-emerald-400 ring-2 ring-emerald-400/50 shadow-md' 
                          : 'bg-[#FFFDF9] border-[#EAE5DA] hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Version Emblem */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-2xs shrink-0 ${
                          isFinal ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-900'
                        }`}>
                          V{doc.version || (idx + 1)}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="text-sm font-black text-slate-900">{doc.title || `Quotation Version ${doc.version || (idx + 1)}`}</h4>
                            {isFinal ? (
                              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white shadow-xs flex items-center gap-1.5">
                                <Crown className="w-3.5 h-3.5 text-amber-200" />
                                FINAL APPROVED QUOTATION
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Draft Version
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 font-medium">
                            Updated: {new Date(doc.updated_at || doc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • Package Amount: <span className="font-black text-slate-900 font-mono">₹{totalAmt.toLocaleString('en-IN')}</span>
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2.5 ml-auto flex-wrap">
                        {!isFinal ? (
                          <button
                            onClick={() => handleSetFinalQuotation(doc)}
                            disabled={settingFinalId === doc.template_id}
                            className="px-3.5 py-2 text-xs font-black text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            {settingFinalId === doc.template_id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            Set As Final
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 text-xs font-black text-emerald-700 bg-emerald-100/80 border border-emerald-300 rounded-xl flex items-center gap-1">
                            <CheckCheck className="w-4 h-4 text-emerald-600" /> Active Final
                          </span>
                        )}

                        {/* Client Preview */}
                        <button
                          type="button"
                          onClick={() => {
                            const clientUrl = doc.public_token 
                              ? `/p/quotation/${doc.public_token}` 
                              : `/workspace/quotations/builder/templet/${doc.template_id}?preview=public`;
                            window.open(clientUrl, '_blank');
                          }}
                          className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-[#EAE5DA] transition text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-600" />
                          Client Preview
                        </button>

                        {/* Edit in Builder */}
                        <Link
                          href={`/workspace/quotations/builder/templet/${doc.template_id}`}
                          className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-900 transition text-xs font-black flex items-center gap-1.5 shadow-2xs"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit Builder
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: EVENTS & BOOKINGS (MULTI-DAY ITINERARY CARDS)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'events' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Multi-Day Wedding Ceremonies & Bookings</h3>
                <p className="text-xs text-slate-500 font-medium">All ceremony cards, dates, timings, venues, and crew allocations</p>
              </div>
              <button
                onClick={() => setShowAddEventModal(true)}
                className="px-4 py-2.5 text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                + Add Ceremony / Event
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {extended.events.map((ev, index) => (
                <div
                  key={ev.id}
                  className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4 hover:border-amber-300 transition-all"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 font-black text-xs flex items-center justify-center shadow-2xs">
                        {index + 1}
                      </span>
                      <h4 className="text-base font-black text-slate-900">{ev.name}</h4>
                    </div>
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
                      title="Delete Ceremony"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-600">
                    <p className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="font-black text-slate-900 text-sm">{new Date(ev.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                      {ev.time_start && <span className="font-semibold text-slate-600">• {ev.time_start} - {ev.time_end}</span>}
                    </p>

                    {ev.venue && (
                      <p className="flex items-center gap-2.5">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800">{ev.venue}, {ev.city}</span>
                      </p>
                    )}

                    {ev.assigned_crew && (
                      <p className="flex items-center gap-2.5">
                        <UsersIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="font-bold text-slate-800">Crew: {ev.assigned_crew}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 4: POST-PRODUCTION CHECKLIST (EXACT CATEGORY CARDS)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'post_production' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Post-Production Deliverables Card</h3>
                <p className="text-xs text-slate-500 font-medium">Photos, Videos, Albums and Drive delivery links</p>
              </div>
              <Link
                href="/workspace/post-production"
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-amber-50 border border-[#EAE5DA] rounded-xl transition flex items-center gap-1.5 shadow-2xs"
              >
                <Film className="w-3.5 h-3.5 text-amber-600" />
                Open Studio Post-Prod Board
              </Link>
            </div>

            {loadingPostProd ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 mx-auto animate-spin text-amber-600" />
                <p className="text-xs font-bold">Loading deliverables...</p>
              </div>
            ) : !postProductionProject || postProductionProject.deliverables.length === 0 ? (
              <div className="p-10 text-center bg-[#FFFDF9] rounded-3xl border border-dashed border-[#EAE5DA] space-y-3">
                <Film className="w-10 h-10 mx-auto text-amber-500" />
                <p className="text-xs font-bold text-slate-700">No deliverables tracked yet. Head to Post-Production to auto-generate.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. PHOTOS CATEGORY CARD */}
                {photoDeliverables.length > 0 && (
                  <div className="p-5 rounded-3xl border border-indigo-200 bg-indigo-50/70 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                          <Camera className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-black text-slate-900">Photos Deliverables</h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-indigo-700 border border-indigo-200">
                        {photoDeliverables.filter(d => d.status === 'completed' || d.status === 'done').length}/{photoDeliverables.length} Done
                      </span>
                    </div>

                    <div className="space-y-2">
                      {photoDeliverables.map(deliv => (
                        <div key={deliv.id} className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <h5 className="text-xs font-black text-slate-900">{deliv.title}</h5>
                            <p className="text-[11px] text-slate-500 font-medium">{deliv.count} • Assigned: <span className="font-bold text-slate-700">{deliv.assigned_to || 'Unassigned'}</span></p>
                          </div>
                          <div className="flex items-center gap-2 ml-auto">
                            <select
                              value={deliv.status || 'pending'}
                              onChange={(e) => handleDeliverableUpdate(deliv.id, 'status', e.target.value)}
                              className="px-2.5 py-1 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Done</option>
                            </select>
                            {deliv.drive_link && (
                              <a href={deliv.drive_link} target="_blank" rel="noreferrer" className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. VIDEOS CATEGORY CARD */}
                {videoDeliverables.length > 0 && (
                  <div className="p-5 rounded-3xl border border-rose-200 bg-rose-50/70 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-rose-100 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                          <Film className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-black text-slate-900">Videos & Films Deliverables</h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-rose-700 border border-rose-200">
                        {videoDeliverables.filter(d => d.status === 'completed' || d.status === 'done').length}/{videoDeliverables.length} Done
                      </span>
                    </div>

                    <div className="space-y-2">
                      {videoDeliverables.map(deliv => (
                        <div key={deliv.id} className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <h5 className="text-xs font-black text-slate-900">{deliv.title}</h5>
                            <p className="text-[11px] text-slate-500 font-medium">{deliv.count} • Assigned: <span className="font-bold text-slate-700">{deliv.assigned_to || 'Unassigned'}</span></p>
                          </div>
                          <div className="flex items-center gap-2 ml-auto">
                            <select
                              value={deliv.status || 'pending'}
                              onChange={(e) => handleDeliverableUpdate(deliv.id, 'status', e.target.value)}
                              className="px-2.5 py-1 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Done</option>
                            </select>
                            {deliv.drive_link && (
                              <a href={deliv.drive_link} target="_blank" rel="noreferrer" className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. ALBUMS CATEGORY CARD */}
                {albumDeliverables.length > 0 && (
                  <div className="p-5 rounded-3xl border border-amber-200 bg-amber-50/70 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-amber-100 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-black text-slate-900">Albums Deliverables</h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-amber-800 border border-amber-200">
                        {albumDeliverables.filter(d => d.status === 'completed' || d.status === 'done').length}/{albumDeliverables.length} Done
                      </span>
                    </div>

                    <div className="space-y-2">
                      {albumDeliverables.map(deliv => (
                        <div key={deliv.id} className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <h5 className="text-xs font-black text-slate-900">{deliv.title}</h5>
                            <p className="text-[11px] text-slate-500 font-medium">{deliv.count} • Assigned: <span className="font-bold text-slate-700">{deliv.assigned_to || 'Unassigned'}</span></p>
                          </div>
                          <div className="flex items-center gap-2 ml-auto">
                            <select
                              value={deliv.status || 'pending'}
                              onChange={(e) => handleDeliverableUpdate(deliv.id, 'status', e.target.value)}
                              className="px-2.5 py-1 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Done</option>
                            </select>
                            {deliv.drive_link && (
                              <a href={deliv.drive_link} target="_blank" rel="noreferrer" className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 5: FINANCE & INVOICES (SYNCED PAYMENT MILESTONES)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'finance' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs">
                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Package Amount</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">
                  ₹{(financeRecord?.final_total_amount || client.total_package_amount || 0).toLocaleString('en-IN')}
                </h3>
              </div>

              <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs">
                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Payments Received</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                  ₹{(financeRecord?.received_amount || client.paid_amount || 0).toLocaleString('en-IN')}
                </h3>
              </div>

              <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs">
                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Remaining Balance</p>
                <h3 className="text-2xl font-black text-amber-800 mt-1 font-mono">
                  ₹{(financeRecord?.pending_amount ?? Math.max(0, (client.total_package_amount || 0) - (client.paid_amount || 0))).toLocaleString('en-IN')}
                </h3>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Payment Milestones Schedule</h3>
                <p className="text-xs text-slate-500 font-medium">Click on any milestone status badge to toggle Paid / Pending</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowInvoiceModal(true)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-[#EAE5DA] rounded-xl transition flex items-center gap-2 shadow-2xs cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  View / Print Invoice
                </button>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-5 py-2.5 text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  + Record Payment
                </button>
              </div>
            </div>

            {financeRecord?.milestones && financeRecord.milestones.length > 0 ? (
              <div className="space-y-3">
                {financeRecord.milestones.map((ms, idx) => {
                  const isPaid = (ms.status as string) === 'completed' || (ms.status as string) === 'paid' || (ms.status as string) === 'Completed';
                  const isOverdue = !isPaid && ms.due_date && new Date(ms.due_date) < new Date();

                  return (
                    <div
                      key={ms.id || idx}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isPaid 
                          ? 'bg-emerald-50/50 border-emerald-300' 
                          : isOverdue
                          ? 'bg-rose-50/40 border-rose-300'
                          : 'bg-[#FFFDF9] border-[#EAE5DA]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          isPaid ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900">{ms.step_name || ms.title || `Milestone ${idx + 1}`}</h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {isPaid && ms.paid_date ? (
                              <span className="text-emerald-700 font-bold">Paid on: {new Date(ms.paid_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            ) : (
                              <span>Due Date: {ms.due_date ? new Date(ms.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'On completion'}</span>
                            )}
                            {ms.payment_mode && <span className="text-slate-400"> • Mode: {ms.payment_mode}</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 ml-auto sm:ml-0">
                        <span className="font-mono font-black text-sm text-slate-900">
                          ₹{(Number(ms.amount) || 0).toLocaleString('en-IN')}
                        </span>

                        <button
                          onClick={() => handleToggleMilestone(ms.id, ms.status)}
                          className={`px-3 py-1.5 rounded-full text-xs font-black border transition cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                            isPaid 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200' 
                              : isOverdue
                              ? 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
                              : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                          }`}
                          title="Click to toggle Paid / Pending"
                        >
                          {isPaid ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Clock className="w-3.5 h-3.5" />}
                          {isPaid ? 'PAID' : isOverdue ? 'OVERDUE' : 'DUE / PENDING'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] text-center text-xs text-slate-500">
                Standard client billing active. Use &quot;+ Record Payment&quot; to log incoming client payments.
              </div>
            )}
          </motion.div>
        )}

      </div>

      {/* ─────────────────────────────────────────────────────────────
          POPUP: SHARE CLIENT PORTAL & PIN MODAL
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 max-w-md w-full border border-[#EAE5DA] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Share Client Portal</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Direct public link with 4-digit PIN security</p>
                  </div>
                </div>
                <button onClick={() => setShowShareModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Public Portal URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={portalUrl}
                      className="w-full px-3 py-2 bg-white border border-[#EAE5DA] rounded-xl font-mono text-[11px] text-slate-800"
                    />
                    <button
                      onClick={copyPortalLink}
                      className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl font-bold text-amber-900 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">4-Digit Security Access PIN</label>
                  <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-black font-mono text-amber-900 tracking-widest">{extended.portal_pin}</span>
                      <p className="text-[10px] text-amber-700 mt-0.5 font-medium">Client enters this PIN to unlock the portal</p>
                    </div>
                    <Key className="w-6 h-6 text-amber-600" />
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={shareOnWhatsApp}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Share Directly on WhatsApp
                  </button>

                  <button
                    onClick={() => {
                      copyPortalLink();
                      setShowShareModal(false);
                    }}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                  >
                    Copy Link & Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          POPUP: ADD CEREMONY / EVENT MODAL
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddEventModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 max-w-md w-full border border-[#EAE5DA] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3">
                <h3 className="text-base font-black text-slate-900">Add Ceremony / Event Function</h3>
                <button onClick={() => setShowAddEventModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ceremony Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sangeet & Cocktail, Haldi, Reception, Phere..."
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Event Date</label>
                    <input
                      type="date"
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Timings</label>
                    <input
                      type="text"
                      placeholder="06:00 PM - 11:00 PM"
                      value={newEventTimeStart}
                      onChange={(e) => setNewEventTimeStart(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Venue & Location</label>
                  <input
                    type="text"
                    placeholder="e.g. The Grand Palace, Mumbai"
                    value={newEventVenue}
                    onChange={(e) => setNewEventVenue(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assigned Crew</label>
                  <input
                    type="text"
                    placeholder="e.g. 2 Photographers, 2 Cinematographers, 1 Drone"
                    value={newEventCrew}
                    onChange={(e) => setNewEventCrew(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-medium text-slate-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE5DA]">
                  <button onClick={() => setShowAddEventModal(false)} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl">
                    Cancel
                  </button>
                  <button onClick={handleAddEvent} className="px-4 py-2 bg-amber-400 hover:bg-amber-500 font-black text-slate-900 rounded-xl shadow-xs">
                    Add Ceremony
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          POPUP: RECORD PAYMENT MODAL
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 max-w-md w-full border border-[#EAE5DA] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3">
                <h3 className="text-base font-black text-slate-900">Record Payment Installment</h3>
                <button onClick={() => setShowPaymentModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-mono text-base font-black text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Payment Mode</label>
                    <select
                      value={payMode}
                      onChange={(e) => setPayMode(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900"
                    >
                      <option value="UPI">UPI / GooglePay</option>
                      <option value="Bank Transfer">NEFT / Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Payment Date</label>
                    <input
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Transaction Ref / Cheque No.</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref #492817291"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-mono text-xs text-slate-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE5DA]">
                  <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl">
                    Cancel
                  </button>
                  <button
                    onClick={handleRecordPayment}
                    disabled={!payAmount}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-500 font-black text-slate-900 rounded-xl shadow-xs disabled:opacity-50"
                  >
                    Confirm & Save
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          POPUP: INVOICE PRINT DIALOG
      ───────────────────────────────────────────────────────────── */}
      {showInvoiceModal && (
        <InvoiceModalDialog
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          client={client}
          financeRecord={financeRecord}
          totalPackage={financeRecord?.final_total_amount || client.total_package_amount || 0}
          paidAmount={financeRecord?.received_amount || client.paid_amount || 0}
          studioSettings={null}
        />
      )}

    </div>
  );
}
