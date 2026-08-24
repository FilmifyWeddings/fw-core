'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, Search, Filter, Plus, DollarSign, Calendar, Phone, Mail, 
  Film, Edit3, Trash2, CheckCircle2, Clock, AlertCircle, ArrowRight, X, 
  Sparkles, Check, ChevronRight, RefreshCw, FolderPlus, MessageCircle,
  Share2, Key, Tag, Layers, ExternalLink, ChevronDown, CreditCard, ShieldCheck,
  CheckSquare, Square, Upload
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { 
  ClientInsiderModal, parseClientExtended, serializeClientExtended 
} from '@/components/clients/client-insider-modal';
import { ExcelMigrationModal } from '@/components/finance/excel-migration-modal';
import type { WorkspaceClient, Lead, ClientFinanceRecord, FinanceMilestoneItem } from '@/types';

const DEFAULT_EVENT_TYPES = [
  'Wedding Photography',
  'Pre-Wedding Shoot',
  'Engagement & Roka',
  'Reception & Dinner',
  'Haldi & Mehndi',
  'Sangeet & Cocktail',
  'Corporate & Commercial',
  'Birthday & Anniversary',
  'Maternity & Baby Shower'
];

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<WorkspaceClient[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('');
  const [financeRecordsMap, setFinanceRecordsMap] = useState<Map<string, ClientFinanceRecord>>(new Map());
  const [isExcelMigrationModalOpen, setIsExcelMigrationModalOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'archived'>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  
  // Event Types & Searchable Dropdown State
  const [eventTypes, setEventTypes] = useState<string[]>(DEFAULT_EVENT_TYPES);
  const [isEventTypeDropdownOpen, setIsEventTypeDropdownOpen] = useState(false);
  const [eventTypeSearch, setEventTypeSearch] = useState('');
  const [showCustomEventInput, setShowCustomEventInput] = useState(false);
  const [newCustomEventType, setNewCustomEventType] = useState('');
  const eventTypeDropdownRef = useRef<HTMLDivElement | null>(null);

  // Selected Client for 360 Workspace Window Modal
  const [selectedClient, setSelectedClient] = useState<WorkspaceClient | null>(null);

  // Add Client Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    event_type: 'Wedding Photography',
    event_date: '',
    total_package_amount: '',
    is_full_payment_received: false,
    advance_amount: '',
    is_advance_received: false,
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'UPI',
    whatsapp_group_link: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch clients & auto-sync booked leads from Supabase
  useEffect(() => {
    fetchClientsAndSyncBookedLeads();
  }, []);

  const fetchClientsAndSyncBookedLeads = async () => {
    setLoading(true);
    try {
      // 1. Fetch user session
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';
      if (session?.user?.id) {
        setCurrentWorkspaceId(session.user.id);
      }

      // 2. Fetch clients table scoped to current user workspace
      let clientQuery = supabase
        .from('workspace_clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (workspaceId && workspaceId !== 'ws_demo') {
        clientQuery = clientQuery.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
      }

      const { data: clientData } = await clientQuery;
      let existingClientList: WorkspaceClient[] = clientData || [];

      // Fetch client finance records for overdue calculation
      let finQuery = supabase.from('client_finance_records').select('*');
      if (workspaceId && workspaceId !== 'ws_demo') {
        finQuery = finQuery.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
      }
      const { data: finData } = await finQuery;
      const fMap = new Map<string, ClientFinanceRecord>();
      if (finData) {
        finData.forEach(f => fMap.set(f.client_id, f));
      }
      setFinanceRecordsMap(fMap);

      // 3. Fetch all leads scoped to current workspace to check for booked leads
      let leadsQuery = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (workspaceId && workspaceId !== 'ws_demo') {
        leadsQuery = leadsQuery.eq('workspace_id', workspaceId);
      }

      const { data: leadsData } = await leadsQuery;
      const leadList: Lead[] = leadsData || [];
      setLeads(leadList);

      // 4. Auto-Sync: For every lead with status 'booked' / 'Booked' that is NOT yet in workspace_clients, create a client record!
      const bookedLeads = leadList.filter(l => {
        const stage = (l.status || l.stage || '').toLowerCase();
        return stage === 'booked' || stage === 'closed' || stage === 'converted';
      });

      const existingLeadIds = new Set(existingClientList.map(c => c.lead_id).filter(Boolean));
      const existingClientPhones = new Set(existingClientList.map(c => c.phone?.replace(/\D/g, '')).filter(Boolean));

      for (const bookedLead of bookedLeads) {
        const leadPhoneDigits = bookedLead.phone?.replace(/\D/g, '') || '';
        const alreadyLinked = existingLeadIds.has(bookedLead.id) || (leadPhoneDigits && existingClientPhones.has(leadPhoneDigits));

        if (!alreadyLinked && bookedLead.name) {
          // Parse amount from lead raw payload
          let packageAmt = 0;
          let paidAmt = 0;
          if (bookedLead.raw_payload) {
            const raw = bookedLead.raw_payload;
            const amtStr = String(raw.package_amount || raw.budget || raw.amount || '0').replace(/[^0-9.]/g, '');
            packageAmt = parseFloat(amtStr) || 0;
            const paidStr = String(raw.paid_amount || raw.advance || raw.token || '0').replace(/[^0-9.]/g, '');
            paidAmt = parseFloat(paidStr) || 0;
          }

          const newClientPayload = {
            user_id: workspaceId,
            workspace_id: workspaceId,
            lead_id: bookedLead.id,
            name: bookedLead.name,
            phone: bookedLead.phone || '',
            email: bookedLead.email || null,
            event_type: bookedLead.event_type || 'Wedding Photography',
            event_date: bookedLead.event_date || null,
            total_package_amount: packageAmt,
            paid_amount: paidAmt,
            status: paidAmt >= packageAmt && packageAmt > 0 ? 'completed' : 'active',
            notes: serializeClientExtended({
              client_code: `CL-${Math.floor(1000 + Math.random() * 9000)}`,
              whatsapp_group_link: bookedLead.whatsapp_group_id ? `https://chat.whatsapp.com/${bookedLead.whatsapp_group_id}` : '',
              portal_token: `tok_${Date.now()}_${Math.random().toString(36).substring(5)}`,
              portal_pin: '123456',
              plain_notes: `Auto-synced from Booked CRM Lead (${bookedLead.name})`,
              events: [
                {
                  id: `ev_${Date.now()}`,
                  name: bookedLead.event_type || 'Wedding Event',
                  date: bookedLead.event_date || new Date().toISOString().split('T')[0],
                  time_start: '05:00 PM',
                  time_end: '11:00 PM',
                  venue: (bookedLead as any).venue || (bookedLead as any).location || 'Main Venue',
                  city: (bookedLead as any).city || 'Mumbai',
                  assigned_crew: '2 Photographers, 2 Cinematographers'
                }
              ]
            })
          };

          try {
            const { data: createdClient, error: insertErr } = await supabase
              .from('workspace_clients')
              .insert([newClientPayload])
              .select('*')
              .single();

            if (!insertErr && createdClient) {
              existingClientList = [createdClient, ...existingClientList];
              existingLeadIds.add(bookedLead.id);
            }
          } catch (autoSyncErr) {
            console.warn('Auto-sync client insert notice:', autoSyncErr);
          }
        }
      }

      setClients(existingClientList);
    } catch (err) {
      console.error('Error fetching clients and syncing leads:', err);
    } finally {
      setLoading(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (eventTypeDropdownRef.current && !eventTypeDropdownRef.current.contains(event.target as Node)) {
        setIsEventTypeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered event types for modal searchable selector
  const filteredEventTypes = useMemo(() => {
    return eventTypes.filter(t => 
      t.toLowerCase().includes(eventTypeSearch.toLowerCase())
    );
  }, [eventTypes, eventTypeSearch]);

  // Handle adding new custom event type
  const handleAddCustomEventType = () => {
    if (newCustomEventType.trim() && !eventTypes.includes(newCustomEventType.trim())) {
      const updated = [newCustomEventType.trim(), ...eventTypes];
      setEventTypes(updated);
      setFormData(prev => ({ ...prev, event_type: newCustomEventType.trim() }));
      setNewCustomEventType('');
      setShowCustomEventInput(false);
      setIsEventTypeDropdownOpen(false);
    }
  };

  // Lead selection from dropdown (auto-fills form fields)
  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    if (!leadId) return;

    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      let leadPkg = '';
      let leadPaid = '';
      let leadEvent = lead.event_type || 'Wedding Photography';
      let leadDate = lead.event_date || '';

      if (lead.raw_payload) {
        const raw = lead.raw_payload;
        if (raw.package_amount || raw.budget || raw.amount) {
          leadPkg = String(raw.package_amount || raw.budget || raw.amount).replace(/[^0-9]/g, '');
        }
        if (raw.paid_amount || raw.advance || raw.token) {
          leadPaid = String(raw.paid_amount || raw.advance || raw.token).replace(/[^0-9]/g, '');
        }
      }

      setFormData(prev => ({
        ...prev,
        name: lead.name || prev.name,
        phone: lead.phone || prev.phone,
        email: lead.email || prev.email,
        event_type: leadEvent,
        event_date: leadDate || prev.event_date,
        total_package_amount: leadPkg || prev.total_package_amount,
        advance_amount: leadPaid || prev.advance_amount,
        is_advance_received: Boolean(leadPaid && parseFloat(leadPaid) > 0),
        notes: `Converted from CRM Lead: ${lead.name || 'Lead'}`
      }));
    }
  };

  // Create Client Form Submit
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('Please provide Client Name and Mobile Number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      const totalPackage = parseFloat(formData.total_package_amount) || 0;
      const advanceAmt = parseFloat(formData.advance_amount) || 0;

      let finalPaidAmount = 0;
      if (formData.is_full_payment_received) {
        finalPaidAmount = totalPackage;
      } else if (formData.is_advance_received && advanceAmt > 0) {
        finalPaidAmount = advanceAmt;
      }

      const clientCode = `CL-${Math.floor(1000 + Math.random() * 9000)}`;
      const portalToken = `tok_${Date.now()}_${Math.random().toString(36).substring(5)}`;
      const portalPin = '123456';

      // ─── STRICT ZERO DUMMY DATA ENFORCEMENT ───
      let initialMilestones: FinanceMilestoneItem[] = [];
      const paymentDate = formData.payment_date || new Date().toISOString().split('T')[0];

      if (formData.is_full_payment_received && totalPackage > 0) {
        initialMilestones = [
          {
            id: `ms_${Date.now()}_1`,
            step_name: 'Full Contract Payment',
            title: 'Full Contract Payment',
            due_date: paymentDate,
            paid_date: paymentDate,
            amount: totalPackage,
            status: 'completed',
            payment_mode: formData.payment_mode || 'UPI'
          }
        ];
      } else if (advanceAmt > 0) {
        initialMilestones = [
          {
            id: `ms_${Date.now()}_1`,
            step_name: 'Token Booking Amount',
            title: 'Token Booking Amount',
            due_date: paymentDate,
            paid_date: formData.is_advance_received ? paymentDate : null,
            amount: advanceAmt,
            status: formData.is_advance_received ? 'completed' : 'pending',
            payment_mode: formData.payment_mode || 'UPI'
          }
        ];
      } else {
        initialMilestones = [];
      }

      const serializedNotes = serializeClientExtended({
        client_code: clientCode,
        whatsapp_group_link: formData.whatsapp_group_link,
        portal_token: portalToken,
        portal_pin: portalPin,
        plain_notes: formData.notes,
        events: [
          {
            id: `ev_${Date.now()}`,
            name: formData.event_type,
            date: formData.event_date || new Date().toISOString().split('T')[0],
            time_start: '05:00 PM',
            time_end: '11:00 PM',
            venue: 'Main Venue',
            city: 'Mumbai',
            assigned_crew: '2 Photographers, 2 Cinematographers'
          }
        ]
      });

      const clientPayload = {
        user_id: workspaceId,
        workspace_id: workspaceId,
        lead_id: selectedLeadId || null,
        name: formData.name,
        phone: formData.phone,
        email: formData.email.trim() || null,
        event_type: formData.event_type,
        event_date: formData.event_date || null,
        total_package_amount: totalPackage,
        paid_amount: finalPaidAmount,
        status: finalPaidAmount >= totalPackage && totalPackage > 0 ? 'completed' : 'active',
        notes: serializedNotes
      };

      const { data: newClient, error } = await supabase
        .from('workspace_clients')
        .insert([clientPayload])
        .select('*')
        .single();

      if (error) throw error;

      if (newClient) {
        // Sync Finance Record
        const pendingAmt = Math.max(0, totalPackage - finalPaidAmount);
        const finStatus = pendingAmt === 0 && totalPackage > 0 ? 'paid' : (finalPaidAmount > 0 ? 'partially_paid' : 'pending');

        try {
          await supabase.from('client_finance_records').upsert([{
            user_id: workspaceId,
            workspace_id: workspaceId,
            client_id: newClient.id,
            base_package_price: totalPackage,
            discount_amount: 0,
            accommodation_charges: 0,
            travel_charges: 0,
            additional_charges: 0,
            subtotal_amount: totalPackage,
            gst_rate: 0,
            gst_amount: 0,
            final_total_amount: totalPackage,
            received_amount: finalPaidAmount,
            pending_amount: pendingAmt,
            payment_status: finStatus,
            milestones: initialMilestones,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }], { onConflict: 'client_id' });
        } catch (finErr) {
          console.warn('Finance record sync notice:', finErr);
        }

        if (finalPaidAmount > 0) {
          try {
            await supabase.from('finance_audit_logs').insert([{
              workspace_id: workspaceId,
              user_id: workspaceId,
              client_id: newClient.id,
              client_name: newClient.name,
              log_type: 'INCOME',
              amount: finalPaidAmount,
              actor_name: session?.user?.user_metadata?.full_name || 'Admin',
              description: formData.is_full_payment_received 
                ? `Full payment received at booking for ${newClient.name}`
                : `Advance booking token received for ${newClient.name}`,
              payment_mode: formData.payment_mode || 'UPI',
              created_at: new Date().toISOString()
            }]);
          } catch (_) {}
        }

        setClients(prev => [newClient, ...prev]);
        setShowAddModal(false);
        setFormData({
          name: '',
          phone: '',
          email: '',
          event_type: 'Wedding Photography',
          event_date: '',
          total_package_amount: '',
          is_full_payment_received: false,
          advance_amount: '',
          is_advance_received: false,
          payment_date: new Date().toISOString().split('T')[0],
          payment_mode: 'UPI',
          whatsapp_group_link: '',
          notes: '',
        });
        setSelectedLeadId('');
      }
    } catch (err: any) {
      console.error('Error creating client:', err);
      alert(`Failed to create client: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Clients List
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = 
        client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone?.includes(searchQuery) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.event_type?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      const matchesEventType = eventTypeFilter === 'all' || client.event_type === eventTypeFilter;

      return matchesSearch && matchesStatus && matchesEventType;
    });
  }, [clients, searchQuery, statusFilter, eventTypeFilter]);

  // Aggregate Metrics
  const totalClientsCount = clients.length;
  const activeClientsCount = clients.filter(c => c.status === 'active').length;
  const totalReceivables = clients.reduce((sum, c) => sum + (c.total_package_amount || 0), 0);
  const totalCollected = clients.reduce((sum, c) => sum + (c.paid_amount || 0), 0);
  const pendingDues = Math.max(0, totalReceivables - totalCollected);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 pb-28 pt-4 px-4 sm:px-6 lg:px-8 font-sans selection:bg-amber-100 selection:text-amber-900">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ─────────────────────────────────────────────────────────────
            HEADER & ACTIONS
        ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EAE5DA] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center border border-amber-500/20 shadow-2xs">
                <Users className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Clients Directory
              </h1>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Manage client workspaces, deliverables, multi-event schedules, and automated WhatsApp delivery portals.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExcelMigrationModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black flex items-center gap-2 shadow-2xs transition cursor-pointer"
              title="Import Legacy Excel / CSV Spreadsheet"
            >
              <Upload className="w-4 h-4 text-emerald-700" />
              <span>Import Excel / CSV</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm hover:brightness-105 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Client</span>
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TOP STATS CARDS
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#FFFDF9] p-4 sm:p-5 rounded-2xl border border-[#EAE5DA] shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Clients
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {totalClientsCount}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#FFFDF9] p-4 sm:p-5 rounded-2xl border border-[#EAE5DA] shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Invoiced Value
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                ₹{totalReceivables.toLocaleString('en-IN')}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#FFFDF9] p-4 sm:p-5 rounded-2xl border border-[#EAE5DA] shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Cash Collected
              </span>
              <h3 className="text-2xl font-black text-emerald-700 tracking-tight font-mono">
                ₹{totalCollected.toLocaleString('en-IN')}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#FFFDF9] p-4 sm:p-5 rounded-2xl border border-[#EAE5DA] shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Pending Balance
              </span>
              <h3 className="text-2xl font-black text-rose-700 tracking-tight font-mono">
                ₹{pendingDues.toLocaleString('en-IN')}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            SEARCH & STATUS FILTER CONTROLS
        ───────────────────────────────────────────────────────────── */}
        <div className="bg-[#FFFDF9] p-4 rounded-2xl border border-[#EAE5DA] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search client by name, card #, phone, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-[#EAE5DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900 placeholder:text-slate-400 font-medium"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-700">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs font-bold bg-white border border-[#EAE5DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-800 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            CLIENT CARDS / TABLE LIST (CLICKABLE FOR 360 WORKSPACE)
        ───────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="bg-[#FFFDF9] p-12 rounded-2xl border border-[#EAE5DA] text-center space-y-3 shadow-xs">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-amber-600" />
            <p className="text-sm font-bold text-slate-700">Loading Clients Directory...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="bg-[#FFFDF9] p-12 rounded-2xl border border-dashed border-amber-300/80 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">No Clients Found</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                Mark any lead as &quot;Booked&quot; in the CRM or click &quot;+ Add New Client&quot; above to create a client workspace.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClients.map((client) => {
              const ext = parseClientExtended(client);
              const isPaidFull = (client.paid_amount || 0) >= (client.total_package_amount || 0) && client.total_package_amount > 0;
              const dueAmount = Math.max(0, (client.total_package_amount || 0) - (client.paid_amount || 0));

              return (
                <motion.div
                  key={client.id}
                  layout
                  onClick={() => router.push(`/workspace/clients/${client.id}`)}
                  className="bg-[#FFFDF9] hover:bg-[#FFFBF2] rounded-2xl border border-[#EAE5DA] hover:border-amber-400/80 p-4 sm:p-5 shadow-2xs transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
                >
                  {/* Left: Client Initials Avatar + Name + Contacts */}
                  <div className="flex items-center gap-4 min-w-[280px]">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black text-sm shrink-0 shadow-2xs group-hover:scale-105 transition-transform border border-amber-300">
                      {client.name ? (client.name.replace(/&/g, ' ').trim().split(/\s+/).filter(Boolean).length === 1 ? client.name.slice(0, 2).toUpperCase() : (client.name.replace(/&/g, ' ').trim().split(/\s+/)[0][0] + client.name.replace(/&/g, ' ').trim().split(/\s+/).slice(-1)[0][0]).toUpperCase()) : 'CL'}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black text-slate-900 group-hover:text-amber-900 transition-colors">
                          {client.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                          {ext.client_code}
                        </span>

                        {/* ⏱️ OVERDUE DAYS COUNTER BADGE */}
                        {(() => {
                          const fin = financeRecordsMap.get(client.id);
                          if (!fin || !Array.isArray(fin.milestones)) return null;
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const todayStr = today.toISOString().split('T')[0];

                          const overdueMilestones = fin.milestones.filter(
                            m => m.due_date && m.due_date < todayStr && m.status !== 'completed' && m.status !== 'paid'
                          );

                          if (overdueMilestones.length === 0) return null;

                          const totalOverdueAmt = overdueMilestones.reduce((s, m) => s + (Number(m.amount) || 0), 0);
                          const maxOverdueDays = overdueMilestones.reduce((max, m) => {
                            const d = new Date(m.due_date!);
                            d.setHours(0, 0, 0, 0);
                            const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
                            return Math.max(max, diff);
                          }, 0);

                          return (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 animate-pulse flex items-center gap-1 shadow-2xs">
                              <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                              <span>⚠️ Due Since <strong>{maxOverdueDays} Days</strong> (₹{totalOverdueAmt.toLocaleString('en-IN')} Overdue)</span>
                            </span>
                          );
                        })()}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                        {client.phone && (
                          <span className="flex items-center gap-1 text-slate-700 font-bold">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {client.phone}
                          </span>
                        )}
                        {client.email && (
                          <span className="flex items-center gap-1 text-slate-500 truncate max-w-[180px]">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {client.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Center: Event Type & Date */}
                  <div className="flex items-center gap-4 text-xs min-w-[200px]">
                    <div className="space-y-1">
                      <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-block">
                        {client.event_type}
                      </span>
                      <p className="flex items-center gap-1 text-slate-600 font-semibold text-[11px]">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {client.event_date ? new Date(client.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Date not set'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Billing Summary & Status */}
                  <div className="flex items-center justify-between lg:justify-end gap-6 ml-auto w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-right space-y-0.5">
                      <span className="font-mono font-black text-sm text-slate-900 block">
                        ₹{(client.total_package_amount || 0).toLocaleString('en-IN')}
                      </span>
                      <p className="text-[11px] font-bold">
                        {isPaidFull ? (
                          <span className="text-emerald-600 font-extrabold flex items-center gap-1 justify-end">
                            <Check className="w-3 h-3" /> Paid in Full
                          </span>
                        ) : (
                          <span className="text-amber-800">
                            Paid: ₹{(client.paid_amount || 0).toLocaleString('en-IN')} • Due: ₹{dueAmount.toLocaleString('en-IN')}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Status Pill */}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${
                      client.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {client.status === 'completed' ? 'Completed' : 'Active'}
                    </span>

                    {/* Open Arrow */}
                    <div className="w-8 h-8 rounded-xl bg-amber-50 group-hover:bg-amber-400 text-amber-800 group-hover:text-slate-900 flex items-center justify-center transition-all shadow-2xs">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODALS
      ───────────────────────────────────────────────────────────── */}
      <ExcelMigrationModal
        isOpen={isExcelMigrationModalOpen}
        onClose={() => setIsExcelMigrationModalOpen(false)}
        workspaceId={currentWorkspaceId || (typeof window !== 'undefined' ? (sessionStorage.getItem('workspace_id') || '00000000-0000-0000-0000-000000000000') : '00000000-0000-0000-0000-000000000000')}
        onSuccess={async () => {
          await fetchClientsAndSyncBookedLeads();
        }}
      />

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-[#EAE5DA] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto font-sans"
          >
            <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Add New Client Account</h3>
                  <p className="text-xs text-slate-500 font-medium">Create client workspace & sync billing</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4 text-xs">
              {/* Optional CRM Lead Link */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Convert Existing CRM Lead (Optional)
                </label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => handleLeadSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#EAE5DA] rounded-xl text-slate-800 font-semibold focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Select a Lead from CRM to Auto-Fill --</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name} • {lead.phone} • {lead.event_type || 'Event'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Client / Couple Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul & Sneha"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-[#EAE5DA] rounded-xl text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-[#EAE5DA] rounded-xl text-slate-900 font-mono font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="client@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-[#EAE5DA] rounded-xl text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Event Date</label>
                  <input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-[#EAE5DA] rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>
              </div>

              {/* Event Type Searchable Dropdown */}
              <div className="relative" ref={eventTypeDropdownRef}>
                <label className="font-bold text-slate-700 block mb-1">Event Category / Type</label>
                <div
                  onClick={() => setIsEventTypeDropdownOpen(prev => !prev)}
                  className="w-full px-3 py-2 bg-white border border-[#EAE5DA] rounded-xl text-slate-900 font-bold flex items-center justify-between cursor-pointer"
                >
                  <span>{formData.event_type}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>

                {isEventTypeDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-[#EAE5DA] rounded-2xl shadow-xl z-20 p-2 space-y-2">
                    <input
                      type="text"
                      placeholder="Search event type..."
                      value={eventTypeSearch}
                      onChange={(e) => setEventTypeSearch(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      autoFocus
                    />
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {filteredEventTypes.map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, event_type: type }));
                            setIsEventTypeDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-amber-50 hover:text-amber-900 rounded-lg flex items-center justify-between"
                        >
                          <span>{type}</span>
                          {formData.event_type === type && <Check className="w-3.5 h-3.5 text-amber-700" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Pricing & Advance Details */}
              <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200/70 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Total Package (₹)</label>
                    <input
                      type="number"
                      placeholder="150000"
                      value={formData.total_package_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_package_amount: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Advance Token (₹)</label>
                    <input
                      type="number"
                      placeholder="25000"
                      value={formData.advance_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, advance_amount: e.target.value, is_advance_received: true }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.is_advance_received}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_advance_received: e.target.checked }))}
                      className="rounded text-amber-600"
                    />
                    <span>Advance Token Received</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-emerald-800">
                    <input
                      type="checkbox"
                      checked={formData.is_full_payment_received}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_full_payment_received: e.target.checked }))}
                      className="rounded text-emerald-600"
                    />
                    <span>100% Full Payment Paid</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE5DA]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white font-black rounded-xl shadow-xs hover:brightness-105"
                >
                  {isSubmitting ? 'Creating...' : 'Create Client Workspace'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
