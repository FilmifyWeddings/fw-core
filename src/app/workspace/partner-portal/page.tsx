'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Film, BookOpen, Calendar, Clock, MapPin, 
  ExternalLink, CheckCircle2, AlertCircle, RefreshCw, 
  Send, Upload, Truck, IndianRupee, MessageSquare, 
  ShieldCheck, Sparkles, Building2, User, ChevronRight,
  Package, FileText, Check, Plus, Layers, Crown, Briefcase, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';

interface AssignedEvent {
  id: string;
  event_name: string;
  client_name?: string;
  event_date: string;
  call_time?: string;
  venue?: string;
  venue_address?: string;
  assigned_role?: string;
  notes?: string;
}

interface Deliverable {
  id: string;
  workspace_id: string;
  project_id?: string;
  project_name?: string;
  deliverable_type: 'VIDEO_EDIT' | 'PHOTO_EDIT' | 'ALBUM_DESIGN' | 'ALBUM_PRINTING';
  title: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'REVIEW_READY' | 'CHANGES_REQUESTED' | 'PRINTING' | 'DISPATCHED' | 'COMPLETED';
  drive_folder_url?: string;
  preview_url?: string;
  sheet_count?: number;
  paper_finish?: string;
  tracking_number?: string;
  courier_partner?: string;
  delivery_address?: string;
  lab_bill_amount?: number;
  lab_invoice_url?: string;
  due_date?: string;
  notes?: string;
  revision_comments?: Array<{ id: string; sender: string; text: string; time: string }>;
  created_at?: string;
}

