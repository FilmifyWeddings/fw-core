'use client';

import React, { useState } from 'react';
import { 
  Camera, Video, BookOpen, Plus, Trash2, Calendar, Link2, 
  MessageSquare, CheckCircle2, Clock, Sparkles, AlertCircle
} from 'lucide-react';
import Searchable3DCreamSelect, { Searchable3DCreamSelectOption } from '@/components/ui/Searchable3DCreamSelect';

export interface PostProductionDeliverable {
  id: string;
  project_id?: string;
  segment: 'Pre-Wedding' | 'Wedding';
  category: 'Photos' | 'Videos' | 'Albums';
  title: string;
  status: 'Upcoming' | 'In Progress' | 'Under Review' | 'Done' | string;
  assigned_member_id?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
  deadline?: string | null;
  notes?: string | null;
  drive_link?: string | null;
  comments?: any[];
  count?: string | number | null;
}

interface DeliverableCategorySectionProps {
  segment: 'Pre-Wedding' | 'Wedding';
  category: 'Photos' | 'Videos' | 'Albums';
  items: PostProductionDeliverable[];
  teamMembers: { id: string; name: string; role?: string }[];
  onUpdateItem: (itemId: string, field: keyof PostProductionDeliverable, value: any) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (segment: 'Pre-Wedding' | 'Wedding', category: 'Photos' | 'Videos' | 'Albums', title: string) => void;
  onOpenComments?: (itemId: string, title: string) => void;
  onOpenDrive?: (itemId: string, currentLink: string) => void;
}

// Status Options with Luxury 3D Cream Pills
const STATUS_OPTIONS: Searchable3DCreamSelectOption[] = [
  {
    value: 'Upcoming',
    label: 'Upcoming',
    badge: 'Upcoming',
    badgeClassName: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
  },
  {
    value: 'In Progress',
    label: 'In Progress',
    badge: 'In Progress',
    badgeClassName: 'bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800',
  },
  {
    value: 'Under Review',
    label: 'Under Review',
    badge: 'Review',
    badgeClassName: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
  },
  {
    value: 'Done',
    label: 'Done',
    badge: 'Done',
    badgeClassName: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
  },
];

