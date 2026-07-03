'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, RefreshCw, Settings, Search, Plus, Trash2, X, Check, 
  MoreVertical, Mail, Phone, User, ShieldCheck, MapPin, DollarSign, Calendar, Sparkles, Filter
} from 'lucide-react';
import { Lead } from '@/types';
import { supabase } from '@/lib/supabase';
import { MasterSettingsHub } from '@/components/settings/master-settings-hub';

const MOCK_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

const MOCK_LEADS: Lead[] = [
  {
    id: 'mock-1',
    workspace_id: MOCK_WORKSPACE_ID,
    name: 'Amit Sharma',
    email: 'amit.sharma@example.com',
    phone: '+919876543210',
    source: 'facebook',
    status: 'new',
    score: 'High-Value 🔥',
    score_reason: 'High budget detected (₹2,50,000).',
    raw_payload: { budget: '2.5L', venue: 'Taj Udaipur', event_date: '2026-12-15' },
    created_at: new Date(Date.now() - 1000 * 3600 * 2).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 3600 * 2).toISOString(),
  },
  {
    id: 'mock-2',
    workspace_id: MOCK_WORKSPACE_ID,
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    phone: '+918765432109',
    source: 'google-sheets',
    status: 'contacted',
    score: 'High-Value 🔥',
    score_reason: 'Premium destination/venue (Leela Palace Goa) with budget of ₹1,80,000.',
    raw_payload: { budget: '1.8L', venue: 'Leela Palace Goa', event_date: '2026-11-20', functions: '3' },
    created_at: new Date(Date.now() - 1000 * 3600 * 18).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 3600 * 18).toISOString(),
  },
  {
    id: 'mock-3',
    workspace_id: MOCK_WORKSPACE_ID,
    name: 'Rahul Verma',
    email: 'rahul.verma@example.com',
    phone: '+917654321098',
    source: 'google-contacts',
    status: 'warm',
    score: 'Warm 👍',
    score_reason: 'Moderate budget detected (₹90,000).',
    raw_payload: { budget: '90k', venue: 'Marriott Jaipur', event_date: '2026-10-05' },
    created_at: new Date(Date.now() - 1000 * 3600 * 42).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 3600 * 42).toISOString(),
  },
  {
    id: 'mock-4',
    workspace_id: MOCK_WORKSPACE_ID,
    name: 'Sneha Reddy',
    email: 'sneha.reddy@example.com',
    phone: '+919988776655',
    source: 'facebook',
    status: 'new',
    score: 'Cold ❄️',
    score_reason: 'Low budget detected (₹40,000).',
    raw_payload: { budget: '40,000 INR', venue: 'Local Banquet Hall', event_date: '2026-09-12' },
    created_at: new Date(Date.now() - 1000 * 3600 * 3).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 3600 * 3).toISOString(),
  },
];

const DEFAULT_STAGES = [
  { id: 'new', name: 'Inquiry', color: '#C5A059' },
  { id: 'contacted', name: 'Contacted', color: '#D4AF37' },
  { id: 'warm', name: 'Meeting Scheduled', color: '#D4AF37' },
  { id: 'hot', name: 'Proposal Sent', color: '#C5A059' },
  { id: 'closed', name: 'Contract Signed', color: '#10b981' },
  { id: 'lost', name: 'Closed/Lost', color: '#6b7280' }
];

