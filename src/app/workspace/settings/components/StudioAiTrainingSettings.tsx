'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, Bot, Plus, Trash2, Pencil, Check, Loader2, 
  HelpCircle, Zap, ShieldCheck, ArrowRight, Mic, CheckCircle2, X
} from 'lucide-react';
import { 
  WorkspaceQuotationSettings, 
  WorkspaceAiShortcut, 
  WorkspaceAiRules,
  WorkspaceCrewRole,
  DEFAULT_CREW_ROLES,
  fetchWorkspaceCrewRoles,
  saveAllWorkspaceQuotationSettings 
} from '@/lib/workspace-settings';

interface StudioAiTrainingSettingsProps {
  workspaceId: string;
  settings: WorkspaceQuotationSettings;
  onSettingsChange: (settings: WorkspaceQuotationSettings) => void;
  onShowToast: (message: string) => void;
}

const SHORTCUT_STANDARD_ROLES = [
  'Traditional Photographer',
  'Traditional Videographer',
  'Candid Photographer',
  'Cinematographer',
  'Drone Pilot',
  'Family Photographer',
  'Semi Cinematic',
  'Semi Standard',
  'Social Media Reels Creator',
  'Assistant',
];

export default function StudioAiTrainingSettings({
  workspaceId,
  settings,
  onSettingsChange,
  onShowToast
}: StudioAiTrainingSettingsProps) {
  const aiRules: WorkspaceAiRules = settings.aiRules || {
    customInstructions: '',
    shortcuts: []
  };

  const [instructions, setInstructions] = useState<string>(aiRules.customInstructions || '');
  const [shortcuts, setShortcuts] = useState<WorkspaceAiShortcut[]>(aiRules.shortcuts || []);
  const [workspaceCrewRoles, setWorkspaceCrewRoles] = useState<WorkspaceCrewRole[]>(DEFAULT_CREW_ROLES);
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [savingShortcuts, setSavingShortcuts] = useState(false);

  // Sync local editor state whenever settings load or change externally
  useEffect(() => {
    setInstructions(settings?.aiRules?.customInstructions || '');
    setShortcuts(Array.isArray(settings?.aiRules?.shortcuts) ? settings.aiRules!.shortcuts! : []);
  }, [settings?.aiRules]);

  // Fetch workspace crew roles (+ custom roles added in Team/Quotation Settings)
  useEffect(() => {
    let active = true;
    const loadRoles = () => {
      fetchWorkspaceCrewRoles(workspaceId)
        .then((roles) => {
          if (active && Array.isArray(roles) && roles.length > 0) {
            setWorkspaceCrewRoles(roles);
          }
        })
        .catch(() => {});
    };
    loadRoles();
    window.addEventListener('workspace_crew_roles_updated', loadRoles);
    return () => {
      active = false;
      window.removeEventListener('workspace_crew_roles_updated', loadRoles);
    };
  }, [workspaceId]);

  const availableCrewRoles = useMemo(() => {
    const map = new Map<string, string>();
    const addRole = (name: string) => {
      const clean = (name || '').trim();
      if (!clean) return;
      const lower = clean.toLowerCase();
      // Exclude non-shooting internal management roles unless already used in a shortcut
      if (lower === 'sales person' || lower === 'salesperson' || lower === 'team manager') return;
      if (!map.has(lower)) map.set(lower, clean);
    };
    for (const r of workspaceCrewRoles) addRole(r.name);
    for (const r of SHORTCUT_STANDARD_ROLES) addRole(r);
    for (const sc of shortcuts) {
      for (const mc of sc.mappedCrew || []) addRole(mc.name);
    }
    return Array.from(map.values());
  }, [workspaceCrewRoles, shortcuts]);

  // Modal / Form state for Add / Edit Shortcut
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [triggerInput, setTriggerInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [selectedDelivs, setSelectedDelivs] = useState<string[]>([]);
  const [crewQtyMap, setCrewQtyMap] = useState<Record<string, number>>({
    'Candid Photographer': 1,
    'Cinematographer': 1,
  });
  const [priceInput, setPriceInput] = useState('');

  // 1. Save Custom System Prompt Instructions
  const handleSaveInstructions = async () => {
    setSavingInstructions(true);
    try {
      const updatedAiRules: WorkspaceAiRules = {
        ...aiRules,
        customInstructions: instructions.trim(),
        shortcuts
      };
      const updatedSettings = await saveAllWorkspaceQuotationSettings(workspaceId, {
        aiRules: updatedAiRules
      });
      onSettingsChange(updatedSettings);
      onShowToast('✅ Studio AI Rules saved successfully!');
    } catch (err: any) {
      console.error('[AI Training] Failed to save instructions:', err);
      onShowToast('❌ Failed to save Studio AI rules');
    } finally {
      setSavingInstructions(false);
    }
  };

  // 2. Open Add/Edit Shortcut Modal
  const openAddModal = () => {
    setEditingId(null);
    setTriggerInput('');
    setDescInput('');
    setSelectedDelivs([]);
    setCrewQtyMap({
      'Candid Photographer': 1,
      'Cinematographer': 1,
    });
    setPriceInput('');
    setIsModalOpen(true);
  };

  const openEditModal = (sc: WorkspaceAiShortcut) => {
    setEditingId(sc.id);
    setTriggerInput(sc.trigger);
    setDescInput(sc.description || '');
    setSelectedDelivs(sc.mappedDeliverables || []);

    const nextMap: Record<string, number> = {};
    for (const item of sc.mappedCrew || []) {
      const matched = availableCrewRoles.find((r) => r.toLowerCase() === item.name.trim().toLowerCase()) || item.name.trim();
      if ((Number(item.qty) || 0) > 0) {
        nextMap[matched] = Number(item.qty);
      }
    }
    setCrewQtyMap(nextMap);

    setPriceInput(sc.mappedPrice ? String(sc.mappedPrice) : '');
    setIsModalOpen(true);
  };

  // 3. Save Single Shortcut
  const handleSaveShortcut = async () => {
    const cleanTrigger = triggerInput.trim().toLowerCase();
    if (!cleanTrigger) {
      alert('Please enter a voice trigger phrase (e.g. "all droppers")');
      return;
    }

    setSavingShortcuts(true);
    try {
      const mappedCrew: Array<{ name: string; qty: number }> = [];
      for (const roleName of availableCrewRoles) {
        const q = Number(crewQtyMap[roleName] || 0);
        if (q > 0) mappedCrew.push({ name: roleName, qty: q });
      }
      for (const [k, q] of Object.entries(crewQtyMap)) {
        if ((q || 0) > 0 && !mappedCrew.some((m) => m.name.toLowerCase() === k.toLowerCase())) {
          mappedCrew.push({ name: k, qty: Number(q) });
        }
      }

      const newShortcut: WorkspaceAiShortcut = {
        id: editingId || `sc_${Date.now()}`,
        trigger: cleanTrigger,
        description: descInput.trim() || undefined,
        mappedDeliverables: selectedDelivs.length > 0 ? selectedDelivs : undefined,
        mappedCrew: mappedCrew.length > 0 ? mappedCrew : undefined,
        mappedPrice: priceInput ? Number(priceInput) : undefined
      };

      let updatedList: WorkspaceAiShortcut[] = [];
      if (editingId) {
        updatedList = shortcuts.map(s => s.id === editingId ? newShortcut : s);
      } else {
        updatedList = [...shortcuts, newShortcut];
      }

      setShortcuts(updatedList);
      setIsModalOpen(false);

      const updatedAiRules: WorkspaceAiRules = {
        ...aiRules,
        customInstructions: instructions.trim(),
        shortcuts: updatedList
      };

      const updatedSettings = await saveAllWorkspaceQuotationSettings(workspaceId, {
        aiRules: updatedAiRules
      });
      onSettingsChange(updatedSettings);
      onShowToast(`✅ Shortcut "${cleanTrigger}" saved!`);
    } catch (err: any) {
      console.error('[AI Training] Failed to save shortcut:', err);
      onShowToast('❌ Failed to save shortcut');
    } finally {
      setSavingShortcuts(false);
    }
  };

  // 4. Delete Shortcut
  const handleDeleteShortcut = async (id: string, triggerName: string) => {
    if (!confirm(`Delete trigger shortcut "${triggerName}"?`)) return;
    try {
      const updatedList = shortcuts.filter(s => s.id !== id);
      setShortcuts(updatedList);
      const updatedAiRules: WorkspaceAiRules = {
        ...aiRules,
        customInstructions: instructions.trim(),
        shortcuts: updatedList
      };
      const updatedSettings = await saveAllWorkspaceQuotationSettings(workspaceId, {
        aiRules: updatedAiRules
      });
      onSettingsChange(updatedSettings);
      onShowToast(`🗑️ Shortcut deleted`);
    } catch (err: any) {
      console.error('[AI Training] Failed to delete shortcut:', err);
      onShowToast('❌ Failed to delete shortcut');
    }
  };

  // Toggle deliverable in modal
  const toggleDeliv = (title: string) => {
    if (selectedDelivs.includes(title)) {
      setSelectedDelivs(selectedDelivs.filter(t => t !== title));
    } else {
      setSelectedDelivs([...selectedDelivs, title]);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">
            <Bot className="w-4 h-4" />
            <span>Studio AI Quotation Assistant</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Train Your Studio AI Model</h2>
          <p className="text-sm font-medium text-amber-50 leading-relaxed">
            Configure custom voice trigger phrases, default package items, and studio-specific rules. 
            When you dictate or write requirements in Quotation Creator, the AI automatically applies your studio&apos;s custom rules with 100% precision.
          </p>
        </div>
        <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* 2. Custom Studio AI Prompt Rules */}
      <div className="bg-white border border-amber-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-amber-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-950">Studio AI Custom Instructions (Custom Rules)</h3>
              <p className="text-xs text-zinc-500">Guidelines, standard ceremony timings, and studio policies for the AI</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveInstructions}
            disabled={savingInstructions}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {savingInstructions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>Save Rules</span>
          </button>
        </div>

        <p className="text-xs text-zinc-600">
          Write instructions in plain English, Hindi, or Hinglish. These instructions are injected directly into Gemini 3.8 Flash whenever you generate a quotation.
        </p>

        <textarea
          rows={4}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder={`उदा.: \n1. हमारी हल्दी हमेशा सुबह 10:00 AM से 02:00 PM होती है।\n2. जब भी क्लाइंट डेस्टिनेशन वेडिंग बोले, ट्रैवल चार्ज ₹15,000 जोड़ो।\n3. हम अन-एडिटेड रॉ वीडियो क्लाइंट हार्ड ड्राइव में ही देते हैं।\n4. हमारा मिनिमम वेडिंग पैकेज ₹85,000 है।`}
          className="w-full p-3.5 text-xs font-mono text-zinc-800 bg-amber-50/40 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all leading-relaxed"
        />

        <div className="flex items-center gap-2 p-3 bg-amber-50/80 rounded-xl text-[11px] text-amber-900 border border-amber-200/50">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Pro Tip:</strong> When you speak into the mic, Gemini prioritizes these instructions above default settings.
          </span>
        </div>
      </div>

      {/* 3. Voice & Text Trigger Shortcuts */}
      <div className="bg-white border border-amber-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-800 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-950">Voice & Text Shorthand Triggers (&quot;When I Say X $\rightarrow$ Do Y&quot;)</h3>
              <p className="text-xs text-zinc-500">Saying or writing these trigger phrases will instantly expand them into your custom deliverables & crew</p>
            </div>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Trigger</span>
          </button>
        </div>

        {/* Shortcuts List */}
        {shortcuts.length === 0 ? (
          <div className="p-8 text-center bg-amber-50/30 border border-dashed border-amber-200 rounded-xl space-y-2">
            <Bot className="w-8 h-8 text-amber-400 mx-auto" />
            <p className="text-xs font-bold text-zinc-600">No Custom Shorthand Triggers Yet</p>
            <p className="text-[11px] text-zinc-400">Click &quot;Add New Trigger&quot; to create shortcuts like &quot;all droppers&quot; or &quot;standard crew&quot;.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shortcuts.map((sc) => (
              <div 
                key={sc.id}
                className="p-4 bg-amber-50/40 border border-amber-200 rounded-xl space-y-3 relative group hover:border-amber-400 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-200/80 text-amber-950 text-xs font-black rounded-lg uppercase tracking-wide">
                      <Mic className="w-3 h-3 text-amber-700" />
                      <span>&quot;{sc.trigger}&quot;</span>
                    </div>
                    {sc.description && (
                      <p className="text-[11px] text-zinc-500 mt-1">{sc.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(sc)}
                      className="p-1.5 text-zinc-500 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition-all"
                      title="Edit Shortcut"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteShortcut(sc.id, sc.trigger)}
                      className="p-1.5 text-zinc-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete Shortcut"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Mapped Crew */}
                {sc.mappedCrew && sc.mappedCrew.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Crew Requirements:</span>
                    <div className="flex flex-wrap gap-1">
                      {sc.mappedCrew.map((c, i) => (
                        <span key={i} className="px-2 py-0.5 bg-white border border-amber-200 text-amber-900 text-[10px] rounded-md font-semibold">
                          {c.qty}x {c.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mapped Deliverables */}
                {sc.mappedDeliverables && sc.mappedDeliverables.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Deliverables ({sc.mappedDeliverables.length}):</span>
                    <ul className="text-[11px] text-zinc-700 space-y-0.5 list-disc list-inside">
                      {sc.mappedDeliverables.slice(0, 4).map((d, i) => (
                        <li key={i} className="truncate">{d}</li>
                      ))}
                      {sc.mappedDeliverables.length > 4 && (
                        <li className="text-zinc-400 list-none text-[10px] italic">
                          +{sc.mappedDeliverables.length - 4} more deliverables...
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Mapped Price */}
                {sc.mappedPrice && (
                  <div className="pt-2 border-t border-amber-100/80 flex items-center justify-between text-xs font-bold text-amber-900">
                    <span>Default Package Price:</span>
                    <span>₹{sc.mappedPrice.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Add / Edit Shortcut Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 border border-amber-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-amber-100 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-extrabold text-amber-950">
                  {editingId ? 'Edit Trigger Shortcut' : 'Create Voice / Text Shortcut'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Trigger Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700">
                Trigger Phrase / Spoken Word <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={triggerInput}
                onChange={(e) => setTriggerInput(e.target.value)}
                placeholder="e.g. all droppers, full package, standard crew, royal wedding"
                className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <p className="text-[10px] text-zinc-400">Whenever this word is spoken in the mic or written in notes, AI will automatically expand it.</p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700">Description (Optional)</label>
              <input
                type="text"
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                placeholder="e.g. 4-person crew with full teaser, highlight & album"
                className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Crew Selection (Supports Traditional Photographer & All Studio Roles) */}
            <div className="space-y-2 pt-2 border-t border-zinc-100">
              <label className="text-xs font-bold text-zinc-700">Map Crew Requirements (Qty across all Studio Roles):</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs max-h-52 overflow-y-auto pr-1">
                {availableCrewRoles.map((roleName) => (
                  <div
                    key={roleName}
                    className={`p-2.5 border rounded-xl space-y-1 transition-all ${
                      (crewQtyMap[roleName] || 0) > 0
                        ? 'bg-amber-100/70 border-amber-400'
                        : 'bg-amber-50/40 border-amber-200/80'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-amber-950 block truncate" title={roleName}>
                      {roleName}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={crewQtyMap[roleName] ?? 0}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0));
                        setCrewQtyMap((prev) => ({ ...prev, [roleName]: val }));
                      }}
                      className="w-full px-2 py-1 text-xs border border-amber-300 rounded-lg text-center font-bold bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Deliverables Selection */}
            <div className="space-y-2 pt-2 border-t border-zinc-100">
              <label className="text-xs font-bold text-zinc-700">Map Studio Deliverables ({selectedDelivs.length} selected):</label>
              <div className="max-h-40 overflow-y-auto border border-zinc-200 rounded-xl p-2 space-y-1">
                {(settings.deliverables || []).map((d) => {
                  const checked = selectedDelivs.includes(d.title);
                  return (
                    <div
                      key={d.id}
                      onClick={() => toggleDeliv(d.title)}
                      className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer text-xs transition-all ${
                        checked ? 'bg-amber-100 text-amber-950 font-bold' : 'hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                        checked ? 'bg-amber-600 border-amber-600 text-white' : 'border-zinc-300 bg-white'
                      }`}>
                        {checked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="truncate">{d.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Optional Price */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-100">
              <label className="text-xs font-bold text-zinc-700">Default Price (₹ Optional)</label>
              <input
                type="number"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="e.g. 150000"
                className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-amber-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveShortcut}
                disabled={savingShortcuts}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                {savingShortcuts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Shortcut</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
