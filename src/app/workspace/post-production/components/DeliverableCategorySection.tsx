'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Camera, Video, BookOpen, Plus, Sparkles, Trash2, X, CheckSquare, Square, Check, Search, ChevronDown
} from 'lucide-react';
import DeliverableRowItem from './DeliverableRowItem';
import PostProductionConfirmModal from './PostProductionConfirmModal';
import { fetchPostProductionSettings, DEFAULT_POST_PRODUCTION_CATEGORIES, normalizePreset } from '@/lib/post-production-settings';

export interface DeliverableDriveLink {
  id: string;
  label: string;
  url: string;
}

export interface DeliverableCommentItem {
  id: string;
  author_name: string;
  comment_text: string;
  created_at: string;
  user_id?: string;
  reminder_at?: string;
  reminder_for?: string;
}

export interface PostProductionDeliverable {
  id: string;
  project_id?: string;
  segment: string;
  category: string;
  custom_category_name?: string;
  title: string;
  status: 'Upcoming' | 'In Progress' | 'Under Review' | 'Done' | string;
  assigned_member_id?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
  deadline?: string | null;
  notes?: string | null;
  drive_link?: string | null;
  drive_links?: DeliverableDriveLink[];
  comments?: DeliverableCommentItem[];
  comments_count?: number;
  count?: string | number | null;
  specs?: string | number | null;
  is_custom?: boolean;
  is_hidden?: boolean;
  segment_order?: number;
}

interface DeliverableCategorySectionProps {
  segment: string;
  category: string;
  items: PostProductionDeliverable[];
  teamMembers: { id: string; name: string; role?: string }[];
  onUpdateItem: (itemId: string, field: keyof PostProductionDeliverable, value: any) => void;
  onUpdateItemFields?: (itemId: string, fields: Partial<PostProductionDeliverable>) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (segment: string, category: string, title: string, specs?: string) => void;
  onRemoveCategory?: (segment: string, category: string) => void;
  onOpenComments: (itemId: string, title: string) => void;
  onOpenDrive?: (itemId: string, currentLink: string) => void;
}

