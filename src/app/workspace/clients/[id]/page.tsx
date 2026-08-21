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
  ArrowLeft, CheckSquare, Play, ChevronRight
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

  // Tab 2: Quotations & Versions
  const [quotationDocs, setQuotationDocs] = useState<any[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  // Tab 3: Events
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
  const [activeCommentModal, setActiveCommentModal] = useState<{
    open: boolean;
    deliverableId: string;
    deliverableTitle: string;
  } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentAlertFlag, setCommentAlertFlag] = useState(false);
  const [commentFollowupDate, setCommentFollowupDate] = useState('');

  // Tab 5: Finance
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

      // Fetch Tab Data
      await Promise.all([
        fetchQuotations(foundClient),
        fetchPostProduction(foundClient),
        fetchFinance(foundClient)
      ]);

    } catch (e) {
      console.error('Error fetching client workspace data:', e);
      setErrorMsg('Failed to load client details.');
    } finally {
      setLoading(false);
    }
  };

  // 1. Fetch Quotations & Versions
  const fetchQuotations = async (c: WorkspaceClient) => {
    setLoadingQuotes(true);
    try {
      let query = supabase.from('quotations').select('*').order('created_at', { ascending: false });
      if (c.lead_id) {
        query = query.or(`client_id.eq.${c.lead_id},client_id.eq.${c.id}`);
      } else {
        query = query.eq('client_id', c.id);
      }

      const { data: quotes } = await query;
      setQuotationDocs(quotes || []);
    } catch (e) {
      console.error('Error fetching quotations:', e);
    } finally {
      setLoadingQuotes(false);
    }
  };

  // 2. Fetch Post-Production
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

  // 3. Fetch Finance
  const fetchFinance = async (c: WorkspaceClient) => {
    setLoadingFinance(true);
    try {
      const { data } = await supabase
        .from('client_finance_records')
        .select('*')
        .eq('client_id', c.id)
        .maybeSingle();

      if (data) {
        setFinanceRecord(data);
      }
    } catch (e) {
      console.error('Error fetching finance:', e);
    } finally {
      setLoadingFinance(false);
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

  // Set Quotation as Final
  const handleSetFinalQuotation = async (quoteId: string) => {
    if (!client) return;
    try {
      await supabase
        .from('quotations')
        .update({ status: 'sent' })
        .eq('client_id', client.id);

      await supabase
        .from('quotations')
        .update({ status: 'accepted' })
        .eq('id', quoteId);

      fetchQuotations(client);
    } catch (e) {
      console.error('Error setting final quotation:', e);
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

  // Save Deliverable Comment
  const handleSaveComment = () => {
    if (!activeCommentModal || !commentText.trim() || !postProductionProject) return;

    const newComment: DeliverableComment = {
      id: `comm_${Date.now()}`,
      text: commentText.trim(),
      authorName: 'Lead Studio Manager',
      createdAt: new Date().toISOString(),
      alert_flag: commentAlertFlag,
      followup_at: commentFollowupDate || null
    };

    const updatedDeliverables = postProductionProject.deliverables.map(d => {
      if (d.id === activeCommentModal.deliverableId) {
        const existing = d.comments || [];
        return { ...d, comments: [newComment, ...existing] };
      }
      return d;
    });

    setPostProductionProject({ ...postProductionProject, deliverables: updatedDeliverables });
    supabase
      .from('post_production_projects')
      .update({ deliverables: updatedDeliverables, updated_at: new Date().toISOString() })
      .eq('id', postProductionProject.id)
      .then();

    setCommentText('');
    setCommentAlertFlag(false);
    setCommentFollowupDate('');
  };

  // Record Payment
  const handleRecordPayment = async () => {
    if (!client) return;
    const numAmt = parseFloat(payAmount) || 0;
    if (numAmt <= 0) return;

    const newPaid = (client.paid_amount || 0) + numAmt;
    const newPaymentStatus = newPaid >= client.total_package_amount ? 'paid' : 'partially_paid';

    try {
      await supabase
        .from('workspace_clients')
        .update({ paid_amount: newPaid, updated_at: new Date().toISOString() })
        .eq('id', client.id);

      if (financeRecord) {
        const newPending = Math.max(0, (financeRecord.final_total_amount || client.total_package_amount) - newPaid);
        await supabase
          .from('client_finance_records')
          .update({
            received_amount: newPaid,
            pending_amount: newPending,
            payment_status: newPaymentStatus,
            updated_at: new Date().toISOString()
          })
          .eq('client_id', client.id);
      }

      setClient({ ...client, paid_amount: newPaid });
      setShowPaymentModal(false);
      setPayAmount('');
      setPayRef('');
      fetchFinance(client);
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
            TAB 2: QUOTATIONS & VERSIONS (EXACT LEADS CRM VERSIONS FLOW)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'quotations' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Quotation Proposal Versions</h3>
                <p className="text-xs text-slate-500 font-medium">All generated proposal versions. Final accepted quotation is highlighted in green.</p>
              </div>
              <Link
                href={`/workspace/quotations/builder?clientId=${client.id}&clientName=${encodeURIComponent(name)}`}
                className="px-4 py-2.5 text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                + Create New Quotation Version
              </Link>
            </div>

            {loadingQuotes ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 mx-auto animate-spin text-amber-600" />
                <p className="text-xs font-bold">Loading proposal versions...</p>
              </div>
            ) : quotationDocs.length === 0 ? (
              <div className="p-10 text-center bg-[#FFFDF9] rounded-3xl border border-dashed border-[#EAE5DA] space-y-3 shadow-xs">
                <FileText className="w-10 h-10 mx-auto text-amber-500" />
                <h4 className="text-sm font-black text-slate-900">No Quotation Documents Generated Yet</h4>
                <p className="text-xs text-slate-500">Create the first luxury quotation proposal for {name}.</p>
                <Link
                  href={`/workspace/quotations/builder?clientId=${client.id}&clientName=${encodeURIComponent(name)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 font-black text-xs text-slate-900 rounded-xl shadow-xs mt-2"
                >
                  <Plus className="w-4 h-4" />
                  Build Quotation Version 1
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {quotationDocs.map((doc, idx) => {
                  const isFinal = doc.status === 'accepted' || doc.status === 'final' || doc.is_final;
                  const qNum = doc.quotation_number || `Q-${doc.id.slice(0, 6)}`;
                  const totalAmt = doc.financials?.total_amount || doc.content_json?.pricing?.finalAmount || doc.total_amount || client.total_package_amount || 0;

                  return (
                    <div
                      key={doc.id}
                      className={`p-5 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                        isFinal 
                          ? 'bg-gradient-to-r from-emerald-50/90 via-[#FFFDF9] to-emerald-50/40 border-emerald-300 ring-2 ring-emerald-400/40 shadow-sm' 
                          : 'bg-[#FFFDF9] border-[#EAE5DA] hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Version Emblem */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-2xs shrink-0 ${
                          isFinal ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-900'
                        }`}>
                          v{idx + 1}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="text-sm font-black text-slate-900">{doc.title || `Quotation ${qNum}`}</h4>
                            {isFinal ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                FINAL APPROVED QUOTATION
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Draft Version
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 font-medium">
                            Updated: {new Date(doc.updated_at || doc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • Total Value: <span className="font-black text-slate-900 font-mono">₹{totalAmt.toLocaleString('en-IN')}</span>
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2.5 ml-auto flex-wrap">
                        {!isFinal && (
                          <button
                            onClick={() => handleSetFinalQuotation(doc.id)}
                            className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer"
                          >
                            Set As Final
                          </button>
                        )}

                        {doc.public_token && (
                          <Link
                            href={`/p/quotation/${doc.public_token}`}
                            target="_blank"
                            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-amber-50 border border-[#EAE5DA] rounded-xl transition flex items-center gap-1.5 shadow-2xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Client Link
                          </Link>
                        )}

                        <Link
                          href={`/workspace/quotations/builder/templet/${doc.quotation_number || doc.id}`}
                          className="px-4 py-2 text-xs font-black text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition flex items-center gap-1.5 shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Open in Builder
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
            TAB 3: EVENTS & BOOKINGS (MULTI-DAY TIMELINE & CREW)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'events' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Multi-Day Wedding Ceremonies & Crew Allocation</h3>
                <p className="text-xs text-slate-500 font-medium">Itinerary, venues, scheduled crew allocations and deliverables expected</p>
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
            TAB 5: FINANCE & INVOICES
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'finance' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs">
                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Package Amount</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">
                  ₹{(client.total_package_amount || 0).toLocaleString('en-IN')}
                </h3>
              </div>

              <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs">
                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Payments Received</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                  ₹{(client.paid_amount || 0).toLocaleString('en-IN')}
                </h3>
              </div>

              <div className="p-6 bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-xs">
                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Remaining Balance</p>
                <h3 className="text-2xl font-black text-amber-800 mt-1 font-mono">
                  ₹{Math.max(0, (client.total_package_amount || 0) - (client.paid_amount || 0)).toLocaleString('en-IN')}
                </h3>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Payment Milestones & Invoices</h3>
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
                {financeRecord.milestones.map(ms => (
                  <div
                    key={ms.id}
                    className="p-4 bg-[#FFFDF9] rounded-2xl border border-[#EAE5DA] shadow-xs flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="text-xs font-black text-slate-900">{ms.title}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Due: {ms.due_date ? new Date(ms.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Milestone completion'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-sm text-slate-900">₹{(ms.amount || 0).toLocaleString('en-IN')}</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                        ms.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {ms.status === 'paid' ? 'PAID' : 'PENDING'}
                      </span>
                    </div>
                  </div>
                ))}
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
          totalPackage={client.total_package_amount || 0}
          paidAmount={client.paid_amount || 0}
          studioSettings={null}
        />
      )}

    </div>
  );
}
