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
import type { WorkspaceClient, Lead, ClientFinanceRecord } from '@/types';

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
      const existingClientPhones = new Set(existingClientList.map(c => c.phone?.replace(/[^0-9]/g, '')).filter(Boolean));

      const newClientsToInsert: any[] = [];

      for (let i = 0; i < bookedLeads.length; i++) {
        const lead = bookedLeads[i];
        const cleanLeadPhone = lead.phone ? lead.phone.replace(/[^0-9]/g, '') : '';

        // Skip if already in clients list
        if (existingLeadIds.has(lead.id) || (cleanLeadPhone && existingClientPhones.has(cleanLeadPhone))) {
          continue;
        }

        const raw = lead.raw_payload || {};
        const clientName = lead.name || (raw.groom_name && raw.bride_name ? `${raw.groom_name} & ${raw.bride_name}` : raw.groom_name || raw.bride_name || 'Booked Client');
        const clientPhone = lead.phone || raw.phone || '';
        const clientEmail = lead.email || raw.email || null;
        const eventType = raw.shoot_type || raw.event_type || raw.service || 'Wedding Photography';
        
        let parsedDate: string | null = null;
        if (raw.event_date || raw.wedding_date || raw.date) {
          const d = new Date(raw.event_date || raw.wedding_date || raw.date);
          if (!isNaN(d.getTime())) parsedDate = d.toISOString().split('T')[0];
        }

        let pkgAmt = 0;
        if (raw.budget || raw.package_amount || raw.amount) {
          const num = parseFloat(String(raw.budget || raw.package_amount || raw.amount).replace(/[^0-9.]/g, ''));
          if (num > 0) pkgAmt = num;
        }

        // Generate unique client code & portal token
        const uniqueNumber = String(existingClientList.length + newClientsToInsert.length + 1).padStart(3, '0');
        const clientCode = `CL-2026-${uniqueNumber}`;
        const portalPin = clientPhone ? clientPhone.replace(/[^0-9]/g, '').slice(-4) || '1234' : '1234';
        const portalToken = `portal_${Date.now()}_${Math.random().toString(36).substring(5)}`;

        const serializedNotes = serializeClientExtended({
          client_code: clientCode,
          portal_token: portalToken,
          portal_pin: portalPin,
          plain_notes: raw.notes || '',
          events: [
            {
              id: `ev_init_1`,
              name: eventType,
              date: parsedDate || new Date().toISOString().split('T')[0],
              time_start: '05:00 PM',
              time_end: '11:00 PM',
              venue: raw.location || raw.city || 'Main Venue',
              city: raw.city || 'Mumbai',
              assigned_crew: '2 Photographers, 2 Cinematographers'
            }
          ]
        });

        const newClientRecord = {
          user_id: workspaceId,
          workspace_id: workspaceId,
          lead_id: lead.id,
          name: clientName,
          phone: clientPhone,
          email: clientEmail,
          event_type: eventType,
          event_date: parsedDate,
          total_package_amount: pkgAmt || 155000,
          paid_amount: 0,
          status: 'active',
          notes: serializedNotes
        };

        newClientsToInsert.push(newClientRecord);
      }

      // If new booked leads need insertion in Supabase
      if (newClientsToInsert.length > 0 && workspaceId !== 'ws_demo') {
        const { data: insertedData, error: insErr } = await supabase
          .from('workspace_clients')
          .insert(newClientsToInsert)
          .select('*');

        if (!insErr && insertedData) {
          existingClientList = [...insertedData, ...existingClientList];
        }
      }

      // 5. Fetch custom event types from Supabase
      try {
        let evQuery = supabase.from('event_types').select('name').order('created_at', { ascending: true });
        if (workspaceId && workspaceId !== 'ws_demo') {
          evQuery = evQuery.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
        }
        const { data: customEvents } = await evQuery;
        if (customEvents && customEvents.length > 0) {
          const merged = Array.from(new Set([...DEFAULT_EVENT_TYPES, ...customEvents.map(e => e.name)]));
          setEventTypes(merged);
        }
      } catch (_) {}

      setClients(existingClientList);
    } catch (e) {
      console.error('Error fetching clients and syncing leads:', e);
    } finally {
      setLoading(false);
    }
  };

  // Register Custom Event Type
  const handleAddNewEventType = async () => {
    const trimmed = newCustomEventType.trim();
    if (!trimmed) return;

    if (!eventTypes.includes(trimmed)) {
      const updated = [trimmed, ...eventTypes];
      setEventTypes(updated);
      setFormData(prev => ({ ...prev, event_type: trimmed }));

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const workspaceId = session?.user?.id || 'ws_demo';
        if (workspaceId !== 'ws_demo') {
          await supabase.from('event_types').insert([{
            workspace_id: workspaceId,
            user_id: workspaceId,
            name: trimmed,
            color: '#f59e0b',
            is_default: false
          }]);
        }
      } catch (err) {
        console.warn('Error saving custom event type:', err);
      }
    } else {
      setFormData(prev => ({ ...prev, event_type: trimmed }));
    }

    setNewCustomEventType('');
    setShowCustomEventInput(false);
    setIsEventTypeDropdownOpen(false);
  };

  // Convert Lead / Manual Fill
  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    if (!leadId) return;

    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      const raw = lead.raw_payload || {};
      const coupleName = lead.name || (raw.groom_name && raw.bride_name ? `${raw.groom_name} & ${raw.bride_name}` : raw.groom_name || '');
      
      let parsedDate = '';
      if (raw.event_date || raw.wedding_date || raw.date) {
        const d = new Date(raw.event_date || raw.wedding_date || raw.date);
        if (!isNaN(d.getTime())) parsedDate = d.toISOString().split('T')[0];
      }

      let parsedBudget = '';
      if (raw.budget || raw.package_amount || raw.amount) {
        const num = parseFloat(String(raw.budget || raw.package_amount || raw.amount).replace(/[^0-9.]/g, ''));
        if (num > 0) parsedBudget = String(num);
      }

      const evType = raw.shoot_type || raw.event_type || 'Wedding Photography';
      if (!eventTypes.includes(evType)) {
        setEventTypes(prev => [evType, ...prev]);
      }

      setFormData(prev => ({
        ...prev,
        name: coupleName,
        phone: lead.phone || raw.phone || '',
        email: lead.email || raw.email || '',
        event_type: evType,
        event_date: parsedDate,
        total_package_amount: parsedBudget,
      }));
    }
  };

  // Handle Add New Client Form Submit
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert('Please fill in Client Name and Contact Phone.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      const uniqueNumber = String(clients.length + 1).padStart(3, '0');
      const clientCode = `CL-2026-${uniqueNumber}`;
      const portalPin = formData.phone.replace(/[^0-9]/g, '').slice(-4) || '1234';
      const portalToken = `portal_${Date.now()}_${Math.random().toString(36).substring(5)}`;

      const totalPackage = parseFloat(formData.total_package_amount) || 0;
      const advanceAmt = parseFloat(formData.advance_amount) || 0;

      let finalPaidAmount = 0;
      if (formData.is_full_payment_received && totalPackage > 0) {
        finalPaidAmount = totalPackage;
      } else if (formData.is_advance_received && advanceAmt > 0) {
        finalPaidAmount = advanceAmt;
      }

      // Generate milestones strictly adhering to Zero Dummy Data rule
      let initialMilestones: any[] = [];
      const paymentDate = formData.payment_date || new Date().toISOString().split('T')[0];

      if (formData.is_full_payment_received && totalPackage > 0) {
        initialMilestones = [
          {
            id: `m_full_${Date.now()}`,
            step_name: 'Full Payment',
            title: 'Full Payment',
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
            id: `m_adv_${Date.now()}`,
            step_name: 'Advance Booking',
            title: 'Advance Booking',
            due_date: paymentDate,
            paid_date: formData.is_advance_received ? paymentDate : null,
            amount: advanceAmt,
            status: formData.is_advance_received ? 'completed' : 'pending',
            payment_mode: formData.payment_mode || 'UPI'
          }
        ];
      } else {
        // Zero advance/token provided -> EMPTY array, ZERO dummy rows!
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
        // 1. Sync Finance Record with 0 Dummy Rows
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

        // 2. If Payment was recorded, log into finance_audit_logs
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
          } catch (auditErr) {
            console.warn('Finance audit log notice:', auditErr);
          }
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
          notes: ''
        });
        setSelectedLeadId('');

        // Open newly created client page
        router.push(`/workspace/clients/${newClient.id}`);
      }
    } catch (e: any) {
      console.error('Error creating client:', e);
      alert(`Error creating client: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered clients list
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const q = searchQuery.toLowerCase();
      const ext = parseClientExtended(c);
      const matchesSearch = 
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        c.event_type.toLowerCase().includes(q) ||
        ext.client_code.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesEvent = eventTypeFilter === 'all' || c.event_type === eventTypeFilter;

      return matchesSearch && matchesStatus && matchesEvent;
    });
  }, [clients, searchQuery, statusFilter, eventTypeFilter]);

  // Overall Financial Statistics
  const totalBookedAmount = clients.reduce((sum, c) => sum + (Number(c.total_package_amount) || 0), 0);
  const totalPaidAmount = clients.reduce((sum, c) => sum + (Number(c.paid_amount) || 0), 0);
  const totalBalanceDue = Math.max(0, totalBookedAmount - totalPaidAmount);
  const activeClientsCount = clients.filter(c => c.status === 'active').length;

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-900 pb-20 pt-2 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ─────────────────────────────────────────────────────────────
            TOP HEADER (LUXURY CREAMY & LIGHT YELLOW)
        ───────────────────────────────────────────────────────────── */}
        <div className="bg-[#FFFDF9] rounded-2xl p-6 border border-[#EAE5DA] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 flex items-center justify-center shadow-md text-white font-bold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Clients Directory</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200">
                  {clients.length} Clients
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">
                Client 360 Workspace: Profiles, Quotations, Multi-Day Events, Post-Production & Finance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchClientsAndSyncBookedLeads}
              className="p-2.5 text-slate-600 hover:text-slate-900 bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200/80 rounded-xl transition shadow-2xs cursor-pointer"
              title="Refresh & Auto-Sync Booked Leads"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              + Add New Client
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            METRICS DASHBOARD (LUXURY CREAMY & WARM GOLD CARDS)
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#EAE5DA] shadow-xs flex items-center justify-between hover:border-amber-300/80 transition-all">
            <div>
              <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Booked Packages</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">
                ₹{totalBookedAmount.toLocaleString('en-IN')}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
              ₹
            </div>
          </div>

          <div className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#EAE5DA] shadow-xs flex items-center justify-between hover:border-amber-300/80 transition-all">
            <div>
              <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Payments Received</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                ₹{totalPaidAmount.toLocaleString('en-IN')}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#EAE5DA] shadow-xs flex items-center justify-between hover:border-amber-300/80 transition-all">
            <div>
              <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Balance Receivable</p>
              <h3 className="text-2xl font-black text-amber-800 mt-1 font-mono">
                ₹{totalBalanceDue.toLocaleString('en-IN')}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#EAE5DA] shadow-xs flex items-center justify-between hover:border-amber-300/80 transition-all">
            <div>
              <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Active Clients</p>
              <h3 className="text-2xl font-black text-blue-600 mt-1 font-mono">
                {activeClientsCount} <span className="text-xs font-bold text-slate-500">Active</span>
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
              <Users className="w-5 h-5" />
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
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                </motion.div>
              );
            })}
          </div>
        )}

      </div>

      {/* ─────────────────────────────────────────────────────────────
          CLIENT 360 WORKSPACE WINDOW (FULL FEATURED MODAL)
      ───────────────────────────────────────────────────────────── */}
      {selectedClient && (
        <ClientInsiderModal
          isOpen={!!selectedClient}
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onClientUpdate={(updated) => {
            setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
            setSelectedClient(updated);
          }}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD NEW CLIENT (WITH BOOKED LEADS CONVERT DROPDOWN)
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        <ExcelMigrationModal
        isOpen={isExcelMigrationModalOpen}
        onClose={() => setIsExcelMigrationModalOpen(false)}
        workspaceId={typeof window !== 'undefined' ? (sessionStorage.getItem('workspace_id') || 'ws_demo') : 'ws_demo'}
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
              className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-[#EAE5DA] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Add New Wedding Client</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Auto-populates unique client card & public portal link</p>
                  </div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateClient} className="space-y-3.5 text-xs">
                {/* Convert Booked Lead Dropdown */}
                {leads.length > 0 && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                    <label className="font-black text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      Quick Convert Existing Lead:
                    </label>
                    <select
                      value={selectedLeadId}
                      onChange={(e) => handleLeadSelect(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="">-- Or Create Blank Client Manually --</option>
                      {leads.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name || 'Unnamed Lead'} ({l.phone || 'No phone'}) - Stage: {l.status || 'New'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Client / Couple Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vinu Bhad & Neha"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Email ID</label>
                    <input
                      type="email"
                      placeholder="client@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                {/* Event Type & Main Event Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Searchable Event Type Dropdown */}
                  <div className="relative" ref={eventTypeDropdownRef}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700 block">Event Type</label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomEventInput(prev => !prev);
                          setIsEventTypeDropdownOpen(true);
                        }}
                        className="text-[10px] font-black text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" /> Add Category
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsEventTypeDropdownOpen(prev => !prev)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-900 flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    >
                      <span className="truncate">{formData.event_type || 'Select Event Type'}</span>
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                    </button>

                    {/* Event Type Dropdown Panel */}
                    <AnimatePresence>
                      {isEventTypeDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-[#EAE5DA] rounded-2xl shadow-xl p-2.5 space-y-2 max-h-60 overflow-y-auto"
                        >
                          {/* Search Filter Input inside Dropdown */}
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                            <input
                              type="text"
                              placeholder="Search or filter event types..."
                              value={eventTypeSearch}
                              onChange={(e) => setEventTypeSearch(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          {/* Top Action Item: Inline Custom Add */}
                          {showCustomEventInput ? (
                            <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 space-y-1.5">
                              <label className="text-[10px] font-black text-amber-900 uppercase">Add New Category:</label>
                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  placeholder="e.g. Maternity Shoot, Fashion Editorial"
                                  value={newCustomEventType}
                                  onChange={(e) => setNewCustomEventType(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={handleAddNewEventType}
                                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 font-black text-white text-xs rounded-lg shadow-xs shrink-0"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowCustomEventInput(true)}
                              className="w-full text-left px-2.5 py-1.5 text-xs font-black text-amber-700 hover:bg-amber-50 rounded-lg flex items-center gap-1.5 transition-colors border border-dashed border-amber-300"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Add New Event Type</span>
                            </button>
                          )}

                          {/* Filtered Event Types List */}
                          <div className="space-y-0.5 pt-1 border-t border-slate-100">
                            {eventTypes
                              .filter(t => t.toLowerCase().includes(eventTypeSearch.toLowerCase()))
                              .map(type => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, event_type: type }));
                                    setIsEventTypeDropdownOpen(false);
                                    setEventTypeSearch('');
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 text-xs font-bold rounded-lg flex items-center justify-between transition-colors ${
                                    formData.event_type === type
                                      ? 'bg-amber-100 text-amber-900 font-black'
                                      : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <span>{type}</span>
                                  {formData.event_type === type && <Check className="w-3.5 h-3.5 text-amber-800" />}
                                </button>
                              ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Main Event Date */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Main Event Date</label>
                    <input
                      type="date"
                      value={formData.event_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                {/* ─── DYNAMIC PRICING & PAYMENT CONFIGURATION ─── */}
                <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-3">
                  {/* Total Package & Full Payment Toggle */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-800">Total Package (₹)</label>
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formData.is_full_payment_received}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFormData(prev => ({
                              ...prev,
                              is_full_payment_received: checked,
                              is_advance_received: false,
                              advance_amount: checked ? '' : prev.advance_amount
                            }));
                          }}
                          className="w-3.5 h-3.5 text-amber-600 rounded-md border-amber-300 focus:ring-amber-500 cursor-pointer"
                        />
                        <span className="text-[11px] font-extrabold text-amber-900">Full Payment Received</span>
                      </label>
                    </div>

                    <div className="relative">
                      <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="number"
                        placeholder="150000"
                        value={formData.total_package_amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, total_package_amount: e.target.value }))}
                        className="w-full pl-8 pr-3.5 py-2 bg-white border border-[#EAE5DA] rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>

                  {/* Token / Advance Payment Row (Only if NOT full payment) */}
                  {!formData.is_full_payment_received ? (
                    <div className="pt-2 border-t border-amber-200/60 space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-bold text-slate-800 text-[11px]">Token / Advance Amount (₹)</label>
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={formData.is_advance_received}
                                onChange={(e) => setFormData(prev => ({ ...prev, is_advance_received: e.target.checked }))}
                                className="w-3.5 h-3.5 text-amber-600 rounded-md border-amber-300 focus:ring-amber-500 cursor-pointer"
                              />
                              <span className="text-[10px] font-extrabold text-amber-900">Advance Received</span>
                            </label>
                          </div>
                          <input
                            type="number"
                            placeholder="e.g. 25000"
                            value={formData.advance_amount}
                            onChange={(e) => setFormData(prev => ({ ...prev, advance_amount: e.target.value }))}
                            className="w-full px-3 py-2 bg-white border border-[#EAE5DA] rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-800 text-[11px] block mb-1">
                            Payment Date <span className="text-slate-400 font-normal">(for Token / Advance)</span>
                          </label>
                          <input
                            type="date"
                            value={formData.payment_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                            className="w-full px-3 py-2 bg-white border border-[#EAE5DA] rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-xs"
                          />
                        </div>
                      </div>

                      {/* Payment Mode Selector */}
                      <div>
                        <label className="font-bold text-slate-700 text-[11px] block mb-1">Payment Mode</label>
                        <select
                          value={formData.payment_mode}
                          onChange={(e) => setFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
                          className="w-full px-3 py-1.5 bg-white border border-[#EAE5DA] rounded-xl font-bold text-slate-800 text-xs focus:outline-none"
                        >
                          <option value="UPI">UPI / GooglePay / PhonePe</option>
                          <option value="Bank Transfer">Bank Transfer (NEFT / IMPS)</option>
                          <option value="Cash">Cash</option>
                          <option value="Card">Credit / Debit Card</option>
                          <option value="Cheque">Cheque</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>100% Full Payment of ₹{Number(formData.total_package_amount || 0).toLocaleString('en-IN')} will be marked as Received.</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">WhatsApp Group Link (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://chat.whatsapp.com/..."
                    value={formData.whatsapp_group_link}
                    onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_group_link: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#EAE5DA] rounded-xl font-mono text-xs text-slate-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#EAE5DA]">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-amber-400 hover:bg-amber-500 font-black text-slate-900 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create Client Space
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