export default function DeliverableCategorySection({
  segment,
  category,
  items,
  teamMembers,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onOpenComments,
  onOpenDrive,
}: DeliverableCategorySectionProps) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  // Category Theme Icons & Colors
  const getCategoryConfig = () => {
    switch (category) {
      case 'Photos':
        return {
          icon: <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
          title: 'Photos Deliverables',
          badge: '📸 Stills & Retouching',
          accent: 'border-indigo-200 bg-indigo-50/40 text-indigo-800 dark:bg-indigo-950/20 dark:text-indigo-300 dark:border-indigo-900',
          defaultCount: '500 Photos',
        };
      case 'Videos':
        return {
          icon: <Video className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
          title: 'Videos Deliverables',
          badge: '🎬 Films, Teasers & Reels',
          accent: 'border-rose-200 bg-rose-50/40 text-rose-800 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900',
          defaultCount: 'Full Length & Teaser',
        };
      case 'Albums':
        return {
          icon: <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
          title: 'Albums Deliverables',
          badge: '📖 Photobooks & Prints',
          accent: 'border-amber-200 bg-amber-50/40 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900',
          defaultCount: '40 Sheets Photobook',
        };
    }
  };

  const config = getCategoryConfig();

  // Team Member Options
  const teamMemberOptions: Searchable3DCreamSelectOption[] = [
    {
      value: 'unassigned',
      label: 'Unassigned',
      badge: 'Unassigned',
      badgeClassName: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
    },
    ...teamMembers.map(m => ({
      value: m.id || m.name,
      label: m.name,
      badge: m.role || 'Team Member',
    })),
  ];

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddItem(segment, category, newTitle.trim());
    setNewTitle('');
    setIsAddingItem(false);
  };

  // Helper to normalize status
  const normalizeStatus = (statusStr?: string) => {
    if (!statusStr) return 'Upcoming';
    const s = statusStr.toLowerCase();
    if (s.includes('done') || s.includes('complete')) return 'Done';
    if (s.includes('review')) return 'Under Review';
    if (s.includes('progress')) return 'In Progress';
    return 'Upcoming';
  };

  return (
    <div className="bg-[#FCFAF7] dark:bg-[#1C1A17] rounded-xl border border-[#EAE5DA] dark:border-stone-800/80 p-4 space-y-3 shadow-xs">
      {/* Category Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#EAE5DA] dark:border-stone-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-800 shadow-2xs">
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black text-slate-800 dark:text-stone-100 uppercase tracking-wide">
                {config.title}
              </h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.accent}`}>
                {items.length} {items.length === 1 ? 'Item' : 'Items'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-stone-400 font-medium">
              {config.badge}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingItem(true)}
          className="px-2.5 py-1 text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100/70 dark:bg-amber-950/50 hover:bg-amber-200/80 border border-amber-300 dark:border-amber-800 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Deliverable</span>
        </button>
      </div>

      {/* Add Deliverable Inline Form */}
      {isAddingItem && (
        <form onSubmit={handleCreateNew} className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-amber-300 dark:border-amber-700/60 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-stone-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              New {segment} {category} Deliverable
            </span>
            <button
              type="button"
              onClick={() => setIsAddingItem(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              Cancel
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              placeholder={`e.g. ${category === 'Photos' ? '50 Edited Pictures' : category === 'Videos' ? 'Teaser Film (1 Min)' : 'Main 40-Sheet Photobook'}`}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs font-medium bg-[#FDFBF7] dark:bg-stone-800 border border-[#EAE5DA] dark:border-stone-700 rounded-lg text-slate-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition cursor-pointer shadow-xs"
            >
              Add
            </button>
          </div>
        </form>
      )}

      {/* Deliverable Items List */}
      {items.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-[#EAE5DA] dark:border-stone-800 text-center bg-white/50 dark:bg-stone-900/30 space-y-2">
          <p className="text-xs text-slate-500 dark:text-stone-400 font-medium">
            No {category.toLowerCase()} deliverables created for {segment}.
          </p>
          <button
            type="button"
            onClick={() => setIsAddingItem(true)}
            className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Create First {category} Item</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const currentStatus = normalizeStatus(item.status);
            const currentAssignee = item.assigned_member_id || item.assigned_to || 'unassigned';
            const dueDate = item.due_date || item.deadline || '';
            const commentCount = item.comments?.length || 0;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-stone-900/90 rounded-xl border border-[#EAE5DA] dark:border-stone-800/80 p-3 shadow-2xs hover:border-amber-300/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                {/* Deliverable Title & Count */}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => onUpdateItem(item.id, 'title', e.target.value)}
                      className="text-xs font-black text-slate-900 dark:text-stone-100 bg-transparent border-b border-transparent hover:border-[#EAE5DA] focus:border-amber-400 focus:outline-none transition truncate w-full"
                    />
                  </div>
                  {item.count && (
                    <span className="text-[10px] font-bold text-slate-500 dark:text-stone-400 bg-slate-100 dark:bg-stone-800 px-2 py-0.5 rounded">
                      {item.count}
                    </span>
                  )}
                </div>

                {/* 3D Cream Status, Assignee, Due Date & Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Status Dropdown */}
                  <div className="w-36">
                    <Searchable3DCreamSelect
                      value={currentStatus}
                      onChange={(val) => onUpdateItem(item.id, 'status', val)}
                      options={STATUS_OPTIONS}
                      usePortal={true}
                    />
                  </div>

                  {/* Assign Member Dropdown with Portal Anchor */}
                  <div className="w-44">
                    <Searchable3DCreamSelect
                      value={currentAssignee}
                      onChange={(val) => {
                        const matched = teamMembers.find(m => m.id === val || m.name === val);
                        onUpdateItem(item.id, 'assigned_member_id', val === 'unassigned' ? null : (matched?.id || val));
                        onUpdateItem(item.id, 'assigned_to', val === 'unassigned' ? null : (matched?.name || val));
                      }}
                      options={teamMemberOptions}
                      searchable={true}
                      searchPlaceholder="🔍 Search crew member..."
                      placeholder="Assign Crew"
                      usePortal={true}
                    />
                  </div>

                  {/* Due Date Picker */}
                  <div className="flex items-center gap-1 bg-[#FDFBF7] dark:bg-stone-800 px-2 py-1.5 rounded-xl border border-[#EAE5DA] dark:border-stone-700 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-stone-500" />
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => {
                        onUpdateItem(item.id, 'due_date', e.target.value);
                        onUpdateItem(item.id, 'deadline', e.target.value);
                      }}
                      className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-stone-200 focus:outline-none cursor-pointer"
                    />
                  </div>

                  {/* Drive Link Action */}
                  {onOpenDrive && (
                    <button
                      type="button"
                      onClick={() => onOpenDrive(item.id, item.drive_link || '')}
                      title={item.drive_link ? 'View / Edit Drive Link' : 'Add Drive Link'}
                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                        item.drive_link
                          ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 text-sky-600'
                          : 'bg-white dark:bg-stone-800 border-[#EAE5DA] dark:border-stone-700 text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <Link2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Comments Action */}
                  {onOpenComments && (
                    <button
                      type="button"
                      onClick={() => onOpenComments(item.id, item.title)}
                      title="Deliverable Notes & Comments"
                      className="p-1.5 rounded-lg border border-[#EAE5DA] dark:border-stone-700 bg-white dark:bg-stone-800 text-slate-500 hover:text-amber-600 transition cursor-pointer relative"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {commentCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-white font-black text-[9px] flex items-center justify-center">
                          {commentCount}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Delete Item Action */}
                  <button
                    type="button"
                    onClick={() => onDeleteItem(item.id)}
                    title="Delete Deliverable"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
