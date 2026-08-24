'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Phone, Mail, Calendar, DollarSign, Clock, CheckCircle2, 
  AlertTriangle, ExternalLink, Share2, Copy, Check, X, Plus, 
  Trash2, Edit3, MessageSquare, Send, Bell, Film, BookOpen, 
  Camera, Layers, Lock, ShieldCheck, Sparkles, MapPin, Users as UsersIcon,
  FileText, Download, Printer, RefreshCw, Key, MessageCircle, Link2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AiMicButton from '@/components/AiMicButton';
import { InvoiceModalDialog } from '@/components/finance/invoice-modal-dialog';
import type { 
  WorkspaceClient, PostProductionProject, DeliverableItem, ClientFinanceRecord, FinanceMilestoneItem 
} from '@/types';

export interface ClientEventItem {
  id: string;
  name: string; // e.g. Haldi, Sangeet, Wedding, Reception
  date: string;
  time_start?: string;
  time_end?: string;
  venue?: string;
  city?: string;
  assigned_crew?: string;
  expected_deliverables?: string;
}

export interface ClientExtendedData {
  client_code: string;
  whatsapp_group_link: string;
  whatsapp_group_id: string;
  portal_token: string;
  portal_pin: string;
  portal_enabled: boolean;
  events: ClientEventItem[];
  plain_notes: string;
}

interface ClientInsiderModalProps {
  isOpen: boolean;
  client: WorkspaceClient | null;
  onClose: () => void;
  onClientUpdate: (updatedClient: WorkspaceClient) => void;
  onClientDelete?: (deletedClientId: string) => void;
}

export function parseClientExtended(client: WorkspaceClient): ClientExtendedData {
  const fallbackCode = `CL-${(client.id || '0000').slice(0, 6).toUpperCase()}`;
  const defaultPin = client.phone ? client.phone.replace(/[^0-9]/g, '').slice(-4) || '1234' : '1234';
  const defaultToken = client.id || `token_${Date.now()}`;

  let client_code = fallbackCode;
  let whatsapp_group_link = '';
  let whatsapp_group_id = '';
  let portal_token = defaultToken;
  let portal_pin = defaultPin;
  let portal_enabled = true;
  let events: ClientEventItem[] = [
    {
      id: 'ev_1',
      name: client.event_type || 'Main Wedding Ceremony',
      date: client.event_date || new Date().toISOString().split('T')[0],
      time_start: '04:00 PM',
      time_end: '11:00 PM',
      venue: 'Main Grand Banquet Hall',
      city: 'Mumbai',
      assigned_crew: '2 Photographers, 2 Cinematographers, 1 Drone Pilot',
      expected_deliverables: 'Raw Photos, Cinematic Film, Highlights Teaser'
    }
  ];
  let plain_notes = client.notes || '';

  if (client.notes && client.notes.startsWith('{') && client.notes.endsWith('}')) {
    try {
      const parsed = JSON.parse(client.notes);
      if (parsed.client_code) client_code = parsed.client_code;
      if (parsed.whatsapp_group_link) whatsapp_group_link = parsed.whatsapp_group_link;
      if (parsed.whatsapp_group_id) whatsapp_group_id = parsed.whatsapp_group_id;
      if (parsed.portal_token) portal_token = parsed.portal_token;
      if (parsed.portal_pin) portal_pin = parsed.portal_pin;
      if (parsed.portal_enabled !== undefined) portal_enabled = parsed.portal_enabled;
      if (Array.isArray(parsed.events) && parsed.events.length > 0) events = parsed.events;
      if (parsed.notes !== undefined) plain_notes = parsed.notes;
    } catch (_) {}
  }

  return {
    client_code,
    whatsapp_group_link,
    whatsapp_group_id,
    portal_token,
    portal_pin,
    portal_enabled,
    events,
    plain_notes
  };
}

export function serializeClientExtended(data: Partial<ClientExtendedData>): string {
  return JSON.stringify({
    notes: data.plain_notes || '',
    client_code: data.client_code,
    whatsapp_group_link: data.whatsapp_group_link,
    whatsapp_group_id: data.whatsapp_group_id,
    portal_token: data.portal_token,
    portal_pin: data.portal_pin,
    portal_enabled: data.portal_enabled ?? true,
    events: data.events || []
  });
}

