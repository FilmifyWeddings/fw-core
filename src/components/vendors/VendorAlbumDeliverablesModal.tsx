'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, BookOpen, Calendar, Clock, IndianRupee, 
  CheckCircle2, AlertCircle, AlertTriangle, Plus, Search, ExternalLink, 
  FileText, MessageSquare, ChevronDown, Check, Download, 
  Printer, ArrowUpRight, ShieldCheck, User, Phone, Mail,
  RefreshCw, CheckSquare, Square, Layers, Edit3, Trash2,
  Film, Camera, Palette, Video, Layers as LayersIcon, Bell,
  Filter, Tag, Users, Link2
} from 'lucide-react';
import { 
  VendorAlbumOrder, 
  AssignmentCategory, 
  detectDeliverableCategory,
  detectDeliverableSegment,
  formatNoteDateTime,
  saveVendorAlbumOrder,
  isPostProductionOrder
} from '@/lib/services/vendorDeliverablesService';
import { 
  fetchWorkspaceEventTypes, 
  fetchWorkspaceCrewRoles,
  DEFAULT_EVENT_TYPES,
  DEFAULT_CREW_ROLES
} from '@/lib/workspace-settings';
import { 
  fetchPostProductionSettings, 
  getCachedPostProductionSettings, 
  DEFAULT_POST_PRODUCTION_STATUSES, 
  PostProductionStatusSetting 
} from '@/lib/post-production-settings';
import AiMicButton from '@/components/AiMicButton';
import VendorStatementInvoicePdfTemplate, { VendorInvoiceItem } from './VendorStatementInvoicePdfTemplate';
import VendorDeliverablesFilterModal, { DeliverablesFilterState } from './VendorDeliverablesFilterModal';
import ThreeDMultiSelectDropdown from '@/components/common/ThreeDMultiSelectDropdown';
import AttachLinksModal, { DeliverableAttachedLink } from '@/components/common/AttachLinksModal';
import ThreeDStatusSelect from '@/components/common/ThreeDStatusSelect';

// Fast Module-Level In-Memory Cache for 0ms instant loading
const memCachedVendorOrders = new Map<string, VendorAlbumOrder[]>();

interface VendorAlbumDeliverablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  vendor: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    primary_role?: string;
    primary_type?: string;
    avatar_url?: string;
    daily_rate?: number;
    default_daily_rate?: number;
    roles?: string[];
    member_types?: string[];
    monthly_salary?: number;
    [key: string]: any;
  };
  studioName?: string;
  onOpenSalaryDrawer?: (member: any) => void;
}

export type HubCategoryTab = 'shoot' | 'video_editing' | 'photo_editing' | 'album_design' | 'album_printing';

const CATEGORY_TABS_CONFIG: Array<{ id: HubCategoryTab; label: string; icon: string }> = [
  { id: 'shoot', label: 'Shoots', icon: '📸' },
  { id: 'video_editing', label: 'Video Editing', icon: '🎬' },
  { id: 'photo_editing', label: 'Photo Editing', icon: '✨' },
  { id: 'album_design', label: 'Album Designing', icon: '🎨' },
  { id: 'album_printing', label: 'Album Printing', icon: '📖' },
];