export default function DeliverableCategorySection({
  segment,
  category,
  items,
  teamMembers,
  onUpdateItem,
  onUpdateItemFields,
  onDeleteItem,
  onAddItem,
  onRemoveCategory,
  onOpenComments,
  onOpenDrive,
}: DeliverableCategorySectionProps) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());
  const [presetSpecs, setPresetSpecs] = useState<Record<string, string>>({});
  const [customTitle, setCustomTitle] = useState('');
  const [customSpecs, setCustomSpecs] = useState('');
  const [customSelected, setCustomSelected] = useState(false);
  const [showDeleteCatConfirm, setShowDeleteCatConfirm] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isAddingItem) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 60);
    }
  }, [isAddingItem]);

  // Click outside & Escape key listener to cleanly close dropdown
  useEffect(() => {
    if (!isAddingItem) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsAddingItem(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddingItem(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAddingItem]);

  // Category Presets from settings: { title: string; defaultSpecs: string }
  const [categoryPresets, setCategoryPresets] = useState<{ title: string; defaultSpecs: string }[]>([]);

  const loadCategorySettings = () => {
    fetchPostProductionSettings().then(settings => {
      const match = settings.categories.find(c => c.name.toLowerCase() === category.toLowerCase());
      if (match && match.presets.length > 0) {
        const normalized = match.presets.map(p => {
          const n = normalizePreset(p);
          return { title: n.title, defaultSpecs: n.specs };
        });
        setCategoryPresets(normalized);
        const defaults: Record<string, string> = {};
        normalized.forEach(item => {
          if (item.defaultSpecs) defaults[item.title] = item.defaultSpecs;
        });
        setPresetSpecs(prev => ({ ...defaults, ...prev }));
      } else {
        const defMatch = DEFAULT_POST_PRODUCTION_CATEGORIES.find(c => c.name.toLowerCase() === category.toLowerCase());
        const rawPresets = defMatch?.presets || [{ title: 'Standard Deliverable', specs: '' }, { title: 'Final Master Export', specs: '' }];
        const normalized = rawPresets.map(p => {
          const n = normalizePreset(p);
          return { title: n.title, defaultSpecs: n.specs };
        });
        setCategoryPresets(normalized);
      }
    }).catch(() => {
      const defMatch = DEFAULT_POST_PRODUCTION_CATEGORIES.find(c => c.name.toLowerCase() === category.toLowerCase());
      const rawPresets = defMatch?.presets || [{ title: 'Standard Deliverable', specs: '' }, { title: 'Final Master Export', specs: '' }];
      const normalized = rawPresets.map(p => {
        const n = normalizePreset(p);
        return { title: n.title, defaultSpecs: n.specs };
      });
      setCategoryPresets(normalized);
    });
  };

  useEffect(() => {
    loadCategorySettings();
    const handleSettingsUpdated = () => {
      loadCategorySettings();
    };
    window.addEventListener('post_production_settings_updated', handleSettingsUpdated);
    return () => {
      window.removeEventListener('post_production_settings_updated', handleSettingsUpdated);
    };
  }, [category]);

  // Filtered Presets based on live search query
  const filteredPresets = useMemo(() => {
    if (!searchQuery.trim()) return categoryPresets;
    const q = searchQuery.toLowerCase().trim();
    return categoryPresets.filter(p => 
      p.title.toLowerCase().includes(q) || 
      (p.defaultSpecs && p.defaultSpecs.toLowerCase().includes(q))
    );
  }, [categoryPresets, searchQuery]);

  const isAllFilteredSelected = filteredPresets.length > 0 && filteredPresets.every(p => selectedPresets.has(p.title));

  const handleToggleSelectAll = () => {
    setSelectedPresets(prev => {
      const next = new Set(prev);
      if (isAllFilteredSelected) {
        filteredPresets.forEach(p => next.delete(p.title));
      } else {
        filteredPresets.forEach(p => {
          next.add(p.title);
          if (p.defaultSpecs && !presetSpecs[p.title]) {
            setPresetSpecs(s => ({ ...s, [p.title]: p.defaultSpecs }));
          }
        });
      }
      return next;
    });
  };

  // Category Theme Icons, Minimal Light Backgrounds & Colors
  const config = useMemo(() => {
    switch (category) {
      case 'Photos':
        return {
          icon: <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
          title: 'Photos Deliverables',
          badge: 'Stills, Color Grading & Retouching',
          containerBg: 'bg-[#F5F8FE] dark:bg-[#131722]',
          containerBorder: 'border-[#DBE6FA] dark:border-indigo-900/50',
          accent: 'border-indigo-200 bg-indigo-50/80 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
        };
      case 'Videos':
        return {
          icon: <Video className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
          title: 'Videos Deliverables',
          badge: 'Teasers, Highlight Films & Reels',
          containerBg: 'bg-[#FEF5F6] dark:bg-[#201416]',
          containerBorder: 'border-[#FBD6DC] dark:border-rose-900/50',
          accent: 'border-rose-200 bg-rose-50/80 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
        };
      case 'Albums':
        return {
          icon: <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
          title: 'Albums Deliverables',
          badge: 'Photobooks, Designing & Printing',
          containerBg: 'bg-[#FEF9F0] dark:bg-[#1F1912]',
          containerBorder: 'border-[#F8E6C8] dark:border-amber-900/50',
          accent: 'border-amber-200 bg-amber-50/80 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
        };
      default:
        return {
          icon: <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
          title: `${category} Deliverables`,
          badge: 'Custom Category Deliverables',
          containerBg: 'bg-[#F2F9F6] dark:bg-[#121E18]',
          containerBorder: 'border-[#CEEAD9] dark:border-emerald-900/50',
          accent: 'border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
        };
    }
  }, [category]);

  const togglePresetSelection = (preset: string) => {
    setSelectedPresets(prev => {
      const next = new Set(prev);
      if (next.has(preset)) {
        next.delete(preset);
      } else {
        next.add(preset);
        const match = categoryPresets.find(p => p.title === preset);
        if (match?.defaultSpecs && !presetSpecs[preset]) {
          setPresetSpecs(s => ({ ...s, [preset]: match.defaultSpecs }));
        }
      }
      return next;
    });
  };

  const handlePresetSpecChange = (preset: string, val: string) => {
    setPresetSpecs(prev => ({ ...prev, [preset]: val }));
    if (val.trim()) {
      setSelectedPresets(prev => new Set(prev).add(preset));
    }
  };

  const handleBatchAdd = (e: React.FormEvent) => {
    e.preventDefault();
    selectedPresets.forEach(preset => {
      const match = categoryPresets.find(p => p.title === preset);
      const spec = (presetSpecs[preset] !== undefined ? presetSpecs[preset] : match?.defaultSpecs || '').trim() || undefined;
      onAddItem(segment, category, preset, spec);
    });

    if ((customSelected || customTitle.trim()) && customTitle.trim()) {
      onAddItem(segment, category, customTitle.trim(), customSpecs.trim() || undefined);
    }

    setSelectedPresets(new Set());
    setPresetSpecs({});
    setCustomTitle('');
    setCustomSpecs('');
    setCustomSelected(false);
    setSearchQuery('');
    setIsAddingItem(false);
  };

  const totalToAddCount = selectedPresets.size + ((customSelected || customTitle.trim()) && customTitle.trim() ? 1 : 0);

  return (
    <div className={`w-full ${config.containerBg} rounded-2xl border ${config.containerBorder} p-4 space-y-3 shadow-xs transition-colors`}>
      {/* ── Category Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-800 shadow-2xs shrink-0">
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-black text-slate-800 dark:text-stone-100 uppercase tracking-wider">
                {config.title}
              </h4>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${config.accent}`}>
                {items.length} {items.length === 1 ? 'Item' : 'Items'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-stone-400 font-medium mt-0.5">
              {config.badge}
            </p>
          </div>
        </div>

        {/* Header Action Buttons & 3D Creamy Multi-Select Dropdown Popover */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Add Deliverable Dropdown Trigger & Popover */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsAddingItem(prev => !prev);
                if (isAddingItem) {
                  setSearchQuery('');
                }
              }}
              className="px-3 py-1.5 text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-950/60 hover:bg-amber-200/90 border border-amber-300 dark:border-amber-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:translate-y-0.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Deliverable</span>
              <ChevronDown className={`w-3 h-3 text-amber-700 dark:text-amber-400 transition-transform duration-200 ${isAddingItem ? 'rotate-180' : ''}`} />
            </button>

            {/* ── 3D Creamy Multi-Select Dropdown Popover ── */}
            {isAddingItem && (
              <form 
                onSubmit={handleBatchAdd}
                className="absolute right-0 top-full mt-2 w-[calc(100vw-2.5rem)] sm:w-[460px] max-w-[460px] bg-[#FFFDF9] dark:bg-[#1C1A17] rounded-2xl border border-[#EAE5DA] dark:border-stone-700 border-t-2 border-t-amber-400 dark:border-t-amber-500 shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-50 flex flex-col font-sans overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 1. Header with icon, category, segment name & close button */}
                <div className="p-3.5 border-b border-[#EAE5DA] dark:border-stone-800 bg-gradient-to-r from-amber-50/80 via-[#FFFDF9] to-amber-50/50 dark:from-stone-900 dark:via-[#1C1A17] dark:to-stone-900 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-amber-100/80 dark:bg-amber-950/80 border border-amber-300/80 dark:border-amber-700/80 shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-amber-950 dark:text-amber-200 uppercase tracking-wider block">
                        Add {category} Deliverables
                      </span>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 font-semibold">
                        {segment} • Multi-select &amp; specs
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingItem(false);
                      setSearchQuery('');
                    }}
                    className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 2. Top Search Bar */}
                <div className="px-3 pt-3 pb-2 bg-[#FFFDF9] dark:bg-[#1C1A17]">
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 absolute left-3 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder={`🔍 Search ${category.toLowerCase()} deliverables...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-xs bg-[#FAF8F5] dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl text-slate-800 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all font-medium shadow-2xs"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 p-0.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Filter Stats & Select All / Deselect All */}
                <div className="px-3.5 py-1.5 flex items-center justify-between text-[11px] border-b border-[#EAE5DA]/70 dark:border-stone-800/70 bg-[#FAF8F5]/80 dark:bg-stone-900/60">
                  <span className="font-semibold text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    {filteredPresets.length} {filteredPresets.length === 1 ? 'Deliverable' : 'Deliverables'} Available
                  </span>
                  {filteredPresets.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 hover:underline cursor-pointer text-[11px]"
                    >
                      {isAllFilteredSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {/* 4. Scrollable Presets List with Proper Scrollbar */}
                <div className="max-h-60 sm:max-h-64 overflow-y-auto p-2.5 space-y-1.5 [scrollbar-width:thin] [scrollbar-color:#E6D7BE_transparent]">
                  {filteredPresets.length === 0 ? (
                    <div className="p-4 text-center rounded-xl bg-amber-50/40 dark:bg-stone-900/40 border border-dashed border-amber-200 dark:border-stone-800 text-stone-500 space-y-1">
                      <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                        No deliverables match &quot;{searchQuery}&quot;
                      </p>
                      <p className="text-[11px] text-stone-400">
                        You can add it as a custom deliverable below 👇
                      </p>
                    </div>
                  ) : (
                    filteredPresets.map((item) => {
                      const preset = item.title;
                      const isSelected = selectedPresets.has(preset);
                      const currentSpec = presetSpecs[preset] !== undefined ? presetSpecs[preset] : item.defaultSpecs;

                      return (
                        <div
                          key={preset}
                          onClick={() => togglePresetSelection(preset)}
                          className={`p-2 sm:p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between gap-2.5 cursor-pointer select-none ${
                            isSelected
                              ? 'bg-gradient-to-r from-amber-50/90 to-[#FFFDF9] dark:from-amber-950/40 dark:to-stone-900 border-amber-400/90 dark:border-amber-700 shadow-2xs ring-1 ring-amber-400/20'
                              : 'bg-[#FAF8F5] dark:bg-stone-800/70 border-[#EAE5DA] dark:border-stone-700 hover:border-amber-300/80 dark:hover:border-amber-700/80 hover:bg-white dark:hover:bg-stone-800 shadow-2xs'
                          }`}
                        >
                          {/* Left: Checkbox & Title */}
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-stone-400 dark:text-stone-500 shrink-0" />
                            )}
                            <span className={`truncate text-xs ${isSelected ? 'font-black text-amber-950 dark:text-amber-200' : 'text-slate-800 dark:text-stone-200 font-semibold'}`}>
                              {preset}
                            </span>
                          </div>

                          {/* Right: Individual Specs Input */}
                          <div 
                            className="w-28 sm:w-32 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              placeholder={item.defaultSpecs ? item.defaultSpecs : 'Specs / Count'}
                              value={currentSpec}
                              onChange={(e) => handlePresetSpecChange(preset, e.target.value)}
                              className={`w-full px-2 py-1 text-[11px] font-bold rounded-lg border transition-all focus:outline-none ${
                                isSelected
                                  ? 'bg-white dark:bg-stone-900 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 focus:ring-1 focus:ring-amber-500'
                                  : 'bg-white dark:bg-stone-900/60 border-[#EAE5DA] dark:border-stone-700 text-slate-800 dark:text-stone-200 placeholder:text-stone-400 focus:ring-1 focus:ring-amber-400'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* 5. Custom Deliverable Section */}
                  <div className="pt-2 border-t border-[#EAE5DA] dark:border-stone-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1">
                        <Plus className="w-3 h-3 text-amber-500" />
                        + Add Custom Deliverable:
                      </span>
                      {searchQuery && !customTitle && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomTitle(searchQuery);
                            setCustomSelected(true);
                          }}
                          className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                        >
                          Use &quot;{searchQuery}&quot;
                        </button>
                      )}
                    </div>

                    <div className={`p-2 rounded-xl border text-xs font-bold transition-all flex flex-col sm:flex-row items-stretch sm:items-center gap-2 ${
                      customSelected || customTitle.trim()
                        ? 'bg-gradient-to-r from-amber-50/90 to-[#FFFDF9] dark:from-amber-950/40 dark:to-stone-900 border-amber-400/90 dark:border-amber-700 shadow-2xs ring-1 ring-amber-400/20'
                        : 'bg-[#FAF8F5] dark:bg-stone-800/70 border-[#EAE5DA] dark:border-stone-700 shadow-2xs'
                    }`}>
                      <div 
                        onClick={() => setCustomSelected(prev => !prev)}
                        className="flex items-center gap-2 shrink-0 cursor-pointer select-none"
                      >
                        {customSelected || customTitle.trim() ? (
                          <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-stone-400 dark:text-stone-500 shrink-0" />
                        )}
                        <span className="text-[11px] font-bold text-slate-700 dark:text-stone-300 whitespace-nowrap">
                          Custom
                        </span>
                      </div>

                      <input
                        type="text"
                        placeholder="Custom name (e.g. 60-Sec Reel)..."
                        value={customTitle}
                        onChange={(e) => {
                          setCustomTitle(e.target.value);
                          if (e.target.value.trim()) setCustomSelected(true);
                        }}
                        className="flex-1 min-w-0 px-2.5 py-1 text-xs font-medium bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-lg text-slate-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />

                      <input
                        type="text"
                        placeholder="Specs / Count"
                        value={customSpecs}
                        onChange={(e) => {
                          setCustomSpecs(e.target.value);
                          if (e.target.value.trim()) setCustomSelected(true);
                        }}
                        className="w-full sm:w-28 shrink-0 px-2 py-1 text-[11px] font-medium bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-lg text-slate-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 6. Sticky Footer Action Bar */}
                <div className="p-3 border-t border-[#EAE5DA] dark:border-stone-800 bg-gradient-to-r from-[#FAF8F5] via-[#FFFDF9] to-[#FAF8F5] dark:from-stone-900 dark:via-[#1C1A17] dark:to-stone-900 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
                    {totalToAddCount > 0 ? (
                      <span className="text-amber-900 dark:text-amber-300 font-extrabold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        {totalToAddCount} {totalToAddCount === 1 ? 'deliverable' : 'deliverables'} selected
                      </span>
                    ) : (
                      <span className="text-stone-400">0 selected</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingItem(false);
                        setSearchQuery('');
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={totalToAddCount === 0}
                      className="px-4 py-1.5 text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:translate-y-0.5 text-white rounded-xl shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {totalToAddCount > 1 
                          ? `Add Selected (${totalToAddCount})` 
                          : totalToAddCount === 1
                          ? 'Add Selected (1)'
                          : 'Add Deliverable'}
                      </span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Remove Category button */}
          {onRemoveCategory && (
            <button
              type="button"
              onClick={() => setShowDeleteCatConfirm(true)}
              className="p-2 text-neutral-400 hover:text-red-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl border border-[#EAE5DA] dark:border-stone-800 hover:border-rose-200 dark:hover:border-rose-900 transition-all cursor-pointer shadow-2xs"
              title={`Remove ${category} from ${segment}`}
            >
              <Trash2 className="w-3.5 h-3.5 text-neutral-400 hover:text-red-600 transition-colors" />
            </button>
          )}
        </div>
      </div>

      {/* ── Deliverable Items List ── */}
      {items.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-[#EAE5DA] dark:border-stone-800 text-center bg-white/40 dark:bg-stone-900/30 space-y-2">
          <p className="text-xs text-slate-500 dark:text-stone-400 font-medium">
            No {category.toLowerCase()} deliverables currently set for {segment}.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsAddingItem(true)}
              className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Create First {category} Item</span>
            </button>
            {onRemoveCategory && (
              <span className="text-slate-300 dark:text-stone-700">•</span>
            )}
            {onRemoveCategory && (
              <button
                type="button"
                onClick={() => setShowDeleteCatConfirm(true)}
                className="text-xs font-bold text-stone-500 hover:text-rose-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Remove Empty Category</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <DeliverableRowItem
              key={item.id}
              item={item}
              teamMembers={teamMembers}
              onUpdateItem={onUpdateItem}
              onUpdateItemFields={onUpdateItemFields}
              onDeleteItem={onDeleteItem}
              onOpenComments={onOpenComments}
              onOpenDrive={onOpenDrive}
            />
          ))}
        </div>
      )}

      {/* Category Deletion 3D Confirmation Modal */}
      <PostProductionConfirmModal
        isOpen={showDeleteCatConfirm}
        onClose={() => setShowDeleteCatConfirm(false)}
        onConfirm={() => {
          if (onRemoveCategory) {
            onRemoveCategory(segment, category);
          }
          setShowDeleteCatConfirm(false);
        }}
        title={`Remove ${category} Category?`}
        message={`Are you sure you want to remove the entire "${category}" category from "${segment}"? Existing items will be hidden.`}
        confirmText="Yes, Remove"
      />
    </div>
  );
}
