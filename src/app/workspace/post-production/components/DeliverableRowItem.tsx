'use client';

import React, { useState } from 'react';
import { 
  Camera, Video, BookOpen, Calendar, Trash2, Edit3, 
  MessageSquare, Link2, Check, Sparkles
} from 'lucide-react';
import { PostProductionDeliverable } from './DeliverableCategorySection';
import Searchable3DCreamSelect, { Searchable3DCreamSelectOption } from '@/components/ui/Searchable3DCreamSelect';
import PostProductionConfirmModal from './PostProductionConfirmModal';

interface DeliverableRowItemProps {
  item: PostProductionDeliverable;
  teamMembers: { id: string; name: string; role?: string }[];
  onUpdateItem: (itemId: string, field: keyof PostProductionDeliverable, value: any) => void;
  onDeleteItem: (itemId: string) => void;
  onOpenComments: (itemId: string, title: string) => void;
  onOpenDrive?: (itemId: string, currentLink: string) => void;
}

const getRoleShortCode = (role?: string) => {
  if (!role) return 'CR';
  const r = role.toLowerCase();
  if (r.includes('sales')) return 'SP';
  if (r.includes('editor')) return 'ED';
  if (r.includes('candid photo')) return 'CP';
  if (r.includes('cinemat')) return 'CV';
  if (r.includes('drone')) return 'DP';
  if (r.includes('traditional photo')) return 'TP';
  if (r.includes('traditional video')) return 'TV';
  if (r.includes('assistant')) return 'AS';
  if (r.includes('reels') || r.includes('social')) return 'RC';
  if (r.includes('family photo')) return 'FP';
  if (r.includes('manager') || r.includes('lead') || r.includes('owner')) return 'PM';
  return role.slice(0, 2).toUpperCase();
};

const STATUS_OPTIONS: Searchable3DCreamSelectOption[] = [
  {
    value: 'Upcoming',
    label: '🟡 Upcoming',
    badge: 'Pending',
    badgeClassName: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
  },
  {
    value: 'In Progress',
    label: '🔵 In Progress',
    badge: 'Active',
    badgeClassName: 'bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800',
  },
  {
    value: 'Under Review',
    label: '🟣 Under Review',
    badge: 'Review',
    badgeClassName: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
  },
  {
    value: 'Done',
    label: '🟢 Done',
    badge: 'Done',
    badgeClassName: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
  },
];

