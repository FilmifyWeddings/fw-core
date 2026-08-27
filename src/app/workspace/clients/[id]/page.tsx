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
  const [activeTab, setActiveTab] = useState<'overview' | 'quotations' | 'events' | 'post_production' | 'finance' | 'moodboard'>('overview');

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Tab 6: Mood Board & Event Prep
  const [moodboard, setMoodboard] = useState<any>(null);
  const [loadingMoodboard, setLoadingMoodboard] = useState(false);
  const [copiedMoodboardLink, setCopiedMoodboardLink] = useState(false);
  const [updatingMbStatus, setUpdatingMbStatus] = useState(false);

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
        fetchFinanceAndSyncMilestones(foundClient),
        fetchMoodboard(foundClient)
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

  // ─────────────────────────────────────────────────────────────
  // 6. FETCH MOOD BOARD & EVENT PREP
  // ─────────────────────────────────────────────────────────────
  const fetchMoodboard = async (c: WorkspaceClient) => {
    setLoadingMoodboard(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const res = await fetch(`/api/moodboard/client/${c.id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (res.ok && data.success && data.moodboard) {
        setMoodboard(data.moodboard);
      }
    } catch (e) {
      console.error('Error fetching moodboard:', e);
    } finally {
      setLoadingMoodboard(false);
    }
  };

  const handleUpdateMoodboardStatus = async (newStatus: string) => {
    if (!client) return;
    setUpdatingMbStatus(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const res = await fetch(`/api/moodboard/client/${client.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMoodboard(data.moodboard);
      }
    } catch (e) {
      console.error('Error updating moodboard status:', e);
    } finally {
      setUpdatingMbStatus(false);
    }
  };

  const copyMoodboardLink = () => {
    if (!moodboard?.token) return;
    const url = `${window.location.origin}/p/moodboard/${moodboard.token}`;
    navigator.clipboard.writeText(url);
    setCopiedMoodboardLink(true);
    setTimeout(() => setCopiedMoodboardLink(false), 2500);
  };

  const shareMoodboardOnWhatsApp = () => {
    if (!moodboard?.token) return;
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const publicUrl = `${window.location.origin}/p/moodboard/${moodboard.token}`;
    const coupleName = name || 'there';
    const text = `Hi ${coupleName}! ✨\n\nHere is your private *Wedding Mood Board & Event Prep Portal* from our studio:\n🔗 ${publicUrl}\n\nPlease add your couple photos, family references, outfits, and event timings so our photography crew can prepare your shot lists perfectly!\n\nLooking forward to capturing your big day! 📸`;

    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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

  // ─── 🗑️ CASCADE SAFE DELETE CLIENT (DB LEVEL PURGE) ───
  const handleCascadeDeleteClient = async () => {
    if (!client) return;
    setIsDeleting(true);
    try {
      const clientId = client.id;
      const leadId = client.lead_id;

      // 1. Delete client finance record
      await supabase.from('client_finance_records').delete().eq('client_id', clientId);

      // 2. Delete finance audit logs
      await supabase.from('finance_audit_logs').delete().eq('client_id', clientId);

      // 3. Delete post-production project
      await supabase.from('post_production_projects').delete().eq('client_id', clientId);

      // 4. Delete quotation documents
      if (leadId) {
        await supabase.from('quotation_documents').delete().eq('lead_id', leadId);
      }
      await supabase.from('quotation_documents').delete().eq('lead_id', clientId);

      // 5. Delete workspace_clients record
      const { error: delErr } = await supabase.from('workspace_clients').delete().eq('id', clientId);
      if (delErr) throw delErr;

      setShowDeleteModal(false);
      router.push('/workspace/clients');
    } catch (err: any) {
      console.error('Cascade delete error:', err);
      alert(`Failed to delete client: ${err.message || 'Database error'}`);
    } finally {
      setIsDeleting(false);
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
            { id: 'moodboard', label: 'Mood Board ✨', icon: Sparkles },
            { id: 'post_production', label: 'Post-Production', icon: Film },
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

            {/* ─── 🗑️ DANGER ZONE: SAFE DELETE CLIENT ─── */}
            <div className="bg-rose-50/50 rounded-3xl border border-rose-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  Danger Zone: Delete Client Workspace
                </h4>
                <p className="text-[11px] text-rose-700 font-medium max-w-lg">
                  Permanently delete <strong className="font-black text-rose-950">{name || client.name}</strong> and remove all associated finance cards, milestone schedules, quotations, deliverables, and invoices.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Client</span>
              </button>
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

            {/* Top Overdue Summary Banner if Overdue Milestones Exist */}
            {(() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const todayStr = today.toISOString().split('T')[0];

              const overdueList = (financeRecord?.milestones || []).filter(
                m => m.due_date && m.due_date < todayStr && m.status !== 'completed' && m.status !== 'paid' && (m.status as string) !== 'Completed'
              );

              if (overdueList.length === 0) return null;

              const totalOverdue = overdueList.reduce((s, m) => s + (Number(m.amount) || 0), 0);
              const maxDays = overdueList.reduce((max, m) => {
                const diff = Math.floor((today.getTime() - new Date(m.due_date!).getTime()) / (1000 * 60 * 60 * 24));
                return Math.max(max, diff);
              }, 0);

              return (
                <div className="p-4 bg-rose-50/90 rounded-2xl border border-rose-200 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <div>
                      <span className="text-xs font-black text-rose-900 block">
                        ⚠️ Total Overdue: ₹{totalOverdue.toLocaleString('en-IN')} (Oldest: {maxDays} days ago)
                      </span>
                      <span className="text-[11px] text-rose-700 font-medium">
                        Immediate collection required for {overdueList.length} pending milestone schedule{overdueList.length > 1 ? 's' : ''}.
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 bg-rose-100 px-3 py-1 rounded-full border border-rose-200">
                    {overdueList.length} Pending
                  </span>
                </div>
              );
            })()}

            {financeRecord?.milestones && financeRecord.milestones.length > 0 ? (
              <div className="space-y-3">
                {financeRecord.milestones.map((ms, idx) => {
                  const isPaid = (ms.status as string) === 'completed' || (ms.status as string) === 'paid' || (ms.status as string) === 'Completed';
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const todayStr = today.toISOString().split('T')[0];
                  const isOverdue = !isPaid && ms.due_date && ms.due_date < todayStr;
                  const overdueDays = isOverdue ? Math.max(1, Math.floor((today.getTime() - new Date(ms.due_date!).getTime()) / (1000 * 60 * 60 * 24))) : 0;

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
                              <span>
                                Due: {ms.due_date ? new Date(ms.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'On completion'}
                                {isOverdue && (
                                  <span className="text-rose-600 font-black ml-1.5 inline-flex items-center gap-0.5">
                                    • ⚠️ {overdueDays} Days Overdue
                                  </span>
                                )}
                              </span>
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
                          {isPaid ? 'PAID' : isOverdue ? `⚠️ OVERDUE (${overdueDays}d)` : 'DUE / PENDING'}
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

        {/* ─────────────────────────────────────────────────────────────
            TAB 6: CLIENT MOOD BOARD & WEDDING PREP PORTAL
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'moodboard' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {loadingMoodboard ? (
              <div className="p-16 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] flex flex-col items-center justify-center text-center">
                <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
                <p className="text-sm font-bold text-slate-700">Loading Client Mood Board & Vision...</p>
              </div>
            ) : !moodboard ? (
              <div className="p-12 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] text-center space-y-4">
                <Sparkles className="w-12 h-12 text-amber-500 mx-auto" />
                <h3 className="text-lg font-black text-slate-900">Initialize Client Mood Board</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Generate a private magic link for this couple so they can upload their couple portraits, family references, outfits, and event timelines.
                </p>
                <button
                  onClick={() => client && fetchMoodboard(client)}
                  className="px-6 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Generate Mood Board Magic Link
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* ── TOP BANNER & MAGIC LINK SHARER ── */}
                <div className="p-6 sm:p-7 bg-gradient-to-r from-amber-50 via-[#FFFDF9] to-amber-50/50 rounded-3xl border border-amber-200/80 shadow-sm space-y-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-amber-400/30 text-amber-900 border border-amber-300 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Mood Board & Event Prep
                        </span>
                        <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                          moodboard.status === 'SUBMITTED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : moodboard.status === 'IN_REVIEW'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}>
                          Status: {moodboard.status || 'DRAFT'} ({moodboard.completion_percentage || 0}%)
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-serif">
                        {client.name} • Creative Mood Board
                      </h2>
                      <p className="text-xs text-slate-600">
                        Public Magic Token: <code className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200 text-slate-800">{moodboard.token}</code>
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Copy Link */}
                      <button
                        onClick={copyMoodboardLink}
                        className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedMoodboardLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-amber-600" />}
                        <span>{copiedMoodboardLink ? 'Link Copied!' : 'Copy Magic Link'}</span>
                      </button>

                      {/* WhatsApp Share */}
                      <button
                        onClick={shareMoodboardOnWhatsApp}
                        className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Share on WhatsApp</span>
                      </button>

                      {/* Open Portal Preview */}
                      <a
                        href={`/p/moodboard/${moodboard.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open Client Portal</span>
                      </a>
                    </div>
                  </div>

                  {/* Progress bar & Studio review status switcher */}
                  <div className="pt-2 border-t border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 max-w-md">
                      <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                        <span>Client Progress</span>
                        <span className="text-amber-700 font-mono font-black">{moodboard.completion_percentage || 0}% Complete</span>
                      </div>
                      <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden border border-amber-200">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                          style={{ width: `${moodboard.completion_percentage || 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">Studio Review:</span>
                      <select
                        value={moodboard.status || 'DRAFT'}
                        disabled={updatingMbStatus}
                        onChange={(e) => handleUpdateMoodboardStatus(e.target.value)}
                        className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                      >
                        <option value="DRAFT">Draft (Awaiting Client)</option>
                        <option value="IN_REVIEW">In Review (Crew Checking)</option>
                        <option value="SUBMITTED">Submitted by Couple</option>
                        <option value="APPROVED">Approved for Shoot</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* ── 10 STRUCTURED SECTIONS BREAKDOWN ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 1. COUPLE PORTRAITS */}
                  <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif font-black text-base text-slate-900 flex items-center gap-2">
                        <Camera className="w-4 h-4 text-amber-600" />
                        1. Couple Photos & Chemistry ({Array.isArray(moodboard.couple_photos) ? moodboard.couple_photos.length : 0})
                      </h3>
                    </div>
                    {Array.isArray(moodboard.couple_photos) && moodboard.couple_photos.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {moodboard.couple_photos.map((photo: any, idx: number) => (
                          <div key={idx} className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex flex-col">
                            <div className="aspect-[4/5] bg-slate-900 relative">
                              <img src={photo.url} alt={`Couple ${idx}`} className="w-full h-full object-cover" />
                            </div>
                            {photo.caption && (
                              <p className="p-2 text-[11px] text-slate-600 bg-white truncate" title={photo.caption}>
                                {photo.caption}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-3">No couple portraits uploaded yet.</p>
                    )}
                  </div>

                  {/* 2. SOCIAL MEDIA HANDLES */}
                  <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                    <h3 className="font-serif font-black text-base text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      2. Social Handles & Wedding Tag
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                        <span className="text-slate-500 font-bold block mb-1">Bride IG</span>
                        {moodboard.bride_instagram ? (
                          <a
                            href={`https://instagram.com/${moodboard.bride_instagram}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-pink-600 hover:underline flex items-center gap-1"
                          >
                            @{moodboard.bride_instagram}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                        <span className="text-slate-500 font-bold block mb-1">Groom IG</span>
                        {moodboard.groom_instagram ? (
                          <a
                            href={`https://instagram.com/${moodboard.groom_instagram}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                          >
                            @{moodboard.groom_instagram}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                        <span className="text-slate-500 font-bold block mb-1">Hashtag</span>
                        <span className="font-bold text-amber-700 font-mono">
                          {moodboard.couple_instagram ? `#${moodboard.couple_instagram}` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3. COORDINATION CONTACTS */}
                  <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                    <h3 className="font-serif font-black text-base text-slate-900 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-amber-600" />
                      3. Shoot-Day Coordinators
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Bride Side */}
                      <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-200 space-y-1.5">
                        <div className="font-black text-rose-900">👰 Bride Side Contact</div>
                        <div className="font-bold text-slate-800">
                          {moodboard.bride_coordinator?.name || 'Not provided'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Relation: {moodboard.bride_coordinator?.relation || '—'}
                        </div>
                        {moodboard.bride_coordinator?.phone && (
                          <div className="pt-1 flex items-center gap-2">
                            <a
                              href={`tel:${moodboard.bride_coordinator.phone}`}
                              className="px-2.5 py-1 bg-white border border-rose-200 rounded-lg font-bold text-rose-700 flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" /> Call
                            </a>
                            <a
                              href={`https://wa.me/${moodboard.bride_coordinator.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1"
                            >
                              <MessageCircle className="w-3 h-3" /> WhatsApp
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Groom Side */}
                      <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-1.5">
                        <div className="font-black text-blue-900">🤵 Groom Side Contact</div>
                        <div className="font-bold text-slate-800">
                          {moodboard.groom_coordinator?.name || 'Not provided'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Relation: {moodboard.groom_coordinator?.relation || '—'}
                        </div>
                        {moodboard.groom_coordinator?.phone && (
                          <div className="pt-1 flex items-center gap-2">
                            <a
                              href={`tel:${moodboard.groom_coordinator.phone}`}
                              className="px-2.5 py-1 bg-white border border-blue-200 rounded-lg font-bold text-blue-700 flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" /> Call
                            </a>
                            <a
                              href={`https://wa.me/${moodboard.groom_coordinator.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1"
                            >
                              <MessageCircle className="w-3 h-3" /> WhatsApp
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4. CLOSE FAMILY PHOTOS (VIP SHOT LIST) */}
                  <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                    <h3 className="font-serif font-black text-base text-slate-900 flex items-center gap-2">
                      <UsersIcon className="w-4 h-4 text-amber-600" />
                      4. VIP Family Members Tagged List ({Array.isArray(moodboard.close_family_photos) ? moodboard.close_family_photos.length : 0})
                    </h3>
                    {Array.isArray(moodboard.close_family_photos) && moodboard.close_family_photos.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {moodboard.close_family_photos.map((fam: any, idx: number) => (
                          <div key={idx} className="p-2 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-800">
                              <img src={fam.url} alt="Family" className="w-full h-full object-cover" />
                            </div>
                            <div className="text-[11px] space-y-0.5">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                fam.side === 'Bride' ? 'bg-rose-100 text-rose-800' : fam.side === 'Groom' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {fam.side} • {fam.relation || 'VIP'}
                              </span>
                              <div className="font-bold text-slate-800 truncate">{fam.names || 'Family Member'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-3">No family identification photos uploaded.</p>
                    )}
                  </div>

                  {/* 5. VISUAL INSPIRATION & PINTEREST */}
                  <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                    <h3 className="font-serif font-black text-base text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      5. Visual Mood Board & Poses ({Array.isArray(moodboard.photo_references) ? moodboard.photo_references.length : 0})
                    </h3>
                    {Array.isArray(moodboard.photo_references) && moodboard.photo_references.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {moodboard.photo_references.map((inspo: any, idx: number) => (
                          <div key={idx} className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex flex-col">
                            <div className="aspect-[4/5] bg-slate-900 relative">
                              <img src={inspo.url} alt="Inspo" className="w-full h-full object-cover" />
                              <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded text-[9px] text-amber-300 font-bold">
                                {inspo.category}
                              </span>
                            </div>
                            {inspo.notes && (
                              <p className="p-2 text-[10px] text-slate-600 bg-white truncate" title={inspo.notes}>
                                {inspo.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-3">No aesthetic mood board items uploaded.</p>
                    )}
                  </div>

                  {/* 6. VIDEO & REEL REFERENCES */}
                  <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                    <h3 className="font-serif font-black text-base text-slate-900 flex items-center gap-2">
                      <Film className="w-4 h-4 text-amber-600" />
                      6. Cinematic Video References ({Array.isArray(moodboard.video_references) ? moodboard.video_references.length : 0})
                    </h3>
                    {Array.isArray(moodboard.video_references) && moodboard.video_references.length > 0 ? (
                      <div className="space-y-2 text-xs">
                        {moodboard.video_references.map((vid: any, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                                {vid.type}
                              </span>
                              <div className="text-slate-800 font-bold truncate mt-1">{vid.notes || vid.url}</div>
                            </div>
                            {vid.url && (
                              <a
                                href={vid.url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold rounded-xl flex items-center gap-1 shrink-0"
                              >
                                <Play className="w-3 h-3" /> Watch
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-3">No video references added.</p>
                    )}
                  </div>

                  {/* 7. EVENT ITINERARY */}
                  <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                    <h3 className="font-serif font-black text-base text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      7. Event Schedule & Rituals ({Array.isArray(moodboard.itinerary_schedule) ? moodboard.itinerary_schedule.length : 0})
                    </h3>
                    {Array.isArray(moodboard.itinerary_schedule) && moodboard.itinerary_schedule.length > 0 ? (
                      <div className="space-y-2.5 text-xs">
                        {moodboard.itinerary_schedule.map((item: any, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-slate-900">{item.event_name}</span>
                              <span className="font-mono text-slate-500">{item.date || 'Date TBD'}</span>
                            </div>
                            <div className="text-[11px] text-amber-800 font-bold">
                              ⏰ {item.start_time} - {item.end_time}
                            </div>
                            {item.rituals_notes && (
                              <p className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-100 mt-1">
                                {item.rituals_notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-3">No itinerary items scheduled.</p>
                    )}
                  </div>

                  {/* 8. VENUES & MAPS */}
                  <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4">
                    <h3 className="font-serif font-black text-base text-slate-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-amber-600" />
                      8. Venue Locations & Maps ({Array.isArray(moodboard.venue_locations) ? moodboard.venue_locations.length : 0})
                    </h3>
                    {Array.isArray(moodboard.venue_locations) && moodboard.venue_locations.length > 0 ? (
                      <div className="space-y-2.5 text-xs">
                        {moodboard.venue_locations.map((ven: any, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <div className="font-black text-slate-900">{ven.event_name || 'Event Venue'}</div>
                              <div className="font-bold text-slate-700">{ven.venue_name}</div>
                              <div className="text-[11px] text-slate-500 truncate">{ven.address}</div>
                            </div>
                            {ven.maps_url && (
                              <a
                                href={ven.maps_url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl"
                                title="Open Google Maps"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-3">No venue locations added.</p>
                    )}
                  </div>

                  {/* 9. FINALIZED OUTFITS */}
                  <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-4 col-span-full">
                    <h3 className="font-serif font-black text-base text-slate-900 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-amber-600" />
                      9. Finalized Outfits & Styling ({Array.isArray(moodboard.outfit_references) ? moodboard.outfit_references.length : 0})
                    </h3>
                    {Array.isArray(moodboard.outfit_references) && moodboard.outfit_references.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {moodboard.outfit_references.map((outfit: any, idx: number) => (
                          <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                            <div className="font-black text-sm text-slate-900">{outfit.event_name}</div>
                            <div className="grid grid-cols-2 gap-2">
                              {outfit.bride_outfit_url ? (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-rose-700">Bride Outfit</span>
                                  <img src={outfit.bride_outfit_url} alt="Bride" className="aspect-[4/3] rounded-xl object-cover border border-slate-200" />
                                </div>
                              ) : (
                                <div className="aspect-[4/3] rounded-xl bg-slate-200/60 flex items-center justify-center text-[10px] text-slate-400">
                                  No Bride Outfit
                                </div>
                              )}
                              {outfit.groom_outfit_url ? (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-blue-700">Groom Outfit</span>
                                  <img src={outfit.groom_outfit_url} alt="Groom" className="aspect-[4/3] rounded-xl object-cover border border-slate-200" />
                                </div>
                              ) : (
                                <div className="aspect-[4/3] rounded-xl bg-slate-200/60 flex items-center justify-center text-[10px] text-slate-400">
                                  No Groom Outfit
                                </div>
                              )}
                            </div>
                            {outfit.notes && <p className="text-xs text-slate-600 bg-white p-2 rounded-xl border border-slate-100">{outfit.notes}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-3">No outfit styling references uploaded.</p>
                    )}
                  </div>

                  {/* 10. WEDDING DAY PAYMENT COORDINATOR */}
                  <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs space-y-2 col-span-full">
                    <h3 className="font-serif font-black text-base text-slate-900 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-amber-600" />
                      10. Wedding-Day Vendor Payment Coordinator
                    </h3>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-slate-800 text-sm">
                          {moodboard.payment_contact?.name || 'Not nominated yet'}
                        </div>
                        <div className="text-slate-500">
                          Relation: {moodboard.payment_contact?.relation || '—'}
                        </div>
                      </div>
                      {moodboard.payment_contact?.phone && (
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${moodboard.payment_contact.phone}`}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 flex items-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" /> {moodboard.payment_contact.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
      {/* ─────────────────────────────────────────────────────────────
          🗑️ MODAL: DOUBLE CONFIRMATION DELETE CLIENT (CASCADE)
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-rose-200 shadow-2xl space-y-5 text-center font-sans"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-inner">
                <AlertTriangle className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900">
                  Delete Client & Associated Records?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-slate-900 font-black">{name || client?.name}</strong>?
                </p>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-left text-[11px] text-rose-800 space-y-1">
                  <p className="font-bold">⚠️ This action will permanently purge:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-rose-700 pl-1 font-medium">
                    <li>Client Workspace & Event Schedules</li>
                    <li>Finance Cards, Installments & Balance Ledgers</li>
                    <li>Associated Quotation Versions & PDFs</li>
                    <li>Post-Production Task Checklists</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCascadeDeleteClient}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Yes, Delete Everything</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