function PremiumTooltip({ content, children }: { content: string; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute z-50 px-2.5 py-1.5 text-[10px] font-medium text-white dark:text-[#121110] bg-[#1C1A18] dark:bg-[#FAF8F5] border border-[#2C2926] dark:border-[#E8E5DF] rounded-lg shadow-lg whitespace-nowrap bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDay}d ago`;
  } catch (e) {
    return 'N/A';
  }
}

export default function LeadsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>(MOCK_WORKSPACE_ID);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [stages, setStages] = useState<any[]>(DEFAULT_STAGES);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal/Drawer States
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Create Lead State
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadSource, setNewLeadSource] = useState('Manual');
  const [newLeadStatus, setNewLeadStatus] = useState<Lead['status']>('new');

  // Authenticate user & load leads
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      let uId = session.user.id;
      setUserEmail(session.user.email || null);
      
      if (session.user.email === 'sushantnawale700@gmail.com') {
        const impId = localStorage.getItem('impersonated_tenant_id');
        if (impId) {
          uId = impId;
        }
      }
      setUserId(uId);
      setIsDemoMode(false);
      await loadLeads(uId);
    };

    checkAuth();
  }, [router]);

  // Realtime leads listener
  useEffect(() => {
    if (isDemoMode || !userId) return;

    const channel = supabase
      .channel(`leads_realtime_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `workspace_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLead = payload.new as Lead;
            setLeads(prev => {
              if (prev.some(l => l.id === newLead.id)) return prev;
              return [newLead, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedLead = payload.new as Lead;
            setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
            setSelectedLead(prev => prev && prev.id === updatedLead.id ? updatedLead : prev);
          } else if (payload.eventType === 'DELETE') {
            const deletedLead = payload.old as { id: string };
            setLeads(prev => prev.filter(l => l.id !== deletedLead.id));
            setSelectedLead(prev => prev && prev.id === deletedLead.id ? null : prev);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isDemoMode]);

  const loadLeads = async (targetUserId: string) => {
    setLoading(true);
    try {
      const { data: dbLeads, error: leadsErr } = await supabase
        .from('leads')
        .select('*')
        .eq('workspace_id', targetUserId)
        .order('created_at', { ascending: false });

      if (!leadsErr && dbLeads) {
        setLeads(dbLeads as Lead[]);
      }

      const { data: dbStages } = await supabase
        .from('crm_stages')
        .select('*')
        .eq('workspace_id', targetUserId)
        .order('position', { ascending: true });

      if (dbStages && dbStages.length > 0) {
        setStages(dbStages);
      } else {
        setStages(DEFAULT_STAGES);
      }
    } catch (err) {
      console.log('Database read error, falling back to mock leads.', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: Lead['status']) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus, updated_at: new Date().toISOString() } : l));
    if (!isDemoMode) {
      await supabase
        .from('leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    setLeads(prev => prev.filter(l => l.id !== leadId));
    if (selectedLead?.id === leadId) setSelectedLead(null);
    if (!isDemoMode) {
      await supabase.from('leads').delete().eq('id', leadId);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim()) return;

    const newLead: Partial<Lead> = {
      workspace_id: userId,
      name: newLeadName,
      email: newLeadEmail,
      phone: newLeadPhone,
      source: newLeadSource,
      status: newLeadStatus,
      score: 'Cold ❄️',
      score_reason: 'Manually created lead.',
      raw_payload: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isDemoMode) {
      const generatedId = `mock-${Math.random().toString(36).substring(7)}`;
      setLeads(prev => [{ ...newLead, id: generatedId } as Lead, ...prev]);
      setIsCreateOpen(false);
      resetCreateForm();
    } else {
      const { data, error } = await supabase
        .from('leads')
        .insert([newLead])
        .select();

      if (!error && data && data.length > 0) {
        setLeads(prev => [data[0] as Lead, ...prev]);
        setIsCreateOpen(false);
        resetCreateForm();
      } else {
        alert('Error creating lead: ' + (error?.message || 'Unknown error'));
      }
    }
  };

  const resetCreateForm = () => {
    setNewLeadName('');
    setNewLeadEmail('');
    setNewLeadPhone('');
    setNewLeadSource('Manual');
    setNewLeadStatus('new');
  };

  // Filtering leads based on search query
  const filteredLeads = leads.filter(lead => {
    const query = searchQuery.toLowerCase();
    return (
      lead.name?.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.phone?.toLowerCase().includes(query) ||
      lead.source?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#121110] text-[#1A1A1A] dark:text-[#F5F5F5] transition-colors duration-300">
      <main className="w-full max-w-[100vw] px-4 md:px-8 py-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-[9px] font-extrabold uppercase tracking-wider font-mono">
              Workspace Leads
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight mt-1">Leads Management Matrix</h1>
            <p className="text-xs text-[#706E6A] dark:text-[#A09E9A] mt-0.5">Spacious overview of ingestion status, phone records and workflow telemetry.</p>
          </div>

          <div className="flex items-center gap-3">
            {isDemoMode && (
              <span className="px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-[10px] font-bold tracking-wide flex items-center gap-1.5 font-mono">
                <Database className="w-3.5 h-3.5" /> SIMULATION
              </span>
            )}
            
            <PremiumTooltip content="Create stages, rules and priorities">
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2.5 bg-white dark:bg-[#1C1A18] hover:bg-[#FAF8F5] dark:hover:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] text-[#706E6A] dark:text-[#A09E9A] rounded-xl transition-all flex items-center justify-center shadow-sm"
              >
                <Settings className="w-4 h-4" />
              </button>
            </PremiumTooltip>

            <PremiumTooltip content="Reload leads from database">
              <button
                onClick={() => loadLeads(userId)}
                disabled={loading}
                className="p-2.5 bg-white dark:bg-[#1C1A18] hover:bg-[#FAF8F5] dark:hover:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] text-[#706E6A] dark:text-[#A09E9A] rounded-xl transition-all flex items-center justify-center shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </PremiumTooltip>

            <PremiumTooltip content="Manually add new lead to directory">
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 bg-[var(--accent)] hover:opacity-95 text-white dark:text-black font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Lead
              </button>
            </PremiumTooltip>
          </div>
        </div>

        {/* Controls: Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#706E6A] dark:text-[#A09E9A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search leads by name, email or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1C1A18] border border-[#E8E5DF] dark:border-[#2C2926] rounded-xl text-xs font-semibold placeholder-[#706E6A] dark:placeholder-[#A09E9A] text-[#1A1A1A] dark:text-white focus:outline-none focus:border-[var(--accent)]/40 transition-colors shadow-sm"
            />
          </div>
        </div>

        {/* Dynamic visual dashboard matrix */}
        {loading ? (
          <div className="py-24 flex items-center justify-center">
            <RefreshCw className="w-7 h-7 animate-spin text-[var(--accent)]" />
          </div>
        ) : (
          <div className="overflow-hidden border border-[#E8E5DF] dark:border-[#2C2926] bg-[#FFFFFF] dark:bg-[#1C1A18] rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E8E5DF] dark:border-[#2C2926] bg-[#FAF8F5]/50 dark:bg-[#121110]/50 text-[10px] font-bold text-[#706E6A] dark:text-[#A09E9A] uppercase tracking-wider">
                    <th className="py-4 px-6 w-12 text-center">Status</th>
                    <th className="py-4 px-6">Client Name</th>
                    <th className="py-4 px-6">Source</th>
                    <th className="py-4 px-6">Flow Score</th>
                    <th className="py-4 px-6">Created Time</th>
                    <th className="py-4 px-6 w-20 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E5DF] dark:divide-[#2C2926] text-xs">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#706E6A] dark:text-[#A09E9A] font-semibold">
                        No active leads found matching the filter query.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map(lead => {
                      const currentStage = stages.find(s => s.id === lead.status) || DEFAULT_STAGES[0];
                      const isClosed = lead.status === 'closed';
                      return (
                        <motion.tr
                          key={lead.id}
                          whileHover={{ y: -1.5, zIndex: 10, backgroundColor: 'rgba(212, 175, 55, 0.015)' }}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          className="hover:shadow-[0_4px_25px_rgba(0,0,0,0.02)] transition-shadow cursor-pointer border-transparent"
                        >
                          {/* Checked Column (Checkbox status toggle) */}
                          <td className="py-4 px-6 text-center" onClick={e => e.stopPropagation()}>
                            <PremiumTooltip content={isClosed ? 'Mark as inquiry stage' : 'Mark as closed contract'}>
                              <button
                                onClick={() => handleStatusChange(lead.id, isClosed ? 'new' : 'closed')}
                                className={`w-5 h-5 rounded-lg border flex items-center justify-center mx-auto transition-all ${
                                  isClosed 
                                    ? 'bg-[var(--accent)] border-[var(--accent)] text-white dark:text-black' 
                                    : 'border-[#E8E5DF] dark:border-[#2C2926] hover:border-[var(--accent)]/55'
                                }`}
                              >
                                {isClosed && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                              </button>
                            </PremiumTooltip>
                          </td>

                          {/* Client Name & Contact */}
                          <td className="py-4 px-6" onClick={() => setSelectedLead(lead)}>
                            <div className="font-extrabold text-sm text-[#1A1A1A] dark:text-white">{lead.name}</div>
                            <div className="flex items-center gap-3.5 text-[10px] text-[#706E6A] dark:text-[#A09E9A] mt-1 font-semibold">
                              {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-[var(--accent)]" /> {lead.email}</span>}
                              {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-[var(--accent)]" /> {lead.phone}</span>}
                            </div>
                          </td>

                          {/* Source badge */}
                          <td className="py-4 px-6" onClick={() => setSelectedLead(lead)}>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] text-[10px] font-bold capitalize">
                              {lead.source || 'Manual'}
                            </span>
                          </td>

                          {/* Flow Score badge */}
                          <td className="py-4 px-6" onClick={() => setSelectedLead(lead)}>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-transparent bg-zinc-100 dark:bg-zinc-900">
                              {lead.score || 'Cold ❄️'}
                            </span>
                          </td>

                          {/* Timestamp */}
                          <td className="py-4 px-6 text-[#706E6A] dark:text-[#A09E9A] font-semibold" onClick={() => setSelectedLead(lead)}>
                            {formatRelativeTime(lead.created_at)}
                          </td>

                          {/* Actions menu */}
                          <td className="py-4 px-6 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-2">
                              <PremiumTooltip content="View full lead dashboard metadata">
                                <button
                                  onClick={() => setSelectedLead(lead)}
                                  className="p-1.5 hover:bg-[#FAF8F5] dark:hover:bg-[#121110] border border-transparent hover:border-[#E8E5DF] dark:hover:border-[#2C2926] text-[#706E6A] dark:text-[#A09E9A] hover:text-[var(--accent)] rounded-lg transition-all"
                                >
                                  <Search className="w-3.5 h-3.5" />
                                </button>
                              </PremiumTooltip>

                              <PremiumTooltip content="Delete lead record">
                                <button
                                  onClick={() => handleDeleteLead(lead.id)}
                                  className="p-1.5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-[#706E6A] dark:text-[#A09E9A] hover:text-red-500 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </PremiumTooltip>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Master settings UI component wrapper */}
        <MasterSettingsHub
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          workspaceId={userId}
          onStagesUpdated={() => loadLeads(userId)}
        />

        {/* ==================== CREATE LEAD DIALOG OVERLAY ==================== */}
        <AnimatePresence>
          {isCreateOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#1C1A18] border border-[#E8E5DF] dark:border-[#2C2926] rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.1)] overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-[#E8E5DF] dark:border-[#2C2926] flex justify-between items-center bg-[#FAF8F5]/50 dark:bg-[#121110]/50">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-[var(--accent)]" /> Add New Lead
                  </h3>
                  <button 
                    onClick={() => setIsCreateOpen(false)}
                    className="p-1 hover:bg-[#FAF8F5] dark:hover:bg-[#121110] text-[#706E6A] dark:text-[#A09E9A] rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateLead} className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-[#706E6A] dark:text-[#A09E9A] uppercase tracking-wider">Client Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Simran Kaur"
                      value={newLeadName}
                      onChange={e => setNewLeadName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] rounded-xl text-xs font-semibold placeholder-[#706E6A] dark:placeholder-[#A09E9A] focus:outline-none focus:border-[var(--accent)]/40 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-[#706E6A] dark:text-[#A09E9A] uppercase tracking-wider">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="e.g. simran@gmail.com"
                      value={newLeadEmail}
                      onChange={e => setNewLeadEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] rounded-xl text-xs font-semibold placeholder-[#706E6A] dark:placeholder-[#A09E9A] focus:outline-none focus:border-[var(--accent)]/40 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-[#706E6A] dark:text-[#A09E9A] uppercase tracking-wider">Phone Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. +91 9988776655"
                      value={newLeadPhone}
                      onChange={e => setNewLeadPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] rounded-xl text-xs font-semibold placeholder-[#706E6A] dark:placeholder-[#A09E9A] focus:outline-none focus:border-[var(--accent)]/40 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-[#706E6A] dark:text-[#A09E9A] uppercase tracking-wider">Lead Source</label>
                      <select 
                        value={newLeadSource}
                        onChange={e => setNewLeadSource(e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] rounded-xl text-xs font-semibold focus:outline-none focus:border-[var(--accent)]/40 transition-colors"
                      >
                        <option value="Manual">Manual</option>
                        <option value="facebook">Facebook Ads</option>
                        <option value="google-sheets">Google Sheets</option>
                        <option value="google-contacts">Google Contacts</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-[#706E6A] dark:text-[#A09E9A] uppercase tracking-wider">Inquiry Status</label>
                      <select 
                        value={newLeadStatus}
                        onChange={e => setNewLeadStatus(e.target.value as Lead['status'])}
                        className="w-full px-3 py-2 bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] rounded-xl text-xs font-semibold focus:outline-none focus:border-[var(--accent)]/40 transition-colors"
                      >
                        {stages.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E8E5DF] dark:border-[#2C2926] flex justify-end gap-2.5">
                    <button 
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="px-4 py-2 bg-[#FAF8F5] hover:bg-[#FAF8F5]/80 dark:bg-[#121110] dark:hover:bg-[#121110]/80 border border-[#E8E5DF] dark:border-[#2C2926] text-xs font-bold rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-[var(--accent)] hover:opacity-90 text-white dark:text-black font-extrabold text-xs rounded-xl shadow-sm transition-all"
                    >
                      Create Lead
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ==================== SLEEK DETAIL SLIDE-OVER DRAWER ==================== */}
        <AnimatePresence>
          {selectedLead && (
            <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[1px]">
              {/* Close Click Overlay wrapper */}
              <div className="absolute inset-0" onClick={() => setSelectedLead(null)} />
              
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#1C1A18] border-l border-[#E8E5DF] dark:border-[#2C2926] h-full shadow-[0_0_50px_rgba(0,0,0,0.15)] flex flex-col justify-between relative z-10"
              >
                {/* Header detail */}
                <div className="px-6 py-5 border-b border-[#E8E5DF] dark:border-[#2C2926] flex justify-between items-center bg-[#FAF8F5]/50 dark:bg-[#121110]/50">
                  <div>
                    <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
                      <User className="w-4 h-4 text-[var(--accent)]" /> Lead Details
                    </h3>
                    <span className="text-[10px] text-[#706E6A] dark:text-[#A09E9A] font-semibold mt-0.5">ID: {selectedLead.id}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedLead(null)}
                    className="p-1 hover:bg-[#FAF8F5] dark:hover:bg-[#121110] text-[#706E6A] dark:text-[#A09E9A] rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Details Scroll Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Name and Status overview */}
                  <div className="space-y-3">
                    <div className="text-xl font-extrabold text-[#1A1A1A] dark:text-white">{selectedLead.name}</div>
                    <div className="flex flex-wrap gap-2.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-transparent bg-zinc-100 dark:bg-zinc-900">
                        Source: <span className="capitalize">{selectedLead.source}</span>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-transparent bg-zinc-100 dark:bg-zinc-900">
                        Score: {selectedLead.score}
                      </span>
                    </div>
                  </div>

                  {/* Contact Info block */}
                  <div className="p-4 rounded-xl bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] space-y-3">
                    <h4 className="text-[10px] font-extrabold text-[#706E6A] dark:text-[#A09E9A] uppercase tracking-wider">Contact Records</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 text-xs text-[#1A1A1A] dark:text-[#F5F5F5] font-semibold">
                        <Mail className="w-4 h-4 text-[var(--accent)] shrink-0" />
                        <span>{selectedLead.email || 'No email specified'}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-[#1A1A1A] dark:text-[#F5F5F5] font-semibold mt-1.5">
                        <Phone className="w-4 h-4 text-[var(--accent)] shrink-0" />
                        <span>{selectedLead.phone || 'No phone specified'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Raw Ingestion Payload Grid */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-extrabold text-[#706E6A] dark:text-[#A09E9A] uppercase tracking-wider">Ingested Payload Metadata</h4>
                    {selectedLead.raw_payload && Object.keys(selectedLead.raw_payload).length > 0 ? (
                      <div className="grid grid-cols-2 gap-3.5">
                        {Object.entries(selectedLead.raw_payload).map(([k, v]) => (
                          <div 
                            key={k} 
                            className="p-3 bg-[#FAF8F5]/60 dark:bg-[#121110]/30 border border-[#E8E5DF] dark:border-[#2C2926] rounded-xl"
                          >
                            <span className="block text-[9px] font-extrabold text-[#706E6A] dark:text-[#A09E9A] uppercase tracking-wider font-mono">{k}</span>
                            <span className="block text-xs font-bold text-[#1A1A1A] dark:text-white mt-1 truncate">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] text-[11px] text-[#706E6A] dark:text-[#A09E9A] font-semibold rounded-xl">
                        No additional payload keys detected for this lead.
                      </div>
                    )}
                  </div>

                  {/* Score reason explanation */}
                  {selectedLead.score_reason && (
                    <div className="p-4 border border-[var(--accent)]/20 bg-[var(--accent)]/5 rounded-xl space-y-2">
                      <div className="text-[10px] font-extrabold text-[var(--accent)] uppercase tracking-wider font-mono">Lead Intelligence Score</div>
                      <p className="text-[11px] text-[#706E6A] dark:text-[#A09E9A] leading-relaxed font-semibold">
                        {selectedLead.score_reason}
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Details Footer control */}
                <div className="p-6 border-t border-[#E8E5DF] dark:border-[#2C2926] bg-[#FAF8F5]/50 dark:bg-[#121110]/50 flex items-center justify-between">
                  <div className="text-[10px] text-[#706E6A] dark:text-[#A09E9A] font-semibold font-mono flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
                    <span>Realtime state synchronised.</span>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedLead(null);
                    }}
                    className="px-4 py-2 bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] text-xs font-bold text-[#1A1A1A] dark:text-white rounded-xl transition-all"
                  >
                    Close Panel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}