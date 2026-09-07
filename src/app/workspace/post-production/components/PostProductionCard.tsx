'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, User, Calendar, FileText, CheckCircle2, 
  Clock, AlertTriangle, Layers, Sparkles, RefreshCw, Eye, Check
} from 'lucide-react';
import DeliverableCategorySection, { PostProductionDeliverable } from './DeliverableCategorySection';
import Searchable3DCreamSelect, { Searchable3DCreamSelectOption } from '@/components/ui/Searchable3DCreamSelect';
import { supabase } from '@/lib/supabase';

export interface PostProductionProjectData {
  id: string;
  project_id?: string;
  workspace_id?: string;
  client_id: string;
  client_name: string;
  couple_names?: string | null;
  event_date?: string | null;
  event_type?: string | null;
  project_manager_id?: string | null;
  project_manager_name?: string | null;
  overall_status: 'active' | 'delayed' | 'completed';
  deliverables: PostProductionDeliverable[];
  quotation_id?: string | null;
  quotation_title?: string | null;
}

interface PostProductionCardProps {
  project: PostProductionProjectData;
  teamMembers: { id: string; name: string; role?: string }[];
  quotations: any[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateProject: (projectId: string, updated: Partial<PostProductionProjectData>) => void;
  onOpenComments: (itemId: string, title: string) => void;
  onOpenDrive: (itemId: string, currentLink: string) => void;
}

export function parseQuotationDeliverables(q: any): PostProductionDeliverable[] {
  const result: PostProductionDeliverable[] = [];
  const seen = new Set<string>();

  const categorize = (text: string): 'Photos' | 'Videos' | 'Albums' => {
    const t = text.toLowerCase();
    if (/album|book|photobook|sheet|print|flush\s*mount/i.test(t)) return 'Albums';
    if (/video|film|teaser|reel|cinemat|trailer|footage|highlight/i.test(t)) return 'Videos';
    return 'Photos';
  };

  const determineSegment = (eventTitle: string, itemText: string): 'Pre-Wedding' | 'Wedding' => {
    const combined = `${eventTitle} ${itemText}`.toLowerCase();
    if (/pre-wedding|pre\s*wedding|engagement|roka|proposal|save\s*the\s*date/i.test(combined)) {
      return 'Pre-Wedding';
    }
    return 'Wedding';
  };

  // 1. Parse Events
  const events = Array.isArray(q.events) ? q.events : [];
  events.forEach((ev: any) => {
    const evTitle = ev.title || ev.name || '';
    const delivs = Array.isArray(ev.deliverables) ? ev.deliverables : [];
    delivs.forEach((d: string) => {
      const cleanTitle = typeof d === 'string' ? d.trim() : '';
      if (!cleanTitle) return;
      const segment = determineSegment(evTitle, cleanTitle);
      const category = categorize(cleanTitle);
      const key = `${segment}_${category}_${cleanTitle.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({
          id: `deliv_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          project_id: q.project_id || undefined,
          segment,
          category,
          title: cleanTitle,
          status: 'Upcoming',
          assigned_member_id: null,
          assigned_to: null,
          due_date: null,
          notes: `From Event: ${evTitle}`,
        });
      }
    });
  });

  // 2. Parse Canvas Data (paginatedDelivs or elements gridItems)
  if (q.canvas_data) {
    try {
      const cd = typeof q.canvas_data === 'string' ? JSON.parse(q.canvas_data) : q.canvas_data;
      if (Array.isArray(cd)) {
        cd.forEach((page: any) => {
          // paginatedDelivs
          if (Array.isArray(page.paginatedDelivs)) {
            page.paginatedDelivs.forEach((itemText: string) => {
              if (typeof itemText !== 'string' || !itemText.trim()) return;
              const clean = itemText.trim();
              const segment = determineSegment('', clean);
              const category = categorize(clean);
              const key = `${segment}_${category}_${clean.toLowerCase()}`;
              if (!seen.has(key)) {
                seen.add(key);
                result.push({
                  id: `deliv_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                  segment,
                  category,
                  title: clean,
                  status: 'Upcoming',
                  assigned_member_id: null,
                  assigned_to: null,
                  due_date: null,
                  notes: 'From Quotation Canvas',
                });
              }
            });
          }

          // elements deliverables list
          if (Array.isArray(page.elements)) {
            page.elements.forEach((el: any) => {
              if (el.content === 'deliverables-list' && Array.isArray(el.gridItems)) {
                el.gridItems.forEach((gi: any) => {
                  const clean = (gi.content || gi.title || '').trim();
                  if (!clean) return;
                  const segment = determineSegment('', clean);
                  const category = categorize(clean);
                  const key = `${segment}_${category}_${clean.toLowerCase()}`;
                  if (!seen.has(key)) {
                    seen.add(key);
                    result.push({
                      id: `deliv_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                      segment,
                      category,
                      title: clean,
                      status: 'Upcoming',
                      assigned_member_id: null,
                      assigned_to: null,
                      due_date: null,
                      notes: 'From Quotation Deliverables Page',
                    });
                  }
                });
              }
            });
          }
        });
      }
    } catch (_) {}
  }

  // 3. Parse Selected Add-ons
  const addOns = Array.isArray(q.add_ons) ? q.add_ons : [];
  addOns.forEach((addon: any) => {
    if (addon.selected !== false && addon.title) {
      const clean = addon.title.trim();
      const segment = determineSegment('', clean);
      const category = categorize(clean);
      const key = `${segment}_${category}_${clean.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({
          id: `deliv_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          segment,
          category,
          title: clean,
          status: 'Upcoming',
          assigned_member_id: null,
          assigned_to: null,
          due_date: null,
          notes: 'From Quotation Add-On',
        });
      }
    }
  });

  return result;
}

