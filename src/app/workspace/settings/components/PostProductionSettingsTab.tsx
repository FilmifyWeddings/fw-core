'use client';

import React, { useState, useEffect } from 'react';
import { 
  Film, Plus, Trash2, Check, Sparkles, Camera, Video, BookOpen, 
  Palette, Tag, AlertCircle, Save, RefreshCw, CheckCircle2, ChevronRight,
  Edit3, X
} from 'lucide-react';
import { 
  PostProductionSettingsData,
  PostProductionCategorySetting,
  PostProductionStatusSetting,
  PostProductionPreset,
  PostProductionPresetItem,
  normalizePreset,
  DEFAULT_POST_PRODUCTION_SETTINGS,
  fetchPostProductionSettings,
  savePostProductionSettings
} from '@/lib/post-production-settings';

interface PostProductionSettingsTabProps {
  workspaceId: string;
  onShowToast: (message: string) => void;
}

const PRESET_COLORS = [
  '#f59e0b', // Amber / Gold
  '#0ea5e9', // Sky Blue
  '#a855f7', // Purple
  '#10b981', // Emerald
  '#f43f5e', // Rose / Red
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#84cc16', // Lime
  '#ec4899', // Pink
  '#64748b', // Slate
];

export default function PostProductionSettingsTab({
  workspaceId,
  onShowToast,
}: PostProductionSettingsTabProps) {
  const [settings, setSettings] = useState<PostProductionSettingsData>(DEFAULT_POST_PRODUCTION_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Category & Preset form states
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('cat_photos');
  const [newPresetTitle, setNewPresetTitle] = useState('');
  const [newPresetSpecs, setNewPresetSpecs] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Preset editing state
  const [editingPresetKey, setEditingPresetKey] = useState<string | null>(null);
  const [editPresetTitle, setEditPresetTitle] = useState('');
  const [editPresetSpecs, setEditPresetSpecs] = useState('');

  // Status form states
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#6366f1');
  const [isAddingStatus, setIsAddingStatus] = useState(false);

  // Status editing state
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editStatusName, setEditStatusName] = useState('');
  const [editStatusColor, setEditStatusColor] = useState('');

  useEffect(() => {
    loadSettings();
  }, [workspaceId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await fetchPostProductionSettings(workspaceId);
      setSettings(data);
      if (data.categories.length > 0) {
        setActiveCategoryTab(data.categories[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updated: PostProductionSettingsData) => {
    setSettings(updated);
    setSaving(true);
    try {
      await savePostProductionSettings(workspaceId, updated);
      onShowToast('Post-Production settings updated & synced!');
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // CATEGORIES & PRESETS HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleAddCategory = () => {
    const cleanName = newCategoryName.trim();
    if (!cleanName) return;

    const newCatId = 'cat_' + Date.now();
    const newCategory: PostProductionCategorySetting = {
      id: newCatId,
      name: cleanName,
      presets: [
        { title: 'Master Export', specs: 'Full Res' },
        { title: 'Client Review Draft', specs: '720p / Watermarked' },
      ],
    };

    const updated: PostProductionSettingsData = {
      ...settings,
      categories: [...settings.categories, newCategory],
    };

    handleSave(updated);
    setNewCategoryName('');
    setIsAddingCategory(false);
    setActiveCategoryTab(newCatId);
  };

  const handleDeleteCategory = (catId: string) => {
    // Prevent deleting default 3 categories
    if (['cat_photos', 'cat_videos', 'cat_albums'].includes(catId)) {
      onShowToast('Default category cannot be deleted.');
      return;
    }

    const updated: PostProductionSettingsData = {
      ...settings,
      categories: settings.categories.filter(c => c.id !== catId),
    };

    handleSave(updated);
    if (activeCategoryTab === catId && updated.categories.length > 0) {
      setActiveCategoryTab(updated.categories[0].id);
    }
  };

  const handleAddPreset = (catId: string) => {
    const cleanTitle = newPresetTitle.trim();
    if (!cleanTitle) return;
    const cleanSpecs = newPresetSpecs.trim();

    const newPreset: PostProductionPresetItem = {
      id: 'preset_' + Date.now(),
      title: cleanTitle,
      specs: cleanSpecs || undefined,
    };

    const updatedCategories = settings.categories.map(c => {
      if (c.id === catId) {
        const exists = c.presets.some(p => {
          const norm = normalizePreset(p);
          return norm.title.toLowerCase() === cleanTitle.toLowerCase();
        });
        if (exists) {
          return c;
        }
        return {
          ...c,
          presets: [...c.presets, newPreset],
        };
      }
      return c;
    });

    const updated: PostProductionSettingsData = {
      ...settings,
      categories: updatedCategories,
    };

    handleSave(updated);
    setNewPresetTitle('');
    setNewPresetSpecs('');
  };

  const handleDeletePreset = (catId: string, presetToRemove: PostProductionPreset) => {
    const targetNorm = normalizePreset(presetToRemove);
    const updatedCategories = settings.categories.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          presets: c.presets.filter(p => {
            const norm = normalizePreset(p);
            if (targetNorm.id && norm.id) {
              return norm.id !== targetNorm.id;
            }
            return norm.title !== targetNorm.title;
          }),
        };
      }
      return c;
    });

    const updated: PostProductionSettingsData = {
      ...settings,
      categories: updatedCategories,
    };

    handleSave(updated);
  };

  const handleStartEditPreset = (preset: PostProductionPreset, index: number) => {
    const norm = normalizePreset(preset);
    const key = norm.id || `${norm.title}_${index}`;
    setEditingPresetKey(key);
    setEditPresetTitle(norm.title);
    setEditPresetSpecs(norm.specs || '');
  };

  const handleCancelEditPreset = () => {
    setEditingPresetKey(null);
    setEditPresetTitle('');
    setEditPresetSpecs('');
  };

  const handleSaveEditPreset = (catId: string, originalPreset: PostProductionPreset) => {
    const cleanTitle = editPresetTitle.trim();
    if (!cleanTitle) return;
    const cleanSpecs = editPresetSpecs.trim();

    const targetNorm = normalizePreset(originalPreset);
    const updatedCategories = settings.categories.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          presets: c.presets.map(p => {
            const norm = normalizePreset(p);
            const isMatch = (targetNorm.id && norm.id && norm.id === targetNorm.id) || (!targetNorm.id && norm.title === targetNorm.title);
            if (isMatch) {
              return {
                id: norm.id || 'preset_' + Date.now(),
                title: cleanTitle,
                specs: cleanSpecs || undefined,
                count: cleanSpecs || undefined,
              };
            }
            return p;
          }),
        };
      }
      return c;
    });

    const updated: PostProductionSettingsData = {
      ...settings,
      categories: updatedCategories,
    };

    handleSave(updated);
    handleCancelEditPreset();
  };

  // ─────────────────────────────────────────────────────────────
  // WORKFLOW STATUSES HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleAddStatus = () => {
    const clean = newStatusName.trim();
    if (!clean) return;

    const newStatus: PostProductionStatusSetting = {
      id: 'st_' + Date.now(),
      name: clean,
      color: newStatusColor,
    };

    const updated: PostProductionSettingsData = {
      ...settings,
      statuses: [...settings.statuses, newStatus],
    };

    handleSave(updated);
    setNewStatusName('');
    setIsAddingStatus(false);
  };

  const handleDeleteStatus = (statusId: string) => {
    if (settings.statuses.length <= 1) {
      onShowToast('At least one status is required.');
      return;
    }

    const updated: PostProductionSettingsData = {
      ...settings,
      statuses: settings.statuses.filter(s => s.id !== statusId),
    };

    handleSave(updated);
  };

  const handleStartEditStatus = (status: PostProductionStatusSetting) => {
    setEditingStatusId(status.id);
    setEditStatusName(status.name);
    setEditStatusColor(status.color || '#6366f1');
  };

  const handleCancelEditStatus = () => {
    setEditingStatusId(null);
    setEditStatusName('');
    setEditStatusColor('');
  };

  const handleSaveEditStatus = (statusId: string) => {
    const clean = editStatusName.trim();
    if (!clean) return;

    const updatedStatuses = settings.statuses.map(s => {
      if (s.id === statusId) {
        return {
          ...s,
          name: clean,
          color: editStatusColor || s.color,
        };
      }
      return s;
    });

    const updated: PostProductionSettingsData = {
      ...settings,
      statuses: updatedStatuses,
    };

    handleSave(updated);
    handleCancelEditStatus();
  };

  const handleUpdateStatusColor = (statusId: string, color: string) => {
    const updatedStatuses = settings.statuses.map(s => {
      if (s.id === statusId) {
        return { ...s, color };
      }
      return s;
    });

    const updated: PostProductionSettingsData = {
      ...settings,
      statuses: updatedStatuses,
    };

    handleSave(updated);
  };

  const currentCategory = settings.categories.find(c => c.id === activeCategoryTab) || settings.categories[0];

  const getCategoryIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('photo')) return <Camera className="w-4 h-4 text-indigo-600" />;
    if (n.includes('video')) return <Video className="w-4 h-4 text-rose-600" />;
    if (n.includes('album')) return <BookOpen className="w-4 h-4 text-amber-600" />;
    return <Sparkles className="w-4 h-4 text-teal-600" />;
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-zinc-500 space-y-3 bg-white rounded-2xl border border-amber-200/90 shadow-xs">
        <RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#0F9D58]" />
        <p className="text-xs font-bold">Loading Post-Production settings...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-amber-200/90 rounded-2xl p-6 shadow-xs space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold border border-amber-200">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-amber-950">
              Post-Production Deliverables &amp; Workflow Statuses
            </h2>
            <p className="text-xs font-medium text-zinc-500 mt-0.5">
              Manage preset deliverables for Photos, Videos &amp; Albums, and customize studio workflow status stages.
            </p>
          </div>
        </div>

        {saving && (
          <div className="flex items-center gap-2 text-xs font-bold text-[#0F9D58] bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Saving changes...</span>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: CATEGORIES & PRESET DELIVERABLES
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-black text-amber-950 uppercase tracking-wider block">
              1. Deliverable Categories &amp; Pre-configured Templates
            </label>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select a category to customize the default deliverables that appear when adding deliverables on the Post-Production dashboard.
            </p>
          </div>

          {!isAddingCategory && (
            <button
              type="button"
              onClick={() => setIsAddingCategory(true)}
              className="px-3 py-1.5 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Category</span>
            </button>
          )}
        </div>

        {/* Add Category Input */}
        {isAddingCategory && (
          <div className="p-3.5 bg-[#FEFDF8] rounded-xl border border-amber-300 flex items-center gap-2 max-w-md shadow-xs">
            <input
              type="text"
              autoFocus
              placeholder="New Category Name (e.g. Reels & Social, Aerial / Drone)..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCategory();
                if (e.key === 'Escape') setIsAddingCategory(false);
              }}
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-amber-200 rounded-lg text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim()}
              className="px-3 py-1.5 text-xs font-bold bg-[#0F9D58] hover:bg-[#0B8043] disabled:opacity-50 text-white rounded-lg transition cursor-pointer"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAddingCategory(false)}
              className="text-xs text-zinc-500 hover:text-zinc-700 px-2"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {settings.categories.map((cat) => {
            const isActive = activeCategoryTab === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryTab(cat.id)}
                className={`px-4 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-2 cursor-pointer shadow-2xs ${
                  isActive
                    ? 'bg-amber-100/90 border-amber-400 text-amber-950 font-black'
                    : 'bg-white hover:bg-amber-50/60 border-amber-200/90 text-zinc-700'
                }`}
              >
                {getCategoryIcon(cat.name)}
                <span>{cat.name}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/80 border border-amber-200 text-zinc-600 font-extrabold">
                  {cat.presets.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Category Deliverables Card */}
        {currentCategory && (
          <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-amber-200/90 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
              <div className="flex items-center gap-2">
                {getCategoryIcon(currentCategory.name)}
                <span className="text-xs font-black text-amber-950">
                  {currentCategory.name} Deliverables ({currentCategory.presets.length} Presets)
                </span>
              </div>

              {!['cat_photos', 'cat_videos', 'cat_albums'].includes(currentCategory.id) && (
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(currentCategory.id)}
                  className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Category</span>
                </button>
              )}
            </div>

            {/* Presets Vertical List */}
            <div className="space-y-2">
              {currentCategory.presets.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-400 font-medium bg-white rounded-xl border border-dashed border-amber-200">
                  No deliverables added to this category yet. Add one below.
                </div>
              ) : (
                currentCategory.presets.map((preset, pIdx) => {
                  const norm = normalizePreset(preset);
                  const key = norm.id || `${norm.title}_${pIdx}`;
                  const isEditing = editingPresetKey === key;

                  if (isEditing) {
                    return (
                      <div 
                        key={key} 
                        className="p-3 bg-white rounded-xl border-2 border-amber-400 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                      >
                        <input
                          type="text"
                          autoFocus
                          value={editPresetTitle}
                          onChange={(e) => setEditPresetTitle(e.target.value)}
                          placeholder="Deliverable title"
                          className="flex-1 px-3 py-1.5 text-xs bg-[#FEFDF8] border border-amber-200 rounded-lg text-amber-950 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditPreset(currentCategory.id, preset);
                            if (e.key === 'Escape') handleCancelEditPreset();
                          }}
                        />
                        <input
                          type="text"
                          value={editPresetSpecs}
                          onChange={(e) => setEditPresetSpecs(e.target.value)}
                          placeholder="Space / Count (e.g. 500 Photos, 25 Mins)"
                          className="w-full sm:w-56 px-3 py-1.5 text-xs bg-[#FEFDF8] border border-amber-200 rounded-lg text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditPreset(currentCategory.id, preset);
                            if (e.key === 'Escape') handleCancelEditPreset();
                          }}
                        />
                        <div className="flex items-center gap-1.5 shrink-0 justify-end">
                          <button
                            type="button"
                            onClick={() => handleSaveEditPreset(currentCategory.id, preset)}
                            disabled={!editPresetTitle.trim()}
                            className="px-3 py-1.5 text-xs font-bold bg-[#0F9D58] hover:bg-[#0B8043] disabled:opacity-50 text-white rounded-lg transition flex items-center gap-1 cursor-pointer"
                            title="Save changes"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditPreset}
                            className="px-2.5 py-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={key}
                      className="p-3 bg-white rounded-xl border border-amber-200/90 hover:border-amber-400 transition-all flex items-center justify-between gap-3 shadow-2xs group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold shrink-0 border border-amber-200/60 text-[11px]">
                          {pIdx + 1}
                        </div>
                        <span className="text-xs font-black text-amber-950 truncate">
                          {norm.title}
                        </span>
                        {norm.specs ? (
                          <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold bg-amber-50 text-amber-900 border border-amber-200/90 shrink-0">
                            {norm.specs}
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400 italic shrink-0">
                            No space/count set
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditPreset(preset, pIdx)}
                          className="p-1.5 text-zinc-500 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                          title={`Edit "${norm.title}"`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePreset(currentCategory.id, preset)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title={`Delete "${norm.title}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Preset Input with Spacing & Specs / Count */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                placeholder={`Deliverable title (e.g. Edited Photos, 4K Master Film)...`}
                value={newPresetTitle}
                onChange={(e) => setNewPresetTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddPreset(currentCategory.id);
                }}
                className="flex-1 px-3.5 py-2 text-xs bg-white border border-amber-200 rounded-xl text-amber-950 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
              />
              <input
                type="text"
                placeholder="Specs / Count (e.g. 500 Photos, 25 Mins)"
                value={newPresetSpecs}
                onChange={(e) => setNewPresetSpecs(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddPreset(currentCategory.id);
                }}
                className="w-full sm:w-56 px-3.5 py-2 text-xs bg-white border border-amber-200 rounded-xl text-amber-950 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => handleAddPreset(currentCategory.id)}
                disabled={!newPresetTitle.trim()}
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Deliverable</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: WORKFLOW PIPELINE STATUSES
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4 pt-4 border-t border-amber-100">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-black text-amber-950 uppercase tracking-wider block">
              2. Custom Post-Production Workflow Statuses
            </label>
            <p className="text-xs text-zinc-500 mt-0.5">
              Customize the status options (e.g. Upcoming, Color Grading, Client Review, Done) that editors select on deliverables.
            </p>
          </div>

          {!isAddingStatus && (
            <button
              type="button"
              onClick={() => setIsAddingStatus(true)}
              className="px-3 py-1.5 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Status</span>
            </button>
          )}
        </div>

        {/* Add Status Form */}
        {isAddingStatus && (
          <div className="p-4 bg-[#FEFDF8] rounded-2xl border border-amber-300 space-y-3 shadow-sm max-w-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-950">Add New Status Stage</span>
              <button
                type="button"
                onClick={() => setIsAddingStatus(false)}
                className="text-xs text-zinc-500 hover:text-zinc-700 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                placeholder="Status Name (e.g. Color Grading, Rough Cut, Client Revisions)..."
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-amber-200 rounded-lg text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Color Picker */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Pick Status Color:</span>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setNewStatusColor(col)}
                    className={`w-6 h-6 rounded-full cursor-pointer transition flex items-center justify-center ${
                      newStatusColor === col ? 'ring-2 ring-amber-950 ring-offset-2 scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: col }}
                  >
                    {newStatusColor === col && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleAddStatus}
                disabled={!newStatusName.trim()}
                className="px-4 py-1.5 text-xs font-bold bg-[#0F9D58] hover:bg-[#0B8043] disabled:opacity-50 text-white rounded-lg shadow-xs cursor-pointer"
              >
                Save Status
              </button>
            </div>
          </div>
        )}

        {/* Existing Statuses List - Vertical Stack */}
        <div className="space-y-2">
          {settings.statuses.map((st, sIdx) => {
            const isEditing = editingStatusId === st.id;

            if (isEditing) {
              return (
                <div key={st.id} className="p-3.5 bg-white rounded-xl border-2 border-amber-400 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={editStatusName}
                      onChange={(e) => setEditStatusName(e.target.value)}
                      placeholder="Status Name"
                      className="flex-1 px-3 py-1.5 text-xs bg-[#FEFDF8] border border-amber-200 rounded-lg text-amber-950 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEditStatus(st.id);
                        if (e.key === 'Escape') handleCancelEditStatus();
                      }}
                    />
                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        type="button"
                        onClick={() => handleSaveEditStatus(st.id)}
                        disabled={!editStatusName.trim()}
                        className="px-3 py-1.5 text-xs font-bold bg-[#0F9D58] hover:bg-[#0B8043] disabled:opacity-50 text-white rounded-lg transition flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditStatus}
                        className="px-2.5 py-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  {/* Color Picker Swatches */}
                  <div className="flex items-center gap-2 pt-1 border-t border-amber-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Color:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {PRESET_COLORS.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setEditStatusColor(col)}
                          className={`w-5 h-5 rounded-full cursor-pointer transition flex items-center justify-center ${
                            editStatusColor === col ? 'ring-2 ring-amber-950 ring-offset-1 scale-110' : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: col }}
                        >
                          {editStatusColor === col && <Check className="w-3 h-3 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={st.id}
                className="p-3 bg-[#FAF8F5] rounded-xl border border-amber-200/90 hover:border-amber-400 transition-all flex items-center justify-between gap-3 shadow-2xs group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold shrink-0 border border-amber-200/60 text-[11px]">
                    {sIdx + 1}
                  </div>
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs ring-1 ring-black/10"
                    style={{ backgroundColor: st.color }}
                  />
                  <span className="text-xs font-black text-amber-950 truncate">
                    {st.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEditStatus(st)}
                    className="p-1.5 text-zinc-500 hover:text-amber-800 hover:bg-amber-100/60 rounded-lg transition cursor-pointer"
                    title={`Edit "${st.name}"`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteStatus(st.id)}
                    className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title={`Delete status "${st.name}"`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