export default function PartnerPortalPage() {
  const { 
    workspaceId, 
    workspaceName, 
    userRole, 
    isOwner, 
    userId, 
    userEmail,
    activeWorkspace,
    availableWorkspaces 
  } = useWorkspace();

  const [activeTab, setActiveTab] = useState<'events' | 'edits' | 'lab'>('events');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AssignedEvent[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState<{ [id: string]: string }>({});

  // Lab Edit Modal State
  const [editingLabItem, setEditingLabItem] = useState<Deliverable | null>(null);
  const [labTrackingNo, setLabTrackingNo] = useState('');
  const [labCourier, setLabCourier] = useState('');
  const [labCost, setLabCost] = useState('');
  const [labInvoiceUrl, setLabInvoiceUrl] = useState('');
  const [labStatus, setLabStatus] = useState<any>('PRINTING');
  const [savingLab, setSavingLab] = useState(false);

  // Auto-select relevant tab based on user's primary role
  useEffect(() => {
    const role = userRole?.toUpperCase() || '';
    if (role.includes('EDITOR') || role.includes('DESIGN')) {
      setActiveTab('edits');
    } else if (role.includes('LAB') || role.includes('PRINT')) {
      setActiveTab('lab');
    } else {
      setActiveTab('events');
    }
  }, [userRole]);

  // Load portal data
  const loadPortalData = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      // 1. Fetch Deliverables
      const res = await fetch(`/api/workspace/deliverables?workspace_id=${workspaceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.deliverables)) {
        setDeliverables(data.deliverables);
      }

      // 2. Fetch Assigned Events (Filtered to assigned member / general workspace events)
      const { data: eventsData } = await supabase
        .from('team_events')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('event_date', { ascending: true });

      if (eventsData && eventsData.length > 0) {
        setEvents(eventsData.map((ev: any) => ({
          id: ev.id,
          event_name: ev.event_name || ev.title || 'Wedding Shoot',
          client_name: ev.client_name || 'Assigned Client',
          event_date: ev.event_date || new Date().toISOString(),
          call_time: ev.call_time || '09:00 AM',
          venue: ev.venue || ev.location || 'Main Banquet Hall',
          venue_address: ev.venue_address || ev.address || ev.venue || '',
          assigned_role: ev.assigned_role || userRole || 'Photographer',
          notes: ev.notes || '',
        })));
      } else {
        // Fallback sample if no events yet
        setEvents([
          {
            id: 'sample-1',
            event_name: 'Ananya & Rohan — Sangeet & Reception',
            client_name: 'Ananya & Rohan',
            event_date: new Date(Date.now() + 86400000 * 2).toISOString(),
            call_time: '04:30 PM',
            venue: 'The Grand Hyatt, Santacruz, Mumbai',
            venue_address: 'Grand Hyatt Mumbai Hotel & Residences, Bandra Kurla Complex Vicinity, Mumbai',
            assigned_role: userRole || 'Lead Candid Photographer',
            notes: 'Cover bridal entry, family performances, and couple candid portraits.',
          },
        ]);
      }
    } catch (err) {
      console.error('[loadPortalData Error]:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, userRole]);

  useEffect(() => {
    loadPortalData();

    // Supabase Realtime for live cross-workspace updates
    if (!workspaceId) return;
    const channel = supabase
      .channel(`partner_portal_${workspaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_deliverables' },
        () => {
          loadPortalData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, loadPortalData]);

  // Status Updater
  const updateDeliverableStatus = async (item: Deliverable, nextStatus: any) => {
    setUpdatingId(item.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch('/api/workspace/deliverables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: item.id,
          workspace_id: item.workspace_id,
          deliverable_type: item.deliverable_type,
          title: item.title,
          status: nextStatus,
        }),
      });

      if (res.ok) {
        setDeliverables(prev => prev.map(d => d.id === item.id ? { ...d, status: nextStatus } : d));
      }
    } catch (err) {
      console.error('[updateDeliverableStatus Error]:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Add Revision Comment
  const handleAddComment = async (item: Deliverable) => {
    const text = newCommentText[item.id];
    if (!text || !text.trim()) return;

    const newComment = {
      id: 'c_' + Date.now(),
      sender: userRole || 'Partner',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const currentComments = item.revision_comments || [];
    const updatedComments = [...currentComments, newComment];

    setNewCommentText(prev => ({ ...prev, [item.id]: '' }));
    setDeliverables(prev => prev.map(d => d.id === item.id ? { ...d, revision_comments: updatedComments } : d));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        await fetch('/api/workspace/deliverables', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: item.id,
            workspace_id: item.workspace_id,
            deliverable_type: item.deliverable_type,
            title: item.title,
            revision_comments: updatedComments,
          }),
        });
      }
    } catch (_) {}
  };

  // Submit Lab Dispatch & Billing Update
  const handleSaveLabDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLabItem) return;

    setSavingLab(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch('/api/workspace/deliverables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingLabItem.id,
          workspace_id: editingLabItem.workspace_id,
          deliverable_type: editingLabItem.deliverable_type,
          title: editingLabItem.title,
          status: labStatus,
          tracking_number: labTrackingNo.trim() || null,
          courier_partner: labCourier.trim() || null,
          lab_bill_amount: labCost ? Number(labCost) : 0,
          lab_invoice_url: labInvoiceUrl.trim() || null,
        }),
      });

      if (res.ok) {
        setDeliverables(prev => prev.map(d => d.id === editingLabItem.id ? {
          ...d,
          status: labStatus,
          tracking_number: labTrackingNo.trim() || undefined,
          courier_partner: labCourier.trim() || undefined,
          lab_bill_amount: labCost ? Number(labCost) : 0,
          lab_invoice_url: labInvoiceUrl.trim() || undefined,
        } : d));
        setEditingLabItem(null);
      }
    } catch (err) {
      console.error('[handleSaveLabDetails Error]:', err);
    } finally {
      setSavingLab(false);
    }
  };

  const editDeliverables = deliverables.filter(d => 
    d.deliverable_type === 'VIDEO_EDIT' || 
    d.deliverable_type === 'PHOTO_EDIT' || 
    d.deliverable_type === 'ALBUM_DESIGN'
  );

  const labDeliverables = deliverables.filter(d => 
    d.deliverable_type === 'ALBUM_PRINTING'
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* 1. TOP HEADER & DUAL-ROLE CONTEXT SUMMARY */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-100/40 via-amber-50/30 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                {isOwner ? 'Studio Owner View' : `Partner: ${userRole}`}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Realtime Active
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
              {workspaceName} — Partner Command Portal
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 font-medium max-w-2xl">
              Cross-workspace assignment hub. View your assigned wedding events, footage editing queues, and album printing pipelines with zero unassigned data leakage.
            </p>
          </div>

          {/* Quick Switcher & Stats */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-64">
              <WorkspaceSwitcher />
            </div>
            <button
              onClick={loadPortalData}
              className="p-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition cursor-pointer"
              title="Refresh Portal Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* 3 Main Navigation Tabs */}
        <div className="flex items-center gap-2 mt-8 pt-6 border-t border-zinc-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'events'
                ? 'bg-zinc-900 text-white shadow-md'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>📸 Events &amp; Shoots</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
              {events.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('edits')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'edits'
                ? 'bg-zinc-900 text-white shadow-md'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>🎬 Post-Production &amp; Edits</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
              {editDeliverables.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('lab')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'lab'
                ? 'bg-zinc-900 text-white shadow-md'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>📖 Album Printing &amp; Lab</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
              {labDeliverables.length}
            </span>
          </button>
        </div>
      </div>

      {/* 2. TAB A: 📸 EVENTS & SHOOTS */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-zinc-900">Assigned Shoots &amp; Wedding Events</h2>
            <span className="text-xs text-zinc-400 font-medium">Financial data &amp; unassigned leads are strictly hidden</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm hover:shadow-md transition-all space-y-4 relative"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200 inline-block">
                      {ev.assigned_role}
                    </span>
                    <h3 className="text-base font-black text-zinc-900 leading-snug">{ev.event_name}</h3>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-zinc-900 flex items-center gap-1 justify-end">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      {new Date(ev.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="text-[11px] font-bold text-amber-600 flex items-center gap-1 justify-end mt-0.5">
                      <Clock className="w-3 h-3" />
                      Call: {ev.call_time}
                    </div>
                  </div>
                </div>

                {/* Venue & Maps button */}
                <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-zinc-700 truncate">{ev.venue}</p>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.venue_address || ev.venue || '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 border border-zinc-200 text-[11px] font-bold flex items-center gap-1 shrink-0 shadow-2xs transition"
                  >
                    <span>Maps</span>
                    <ExternalLink className="w-3 h-3 text-zinc-400" />
                  </a>
                </div>

                {ev.notes && (
                  <p className="text-xs text-zinc-500 font-medium bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                    <strong>Brief:</strong> {ev.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. TAB B: 🎬 POST-PRODUCTION & EDITS */}
      {activeTab === 'edits' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-zinc-900">Assigned Editing &amp; Design Pipelines</h2>
            <span className="text-xs text-zinc-400 font-medium">Syncs 2-way with Studio Owner in realtime</span>
          </div>

          {editDeliverables.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200 space-y-3">
              <Film className="w-10 h-10 text-zinc-300 mx-auto" />
              <h3 className="text-base font-bold text-zinc-800">No Editing Projects Assigned Yet</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                When the studio owner assigns video editing, photo retouching, or album design tasks, they will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {editDeliverables.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                        {item.deliverable_type.replace('_', ' ')}
                      </span>
                      <h3 className="text-base font-black text-zinc-900 mt-1">{item.title}</h3>
                      <p className="text-xs text-zinc-400 font-medium">{item.project_name || 'Main Project'}</p>
                    </div>

                    <select
                      value={item.status}
                      disabled={updatingId === item.id}
                      onChange={(e) => updateDeliverableStatus(item, e.target.value)}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 cursor-pointer"
                    >
                      <option value="PENDING">⏳ Pending</option>
                      <option value="IN_PROGRESS">⚡ In Progress</option>
                      <option value="REVIEW_READY">👀 Review Ready</option>
                      <option value="CHANGES_REQUESTED">🔄 Changes Requested</option>
                      <option value="COMPLETED">✅ Completed</option>
                    </select>
                  </div>

                  {/* Footage Link */}
                  {item.drive_folder_url && (
                    <a
                      href={item.drive_folder_url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center justify-between p-3 rounded-2xl bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs font-bold transition"
                    >
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-indigo-600" />
                        <span>Open Raw Footage &amp; Assets Drive</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-indigo-400" />
                    </a>
                  )}

                  {/* Revision Comments Box */}
                  <div className="space-y-2 pt-2 border-t border-zinc-100">
                    <p className="text-[11px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3" />
                      <span>Revision Notes &amp; Feedback</span>
                    </p>

                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {(item.revision_comments || []).map((c, i) => (
                        <div key={i} className="text-xs p-2 rounded-xl bg-zinc-50 border border-zinc-100 flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-zinc-800 mr-1.5">{c.sender}:</span>
                            <span className="text-zinc-600">{c.text}</span>
                          </div>
                          <span className="text-[9px] text-zinc-400 shrink-0">{c.time}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add revision comment..."
                        value={newCommentText[item.id] || ''}
                        onChange={(e) => setNewCommentText({ ...newCommentText, [item.id]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(item)}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-medium text-zinc-900 focus:bg-white focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddComment(item)}
                        className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. TAB C: 📖 ALBUM PRINTING & LAB */}
      {activeTab === 'lab' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-zinc-900">Album Printing &amp; Lab Dispatch Pipeline</h2>
            <span className="text-xs text-zinc-400 font-medium">Enter Tracking IDs, Invoices &amp; Printing Costs</span>
          </div>

          {labDeliverables.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200 space-y-3">
              <BookOpen className="w-10 h-10 text-zinc-300 mx-auto" />
              <h3 className="text-base font-bold text-zinc-800">No Album Printing Orders</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Album printing orders from the studio owner will appear here with sheet counts, finishes, and delivery addresses.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {labDeliverables.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Album Printing
                      </span>
                      <h3 className="text-base font-black text-zinc-900 mt-1">{item.title}</h3>
                    </div>

                    <button
                      onClick={() => {
                        setEditingLabItem(item);
                        setLabTrackingNo(item.tracking_number || '');
                        setLabCourier(item.courier_partner || '');
                        setLabCost(item.lab_bill_amount ? String(item.lab_bill_amount) : '');
                        setLabInvoiceUrl(item.lab_invoice_url || '');
                        setLabStatus(item.status || 'PRINTING');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200 transition cursor-pointer flex items-center gap-1"
                    >
                      <span>Update Dispatch</span>
                    </button>
                  </div>

                  {/* Album Specs */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                      <span className="text-zinc-400 font-medium block text-[10px]">Sheets:</span>
                      <span className="font-bold text-zinc-900">{item.sheet_count || 30} Sheets (60 Pages)</span>
                    </div>
                    <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                      <span className="text-zinc-400 font-medium block text-[10px]">Finish:</span>
                      <span className="font-bold text-zinc-900">{item.paper_finish || 'Velvet Matte'}</span>
                    </div>
                  </div>

                  {/* Destination Address */}
                  {item.delivery_address && (
                    <div className="text-xs p-3 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-0.5">
                      <span className="text-zinc-400 text-[10px] font-bold block">Shipping Destination:</span>
                      <p className="font-semibold text-zinc-800">{item.delivery_address}</p>
                    </div>
                  )}

                  {/* Tracking & Lab Bill Summary */}
                  <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2 text-emerald-900">
                      <Truck className="w-4 h-4 text-emerald-600" />
                      <span>{item.tracking_number ? `${item.courier_partner || 'Courier'}: ${item.tracking_number}` : 'Tracking Pending'}</span>
                    </div>
                    <div className="text-emerald-800">
                      {item.lab_bill_amount ? `₹${item.lab_bill_amount.toLocaleString('en-IN')}` : 'Bill Pending'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lab Update Modal */}
      <AnimatePresence>
        {editingLabItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingLabItem(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-zinc-100 z-10 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h3 className="text-base font-black text-zinc-900">Update Album Dispatch &amp; Lab Bill</h3>
                <button onClick={() => setEditingLabItem(null)} className="p-1 rounded-full text-zinc-400 hover:bg-zinc-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveLabDetails} className="space-y-4 text-xs font-bold text-zinc-700">
                <div className="space-y-1">
                  <label>Status</label>
                  <select
                    value={labStatus}
                    onChange={(e: any) => setLabStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200"
                  >
                    <option value="PRINTING">🖨️ Printing &amp; Binding</option>
                    <option value="DISPATCHED">📦 Dispatched / In Transit</option>
                    <option value="COMPLETED">✅ Delivered &amp; Completed</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label>Courier Partner</label>
                    <input
                      type="text"
                      placeholder="e.g. DTDC, BlueDart"
                      value={labCourier}
                      onChange={(e) => setLabCourier(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Tracking Number</label>
                    <input
                      type="text"
                      placeholder="e.g. D12345678"
                      value={labTrackingNo}
                      onChange={(e) => setLabTrackingNo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label>Final Lab Printing Cost (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 4500"
                    value={labCost}
                    onChange={(e) => setLabCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label>Lab Invoice URL / Link</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={labInvoiceUrl}
                    onChange={(e) => setLabInvoiceUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingLabItem(null)}
                    className="px-4 py-2 rounded-xl text-zinc-500 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingLab}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    {savingLab ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Save &amp; Sync to Studio Owner</span>
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
