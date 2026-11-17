'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Camera, Video, BookOpen, Calendar, Trash2, Edit3, 
  MessageSquare, Link2, Check, Sparkles, Plus, IndianRupee, ExternalLink,
  Printer, Palette
} from 'lucide-react';
import { PostProductionDeliverable } from './DeliverableCategorySection';
import Searchable3DCreamSelect, { Searchable3DCreamSelectOption } from '@/components/ui/Searchable3DCreamSelect';
import UnifiedTeamAssignDropdown from '@/components/team/UnifiedTeamAssignDropdown';
import PostProductionConfirmModal from './PostProductionConfirmModal';
import { fetchPostProductionSettings, getCachedPostProductionSettings, DEFAULT_POST_PRODUCTION_STATUSES, PostProductionStatusSetting } from '@/lib/post-production-settings';
import AssignCommercialsModal from './AssignCommercialsModal';
import AttachLinksModal, { DeliverableAttachedLink } from '@/components/common/AttachLinksModal';
import ThreeDStatusSelect from '@/components/common/ThreeDStatusSelect';
import { detectDeliverableCategory, saveVendorAlbumOrder } from '@/lib/services/vendorDeliverablesService';
import { syncTeamPaymentToFinanceExpense } from '@/lib/team-finance-sync';

interface DeliverableRowItemProps {
  item: PostProductionDeliverable;
  teamMembers: { id: string; name: string; role?: string; default_daily_rate?: number; daily_rate?: number; email?: string }[];
  clientName?: string;
  workspaceId?: string;
  canManage?: boolean;
  isAllView?: boolean;
  isAssignedView?: boolean;
  isReadOnly?: boolean;
  currentUser?: any;
  onUpdateItem: (itemId: string, field: keyof PostProductionDeliverable, value: any) => void;
  onUpdateItemFields?: (itemId: string, fields: Partial<PostProductionDeliverable>) => void;
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

export default function DeliverableRowItem({
  item,
  teamMembers,
  clientName,
  workspaceId,
  canManage: propCanManage,
  isAllView = false,
  isAssignedView = false,
  isReadOnly = false,
  currentUser,
  onUpdateItem,
  onUpdateItemFields,
  onDeleteItem,
  onOpenComments,
  onOpenDrive,
}: DeliverableRowItemProps) {
  const canManage = Boolean(propCanManage);
  const canEditStatusAndDate = !isReadOnly && (canManage || isAssignedView);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(item.title);

  const [isEditingSpec, setIsEditingSpec] = useState(false);
  const [specInput, setSpecInput] = useState(String(item.specs ?? item.count ?? ''));

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isAssignPrintingModalOpen, setIsAssignPrintingModalOpen] = useState(false);
  const [isAttachLinksModalOpen, setIsAttachLinksModalOpen] = useState(false);
  const datePickerRef = useRef<HTMLInputElement | null>(null);
  const printingDatePickerRef = useRef<HTMLInputElement | null>(null);

  const isAlbum = item.category?.toLowerCase() === 'albums' || 
    /album|photobook|photo book|magazine/i.test(item.title || '') || 
    /album/i.test(item.category || '');

  const printingDueDateStr = item.printing_due_date || item.printing_deadline || '';
  const printingStatus = item.printing_status || 'Pending';

