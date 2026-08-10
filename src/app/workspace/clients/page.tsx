'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, Search, Filter, Plus, DollarSign, Calendar, Phone, Mail, 
  Film, Edit3, Trash2, CheckCircle2, Clock, AlertCircle, ArrowRight, X, 
  Sparkles, Check, ChevronRight, RefreshCw, FolderPlus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/sidebar-layout';
import type { WorkspaceClient, Lead } from '@/types';

// Demo initial fallback clients if DB table is empty
const INITIAL_CLIENTS: WorkspaceClient[] = [
  {
    id: 'client_1',
    workspace_id: 'ws_demo',
    name: 'Vinu Bhad & Neha',
    phone: '+919876543210',
    email: 'vinu.wedding@gmail.com',
    event_type: 'Wedding & Reception',
    event_date: '2026-11-18',
    total_package_amount: 250000,
    paid_amount: 150000,
    status: 'active',
    notes: 'Premium 3-day wedding package. Teaser + Full Film + 2 Albums.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'client_2',
    workspace_id: 'ws_demo',
    name: 'Mohit Agarwal & Riya',
    phone: '+919812345678',
    email: 'mohit.agarwal@outlook.com',
    event_type: 'Pre-Wedding Shoot',
    event_date: '2026-09-05',
    total_package_amount: 75000,
    paid_amount: 75000,
    status: 'active',
    notes: 'Udaipur location shoot. Cinematic Reels + 4K Teaser.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'client_3',
    workspace_id: 'ws_demo',
    name: 'Pratik Oswal',
    phone: '+919922334455',
    email: 'pratik.oswal@gmail.com',
    event_type: 'Destination Wedding',
    event_date: '2026-12-02',
    total_package_amount: 400000,
    paid_amount: 200000,
    status: 'active',
    notes: 'Goa Destination Wedding. 5 Crew members assigned.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'client_4',
    workspace_id: 'ws_demo',
    name: 'Ashwathi Menon',
    phone: '+919711223344',
    email: 'ashwathi.m@yahoo.com',
    event_type: 'Engagement & Sangeet',
    event_date: '2026-06-15',
    total_package_amount: 120000,
    paid_amount: 120000,
    status: 'completed',
    notes: 'All deliverables handed over. Client gave 5-star review.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<WorkspaceClient[]>(INITIAL_CLIENTS);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'archived'>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    event_type: 'Wedding',
    event_date: '',
    total_package_amount: '',
    paid_amount: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch clients & converted leads from Supabase
  useEffect(() => {
    fetchClientsAndLeads();
  }, []);

  const fetchClientsAndLeads = async () => {
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

      const { data: clientData, error: clientErr } = await clientQuery;

      if (!clientErr && clientData && clientData.length > 0) {
        setClients(clientData);
      } else {
        setClients([]);
      }

      // 3. Fetch leads for "Convert Lead" option
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (leadsData) {
        setLeads(leadsData);
      }
    } catch (e) {
      console.error('Error fetching clients:', e);
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill form when lead is selected
  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    if (!leadId) return;

    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setFormData(prev => ({
        ...prev,
        name: lead.name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        event_date: (lead as any).event_date || (lead.raw_payload as any)?.event_date || '',
        notes: `Converted from Lead ID: ${lead.id}. Source: ${lead.source || 'CRM'}`,
      }));
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert('Please enter Client Name and Phone number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      const newClientData = {
        workspace_id: workspaceId,
        lead_id: selectedLeadId || null,
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        event_type: formData.event_type || 'Wedding',
        event_date: formData.event_date || null,
        total_package_amount: Number(formData.total_package_amount) || 0,
        paid_amount: Number(formData.paid_amount) || 0,
        status: 'active' as const,
        notes: formData.notes || null,
      };

      const { data: inserted, error } = await supabase
        .from('workspace_clients')
        .insert(newClientData)
        .select()
        .single();

      if (error) {
        // Local state fallback if table not yet migrated
        const fallbackClient: WorkspaceClient = {
          id: `client_${Date.now()}`,
          ...newClientData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setClients(prev => [fallbackClient, ...prev]);
      } else if (inserted) {
        setClients(prev => [inserted, ...prev]);

        // Auto-create Post-Production Project for this client
        const defaultDeliverables = [
          {
            id: `deliv_photo_1_${Date.now()}`,
            title: 'Edited Photos',
            category: 'photos',
            count: '500 Photos',
            assigned_to: 'Vikram (Photo Retoucher)',
            deadline: formData.event_date ? new Date(new Date(formData.event_date).getTime() + 15 * 86400000).toISOString().split('T')[0] : '',
            status: 'pending',
            drive_link: '',
            comments: []
          },
          {
            id: `deliv_photo_2_${Date.now()}`,
            title: 'Save the Date Photo',
            category: 'photos',
            count: '5 Photos',
            assigned_to: 'Vikram (Photo Retoucher)',
            deadline: formData.event_date ? new Date(new Date(formData.event_date).getTime() - 10 * 86400000).toISOString().split('T')[0] : '',
            status: 'pending',
            drive_link: '',
            comments: []
          },
          {
            id: `deliv_photo_3_${Date.now()}`,
            title: 'Instagram Posts',
            category: 'photos',
            count: '10 Posts',
            assigned_to: 'Vikram (Photo Retoucher)',
            deadline: formData.event_date ? new Date(new Date(formData.event_date).getTime() + 5 * 86400000).toISOString().split('T')[0] : '',
            status: 'pending',
            drive_link: '',
            comments: []
          },
          {
            id: `deliv_video_1_${Date.now()}`,
            title: 'Cinematic Film',
            category: 'videos',
            count: '25 Mins',
            assigned_to: 'Amit (Senior Video Editor)',
            deadline: formData.event_date ? new Date(new Date(formData.event_date).getTime() + 30 * 86400000).toISOString().split('T')[0] : '',
            status: 'pending',
            drive_link: '',
            comments: []
          },
          {
            id: `deliv_video_2_${Date.now()}`,
            title: 'Cinematic Teaser',
            category: 'videos',
            count: '1 Min',
            assigned_to: 'Rahul (Teaser Specialist)',
            deadline: formData.event_date ? new Date(new Date(formData.event_date).getTime() + 7 * 86400000).toISOString().split('T')[0] : '',
            status: 'in_progress',
            drive_link: '',
            comments: []
          },
          {
            id: `deliv_video_3_${Date.now()}`,
            title: 'Traditional Full Video',
            category: 'videos',
            count: '2 Hours',
            assigned_to: 'Suresh (Traditional Editor)',
            deadline: formData.event_date ? new Date(new Date(formData.event_date).getTime() + 45 * 86400000).toISOString().split('T')[0] : '',
            status: 'pending',
            drive_link: '',
            comments: []
          },
          {
            id: `deliv_video_4_${Date.now()}`,
            title: 'Viral Instagram Reels',
            category: 'videos',
            count: '3 Reels',
            assigned_to: 'Priya (Reels Specialist)',
            deadline: formData.event_date ? new Date(new Date(formData.event_date).getTime() + 10 * 86400000).toISOString().split('T')[0] : '',
            status: 'pending',
            drive_link: '',
            comments: []
          },
          {
            id: `deliv_album_1_${Date.now()}`,
            title: 'Main Wedding Album',
            category: 'albums',
            count: '40 Pages',
            assigned_to: 'Rohan (Album Designer)',
            deadline: formData.event_date ? new Date(new Date(formData.event_date).getTime() + 60 * 86400000).toISOString().split('T')[0] : '',
            status: 'pending',
            drive_link: '',
            comments: []
          },
          {
            id: `deliv_album_2_${Date.now()}`,
            title: 'Parent / Mini Album',
            category: 'albums',
            count: '20 Pages',
            assigned_to: 'Rohan (Album Designer)',
            deadline: formData.event_date ? new Date(new Date(formData.event_date).getTime() + 60 * 86400000).toISOString().split('T')[0] : '',
            status: 'pending',
            drive_link: '',
            comments: []
          }
        ];

        try {
          await supabase
            .from('post_production_projects')
            .insert([{
              user_id: workspaceId,
              workspace_id: workspaceId,
              client_id: inserted.id,
              project_manager_name: 'Sushant (Lead Manager)',
              overall_status: 'active',
              deliverables: defaultDeliverables
            }]);
        } catch (_) {}
      }

      // If converted from a lead, automatically update CRM Lead stage to "Booked"
      if (selectedLeadId) {
        try {
          await supabase
            .from('leads')
            .update({
              stage_id: 'booked',
              status: 'Booked',
              client_id: inserted?.id || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedLeadId);
          console.log('[ClientsPage] CRM lead stage auto-updated to Booked for lead:', selectedLeadId);
        } catch (leadErr) {
          console.error('[ClientsPage] Error updating lead stage to Booked:', leadErr);
        }
      }

      // Reset form & close modal
      setFormData({
        name: '', phone: '', email: '', event_type: 'Wedding',
        event_date: '', total_package_amount: '', paid_amount: '', notes: ''
      });
      setSelectedLeadId('');
      setShowAddModal(false);
    } catch (err) {
      console.error('Error creating client:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick payment recorder
  const handleAddPayment = async (clientId: string, currentPaid: number, total: number) => {
    const amountStr = prompt(`Enter payment amount received (Total Package: ₹${total.toLocaleString('en-IN')}, Paid: ₹${currentPaid.toLocaleString('en-IN')}):`);
    if (!amountStr) return;
    const addedAmount = Number(amountStr);
    if (isNaN(addedAmount) || addedAmount <= 0) return;

    const newPaid = currentPaid + addedAmount;

    try {
      await supabase
        .from('workspace_clients')
        .update({ paid_amount: newPaid, updated_at: new Date().toISOString() })
        .eq('id', clientId);

      setClients(prev => prev.map(c => c.id === clientId ? { ...c, paid_amount: newPaid } : c));
    } catch (e) {
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, paid_amount: newPaid } : c));
    }
  };

  // Filter clients
  const filteredClients = clients.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.event_type.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesType = eventTypeFilter === 'all' || c.event_type.toLowerCase().includes(eventTypeFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesType;
  });

  // Calculate Metrics
  const totalRevenue = clients.reduce((acc, c) => acc + (Number(c.total_package_amount) || 0), 0);
  const totalPaid = clients.reduce((acc, c) => acc + (Number(c.paid_amount) || 0), 0);
  const totalPending = totalRevenue - totalPaid;
  const activeCount = clients.filter(c => c.status === 'active').length;

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-[#F8F9FD] dark:bg-[#070708] text-zinc-900 dark:text-zinc-100 p-4 sm:p-6 lg:p-8">
        
        {/* Top Header & Quick Actions */}
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900/60 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm backdrop-blur-md">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
                  <Users className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">Clients Directory</h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  {clients.length} Clients
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Manage converted wedding studio clients, billing packages, and jump directly to post-production deliverables tracking.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link
                href="/workspace/post-production"
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs transition-all flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-700"
              >
                <Film className="w-4 h-4 text-pink-500" />
                <span>Post-Production Board</span>
              </Link>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add New Client</span>
              </button>
            </div>
          </div>

          {/* Metric Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Total Booked Packages</p>
                <h3 className="text-xl font-black text-zinc-900 dark:text-white mt-1">₹{totalRevenue.toLocaleString('en-IN')}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Total Payments Received</p>
                <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{totalPaid.toLocaleString('en-IN')}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Balance Receivable</p>
                <h3 className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">₹{totalPending.toLocaleString('en-IN')}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Active Clients</p>
                <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{activeCount} Active</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-zinc-900/60 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by client name, phone, email, event..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-white"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Filter className="w-3.5 h-3.5" />
                <span className="font-semibold hidden sm:inline">Status:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="select-sheets text-xs font-semibold"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active (🟢)</option>
                <option value="completed">Completed (🔵)</option>
                <option value="archived">Archived (⚪)</option>
              </select>

              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="select-sheets text-xs font-semibold"
              >
                <option value="all">All Events</option>
                <option value="wedding">Wedding</option>
                <option value="pre-wedding">Pre-Wedding</option>
                <option value="reception">Reception</option>
                <option value="destination">Destination</option>
              </select>

              <button
                onClick={fetchClientsAndLeads}
                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors"
                title="Refresh client list"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Client Table Grid */}
          <div className="bg-white dark:bg-zinc-900/60 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-800 dark:text-zinc-200 border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider font-extrabold text-zinc-400">
                    <th className="py-4 px-6">Client Name</th>
                    <th className="py-4 px-6">Contact Info</th>
                    <th className="py-4 px-6">Event Type & Date</th>
                    <th className="py-4 px-6">Billing Package</th>
                    <th className="py-4 px-6">Paid & Remaining</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-medium">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-zinc-400">
                        <Users className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                        <p className="font-bold text-sm">No clients match your filter criteria</p>
                        <button
                          onClick={() => setShowAddModal(true)}
                          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add First Client
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((client) => {
                      const totalPkg = Number(client.total_package_amount) || 0;
                      const paidPkg = Number(client.paid_amount) || 0;
                      const pendingPkg = totalPkg - paidPkg;
                      const isFullyPaid = pendingPkg <= 0;

                      return (
                        <tr key={client.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors">
                          <td className="py-4 px-6">
                            <div className="font-bold text-zinc-900 dark:text-white text-sm">
                              {client.name}
                            </div>
                            {client.notes && (
                              <p className="text-[10px] text-zinc-400 truncate max-w-xs mt-0.5">
                                {client.notes}
                              </p>
                            )}
                          </td>

                          <td className="py-4 px-6 space-y-1">
                            <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-mono font-semibold">
                              <Phone className="w-3 h-3 text-indigo-500" />
                              <span>{client.phone}</span>
                            </div>
                            {client.email && (
                              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                                <Mail className="w-3 h-3 text-purple-400" />
                                <span>{client.email}</span>
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-6">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold text-xs border border-indigo-200 dark:border-indigo-800">
                              <span>{client.event_type}</span>
                            </div>
                            {client.event_date && (
                              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-1 font-mono">
                                <Calendar className="w-3 h-3 text-amber-500" />
                                <span>{new Date(client.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-6 font-bold text-sm font-mono text-zinc-900 dark:text-white">
                            ₹{totalPkg.toLocaleString('en-IN')}
                          </td>

                          <td className="py-4 px-6 space-y-1">
                            <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                              Paid: ₹{paidPkg.toLocaleString('en-IN')}
                            </div>
                            {isFullyPaid ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                Paid in Full ✓
                              </span>
                            ) : (
                              <div className="text-[11px] font-bold font-mono text-amber-600 dark:text-amber-400">
                                Due: ₹{pendingPkg.toLocaleString('en-IN')}
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-6">
                            {client.status === 'active' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                              </span>
                            )}
                            {client.status === 'completed' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                Completed ✓
                              </span>
                            )}
                            {client.status === 'archived' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                Archived
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-6 text-right space-x-2">
                            <button
                              onClick={() => handleAddPayment(client.id, paidPkg, totalPkg)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800 transition-colors"
                              title="Record Payment Deposit"
                            >
                              + Payment
                            </button>

                            <Link
                              href={`/workspace/post-production?client_id=${client.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:hover:bg-pink-900/60 dark:text-pink-300 font-bold text-[11px] border border-pink-200 dark:border-pink-800 transition-colors"
                            >
                              <Film className="w-3 h-3 text-pink-500" />
                              <span>Track Post-Prod</span>
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Add New Client Slide-Over Modal ── */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                className="w-full max-w-lg bg-white dark:bg-[#121824] rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-zinc-900 dark:text-white">Add New Studio Client</h2>
                      <p className="text-xs text-zinc-500">Convert an existing CRM lead or enter manually.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateClient} className="space-y-4 text-xs">
                  {/* Lead Conversion Select */}
                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Convert Existing CRM Lead (Optional)
                    </label>
                    <select
                      value={selectedLeadId}
                      onChange={(e) => handleLeadSelect(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white font-medium"
                    >
                      <option value="">-- Select a converted lead or enter manually --</option>
                      {leads.map(lead => (
                        <option key={lead.id} value={lead.id}>
                          {lead.name || 'Unnamed Lead'} ({lead.phone}) - {lead.status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Client Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Vinu & Neha"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="+91 9876543210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="client@gmail.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Event Type
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Destination Wedding"
                        value={formData.event_type}
                        onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Event Date
                      </label>
                      <input
                        type="date"
                        value={formData.event_date}
                        onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Total Package (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="250000"
                        value={formData.total_package_amount}
                        onChange={(e) => setFormData({ ...formData, total_package_amount: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Deposit Paid (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="100000"
                        value={formData.paid_amount}
                        onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Package & Project Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Special requirements, album pages count, shoot dates..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white font-medium resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving Client...' : 'Create Client'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </SidebarLayout>
  );
}
