'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Camera, Video, BookOpen, Plus, Sparkles, Trash2, X, CheckSquare, Square, Check
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
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());
  const [presetSpecs, setPresetSpecs] = useState<Record<string, string>>({});
  const [customTitle, setCustomTitle] = useState('');
  const [customSpecs, setCustomSpecs] = useState('');
  const [customSelected, setCustomSelected] = useState(false);
  const [showDeleteCatConfirm, setShowDeleteCatConfirm] = useState(false);

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

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Add Deliverable button */}
          <button
            type="button"
            onClick={() => {
              setIsAddingItem(prev => !prev);
              setSelectedPresets(new Set());
              setPresetSpecs({});
              setCustomTitle('');
              setCustomSpecs('');
              setCustomSelected(false);
            }}
            className="px-3 py-1.5 text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-950/60 hover:bg-amber-200/90 border border-amber-300 dark:border-amber-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Deliverable</span>
          </button>

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

      {/* ── Multi-Select Threaded Deliverables Dropdown / Panel with Checkboxes & Per-Item Specs ── */}
      {isAddingItem && (
        <form 
          onSubmit={handleBatchAdd}
          className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-amber-400/80 dark:border-amber-700/80 shadow-lg space-y-3.5"
        >
          <div className="flex items-center justify-between border-b border-amber-100 dark:border-stone-800 pb-2">
            <span className="text-xs font-black text-amber-950 dark:text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Add {category} Deliverables to {segment} (Select Multiple with Individual Specs)
            </span>
            <button
              type="button"
              onClick={() => setIsAddingItem(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-stone-200 text-xs font-bold cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 1. 3D Cream Presets List with Checkbox, Title & Per-Item Specs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-slate-600 dark:text-stone-300 uppercase tracking-wider block">
                Select Deliverables &amp; Set Individual Specs:
              </label>
              <button
                type="button"
                onClick={() => {
                  if (selectedPresets.size === categoryPresets.length) {
                    setSelectedPresets(new Set());
                  } else {
                    setSelectedPresets(new Set(categoryPresets.map(p => p.title)));
                  }
                }}
                className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
              >
                {selectedPresets.size === categoryPresets.length ? 'Deselect All' : 'Select All Presets'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1">
              {categoryPresets.map((item) => {
                const preset = item.title;
                const isSelected = selectedPresets.has(preset);
                return (
                  <div
                    key={preset}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between gap-2 select-none ${
                      isSelected
                        ? 'bg-amber-50/90 dark:bg-amber-950/50 border-amber-400/90 dark:border-amber-700 shadow-2xs'
                        : 'bg-[#FAF8F5] dark:bg-stone-800/80 border-[#EAE5DA] dark:border-stone-700 hover:border-amber-300/80 shadow-2xs'
                    }`}
                  >
                    {/* Left: Checkbox & Preset Title */}
                    <div 
                      onClick={() => togglePresetSelection(preset)}
                      className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className={`truncate ${isSelected ? 'font-black text-amber-950 dark:text-amber-200' : 'text-slate-700 dark:text-stone-300'}`}>
                        {preset}
                      </span>
                    </div>

                    {/* Right: Individual Per-Item Specs Input */}
                    <div className="w-36 shrink-0">
                      <input
                        type="text"
                        placeholder={item.defaultSpecs ? `Default: ${item.defaultSpecs}` : 'Specs / Count'}
                        value={presetSpecs[preset] !== undefined ? presetSpecs[preset] : item.defaultSpecs}
                        onChange={(e) => handlePresetSpecChange(preset, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className={`w-full px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all focus:outline-none ${
                          isSelected
                            ? 'bg-white dark:bg-stone-900 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 focus:ring-1 focus:ring-amber-500'
                            : 'bg-white dark:bg-stone-900/60 border-[#EAE5DA] dark:border-stone-700 text-slate-800 dark:text-stone-200 placeholder:text-slate-400 focus:ring-1 focus:ring-amber-400'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Custom Deliverable Row with Checkbox, Title & Specs */}
          <div className="pt-2 border-t border-amber-100 dark:border-stone-800">
            <label className="text-[11px] font-black text-slate-600 dark:text-stone-300 uppercase tracking-wider block mb-1.5">
              + Or Add Custom Deliverable:
            </label>
            <div className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 ${
              customSelected || customTitle.trim()
                ? 'bg-amber-50/90 dark:bg-amber-950/50 border-amber-400/90 shadow-2xs'
                : 'bg-[#FAF8F5] dark:bg-stone-800/80 border-[#EAE5DA] dark:border-stone-700 shadow-2xs'
            }`}>
              <div 
                onClick={() => setCustomSelected(prev => !prev)}
                className="flex items-center gap-2.5 shrink-0 cursor-pointer"
              >
                {customSelected || customTitle.trim() ? (
                  <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="text-slate-700 dark:text-stone-300 font-bold whitespace-nowrap">
                  Custom Item
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  placeholder={`Custom deliverable name (e.g. 60-Sec Reel, Drone Highlights)...`}
                  value={customTitle}
                  onChange={(e) => {
                    setCustomTitle(e.target.value);
                    if (e.target.value.trim()) setCustomSelected(true);
                  }}
                  className="w-full px-2.5 py-1 text-xs font-bold bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-lg text-slate-900 dark:text-stone-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="w-full sm:w-36 shrink-0">
                <input
                  type="text"
                  placeholder="Specs / Count"
                  value={customSpecs}
                  onChange={(e) => {
                    setCustomSpecs(e.target.value);
                    if (e.target.value.trim()) setCustomSelected(true);
                  }}
                  className="w-full px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-lg text-slate-900 dark:text-stone-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-amber-100 dark:border-stone-800">
            <span className="text-[11px] font-bold text-slate-500">
              {totalToAddCount > 0 
                ? `${totalToAddCount} deliverable(s) ready to add with specs` 
                : 'Check presets or type custom title above'}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddingItem(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={totalToAddCount === 0}
                className="px-4 py-2 text-xs font-black bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {totalToAddCount > 1 
                    ? `Add Selected (${totalToAddCount} Deliverables)` 
                    : 'Add Deliverable'}
                </span>
              </button>
            </div>
          </div>
        </form>
      )}

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