  const printingDeadlineInfo = (() => {
    if (!printingDueDateStr) return null;
    const due = new Date(printingDueDateStr);
    if (isNaN(due.getTime())) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isPrinted = (printingStatus || '').toLowerCase().includes('deliver') || (printingStatus || '').toLowerCase().includes('printed');

    if (isPrinted) {
      return {
        label: printingStatus,
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

  const PRINTING_STATUS_OPTIONS = useMemo(() => [
    { value: 'Pending', label: 'Pending / Not Sent' },
    { value: 'Sent for Printing', label: 'Sent for Printing' },
    { value: 'Printing In Progress', label: 'Printing In Progress' },
    { value: 'Quality Check', label: 'Quality Check' },
    { value: 'Dispatched', label: 'Dispatched / Shipped' },
    { value: 'Delivered', label: 'Delivered / Completed' },
  ], []);

  // Dynamic workflow statuses loaded synchronously from memory cache (0ms)
  const [ppStatuses, setPpStatuses] = useState<PostProductionStatusSetting[]>(() => {
    const cached = getCachedPostProductionSettings();
    if (cached && cached.statuses && cached.statuses.length > 0) {
      return cached.statuses;
    }
    return DEFAULT_POST_PRODUCTION_STATUSES;
  });

  useEffect(() => {
    fetchPostProductionSettings(workspaceId).then(settings => {
      if (settings && settings.statuses && settings.statuses.length > 0) {
        setPpStatuses(settings.statuses);
      }
    }).catch(() => {});

    const handleSettingsUpdated = () => {
      fetchPostProductionSettings(workspaceId).then(settings => {
        if (settings && settings.statuses && settings.statuses.length > 0) {
          setPpStatuses(settings.statuses);
        }
      }).catch(() => {});
    };
    window.addEventListener('post_production_settings_updated', handleSettingsUpdated);
    return () => {
      window.removeEventListener('post_production_settings_updated', handleSettingsUpdated);
    };
  }, [workspaceId]);


  useEffect(() => {
    setTitleInput(item.title);
  }, [item.title]);

  useEffect(() => {
    setSpecInput(String(item.specs ?? item.count ?? ''));
  }, [item.specs, item.count]);

  // Current status normalized or matched
  const currentStatus = item.status || '';

  // Current Assignee resolution
  const currentAssignee = item.assigned_member_id || item.assigned_to || 'unassigned';

  // Team Member Options: Clean luxury display with Profile Avatar and Full Name ONLY
  const teamMemberOptions: Searchable3DCreamSelectOption[] = useMemo(() => [
    {
      value: 'unassigned',
      label: 'Unassigned',
    },
    ...(teamMembers || []).map(m => {
      const nameStr = String(m?.name || 'Member');
      const initials = nameStr
        .split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'M';
      return {
        value: m?.id || nameStr,
        label: nameStr,
        initials,
      };
    }),
  ], [teamMembers]);

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
    const isDone = (currentStatus || '').toLowerCase().includes('done');

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
      if (onUpdateItemFields) {
        onUpdateItemFields(item.id, { title: titleInput.trim() });
      } else {
        onUpdateItem(item.id, 'title', titleInput.trim());
      }
    }
    setIsEditingTitle(false);
  };

  const handleSaveSpec = () => {
    const clean = specInput.trim();
    if (onUpdateItemFields) {
      onUpdateItemFields(item.id, { specs: clean || null, count: clean || null });
    } else {
      onUpdateItem(item.id, 'specs', clean || null);
      onUpdateItem(item.id, 'count', clean || null);
    }
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
        return <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  return (
    <div className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-[#EAE5DA] dark:border-stone-800/80 shadow-2xs hover:shadow-xs transition flex flex-col xl:flex-row xl:items-center justify-between gap-3 group">
      {/* ── 1. DELIVERABLE NAME & SPECS BADGE (LEFT COLUMN) ── */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="p-1.5 rounded-lg bg-[#FAF8F5] dark:bg-stone-800 border border-[#EAE5DA] dark:border-stone-700 shrink-0">
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
                onClick={() => canManage && setIsEditingTitle(true)}
                className={`text-xs font-black text-slate-800 dark:text-stone-100 truncate ${canManage ? 'cursor-pointer hover:text-amber-700 dark:hover:text-amber-400' : 'cursor-default'} transition`}
                title={canManage ? 'Click to edit deliverable title' : undefined}
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
                        if (canManage) {
                          setSpecInput(String(item.specs ?? item.count ?? ''));
                          setIsEditingSpec(true);
                        }
                      }}
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100/70 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700/80 shadow-2xs ${canManage ? 'hover:bg-amber-200/80 hover:border-amber-400 cursor-pointer' : 'cursor-default'} transition shrink-0 flex items-center gap-1 group/spec`}
                      title={canManage ? 'Click to edit specs / count (e.g. 25 Mins, 500 Photos, 40 Pages)' : undefined}
                    >
                      <span>{item.specs || item.count}</span>
                      {canManage && <Edit3 className="w-2.5 h-2.5 opacity-50 group-hover/spec:opacity-100 transition" />}
                    </span>
                  ) : (
                    canManage && (
                      <button
                        type="button"
                        onClick={() => {
                          setSpecInput('');
                          setIsEditingSpec(true);
                        }}
                        className="opacity-50 hover:opacity-100 group-hover:opacity-100 text-[10px] font-bold px-2 py-0.5 rounded-md text-amber-800 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/30 border border-dashed border-amber-300 dark:border-amber-700/60 hover:border-amber-400 transition cursor-pointer shrink-0 flex items-center gap-1"
                        title="Add deliverable specs (e.g. 25 Mins, 500 Photos)"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>Specs</span>
                      </button>
                    )
                  )}
                </div>
              )}

              {canManage && (
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-stone-200 transition cursor-pointer shrink-0"
                  title="Edit title"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Attached Resource / Drive Link Pills */}
          {item.drive_links && item.drive_links.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-1 w-full">
              {item.drive_links.map((link: any, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-amber-200 dark:border-stone-700 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-300 transition shadow-2xs"
                  title={`Open ${link.title || link.label || 'Link'}: ${link.url}`}
                >
                  <ExternalLink className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="truncate max-w-[120px]">{link.title || link.label || 'Link'}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 2. EXACT HORIZONTAL LINE CONTROLS CLUSTER (ALIGNABLE COLUMNS) ── */}
      {isAlbum ? (
        <div className="flex flex-col gap-2 shrink-0 w-full xl:w-auto">
          {/* SUB-ROW 1: DESIGNING (डिजाइनिंग) */}
          <div className="flex items-center gap-2.5 lg:gap-3 shrink-0 flex-nowrap overflow-x-auto pb-0.5">
            <span className="px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shrink-0 flex items-center gap-1 shadow-2xs">
              <Palette className="w-2.5 h-2.5 text-amber-700 dark:text-amber-400" />
              <span>Design</span>
            </span>

            {/* Column 1: Assign Designer */}
            <div className="w-44 sm:w-52 shrink-0">
              <UnifiedTeamAssignDropdown
                selectedId={item.assigned_member_id}
                selectedName={item.assigned_to}
                disabled={!canManage}
                teamMembers={teamMembers}
                labelPrefix="Designer:"
                placeholder="+ Assign Designer"
                searchPlaceholder="Search designer..."
                size="sm"
                variant="select-input"
                onSelect={(mem) => {
                  if (!canManage) return;
                  if (!mem.id && !mem.name) {
                    if (onUpdateItemFields) {
                      onUpdateItemFields(item.id, { 
                        assigned_member_id: null, 
                        assigned_to: null,
                        agreed_amount: 0,
                        paid_amount: 0,
                        balance_amount: 0
                      });
                    } else {
                      onUpdateItem(item.id, 'assigned_member_id', null);
                      onUpdateItem(item.id, 'assigned_to', null);
                    }
                  } else {
                    const assigned_member_id = mem.id || null;
                    const assigned_to = mem.name || null;

                    if (onUpdateItemFields) {
                      onUpdateItemFields(item.id, { assigned_member_id, assigned_to });
                    } else {
                      onUpdateItem(item.id, 'assigned_member_id', assigned_member_id);
                      onUpdateItem(item.id, 'assigned_to', assigned_to);
                    }
                    setIsAssignModalOpen(true);
                  }
                }}
              />
            </div>

            {/* Column 2: Designer Due Date & Countdown Status */}
            <div className="w-48 sm:w-52 shrink-0 flex items-center gap-1.5">
              <div 
                onClick={() => {
                  if (canEditStatusAndDate) {
                    datePickerRef.current?.showPicker?.() || datePickerRef.current?.focus();
                  }
                }}
                className={`relative flex items-center gap-1.5 bg-white dark:bg-stone-900 px-2.5 py-1.5 rounded-xl border border-[#EAE5DA] dark:border-stone-700 text-xs shadow-2xs ${canEditStatusAndDate ? 'cursor-pointer hover:border-amber-400' : 'cursor-default'} transition flex-1 min-w-0`}
                title={canEditStatusAndDate ? 'Click to select designer due date' : undefined}
              >
                <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 pointer-events-none" />
                <input
                  ref={datePickerRef}
                  type="date"
                  disabled={!canEditStatusAndDate}
                  value={dueDateStr}
                  onChange={(e) => {
                    if (!canEditStatusAndDate) return;
                    const dateVal = e.target.value;
                    if (onUpdateItemFields) {
                      onUpdateItemFields(item.id, { due_date: dateVal, deadline: dateVal });
                    } else {
                      onUpdateItem(item.id, 'due_date', dateVal);
                      onUpdateItem(item.id, 'deadline', dateVal);
                    }
                  }}
                  className={`bg-transparent text-[11px] font-bold text-slate-700 dark:text-stone-200 focus:outline-none ${canEditStatusAndDate ? 'cursor-pointer' : 'cursor-default'} w-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full ${canEditStatusAndDate ? '[&::-webkit-calendar-picker-indicator]:cursor-pointer' : ''}`}
                />
              </div>

              {deadlineInfo && (
                <span className={`px-2 py-1 rounded-lg text-[10px] font-black border shadow-2xs whitespace-nowrap shrink-0 ${deadlineInfo.className}`}>
                  {deadlineInfo.label}
                </span>
              )}
            </div>

            {/* Column 3: Designer Status Dropdown */}
            <div className="w-36 sm:w-44 shrink-0">
              <ThreeDStatusSelect
                currentStatus={currentStatus}
                statuses={ppStatuses}
                workspaceId={workspaceId || 'ws_default'}
                disabled={!canEditStatusAndDate}
                onChange={(val) => {
                  if (!canEditStatusAndDate) return;
                  if (onUpdateItemFields) {
                    onUpdateItemFields(item.id, { status: val });
                  } else {
                    onUpdateItem(item.id, 'status', val);
                  }
                  if (item.assigned_member_id) {
                    saveVendorAlbumOrder(workspaceId || 'ws_default', {
                      partner_id: item.assigned_member_id,
                      partner_name: item.assigned_to || '',
                      client_name: clientName || 'Client Project',
                      deliverable_id: item.id,
                      category: 'album_design',
                      item_title: item.title,
                      order_status: val,
                    }).catch(() => {});
                  }
                }}
              />
            </div>

            {/* Column 4: Action Icons for Designer & Deliverable */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onOpenComments(item.id, item.title)}
                title="Activity notes & revisions"
                className="px-2 py-1.5 rounded-lg border border-[#EAE5DA] dark:border-stone-700 bg-white dark:bg-stone-800 text-slate-600 dark:text-stone-300 hover:text-amber-700 hover:border-amber-400 transition cursor-pointer flex items-center gap-1 shadow-2xs text-[11px]"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-black">{commentCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAttachLinksModalOpen(true)}
                title={
                  (item.drive_links && item.drive_links.length > 0)
                    ? `${item.drive_links.length} attached link(s)`
                    : item.drive_link
                    ? 'Manage Links & Drive'
                    : 'Attach Links (Drive, Review, Preview)'
                }
                className={`px-2 py-1.5 rounded-lg border transition cursor-pointer text-xs flex items-center gap-1 shadow-2xs ${
                  (item.drive_links && item.drive_links.length > 0) || item.drive_link
                    ? 'bg-amber-100/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200' 
                    : 'bg-white dark:bg-stone-800 border-[#EAE5DA] dark:border-stone-700 text-slate-400 hover:text-amber-700'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                {((item.drive_links?.length || 0) > 0) && (
                  <span className="font-black text-[10px]">{item.drive_links?.length}</span>
                )}
              </button>

              {canManage && (
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  title="Edit Title"
                  className="p-1.5 rounded-lg border border-[#EAE5DA] dark:border-stone-700 bg-white dark:bg-stone-800 text-slate-400 hover:text-amber-600 hover:border-amber-300 transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}

              {canManage && (item.assigned_member_id || item.assigned_to) && (
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(true)}
                  title="Designer Fee & Commercials"
                  className="p-1.5 rounded-lg border border-[#EAE5DA] dark:border-stone-700 bg-white dark:bg-stone-800 text-amber-700 dark:text-amber-400 hover:text-amber-800 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition cursor-pointer"
                >
                  <IndianRupee className="w-3.5 h-3.5" />
                </button>
              )}

              {canManage && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Delete item"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* SUB-ROW 2: PRINTING (प्रिंटिंग) */}
          <div className="flex items-center gap-2.5 lg:gap-3 shrink-0 flex-nowrap overflow-x-auto pt-1.5 border-t border-dashed border-stone-200/90 dark:border-stone-800">
            <span className="px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700 shrink-0 flex items-center gap-1 shadow-2xs">
              <Printer className="w-2.5 h-2.5 text-purple-700 dark:text-purple-400" />
              <span>Print</span>
            </span>

            {/* Column 1: Assign Printer / Lab */}
            <div className="w-44 sm:w-52 shrink-0">
              <UnifiedTeamAssignDropdown
                selectedId={item.printer_id}
                selectedName={item.printer_name}
                disabled={!canManage}
                teamMembers={teamMembers}
                labelPrefix="Printer:"
                placeholder="+ Assign Printer / Lab"
                searchPlaceholder="Search print partner / lab..."
                size="sm"
                variant="select-input"
                onSelect={(mem) => {
                  if (!canManage) return;
                  if (!mem.id && !mem.name) {
                    if (onUpdateItemFields) {
                      onUpdateItemFields(item.id, { 
                        printer_id: null, 
                        printer_name: null,
                        printing_agreed_amount: 0,
                        printing_paid_amount: 0,
                        printing_balance_amount: 0
                      });
                    } else {
                      onUpdateItem(item.id, 'printer_id' as any, null);
                      onUpdateItem(item.id, 'printer_name' as any, null);
                    }
                  } else {
                    const printer_id = mem.id || null;
                    const printer_name = mem.name || null;

                    if (onUpdateItemFields) {
                      onUpdateItemFields(item.id, { printer_id, printer_name });
                    } else {
                      onUpdateItem(item.id, 'printer_id' as any, printer_id);
                      onUpdateItem(item.id, 'printer_name' as any, printer_name);
                    }

                    if (printer_id && printer_name) {
                      saveVendorAlbumOrder(workspaceId || 'ws_default', {
                        partner_id: printer_id,
                        partner_name: printer_name,
                        client_name: clientName || 'Client Project',
                        deliverable_id: item.id,
                        category: 'album_printing',
                        album_type: item.title,
                        item_title: item.title,
                        due_date: item.printing_due_date || item.printing_deadline || '',
                        order_status: item.printing_status || 'Pending',
                        total_amount: Number(item.printing_agreed_amount) || 0,
                        paid_amount: Number(item.printing_paid_amount) || 0,
                      }).catch(() => {});
                    }

                    setIsAssignPrintingModalOpen(true);
                  }
                }}
              />
            </div>

            {/* Column 2: Printing Due Date & Countdown Status */}
            <div className="w-48 sm:w-52 shrink-0 flex items-center gap-1.5">
              <div 
                onClick={() => {
                  if (canEditStatusAndDate) {
                    printingDatePickerRef.current?.showPicker?.() || printingDatePickerRef.current?.focus();
                  }
                }}
                className={`relative flex items-center gap-1.5 bg-white dark:bg-stone-900 px-2.5 py-1.5 rounded-xl border border-purple-200 dark:border-stone-700 text-xs shadow-2xs ${canEditStatusAndDate ? 'cursor-pointer hover:border-purple-400' : 'cursor-default'} transition flex-1 min-w-0`}
                title={canEditStatusAndDate ? 'Click to select printing due date' : undefined}
              >
                <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 pointer-events-none" />
                <input
                  ref={printingDatePickerRef}
                  type="date"
                  disabled={!canEditStatusAndDate}
                  value={printingDueDateStr}
                  onChange={(e) => {
                    if (!canEditStatusAndDate) return;
                    const dateVal = e.target.value;
                    if (onUpdateItemFields) {
                      onUpdateItemFields(item.id, { printing_due_date: dateVal, printing_deadline: dateVal });
                    } else {
                      onUpdateItem(item.id, 'printing_due_date' as any, dateVal);
                    }
                    if (item.printer_id) {
                      saveVendorAlbumOrder(workspaceId || 'ws_default', {
                        partner_id: item.printer_id,
                        partner_name: item.printer_name || '',
                        client_name: clientName || 'Client Project',
                        deliverable_id: item.id,
                        category: 'album_printing',
                        due_date: dateVal,
                        order_status: item.printing_status || 'Pending',
                      }).catch(() => {});
                    }
                  }}
                  className={`bg-transparent text-[11px] font-bold text-slate-700 dark:text-stone-200 focus:outline-none ${canEditStatusAndDate ? 'cursor-pointer' : 'cursor-default'} w-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full ${canEditStatusAndDate ? '[&::-webkit-calendar-picker-indicator]:cursor-pointer' : ''}`}
                />
              </div>

              {printingDeadlineInfo && (
                <span className={`px-2 py-1 rounded-lg text-[10px] font-black border shadow-2xs whitespace-nowrap shrink-0 ${printingDeadlineInfo.className}`}>
                  {printingDeadlineInfo.label}
                </span>
              )}
            </div>

            {/* Column 3: Printing Status Dropdown */}
            <div className="w-36 sm:w-44 shrink-0">
              <select
                disabled={!canEditStatusAndDate}
                value={printingStatus}
                onChange={(e) => {
                  if (!canEditStatusAndDate) return;
                  const newStatus = e.target.value;
                  if (onUpdateItemFields) {
                    onUpdateItemFields(item.id, { printing_status: newStatus });
                  } else {
                    onUpdateItem(item.id, 'printing_status' as any, newStatus);
                  }
                  if (item.printer_id) {
                    saveVendorAlbumOrder(workspaceId || 'ws_default', {
                      partner_id: item.printer_id,
                      partner_name: item.printer_name || '',
                      client_name: clientName || 'Client Project',
                      deliverable_id: item.id,
                      category: 'album_printing',
                      order_status: newStatus,
                    }).catch(() => {});
                  }
                }}
                className="w-full px-2.5 py-1.5 rounded-xl border border-purple-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-purple-950 dark:text-purple-200 text-xs font-bold shadow-2xs focus:outline-none focus:border-purple-400 cursor-pointer"
              >
                {PRINTING_STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Column 4: Printing Fee Commercials Button */}
            <div className="flex items-center gap-1 shrink-0">
              {canManage && (item.printer_id || item.printer_name) && (
                <button
                  type="button"
                  onClick={() => setIsAssignPrintingModalOpen(true)}
                  title="Printing Commercials & Fee"
                  className="px-2 py-1.5 rounded-lg border border-purple-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-purple-700 dark:text-purple-300 hover:text-purple-900 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition cursor-pointer flex items-center gap-1 text-[11px] font-black shadow-2xs"
                >
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print Fee</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* STANDARD SINGLE ROW FOR NON-ALBUM DELIVERABLES */
        <div className="flex items-center gap-2.5 lg:gap-3 shrink-0 flex-nowrap overflow-x-auto pb-1 xl:pb-0">
          {/* Column 1: Assignee Selector (Unified In-House, Freelancer & Vendor Dropdown) */}
          <div className="w-44 sm:w-52 shrink-0">
            <UnifiedTeamAssignDropdown
              selectedId={item.assigned_member_id}
              selectedName={item.assigned_to}
              disabled={!canManage}
              teamMembers={teamMembers}
              labelPrefix=""
              placeholder="+ Assign Editor"
              searchPlaceholder="Search team member..."
              size="sm"
              variant="select-input"
              onSelect={(mem) => {
                if (!canManage) return;
                if (!mem.id && !mem.name) {
                  if (onUpdateItemFields) {
                    onUpdateItemFields(item.id, { 
                      assigned_member_id: null, 
                      assigned_to: null,
                      agreed_amount: 0,
                      paid_amount: 0,
                      balance_amount: 0
                    });
                  } else {
                    onUpdateItem(item.id, 'assigned_member_id', null);
                    onUpdateItem(item.id, 'assigned_to', null);
                  }
                } else {
                  const assigned_member_id = mem.id || null;
                  const assigned_to = mem.name || null;

                  if (onUpdateItemFields) {
                    onUpdateItemFields(item.id, { assigned_member_id, assigned_to });
                  } else {
                    onUpdateItem(item.id, 'assigned_member_id', assigned_member_id);
                    onUpdateItem(item.id, 'assigned_to', assigned_to);
                  }
                  // Automatically open Assign Commercials Modal for the selected member
                  setIsAssignModalOpen(true);
                }
              }}
            />
          </div>

          {/* Column 2: Due Date & Countdown Status */}
          <div className="w-48 sm:w-52 shrink-0 flex items-center gap-1.5">
            <div 
              onClick={() => {
                if (canEditStatusAndDate) {
                  datePickerRef.current?.showPicker?.() || datePickerRef.current?.focus();
                }
              }}
              className={`relative flex items-center gap-1.5 bg-white dark:bg-stone-900 px-2.5 py-1.5 rounded-xl border border-[#EAE5DA] dark:border-stone-700 text-xs shadow-2xs ${canEditStatusAndDate ? 'cursor-pointer hover:border-amber-400' : 'cursor-default'} transition flex-1 min-w-0`}
              title={canEditStatusAndDate ? 'Click to select due date' : undefined}
            >
              <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 pointer-events-none" />
              <input
                ref={datePickerRef}
                type="date"
                disabled={!canEditStatusAndDate}
                value={dueDateStr}
                onChange={(e) => {
                  if (!canEditStatusAndDate) return;
                  const dateVal = e.target.value;
                  if (onUpdateItemFields) {
                    onUpdateItemFields(item.id, { due_date: dateVal, deadline: dateVal });
                  } else {
                    onUpdateItem(item.id, 'due_date', dateVal);
                    onUpdateItem(item.id, 'deadline', dateVal);
                  }
                }}
                className={`bg-transparent text-[11px] font-bold text-slate-700 dark:text-stone-200 focus:outline-none ${canEditStatusAndDate ? 'cursor-pointer' : 'cursor-default'} w-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full ${canEditStatusAndDate ? '[&::-webkit-calendar-picker-indicator]:cursor-pointer' : ''}`}
              />
            </div>

            {deadlineInfo && (
              <span className={`px-2 py-1 rounded-lg text-[10px] font-black border shadow-2xs whitespace-nowrap shrink-0 ${deadlineInfo.className}`}>
                {deadlineInfo.label}
              </span>
            )}
          </div>

          {/* Column 3: Status Dropdown (Dynamic from Post Production Settings) */}
          <div className="w-36 sm:w-44 shrink-0">
            <ThreeDStatusSelect
              currentStatus={currentStatus}
              statuses={ppStatuses}
              workspaceId={workspaceId || 'ws_default'}
              disabled={!canEditStatusAndDate}
              onChange={(val) => {
                if (!canEditStatusAndDate) return;
                if (onUpdateItemFields) {
                  onUpdateItemFields(item.id, { status: val });
                } else {
                  onUpdateItem(item.id, 'status', val);
                }
                if (item.assigned_member_id) {
                  const cat = detectDeliverableCategory(item.category, item.title);
                  saveVendorAlbumOrder(workspaceId || 'ws_default', {
                    partner_id: item.assigned_member_id,
                    partner_name: item.assigned_to || '',
                    client_name: clientName || 'Client Project',
                    deliverable_id: item.id,
                    category: cat,
                    item_title: item.title,
                    order_status: val,
                  }).catch(() => {});
                }
              }}
            />
          </div>

          {/* Column 4: Action Icons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Comments Button */}
            <button
              type="button"
              onClick={() => onOpenComments(item.id, item.title)}
              title="Activity notes & revisions"
              className="px-2 py-1.5 rounded-lg border border-[#EAE5DA] dark:border-stone-700 bg-white dark:bg-stone-800 text-slate-600 dark:text-stone-300 hover:text-amber-700 hover:border-amber-400 transition cursor-pointer flex items-center gap-1 shadow-2xs text-[11px]"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-black">{commentCount}</span>
            </button>

            {/* Drive & Review Links modal trigger */}
            <button
              type="button"
              onClick={() => setIsAttachLinksModalOpen(true)}
              title={
                (item.drive_links && item.drive_links.length > 0)
                  ? `${item.drive_links.length} attached link(s)`
                  : item.drive_link
                  ? 'Manage Links & Drive'
                  : 'Attach Links (Drive, Review, Preview)'
              }
              className={`px-2 py-1.5 rounded-lg border transition cursor-pointer text-xs flex items-center gap-1 shadow-2xs ${
                (item.drive_links && item.drive_links.length > 0) || item.drive_link
                  ? 'bg-amber-100/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200' 
                  : 'bg-white dark:bg-stone-800 border-[#EAE5DA] dark:border-stone-700 text-slate-400 hover:text-amber-700'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              {((item.drive_links?.length || 0) > 0) && (
                <span className="font-black text-[10px]">{item.drive_links?.length}</span>
              )}
            </button>

            {/* Edit Title Button - Full Manage Only */}
            {canManage && (
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                title="Edit Title"
                className="p-1.5 rounded-lg border border-[#EAE5DA] dark:border-stone-700 bg-white dark:bg-stone-800 text-slate-400 hover:text-amber-600 hover:border-amber-300 transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Edit Commercials Fee Button - Full Manage Only */}
            {canManage && (item.assigned_member_id || item.assigned_to) && (
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(true)}
                title="Edit Commercials & Payment"
                className="p-1.5 rounded-lg border border-[#EAE5DA] dark:border-stone-700 bg-white dark:bg-stone-800 text-amber-700 dark:text-amber-400 hover:text-amber-800 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition cursor-pointer"
              >
                <IndianRupee className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Delete Item with 3D confirmation dialog - Full Manage Only */}
            {canManage && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                title="Delete item"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Deliverable Deletion 3D Confirmation Modal */}
      <PostProductionConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => onDeleteItem(item.id)}
        title="Delete Deliverable?"
        message={`Are you sure you want to delete "${item.title}"? This action cannot be undone.`}
        confirmText="Yes, Delete"
      />

      {/* Assign Specialist & Set Commercials Modal */}
      <AssignCommercialsModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        deliverable={item}
        clientName={clientName || 'Project Deliverables'}
        teamMembers={teamMembers}
        onSaveAssignment={async (data) => {
          const pStatus = data.balanceAmount === 0 && data.agreedAmount > 0 
            ? 'FULL_PAID' 
            : data.paidAmount > 0 
            ? 'PARTIAL' 
            : 'PENDING';

          const updatePayload: Partial<PostProductionDeliverable> = {
            assigned_member_id: data.memberId,
            assigned_to: data.memberName,
            agreed_amount: data.agreedAmount,
            paid_amount: data.paidAmount,
            balance_amount: data.balanceAmount,
            payment_status: pStatus,
            due_date: data.dueDate,
            deadline: data.dueDate,
            notes: data.notes || item.notes,
          };

          if (onUpdateItemFields) {
            onUpdateItemFields(item.id, updatePayload);
          } else {
            Object.entries(updatePayload).forEach(([k, v]) => onUpdateItem(item.id, k as any, v));
          }

          // Directly sync to partner_album_orders for immediate visibility in Team & Partners
          try {
            const cat = detectDeliverableCategory(item.category, item.title);
            await saveVendorAlbumOrder(workspaceId || 'ws_default', {
              partner_id: data.memberId,
              partner_name: data.memberName,
              partner_email: data.memberEmail || '',
              client_name: clientName || 'Client Project',
              project_id: item.project_id || '',
              deliverable_id: item.id,
              category: cat,
              item_title: item.title,
              album_type: item.title,
              specs: item.specs || item.count || '',
              total_amount: data.agreedAmount,
              paid_amount: data.paidAmount,
              balance_amount: data.balanceAmount,
              due_date: data.dueDate,
              order_status: item.status || 'Pending',
              payment_status: pStatus === 'FULL_PAID' ? 'PAID' : pStatus,
              drive_links: (item.drive_links || []).map((l: any, i: number) => ({
                id: l.id || `lnk_${i}`,
                title: l.title || l.label || 'Link',
                url: l.url || '',
              })),
              notes: data.notes || item.notes || '',
            });
          } catch (err) {
            console.warn('[DeliverableRowItem] Failed to sync to partner_album_orders:', err);
          }

          // Sync payout to Studio Owner's finance expenses if paid amount recorded
          if (data.paidAmount > 0) {
            try {
              await syncTeamPaymentToFinanceExpense(workspaceId || '', {
                title: `${data.memberName} - ${item.title}`,
                category: 'Post-Production & Editing Fee',
                amount: data.paidAmount,
                date: new Date().toISOString().split('T')[0],
                payment_mode: data.payMode || 'UPI',
                reference_no: data.payRef || undefined,
                notes: data.notes || `Post-Production payout for ${item.title} (${clientName || 'Project'})`,
                team_member_name: data.memberName,
                team_member_id: data.memberId,
                client_name: clientName || '',
                project_id: item.project_id || undefined,
              });
            } catch (expErr) {
              console.warn('[DeliverableRowItem] Failed to sync payout to finance expense:', expErr);
            }
          }
        }}
      />

      {/* Assign Printing Lab & Set Commercials Modal */}
      <AssignCommercialsModal
        isOpen={isAssignPrintingModalOpen}
        onClose={() => setIsAssignPrintingModalOpen(false)}
        deliverable={item}
        clientName={clientName || 'Project Deliverables'}
        targetRole="printer"
        teamMembers={teamMembers}
        onSaveAssignment={async (data) => {
          const updatePayload: Partial<PostProductionDeliverable> = {
            printer_id: data.memberId,
            printer_name: data.memberName,
            printing_agreed_amount: data.agreedAmount,
            printing_paid_amount: data.paidAmount,
            printing_balance_amount: data.balanceAmount,
            printing_due_date: data.dueDate,
            printing_deadline: data.dueDate,
          };

          if (onUpdateItemFields) {
            onUpdateItemFields(item.id, updatePayload);
          } else {
            Object.entries(updatePayload).forEach(([k, v]) => onUpdateItem(item.id, k as any, v));
          }

          // Directly sync to partner_album_orders for immediate visibility in Team & Partners
          try {
            await saveVendorAlbumOrder(workspaceId || 'ws_default', {
              partner_id: data.memberId,
              partner_name: data.memberName,
              partner_email: data.memberEmail || '',
              client_name: clientName || 'Client Project',
              project_id: item.project_id || '',
              deliverable_id: item.id,
              category: 'album_printing',
              item_title: item.title,
              album_type: item.title,
              specs: item.specs || item.count || '',
              total_amount: data.agreedAmount,
              paid_amount: data.paidAmount,
              balance_amount: data.balanceAmount,
              due_date: data.dueDate,
              order_status: item.printing_status || 'Pending',
              payment_status: data.balanceAmount === 0 && data.agreedAmount > 0 ? 'PAID' : data.paidAmount > 0 ? 'PARTIAL' : 'PENDING',
              notes: data.notes || '',
            });
          } catch (err) {
            console.warn('[DeliverableRowItem] Failed to sync printing order:', err);
          }

          // Sync payout to Studio Owner's finance expenses if paid amount recorded
          if (data.paidAmount > 0) {
            try {
              await syncTeamPaymentToFinanceExpense(workspaceId || '', {
                title: `Album Printing: ${data.memberName} - ${item.title}`,
                category: 'Album Printing & Binding',
                amount: data.paidAmount,
                date: new Date().toISOString().split('T')[0],
                payment_mode: data.payMode || 'UPI',
                reference_no: data.payRef || undefined,
                notes: data.notes || `Album Printing payout for ${item.title} (${clientName || 'Project'})`,
                team_member_name: data.memberName,
                team_member_id: data.memberId,
                client_name: clientName || '',
                project_id: item.project_id || undefined,
              });
            } catch (expErr) {
              console.warn('[DeliverableRowItem] Failed to sync printing payout to finance expense:', expErr);
            }
          }
        }}
      />

      {/* Attach Multiple Resource / Drive Links Modal */}
      <AttachLinksModal
        isOpen={isAttachLinksModalOpen}
        onClose={() => setIsAttachLinksModalOpen(false)}
        title={item.title}
        subtitle={clientName}
        isReadOnly={isReadOnly}
        canManage={canManage}
        currentUser={currentUser}
        initialLinks={(item.drive_links || []).map((l: any, i: number) => ({
          id: l.id || `lnk_${i}`,
          title: l.title || l.label || 'Link',
          url: l.url || '',
          created_by_id: l.created_by_id,
          created_by_name: l.created_by_name,
        }))}
        onSave={(links: DeliverableAttachedLink[]) => {
          const firstUrl = links[0]?.url || '';
          if (onUpdateItemFields) {
            onUpdateItemFields(item.id, { 
              drive_links: links,
              drive_link: firstUrl || item.drive_link || '' 
            });
          } else {
            onUpdateItem(item.id, 'drive_links' as any, links);
            if (firstUrl) onUpdateItem(item.id, 'drive_link', firstUrl);
          }

          if (item.assigned_member_id) {
            const cat = detectDeliverableCategory(item.category, item.title);
            saveVendorAlbumOrder(workspaceId || 'ws_default', {
              partner_id: item.assigned_member_id,
              partner_name: item.assigned_to || '',
              client_name: clientName || 'Client Project',
              deliverable_id: item.id,
              category: cat,
              item_title: item.title,
              drive_links: links,
              drive_folder_url: firstUrl,
              total_amount: item.agreed_amount ?? undefined,
              paid_amount: item.paid_amount ?? undefined,
            }).catch(() => {});
          }
        }}
      />
    </div>
  );
}