const STATUS_COLOR_MAP: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'Pending Design': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', dot: 'bg-amber-500' },
  'In Design': { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-300', dot: 'bg-sky-500' },
  'In Progress': { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-300', dot: 'bg-sky-500' },
  'Client Review': { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300', dot: 'bg-purple-500' },
  'Changes Requested': { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-300', dot: 'bg-orange-500' },
  'Sent for Printing': { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-300', dot: 'bg-indigo-500' },
  'Completed': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500' }
};

const DEFAULT_STATUS_LIST = [
  'Pending Design',
  'In Progress',
  'Client Review',
  'Changes Requested',
  'Sent for Printing',
  'Completed'
];

export function getSegmentConfig(segmentName: string) {
  const s = (segmentName || '').toLowerCase();
  if (s.includes('pre-wedding') || s.includes('prewedding')) {
    return {
      emoji: '💍',
      containerBg: 'bg-[#F2F8FA]',
      containerBorder: 'border-[#D1E8EE]',
      headerText: 'text-[#164E63]',
      badgeBg: 'bg-[#E0F2F7] text-[#164E63] border-[#C3E4ED]',
    };
  }
  if (s.includes('wedding')) {
    return {
      emoji: '💒',
      containerBg: 'bg-[#FAF7F2]',
      containerBorder: 'border-[#EEDFC6]',
      headerText: 'text-[#6A4B23]',
      badgeBg: 'bg-[#F4E9D5] text-[#6A4B23] border-[#E3D1B4]',
    };
  }
  if (s.includes('reception')) {
    return {
      emoji: '🥂',
      containerBg: 'bg-[#F6F4FA]',
      containerBorder: 'border-[#DFDAEE]',
      headerText: 'text-[#3730A3]',
      badgeBg: 'bg-[#EDE9FE] text-[#3730A3] border-[#DDD6FE]',
    };
  }
  if (s.includes('haldi')) {
    return {
      emoji: '🌼',
      containerBg: 'bg-[#FEFAF0]',
      containerBorder: 'border-[#F8E7BE]',
      headerText: 'text-[#78350F]',
      badgeBg: 'bg-[#FEF3C7] text-[#78350F] border-[#FDE68A]',
    };
  }
  if (s.includes('sangeet')) {
    return {
      emoji: '💃',
      containerBg: 'bg-[#FAF3F6]',
      containerBorder: 'border-[#EED3DE]',
      headerText: 'text-[#831843]',
      badgeBg: 'bg-[#FCE7F3] text-[#831843] border-[#FBCFE8]',
    };
  }
  if (s.includes('mehendi') || s.includes('mehndi')) {
    return {
      emoji: '🌿',
      containerBg: 'bg-[#F2F8F4]',
      containerBorder: 'border-[#CCE5D4]',
      headerText: 'text-[#065F46]',
      badgeBg: 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]',
    };
  }
  if (s.includes('engagement') || s.includes('roka')) {
    return {
      emoji: '💍',
      containerBg: 'bg-[#FAF6F0]',
      containerBorder: 'border-[#EEDDC8]',
      headerText: 'text-[#713F12]',
      badgeBg: 'bg-[#FEF3C7] text-[#713F12] border-[#FDE68A]',
    };
  }
  return {
    emoji: '✨',
    containerBg: 'bg-[#FAF8F5]',
    containerBorder: 'border-[#EAE5DA]',
    headerText: 'text-[#292524]',
    badgeBg: 'bg-stone-100 text-stone-700 border-stone-200',
  };
}

export const ALL_SEGMENT_EVENT_TYPES = [
  'Wedding',
  'Pre-Wedding',
  'Engagement',
  'Reception',
  'Sangeet',
  'Haldi',
  'Mehndi',
  'Ring Ceremony',
  'Cocktail',
  'Roka',
  'Post-Wedding',
  'Anniversary',
  'Baby Shower',
  'Maternity',
  'Birthday',
  'Corporate Event',
];

export function getRemainingDaysBadge(dueDateStr?: string) {
  if (!dueDateStr) return null;
  const match = dueDateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let due: Date;
  if (match) {
    due = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
  } else {
    due = new Date(dueDateStr);
  }
  if (isNaN(due.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: `Overdue (${Math.abs(diffDays)}d)`,
      className: 'bg-rose-100 text-rose-700 border-rose-300 font-black animate-pulse',
    };
  }
  if (diffDays === 0) {
    return {
      label: 'Due Today',
      className: 'bg-amber-100 text-amber-800 border-amber-300 font-black',
    };
  }
  if (diffDays === 1) {
    return {
      label: 'Tomorrow (1d)',
      className: 'bg-sky-100 text-sky-800 border-sky-300 font-bold',
    };
  }
  return {
    label: `${diffDays}d left`,
    className: 'bg-stone-100 text-stone-700 border-stone-200 font-bold',
  };
}

export function ThreeDSegmentSelect({
  value,
  onChange,
  className = '',
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCustomMode(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentConfig = getSegmentConfig(value || 'Wedding');

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-white border-2 border-amber-300/80 hover:border-amber-500 shadow-2xs hover:shadow-xs transition text-xs font-black text-stone-900 cursor-pointer min-w-[160px] active:translate-y-0.5"
      >
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-sm">{currentConfig.emoji}</span>
          <span className="truncate">{value || 'Select Segment'}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-[200] w-64 bg-white rounded-2xl border-2 border-amber-300 shadow-xl overflow-hidden p-2 space-y-1.5 text-stone-900">
          <div className="text-[10px] font-black uppercase tracking-wider text-stone-400 px-2 pt-1 pb-0.5">
            Select Event Segment
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
            {ALL_SEGMENT_EVENT_TYPES.map(eventType => {
              const cfg = getSegmentConfig(eventType);
              const isSelected = (value || '').toLowerCase() === eventType.toLowerCase();
              return (
                <button
                  key={eventType}
                  type="button"
                  onClick={() => {
                    onChange(eventType);
                    setIsOpen(false);
                    setIsCustomMode(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                    isSelected
                      ? 'bg-amber-100/80 text-amber-950 font-black border border-amber-300'
                      : 'hover:bg-amber-50/60 text-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{cfg.emoji}</span>
                    <span>{eventType}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 stroke-[3]" />}
                </button>
              );
            })}
          </div>

          <div className="pt-1.5 border-t border-stone-100">
            {isCustomMode ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  autoFocus
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Enter custom segment..."
                  className="flex-1 px-2 py-1 text-xs border border-amber-400 rounded-lg focus:outline-none font-bold"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customInput.trim()) {
                      onChange(customInput.trim());
                      setIsOpen(false);
                      setIsCustomMode(false);
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={!customInput.trim()}
                  onClick={() => {
                    if (customInput.trim()) {
                      onChange(customInput.trim());
                      setIsOpen(false);
                      setIsCustomMode(false);
                    }
                  }}
                  className="px-2 py-1 bg-amber-500 text-white rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  Set
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsCustomMode(true);
                  setCustomInput(value);
                }}
                className="w-full text-center px-2 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-50 rounded-lg transition cursor-pointer"
              >
                + Custom Segment Name
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ThreeDDeliverableSelect({
  value,
  specs,
  presets,
  onChange,
  className = '',
  placeholder = 'Select Deliverable',
}: {
  value: string;
  specs?: string;
  presets: Array<{ title: string; specs: string }>;
  onChange: (title: string, specs: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customSpecs, setCustomSpecs] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCustomMode(false);
        setSearchQuery('');
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredPresets = useMemo(() => {
    if (!searchQuery.trim()) return presets;
    const q = searchQuery.toLowerCase().trim();
    return presets.filter(p => 
      p.title.toLowerCase().includes(q) || 
      (p.specs && p.specs.toLowerCase().includes(q))
    );
  }, [presets, searchQuery]);

  const matchedPreset = useMemo(() => {
    return presets.find(p => p.title.toLowerCase() === (value || '').toLowerCase());
  }, [presets, value]);

  const displaySpecs = specs || matchedPreset?.specs || '';

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* 3D Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(prev => !prev);
          setIsCustomMode(false);
          setSearchQuery('');
        }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border-2 border-amber-300/80 hover:border-amber-500 shadow-2xs hover:shadow-xs transition text-xs font-bold text-stone-900 cursor-pointer active:translate-y-0.5 text-left"
      >
        <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
          <Film className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="truncate font-black text-stone-900">
            {value || placeholder}
          </span>
          {displaySpecs && (
            <span className="shrink-0 font-mono text-[10px] font-extrabold text-amber-900 bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-300">
              {displaySpecs}
            </span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-stone-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 3D Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-[220] w-full min-w-[280px] sm:min-w-[340px] bg-white rounded-2xl border-2 border-amber-400 shadow-2xl overflow-hidden p-2.5 space-y-2 text-stone-900 animate-in fade-in zoom-in-95 duration-100">
          {isCustomMode ? (
            /* Custom Manual Entry Mode */
            <div className="space-y-2.5 p-2 bg-amber-50/50 rounded-xl border border-amber-200/70">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1">
                  <span>✍️ Custom Deliverable</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsCustomMode(false)}
                  className="text-[10px] font-bold text-stone-400 hover:text-stone-700 underline cursor-pointer"
                >
                  Back to presets
                </button>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-stone-500 block mb-0.5">
                  Deliverable Title *
                </label>
                <input
                  type="text"
                  autoFocus
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Drone Reel / Extended Highlights"
                  className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customTitle.trim()) {
                      e.preventDefault();
                      onChange(customTitle.trim(), customSpecs.trim());
                      setIsOpen(false);
                      setIsCustomMode(false);
                    }
                  }}
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-stone-500 block mb-0.5">
                  Specs / Duration
                </label>
                <input
                  type="text"
                  value={customSpecs}
                  onChange={(e) => setCustomSpecs(e.target.value)}
                  placeholder="e.g. 1-2 Mins, 4K, 60fps"
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-800 focus:outline-none focus:border-amber-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customTitle.trim()) {
                      e.preventDefault();
                      onChange(customTitle.trim(), customSpecs.trim());
                      setIsOpen(false);
                      setIsCustomMode(false);
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCustomMode(false)}
                  className="px-2.5 py-1 rounded-lg border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!customTitle.trim()}
                  onClick={() => {
                    if (customTitle.trim()) {
                      onChange(customTitle.trim(), customSpecs.trim());
                      setIsOpen(false);
                      setIsCustomMode(false);
                    }
                  }}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-black transition cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Apply</span>
                </button>
              </div>
            </div>
          ) : (
            /* Presets Search & Selection List */
            <>
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search deliverables..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>

              {/* Presets List */}
              <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5">
                {filteredPresets.map((preset) => {
                  const isSelected = (value || '').toLowerCase() === preset.title.toLowerCase();
                  return (
                    <button
                      key={preset.title}
                      type="button"
                      onClick={() => {
                        onChange(preset.title, preset.specs || '');
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer text-left ${
                        isSelected
                          ? 'bg-amber-100/90 text-amber-950 font-black border border-amber-300'
                          : 'hover:bg-amber-50/70 text-stone-800 font-bold'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Film className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate">{preset.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {preset.specs && (
                          <span className="font-mono text-[10px] text-amber-900/90 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 font-bold">
                            {preset.specs}
                          </span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}

                {filteredPresets.length === 0 && (
                  <div className="p-3 text-center text-xs text-stone-500 space-y-1.5">
                    <p>No presets found for "{searchQuery}"</p>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(searchQuery.trim(), '');
                        setIsOpen(false);
                      }}
                      className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[11px] font-black transition cursor-pointer"
                    >
                      + Use "{searchQuery}"
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Custom Entry Option */}
              <div className="pt-1.5 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomMode(true);
                    setCustomTitle(value || searchQuery);
                    setCustomSpecs(specs || '');
                  }}
                  className="w-full py-1.5 px-3 rounded-xl border border-dashed border-amber-400 bg-amber-50/40 hover:bg-amber-100/60 text-amber-900 text-xs font-black transition flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-amber-600 stroke-[3]" />
                    <span>+ Custom / Manual Deliverable</span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-bold">Enter title &amp; specs</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function VendorAlbumDeliverablesModal({
  isOpen,
  onClose,
  workspaceId,
  vendor,
  studioName = 'StudioCore Partner Studio',
  onOpenSalaryDrawer,
}: VendorAlbumDeliverablesModalProps) {
  // Synchronous initial cache read for 0ms instant display
  const [orders, setOrders] = useState<VendorAlbumOrder[]>(() => {
    if (vendor?.id) {
      if (memCachedVendorOrders.has(vendor.id)) {
        return memCachedVendorOrders.get(vendor.id)!;
      }
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem(`sc_vendor_album_orders_${workspaceId}_${vendor.id}`) || localStorage.getItem(`vendor_orders_${vendor.id}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              memCachedVendorOrders.set(vendor.id, parsed);
              return parsed;
            }
          }
        } catch (_) {}
      }
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Studio Settings Event Types and Crew Roles
  const [studioEventTypes, setStudioEventTypes] = useState<string[]>(() => DEFAULT_EVENT_TYPES.map(e => e.name));
  const [studioCrewRoles, setStudioCrewRoles] = useState<string[]>(() => DEFAULT_CREW_ROLES.map(r => r.name));

  useEffect(() => {
    let isCancelled = false;
    async function loadSettings() {
      try {
        const [evts, roles] = await Promise.all([
          fetchWorkspaceEventTypes(workspaceId),
          fetchWorkspaceCrewRoles(workspaceId)
        ]);
        if (!isCancelled) {
          if (evts && evts.length > 0) {
            setStudioEventTypes(evts.map(e => e.name));
          }
          if (roles && roles.length > 0) {
            setStudioCrewRoles(roles.map(r => r.name));
          }
        }
      } catch (err) {
        console.warn('Failed to load studio event types or roles:', err);
      }
    }
    loadSettings();
    return () => { isCancelled = true; };
  }, [workspaceId]);

  // Advanced 3D Multi-Select Filters
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<DeliverablesFilterState>({
    startDate: '',
    endDate: '',
    eventTypes: [],
    segments: [],
    deliverables: [],
    roles: [],
    paymentStatuses: [],
    workflowStatuses: [],
    dueDateFilter: 'all',
  });

  // Active Category Tab
  const [activeCategoryTab, setActiveCategoryTab] = useState<HubCategoryTab>('shoot');

  // Progressive Lazy Rendering: Start with 10 cards
  const [visibleCardCount, setVisibleCardCount] = useState(10);

  // Selected orders for bulk invoice/statement generation
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Statement PDF Template Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<VendorInvoiceItem[]>([]);

  // Studio Profile Information Sync
  const [studioProfile, setStudioProfile] = useState<{
    name: string;
    phone: string;
    email: string;
    address: string;
  }>(() => {
    const fallbackName = (!studioName || studioName === 'My Studio' || studioName === 'StudioCore Partner Studio')
      ? 'Filmify Weddings Studio'
      : studioName;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`studio_settings_${workspaceId}`) || localStorage.getItem('sc_studio_settings');
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            name: parsed.studio_name || parsed.studioName || fallbackName,
            phone: parsed.phone || parsed.studioPhone || '+91 98765 43210',
            email: parsed.email || parsed.studioEmail || 'accounts@filmifyweddings.com',
            address: parsed.address || parsed.studioAddress || 'StudioCore Hub, Creative District, Mumbai'
          };
        }
      } catch (_) {}
    }
    return {
      name: fallbackName,
      phone: '+91 98765 43210',
      email: 'accounts@filmifyweddings.com',
      address: 'StudioCore Hub, Creative District, Mumbai'
    };
  });

  // Dedicated Add Shoot Modal State (Toolbar "+ Add Shoot" trigger)
  const [isAddShootModalOpen, setIsAddShootModalOpen] = useState(false);
  const [shootCoupleName, setShootCoupleName] = useState('');
  const [shootSelectedEvents, setShootSelectedEvents] = useState<string[]>(['Wedding Ceremony']);
  const [shootCustomEvent, setShootCustomEvent] = useState('');
  const [shootDate, setShootDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [shootTime, setShootTime] = useState('10:00 AM - 10:00 PM');
  const [shootSelectedRoles, setShootSelectedRoles] = useState<string[]>([vendor?.primary_role || 'Cinematographer']);
  const [shootAgreedFee, setShootAgreedFee] = useState(String(vendor?.daily_rate || vendor?.default_daily_rate || '5000'));
  const [shootPaidAmount, setShootPaidAmount] = useState('0');
  const [shootPayMode, setShootPayMode] = useState<'UPI' | 'Bank Transfer' | 'Cash'>('UPI');
  const [shootPayDate, setShootPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [shootPayRef, setShootPayRef] = useState('');
  const [shootNotes, setShootNotes] = useState('');
  const [isSavingShoot, setIsSavingShoot] = useState(false);

  // Add / Edit Non-Shoot Job Modal States
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<HubCategoryTab>('video_editing');
  const [newClientName, setNewClientName] = useState('');
  const [newAlbumType, setNewAlbumType] = useState('Signature Photobook');
  const [newSpecs, setNewSpecs] = useState('30 Sheets (60 Pages)');
  const [newSheets, setNewSheets] = useState('30');
  const [newFee, setNewFee] = useState('5000');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPdfUrl, setNewPdfUrl] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Inline Edit Item State
  const [editingOrder, setEditingOrder] = useState<VendorAlbumOrder | null>(null);

  // Payment & Commercials Modal State
  const [paymentTarget, setPaymentTarget] = useState<VendorAlbumOrder | null>(null);
  const [payDonePrice, setPayDonePrice] = useState('0');
  const [payPaidAmount, setPayPaidAmount] = useState('0');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState<'UPI' | 'Bank Transfer' | 'Cash'>('UPI');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Comment Drawer State for a specific order
  const [commentTarget, setCommentTarget] = useState<VendorAlbumOrder | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [commentReminder, setCommentReminder] = useState('');
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Dedicated Multi-Segment Add Assignment Modal State (Toolbar "+ Add Assignment" Trigger)
  const [isAddAssignmentModalOpen, setIsAddAssignmentModalOpen] = useState(false);
  const [assignCoupleName, setAssignCoupleName] = useState('');
  const [assignSegments, setAssignSegments] = useState<Array<{
    id: string;
    name: string;
    deliverables: Array<{
      id: string;
      title: string;
      specs: string;
      dueDate: string;
      agreedFee: string;
      paidAmount: string;
    }>;
  }>>([
    {
      id: 'seg_1',
      name: 'Wedding',
      deliverables: [
        {
          id: 'del_1',
          title: 'Cinematic Teaser',
          specs: '1-2 Mins',
          dueDate: '',
          agreedFee: '0',
          paidAmount: '0',
        }
      ]
    }
  ]);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  // Add Segment directly to Client Card State
  const [cardAddSegmentClient, setCardAddSegmentClient] = useState<string | null>(null);
  const [cardNewSegmentName, setCardNewSegmentName] = useState('Pre-Wedding');
  const [cardNewDeliverables, setCardNewDeliverables] = useState<Array<{
    id: string;
    title: string;
    specs: string;
    dueDate: string;
    agreedFee: string;
    paidAmount: string;
  }>>([
    {
      id: 'del_1',
      title: 'Cinematic Teaser',
      specs: '1-2 Mins',
      dueDate: '',
      agreedFee: '0',
      paidAmount: '0',
    }
  ]);
  const [isSavingCardSegment, setIsSavingCardSegment] = useState(false);

  // Single Deliverable directly to Segment State
  const [addDeliverableTarget, setAddDeliverableTarget] = useState<{ clientName: string; segmentName: string } | null>(null);
  const [targetDelivTitle, setTargetDelivTitle] = useState('Cinematic Teaser');
  const [targetDelivSpecs, setTargetDelivSpecs] = useState('1-2 Mins');
  const [targetDelivDueDate, setTargetDelivDueDate] = useState('');
  const [targetDelivFee, setTargetDelivFee] = useState('0');
  const [targetDelivPaid, setTargetDelivPaid] = useState('0');
  const [isSavingSingleDeliverable, setIsSavingSingleDeliverable] = useState(false);

  // Delete Confirmation States
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<VendorAlbumOrder | null>(null);
  const [deleteSegmentConfirmTarget, setDeleteSegmentConfirmTarget] = useState<{ clientName: string; segmentName: string; orders: VendorAlbumOrder[] } | null>(null);
  const [isDeletingTarget, setIsDeletingTarget] = useState(false);

  // Video Deliverables Presets (Synced from Post-Production Settings)
  const [ppVideoPresets, setPpVideoPresets] = useState<Array<{ title: string; specs: string }>>([
    { title: 'Cinematic Teaser', specs: '1-2 Mins' },
    { title: 'Full Wedding Film', specs: '25-30 Mins' },
    { title: 'Traditional Video', specs: '2-3 Hours' },
    { title: 'Instagram Reels', specs: '5 Reels' },
    { title: 'Highlight Video', specs: '3-5 Mins' },
    { title: 'Same Day Edit (SDE)', specs: '2-4 Mins' },
    { title: 'Raw Footage', specs: 'All Cameras' },
  ]);

  // Post-Production Statuses Sync
  const [ppStatuses, setPpStatuses] = useState<PostProductionStatusSetting[]>(() => {
    const cached = getCachedPostProductionSettings();
    if (cached && cached.statuses && cached.statuses.length > 0) return cached.statuses;
    return DEFAULT_POST_PRODUCTION_STATUSES;
  });

  useEffect(() => {
    fetchPostProductionSettings(workspaceId).then(settings => {
      if (settings && settings.statuses && settings.statuses.length > 0) {
        setPpStatuses(settings.statuses);
      }
      if (settings && settings.categories) {
        const videoCat = settings.categories.find(c => c.name.toLowerCase().includes('video'));
        if (videoCat && videoCat.presets && videoCat.presets.length > 0) {
          const normalized = videoCat.presets.map(p => {
            if (typeof p === 'string') return { title: p, specs: '' };
            return { title: p.title || '', specs: p.specs || p.count || '' };
          });
          setPpVideoPresets(normalized);
        }
      }
    }).catch(() => {});

    const handleSettingsUpdated = () => {
      fetchPostProductionSettings(workspaceId).then(settings => {
        if (settings && settings.statuses && settings.statuses.length > 0) {
          setPpStatuses(settings.statuses);
        }
        if (settings && settings.categories) {
          const videoCat = settings.categories.find(c => c.name.toLowerCase().includes('video'));
          if (videoCat && videoCat.presets && videoCat.presets.length > 0) {
            const normalized = videoCat.presets.map(p => {
              if (typeof p === 'string') return { title: p, specs: '' };
              return { title: p.title || '', specs: p.specs || p.count || '' };
            });
            setPpVideoPresets(normalized);
          }
        }
      }).catch(() => {});
    };
    window.addEventListener('post_production_settings_updated', handleSettingsUpdated);
    return () => {
      window.removeEventListener('post_production_settings_updated', handleSettingsUpdated);
    };
  }, [workspaceId]);

  // Attach Multiple Links Modal Target Order
  const [attachLinksOrder, setAttachLinksOrder] = useState<VendorAlbumOrder | null>(null);

  // Check member types and roles
  const isFreelancer = vendor?.primary_type === 'FREELANCER' || (vendor?.member_types || []).includes('FREELANCER');
  const isInHouse = vendor?.primary_type === 'IN_HOUSE' || (vendor?.member_types || []).includes('IN_HOUSE');
  const isPartner = vendor?.primary_type === 'PARTNER' || (vendor?.member_types || []).includes('PARTNER') || vendor?.type === 'partner';

  // Load orders with silent background revalidation
  const loadOrders = useCallback(async (silent = false) => {
    if (!vendor?.id) return;
    if (!silent) {
      setIsLoading(true);
    }
    try {
      const res = await fetch(`/api/vendors/albums?workspace_id=${workspaceId}&vendor_id=${vendor.id}&vendor_email=${encodeURIComponent(vendor.email || '')}&vendor_name=${encodeURIComponent(vendor.name || '')}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
        memCachedVendorOrders.set(vendor.id, data.orders);
        try {
          localStorage.setItem(`sc_vendor_album_orders_${workspaceId}_${vendor.id}`, JSON.stringify(data.orders));
          localStorage.setItem(`vendor_orders_${vendor.id}`, JSON.stringify(data.orders));
        } catch (_) {}
      }
    } catch (err) {
      console.warn('[VendorDeliverablesHubModal] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, vendor]);

  // Synchronous cache loading whenever modal opens or vendor changes
  useEffect(() => {
    if (isOpen && vendor?.id) {
      if (memCachedVendorOrders.has(vendor.id)) {
        setOrders(memCachedVendorOrders.get(vendor.id)!);
      } else if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem(`sc_vendor_album_orders_${workspaceId}_${vendor.id}`) || localStorage.getItem(`vendor_orders_${vendor.id}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setOrders(parsed);
              memCachedVendorOrders.set(vendor.id, parsed);
            }
          }
        } catch (_) {}
      }
      // Revalidate in background
      loadOrders(memCachedVendorOrders.has(vendor.id) || orders.length > 0);
    }
  }, [isOpen, vendor?.id]);

  // Reset lazy card count when view or filters change
  useEffect(() => {
    setVisibleCardCount(10);
  }, [activeCategoryTab, searchQuery, filters, statusFilter]);

  // Live Category Counts
  const categoryCounts = useMemo(() => {
    return {
      shoot: orders.filter(o => o.category === 'shoot').length,
      video_editing: orders.filter(o => o.category === 'video_editing').length,
      photo_editing: orders.filter(o => o.category === 'photo_editing').length,
      album_design: orders.filter(o => o.category === 'album_design' || (!o.category && !o.service_type?.includes('Print'))).length,
      album_printing: orders.filter(o => o.category === 'album_printing' || o.service_type?.includes('Print')).length,
    };
  }, [orders]);

  // Dynamic Visible Navigation Tabs
  const visibleTabs = useMemo(() => {
    const tabs: Array<{ id: HubCategoryTab; label: string; icon: string; count: number }> = [];

    const shootCount = categoryCounts.shoot;
    const isShootRole = /photo|cinema|drone|traditional|camera|shoot/i.test(vendor.primary_role || '') || isFreelancer || isInHouse;
    if (shootCount > 0 || isShootRole) {
      tabs.push({ id: 'shoot', label: 'Shoots', icon: '📸', count: shootCount });
    }

    const videoCount = categoryCounts.video_editing;
    if (videoCount > 0 || /video\s*editor/i.test(vendor.primary_role || '')) {
      tabs.push({ id: 'video_editing', label: 'Video Editing', icon: '🎬', count: videoCount });
    }

    const photoCount = categoryCounts.photo_editing;
    if (photoCount > 0 || /photo\s*editor|retouch/i.test(vendor.primary_role || '')) {
      tabs.push({ id: 'photo_editing', label: 'Photo Editing', icon: '✨', count: photoCount });
    }

    const albumCount = categoryCounts.album_design;
    if (albumCount > 0 || /album\s*design/i.test(vendor.primary_role || '')) {
      tabs.push({ id: 'album_design', label: 'Album Designing', icon: '🎨', count: albumCount });
    }

    const printCount = categoryCounts.album_printing;
    if (printCount > 0 || /print|lab|binding/i.test(vendor.primary_role || '') || isPartner) {
      tabs.push({ id: 'album_printing', label: 'Album Printing', icon: '📖', count: printCount });
    }

    if (tabs.length === 0) {
      tabs.push({ id: 'shoot', label: 'Shoots', icon: '📸', count: shootCount });
      tabs.push({ id: 'album_printing', label: 'Album Printing', icon: '📖', count: printCount });
    }

    return tabs;
  }, [categoryCounts, vendor.primary_role, isFreelancer, isInHouse, isPartner]);

  useEffect(() => {
    if (isOpen && visibleTabs.length > 0) {
      if (!visibleTabs.some(t => t.id === activeCategoryTab)) {
        const firstWithItems = visibleTabs.find(t => t.count > 0) || visibleTabs[0];
        setActiveCategoryTab(firstWithItems.id);
      }
    }
  }, [isOpen, visibleTabs, activeCategoryTab]);

  // Format Shoot Date helper (e.g. 28 NOV 2026 or 18 MAR 2026)
  const formatShootDate = (rawDate?: string): string => {
    if (!rawDate) return 'Date Scheduled';
    try {
      const match = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, y, m, d] = match;
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const monthName = months[parseInt(m, 10) - 1] || m;
        return `${d} ${monthName} ${y}`;
      }
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const monthName = months[d.getMonth()];
        const year = d.getFullYear();
        return `${day} ${monthName} ${year}`;
      }
      return rawDate;
    } catch (_) {
      return rawDate;
    }
  };

  // Dynamically derive Segments strictly from non-shoot cards (e.g. Wedding, Pre-Wedding, Reception, Haldi)
  const cardSegments = useMemo(() => {
    const set = new Set<string>();
    const targetOrders = orders.filter(o => {
      const itemCat = o.category || detectDeliverableCategory(undefined, o.album_type || o.item_title);
      return itemCat === activeCategoryTab;
    });

    targetOrders.forEach(o => {
      const seg = detectDeliverableSegment(o.segment, o.item_title || o.album_type, o.event_name);
      if (seg && typeof seg === 'string') {
        const clean = seg.trim();
        if (clean) set.add(clean);
      }
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [orders, activeCategoryTab]);

  // Dynamically derive Deliverable Titles strictly from non-shoot cards (e.g. Cinematic Wedding Film, Teaser, Reels)
  const cardDeliverables = useMemo(() => {
    const set = new Set<string>();
    const targetOrders = orders.filter(o => {
      const itemCat = o.category || detectDeliverableCategory(undefined, o.album_type || o.item_title);
      return itemCat === activeCategoryTab;
    });

    targetOrders.forEach(o => {
      const title = o.item_title || o.album_type;
      if (title && typeof title === 'string') {
        const clean = title.trim();
        if (clean) set.add(clean);
      }
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [orders, activeCategoryTab]);

  // Dynamically derive Event Types strictly from Shoot cards (NOT global settings)
  const cardEventTypes = useMemo(() => {
    const set = new Set<string>();
    const targetOrders = orders.filter(o => {
      const itemCat = o.category || detectDeliverableCategory(undefined, o.album_type || o.item_title);
      return itemCat === 'shoot';
    });

    targetOrders.forEach(o => {
      const raw = o.event_name || o.item_title || o.album_type;
      if (!raw || typeof raw !== 'string') return;
      if (/sheet|page|photo\s*book|flush\s*mount|album\s*size|matte|glossy|diamond|inch|x\s*\d/i.test(raw)) return;

      const parts = raw.split(/[,|•]/);
      for (let part of parts) {
        part = part.trim();
        if (part && part.length > 1 && !/sheet|page|inch|x\s*\d/i.test(part)) {
          const formatted = part
            .split(/\s+/)
            .map(word => {
              if (word.includes('-')) {
                return word.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('-');
              }
              return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(' ');
          set.add(formatted);
        }
      }
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [orders]);

  // Dynamically derive Crew Roles strictly from the member's assigned cards (NOT global settings)
  const cardCrewRoles = useMemo(() => {
    const set = new Set<string>();
    const targetOrders = orders.filter(o => {
      const itemCat = o.category || detectDeliverableCategory(undefined, o.album_type || o.item_title);
      return itemCat === activeCategoryTab;
    });

    targetOrders.forEach(o => {
      const raw = o.role || o.service_type;
      if (!raw || typeof raw !== 'string') return;
      if (/sheet|page|album|print|book/i.test(raw)) return;

      const parts = raw.split(/[,|•]/);
      for (let part of parts) {
        part = part.trim();
        if (part && part.length > 1 && !/sheet|page|album|print/i.test(part)) {
          const formatted = part
            .split(/\s+/)
            .map(word => {
              if (word.includes('-')) {
                return word.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('-');
              }
              return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(' ');
          set.add(formatted);
        }
      }
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [orders, activeCategoryTab]);

  // Unique client names for assignment autocomplete
  const availableClientNames = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => {
      if (o.client_name?.trim()) set.add(o.client_name.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [orders]);

  // Aggregate totals for the multi-segment assignment builder
  const assignTotals = useMemo(() => {
    let totalAgreed = 0;
    let totalPaid = 0;
    let deliverableCount = 0;

    assignSegments.forEach(seg => {
      seg.deliverables.forEach(del => {
        deliverableCount++;
        totalAgreed += Number(del.agreedFee) || 0;
        totalPaid += Number(del.paidAmount) || 0;
      });
    });

    const balanceDue = Math.max(0, totalAgreed - totalPaid);
    return { totalAgreed, totalPaid, balanceDue, deliverableCount };
  }, [assignSegments]);

  // Filtered Orders for Current Tab with Multi-Select Filters
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // 1. Strict Category Match
      const itemCat = o.category || detectDeliverableCategory(undefined, o.album_type || o.item_title);
      if (itemCat !== activeCategoryTab) return false;

      // 2. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesClient = (o.client_name || '').toLowerCase().includes(q);
        const matchesAlbum = (o.album_type || o.item_title || o.event_name || '').toLowerCase().includes(q);
        const matchesSpecs = (o.specs || '').toLowerCase().includes(q);
        const matchesRole = (o.role || o.service_type || '').toLowerCase().includes(q);
        if (!matchesClient && !matchesAlbum && !matchesSpecs && !matchesRole) return false;
      }

      // 3. Status Filter (Non-shoots)
      if (activeCategoryTab !== 'shoot' && statusFilter !== 'All' && o.order_status !== statusFilter) {
        return false;
      }

      // 4. Date Range Filter
      const orderDate = o.event_date || o.order_date || o.due_date;
      if (filters.startDate && orderDate && orderDate < filters.startDate) return false;
      if (filters.endDate && orderDate && orderDate > filters.endDate) return false;

      // 5. Event Types Multi-Select Filter (Matching against shoot event types)
      if (activeCategoryTab === 'shoot' && filters.eventTypes.length > 0) {
        const rawEvent = (o.event_name || o.album_type || o.item_title || '').toLowerCase();
        const matchesEvent = filters.eventTypes.some(et => {
          const filterLower = et.toLowerCase();
          const tokens = rawEvent.split(/[,|•]/).map(t => t.trim().toLowerCase());
          return tokens.includes(filterLower) || rawEvent.includes(filterLower);
        });
        if (!matchesEvent) return false;
      }

      // 5b. Segments Multi-Select Filter (For Non-Shoots: Pre-Wedding, Wedding, Reception, Haldi, etc.)
      if (activeCategoryTab !== 'shoot' && filters.segments && filters.segments.length > 0) {
        const orderSeg = detectDeliverableSegment(o.segment, o.item_title || o.album_type, o.event_name).toLowerCase();
        const matchesSeg = filters.segments.some(seg => seg.toLowerCase() === orderSeg);
        if (!matchesSeg) return false;
      }

      // 5c. Deliverables Multi-Select Filter (For Non-Shoots: Cinematic Film, Teaser, Reels, etc.)
      if (activeCategoryTab !== 'shoot' && filters.deliverables && filters.deliverables.length > 0) {
        const orderDeliv = (o.item_title || o.album_type || '').toLowerCase();
        const matchesDeliv = filters.deliverables.some(d => d.toLowerCase() === orderDeliv);
        if (!matchesDeliv) return false;
      }

      // 6. Crew Roles Multi-Select Filter (Matching against card-assigned crew roles)
      if (activeCategoryTab === 'shoot' && filters.roles.length > 0) {
        const rawRole = (o.role || o.service_type || '').toLowerCase();
        const matchesRole = filters.roles.some(r => {
          const roleLower = r.toLowerCase();
          const tokens = rawRole.split(/[,|•]/).map(t => t.trim().toLowerCase());
          return tokens.includes(roleLower) || rawRole.includes(roleLower);
        });
        if (!matchesRole) return false;
      }

      // 7. Payment Status Multi-Select Filter
      if (filters.paymentStatuses.length > 0) {
        const tot = Number(o.total_amount || 0);
        const paid = Number(o.paid_amount || 0);
        const bal = Number(o.balance_amount || 0);

        let statusKey = 'UNPAID';
        if (tot === 0 && paid === 0 && bal === 0) statusKey = 'UNSETTLED';
        else if (tot > 0 && bal === 0 && paid >= tot) statusKey = 'FULL PAID';
        else if (paid > 0 && bal > 0) statusKey = 'PARTIALLY PAID';
        else statusKey = 'UNPAID';

        if (!filters.paymentStatuses.includes(statusKey)) return false;
      }

      // 8. Workflow Status Multi-Select Filter (Post-Production Synced + None Support)
      if (filters.workflowStatuses && filters.workflowStatuses.length > 0) {
        const orderStatusLower = (o.order_status || '').toLowerCase();
        const matchesStatus = filters.workflowStatuses.some(st => {
          const stLower = st.toLowerCase();
          if ((stLower === 'none' || stLower === 'unset') && (!orderStatusLower || orderStatusLower === 'none' || orderStatusLower === 'unset')) {
            return true;
          }
          return stLower === orderStatusLower;
        });
        if (!matchesStatus) return false;
      }

      // 9. Due Date Urgency Filter
      if (filters.dueDateFilter && filters.dueDateFilter !== 'all') {
        const dueStr = o.due_date;
        if (!dueStr) return false;
        const due = new Date(dueStr);
        if (isNaN(due.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const isDone = (o.order_status || '').toLowerCase().includes('done') || (o.order_status || '').toLowerCase().includes('completed');

        if (filters.dueDateFilter === 'overdue') {
          if (isDone || diffDays >= 0) return false;
        } else if (filters.dueDateFilter === 'due_today') {
          if (diffDays !== 0) return false;
        } else if (filters.dueDateFilter === 'due_this_week') {
          if (diffDays < 0 || diffDays > 7) return false;
        }
      }

      return true;
    });
  }, [orders, activeCategoryTab, searchQuery, statusFilter, filters]);

  // Progressive Lazy Slice
  const displayedOrders = useMemo(() => {
    return filteredOrders.slice(0, visibleCardCount);
  }, [filteredOrders, visibleCardCount]);

  // Group non-shoot deliverables by client/couple for Single Couple Card
  const clientGroups = useMemo(() => {
    const map = new Map<string, VendorAlbumOrder[]>();
    for (const o of filteredOrders) {
      const key = (o.client_name || 'Valued Couple').trim();
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(o);
    }

    const groups: Array<{
      clientName: string;
      orders: VendorAlbumOrder[];
      totalAgreed: number;
      totalPaid: number;
      totalBalance: number;
    }> = [];

    for (const [cName, list] of map.entries()) {
      const totalAgreed = list.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      const totalPaid = list.reduce((sum, o) => sum + (Number(o.paid_amount) || 0), 0);
      const totalBalance = Math.max(0, totalAgreed - totalPaid);

      groups.push({
        clientName: cName,
        orders: list,
        totalAgreed,
        totalPaid,
        totalBalance,
      });
    }

    return groups;
  }, [filteredOrders]);

  const displayedClientGroups = useMemo(() => {
    return clientGroups.slice(0, visibleCardCount);
  }, [clientGroups, visibleCardCount]);

  // Active Filters Count
  const activeFiltersCount = 
    (filters.startDate || filters.endDate ? 1 : 0) +
    (activeCategoryTab === 'shoot' ? filters.eventTypes.length : 0) +
    (activeCategoryTab !== 'shoot' ? (filters.segments?.length || 0) : 0) +
    (activeCategoryTab !== 'shoot' ? (filters.deliverables?.length || 0) : 0) +
    (activeCategoryTab === 'shoot' ? filters.roles.length : 0) +
    filters.paymentStatuses.length +
    (filters.workflowStatuses?.length || 0) +
    (filters.dueDateFilter && filters.dueDateFilter !== 'all' ? 1 : 0);

  // Dynamic Tab Metrics Calculation based on filtered results
  const tabTotalCount = filteredOrders.length;
  const tabFeeSum = filteredOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const tabPaidSum = filteredOrders.reduce((sum, o) => sum + (Number(o.paid_amount) || 0), 0);
  const tabBalanceDue = Math.max(0, tabFeeSum - tabPaidSum);

  // Toggle selection
  const handleToggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  // Change Status Handler for non-shoots
  const handleStatusChange = async (order: VendorAlbumOrder, nextStatus: string) => {
    const updated = { ...order, order_status: nextStatus };
    setOrders(prev => prev.map(o => o.id === order.id ? updated : o));

    try {
      await saveVendorAlbumOrder(workspaceId, updated);
    } catch (_) {}

    await fetch('/api/vendors/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});
  };

  // Save Multiple Attached Links Handler
  const handleSaveAttachLinks = async (links: DeliverableAttachedLink[]) => {
    if (!attachLinksOrder) return;
    const firstUrl = links[0]?.url || '';
    const updated: VendorAlbumOrder = {
      ...attachLinksOrder,
      drive_links: links,
      drive_folder_url: firstUrl || attachLinksOrder.drive_folder_url || '',
    };
    setOrders(prev => prev.map(o => o.id === attachLinksOrder.id ? updated : o));
    setAttachLinksOrder(null);

    try {
      await saveVendorAlbumOrder(workspaceId, updated);
    } catch (err) {
      console.warn('Failed to save attached links:', err);
    }
  };

  // ── SAVE DEDICATED NEW SHOOT ──
  const handleSaveNewShoot = async () => {
    if (!shootCoupleName.trim()) return;
    setIsSavingShoot(true);
    const agreedNum = Number(shootAgreedFee) || 0;
    const paidNum = Number(shootPaidAmount) || 0;
    const balNum = Math.max(0, agreedNum - paidNum);
    const isFull = agreedNum > 0 && paidNum >= agreedNum;

    const allEvents = [...shootSelectedEvents];
    if (shootCustomEvent.trim() && !allEvents.includes(shootCustomEvent.trim())) {
      allEvents.push(shootCustomEvent.trim());
    }
    const eventTitle = allEvents.join(', ') || 'Wedding Ceremony';
    const roleTitle = shootSelectedRoles.join(', ') || vendor?.primary_role || 'Cinematographer';

    const payload: Partial<VendorAlbumOrder> = {
      workspace_id: workspaceId,
      partner_id: vendor.id,
      partner_name: vendor.name,
      partner_email: vendor.email || '',
      client_name: shootCoupleName.trim(),
      category: 'shoot',
      item_title: eventTitle,
      event_name: eventTitle,
      album_type: eventTitle,
      specs: shootTime ? `${shootDate} • ${shootTime}` : shootDate || 'Scheduled Shoot',
      service_type: roleTitle,
      role: roleTitle,
      event_date: shootDate,
      event_time: shootTime,
      sheet_count: 1,
      page_count: 1,
      rate_per_sheet: 0,
      total_amount: agreedNum,
      paid_amount: paidNum,
      balance_amount: balNum,
      order_status: isFull ? 'Completed' : 'In Progress',
      payment_status: isFull ? 'PAID' : paidNum > 0 ? 'PARTIAL' : 'PENDING',
      order_date: shootDate || new Date().toISOString().split('T')[0],
      due_date: shootDate || '',
      notes: shootNotes.trim(),
    };

    try {
      const res = await fetch('/api/vendors/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.order) {
        const newOrder = data.order;
        
        // If payment recorded upfront, sync payment
        if (paidNum > 0) {
          await fetch('/api/vendors/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: newOrder.id,
              workspaceId,
              partnerId: vendor.id,
              partnerName: vendor.name,
              totalAmount: agreedNum,
              paidAmount: paidNum,
              isFullPaid: isFull,
              paymentMode: shootPayMode,
              paymentDate: shootPayDate,
              referenceNo: shootPayRef,
              notes: shootNotes,
              autoSyncExpense: true
            })
          }).catch(() => {});
        }

        setOrders(prev => {
          const updated = [newOrder, ...prev];
          memCachedVendorOrders.set(vendor.id, updated);
          try {
            localStorage.setItem(`sc_vendor_album_orders_${workspaceId}_${vendor.id}`, JSON.stringify(updated));
            localStorage.setItem(`vendor_orders_${vendor.id}`, JSON.stringify(updated));
          } catch (_) {}
          return updated;
        });

        setIsAddShootModalOpen(false);
        setShootCoupleName('');
        setShootSelectedEvents(['Wedding Ceremony']);
        setShootCustomEvent('');
        setShootPaidAmount('0');
        setShootPayRef('');
        setShootNotes('');
      }
    } catch (err) {
      console.warn('Save shoot error:', err);
    } finally {
      setIsSavingShoot(false);
    }
  };

  // Add / Save New Non-Shoot Assignment
  const handleSaveNewJob = async () => {
    if (!newClientName.trim()) return;
    const isAlbum = newCategory === 'album_design' || newCategory === 'album_printing';
    const sheetNum = parseInt(newSheets, 10) || (isAlbum ? 30 : 0);
    const totalFeeNum = Number(newFee) || (newCategory === 'album_design' ? sheetNum * 150 : 0);

    const payload: Partial<VendorAlbumOrder> = {
      workspace_id: workspaceId,
      partner_id: vendor.id,
      partner_name: vendor.name,
      partner_email: vendor.email || '',
      client_name: newClientName.trim(),
      category: newCategory,
      item_title: newAlbumType || 'Creative Task',
      album_type: newAlbumType || 'Creative Task',
      specs: newSpecs.trim() || (isAlbum ? `${sheetNum} Sheets` : ''),
      sheet_count: sheetNum,
      page_count: sheetNum * 2,
      rate_per_sheet: newCategory === 'album_design' && sheetNum > 0 ? Math.round(totalFeeNum / sheetNum) : 0,
      total_amount: totalFeeNum,
      paid_amount: 0,
      balance_amount: totalFeeNum,
      order_status: '',
      payment_status: 'PENDING',
      due_date: newDueDate || '',
      pdf_proof_url: newPdfUrl.trim() || '',
      notes: newNotes.trim() || ''
    };

    const res = await fetch('/api/vendors/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success && json.order) {
      setOrders(prev => {
        const updated = [json.order, ...prev];
        memCachedVendorOrders.set(vendor.id, updated);
        return updated;
      });
      setActiveCategoryTab(newCategory);
      setIsAddJobOpen(false);
      setNewClientName('');
      setNewDueDate('');
      setNewPdfUrl('');
      setNewNotes('');
    }
  };

  // Quick Segment Suggestions for Deliverables Builder
  const SEGMENT_PRESETS = ['Wedding', 'Pre-Wedding', 'Reception', 'Sangeet', 'Haldi', 'Engagement', 'Cocktail', 'Mehndi'];

  const handleAddSegment = () => {
    const nextIdx = assignSegments.length + 1;
    const defaultSegName = SEGMENT_PRESETS[nextIdx - 1] || `Segment ${nextIdx}`;
    setAssignSegments(prev => [
      ...prev,
      {
        id: `seg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: defaultSegName,
        deliverables: [
          {
            id: `del_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            title: ppVideoPresets[0]?.title || 'Cinematic Teaser',
            specs: ppVideoPresets[0]?.specs || '',
            dueDate: '',
            agreedFee: '0',
            paidAmount: '0',
          }
        ]
      }
    ]);
  };

  const handleRemoveSegment = (segmentId: string) => {
    if (assignSegments.length <= 1) return;
    setAssignSegments(prev => prev.filter(s => s.id !== segmentId));
  };

  const handleUpdateSegmentName = (segmentId: string, name: string) => {
    setAssignSegments(prev => prev.map(s => s.id === segmentId ? { ...s, name } : s));
  };

  const handleAddDeliverable = (segmentId: string) => {
    const defaultDel = ppVideoPresets[0] || { title: 'Cinematic Teaser', specs: '1-2 Mins' };
    setAssignSegments(prev => prev.map(s => {
      if (s.id !== segmentId) return s;
      return {
        ...s,
        deliverables: [
          ...s.deliverables,
          {
            id: `del_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            title: defaultDel.title,
            specs: defaultDel.specs,
            dueDate: '',
            agreedFee: '0',
            paidAmount: '0',
          }
        ]
      };
    }));
  };

  const handleRemoveDeliverable = (segmentId: string, delId: string) => {
    setAssignSegments(prev => prev.map(s => {
      if (s.id !== segmentId) return s;
      if (s.deliverables.length <= 1) return s;
      return {
        ...s,
        deliverables: s.deliverables.filter(d => d.id !== delId)
      };
    }));
  };

  const handleUpdateDeliverable = (
    segmentId: string,
    delId: string,
    updates: Partial<{
      title: string;
      specs: string;
      dueDate: string;
      agreedFee: string;
      paidAmount: string;
    }>
  ) => {
    setAssignSegments(prev => prev.map(s => {
      if (s.id !== segmentId) return s;
      return {
        ...s,
        deliverables: s.deliverables.map(d => {
          if (d.id !== delId) return d;
          return { ...d, ...updates };
        })
      };
    }));
  };

  const handleSaveAssignments = async () => {
    if (!assignCoupleName.trim()) return;
    setIsSavingAssignment(true);

    const targetCategory = activeCategoryTab === 'shoot' ? 'video_editing' : activeCategoryTab;
    const isAlbum = targetCategory === 'album_design' || targetCategory === 'album_printing';
    const createdOrders: VendorAlbumOrder[] = [];

    try {
      for (const seg of assignSegments) {
        const segName = seg.name.trim() || 'Wedding';
        for (const del of seg.deliverables) {
          if (!del.title.trim()) continue;

          const agreedNum = Number(del.agreedFee) || 0;
          const paidNum = Number(del.paidAmount) || 0;
          const balNum = Math.max(0, agreedNum - paidNum);
          const isFull = agreedNum > 0 && paidNum >= agreedNum;

          const payload: Partial<VendorAlbumOrder> = {
            workspace_id: workspaceId,
            partner_id: vendor.id,
            partner_name: vendor.name,
            partner_email: vendor.email || '',
            client_name: assignCoupleName.trim(),
            category: targetCategory,
            segment: segName,
            item_title: del.title.trim(),
            album_type: del.title.trim(),
            event_name: segName,
            specs: del.specs.trim(), // strictly empty if blank, no sheet fallback for video!
            sheet_count: isAlbum ? 30 : 0,
            page_count: isAlbum ? 60 : 0,
            rate_per_sheet: 0,
            total_amount: agreedNum,
            paid_amount: paidNum,
            balance_amount: balNum,
            order_status: '', // empty / None workflow status by default
            payment_status: isFull ? 'PAID' : paidNum > 0 ? 'PARTIAL' : 'PENDING',
            order_date: new Date().toISOString().split('T')[0],
            due_date: del.dueDate || '',
            notes: '',
          };

          const res = await fetch('/api/vendors/albums', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const json = await res.json();
          if (json.success && json.order) {
            const savedOrder: VendorAlbumOrder = json.order;
            createdOrders.push(savedOrder);

            // Record initial payment if provided
            if (paidNum > 0) {
              await fetch('/api/vendors/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId: savedOrder.id,
                  workspaceId,
                  partnerId: vendor.id,
                  partnerName: vendor.name,
                  totalAmount: agreedNum,
                  paidAmount: paidNum,
                  isFullPaid: isFull,
                  paymentMode: 'Bank Transfer',
                  paymentDate: new Date().toISOString().split('T')[0],
                  notes: `Initial advance recorded for ${del.title}`,
                  autoSyncExpense: true
                })
              }).catch(() => {});
            }
          }
        }
      }

      if (createdOrders.length > 0) {
        setOrders(prev => {
          const updated = [...createdOrders, ...prev];
          memCachedVendorOrders.set(vendor.id, updated);
          try {
            localStorage.setItem(`sc_vendor_album_orders_${workspaceId}_${vendor.id}`, JSON.stringify(updated));
            localStorage.setItem(`vendor_orders_${vendor.id}`, JSON.stringify(updated));
          } catch (_) {}
          return updated;
        });

        // Reset assignment form state
        setAssignCoupleName('');
        setAssignSegments([
          {
            id: 'seg_1',
            name: 'Wedding',
            deliverables: [
              {
                id: 'del_1',
                title: ppVideoPresets[0]?.title || 'Cinematic Teaser',
                specs: ppVideoPresets[0]?.specs || '',
                dueDate: '',
                agreedFee: '0',
                paidAmount: '0',
              }
            ]
          }
        ]);
        setIsAddAssignmentModalOpen(false);
      }
    } catch (err) {
      console.warn('Failed to save assignments:', err);
    } finally {
      setIsSavingAssignment(false);
    }
  };

  // Save Inline Edit Modal
  const handleSaveEditOrder = async () => {
    if (!editingOrder) return;
    try {
      const res = await fetch('/api/vendors/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingOrder)
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrders(prev => prev.map(o => o.id === data.order.id ? data.order : o));
        setEditingOrder(null);
      } else {
        setOrders(prev => prev.map(o => o.id === editingOrder.id ? editingOrder : o));
        setEditingOrder(null);
      }
    } catch (err) {
      console.warn('Edit save error:', err);
    }
  };

  // Delete Order Handler (Trigger 3D Modal instead of native window.confirm)
  const handleDeleteOrder = (orderId: string) => {
    const target = orders.find(o => o.id === orderId);
    if (target) {
      setDeleteConfirmTarget(target);
    }
  };

  // Single Deliverable Deletion with DB Persistence
  const handleConfirmDeleteDeliverable = async () => {
    if (!deleteConfirmTarget) return;
    setIsDeletingTarget(true);
    try {
      const res = await fetch('/api/vendors/albums', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: deleteConfirmTarget.id })
      });
      const data = await res.json();
      if (data.success) {
        setOrders(prev => {
          const updated = prev.filter(o => o.id !== deleteConfirmTarget.id);
          memCachedVendorOrders.set(vendor.id, updated);
          try {
            localStorage.setItem(`sc_vendor_album_orders_${workspaceId}_${vendor.id}`, JSON.stringify(updated));
            localStorage.setItem(`vendor_orders_${vendor.id}`, JSON.stringify(updated));
          } catch (_) {}
          return updated;
        });
      }
    } catch (err) {
      console.warn('Failed to delete deliverable:', err);
    } finally {
      setIsDeletingTarget(false);
      setDeleteConfirmTarget(null);
    }
  };

  // Entire Segment Deletion with DB Persistence
  const handleConfirmDeleteSegment = async () => {
    if (!deleteSegmentConfirmTarget) return;
    setIsDeletingTarget(true);
    const orderIdsToDelete = deleteSegmentConfirmTarget.orders.map(o => o.id);
    try {
      await Promise.all(
        orderIdsToDelete.map(orderId =>
          fetch('/api/vendors/albums', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId })
          })
        )
      );
      setOrders(prev => {
        const updated = prev.filter(o => !orderIdsToDelete.includes(o.id));
        memCachedVendorOrders.set(vendor.id, updated);
        try {
          localStorage.setItem(`sc_vendor_album_orders_${workspaceId}_${vendor.id}`, JSON.stringify(updated));
          localStorage.setItem(`vendor_orders_${vendor.id}`, JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });
    } catch (err) {
      console.warn('Failed to delete segment:', err);
    } finally {
      setIsDeletingTarget(false);
      setDeleteSegmentConfirmTarget(null);
    }
  };

  // Handler for adding a deliverable under a specific segment
  const handleSaveSingleDeliverable = async () => {
    if (!addDeliverableTarget || !targetDelivTitle.trim()) return;
    setIsSavingSingleDeliverable(true);
    const targetCategory = activeCategoryTab === 'shoot' ? 'video_editing' : activeCategoryTab;
    const agreedNum = Number(targetDelivFee) || 0;
    const paidNum = Number(targetDelivPaid) || 0;
    const balNum = Math.max(0, agreedNum - paidNum);
    const isFull = agreedNum > 0 && paidNum >= agreedNum;

    const payload: Partial<VendorAlbumOrder> = {
      workspace_id: workspaceId,
      partner_id: vendor.id,
      partner_name: vendor.name,
      partner_email: vendor.email || '',
      client_name: addDeliverableTarget.clientName,
      category: targetCategory,
      segment: detectDeliverableSegment(addDeliverableTarget.segmentName, targetDelivTitle.trim()),
      item_title: targetDelivTitle.trim(),
      album_type: targetDelivTitle.trim(),
      event_name: addDeliverableTarget.segmentName,
      specs: targetDelivSpecs.trim(),
      sheet_count: 0,
      page_count: 0,
      rate_per_sheet: 0,
      total_amount: agreedNum,
      paid_amount: paidNum,
      balance_amount: balNum,
      order_status: '',
      payment_status: isFull ? 'PAID' : paidNum > 0 ? 'PARTIAL' : 'PENDING',
      order_date: new Date().toISOString().split('T')[0],
      due_date: targetDelivDueDate || '',
      notes: '',
    };

    try {
      const res = await fetch('/api/vendors/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success && json.order) {
        const savedOrder: VendorAlbumOrder = json.order;
        setOrders(prev => {
          const updated = [savedOrder, ...prev];
          memCachedVendorOrders.set(vendor.id, updated);
          try {
            localStorage.setItem(`sc_vendor_album_orders_${workspaceId}_${vendor.id}`, JSON.stringify(updated));
            localStorage.setItem(`vendor_orders_${vendor.id}`, JSON.stringify(updated));
          } catch (_) {}
          return updated;
        });

        if (paidNum > 0) {
          await fetch('/api/vendors/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: savedOrder.id,
              workspaceId,
              partnerId: vendor.id,
              partnerName: vendor.name,
              totalAmount: agreedNum,
              paidAmount: paidNum,
              isFullPaid: isFull,
              paymentMode: 'Bank Transfer',
              paymentDate: new Date().toISOString().split('T')[0],
              notes: `Initial advance recorded for ${targetDelivTitle}`,
              autoSyncExpense: true
            })
          }).catch(() => {});
        }

        setAddDeliverableTarget(null);
      }
    } catch (err) {
      console.warn('Failed to save deliverable:', err);
    } finally {
      setIsSavingSingleDeliverable(false);
    }
  };

  // Handler for adding a new segment with deliverables to a client
  const handleSaveCardSegment = async () => {
    if (!cardAddSegmentClient || !cardNewSegmentName.trim()) return;
    setIsSavingCardSegment(true);
    const targetCategory = activeCategoryTab === 'shoot' ? 'video_editing' : activeCategoryTab;
    const isAlbum = targetCategory === 'album_design' || targetCategory === 'album_printing';
    const createdOrders: VendorAlbumOrder[] = [];

    try {
      const segName = detectDeliverableSegment(cardNewSegmentName.trim());
      for (const del of cardNewDeliverables) {
        if (!del.title.trim()) continue;
        const agreedNum = Number(del.agreedFee) || 0;
        const paidNum = Number(del.paidAmount) || 0;
        const balNum = Math.max(0, agreedNum - paidNum);
        const isFull = agreedNum > 0 && paidNum >= agreedNum;

        const payload: Partial<VendorAlbumOrder> = {
          workspace_id: workspaceId,
          partner_id: vendor.id,
          partner_name: vendor.name,
          partner_email: vendor.email || '',
          client_name: cardAddSegmentClient,
          category: targetCategory,
          segment: segName,
          item_title: del.title.trim(),
          album_type: del.title.trim(),
          event_name: segName,
          specs: del.specs.trim(),
          sheet_count: isAlbum ? 30 : 0,
          page_count: isAlbum ? 60 : 0,
          rate_per_sheet: 0,
          total_amount: agreedNum,
          paid_amount: paidNum,
          balance_amount: balNum,
          order_status: '',
          payment_status: isFull ? 'PAID' : paidNum > 0 ? 'PARTIAL' : 'PENDING',
          order_date: new Date().toISOString().split('T')[0],
          due_date: del.dueDate || '',
          notes: '',
        };

        const res = await fetch('/api/vendors/albums', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success && json.order) {
          createdOrders.push(json.order);
        }
      }

      if (createdOrders.length > 0) {
        setOrders(prev => {
          const updated = [...createdOrders, ...prev];
          memCachedVendorOrders.set(vendor.id, updated);
          try {
            localStorage.setItem(`sc_vendor_album_orders_${workspaceId}_${vendor.id}`, JSON.stringify(updated));
            localStorage.setItem(`vendor_orders_${vendor.id}`, JSON.stringify(updated));
          } catch (_) {}
          return updated;
        });
        setCardAddSegmentClient(null);
      }
    } catch (err) {
      console.warn('Failed to add segment to client:', err);
    } finally {
      setIsSavingCardSegment(false);
    }
  };

  // Open Payment & Commercials Modal
  const handleOpenRecordPayment = (order: VendorAlbumOrder) => {
    setPaymentTarget(order);
    setPayDonePrice(String(order.total_amount || 0));
    setPayPaidAmount(String(order.paid_amount || 0));
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMode('UPI');
    setPayRef('');
    setPayNotes(order.notes || '');
  };

  // Record Payment Submit with Commercials Persistence
  const handleRecordPayment = async () => {
    if (!paymentTarget) return;
    const doneNum = Number(payDonePrice) || 0;
    const paidNum = Number(payPaidAmount) || 0;
    const isFull = doneNum > 0 && paidNum >= doneNum;
    setIsSubmittingPayment(true);

    try {
      const res = await fetch('/api/vendors/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: paymentTarget.id,
          workspaceId,
          partnerId: vendor.id,
          partnerName: vendor.name,
          totalAmount: doneNum,
          paidAmount: isFull ? doneNum : paidNum,
          isFullPaid: isFull,
          paymentMode: payMode,
          paymentDate: payDate,
          referenceNo: payRef,
          notes: payNotes,
          autoSyncExpense: true
        })
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrders(prev => prev.map(o => o.id === data.order.id ? data.order : o));
        setPaymentTarget(null);
      } else {
        const bal = Math.max(0, doneNum - paidNum);
        const updated: VendorAlbumOrder = {
          ...paymentTarget,
          total_amount: doneNum,
          paid_amount: paidNum,
          balance_amount: bal,
          payment_status: bal === 0 && doneNum > 0 ? 'PAID' : paidNum > 0 ? 'PARTIAL' : 'PENDING'
        };
        setOrders(prev => prev.map(o => o.id === paymentTarget.id ? updated : o));
        setPaymentTarget(null);
      }
    } catch (err) {
      console.warn('Payment submit error:', err);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Quick Preset Helper for Notes Reminder
  const setQuickReminderPreset = (preset: 'tomorrow_morning' | 'in_2_days' | 'in_3_days') => {
    const d = new Date();
    if (preset === 'tomorrow_morning') {
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
    } else if (preset === 'in_2_days') {
      d.setDate(d.getDate() + 2);
      d.setHours(10, 0, 0, 0);
    } else if (preset === 'in_3_days') {
      d.setDate(d.getDate() + 3);
      d.setHours(10, 0, 0, 0);
    }
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dtStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setCommentReminder(dtStr);
  };

  // Add Comment Submit
  const handleAddComment = async (isVoice: boolean = false) => {
    if (!commentTarget || !commentInput.trim()) return;
    setIsSubmittingComment(true);
    try {
      const res = await fetch('/api/vendors/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: commentTarget.id,
          author: studioName || 'Studio Lead',
          text: commentInput.trim(),
          reminderAt: commentReminder || undefined,
          isVoice
        })
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrders(prev => prev.map(o => o.id === data.order.id ? data.order : o));
        setCommentTarget(data.order);
        setCommentInput('');
        setCommentReminder('');
        setShowReminderPicker(false);

        if (commentReminder) {
          window.dispatchEvent(new CustomEvent('studio_reminder_created', {
            detail: {
              deliverable_id: commentTarget.id,
              reminder_at: commentReminder,
              text: commentInput.trim()
            }
          }));
        }
      }
    } catch (err) {
      console.warn('Comment submit error:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Open Invoicing Template for single or multiple jobs
  const handleOpenInvoice = (singleOrder?: VendorAlbumOrder) => {
    const targetOrders = singleOrder ? [singleOrder] : filteredOrders.filter(o => selectedOrderIds.has(o.id));
    const effectiveOrders = targetOrders.length > 0 ? targetOrders : filteredOrders;
    if (effectiveOrders.length === 0) return;

    const mapped: VendorInvoiceItem[] = effectiveOrders.map(o => ({
      order_id: o.id,
      client_name: o.client_name,
      segment: detectDeliverableSegment(o.segment, o.item_title || o.album_type, o.event_name),
      item_title: o.item_title || o.album_type,
      album_type: o.item_title || o.album_type || o.event_name || 'Deliverable Task',
      event_name: o.event_name,
      event_date: o.event_date || o.order_date,
      event_time: o.event_time,
      role: o.role || o.service_type,
      category: o.category || activeCategoryTab || 'shoot',
      specs: o.specs || (o.category === 'album_design' || o.category === 'album_printing' ? `${o.sheet_count} Sheets` : ''),
      sheet_count: o.sheet_count,
      page_count: o.page_count,
      rate_per_sheet: o.rate_per_sheet,
      total_amount: o.total_amount,
      paid_amount: o.paid_amount,
      balance_amount: o.balance_amount,
      order_status: o.order_status,
      payment_status: o.payment_status,
      due_date: o.due_date
    }));

    setInvoiceItems(mapped);
    setIsInvoiceModalOpen(true);
  };

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'shoot':
        return null;
      case 'video_editing':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-50 text-sky-800 border border-sky-200">🎬 Video Edit</span>;
      case 'photo_editing':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-800 border border-purple-200">✨ Photo Edit</span>;
      case 'album_printing':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-800 border border-indigo-200">📖 Printing</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">🎨 Album</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[140] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-transparent"
        />

        {/* 3D Creamy Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-5xl max-h-[94vh] flex flex-col bg-[#FAF8F2] rounded-3xl shadow-2xl border-2 border-amber-200/90 overflow-hidden z-10 text-stone-900"
        >
          {/* Header Bar */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-[#2B231D] via-[#3A3027] to-[#2B231D] text-amber-50 flex items-center justify-between border-b border-amber-900/40 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-400/40 text-amber-300 flex items-center justify-center shadow-xs font-black text-lg overflow-hidden shrink-0">
                {vendor.avatar_url ? (
                  <img src={vendor.avatar_url} alt={vendor.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{vendor.name ? vendor.name.slice(0, 2).toUpperCase() : 'TM'}</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                    {vendor.name}
                  </h2>
                  {/* Primary Type Badges */}
                  {isFreelancer && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider">
                      📸 Freelancer
                    </span>
                  )}
                  {isInHouse && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-500/20 text-sky-300 border border-sky-400/30 uppercase tracking-wider">
                      🏢 In-House Staff
                    </span>
                  )}
                  {isPartner && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                      🤝 Partner / Vendor
                    </span>
                  )}
                  {vendor.primary_role && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-stone-300 border border-white/10">
                      {vendor.primary_role}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-amber-200/70 mt-1 flex-wrap font-mono">
                  {vendor.phone && <span className="flex items-center gap-1">📞 {vendor.phone}</span>}
                  {vendor.email && <span className="flex items-center gap-1">✉️ {vendor.email}</span>}
                  {(vendor.daily_rate || vendor.default_daily_rate) ? (
                    <span className="text-amber-300 font-bold">₹{vendor.daily_rate || vendor.default_daily_rate}/day</span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isInHouse && onOpenSalaryDrawer && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSalaryDrawer(vendor);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-400/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>Salary Slips</span>
                </button>
              )}

              {isPartner && (
                <a
                  href="/vendor-portal"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-amber-300/20"
                  title="Open Dedicated Vendor External Portal"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Portal</span>
                </a>
              )}



              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition shadow-xs ml-1"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Sleek Minimal & Decent Segmented Navigation Tabs */}
          <div className="px-4 py-2.5 bg-[#FAF9F6] border-b border-stone-200/80">
            <div className="inline-flex items-center gap-1.5 p-1 bg-stone-200/60 rounded-2xl border border-stone-300/60 max-w-full overflow-x-auto scrollbar-none">
              {visibleTabs.map(tab => {
                const isActive = activeCategoryTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategoryTab(tab.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-white text-stone-900 shadow-xs border border-stone-200/90 font-black'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-white/60 font-bold'
                    }`}
                  >
                    <span className="text-sm">{tab.icon}</span>
                    <span>{tab.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition ${
                      isActive
                        ? 'bg-amber-100 text-amber-900 border border-amber-300/80'
                        : 'bg-stone-200/80 text-stone-600'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Top 3D Creamy KPI Overview Strip: Dynamic to Filtered Results, "9 Shoots" for shoots tab */}
          <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 bg-amber-50/70 border-b border-amber-200/80">
            {/* 1. Total Shoots / Total Jobs */}
            <div className="p-2.5 rounded-2xl bg-white border border-amber-200/90 shadow-2xs">
              <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
                Total {activeCategoryTab === 'shoot' ? 'Shoots' : (visibleTabs.find(t => t.id === activeCategoryTab)?.label || 'Assignments')}
              </span>
              <span className="text-sm sm:text-base font-black text-amber-950 font-mono mt-0.5 block">
                {activeCategoryTab === 'shoot' 
                  ? `${tabTotalCount} ${tabTotalCount === 1 ? 'Shoot' : 'Shoots'}` 
                  : `${clientGroups.length} ${clientGroups.length === 1 ? 'Client' : 'Clients'} • ${tabTotalCount} ${tabTotalCount === 1 ? 'Job' : 'Jobs'}`}
              </span>
            </div>

            {/* 2. Done Price / Total Agreed */}
            <div className="p-2.5 rounded-2xl bg-white border border-amber-200/90 shadow-2xs">
              <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
                Agreed Done Price
              </span>
              <span className="text-sm sm:text-base font-black text-stone-900 font-mono mt-0.5 block">
                ₹{tabFeeSum.toLocaleString('en-IN')}
              </span>
            </div>

            {/* 3. Total Paid */}
            <div className="p-2.5 rounded-2xl bg-white border border-emerald-200/90 shadow-2xs">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 block">
                Total Paid
              </span>
              <span className="text-sm sm:text-base font-black text-emerald-800 font-mono mt-0.5 block">
                ₹{tabPaidSum.toLocaleString('en-IN')}
              </span>
            </div>

            {/* 4. Balance Due */}
            <div className={`p-2.5 rounded-2xl bg-white border shadow-2xs ${tabBalanceDue > 0 ? 'border-rose-300 bg-rose-50/20' : 'border-emerald-200/90'}`}>
              <span className={`text-[9px] font-black uppercase tracking-wider block ${tabBalanceDue > 0 ? 'text-rose-700' : 'text-stone-400'}`}>
                Pending Balance
              </span>
              <span className={`text-sm sm:text-base font-black font-mono mt-0.5 block ${tabBalanceDue > 0 ? 'text-rose-700' : 'text-stone-700'}`}>
                ₹{tabBalanceDue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Filter & Toolbar Strip */}
          <div className="p-3 sm:p-4 bg-white/70 border-b border-amber-200/60 flex items-center justify-between flex-wrap gap-2.5">
            {/* Left: Search Input + 3D Filters Button */}
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={activeCategoryTab === 'shoot' ? "Search couple, event, role..." : "Search couple, deliverable, specs..."}
                  className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 placeholder-stone-400 outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>

              {/* 3D Filter Modal Trigger Button with Active Count Pill */}
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(true)}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                  activeFiltersCount > 0
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-white text-amber-900 shadow-2xs">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Active Filter Chips Preview */}
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilters({ startDate: '', endDate: '', eventTypes: [], segments: [], deliverables: [], roles: [], paymentStatuses: [], workflowStatuses: [], dueDateFilter: 'all' })}
                  className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer hidden md:inline-block"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Right: Select All + Download Statement + Add Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-[11px] font-bold text-stone-700 flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                {selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-stone-400" />
                )}
                <span>Select All</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenInvoice()}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-[11px] font-black flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>Download Statement {selectedOrderIds.size > 0 ? `(${selectedOrderIds.size})` : ''}</span>
              </button>

              {/* Dedicated "+ Add Shoot" Button placed directly on toolbar */}
              {activeCategoryTab === 'shoot' && (
                <button
                  type="button"
                  onClick={() => setIsAddShootModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-[11px] font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ Add Shoot</span>
                </button>
              )}

              {/* Dedicated "+ Add Assignment" Button directly to the right of Download Statement */}
              {activeCategoryTab !== 'shoot' && (
                <button
                  type="button"
                  onClick={() => setIsAddAssignmentModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-[11px] font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ Add Assignment</span>
                </button>
              )}
            </div>
          </div>

          {/* Deliverables & Assignments List (3D Creamy Cards with Progressive Lazy Rendering) */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 bg-[#FAF8F2]">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 text-stone-400 space-y-3">
                <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
                <h4 className="text-sm font-black text-stone-700">
                  No {activeCategoryTab === 'shoot' ? 'Shoots' : (visibleTabs.find(t => t.id === activeCategoryTab)?.label || 'Assignments')} Found
                </h4>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  {activeCategoryTab === 'shoot'
                    ? 'Click "+ Add Shoot" on the toolbar to schedule and assign a new shoot.'
                    : activeCategoryTab === 'album_printing'
                    ? 'Manually add your album printing orders here.'
                    : 'Assign tasks from Post-Production or Bookings, or click "+ Add Assignment" above.'}
                </p>
                {activeCategoryTab === 'shoot' && (
                  <button
                    type="button"
                    onClick={() => setIsAddShootModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-xs transition"
                  >
                    + Add New Shoot
                  </button>
                )}
              </div>
            ) : activeCategoryTab === 'shoot' ? (
              /* ── 1. SHOOTS CARDS (INDIVIDUAL SHOOT CARDS) ── */
              <>
                {displayedOrders.map(order => {
                  const isSelected = selectedOrderIds.has(order.id);
                  const statusStyle = STATUS_COLOR_MAP[order.order_status] || STATUS_COLOR_MAP['Pending Design'];

                  // Commercials Calculations
                  const tot = Number(order.total_amount || 0);
                  const paid = Number(order.paid_amount || 0);
                  const bal = Number(order.balance_amount || 0);

                  const isZero = tot === 0 && paid === 0 && bal === 0;
                  const isFullPaid = tot > 0 && bal === 0 && paid >= tot;
                  const isPartiallyPaid = paid > 0 && bal > 0;

                  return (
                    <div
                      key={order.id}
                      className={`p-4 rounded-3xl bg-white border-2 transition-all shadow-2xs hover:shadow-xs space-y-3 ${
                        isSelected ? 'border-amber-500 bg-amber-50/20' : 'border-stone-200/90'
                      }`}
                    >
                      {/* Top Row: Checkbox, Couple Name, Category/Event Details, Status */}
                      <div className="flex items-start justify-between flex-wrap gap-2.5">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectOrder(order.id)}
                            className="mt-0.5 text-stone-400 hover:text-amber-600 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-amber-600" />
                            ) : (
                              <Square className="w-4 h-4 text-stone-300" />
                            )}
                          </button>

                          <div>
                            <div className="space-y-1">
                              <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                                {order.client_name}
                              </h3>

                              <div className="flex items-center gap-2 text-xs text-stone-700 font-medium flex-wrap pt-0.5">
                                {/* Event Name */}
                                <span className="font-extrabold text-amber-950 text-xs sm:text-sm">
                                  {order.event_name || order.item_title || order.album_type || 'Wedding Event'}
                                </span>

                                <span className="text-stone-300">•</span>

                                {/* Date & Timing */}
                                <span className="inline-flex items-center gap-1.5 text-stone-700 font-semibold bg-stone-100 px-2.5 py-0.5 rounded-md border border-stone-200/80 font-mono text-[11px]">
                                  <Calendar className="w-3 h-3 text-amber-600" />
                                  <span>{formatShootDate(order.event_date || order.due_date)}</span>
                                  {order.event_time && (
                                    <>
                                      <span className="text-stone-300">|</span>
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      <span>{order.event_time}</span>
                                    </>
                                  )}
                                </span>

                                <span className="text-stone-300">•</span>

                                {/* Category / Role */}
                                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black bg-amber-50 text-amber-900 border border-amber-300/60 shadow-2xs">
                                  {order.role || order.service_type || 'Shoot Specialist'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Top-Right Status: Synchronized Status Pill */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isZero ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-stone-100 text-stone-600 border border-stone-300 shadow-2xs uppercase tracking-wider">
                              UNSETTLED
                            </span>
                          ) : isFullPaid ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs uppercase tracking-wider">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              FULL PAID
                            </span>
                          ) : isPartiallyPaid ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-2xs uppercase tracking-wider">
                              PARTIALLY PAID
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-300 flex items-center gap-1 shadow-2xs uppercase tracking-wider">
                              UNPAID
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Commercials & Actions */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-[#FAF8F5] border border-amber-200/60 items-center">
                        {/* Financials Strip */}
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
                            Agreed Commercials &amp; Balance
                          </span>
                          <div className="flex items-center gap-2 text-xs font-bold mt-0.5 flex-wrap">
                            <span className="font-mono font-black text-stone-900">
                              Agreed: ₹{tot.toLocaleString('en-IN')}
                            </span>
                            <span className="text-stone-300">•</span>
                            <span className="font-mono text-emerald-700 font-bold">
                              Paid: ₹{paid.toLocaleString('en-IN')}
                            </span>
                            <span className="text-stone-300">•</span>
                            <span className={`font-mono font-black ${bal > 0 ? 'text-rose-700 font-black' : 'text-stone-500'}`}>
                              Balance: ₹{bal.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        <div className="sm:text-center text-xs text-stone-400 font-mono">
                          {order.event_date ? `Date: ${order.event_date}` : ''}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {isZero ? (
                            <button
                              type="button"
                              onClick={() => handleOpenRecordPayment(order)}
                              className="px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs bg-stone-100 text-stone-600 border border-stone-300 hover:bg-stone-200"
                              title="Set agreed commercials & payment"
                            >
                              <AlertCircle className="w-3 h-3 text-stone-500" />
                              <span>Unsettled</span>
                            </button>
                          ) : isFullPaid ? (
                            <button
                              type="button"
                              onClick={() => handleOpenRecordPayment(order)}
                              className="px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Full Paid</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenRecordPayment(order)}
                              className="px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100"
                            >
                              <IndianRupee className="w-3 h-3 text-amber-600" />
                              <span>Record Pay</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setEditingOrder(order)}
                            className="p-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 flex items-center justify-center transition cursor-pointer shadow-2xs"
                            title="Edit Couple & Event Name"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-stone-500" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setCommentTarget(order)}
                            className="px-2.5 py-1 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-[11px] font-bold text-stone-700 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                          >
                            <MessageSquare className="w-3 h-3 text-stone-400" />
                            <span>Notes ({(order.comments || []).length})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenInvoice(order)}
                            className="px-2.5 py-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-black flex items-center gap-1 transition cursor-pointer shadow-2xs"
                            title="Generate Single Shoot Invoice"
                          >
                            <Printer className="w-3 h-3 text-amber-400" />
                            <span>Invoice</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Progressive Lazy Rendering: Load More Button for Shoots */}
                {visibleCardCount < filteredOrders.length && (
                  <div className="pt-2 pb-4 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCardCount(prev => prev + 10)}
                      className="px-5 py-2.5 rounded-2xl bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-black text-xs shadow-2xs transition cursor-pointer inline-flex items-center gap-2"
                    >
                      <span>Load More Shoots ({filteredOrders.length - visibleCardCount} remaining)</span>
                      <ChevronDown className="w-4 h-4 text-amber-600" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* ── 2. NON-SHOOT DELIVERABLES (SINGLE CARD PER COUPLE) ── */
              <>
                {displayedClientGroups.map(grp => {
                  // Check if all orders in grp are selected
                  const allSelected = grp.orders.length > 0 && grp.orders.every(o => selectedOrderIds.has(o.id));
                  const someSelected = grp.orders.some(o => selectedOrderIds.has(o.id));

                  // Couple status calculation
                  const isZero = grp.totalAgreed === 0 && grp.totalPaid === 0 && grp.totalBalance === 0;
                  const isFullPaid = grp.totalAgreed > 0 && grp.totalBalance === 0 && grp.totalPaid >= grp.totalAgreed;
                  const isPartiallyPaid = grp.totalPaid > 0 && grp.totalBalance > 0;
                  const isCardFromPostProduction = grp.orders.length > 0 && grp.orders.some(o => isPostProductionOrder(o));

                  return (
                    <div
                      key={grp.clientName}
                      className={`p-4 sm:p-5 rounded-3xl bg-white border-2 transition-all shadow-2xs hover:shadow-xs space-y-4 ${
                        allSelected ? 'border-amber-500 bg-amber-50/15' : 'border-stone-200/90'
                      }`}
                    >
                      {/* ── COUPLE CARD HEADER ── */}
                      <div className="flex items-start sm:items-center justify-between flex-wrap gap-3 pb-3 border-b border-stone-200/80">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderIds(prev => {
                                const next = new Set(prev);
                                if (allSelected) {
                                  grp.orders.forEach(o => next.delete(o.id));
                                } else {
                                  grp.orders.forEach(o => next.add(o.id));
                                }
                                return next;
                              });
                            }}
                            className="mt-0.5 text-stone-400 hover:text-amber-600 cursor-pointer"
                            title={allSelected ? 'Deselect all deliverables' : 'Select all deliverables'}
                          >
                            {allSelected ? (
                              <CheckSquare className="w-4 h-4 text-amber-600" />
                            ) : someSelected ? (
                              <div className="w-4 h-4 rounded-xs border-2 border-amber-600 bg-amber-100 flex items-center justify-center">
                                <div className="w-2 h-0.5 bg-amber-600" />
                              </div>
                            ) : (
                              <Square className="w-4 h-4 text-stone-300" />
                            )}
                          </button>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 shadow-2xs shrink-0" />
                                <h3 className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-[#451A03] via-[#78350F] to-[#292524] bg-clip-text text-transparent drop-shadow-2xs">
                                  {grp.clientName}
                                </h3>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-100 text-stone-600 border border-stone-200/80 font-mono">
                                {grp.orders.length} {grp.orders.length === 1 ? 'Deliverable' : 'Deliverables'}
                              </span>
                            </div>

                            {/* Aggregated Financials Header Bar */}
                            <div className="flex items-center gap-2 text-xs font-bold mt-1 flex-wrap">
                              <span className="font-mono font-black text-stone-800">
                                Agreed: ₹{grp.totalAgreed.toLocaleString('en-IN')}
                              </span>
                              <span className="text-stone-300">•</span>
                              <span className="font-mono text-emerald-700 font-bold">
                                Paid: ₹{grp.totalPaid.toLocaleString('en-IN')}
                              </span>
                              <span className="text-stone-300">•</span>
                              <span className={`font-mono font-black ${grp.totalBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                Balance: ₹{grp.totalBalance.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Pill and Single Couple Invoice Button */}
                        <div className="flex items-center gap-2.5">
                          {isZero ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-stone-100 text-stone-600 border border-stone-300 shadow-2xs uppercase tracking-wider">
                              UNSETTLED
                            </span>
                          ) : isFullPaid ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs uppercase tracking-wider">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              FULL PAID
                            </span>
                          ) : isPartiallyPaid ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-2xs uppercase tracking-wider">
                              PARTIALLY PAID
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-300 flex items-center gap-1 shadow-2xs uppercase tracking-wider">
                              UNPAID
                            </span>
                          )}

                          {/* + SEGMENT BUTTON FOR THIS COUPLE (Only for manual cards, hidden for post-production synced cards) */}
                          {!isCardFromPostProduction && (
                            <button
                              type="button"
                              onClick={() => {
                                setCardAddSegmentClient(grp.clientName);
                                setCardNewSegmentName('Pre-Wedding');
                                setCardNewDeliverables([{
                                  id: `del_${Date.now()}`,
                                  title: ppVideoPresets[0]?.title || 'Cinematic Teaser',
                                  specs: ppVideoPresets[0]?.specs || '',
                                  dueDate: '',
                                  agreedFee: '0',
                                  paidAmount: '0',
                                }]);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs active:translate-y-0.5"
                              title={`Add new segment to ${grp.clientName}`}
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[3] text-amber-700" />
                              <span>+ Segment</span>
                            </button>
                          )}

                          {/* SINGLE COUPLE INVOICE BUTTON (Entire Couple Level) */}
                          <button
                            type="button"
                            onClick={() => {
                              setInvoiceItems(grp.orders.map(o => ({
                                id: o.id,
                                client_name: grp.clientName,
                                segment: detectDeliverableSegment(o.segment, o.item_title || o.album_type, o.event_name),
                                album_type: o.item_title || o.album_type,
                                specs: o.specs || '',
                                sheet_count: o.sheet_count || 1,
                                rate_per_sheet: o.rate_per_sheet || 0,
                                total_amount: Number(o.total_amount) || 0,
                                paid_amount: Number(o.paid_amount) || 0,
                                balance_amount: Number(o.balance_amount) || 0,
                                order_status: o.order_status,
                                payment_status: o.payment_status,
                                order_date: o.order_date || '',
                                due_date: o.due_date || '',
                                notes: o.notes || '',
                              })));
                              setIsInvoiceModalOpen(true);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs active:translate-y-0.5"
                            title={`Generate Invoice for all ${grp.orders.length} deliverables of ${grp.clientName}`}
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-400" />
                            <span>Invoice</span>
                          </button>
                        </div>
                      </div>

                      {/* ── DELIVERABLES LIST INSIDE THE COUPLE CARD GROUPED BY SEGMENT ── */}
                      {(() => {
                        const segMap = new Map<string, VendorAlbumOrder[]>();
                        grp.orders.forEach(order => {
                          const seg = detectDeliverableSegment(order.segment, order.item_title || order.album_type, order.event_name);
                          if (!segMap.has(seg)) segMap.set(seg, []);
                          segMap.get(seg)!.push(order);
                        });
                        const segmentList = Array.from(segMap.entries()).map(([segment, orders]) => ({ segment, orders }));

                        return (
                          <div className="space-y-4">
                            {segmentList.map(({ segment, orders: segOrders }) => {
                              const segConfig = getSegmentConfig(segment);
                              const isSegmentPostProduction = segOrders.some(o => isPostProductionOrder(o));

                              return (
                                <div key={segment} className="space-y-2">
                                  {/* Distinct Bold Color-Coded Segment Header */}
                                  <div className={`px-3.5 py-1.5 rounded-xl border flex items-center justify-between shadow-2xs flex-wrap gap-2 ${segConfig.containerBg} ${segConfig.containerBorder}`}>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">{segConfig.emoji}</span>
                                      <span className={`text-xs font-black uppercase tracking-wider ${segConfig.headerText}`}>
                                        {segment}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border shadow-2xs ${segConfig.badgeBg}`}>
                                        {segOrders.length} {segOrders.length === 1 ? 'Deliverable' : 'Deliverables'}
                                      </span>
                                      {/* Only manual segments allow adding deliverables directly or deleting segment */}
                                      {!isSegmentPostProduction && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setAddDeliverableTarget({ clientName: grp.clientName, segmentName: segment });
                                              setTargetDelivTitle(ppVideoPresets[0]?.title || 'Cinematic Teaser');
                                              setTargetDelivSpecs(ppVideoPresets[0]?.specs || '');
                                              setTargetDelivDueDate('');
                                              setTargetDelivFee('0');
                                              setTargetDelivPaid('0');
                                            }}
                                            className="px-2.5 py-1 rounded-lg bg-white/95 hover:bg-white text-stone-800 hover:text-amber-900 border border-stone-200 text-[10px] font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer active:translate-y-0.5"
                                            title={`Add deliverable directly to ${segment}`}
                                          >
                                            <Plus className="w-2.5 h-2.5 stroke-[3] text-amber-600" />
                                            <span>+ Deliverable</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setDeleteSegmentConfirmTarget({ clientName: grp.clientName, segmentName: segment, orders: segOrders });
                                            }}
                                            className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                            title={`Delete ${segment} segment and its ${segOrders.length} deliverables`}
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Segment Deliverables Rows */}
                                  <div className="space-y-2 pl-1 sm:pl-1.5">
                                    {segOrders.map(order => {
                                      const isSelected = selectedOrderIds.has(order.id);
                                      const oTot = Number(order.total_amount || 0);
                                      const oPaid = Number(order.paid_amount || 0);
                                      const oBal = Number(order.balance_amount || 0);
                                      const oFullPaid = oTot > 0 && oBal === 0 && oPaid >= oTot;

                                      // Due date and Overdue indicator
                                      const dueDateStr = order.due_date || '';
                                      const deadlineInfo = (() => {
                                        if (!dueDateStr) return null;
                                        const due = new Date(dueDateStr);
                                        if (isNaN(due.getTime())) return null;
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        due.setHours(0, 0, 0, 0);
                                        const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                        const isDone = (order.order_status || '').toLowerCase().includes('done') || (order.order_status || '').toLowerCase().includes('completed');
                                        if (isDone) {
                                          return { label: 'Done', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
                                        }
                                        if (diffDays < 0) {
                                          return { 
                                            label: `Overdue ${Math.abs(diffDays)}d`, 
                                            className: 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse font-black' 
                                          };
                                        }
                                        if (diffDays === 0) {
                                          return { label: 'Due Today', className: 'bg-amber-100 text-amber-800 border-amber-300 font-black' };
                                        }
                                        return { label: `${diffDays}d left`, className: 'bg-stone-100 text-stone-600 border-stone-200 font-bold' };
                                      })();

                                      return (
                                        <div
                                          key={order.id}
                                          className={`p-3.5 rounded-2xl bg-[#FFFDF9] border transition shadow-2xs hover:shadow-xs space-y-2.5 ${
                                            isSelected ? 'border-amber-400 bg-amber-50/30' : 'border-[#EAE5DA]'
                                          }`}
                                        >
                                          {/* Row 1: Title, Specs (ONLY if exists), Due Date, and Status */}
                                          <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                                              <button
                                                type="button"
                                                onClick={() => handleToggleSelectOrder(order.id)}
                                                className="text-stone-400 hover:text-amber-600 cursor-pointer shrink-0"
                                              >
                                                {isSelected ? (
                                                  <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                                                ) : (
                                                  <Square className="w-3.5 h-3.5 text-stone-300" />
                                                )}
                                              </button>

                                              <span className="text-xs sm:text-sm font-black text-stone-900 truncate">
                                                {order.item_title || order.album_type || 'Deliverable'}
                                              </span>

                                              {/* Clean Specs Badge: ONLY if specs exist and not empty */}
                                              {order.specs && order.specs.trim().length > 0 && (
                                                <span className="font-mono text-[11px] text-amber-950 font-extrabold bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-300/80 shadow-2xs">
                                                  {order.specs}
                                                </span>
                                              )}

                                              {/* Due Date & Red Overdue Indicator */}
                                              {dueDateStr && (
                                                <div className="flex items-center gap-1.5 text-stone-600 text-[11px] font-mono">
                                                  <span className="text-stone-400">Due:</span>
                                                  <span className="font-bold text-stone-700">{dueDateStr}</span>
                                                  {deadlineInfo && (
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] border shadow-2xs shrink-0 ${deadlineInfo.className}`}>
                                                      {deadlineInfo.label}
                                                    </span>
                                                  )}
                                                </div>
                                              )}
                                            </div>

                                            {/* Status Dropdown: Synced with Post-Production Settings */}
                                            <div className="shrink-0">
                                              <ThreeDStatusSelect
                                                currentStatus={order.order_status}
                                                statuses={ppStatuses}
                                                workspaceId={workspaceId}
                                                onChange={(val) => handleStatusChange(order, val)}
                                              />
                                            </div>
                                          </div>

                                          {/* Row 2: Attached Link Pills (Shows Link Title instead of generic "Link") */}
                                          {((order.drive_links && order.drive_links.length > 0) || order.pdf_proof_url || order.drive_folder_url) && (
                                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                              {order.drive_links && order.drive_links.length > 0 ? (
                                                order.drive_links.map((link, idx) => {
                                                  const linkTitle = link.title || (link as any).label || (link as any).name || 'Attached Link';
                                                  return (
                                                    <a
                                                      key={idx}
                                                      href={link.url}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-stone-800 border border-amber-300 hover:bg-amber-100 hover:text-amber-900 transition shadow-2xs"
                                                      title={`Open ${linkTitle}: ${link.url}`}
                                                    >
                                                      <ExternalLink className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                                      <span className="truncate max-w-[140px]">{linkTitle}</span>
                                                    </a>
                                                  );
                                                })
                                              ) : (
                                                <a
                                                  href={order.pdf_proof_url || order.drive_folder_url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-stone-800 border border-amber-300 hover:bg-amber-100 transition shadow-2xs"
                                                >
                                                  <ExternalLink className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                                  <span>Drive / Proof Link</span>
                                                </a>
                                              )}
                                            </div>
                                          )}

                                          {/* Row 3: Deliverable Commercials & Action Buttons */}
                                          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-stone-200/50">
                                            {/* Financials (Strictly respects ₹0) */}
                                            <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
                                              <span className="font-mono text-stone-800">
                                                Fee: ₹{oTot.toLocaleString('en-IN')}
                                              </span>
                                              <span className="text-stone-300">•</span>
                                              <span className="font-mono text-emerald-700">
                                                Paid: ₹{oPaid.toLocaleString('en-IN')}
                                              </span>
                                              <span className="text-stone-300">•</span>
                                              <span className={`font-mono font-black ${oBal > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                                Bal: ₹{oBal.toLocaleString('en-IN')}
                                              </span>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                              {/* Record Payment Button */}
                                              <button
                                                type="button"
                                                onClick={() => handleOpenRecordPayment(order)}
                                                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs ${
                                                  oFullPaid 
                                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                                                    : oPaid > 0
                                                    ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                                                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                                                }`}
                                              >
                                                <IndianRupee className="w-3 h-3 text-amber-600" />
                                                <span>{oFullPaid ? 'Paid' : oPaid > 0 ? 'Part Paid' : 'Record Pay'}</span>
                                              </button>

                                              {/* Attach Links Button */}
                                              <button
                                                type="button"
                                                onClick={() => setAttachLinksOrder(order)}
                                                className="px-2 py-1 rounded-xl border border-stone-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-stone-700 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                                                title="Manage Drive and review links"
                                              >
                                                <Link2 className="w-3 h-3 text-amber-600" />
                                                <span>Links {order.drive_links?.length ? `(${order.drive_links.length})` : ''}</span>
                                              </button>

                                              {/* Notes Button */}
                                              <button
                                                type="button"
                                                onClick={() => setCommentTarget(order)}
                                                className="px-2 py-1 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-[11px] font-bold text-stone-700 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                                              >
                                                <MessageSquare className="w-3 h-3 text-stone-400" />
                                                <span>Notes ({(order.comments || []).length})</span>
                                              </button>

                                              {/* Edit Item Details Modal Trigger */}
                                              <button
                                                type="button"
                                                onClick={() => setEditingOrder(order)}
                                                className="p-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-500 transition cursor-pointer shadow-2xs"
                                                title="Edit Deliverable Title, Specs & Due Date"
                                              >
                                                <Edit3 className="w-3 h-3" />
                                              </button>

                                              {/* Delete Deliverable Modal Trigger (Only for manual assignments, hidden for post-production synced orders) */}
                                              {!isPostProductionOrder(order) && (
                                                <button
                                                  type="button"
                                                  onClick={() => setDeleteConfirmTarget(order)}
                                                  className="p-1.5 rounded-xl border border-stone-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-stone-400 hover:text-rose-600 transition cursor-pointer shadow-2xs"
                                                  title="Delete Deliverable"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}

                {/* Progressive Lazy Rendering: Load More Button for Couples */}
                {visibleCardCount < clientGroups.length && (
                  <div className="pt-2 pb-4 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCardCount(prev => prev + 10)}
                      className="px-5 py-2.5 rounded-2xl bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-black text-xs shadow-2xs transition cursor-pointer inline-flex items-center gap-2"
                    >
                      <span>Load More Couples ({clientGroups.length - visibleCardCount} remaining)</span>
                      <ChevronDown className="w-4 h-4 text-amber-600" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── 3D DEDICATED ADD SHOOT MODAL ── */}
          <AnimatePresence>
            {isAddShootModalOpen && (
              <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-2xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="bg-[#FAF8F5] p-5 sm:p-6 rounded-3xl shadow-2xl border-2 border-amber-300 max-w-xl w-full space-y-4 text-stone-900 overflow-hidden max-h-[92vh] flex flex-col"
                >
                  <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 shadow-2xs">
                        <Camera className="w-5 h-5 text-amber-700" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-amber-950">Add Shoot Assignment</h4>
                        <p className="text-xs text-stone-500 font-medium">Assign new event shoot directly to {vendor.name}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddShootModalOpen(false)}
                      className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="overflow-y-auto space-y-4 flex-1 pr-1">
                    {/* Couple Name */}
                    <div>
                      <label className="text-xs font-bold text-stone-600 block mb-1">Couple / Client Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Vikram & Ananya"
                        value={shootCoupleName}
                        onChange={(e) => setShootCoupleName(e.target.value)}
                        className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                      />
                    </div>

                    {/* 3D Multi-Select Dropdown for Event Types (From Studio Settings) */}
                    <div>
                      <ThreeDMultiSelectDropdown
                        label={`Event Types (${studioEventTypes.length} configured in settings)`}
                        icon={<Tag className="w-3.5 h-3.5 text-amber-700" />}
                        placeholder="Select event types..."
                        options={studioEventTypes.map(e => ({ id: e, label: e }))}
                        selectedValues={shootSelectedEvents}
                        onChange={setShootSelectedEvents}
                        searchPlaceholder="Search event type..."
                      />
                      <input
                        type="text"
                        placeholder="Or add custom event title if not in settings..."
                        value={shootCustomEvent}
                        onChange={(e) => setShootCustomEvent(e.target.value)}
                        className="w-full mt-1.5 p-2 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                      />
                    </div>

                    {/* 3D Multi-Select Dropdown for Assigned Crew Roles (From Studio Settings) */}
                    <div>
                      <ThreeDMultiSelectDropdown
                        label={`Assigned Roles (${studioCrewRoles.length} configured in settings)`}
                        icon={<Users className="w-3.5 h-3.5 text-amber-700" />}
                        placeholder="Select assigned crew roles..."
                        options={studioCrewRoles.map(r => ({ id: r, label: r }))}
                        selectedValues={shootSelectedRoles}
                        onChange={setShootSelectedRoles}
                        searchPlaceholder="Search crew role..."
                      />
                    </div>

                    {/* Date & Timing */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-xs font-bold text-stone-600 block mb-1">Shoot Date *</label>
                        <input
                          type="date"
                          value={shootDate}
                          onChange={(e) => setShootDate(e.target.value)}
                          className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold font-mono text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-stone-600 block mb-1">Timing / Hours</label>
                        <input
                          type="text"
                          placeholder="e.g. 10:00 AM - 10:00 PM"
                          value={shootTime}
                          onChange={(e) => setShootTime(e.target.value)}
                          className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Commercials: Agreed Done Price, Paid Amount + ⚡ Full Paid Shortcut */}
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[10px] font-black uppercase text-stone-500 block mb-1">
                            Agreed Done Price (₹)
                          </label>
                          <input
                            type="number"
                            value={shootAgreedFee}
                            onChange={(e) => setShootAgreedFee(e.target.value)}
                            className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-black font-mono focus:outline-none focus:border-amber-500 shadow-2xs"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-black uppercase text-stone-500 block">
                              Paid Amount (₹)
                            </label>
                            <button
                              type="button"
                              onClick={() => setShootPaidAmount(shootAgreedFee)}
                              className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-1.5 py-0.5 rounded-md cursor-pointer transition shadow-2xs"
                            >
                              ⚡ Full Paid
                            </button>
                          </div>
                          <input
                            type="number"
                            value={shootPaidAmount}
                            onChange={(e) => setShootPaidAmount(e.target.value)}
                            className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-black font-mono text-emerald-700 focus:outline-none focus:border-amber-500 shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* Live Balance Due display */}
                      {(() => {
                        const ag = Number(shootAgreedFee) || 0;
                        const pd = Number(shootPaidAmount) || 0;
                        const bal = Math.max(0, ag - pd);
                        return (
                          <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-amber-200/60">
                            <span className="text-stone-600">Calculated Balance Due:</span>
                            <span className={`font-mono font-black ${bal > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                              ₹{bal.toLocaleString('en-IN')}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Payment Details (Visible if Paid > 0) */}
                    {Number(shootPaidAmount) > 0 && (
                      <div className="p-3 bg-white border border-stone-200 rounded-2xl space-y-2.5 shadow-2xs">
                        <span className="text-[10px] font-black uppercase text-stone-400 block">
                          Payment Record Details
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-stone-400 block mb-0.5">Mode</span>
                            <select
                              value={shootPayMode}
                              onChange={(e) => setShootPayMode(e.target.value as any)}
                              className="w-full p-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold cursor-pointer"
                            >
                              <option value="UPI">UPI (Google Pay, PhonePe)</option>
                              <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                              <option value="Cash">Cash</option>
                            </select>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-stone-400 block mb-0.5">Date</span>
                            <input
                              type="date"
                              value={shootPayDate}
                              onChange={(e) => setShootPayDate(e.target.value)}
                              className="w-full p-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-stone-400 block mb-0.5">Reference / UTR</span>
                          <input
                            type="text"
                            placeholder="Optional UTR / Ref Number"
                            value={shootPayRef}
                            onChange={(e) => setShootPayRef(e.target.value)}
                            className="w-full p-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <label className="text-xs font-bold text-stone-600 block mb-1">Notes / Instructions</label>
                      <textarea
                        rows={2}
                        placeholder="Reporting time, location, special gears, or briefing notes..."
                        value={shootNotes}
                        onChange={(e) => setShootNotes(e.target.value)}
                        className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-amber-200/80">
                    <button
                      type="button"
                      onClick={() => setIsAddShootModalOpen(false)}
                      className="px-4 py-2 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl hover:bg-stone-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSavingShoot || !shootCoupleName.trim()}
                      onClick={handleSaveNewShoot}
                      className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{isSavingShoot ? 'Saving Shoot...' : 'Save & Assign Shoot'}</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Dedicated Multi-Segment Add Assignment Modal */}
          <AnimatePresence>
            {isAddAssignmentModalOpen && (
              <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="bg-[#FAF8F5] rounded-3xl shadow-2xl border-2 border-amber-300 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-stone-900"
                >
                  {/* Modal Header */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-[#2B231D] via-[#3A3027] to-[#2B231D] text-amber-50 flex items-center justify-between border-b border-amber-900/40">
                    <div>
                      <h4 className="text-sm sm:text-base font-black flex items-center gap-2">
                        <Plus className="w-4 h-4 text-amber-400 stroke-[3]" />
                        <span>Assign Deliverables • {activeCategoryTab === 'video_editing' ? 'Video Editing' : activeCategoryTab === 'photo_editing' ? 'Photo Editing' : activeCategoryTab === 'album_design' ? 'Album Designing' : activeCategoryTab === 'album_printing' ? 'Album Printing' : 'Deliverables'}</span>
                      </h4>
                      <p className="text-xs text-amber-200/70 font-semibold mt-0.5">
                        Assign multi-segment deliverables to {vendor.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddAssignmentModalOpen(false)}
                      className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition shadow-xs"
                    >
                      <X className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                    {/* Couple Name */}
                    <div className="bg-white p-3.5 rounded-2xl border border-amber-200/80 shadow-2xs space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-stone-500 block">
                        Couple / Client Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        list="available-client-names-list"
                        value={assignCoupleName}
                        onChange={(e) => setAssignCoupleName(e.target.value)}
                        placeholder="e.g. Rahul & Pooja or Vikram & Ananya"
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                      />
                      <datalist id="available-client-names-list">
                        {availableClientNames.map(cn => (
                          <option key={cn} value={cn} />
                        ))}
                      </datalist>
                    </div>

                    {/* Segments & Deliverables Builder */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-black uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                          <span>Event Segments &amp; Deliverables</span>
                          <span className="text-[10px] font-bold text-stone-400">({assignSegments.length} Segments, {assignTotals.deliverableCount} Deliverables)</span>
                        </h5>
                        <button
                          type="button"
                          onClick={handleAddSegment}
                          className="px-2.5 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-black flex items-center gap-1 border border-amber-300 transition cursor-pointer"
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                          <span>+ Add Segment</span>
                        </button>
                      </div>

                      {assignSegments.map((segment) => (
                        <div key={segment.id} className="p-4 bg-white rounded-2xl border-2 border-amber-200/90 shadow-2xs space-y-3">
                          {/* Segment Top Bar */}
                          <div className="flex items-center justify-between gap-2 border-b border-amber-100 pb-2.5 flex-wrap">
                            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                              <span className="text-xs font-black text-amber-800">❖ Segment:</span>
                              <ThreeDSegmentSelect
                                value={segment.name}
                                onChange={(val) => handleUpdateSegmentName(segment.id, val)}
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleAddDeliverable(segment.id)}
                                className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                              >
                                <Plus className="w-3 h-3 stroke-[3]" />
                                <span>Add Deliverable</span>
                              </button>
                              {assignSegments.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSegment(segment.id)}
                                  className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                  title="Remove Segment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Deliverables List in Segment */}
                          <div className="space-y-2">
                            {segment.deliverables.map((del) => (
                              <div key={del.id} className="p-3 bg-[#FAF8F5] rounded-xl border border-stone-200 space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                  {/* Deliverable Title: 3D Selector with Presets, Specs, Search & Custom Mode */}
                                  <div className="sm:col-span-5 space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-stone-500 block">
                                      Deliverable Title
                                    </label>
                                    <ThreeDDeliverableSelect
                                      value={del.title}
                                      specs={del.specs}
                                      presets={ppVideoPresets}
                                      onChange={(newTitle, newSpecs) => {
                                        handleUpdateDeliverable(segment.id, del.id, {
                                          title: newTitle,
                                          specs: newSpecs || del.specs,
                                        });
                                      }}
                                    />
                                  </div>

                                  {/* Specs / Duration */}
                                  <div className="sm:col-span-3 space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-stone-500 block">
                                      Specs / Duration
                                    </label>
                                    <input
                                      type="text"
                                      value={del.specs}
                                      onChange={(e) => handleUpdateDeliverable(segment.id, del.id, { specs: e.target.value })}
                                      placeholder="e.g. 1-2 Mins, 4K"
                                      className="w-full p-1.5 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-800 focus:outline-none focus:border-amber-500"
                                    />
                                  </div>

                                  {/* Due Date */}
                                  <div className="sm:col-span-3 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-stone-500 block">
                                        Deadline
                                      </label>
                                      {(() => {
                                        const badge = getRemainingDaysBadge(del.dueDate);
                                        if (!badge) return null;
                                        return (
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] border shadow-2xs font-mono font-bold ${badge.className}`}>
                                            {badge.label}
                                          </span>
                                        );
                                      })()}
                                    </div>
                                    <input
                                      type="date"
                                      value={del.dueDate}
                                      onChange={(e) => handleUpdateDeliverable(segment.id, del.id, { dueDate: e.target.value })}
                                      className="w-full p-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold font-mono text-stone-800 focus:outline-none focus:border-amber-500"
                                    />
                                  </div>

                                  {/* Remove Button */}
                                  <div className="sm:col-span-1 flex items-end justify-center pt-2 sm:pt-4">
                                    {segment.deliverables.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveDeliverable(segment.id, del.id)}
                                        className="p-1 rounded text-stone-400 hover:text-rose-600 transition cursor-pointer"
                                        title="Delete Deliverable"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Commercials row for deliverable */}
                                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-stone-100">
                                  <div>
                                    <label className="text-[9px] font-bold text-stone-500 block">Agreed Fee (₹)</label>
                                    <input
                                      type="number"
                                      value={del.agreedFee}
                                      onChange={(e) => handleUpdateDeliverable(segment.id, del.id, { agreedFee: e.target.value })}
                                      className="w-full p-1 bg-white border border-stone-200 rounded-lg text-xs font-mono font-bold text-stone-900"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold text-emerald-700 block">Paid Amount (₹)</label>
                                    <input
                                      type="number"
                                      value={del.paidAmount}
                                      onChange={(e) => handleUpdateDeliverable(segment.id, del.id, { paidAmount: e.target.value })}
                                      className="w-full p-1 bg-white border border-stone-200 rounded-lg text-xs font-mono font-bold text-emerald-700"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-bold text-stone-500 block">Balance (₹)</label>
                                    <div className="p-1 bg-stone-100 rounded-lg text-xs font-mono font-bold text-stone-700">
                                      ₹{(Math.max(0, (Number(del.agreedFee) || 0) - (Number(del.paidAmount) || 0))).toLocaleString('en-IN')}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 bg-amber-50/70 border-t border-amber-200/90 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-stone-500 block">Total Agreed:</span>
                        <span className="font-mono font-black text-stone-900">₹{assignTotals.totalAgreed.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-emerald-700 block">Total Paid:</span>
                        <span className="font-mono font-black text-emerald-700">₹{assignTotals.totalPaid.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className={`text-[10px] font-bold block ${assignTotals.balanceDue > 0 ? 'text-rose-700' : 'text-stone-500'}`}>Balance Due:</span>
                        <span className={`font-mono font-black ${assignTotals.balanceDue > 0 ? 'text-rose-700' : 'text-stone-700'}`}>₹{assignTotals.balanceDue.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddAssignmentModalOpen(false)}
                        className="px-4 py-2 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl hover:bg-stone-50 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSavingAssignment || !assignCoupleName.trim()}
                        onClick={handleSaveAssignments}
                        className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>{isSavingAssignment ? 'Saving Assignments...' : 'Save & Assign Deliverables'}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Edit Assignment Modal */}
          <AnimatePresence>
            {editingOrder && (
              <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 bg-black/50 backdrop-blur-2xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-5 rounded-3xl shadow-xl border-2 border-amber-300 max-w-lg w-full space-y-3.5 text-stone-900"
                >
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <h4 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Edit Details • {editingOrder.client_name}</span>
                    </h4>
                    <button type="button" onClick={() => setEditingOrder(null)} className="text-stone-400 hover:text-stone-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 py-1">
                    {editingOrder.category === 'shoot' ? (
                      <>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-stone-600 block mb-1">
                            Couple / Client Name
                          </label>
                          <input
                            type="text"
                            value={editingOrder.client_name}
                            onChange={(e) => setEditingOrder({ ...editingOrder, client_name: e.target.value })}
                            className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-stone-600 block mb-1">
                            Event Name (e.g. Wedding, Reception)
                          </label>
                          <input
                            type="text"
                            value={editingOrder.event_name || editingOrder.item_title || editingOrder.album_type}
                            onChange={(e) => setEditingOrder({ ...editingOrder, event_name: e.target.value, item_title: e.target.value, album_type: e.target.value })}
                            className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Deliverable Title */}
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-stone-600 block mb-1">
                            Deliverable Title *
                          </label>
                          <input
                            type="text"
                            value={editingOrder.item_title || editingOrder.album_type || ''}
                            onChange={(e) => setEditingOrder({
                              ...editingOrder,
                              item_title: e.target.value,
                              album_type: e.target.value,
                              event_name: e.target.value,
                            })}
                            placeholder="e.g. Cinematic Wedding Film, Teaser 60s..."
                            className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                          />
                        </div>

                        {/* Event Segment */}
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-stone-600 block mb-1">
                            Event Segment
                          </label>
                          <ThreeDSegmentSelect
                            value={editingOrder.segment || detectDeliverableSegment(undefined, editingOrder.item_title || editingOrder.album_type, editingOrder.event_name)}
                            onChange={(val) => setEditingOrder({ ...editingOrder, segment: val, event_name: val })}
                          />
                        </div>

                        {/* Specs / Duration / Subtitle */}
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-stone-600 block mb-1">
                            Specs / Duration / Subtitle (e.g. 2 min, 30 min, 30 Sheets)
                          </label>
                          <input
                            type="text"
                            value={editingOrder.specs || ''}
                            onChange={(e) => setEditingOrder({ ...editingOrder, specs: e.target.value })}
                            placeholder="e.g. 2 min 4K, 3-5 Mins Cinematic, 30 Sheets (60 Pages)..."
                            className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                          />
                        </div>

                        {/* Due Date & Client Name */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-black uppercase tracking-wider text-stone-600 block">
                                Due Date
                              </label>
                              {(() => {
                                const badge = getRemainingDaysBadge(editingOrder.due_date || editingOrder.event_date);
                                if (!badge) return null;
                                return (
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] border shadow-2xs font-mono font-bold ${badge.className}`}>
                                    {badge.label}
                                  </span>
                                );
                              })()}
                            </div>
                            <input
                              type="date"
                              value={editingOrder.due_date || editingOrder.event_date || ''}
                              onChange={(e) => setEditingOrder({ ...editingOrder, due_date: e.target.value })}
                              className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-stone-600 block mb-1">
                              Client / Couple Name
                            </label>
                            <input
                              type="text"
                              value={editingOrder.client_name}
                              onChange={(e) => setEditingOrder({ ...editingOrder, client_name: e.target.value })}
                              className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteOrder(editingOrder.id);
                        setEditingOrder(null);
                      }}
                      className="text-xs text-rose-600 font-bold hover:underline"
                    >
                      Delete Assignment
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingOrder(null)}
                        className="px-3 py-1.5 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditOrder}
                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs transition"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Record Pay & Commercials Modal */}
          <AnimatePresence>
            {paymentTarget && (
              <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white p-5 sm:p-6 rounded-3xl shadow-2xl border-2 border-amber-300 max-w-md w-full space-y-4 text-stone-900"
                >
                  <div className="flex items-start justify-between border-b border-stone-100 pb-3">
                    <div>
                      <h4 className="text-sm font-black text-amber-950 flex items-center gap-1.5">
                        <IndianRupee className="w-4 h-4 text-amber-600" />
                        <span>Record Pay &amp; Commercials</span>
                      </h4>
                      <p className="text-xs text-stone-500 font-semibold mt-0.5">
                        {paymentTarget.client_name} • {paymentTarget.event_name || paymentTarget.item_title || paymentTarget.album_type}
                      </p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setPaymentTarget(null)} 
                      className="text-stone-400 hover:text-stone-700 w-7 h-7 rounded-lg hover:bg-stone-100 flex items-center justify-center transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 bg-[#FAF8F5] p-3.5 rounded-2xl border border-amber-200/80">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-black uppercase text-stone-500 block mb-1">
                          Agreed Done Price (₹)
                        </label>
                        <input
                          type="number"
                          value={payDonePrice}
                          onChange={(e) => setPayDonePrice(e.target.value)}
                          className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-black font-mono focus:outline-none focus:border-amber-500 shadow-2xs"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-black uppercase text-stone-500 block">
                            Paid Amount (₹)
                          </label>
                          <button
                            type="button"
                            onClick={() => setPayPaidAmount(payDonePrice)}
                            className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-1.5 py-0.5 rounded-md cursor-pointer transition shadow-2xs"
                            title="Set Paid Amount equal to Done Price"
                          >
                            ⚡ Full Paid
                          </button>
                        </div>
                        <input
                          type="number"
                          value={payPaidAmount}
                          onChange={(e) => setPayPaidAmount(e.target.value)}
                          className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-black font-mono focus:outline-none focus:border-amber-500 shadow-2xs text-emerald-700"
                        />
                      </div>
                    </div>

                    {/* Live Balance Due Banner */}
                    {(() => {
                      const doneNum = Number(payDonePrice) || 0;
                      const paidNum = Number(payPaidAmount) || 0;
                      const liveBal = Math.max(0, doneNum - paidNum);
                      const isSettled = liveBal === 0 && doneNum > 0;
                      return (
                        <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                          isSettled 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                            : liveBal > 0 
                            ? 'bg-rose-50 border-rose-300 text-rose-900' 
                            : 'bg-stone-50 border-stone-200 text-stone-700'
                        }`}>
                          <span className="text-[11px] font-bold">
                            {isSettled ? '✓ Fully Settled' : 'Pending Balance Due:'}
                          </span>
                          <span className={`text-xs font-mono font-black ${liveBal > 0 ? 'text-rose-700 font-black' : 'text-emerald-700 font-bold'}`}>
                            ₹{liveBal.toLocaleString('en-IN')}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Payment Details: Date, Mode, Reference, Notes */}
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-stone-500 block mb-1">Payment Date</label>
                        <input
                          type="date"
                          value={payDate}
                          onChange={(e) => setPayDate(e.target.value)}
                          className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-stone-500 block mb-1">Payment Mode</label>
                        <select
                          value={payMode}
                          onChange={(e) => setPayMode(e.target.value as any)}
                          className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-none focus:border-amber-500 cursor-pointer"
                        >
                          <option value="UPI">UPI (Google Pay, PhonePe)</option>
                          <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                          <option value="Cash">Cash</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-500 block mb-1">Reference / UTR (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. UTR294018204"
                        value={payRef}
                        onChange={(e) => setPayRef(e.target.value)}
                        className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-500 block mb-1">Payment Notes / Remarks (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Advance paid on shoot day"
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => setPaymentTarget(null)}
                      className="px-4 py-2 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl hover:bg-stone-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingPayment}
                      onClick={handleRecordPayment}
                      className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingPayment ? 'Saving...' : 'Confirm & Save Commercials'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Comments & AI Voice Notes Drawer */}
          <AnimatePresence>
            {commentTarget && (
              <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-[#FAF8F5] p-5 sm:p-6 rounded-3xl shadow-2xl border-2 border-amber-300 max-w-lg w-full space-y-4 text-stone-900"
                >
                  <div className="flex items-start justify-between border-b border-amber-200/80 pb-3">
                    <div>
                      <h4 className="text-sm font-black text-amber-950 flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-amber-600" />
                        <span>Discussion &amp; AI Voice Notes</span>
                      </h4>
                      <p className="text-xs text-stone-500 font-semibold mt-0.5">
                        {commentTarget.client_name} • {commentTarget.event_name || commentTarget.item_title || commentTarget.album_type}
                      </p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        setCommentTarget(null);
                        setShowReminderPicker(false);
                      }} 
                      className="text-stone-400 hover:text-stone-700 w-7 h-7 rounded-lg hover:bg-stone-200/50 flex items-center justify-center transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Previous Comments List */}
                  <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1">
                    {(commentTarget.comments || []).length === 0 ? (
                      <div className="py-6 text-center text-xs text-stone-400 italic">
                        No notes or comments recorded yet. Add the first instruction or reminder below.
                      </div>
                    ) : (
                      commentTarget.comments?.map(c => (
                        <div key={c.id} className="p-3 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-stone-400 font-bold flex-wrap gap-1">
                            <span className="text-amber-950 font-black">{c.author || 'Studio Lead'}</span>
                            <span className="font-mono text-stone-500 text-[10px]">
                              {c.formatted_time || formatNoteDateTime(c.time)}
                            </span>
                          </div>
                          <p className="text-xs text-stone-800 font-medium whitespace-pre-wrap leading-relaxed">
                            {c.text}
                          </p>
                          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                            {c.reminder_at && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 shadow-2xs">
                                ⏰ Reminder: {formatNoteDateTime(c.reminder_at)}
                              </span>
                            )}
                            {c.is_voice && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                🎙️ Voice Note
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Reminder Alert Date & Time Pop-Up / Section */}
                  <AnimatePresence>
                    {showReminderPicker && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-purple-600" />
                            <span>Schedule Reminder Alert:</span>
                          </span>
                          {commentReminder && (
                            <button
                              type="button"
                              onClick={() => setCommentReminder('')}
                              className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setQuickReminderPreset('tomorrow_morning')}
                            className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-[10px] font-bold text-purple-900 hover:bg-purple-100 transition shadow-2xs cursor-pointer"
                          >
                            Tomorrow 10 AM
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickReminderPreset('in_2_days')}
                            className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-[10px] font-bold text-purple-900 hover:bg-purple-100 transition shadow-2xs cursor-pointer"
                          >
                            In 2 Days
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickReminderPreset('in_3_days')}
                            className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-[10px] font-bold text-purple-900 hover:bg-purple-100 transition shadow-2xs cursor-pointer"
                          >
                            In 3 Days
                          </button>
                        </div>

                        <input
                          type="datetime-local"
                          value={commentReminder}
                          onChange={(e) => setCommentReminder(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-purple-500 shadow-2xs font-mono"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Input Box with AI Voice & Reminder Integration */}
                  <div className="space-y-2.5 pt-2 border-t border-amber-200/80">
                    <div className="relative">
                      <textarea
                        rows={3}
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="Type note or click mic for AI Voice transcription..."
                        className="w-full p-3 pb-11 bg-white border border-stone-200 rounded-2xl text-xs font-medium text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs resize-none"
                      />
                      <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowReminderPicker(prev => !prev)}
                          className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs ${
                            commentReminder
                              ? 'bg-purple-600 text-white border-purple-700 shadow-xs ring-2 ring-purple-300'
                              : showReminderPicker
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-purple-50 hover:text-purple-900'
                          }`}
                          title="Schedule Reminder Alert"
                        >
                          <Bell className="w-3.5 h-3.5 text-purple-600" />
                          <span>Reminder</span>
                        </button>

                        <AiMicButton
                          size="sm"
                          onInsertComment={(transcript) => {
                            setCommentInput(prev => prev ? `${prev} ${transcript}` : transcript);
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        disabled={isSubmittingComment || !commentInput.trim()}
                        onClick={() => handleAddComment(false)}
                        className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingComment ? 'Saving...' : 'Save Note'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* 3D Delete Single Deliverable Confirmation Modal */}
          <AnimatePresence>
            {deleteConfirmTarget && (
              <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 15 }}
                  className="bg-white rounded-3xl shadow-2xl border-2 border-rose-300 max-w-md w-full overflow-hidden text-stone-900"
                >
                  <div className="p-5 bg-gradient-to-r from-rose-900 via-stone-900 to-rose-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center shadow-inner">
                        <AlertTriangle className="w-5 h-5 text-rose-400 stroke-[2.5]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black tracking-tight">Delete Deliverable?</h4>
                        <p className="text-[11px] text-rose-200/80 font-medium">This will permanently remove this item</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmTarget(null)}
                      className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition shadow-2xs"
                    >
                      <X className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>

                  <div className="p-5 space-y-4 bg-[#FFFDFB]">
                    <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-1.5 text-xs">
                      <div className="text-[10px] font-black uppercase text-rose-700 tracking-wider">
                        {deleteConfirmTarget.client_name}
                      </div>
                      <div className="text-sm font-black text-stone-900">
                        {deleteConfirmTarget.item_title || deleteConfirmTarget.album_type || 'Deliverable'}
                      </div>
                      {deleteConfirmTarget.specs && (
                        <div className="text-[11px] font-mono text-stone-600 font-bold">
                          Specs: {deleteConfirmTarget.specs}
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-stone-700 font-bold">
                        <span>Fee: ₹{Number(deleteConfirmTarget.total_amount || 0).toLocaleString('en-IN')}</span>
                        <span>•</span>
                        <span>Paid: ₹{Number(deleteConfirmTarget.paid_amount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed font-medium">
                      Are you sure you want to remove this deliverable from <span className="font-bold text-stone-900">{deleteConfirmTarget.client_name}</span>? This action cannot be undone.
                    </p>

                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
                      <button
                        type="button"
                        disabled={isDeletingTarget}
                        onClick={() => setDeleteConfirmTarget(null)}
                        className="px-4 py-2 border border-stone-200 text-stone-700 text-xs font-bold rounded-xl hover:bg-stone-50 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isDeletingTarget}
                        onClick={handleConfirmDeleteDeliverable}
                        className="px-5 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isDeletingTarget ? 'Deleting...' : 'Delete Deliverable'}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* 3D Delete Entire Segment Confirmation Modal */}
          <AnimatePresence>
            {deleteSegmentConfirmTarget && (
              <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 15 }}
                  className="bg-white rounded-3xl shadow-2xl border-2 border-rose-300 max-w-md w-full overflow-hidden text-stone-900"
                >
                  <div className="p-5 bg-gradient-to-r from-rose-900 via-stone-900 to-rose-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center shadow-inner">
                        <AlertTriangle className="w-5 h-5 text-rose-400 stroke-[2.5]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black tracking-tight">Delete Segment?</h4>
                        <p className="text-[11px] text-rose-200/80 font-medium">
                          {deleteSegmentConfirmTarget.orders.length} {deleteSegmentConfirmTarget.orders.length === 1 ? 'deliverable' : 'deliverables'} will be deleted
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteSegmentConfirmTarget(null)}
                      className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition shadow-2xs"
                    >
                      <X className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>

                  <div className="p-5 space-y-4 bg-[#FFFDFB]">
                    <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-1.5 text-xs">
                      <div className="text-[10px] font-black uppercase text-rose-700 tracking-wider">
                        {deleteSegmentConfirmTarget.clientName}
                      </div>
                      <div className="text-sm font-black text-stone-900">
                        Segment: {deleteSegmentConfirmTarget.segmentName}
                      </div>
                      <div className="text-[11px] text-stone-600 font-bold">
                        Includes: {deleteSegmentConfirmTarget.orders.map(o => o.item_title || o.album_type).join(', ')}
                      </div>
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed font-medium">
                      Are you sure you want to delete the <span className="font-bold text-stone-900">{deleteSegmentConfirmTarget.segmentName}</span> segment and all <span className="font-bold text-rose-700">{deleteSegmentConfirmTarget.orders.length} deliverables</span> under it?
                    </p>

                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
                      <button
                        type="button"
                        disabled={isDeletingTarget}
                        onClick={() => setDeleteSegmentConfirmTarget(null)}
                        className="px-4 py-2 border border-stone-200 text-stone-700 text-xs font-bold rounded-xl hover:bg-stone-50 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isDeletingTarget}
                        onClick={handleConfirmDeleteSegment}
                        className="px-5 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isDeletingTarget ? 'Deleting...' : `Delete All (${deleteSegmentConfirmTarget.orders.length})`}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* 3D Add Segment to Client Modal */}
          <AnimatePresence>
            {cardAddSegmentClient && (
              <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="bg-[#FAF8F5] rounded-3xl shadow-2xl border-2 border-amber-300 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-stone-900"
                >
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-[#2B231D] via-[#3A3027] to-[#2B231D] text-amber-50 flex items-center justify-between border-b border-amber-900/40">
                    <div>
                      <h4 className="text-sm sm:text-base font-black flex items-center gap-2">
                        <Plus className="w-4 h-4 text-amber-400 stroke-[3]" />
                        <span>+ Add Segment • {cardAddSegmentClient}</span>
                      </h4>
                      <p className="text-xs text-amber-200/70 font-semibold mt-0.5">
                        Add a new event segment and deliverables to {cardAddSegmentClient}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCardAddSegmentClient(null)}
                      className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition shadow-xs"
                    >
                      <X className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>

                  <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                    {/* Segment Selector with ThreeDSegmentSelect */}
                    <div className="bg-white p-3.5 rounded-2xl border border-amber-200/80 shadow-2xs space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-stone-500 block">
                        Event Segment
                      </label>
                      <ThreeDSegmentSelect
                        value={cardNewSegmentName}
                        onChange={setCardNewSegmentName}
                      />
                    </div>

                    {/* Deliverables in this Segment */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-black uppercase tracking-wider text-stone-600">
                          Segment Deliverables ({cardNewDeliverables.length})
                        </h5>
                        <button
                          type="button"
                          onClick={() => {
                            const defaultDel = ppVideoPresets[0] || { title: 'Cinematic Teaser', specs: '1-2 Mins' };
                            setCardNewDeliverables(prev => [
                              ...prev,
                              {
                                id: `del_${Date.now()}`,
                                title: defaultDel.title,
                                specs: defaultDel.specs,
                                dueDate: '',
                                agreedFee: '0',
                                paidAmount: '0',
                              }
                            ]);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1 border border-emerald-300 transition cursor-pointer"
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                          <span>+ Add Deliverable</span>
                        </button>
                      </div>

                      {cardNewDeliverables.map((del) => (
                        <div key={del.id} className="p-3 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            {/* Deliverable Title: 3D Selector with Presets, Specs, Search & Custom Mode */}
                            <div className="sm:col-span-5 space-y-1">
                              <label className="text-[9px] font-black uppercase tracking-wider text-stone-500 block">
                                Deliverable Title
                              </label>
                              <ThreeDDeliverableSelect
                                value={del.title}
                                specs={del.specs}
                                presets={ppVideoPresets}
                                onChange={(newTitle, newSpecs) => {
                                  setCardNewDeliverables(prev => prev.map(d => d.id === del.id ? {
                                    ...d,
                                    title: newTitle,
                                    specs: newSpecs || d.specs,
                                  } : d));
                                }}
                              />
                            </div>

                            <div className="sm:col-span-3 space-y-1">
                              <label className="text-[9px] font-black uppercase tracking-wider text-stone-500 block">
                                Specs / Duration
                              </label>
                              <input
                                type="text"
                                value={del.specs}
                                onChange={(e) => setCardNewDeliverables(prev => prev.map(d => d.id === del.id ? { ...d, specs: e.target.value } : d))}
                                placeholder="e.g. 1-2 Mins"
                                className="w-full p-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-800 focus:outline-none focus:border-amber-500"
                              />
                            </div>

                            <div className="sm:col-span-3 space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-black uppercase tracking-wider text-stone-500 block">
                                  Deadline
                                </label>
                                {(() => {
                                  const badge = getRemainingDaysBadge(del.dueDate);
                                  if (!badge) return null;
                                  return (
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] border shadow-2xs font-mono font-bold ${badge.className}`}>
                                      {badge.label}
                                    </span>
                                  );
                                })()}
                              </div>
                              <input
                                type="date"
                                value={del.dueDate}
                                onChange={(e) => setCardNewDeliverables(prev => prev.map(d => d.id === del.id ? { ...d, dueDate: e.target.value } : d))}
                                className="w-full p-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold font-mono text-stone-800 focus:outline-none focus:border-amber-500"
                              />
                            </div>

                            <div className="sm:col-span-1 flex items-end justify-center pt-2 sm:pt-4">
                              {cardNewDeliverables.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setCardNewDeliverables(prev => prev.filter(d => d.id !== del.id))}
                                  className="p-1 rounded text-stone-400 hover:text-rose-600 transition cursor-pointer"
                                  title="Delete Deliverable"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-100">
                            <div>
                              <label className="text-[9px] font-bold text-stone-500 block">Agreed Fee (₹)</label>
                              <input
                                type="number"
                                value={del.agreedFee}
                                onChange={(e) => setCardNewDeliverables(prev => prev.map(d => d.id === del.id ? { ...d, agreedFee: e.target.value } : d))}
                                className="w-full p-1 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-bold text-stone-900"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-emerald-700 block">Paid Amount (₹)</label>
                              <input
                                type="number"
                                value={del.paidAmount}
                                onChange={(e) => setCardNewDeliverables(prev => prev.map(d => d.id === del.id ? { ...d, paidAmount: e.target.value } : d))}
                                className="w-full p-1 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-bold text-emerald-700"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50/70 border-t border-amber-200/90 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setCardAddSegmentClient(null)}
                      className="px-4 py-2 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl hover:bg-stone-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSavingCardSegment || !cardNewSegmentName.trim()}
                      onClick={handleSaveCardSegment}
                      className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{isSavingCardSegment ? 'Adding Segment...' : 'Save & Add Segment'}</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* 3D Add Single Deliverable to Segment Modal */}
          <AnimatePresence>
            {addDeliverableTarget && (
              <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="bg-white rounded-3xl shadow-2xl border-2 border-amber-300 max-w-md w-full overflow-hidden text-stone-900"
                >
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-[#2B231D] via-[#3A3027] to-[#2B231D] text-amber-50 flex items-center justify-between border-b border-amber-900/40">
                    <div>
                      <h4 className="text-sm sm:text-base font-black flex items-center gap-2">
                        <Plus className="w-4 h-4 text-amber-400 stroke-[3]" />
                        <span>+ Add Deliverable</span>
                      </h4>
                      <p className="text-xs text-amber-200/70 font-semibold mt-0.5">
                        {addDeliverableTarget.clientName} • {addDeliverableTarget.segmentName}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAddDeliverableTarget(null)}
                      className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition shadow-xs"
                    >
                      <X className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>

                  <div className="p-5 space-y-3.5 bg-[#FFFDFB]">
                    {/* Deliverable Title: 3D Selector with Presets, Specs, Search & Custom Mode */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-stone-600 block">
                        Deliverable Title *
                      </label>
                      <ThreeDDeliverableSelect
                        value={targetDelivTitle}
                        specs={targetDelivSpecs}
                        presets={ppVideoPresets}
                        onChange={(newTitle, newSpecs) => {
                          setTargetDelivTitle(newTitle);
                          if (newSpecs) setTargetDelivSpecs(newSpecs);
                        }}
                      />
                    </div>

                    {/* Specs / Duration */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-stone-600 block">
                        Specs / Duration
                      </label>
                      <input
                        type="text"
                        value={targetDelivSpecs}
                        onChange={(e) => setTargetDelivSpecs(e.target.value)}
                        placeholder="e.g. 1-2 Mins"
                        className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:border-amber-500 shadow-2xs"
                      />
                    </div>

                    {/* Deadline */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-wider text-stone-600 block">
                          Deadline
                        </label>
                        {(() => {
                          const badge = getRemainingDaysBadge(targetDelivDueDate);
                          if (!badge) return null;
                          return (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] border shadow-2xs font-mono font-bold ${badge.className}`}>
                              {badge.label}
                            </span>
                          );
                        })()}
                      </div>
                      <input
                        type="date"
                        value={targetDelivDueDate}
                        onChange={(e) => setTargetDelivDueDate(e.target.value)}
                        className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-800 focus:outline-none focus:border-amber-500 shadow-2xs"
                      />
                    </div>

                    {/* Commercials */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-stone-600 block mb-1">Agreed Fee (₹)</label>
                        <input
                          type="number"
                          value={targetDelivFee}
                          onChange={(e) => setTargetDelivFee(e.target.value)}
                          className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-emerald-700 block mb-1">Paid Amount (₹)</label>
                        <input
                          type="number"
                          value={targetDelivPaid}
                          onChange={(e) => setTargetDelivPaid(e.target.value)}
                          className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-emerald-700"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => setAddDeliverableTarget(null)}
                        className="px-4 py-2 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl hover:bg-stone-50 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSavingSingleDeliverable || !targetDelivTitle.trim()}
                        onClick={handleSaveSingleDeliverable}
                        className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>{isSavingSingleDeliverable ? 'Saving...' : 'Add Deliverable'}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 3D Multi-Select Filter Modal (Card-Derived Event Types & Crew Roles Only) */}
        <VendorDeliverablesFilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters({
            startDate: '',
            endDate: '',
            eventTypes: [],
            segments: [],
            deliverables: [],
            roles: [],
            paymentStatuses: [],
            workflowStatuses: [],
            dueDateFilter: 'all',
          })}
          availableEventTypes={cardEventTypes}
          availableSegments={cardSegments}
          availableDeliverables={cardDeliverables}
          availableRoles={cardCrewRoles}
          availableWorkflowStatuses={ppStatuses}
          category={activeCategoryTab}
          totalFilteredCount={filteredOrders.length}
        />

        {/* Minimal Luxury Statement / Invoice Printable Component */}
        <VendorStatementInvoicePdfTemplate
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          vendor={vendor}
          studioName={studioProfile.name || studioName}
          studioPhone={studioProfile.phone}
          studioEmail={studioProfile.email}
          studioAddress={studioProfile.address}
          items={invoiceItems}
          category={activeCategoryTab}
          specialization={
            activeCategoryTab === 'video_editing' ? 'Video Editing' :
            activeCategoryTab === 'photo_editing' ? 'Photo Editing' :
            activeCategoryTab === 'album_design' ? 'Album Designing' :
            activeCategoryTab === 'album_printing' ? 'Album Printing' :
            (vendor.role || 'Shoot Specialist')
          }
        />

        {/* Attach Resource / Drive Links Modal */}
        <AttachLinksModal
          isOpen={Boolean(attachLinksOrder)}
          onClose={() => setAttachLinksOrder(null)}
          title={attachLinksOrder?.item_title || attachLinksOrder?.album_type || 'Deliverable'}
          subtitle={attachLinksOrder?.client_name}
          initialLinks={(attachLinksOrder?.drive_links || []).map((l: any, i: number) => ({
            id: l.id || `lnk_${i}`,
            title: l.title || l.label || 'Link',
            url: l.url || '',
          }))}
          onSave={handleSaveAttachLinks}
        />
      </div>
    </AnimatePresence>
  );
}