export default function DeliverableRowItem({
  item,
  teamMembers,
  onUpdateItem,
  onDeleteItem,
  onOpenComments,
  onOpenDrive,
}: DeliverableRowItemProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(item.title);

  const [isEditingSpec, setIsEditingSpec] = useState(false);
  const [specInput, setSpecInput] = useState(String(item.specs ?? item.count ?? ''));

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Synchronize specInput when item changes
  React.useEffect(() => {
    setSpecInput(String(item.specs ?? item.count ?? ''));
  }, [item.specs, item.count]);

  // Normalize status
  const currentStatus = (() => {
    const s = (item.status || '').toLowerCase();
    if (s.includes('done') || s.includes('complete')) return 'Done';
    if (s.includes('review')) return 'Under Review';
    if (s.includes('progress')) return 'In Progress';
    return 'Upcoming';
  })();

  // Current Assignee
  const currentAssignee = item.assigned_member_id || item.assigned_to || 'unassigned';

  // Team Member Options with Searchable 3D cream specs
  const teamMemberOptions: Searchable3DCreamSelectOption[] = [
    {
      value: 'unassigned',
      label: 'Unassigned',
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
        value: m.id || m.name,
        label: m.name,
        initials,
        roleTag: `[${getRoleShortCode(m.role)}]`,
      };
    }),
  ];

  // Deadline calculation
  const dueDateStr = item.due_date || item.deadline || '';
  const deadlineInfo = (() => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr);
    if (isNaN(due.getTime())) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isDone = currentStatus === 'Done';

    if (isDone) {
      return {
        label: 'Done',
        className: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
        isOverdue: false,
      };
    }

    if (diffDays < 0) {
      return {
        label: `Overdue ${Math.abs(diffDays)}d`,
        className: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse font-black',
        isOverdue: true,
      };
    }

    if (diffDays === 0) {
      return {
        label: 'Due Today',
        className: 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-black',
        isOverdue: false,
      };
    }

    return {
      label: `${diffDays}d left`,
      className: 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 font-bold',
      isOverdue: false,
    };
  })();

  const commentCount = item.comments_count ?? (item.comments?.length || 0);

  const handleSaveTitle = () => {
    if (titleInput.trim() && titleInput.trim() !== item.title) {
      onUpdateItem(item.id, 'title', titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const handleSaveSpec = () => {
    const clean = specInput.trim();
    onUpdateItem(item.id, 'specs', clean || null);
    onUpdateItem(item.id, 'count', clean || null);
    setIsEditingSpec(false);
  };

  // Category Icon
  const getCategoryIcon = () => {
    switch (item.category) {
      case 'Photos':
        return <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'Videos':
        return <Video className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case 'Albums':
        return <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    }
  };

  return (
    <div className="bg-[#FFFDF9] dark:bg-[#1A1816] border border-[#EAE5DA] dark:border-stone-800/90 rounded-xl p-3 hover:shadow-md hover:border-amber-400/60 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      {/* ── 1. TITLE & SPECS (INLINE EDITABLE) ── */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 shrink-0 shadow-2xs">
          {getCategoryIcon()}
        </div>

        <div className="min-w-0 flex-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setTitleInput(item.title);
                    setIsEditingTitle(false);
                  }
                }}
                className="w-full px-2.5 py-1 text-xs font-black bg-white dark:bg-stone-900 border border-amber-400 rounded-lg text-slate-900 dark:text-stone-100 focus:outline-none shadow-2xs"
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 cursor-pointer shrink-0 shadow-2xs"
                title="Save Title"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group min-w-0 flex-wrap">
              <span
                onClick={() => setIsEditingTitle(true)}
                className="text-xs font-black text-slate-800 dark:text-stone-100 truncate cursor-pointer hover:text-amber-700 dark:hover:text-amber-400 transition"
                title="Click to edit deliverable title"
              >
                {item.title}
              </span>

              {/* Inline Editable Specs Badge */}
              {isEditingSpec ? (
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="text"
                    autoFocus
                    value={specInput}
                    onChange={(e) => setSpecInput(e.target.value)}
                    onBlur={handleSaveSpec}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveSpec();
                      if (e.key === 'Escape') {
                        setSpecInput(String(item.specs ?? item.count ?? ''));
                        setIsEditingSpec(false);
                      }
                    }}
                    placeholder="e.g. 25 Mins, 500 Photos"
                    className="w-32 px-2 py-0.5 text-[11px] font-extrabold bg-white dark:bg-stone-900 border border-amber-400 rounded-md text-amber-900 dark:text-amber-200 focus:outline-none shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={handleSaveSpec}
                    className="p-1 rounded bg-amber-500 text-white hover:bg-amber-600 cursor-pointer shadow-2xs"
                    title="Save spec"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  {(item.specs || item.count) ? (
                    <span
                      onClick={() => {
                        setSpecInput(String(item.specs ?? item.count ?? ''));
                        setIsEditingSpec(true);
                      }}
                      className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700/60 shadow-2xs hover:bg-amber-100 hover:border-amber-400 transition cursor-pointer shrink-0 flex items-center gap-1 group/spec"
                      title="Click to edit specs / count (e.g. 25 Mins, 500 Photos, 40 Pages)"
                    >
                      <span>{item.specs || item.count}</span>
                      <Edit3 className="w-2.5 h-2.5 opacity-40 group-hover/spec:opacity-100 transition" />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSpecInput('');
                        setIsEditingSpec(true);
                      }}
                      className="opacity-0 group-hover:opacity-80 hover:!opacity-100 text-[10px] font-bold px-1.5 py-0.5 rounded-md text-stone-400 hover:text-amber-800 dark:text-stone-500 dark:hover:text-amber-300 bg-stone-100/70 hover:bg-amber-50 dark:bg-stone-800/60 dark:hover:bg-amber-950/30 border border-dashed border-stone-200 hover:border-amber-300 transition cursor-pointer shrink-0"
                      title="Add deliverable specs (e.g. 25 Mins, 500 Photos)"
                    >
                      + Specs
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-stone-200 transition cursor-pointer shrink-0"
                title="Edit title"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. ASSIGNEE, DUE DATE, STATUS & ACTIONS (RESPONSIVE ROW CLUSTER) ── */}
      <div className="flex flex-wrap items-center gap-2.5 lg:gap-3 shrink-0">
        {/* Assignee Selector (Spacious min-w-[190px], role mini chip [ED], [CV]) */}
        <div className="w-full sm:w-52 lg:w-56 min-w-[190px]">
          <Searchable3DCreamSelect
            value={currentAssignee}
            onChange={(val) => {
              const matched = teamMembers.find(m => m.id === val || m.name === val);
              onUpdateItem(item.id, 'assigned_member_id', val === 'unassigned' ? null : (matched?.id || val));
              onUpdateItem(item.id, 'assigned_to', val === 'unassigned' ? null : (matched?.name || val));
            }}
            options={teamMemberOptions}
            searchable={true}
            searchPlaceholder="🔍 Search editor..."
            placeholder="+ Assign Editor"
            usePortal={true}
          />
        </div>

        {/* Due Date & Countdown Status (Generous margin mx-1 sm:mx-2 min-w-[145px] gap-2) */}
        <div className="flex items-center gap-2 mx-1 sm:mx-2 min-w-[145px] max-w-[215px] flex-1 sm:flex-initial">
          <div className="flex items-center gap-1.5 bg-white dark:bg-stone-900 px-2.5 py-1.5 rounded-xl border border-[#EAE5DA] dark:border-stone-700 text-xs shadow-2xs flex-1 min-w-[110px]">
            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-stone-500 shrink-0" />
            <input
              type="date"
              value={dueDateStr}
              onChange={(e) => {
                onUpdateItem(item.id, 'due_date', e.target.value);
                onUpdateItem(item.id, 'deadline', e.target.value);
              }}
              className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-stone-200 focus:outline-none cursor-pointer w-full"
            />
          </div>

          {deadlineInfo && (
            <span className={`px-2 py-1 rounded-lg text-[10px] border shadow-2xs whitespace-nowrap shrink-0 ${deadlineInfo.className}`}>
              {deadlineInfo.label}
            </span>
          )}
        </div>

        {/* Status Dropdown (Full width, min-w-[140px], luxury color pills, zero truncation) */}
        <div className="w-full sm:w-36 lg:w-44 min-w-[140px]">
          <Searchable3DCreamSelect
            value={currentStatus}
            onChange={(val) => onUpdateItem(item.id, 'status', val)}
            options={STATUS_OPTIONS}
            usePortal={true}
          />
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
          {/* Comments Button */}
          <button
            type="button"
            onClick={() => onOpenComments(item.id, item.title)}
            title="Activity notes & revisions"
            className="px-2.5 py-1.5 rounded-lg border border-[#EAE5DA] dark:border-stone-700 bg-white dark:bg-stone-800 text-slate-600 dark:text-stone-300 hover:text-amber-700 hover:border-amber-400 transition cursor-pointer flex items-center gap-1.5 shadow-2xs text-[11px]"
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-black">{commentCount}</span>
          </button>

          {/* Drive link action */}
          {onOpenDrive && (
            <button
              type="button"
              onClick={() => onOpenDrive(item.id, item.drive_link || '')}
              title={item.drive_link ? 'Open Drive Link' : 'Add Drive Link'}
              className={`p-1.5 rounded-lg border transition cursor-pointer text-xs ${
                item.drive_link 
                  ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 shadow-2xs' 
                  : 'bg-white dark:bg-stone-800 border-[#EAE5DA] dark:border-stone-700 text-slate-400 hover:text-sky-600'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Edit Title Button */}
          <button
            type="button"
            onClick={() => setIsEditingTitle(true)}
            title="Edit Title"
            className="p-1.5 rounded-lg border border-[#EAE5DA] dark:border-stone-700 bg-white dark:bg-stone-800 text-slate-400 hover:text-amber-600 hover:border-amber-300 transition cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          {/* Delete Item with 3D confirmation dialog */}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete item"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Deliverable Deletion 3D Confirmation Modal */}
      <PostProductionConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => onDeleteItem(item.id)}
        title="Delete Deliverable?"
        message={`Are you sure you want to delete "${item.title}"? This action cannot be undone.`}
        confirmText="Yes, Delete"
      />
    </div>
  );
}
