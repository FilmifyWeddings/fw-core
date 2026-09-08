'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, Calendar, Layers, FileCheck, Plus, Sparkles, UserCheck, Search, X
} from 'lucide-react';
import { PostProductionDeliverable } from './DeliverableCategorySection';
import SegmentContainer from './SegmentContainer';
import Searchable3DCreamSelect, { Searchable3DCreamSelectOption } from '@/components/ui/Searchable3DCreamSelect';
import { DEFAULT_EVENT_TYPES } from '@/lib/workspace-settings';
import PostProductionConfirmModal from './PostProductionConfirmModal';

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
  enabled_segments?: string[];
  disabled_categories?: Record<string, string[]>;
}

interface PostProductionCardProps {
  project: PostProductionProjectData;
  teamMembers: { id: string; name: string; role?: string }[];
  quotations: any[];
  eventTypes?: { id?: string; name: string; category?: string }[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateProject: (projectId: string, updated: Partial<PostProductionProjectData>) => void;
  onOpenComments: (itemId: string, title: string) => void;
  onOpenDrive: (itemId: string, currentLink: string) => void;
}

export default function PostProductionCard({
  project,
  teamMembers,
  quotations,
  eventTypes,
  isExpanded,
  onToggleExpand,
  onUpdateProject,
  onOpenComments,
  onOpenDrive,
}: PostProductionCardProps) {
  const [activeSegmentTab, setActiveSegmentTab] = useState<string>('All');
  const [isAddingSegment, setIsAddingSegment] = useState(false);
  const [segmentSearchQuery, setSegmentSearchQuery] = useState('');
  const [segmentToDelete, setSegmentToDelete] = useState<string | null>(null);

  const deliverables = useMemo(() => project.deliverables || [], [project.deliverables]);

  // Compute enabled segments:
  // If explicitly specified in project, use it.
  // Otherwise, automatically derive from deliverables or default to ['Wedding']
  const enabledSegments = useMemo(() => {
    if (project.enabled_segments && project.enabled_segments.length > 0) {
      return project.enabled_segments;
    }

    const discovered = new Set<string>();
    // Default Wedding
    discovered.add('Wedding');

    // Add Pre-Wedding ONLY if there are Pre-Wedding deliverables present
    if (deliverables.some(d => d.segment === 'Pre-Wedding')) {
      discovered.add('Pre-Wedding');
    }

    // Add any other segments found in deliverables
    deliverables.forEach(d => {
      if (d.segment) discovered.add(d.segment);
    });

    return Array.from(discovered);
  }, [project.enabled_segments, deliverables]);

  // Overall Completion Progress
  const totalCount = deliverables.length;
  const completedCount = deliverables.filter(d => {
    const s = (d.status || '').toLowerCase();
    return s.includes('done') || s.includes('complete');
  }).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Overall status styling
  const statusBadgeStyle = (() => {
    switch (project.overall_status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
      case 'delayed':
        return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
    }
  })();

  // PM Options with wide display and role tags
  const pmOptions: Searchable3DCreamSelectOption[] = useMemo(() => {
    return [
      {
        value: 'unassigned',
        label: 'Unassigned (No PM)',
        badge: 'None',
        badgeClassName: 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300',
      },
      ...teamMembers.map(m => {
        const initials = m.name
          .split(' ')
          .map(w => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        return {
          value: m.name,
          label: m.name,
          initials,
          roleTag: m.role || 'Member',
        };
      }),
    ];
  }, [teamMembers]);

  // Handle Deliverable Item Update
  const handleUpdateItem = (itemId: string, field: keyof PostProductionDeliverable, value: any) => {
    const updated = deliverables.map(item => {
      if (item.id === itemId) {
        return { ...item, [field]: value };
      }
      return item;
    });

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
  const handleAddItem = (segment: string, category: string, title: string) => {
    const newItem: PostProductionDeliverable = {
      id: 'deliv_' + Date.now() + '_' + Math.random().toString(36).substring(7),
      project_id: project.project_id || undefined,
      segment,
      category,
      title,
      status: 'Upcoming',
      assigned_member_id: null,
      assigned_to: null,
      due_date: null,
      is_custom: true,
    };

    const updated = [...deliverables, newItem];
    onUpdateProject(project.id, { deliverables: updated });
  };

  // Handle Remove / Hide Category in a Segment
  const handleRemoveCategory = (segment: string, category: string) => {
    const currentDisabled = project.disabled_categories || {};
    const segDisabled = currentDisabled[segment] || [];
    const nextDisabled = {
      ...currentDisabled,
      [segment]: Array.from(new Set([...segDisabled, category])),
    };

    onUpdateProject(project.id, { disabled_categories: nextDisabled });
  };

  // Handle Add / Restore Category in a Segment
  const handleAddCategory = (segment: string, category: string) => {
    const currentDisabled = project.disabled_categories || {};
    const segDisabled = (currentDisabled[segment] || []).filter(c => c !== category);
    const nextDisabled = {
      ...currentDisabled,
      [segment]: segDisabled,
    };

    onUpdateProject(project.id, { disabled_categories: nextDisabled });
  };

  // Studio settings event types sync
  const studioEventTypes = useMemo(() => {
    const list = eventTypes && eventTypes.length > 0 ? eventTypes : DEFAULT_EVENT_TYPES;
    return list.map(e => ({
      name: e.name.trim(),
      category: e.category || 'Event',
    }));
  }, [eventTypes]);

  // Available event types that are not yet enabled
  const availableEventTypes = useMemo(() => {
    const enabledLower = new Set(enabledSegments.map(s => s.toLowerCase()));
    const q = segmentSearchQuery.toLowerCase().trim();

    return studioEventTypes.filter(ev => {
      if (enabledLower.has(ev.name.toLowerCase())) return false;
      if (!q) return true;
      return ev.name.toLowerCase().includes(q) || ev.category.toLowerCase().includes(q);
    });
  }, [studioEventTypes, enabledSegments, segmentSearchQuery]);

  const isQueryCustom = useMemo(() => {
    const q = segmentSearchQuery.trim();
    if (!q) return false;
    const enabledLower = new Set(enabledSegments.map(s => s.toLowerCase()));
    return !enabledLower.has(q.toLowerCase());
  }, [segmentSearchQuery, enabledSegments]);

  // Handle Add Segment (from studio settings or custom name)
  const handleAddSegment = (segName: string) => {
    const trimmed = segName.trim();
    if (!trimmed) return;
    if (enabledSegments.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setActiveSegmentTab(trimmed);
      setIsAddingSegment(false);
      setSegmentSearchQuery('');
      return;
    }
    const next = [...enabledSegments, trimmed];
    onUpdateProject(project.id, { enabled_segments: next });
    setActiveSegmentTab(trimmed);
    setIsAddingSegment(false);
    setSegmentSearchQuery('');
  };

  // Handle Remove Entire Segment
  const handleRemoveSegment = (segName: string) => {
    const nextSegments = enabledSegments.filter(s => s !== segName);
    // Hide or filter deliverables of this segment
    const updatedDeliverables = deliverables.filter(d => d.segment !== segName);

    onUpdateProject(project.id, {
      enabled_segments: nextSegments,
      deliverables: updatedDeliverables,
    });

    if (activeSegmentTab === segName) {
      setActiveSegmentTab('All');
    }
  };

  // Segments to render in the body
  const segmentsToRender = useMemo(() => {
    if (activeSegmentTab === 'All') {
      return enabledSegments;
    }
    return enabledSegments.filter(s => s === activeSegmentTab);
  }, [enabledSegments, activeSegmentTab]);

  return (
    <div className="bg-[#FFFDF9] dark:bg-[#181614] rounded-2xl border border-[#EAE5DA] dark:border-stone-800 shadow-xs overflow-hidden transition-all hover:border-amber-300/80">
      {/* ── CARD HEADER (FULL-CLICK ACCORDION TRIGGER) ── */}
      <div 
        onClick={onToggleExpand}
        className="p-5 sm:p-6 bg-gradient-to-r from-amber-50/40 via-[#FFFDF9] to-amber-50/20 dark:from-stone-900 dark:via-[#181614] dark:to-stone-900 border-b border-[#EAE5DA] dark:border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none transition-colors hover:bg-amber-50/20"
      >
        {/* Left Client & Event Info */}
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-black text-slate-900 dark:text-stone-100 tracking-tight truncate">
              {project.client_name}
            </h2>

            {project.couple_names && (
              <span className="text-xs font-bold text-slate-500 dark:text-stone-400 truncate">
                ({project.couple_names})
              </span>
            )}

            {/* Overall Status Badge */}
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${statusBadgeStyle}`}>
              {project.overall_status === 'completed' ? 'Completed' : project.overall_status === 'delayed' ? 'Delayed' : 'Active'}
            </span>

            {/* Event Type & Date */}
            {project.event_date && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-stone-300 bg-[#FDFBF7] dark:bg-stone-800/80 px-2.5 py-1 rounded-xl border border-[#EAE5DA] dark:border-stone-700">
                <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{new Date(project.event_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            )}

            {/* Synced Quotation Indicator */}
            {project.quotation_title && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span className="truncate max-w-[160px]">{project.quotation_title}</span>
              </div>
            )}
          </div>

          {/* Dynamic Progress Bar & Deliverables Ratio */}
          <div className="flex items-center gap-4 max-w-md pt-1">
            <div className="flex-1 bg-slate-100 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden border border-slate-200/80 dark:border-stone-700">
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

        {/* Header Right Controls: PM Selector & Chevron Toggle */}
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="flex items-center gap-3 shrink-0"
        >
          {/* PM Selector with Explicit PM: Badge & Wide Popover */}
          <div className="flex items-center gap-2 bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-800 px-3 py-1.5 rounded-xl shadow-2xs">
            <div className="flex items-center gap-1.5 shrink-0 text-amber-900 dark:text-amber-300">
              <UserCheck className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[11px] font-black tracking-wider uppercase">PM:</span>
            </div>
            <div className="w-48 sm:w-56">
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
              />
            </div>
          </div>

          {/* Expand/Collapse Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-[#EAE5DA] dark:border-stone-700 text-slate-600 dark:text-stone-300 hover:text-slate-900 hover:border-amber-400 transition cursor-pointer shadow-2xs"
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
            {/* Deliverables Architecture Toolbar & Segment Switcher Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAE5DA] dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-stone-200">
                  Deliverables Architecture
                </span>
              </div>

              {/* Segment Tabs & + Add Custom Segment */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-[#F8F6F0] dark:bg-stone-900 p-1 rounded-xl border border-[#EAE5DA] dark:border-stone-800 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveSegmentTab('All')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeSegmentTab === 'All'
                        ? 'bg-white dark:bg-stone-800 text-amber-900 dark:text-amber-300 shadow-2xs'
                        : 'text-slate-600 dark:text-stone-400 hover:text-slate-900'
                    }`}
                  >
                    All Segments
                  </button>

                  {enabledSegments.map(seg => {
                    const isSelected = activeSegmentTab === seg;
                    const segIcon = seg === 'Pre-Wedding' ? '💍' : seg === 'Wedding' ? '💒' : '✨';

                    return (
                      <div
                        key={seg}
                        className={`group/tab inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                          isSelected
                            ? 'bg-white dark:bg-stone-800 text-amber-900 dark:text-amber-300 shadow-2xs'
                            : 'text-slate-600 dark:text-stone-400 hover:text-slate-900'
                        }`}
                      >
                        <span
                          onClick={() => setActiveSegmentTab(seg)}
                          className="cursor-pointer select-none"
                        >
                          {segIcon} {seg}
                        </span>

                        {/* Subtle ✕ close trigger */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSegmentToDelete(seg);
                          }}
                          className="text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-0.5 rounded transition cursor-pointer"
                          title={`Remove ${seg} segment`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* + Add Custom Segment Searchable 3D Popover Trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingSegment(prev => !prev);
                      setSegmentSearchQuery('');
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100/70 dark:bg-amber-950/50 hover:bg-amber-200/80 border border-amber-300 dark:border-amber-800 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Custom Segment</span>
                  </button>

                  {isAddingSegment && (
                    <div 
                      className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-[#FFFDF9] dark:bg-[#1C1A17] border border-amber-300/80 dark:border-amber-700/80 rounded-2xl shadow-2xl z-[100] p-3 space-y-2.5 font-sans"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between border-b border-[#EAE5DA] dark:border-stone-800 pb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          Add Event Segment
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingSegment(false);
                            setSegmentSearchQuery('');
                          }}
                          className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Search Input */}
                      <div className="relative flex items-center">
                        <Search className="w-3.5 h-3.5 text-slate-400 dark:text-stone-500 absolute left-2.5 pointer-events-none" />
                        <input
                          type="text"
                          autoFocus
                          value={segmentSearchQuery}
                          onChange={(e) => setSegmentSearchQuery(e.target.value)}
                          placeholder="🔍 Search or type event (e.g. Haldi)..."
                          className="w-full h-8 pl-8 pr-2.5 text-xs font-bold bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl text-slate-800 dark:text-stone-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (segmentSearchQuery.trim()) {
                                handleAddSegment(segmentSearchQuery.trim());
                              }
                            } else if (e.key === 'Escape') {
                              setIsAddingSegment(false);
                            }
                          }}
                        />
                      </div>

                      {/* Direct Add Custom if typed */}
                      {isQueryCustom && (
                        <button
                          type="button"
                          onClick={() => handleAddSegment(segmentSearchQuery.trim())}
                          className="w-full py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black transition cursor-pointer flex items-center justify-between shadow-2xs"
                        >
                          <span className="truncate">Add &quot;{segmentSearchQuery.trim()}&quot;</span>
                          <span className="text-[10px] uppercase bg-white/20 px-1.5 py-0.5 rounded font-bold">Custom</span>
                        </button>
                      )}

                      {/* Studio Settings Synced Events List */}
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-stone-500 px-1 pt-1">
                          Studio Event Categories
                        </div>
                        {availableEventTypes.length > 0 ? (
                          availableEventTypes.map((ev) => (
                            <button
                              key={ev.name}
                              type="button"
                              onClick={() => handleAddSegment(ev.name)}
                              className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-stone-800 hover:text-amber-900 dark:hover:text-amber-300 transition flex items-center justify-between cursor-pointer group"
                            >
                              <span className="group-hover:translate-x-0.5 transition-transform">✨ {ev.name}</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700">
                                {ev.category}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="text-[11px] text-slate-400 italic px-1 py-2 text-center">
                            {segmentSearchQuery ? 'No matching studio event types' : 'All standard event types added'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── VERTICAL STACK OF CONFIGURED SEGMENTS ── */}
            {segmentsToRender.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-[#EAE5DA] dark:border-stone-800 space-y-2">
                <p className="text-xs text-slate-500 dark:text-stone-400 font-medium">
                  No active segments configured for this client project.
                </p>
                <button
                  type="button"
                  onClick={() => onUpdateProject(project.id, { enabled_segments: ['Wedding'] })}
                  className="px-3 py-1.5 text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-xl cursor-pointer"
                >
                  Enable Wedding Segment
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {segmentsToRender.map(segName => {
                  const segDeliverables = deliverables.filter(d => {
                    if (segName === 'Wedding') {
                      return d.segment === 'Wedding' || (!d.segment && d.segment !== 'Pre-Wedding');
                    }
                    return d.segment === segName;
                  });

                  const disabledCats = project.disabled_categories?.[segName] || [];

                  return (
                    <SegmentContainer
                      key={segName}
                      segmentName={segName}
                      deliverables={segDeliverables}
                      teamMembers={teamMembers}
                      disabledCategories={disabledCats}
                      onUpdateItem={handleUpdateItem}
                      onDeleteItem={handleDeleteItem}
                      onAddItem={handleAddItem}
                      onRemoveCategory={handleRemoveCategory}
                      onAddCategory={handleAddCategory}
                      onRemoveSegment={handleRemoveSegment}
                      onOpenComments={onOpenComments}
                      onOpenDrive={onOpenDrive}
                    />
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Segment Removal 3D Confirmation Modal */}
      <PostProductionConfirmModal
        isOpen={Boolean(segmentToDelete)}
        onClose={() => setSegmentToDelete(null)}
        onConfirm={() => {
          if (segmentToDelete) {
            handleRemoveSegment(segmentToDelete);
            setSegmentToDelete(null);
          }
        }}
        title={`Remove "${segmentToDelete}" Segment?`}
        message={`Are you sure you want to remove the "${segmentToDelete}" segment and its deliverable(s) for this client? You can re-enable this segment anytime from "+ Add Custom Segment".`}
        confirmText="Remove Segment"
      />
    </div>
  );
}