export function ClientInsiderModal({
  isOpen,
  client,
  onClose,
  onClientUpdate,
  onClientDelete
}: ClientInsiderModalProps) {
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

  // Basic info edit state
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

  // Tab Data State
  const [quotationDocs, setQuotationDocs] = useState<any[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  const [postProductionProject, setPostProductionProject] = useState<PostProductionProject | null>(null);
  const [loadingPostProd, setLoadingPostProd] = useState(false);

  const [financeRecord, setFinanceRecord] = useState<ClientFinanceRecord | null>(null);
  const [loadingFinance, setLoadingFinance] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Add Event Modal
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEventName, setNewEventName] = useState('Sangeet & Cocktail');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTimeStart, setNewEventTimeStart] = useState('06:00 PM');
  const [newEventTimeEnd, setNewEventTimeEnd] = useState('11:00 PM');
  const [newEventVenue, setNewEventVenue] = useState('');
  const [newEventCity, setNewEventCity] = useState('');
  const [newEventCrew, setNewEventCrew] = useState('2 Photographers, 1 Cinematographer');

  // Record Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('UPI');
  const [payRef, setPayRef] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  // Sync client props to local state
  useEffect(() => {
    if (client) {
      const ext = parseClientExtended(client);
      setExtended(ext);
      setName(client.name || '');
      setPhone(client.phone || '');
      setEmail(client.email || '');
      setEventType(client.event_type || 'Wedding');
      setEventDate(client.event_date || '');
      setStatus(client.status || 'active');

      // Fetch related data
      fetchQuotations(client);
      fetchPostProduction(client);
      fetchFinance(client);
    }
  }, [client]);

  // 1. Fetch Quotation Versions
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
      console.error('Error fetching quotations for client:', e);
    } finally {
      setLoadingQuotes(false);
    }
  };

  // 2. Fetch Post Production Deliverables
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

  // 3. Fetch Finance Record
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

  if (!isOpen || !client) return null;

  // Save changes to Supabase
  const handleSaveClientDetails = async () => {
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

      const fullUpdated: WorkspaceClient = {
        ...client,
        ...updatedFields
      };

      onClientUpdate(fullUpdated);
    } catch (e) {
      console.error('Error saving client details:', e);
      alert('Failed to save client details.');
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
      onClose();
      if (onClientDelete) {
        onClientDelete(clientId);
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      console.error('Cascade delete error:', err);
      alert(`Failed to delete client: ${err.message || 'Database error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Add ceremony / event function
  const handleAddEvent = () => {
    if (!newEventName.trim()) return;

    const newEv: ClientEventItem = {
      id: `ev_${Date.now()}`,
      name: newEventName.trim(),
      date: newEventDate || eventDate || new Date().toISOString().split('T')[0],
      time_start: newEventTimeStart,
      time_end: newEventTimeEnd,
      venue: newEventVenue.trim() || 'Main Venue',
      city: newEventCity.trim() || 'City',
      assigned_crew: newEventCrew.trim()
    };

    const updatedEvents = [...extended.events, newEv];
    const newExt = { ...extended, events: updatedEvents };
    setExtended(newExt);

    // Persist immediately
    const serializedNotes = serializeClientExtended(newExt);
    supabase.from('workspace_clients').update({ notes: serializedNotes }).eq('id', client.id).then();

    setShowAddEventModal(false);
    setNewEventName('');
    setNewEventVenue('');
  };

  // Delete ceremony / event function
  const handleDeleteEvent = (evId: string) => {
    if (!confirm('Are you sure you want to delete this event ceremony?')) return;
    const updatedEvents = extended.events.filter(e => e.id !== evId);
    const newExt = { ...extended, events: updatedEvents };
    setExtended(newExt);

    const serializedNotes = serializeClientExtended(newExt);
    supabase.from('workspace_clients').update({ notes: serializedNotes }).eq('id', client.id).then();
  };

  // Record Payment in Finance
  const handleRecordPayment = async () => {
    const numAmt = parseFloat(payAmount) || 0;
    if (numAmt <= 0) return;

    const newPaid = (client.paid_amount || 0) + numAmt;
    const newPaymentStatus = newPaid >= client.total_package_amount ? 'paid' : 'partially_paid';

    try {
      // 1. Update client record
      await supabase
        .from('workspace_clients')
        .update({ paid_amount: newPaid, updated_at: new Date().toISOString() })
        .eq('id', client.id);

      // 2. Update client_finance_records if exists
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

      onClientUpdate({ ...client, paid_amount: newPaid });
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900 my-auto"
      >
        {/* ─────────────────────────────────────────────────────────────
            MODAL TOP HEADER
        ───────────────────────────────────────────────────────────── */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-50/70 via-[#FFFDF9] to-amber-50/40 border-b border-[#EAE5DA] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center font-black text-base shadow-2xs">
              {extended.client_code ? extended.client_code.split('-')[1] || 'CL' : 'CL'}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs font-mono">
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
              <p className="text-xs text-slate-600 font-medium mt-0.5 flex items-center gap-2">
                <span>{eventType}</span>
                <span>•</span>
                <span>Event Date: {eventDate ? new Date(eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            {/* Share Portal Link Button */}
            <button
              onClick={() => setShowShareModal(true)}
              className="px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-100/80 hover:bg-amber-200/90 border border-amber-300 rounded-xl transition flex items-center gap-2 shadow-2xs cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-amber-700" />
              Share Client Portal & PIN
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            NAVIGATION TABS
        ───────────────────────────────────────────────────────────── */}
        <div className="flex border-b border-[#EAE5DA] bg-[#FAF8F2] px-4 gap-2 shrink-0 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview & Details', icon: User },
            { id: 'quotations', label: 'Quotations & Versions', icon: FileText },
            { id: 'events', label: 'Events & Bookings', icon: Calendar },
            { id: 'post_production', label: 'Post-Production Checklist', icon: Film },
            { id: 'finance', label: 'Finance & Payments', icon: DollarSign },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 text-xs font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  active 
                    ? 'border-amber-500 text-amber-900 bg-white shadow-2xs rounded-t-xl' 
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-amber-50/50 rounded-t-xl'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB CONTENT CONTAINER (SCROLLABLE)
        ───────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* ═══════════════════════════════════════════════════════════
              TAB 1: OVERVIEW & DETAILS
          ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* Profile & WhatsApp Integration Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* 1. Basic Contact Card */}
                <div className="bg-white p-5 rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-600" />
                      Client Profile & Contacts
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-600 block mb-1">Client / Couple Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Phone Number</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                          />
                          {phone && (
                            <a
                              href={`tel:${phone}`}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-emerald-600"
                              title="Call"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Email ID</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="client@gmail.com"
                          className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Main Event Type</label>
                        <input
                          type="text"
                          value={eventType}
                          onChange={(e) => setEventType(e.target.value)}
                          className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Main Event Date</label>
                        <input
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. WhatsApp Group & Portal Link Card */}
                <div className="bg-white p-5 rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        Client WhatsApp Group & Portal
                      </h3>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">WhatsApp Group Invite Link</label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            placeholder="https://chat.whatsapp.com/..."
                            value={extended.whatsapp_group_link}
                            onChange={(e) => setExtended(prev => ({ ...prev, whatsapp_group_link: e.target.value }))}
                            className="flex-1 px-3 py-2 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                          {extended.whatsapp_group_link && (
                            <a
                              href={extended.whatsapp_group_link}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center gap-1 transition"
                            >
                              Join <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-600 block mb-1">WhatsApp Group ID (JID)</label>
                          <input
                            type="text"
                            placeholder="1203630...@g.us"
                            value={extended.whatsapp_group_id}
                            onChange={(e) => setExtended(prev => ({ ...prev, whatsapp_group_id: e.target.value }))}
                            className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl font-mono text-xs text-slate-900 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-600 block mb-1">4-Digit Security PIN</label>
                          <input
                            type="text"
                            maxLength={6}
                            value={extended.portal_pin}
                            onChange={(e) => setExtended(prev => ({ ...prev, portal_pin: e.target.value }))}
                            className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl font-mono font-black text-amber-800 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="font-bold text-amber-900 text-xs">Public Client Portal</p>
                          <p className="text-[11px] text-amber-700 font-mono truncate max-w-[240px]">{portalUrl}</p>
                        </div>
                        <button
                          onClick={copyPortalLink}
                          className="px-3 py-1.5 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-xs font-bold text-amber-900 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedLink ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleSaveClientDetails}
                      disabled={isSaving}
                      className="px-5 py-2 bg-amber-400 hover:bg-amber-500 font-black text-xs text-slate-900 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                    >
                      {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Save Client Profile
                    </button>
                  </div>
                </div>

              </div>

              {/* Internal Studio Notes */}
              <div className="bg-white p-5 rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-3">
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
                  placeholder="Type any private studio notes, client preferences, special requests..."
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                />
              </div>

              {/* ─── 🗑️ DANGER ZONE: SAFE DELETE CLIENT ─── */}
              <div className="bg-rose-50/50 rounded-2xl border border-rose-200/80 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    Danger Zone: Delete Client Workspace
                  </h4>
                  <p className="text-[11px] text-rose-700 font-medium max-w-md">
                    Permanently delete <strong className="font-black text-rose-950">{name || client.name}</strong> and purge all associated finance cards, milestones, quotations, deliverables, and invoices.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Client</span>
                </button>
              </div>

            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              TAB 2: QUOTATIONS & VERSIONS
          ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'quotations' && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Quotation Proposal Versions</h3>
                  <p className="text-xs text-slate-500 font-medium">All quotation documents generated for this client</p>
                </div>
                <Link
                  href={`/workspace/quotations/builder?clientId=${client.id}&clientName=${encodeURIComponent(name)}`}
                  className="px-4 py-2 text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Create New Quotation Version
                </Link>
              </div>

              {loadingQuotes ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 mx-auto animate-spin text-amber-600" />
                  <p className="text-xs font-bold">Loading quotations...</p>
                </div>
              ) : quotationDocs.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-[#EAE5DA] space-y-3">
                  <FileText className="w-8 h-8 mx-auto text-amber-500" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">No Quotation Documents Found</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Click &quot;+ Create New Quotation Version&quot; to build a luxury proposal.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {quotationDocs.map((doc, idx) => {
                    const isFinal = doc.status === 'accepted' || doc.status === 'final' || doc.is_final;
                    const qNum = doc.quotation_number || `Q-${doc.id.slice(0, 6)}`;
                    const totalAmt = doc.financials?.total_amount || doc.content_json?.pricing?.finalAmount || doc.total_amount || client.total_package_amount || 0;

                    return (
                      <div
                        key={doc.id}
                        className={`p-4 bg-white rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isFinal ? 'border-emerald-300 ring-1 ring-emerald-400/40 shadow-xs' : 'border-[#EAE5DA] hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isFinal ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            v{idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black text-slate-900">{doc.title || `Quotation ${qNum}`}</h4>
                              {isFinal && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  FINAL APPROVED
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              {new Date(doc.updated_at || doc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • Package: <span className="font-bold text-slate-800">₹{totalAmt.toLocaleString('en-IN')}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                          {doc.public_token && (
                            <Link
                              href={`/p/quotation/${doc.public_token}`}
                              target="_blank"
                              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-[#FAF9F5] hover:bg-amber-50 border border-[#EAE5DA] rounded-lg transition flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View Link
                            </Link>
                          )}
                          <Link
                            href={`/workspace/quotations/builder/templet/${doc.quotation_number || doc.id}`}
                            className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit in Builder
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              TAB 3: EVENTS & BOOKINGS (MULTI-DAY ITINERARY)
          ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'events' && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Multi-Day Wedding Functions & Crew Schedule</h3>
                  <p className="text-xs text-slate-500 font-medium">All ceremony bookings, timings, venues, and crew allocations</p>
                </div>
                <button
                  onClick={() => setShowAddEventModal(true)}
                  className="px-4 py-2 text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Add Ceremony / Event
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {extended.events.map((ev, index) => (
                  <div
                    key={ev.id}
                    className="p-4 bg-white rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-3 hover:border-amber-300 transition-all relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 text-xs font-black flex items-center justify-center">
                          {index + 1}
                        </span>
                        <h4 className="text-sm font-black text-slate-900">{ev.name}</h4>
                      </div>
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
                        title="Delete Ceremony"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <p className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="font-bold text-slate-900">{new Date(ev.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        {ev.time_start && <span>• {ev.time_start} - {ev.time_end}</span>}
                      </p>

                      {ev.venue && (
                        <p className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{ev.venue}, {ev.city}</span>
                        </p>
                      )}

                      {ev.assigned_crew && (
                        <p className="flex items-center gap-2">
                          <UsersIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="font-semibold text-slate-700">{ev.assigned_crew}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              TAB 4: POST-PRODUCTION CHECKLIST
          ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'post_production' && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Post-Production Deliverables Card</h3>
                  <p className="text-xs text-slate-500 font-medium">Photos, Videos, Albums, and Drive links for {name}</p>
                </div>
                <Link
                  href="/workspace/post-production"
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition flex items-center gap-1.5"
                >
                  <Film className="w-3.5 h-3.5 text-amber-700" />
                  Open Full Post-Prod Board
                </Link>
              </div>

              {loadingPostProd ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 mx-auto animate-spin text-amber-600" />
                  <p className="text-xs font-bold">Loading deliverables...</p>
                </div>
              ) : !postProductionProject || postProductionProject.deliverables.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-[#EAE5DA] space-y-3">
                  <Film className="w-8 h-8 mx-auto text-amber-500" />
                  <p className="text-xs font-bold text-slate-700">No deliverables tracked yet. Head over to Post-Production board to auto-generate default deliverables.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {postProductionProject.deliverables.map(deliv => (
                    <div
                      key={deliv.id}
                      className="p-3.5 bg-white rounded-xl border border-[#EAE5DA] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          deliv.category === 'photos' ? 'bg-indigo-100 text-indigo-700' :
                          deliv.category === 'videos' ? 'bg-rose-100 text-rose-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {deliv.category === 'photos' ? <Camera className="w-4 h-4" /> :
                           deliv.category === 'videos' ? <Film className="w-4 h-4" /> :
                           <BookOpen className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900">{deliv.title}</h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {deliv.count} • Assigned: <span className="font-semibold text-slate-700">{deliv.assigned_to || 'Unassigned'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-auto">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                          deliv.status === 'completed' || deliv.status === 'done'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {deliv.status === 'completed' || deliv.status === 'done' ? 'Completed' : deliv.status || 'Pending'}
                        </span>

                        {deliv.drive_link && (
                          <a
                            href={deliv.drive_link}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                            title="Open Google Drive link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              TAB 5: FINANCE & PAYMENTS
          ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'finance' && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              
              {/* Financial Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-[#EAE5DA] shadow-2xs">
                  <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Package Amount</p>
                  <h3 className="text-xl font-black text-slate-900 mt-1 font-mono">
                    ₹{(client.total_package_amount || 0).toLocaleString('en-IN')}
                  </h3>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-[#EAE5DA] shadow-2xs">
                  <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Payments Received</p>
                  <h3 className="text-xl font-black text-emerald-600 mt-1 font-mono">
                    ₹{(client.paid_amount || 0).toLocaleString('en-IN')}
                  </h3>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-[#EAE5DA] shadow-2xs">
                  <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Balance Due</p>
                  <h3 className="text-xl font-black text-amber-800 mt-1 font-mono">
                    ₹{Math.max(0, (client.total_package_amount || 0) - (client.paid_amount || 0)).toLocaleString('en-IN')}
                  </h3>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">Payment Milestones & Invoices</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowInvoiceModal(true)}
                    className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    View & Print Invoice
                  </button>
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="px-4 py-1.5 text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Record Payment
                  </button>
                </div>
              </div>

              {/* Top Overdue Summary Banner */}
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
                  <div className="p-3.5 bg-rose-50/90 rounded-2xl border border-rose-200 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <div>
                        <span className="text-xs font-black text-rose-900 block">
                          ⚠️ Total Overdue: ₹{totalOverdue.toLocaleString('en-IN')} (Oldest: {maxDays} days ago)
                        </span>
                        <span className="text-[10px] text-rose-700 font-medium">
                          {overdueList.length} pending milestone schedule{overdueList.length > 1 ? 's' : ''} past due date.
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-200">
                      {overdueList.length} Pending
                    </span>
                  </div>
                );
              })()}

              {/* Milestones Schedule */}
              {financeRecord?.milestones && financeRecord.milestones.length > 0 ? (
                <div className="space-y-2">
                  {financeRecord.milestones.map(ms => {
                    const isPaid = (ms.status as string) === 'completed' || (ms.status as string) === 'paid' || (ms.status as string) === 'Completed';
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const todayStr = today.toISOString().split('T')[0];
                    const isOverdue = !isPaid && ms.due_date && ms.due_date < todayStr;
                    const overdueDays = isOverdue ? Math.max(1, Math.floor((today.getTime() - new Date(ms.due_date!).getTime()) / (1000 * 60 * 60 * 24))) : 0;

                    return (
                      <div
                        key={ms.id}
                        className={`p-3.5 rounded-xl border shadow-2xs flex items-center justify-between gap-3 ${
                          isPaid 
                            ? 'bg-emerald-50/50 border-emerald-200' 
                            : isOverdue 
                            ? 'bg-rose-50/50 border-rose-200' 
                            : 'bg-white border-[#EAE5DA]'
                        }`}
                      >
                        <div>
                          <h4 className="text-xs font-black text-slate-900">{ms.title || ms.step_name}</h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Due: {ms.due_date ? new Date(ms.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'On milestone completion'}
                            {isOverdue && (
                              <span className="text-rose-600 font-black ml-1.5 inline-flex items-center gap-0.5">
                                • ⚠️ {overdueDays} Days Overdue
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-xs text-slate-900">₹{(Number(ms.amount) || 0).toLocaleString('en-IN')}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            isPaid 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : isOverdue
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {isPaid ? 'PAID' : isOverdue ? `⚠️ OVERDUE (${overdueDays}d)` : 'PENDING'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 bg-white rounded-xl border border-slate-100 text-center text-xs text-slate-500">
                  Standard billing package linked. Click &quot;+ Record Payment&quot; to log incoming client installments.
                </div>
              )}
            </motion.div>
          )}

        </div>
      </motion.div>

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
              className="bg-[#FFFDF9] rounded-2xl p-6 max-w-md w-full border border-[#EAE5DA] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Share Client Portal</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Unique access link with 4-digit PIN security</p>
                  </div>
                </div>
                <button onClick={() => setShowShareModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Public Portal Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={portalUrl}
                      className="w-full px-3 py-2 bg-white border border-[#EAE5DA] rounded-xl font-mono text-[11px] text-slate-800"
                    />
                    <button
                      onClick={copyPortalLink}
                      className="px-3 py-2 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl font-bold text-amber-900 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">4-Digit Security Access PIN</label>
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xl font-black font-mono text-amber-900 tracking-widest">{extended.portal_pin}</span>
                      <p className="text-[10px] text-amber-700 mt-0.5">Client must enter this PIN to unlock the portal</p>
                    </div>
                    <Key className="w-5 h-5 text-amber-600" />
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={shareOnWhatsApp}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Share Directly on WhatsApp
                  </button>

                  <button
                    onClick={() => {
                      copyPortalLink();
                      setShowShareModal(false);
                    }}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
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
              className="bg-[#FFFDF9] rounded-2xl p-6 max-w-md w-full border border-[#EAE5DA] shadow-2xl space-y-4"
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
                    placeholder="e.g. Sangeet & Cocktail, Haldi, Reception, Pre-Wedding Shoot"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Event Date</label>
                    <input
                      type="date"
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Timings</label>
                    <input
                      type="text"
                      placeholder="06:00 PM - 11:00 PM"
                      value={newEventTimeStart}
                      onChange={(e) => setNewEventTimeStart(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Venue & Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Taj Lands End, Bandra"
                    value={newEventVenue}
                    onChange={(e) => setNewEventVenue(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#EAE5DA] rounded-xl font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assigned Crew</label>
                  <input
                    type="text"
                    placeholder="e.g. 2 Photographers, 2 Cinematographers, 1 Drone"
                    value={newEventCrew}
                    onChange={(e) => setNewEventCrew(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#EAE5DA] rounded-xl font-medium text-slate-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE5DA]">
                  <button
                    onClick={() => setShowAddEventModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddEvent}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-500 font-black text-slate-900 rounded-xl shadow-xs"
                  >
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
              className="bg-[#FFFDF9] rounded-2xl p-6 max-w-md w-full border border-[#EAE5DA] shadow-2xl space-y-4"
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
                    className="w-full px-3 py-2 bg-white border border-[#EAE5DA] rounded-xl font-mono text-base font-black text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Payment Mode</label>
                    <select
                      value={payMode}
                      onChange={(e) => setPayMode(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900"
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
                      className="w-full px-3 py-2 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900"
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
                    className="w-full px-3 py-2 bg-white border border-[#EAE5DA] rounded-xl font-mono text-xs text-slate-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE5DA]">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl"
                  >
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
          totalPackage={client.total_package_amount || 0}
          paidAmount={client.paid_amount || 0}
          studioSettings={null}
        />
      )}

    </div>
  );
}