export default function PostProductionCard({
  project,
  teamMembers,
  quotations,
  isExpanded,
  onToggleExpand,
  onUpdateProject,
  onOpenComments,
  onOpenDrive,
}: PostProductionCardProps) {
  const [activeSegmentTab, setActiveSegmentTab] = useState<'All' | 'Pre-Wedding' | 'Wedding'>('All');
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);

  const deliverables = useMemo(() => project.deliverables || [], [project.deliverables]);

  // Group deliverables by segment & category
  const preWeddingPhotos = useMemo(() => deliverables.filter(d => d.segment === 'Pre-Wedding' && d.category === 'Photos'), [deliverables]);
  const preWeddingVideos = useMemo(() => deliverables.filter(d => d.segment === 'Pre-Wedding' && d.category === 'Videos'), [deliverables]);
  const preWeddingAlbums = useMemo(() => deliverables.filter(d => d.segment === 'Pre-Wedding' && d.category === 'Albums'), [deliverables]);

  const weddingPhotos = useMemo(() => deliverables.filter(d => d.segment !== 'Pre-Wedding' && d.category === 'Photos'), [deliverables]);
  const weddingVideos = useMemo(() => deliverables.filter(d => d.segment !== 'Pre-Wedding' && d.category === 'Videos'), [deliverables]);
  const weddingAlbums = useMemo(() => deliverables.filter(d => d.segment !== 'Pre-Wedding' && d.category === 'Albums'), [deliverables]);

  // Overall Completion Progress
  const totalCount = deliverables.length;
  const completedCount = deliverables.filter(d => {
    const s = (d.status || '').toLowerCase();
    return s.includes('done') || s.includes('complete');
  }).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // PM Options
  const pmOptions: Searchable3DCreamSelectOption[] = useMemo(() => {
    return [
      {
        value: 'unassigned',
        label: 'Unassigned (No PM)',
        badge: 'None',
        badgeClassName: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
      },
      ...teamMembers.map(m => ({
        value: m.name,
        label: m.name,
        badge: m.role || 'PM',
      })),
    ];
  }, [teamMembers]);

  // Quotation matching
  const matchingQuotations = useMemo(() => {
    const nameMatch = project.client_name?.toLowerCase().trim() || '';
    return quotations.filter(q => {
      const qClient = (q.client_name || '').toLowerCase();
      const qCouple = (q.couple_names || '').toLowerCase();
      return (
        (nameMatch && (qClient.includes(nameMatch) || nameMatch.includes(qClient))) ||
        (nameMatch && (qCouple.includes(nameMatch) || nameMatch.includes(qCouple))) ||
        q.client_id === project.client_id
      );
    });
  }, [quotations, project.client_name, project.client_id]);

  // Handle Deliverable Item Update
  const handleUpdateItem = (itemId: string, field: keyof PostProductionDeliverable, value: any) => {
    const updated = deliverables.map(item => {
      if (item.id === itemId) {
        return { ...item, [field]: value };
      }
      return item;
    });

    // Check overall status
    const allDone = updated.length > 0 && updated.every(d => (d.status || '').toLowerCase().includes('done'));
    const newStatus = allDone ? 'completed' : 'active';

    onUpdateProject(project.id, {
      deliverables: updated,
      overall_status: newStatus as any,
    });
  };

  // Handle Deliverable Item Delete
  const handleDeleteItem = (itemId: string) => {
    const updated = deliverables.filter(item => item.id !== itemId);
    onUpdateProject(project.id, { deliverables: updated });
  };

  // Handle Add Item to Category
  const handleAddItem = (segment: 'Pre-Wedding' | 'Wedding', category: 'Photos' | 'Videos' | 'Albums', title: string) => {
    const newItem: PostProductionDeliverable = {
      id: `deliv_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      project_id: project.project_id || undefined,
      segment,
      category,
      title,
      status: 'Upcoming',
      assigned_member_id: null,
      assigned_to: null,
      due_date: null,
    };

    const updated = [...deliverables, newItem];
    onUpdateProject(project.id, { deliverables: updated });
  };

  // Handle Final Quotation Sync
  const handleSyncQuotation = async () => {
    if (!selectedQuotationId) return;
    setIsSyncing(true);
    try {
      const targetQuotation = quotations.find(q => q.id === selectedQuotationId);
      if (!targetQuotation) return;

      const parsedItems = parseQuotationDeliverables(targetQuotation);

      // Decoupled Copy: Cloned directly without altering master quotation
      const mergedDeliverables = [...deliverables];
      parsedItems.forEach(pi => {
        const exists = mergedDeliverables.some(
          d => d.segment === pi.segment && d.category === pi.category && d.title.toLowerCase() === pi.title.toLowerCase()
        );
        if (!exists) {
          mergedDeliverables.push(pi);
        }
      });

      onUpdateProject(project.id, {
        deliverables: mergedDeliverables,
        quotation_id: targetQuotation.id,
        quotation_title: targetQuotation.title || targetQuotation.quotation_number || 'Final Quotation',
      });

      setShowQuotationModal(false);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-[#FFFDF9] dark:bg-[#181614] rounded-2xl border border-[#EAE5DA] dark:border-stone-800 shadow-xs overflow-hidden transition-all hover:border-amber-300/80">
      {/* ── CARD HEADER ── */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-50/40 via-[#FFFDF9] to-amber-50/20 dark:from-stone-900 dark:via-[#181614] dark:to-stone-900 border-b border-[#EAE5DA] dark:border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-black text-slate-900 dark:text-stone-100 tracking-tight">
              {project.client_name}
            </h2>

            {project.couple_names && (
              <span className="text-xs font-bold text-slate-500 dark:text-stone-400">
                ({project.couple_names})
              </span>
            )}

            {/* Overall Status Badge */}
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                project.overall_status === 'completed'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : project.overall_status === 'delayed'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 animate-pulse'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
              }`}
            >
              {project.overall_status === 'completed' ? 'Completed' : project.overall_status === 'delayed' ? 'Delayed' : 'Active'}
            </span>

            {/* Event Type & Date */}
            {project.event_date && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-stone-300 bg-[#FDFBF7] dark:bg-stone-800/80 px-2.5 py-1 rounded-xl border border-[#EAE5DA] dark:border-stone-700">
                <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{new Date(project.event_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            )}
          </div>

          {/* Progress Bar & Deliverables Count */}
          <div className="flex items-center gap-4 max-w-md pt-1">
            <div className="flex-1 bg-slate-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden border border-slate-200/80 dark:border-stone-700">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-black text-slate-700 dark:text-stone-300 whitespace-nowrap">
              {progressPercent}% <span className="text-slate-400 font-medium text-[11px]">({completedCount}/{totalCount} Done)</span>
            </span>
          </div>
        </div>

        {/* Header Right Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* PM Selector */}
          <div className="w-48">
            <Searchable3DCreamSelect
              value={project.project_manager_name || 'unassigned'}
              onChange={(val) => {
                const matched = teamMembers.find(m => m.name === val || m.id === val);
                onUpdateProject(project.id, {
                  project_manager_id: val === 'unassigned' ? null : (matched?.id || null),
                  project_manager_name: val === 'unassigned' ? null : (matched?.name || val),
                });
              }}
              options={pmOptions}
              searchable={true}
              searchPlaceholder="🔍 Search PM..."
              placeholder="Assign PM"
              usePortal={true}
            />
          </div>

          {/* Select Final Quotation Trigger */}
          <button
            type="button"
            onClick={() => {
              if (matchingQuotations.length > 0) {
                setSelectedQuotationId(matchingQuotations[0].id);
              }
              setShowQuotationModal(true);
            }}
            className="px-3.5 py-2 text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100/70 hover:bg-amber-200/80 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 border border-amber-300/80 dark:border-amber-800 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{project.quotation_title ? 'Quotation Synced' : 'Select Final Quotation'}</span>
            {project.quotation_title && <Check className="w-3 h-3 text-emerald-600" />}
          </button>

          {/* Expand/Collapse Toggle */}
          <button
            type="button"
            onClick={onToggleExpand}
            className="p-2 rounded-xl bg-white dark:bg-stone-800 border border-[#EAE5DA] dark:border-stone-700 text-slate-600 dark:text-stone-300 hover:text-slate-900 hover:border-amber-400 transition cursor-pointer shadow-2xs"
            title={isExpanded ? 'Collapse Deliverables' : 'Expand Deliverables'}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── CARD BODY (COLLAPSIBLE DELIVERABLES ENGINE) ── */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="p-5 sm:p-6 space-y-6"
          >
            {/* Segment Switcher Tabs */}
            <div className="flex items-center justify-between border-b border-[#EAE5DA] dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-stone-200">
                  Deliverables Architecture
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-[#F8F6F0] dark:bg-stone-900 p-1 rounded-xl border border-[#EAE5DA] dark:border-stone-800">
                {(['All', 'Pre-Wedding', 'Wedding'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveSegmentTab(tab)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeSegmentTab === tab
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-stone-400 hover:text-slate-900'
                    }`}
                  >
                    {tab === 'All' ? 'All Segments' : `${tab} Segment`}
                  </button>
                ))}
              </div>
            </div>

            {/* SEGMENT 1: PRE-WEDDING BLOCK */}
            {(activeSegmentTab === 'All' || activeSegmentTab === 'Pre-Wedding') && (
              <div className="space-y-3 bg-[#FFFDF9] dark:bg-[#1A1816] p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💍</span>
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                      Pre-Wedding Segment
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-stone-400">
                    {preWeddingPhotos.length + preWeddingVideos.length + preWeddingAlbums.length} Deliverables
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <DeliverableCategorySection
                    segment="Pre-Wedding"
                    category="Photos"
                    items={preWeddingPhotos}
                    teamMembers={teamMembers}
                    onUpdateItem={handleUpdateItem}
                    onDeleteItem={handleDeleteItem}
                    onAddItem={handleAddItem}
                    onOpenComments={onOpenComments}
                    onOpenDrive={onOpenDrive}
                  />

                  <DeliverableCategorySection
                    segment="Pre-Wedding"
                    category="Videos"
                    items={preWeddingVideos}
                    teamMembers={teamMembers}
                    onUpdateItem={handleUpdateItem}
                    onDeleteItem={handleDeleteItem}
                    onAddItem={handleAddItem}
                    onOpenComments={onOpenComments}
                    onOpenDrive={onOpenDrive}
                  />

                  <DeliverableCategorySection
                    segment="Pre-Wedding"
                    category="Albums"
                    items={preWeddingAlbums}
                    teamMembers={teamMembers}
                    onUpdateItem={handleUpdateItem}
                    onDeleteItem={handleDeleteItem}
                    onAddItem={handleAddItem}
                    onOpenComments={onOpenComments}
                    onOpenDrive={onOpenDrive}
                  />
                </div>
              </div>
            )}

            {/* SEGMENT 2: WEDDING BLOCK */}
            {(activeSegmentTab === 'All' || activeSegmentTab === 'Wedding') && (
              <div className="space-y-3 bg-[#FFFDF9] dark:bg-[#1A1816] p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/40 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💒</span>
                    <h3 className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                      Wedding Segment
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-stone-400">
                    {weddingPhotos.length + weddingVideos.length + weddingAlbums.length} Deliverables
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <DeliverableCategorySection
                    segment="Wedding"
                    category="Photos"
                    items={weddingPhotos}
                    teamMembers={teamMembers}
                    onUpdateItem={handleUpdateItem}
                    onDeleteItem={handleDeleteItem}
                    onAddItem={handleAddItem}
                    onOpenComments={onOpenComments}
                    onOpenDrive={onOpenDrive}
                  />

                  <DeliverableCategorySection
                    segment="Wedding"
                    category="Videos"
                    items={weddingVideos}
                    teamMembers={teamMembers}
                    onUpdateItem={handleUpdateItem}
                    onDeleteItem={handleDeleteItem}
                    onAddItem={handleAddItem}
                    onOpenComments={onOpenComments}
                    onOpenDrive={onOpenDrive}
                  />

                  <DeliverableCategorySection
                    segment="Wedding"
                    category="Albums"
                    items={weddingAlbums}
                    teamMembers={teamMembers}
                    onUpdateItem={handleUpdateItem}
                    onDeleteItem={handleDeleteItem}
                    onAddItem={handleAddItem}
                    onOpenComments={onOpenComments}
                    onOpenDrive={onOpenDrive}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SELECT FINAL QUOTATION MODAL ── */}
      <AnimatePresence>
        {showQuotationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#FFFDF9] dark:bg-[#1C1A17] rounded-2xl border border-[#EAE5DA] dark:border-stone-800 shadow-2xl max-w-lg w-full p-6 space-y-4 text-slate-900 dark:text-stone-100"
            >
              <div className="flex items-center justify-between border-b border-[#EAE5DA] dark:border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-black uppercase tracking-wide">
                    Select Final Quotation for Sync
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuotationModal(false)}
                  className="text-slate-400 hover:text-slate-700 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-stone-400 leading-relaxed">
                Syncing a quotation automatically parses all deliverables and splits them into <strong>Pre-Wedding</strong> (Photos, Videos, Albums) and <strong>Wedding</strong> (Photos, Videos, Albums).
                <br />
                <span className="text-amber-800 dark:text-amber-300 font-bold">
                  Decoupled Architecture:
                </span> Deliverables are copied safely. Edits or status adjustments made here will never affect the original quotation.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-stone-300">
                  Available Quotations for &quot;{project.client_name}&quot;:
                </label>

                {quotations.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-[#EAE5DA] text-center text-xs text-slate-500">
                    No quotations found in studio database.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {quotations.map(q => {
                      const isSelected = selectedQuotationId === q.id;
                      const isClientMatch = matchingQuotations.some(mq => mq.id === q.id);
                      return (
                        <div
                          key={q.id}
                          onClick={() => setSelectedQuotationId(q.id)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-900 dark:text-amber-200 shadow-xs'
                              : 'bg-white dark:bg-stone-900 border-[#EAE5DA] dark:border-stone-800 text-slate-700 dark:text-stone-300 hover:border-amber-300'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{q.title || q.quotation_number || 'Quotation'}</span>
                              {q.is_final && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-800">
                                  FINAL
                                </span>
                              )}
                              {isClientMatch && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-100 text-blue-800">
                                  Client Match
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-stone-400">
                              Client: {q.client_name} • Total: ₹{(q.total_amount || 0).toLocaleString('en-IN')}
                            </p>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAE5DA] dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowQuotationModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSyncQuotation}
                  disabled={!selectedQuotationId || isSyncing}
                  className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  {isSyncing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Sync & Decouple Deliverables</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
