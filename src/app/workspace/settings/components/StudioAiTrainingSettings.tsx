'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Bot,
  Plus,
  Trash2,
  Pencil,
  Check,
  Loader2,
  HelpCircle,
  Zap,
  Mic,
  X,
  Users,
  PackageCheck,
  IndianRupee,
  Gift,
  Search,
  Minus,
  ChevronRight,
  Layers,
} from 'lucide-react';
import {
  WorkspaceQuotationSettings,
  WorkspaceAiShortcut,
  WorkspaceAiRules,
  WorkspaceCrewRole,
  DEFAULT_CREW_ROLES,
  fetchWorkspaceCrewRoles,
  saveAllWorkspaceQuotationSettings,
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
  onShowToast,
}: StudioAiTrainingSettingsProps) {
  const aiRules: WorkspaceAiRules = settings.aiRules || {
    customInstructions: '',
    shortcuts: [],
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

  // Normalize settings deliverables & specialAddons safely
  const deliverableOptions = useMemo(() => {
    const rawList = Array.isArray(settings?.deliverables) ? settings.deliverables : [];
    return rawList
      .map((item: any, idx: number) =>
        typeof item === 'string'
          ? { id: `deliv_${idx}`, title: item.trim() }
          : { id: item?.id || `deliv_${idx}`, title: String(item?.title || '').trim(), category: item?.category }
      )
      .filter((item) => item.title.length > 0);
  }, [settings?.deliverables]);

  const specialAddonOptions = useMemo(() => {
    const rawList = Array.isArray(settings?.specialAddons) ? settings.specialAddons : [];
    return rawList
      .map((item: any, idx: number) =>
        typeof item === 'string'
          ? { id: `sp_${idx}`, title: item.trim() }
          : { id: item?.id || `sp_${idx}`, title: String(item?.title || '').trim(), category: item?.category }
      )
      .filter((item) => item.title.length > 0);
  }, [settings?.specialAddons]);

  // Apple Shortcuts Style Action Stack Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [triggerInput, setTriggerInput] = useState('');
  const [descInput, setDescInput] = useState('');

  // Modular Action Block Toggles (combine any 1, 2, 3, or all 4 actions in one trigger)
  const [enableCrewAction, setEnableCrewAction] = useState(true);
  const [enableDelivsAction, setEnableDelivsAction] = useState(false);
  const [enablePriceAction, setEnablePriceAction] = useState(false);
  const [enableSpecialAddonsAction, setEnableSpecialAddonsAction] = useState(false);

  const [crewQtyMap, setCrewQtyMap] = useState<Record<string, number>>({});
  const [selectedDelivs, setSelectedDelivs] = useState<string[]>([]);
  const [delivSearch, setDelivSearch] = useState('');
  const [customDelivInput, setCustomDelivInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [selectedSpecialAddons, setSelectedSpecialAddons] = useState<string[]>([]);
  const [customSpecialAddonInput, setCustomSpecialAddonInput] = useState('');

  // Filtered deliverables list in modal + any custom items attached to this shortcut
  const modalDeliverableList = useMemo(() => {
    const combined = [...deliverableOptions];
    for (const sel of selectedDelivs) {
      if (!combined.some((d) => d.title.toLowerCase() === sel.toLowerCase())) {
        combined.push({ id: `custom_${sel}`, title: sel, category: 'Custom' });
      }
    }
    const q = delivSearch.trim().toLowerCase();
    if (!q) return combined;
    return combined.filter((d) => d.title.toLowerCase().includes(q));
  }, [deliverableOptions, selectedDelivs, delivSearch]);

  const modalSpecialAddonList = useMemo(() => {
    const combined = [...specialAddonOptions];
    for (const sel of selectedSpecialAddons) {
      if (!combined.some((s) => s.title.toLowerCase() === sel.toLowerCase())) {
        combined.push({ id: `custom_sp_${sel}`, title: sel, category: 'Custom' });
      }
    }
    return combined;
  }, [specialAddonOptions, selectedSpecialAddons]);

  // 1. Save Custom System Prompt Instructions
  const handleSaveInstructions = async () => {
    setSavingInstructions(true);
    try {
      const updatedAiRules: WorkspaceAiRules = {
        ...aiRules,
        customInstructions: instructions.trim(),
        shortcuts,
      };
      const updatedSettings = await saveAllWorkspaceQuotationSettings(workspaceId, {
        aiRules: updatedAiRules,
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

  // 2. Open Add / Edit Shortcut Modal
  const openAddModal = () => {
    setEditingId(null);
    setTriggerInput('');
    setDescInput('');
    setEnableCrewAction(true);
    setEnableDelivsAction(false);
    setEnablePriceAction(false);
    setEnableSpecialAddonsAction(false);
    setCrewQtyMap({});
    setSelectedDelivs([]);
    setDelivSearch('');
    setCustomDelivInput('');
    setPriceInput('');
    setSelectedSpecialAddons([]);
    setCustomSpecialAddonInput('');
    setIsModalOpen(true);
  };

  const openEditModal = (sc: WorkspaceAiShortcut) => {
    setEditingId(sc.id);
    setTriggerInput(sc.trigger);
    setDescInput(sc.description || '');

    const nextCrewMap: Record<string, number> = {};
    for (const item of sc.mappedCrew || []) {
      const matched =
        availableCrewRoles.find((r) => r.toLowerCase() === item.name.trim().toLowerCase()) ||
        item.name.trim();
      if ((Number(item.qty) || 0) > 0) {
        nextCrewMap[matched] = Number(item.qty);
      }
    }

    const delivs = Array.isArray(sc.mappedDeliverables) ? sc.mappedDeliverables.filter(Boolean) : [];
    const specials = Array.isArray(sc.mappedSpecialAddons) ? sc.mappedSpecialAddons.filter(Boolean) : [];
    const hasPrice = Boolean(sc.mappedPrice && Number(sc.mappedPrice) > 0);
    const hasCrew = Object.keys(nextCrewMap).length > 0;

    setCrewQtyMap(nextCrewMap);
    setSelectedDelivs(delivs);
    setDelivSearch('');
    setCustomDelivInput('');
    setPriceInput(hasPrice ? String(sc.mappedPrice) : '');
    setSelectedSpecialAddons(specials);
    setCustomSpecialAddonInput('');

    setEnableCrewAction(hasCrew || (!delivs.length && !hasPrice && !specials.length));
    setEnableDelivsAction(delivs.length > 0);
    setEnablePriceAction(hasPrice);
    setEnableSpecialAddonsAction(specials.length > 0);
    setIsModalOpen(true);
  };

  // 3. Save Single Shortcut
  const handleSaveShortcut = async () => {
    const cleanTrigger = triggerInput.trim().toLowerCase();
    if (!cleanTrigger) {
      onShowToast('Please enter a voice trigger phrase (e.g. "standard crew")');
      return;
    }

    const mappedCrew: Array<{ name: string; qty: number }> = [];
    if (enableCrewAction) {
      for (const roleName of availableCrewRoles) {
        const q = Number(crewQtyMap[roleName] || 0);
        if (q > 0) mappedCrew.push({ name: roleName, qty: q });
      }
      for (const [k, q] of Object.entries(crewQtyMap)) {
        if ((q || 0) > 0 && !mappedCrew.some((m) => m.name.toLowerCase() === k.toLowerCase())) {
          mappedCrew.push({ name: k, qty: Number(q) });
        }
      }
    }

    const finalDeliverables = enableDelivsAction ? selectedDelivs.map((d) => d.trim()).filter(Boolean) : [];
    const numericPrice = enablePriceAction && priceInput ? Number(priceInput) : undefined;
    const finalPrice = numericPrice && Number.isFinite(numericPrice) && numericPrice > 0 ? numericPrice : undefined;
    const finalSpecials = enableSpecialAddonsAction
      ? selectedSpecialAddons.map((s) => s.trim()).filter(Boolean)
      : [];

    if (
      mappedCrew.length === 0 &&
      finalDeliverables.length === 0 &&
      !finalPrice &&
      finalSpecials.length === 0
    ) {
      onShowToast('Add at least one action (Crew, Deliverables, Price, or Special Add-ons) before saving.');
      return;
    }

    setSavingShortcuts(true);
    try {
      const newShortcut: WorkspaceAiShortcut = {
        id: editingId || `sc_${Date.now()}`,
        trigger: cleanTrigger,
        description: descInput.trim() || undefined,
        mappedCrew: mappedCrew.length > 0 ? mappedCrew : undefined,
        mappedDeliverables: finalDeliverables.length > 0 ? finalDeliverables : undefined,
        mappedPrice: finalPrice,
        mappedSpecialAddons: finalSpecials.length > 0 ? finalSpecials : undefined,
      };

      const updatedList = editingId
        ? shortcuts.map((s) => (s.id === editingId ? newShortcut : s))
        : [...shortcuts, newShortcut];

      setShortcuts(updatedList);
      setIsModalOpen(false);

      const updatedAiRules: WorkspaceAiRules = {
        ...aiRules,
        customInstructions: instructions.trim(),
        shortcuts: updatedList,
      };

      const updatedSettings = await saveAllWorkspaceQuotationSettings(workspaceId, {
        aiRules: updatedAiRules,
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
      const updatedList = shortcuts.filter((s) => s.id !== id);
      setShortcuts(updatedList);
      const updatedAiRules: WorkspaceAiRules = {
        ...aiRules,
        customInstructions: instructions.trim(),
        shortcuts: updatedList,
      };
      const updatedSettings = await saveAllWorkspaceQuotationSettings(workspaceId, {
        aiRules: updatedAiRules,
      });
      onSettingsChange(updatedSettings);
      onShowToast(`🗑️ Shortcut "${triggerName}" deleted`);
    } catch (err: any) {
      console.error('[AI Training] Failed to delete shortcut:', err);
      onShowToast('❌ Failed to delete shortcut');
    }
  };

  const toggleDeliv = (title: string) => {
    if (selectedDelivs.some((d) => d.toLowerCase() === title.toLowerCase())) {
      setSelectedDelivs(selectedDelivs.filter((t) => t.toLowerCase() !== title.toLowerCase()));
    } else {
      setSelectedDelivs([...selectedDelivs, title]);
    }
  };

  const handleAddCustomDeliv = () => {
    const clean = customDelivInput.trim();
    if (!clean) return;
    if (!selectedDelivs.some((d) => d.toLowerCase() === clean.toLowerCase())) {
      setSelectedDelivs([...selectedDelivs, clean]);
    }
    setCustomDelivInput('');
  };

  const toggleSpecialAddon = (title: string) => {
    if (selectedSpecialAddons.some((s) => s.toLowerCase() === title.toLowerCase())) {
      setSelectedSpecialAddons(selectedSpecialAddons.filter((s) => s.toLowerCase() !== title.toLowerCase()));
    } else {
      setSelectedSpecialAddons([...selectedSpecialAddons, title]);
    }
  };

  const handleAddCustomSpecialAddon = () => {
    const clean = customSpecialAddonInput.trim();
    if (!clean) return;
    if (!selectedSpecialAddons.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      setSelectedSpecialAddons([...selectedSpecialAddons, clean]);
    }
    setCustomSpecialAddonInput('');
  };

  const adjustCrewQty = (roleName: string, delta: number) => {
    setCrewQtyMap((prev) => {
      const next = Math.max(0, Math.min(10, (prev[roleName] || 0) + delta));
      return { ...prev, [roleName]: next };
    });
  };

  const activeCrewCount = Object.values(crewQtyMap).filter((v) => (v || 0) > 0).length;
  const activeActionCount = [
    enableCrewAction && activeCrewCount > 0,
    enableDelivsAction && selectedDelivs.length > 0,
    enablePriceAction && Number(priceInput) > 0,
    enableSpecialAddonsAction && selectedSpecialAddons.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="space-y-8">
      {/* 1. Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">
            <Bot className="w-4 h-4" />
            <span>Studio AI Quotation Assistant · Google Gemini</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Train Your Studio AI Model</h2>
          <p className="text-sm font-medium text-amber-50 leading-relaxed">
            Set global studio instructions and Apple Shortcuts-style voice/text automation triggers.
            Whenever you speak in the mic or type notes in Create with AI, Google Gemini applies these rules automatically.
          </p>
        </div>
        <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* 1B. Hinglish Quick Guide: Custom Instructions vs Apple Shortcuts Triggers */}
      <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-amber-950">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <h3 className="text-sm font-extrabold">
            AI Training Kaise Kaam Karta Hai? (Simple Hinglish Guide)
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-white border border-amber-200/80 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>1. Custom Instructions (Hamesha Lagu Hone Wale Rules)</span>
            </div>
            <p className="text-zinc-600 leading-relaxed">
              Ye aapke studio ki <strong>permanent policy</strong> hai jo <strong>har quotation</strong> par automatically apply hoti hai — chahe aap kuch alag bolein ya nahi (jaise: <em>&ldquo;Haldi hamesha subah 10 se 2 hoti hai&rdquo;</em> ya <em>&ldquo;Minimum wedding package ₹85,000 hai&rdquo;</em>).
            </p>
          </div>
          <div className="bg-white border border-orange-200/80 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <Zap className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span>2. Voice & Text Shorthand Triggers (When I Say X → Do Y)</span>
            </div>
            <p className="text-zinc-600 leading-relaxed">
              Ye <strong>on-demand shortcuts</strong> hain (Apple Shortcuts ki tarah). Jab aap mic mein koi codeword bolein (jaise <em>&ldquo;standard crew&rdquo;</em> ya <em>&ldquo;gold combo&rdquo;</em>), tabhi uske andar ke <strong>1 ya ek saath multiple / sabhi 4 actions</strong> (Crew + Deliverables + Price + Special Value Add-ons) ek saath apply ho jaate hain!
            </p>
          </div>
        </div>
      </div>

      {/* 2. Custom Studio AI Prompt Rules */}
      <div className="bg-white border border-amber-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-amber-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-950">
                Studio AI Custom Instructions (Custom Rules)
              </h3>
              <p className="text-xs text-zinc-500">
                Global guidelines, standard ceremony timings, and studio policies applied to every quotation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveInstructions}
            disabled={savingInstructions}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {savingInstructions ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Save Rules</span>
          </button>
        </div>

        <p className="text-xs text-zinc-600">
          Write instructions in plain English, Hindi, or Hinglish. These instructions are injected directly into Google Gemini whenever you generate a quotation.
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
            <strong>Pro Tip:</strong> When you speak into the mic, Google Gemini prioritizes these instructions above template defaults.
          </span>
        </div>
      </div>

      {/* 3. Apple Shortcuts-Style Voice & Text Trigger Shortcuts */}
      <div className="bg-white border border-amber-200/90 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-amber-950">
                  Voice & Text Shorthand Triggers
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-zinc-900 text-amber-300">
                  When I Say X → Do Y
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Build modular Apple Shortcuts-style triggers: stack 1 or combine Crew + Deliverables + Price + Special Value Add-ons in a single phrase.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Trigger</span>
          </button>
        </div>

        {/* Shortcuts List */}
        {shortcuts.length === 0 ? (
          <div className="p-8 text-center bg-zinc-50/80 border border-dashed border-zinc-200 rounded-2xl space-y-2.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-zinc-700">No Voice/Text Shortcuts Created Yet</p>
            <p className="text-[11px] text-zinc-500 max-w-md mx-auto">
              Click <strong>&ldquo;+ Add Trigger&rdquo;</strong> to build a shortcut like <em>&ldquo;standard crew&rdquo;</em> or <em>&ldquo;royal package&rdquo;</em> and stack up to 4 actions underneath it.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shortcuts.map((sc) => {
              const stepCount = [
                sc.mappedCrew && sc.mappedCrew.length > 0,
                sc.mappedDeliverables && sc.mappedDeliverables.length > 0,
                Boolean(sc.mappedPrice && sc.mappedPrice > 0),
                sc.mappedSpecialAddons && sc.mappedSpecialAddons.length > 0,
              ].filter(Boolean).length;

              return (
                <div
                  key={sc.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50/60 overflow-hidden shadow-xs hover:border-amber-400 transition-all flex flex-col"
                >
                  {/* Top WHEN Bar */}
                  <div className="bg-zinc-900 text-white px-4 py-3 flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                          WHEN I SAY
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 text-white text-xs font-bold rounded-lg">
                          <Mic className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate">&ldquo;{sc.trigger}&rdquo;</span>
                        </span>
                        <span className="text-[10px] text-zinc-400 font-semibold">
                          · {stepCount} {stepCount === 1 ? 'Action' : 'Actions'}
                        </span>
                      </div>
                      {sc.description && (
                        <p className="text-[11px] text-zinc-300 truncate">{sc.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(sc)}
                        className="p-1.5 text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        title="Edit Shortcut"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteShortcut(sc.id, sc.trigger)}
                        className="p-1.5 text-zinc-300 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all"
                        title="Delete Shortcut"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Stacked DO Action Cards */}
                  <div className="p-3.5 space-y-2.5 flex-1">
                    {sc.mappedCrew && sc.mappedCrew.length > 0 && (
                      <div className="rounded-xl bg-white border border-indigo-200/80 p-2.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">
                          <Users className="w-3.5 h-3.5" />
                          <span>DO: Assign Crew</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {sc.mappedCrew.map((c, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-indigo-50 border border-indigo-200/80 text-indigo-950 text-[10px] rounded-md font-semibold"
                            >
                              {c.qty}x {c.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {sc.mappedDeliverables && sc.mappedDeliverables.length > 0 && (
                      <div className="rounded-xl bg-white border border-emerald-200/80 p-2.5 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>DO: Include Deliverables ({sc.mappedDeliverables.length})</span>
                        </div>
                        <ul className="text-[11px] text-zinc-700 space-y-0.5 list-disc list-inside">
                          {sc.mappedDeliverables.slice(0, 3).map((d, i) => (
                            <li key={i} className="truncate">
                              {d}
                            </li>
                          ))}
                          {sc.mappedDeliverables.length > 3 && (
                            <li className="text-zinc-400 list-none text-[10px] italic">
                              +{sc.mappedDeliverables.length - 3} more deliverables...
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {sc.mappedPrice && sc.mappedPrice > 0 && (
                      <div className="rounded-xl bg-white border border-violet-200/80 px-3 py-2 flex items-center justify-between text-xs font-bold text-violet-950">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-violet-700">
                          <IndianRupee className="w-3.5 h-3.5" />
                          <span>DO: Set Package Price</span>
                        </span>
                        <span className="text-sm font-black">
                          ₹{Number(sc.mappedPrice).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    {sc.mappedSpecialAddons && sc.mappedSpecialAddons.length > 0 && (
                      <div className="rounded-xl bg-white border border-rose-200/80 p-2.5 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-700">
                          <Gift className="w-3.5 h-3.5" />
                          <span>DO: Special Value Add-ons ({sc.mappedSpecialAddons.length})</span>
                        </div>
                        <ul className="text-[11px] text-rose-950 space-y-0.5 list-disc list-inside">
                          {sc.mappedSpecialAddons.slice(0, 3).map((s, i) => (
                            <li key={i} className="truncate">
                              {s}
                            </li>
                          ))}
                          {sc.mappedSpecialAddons.length > 3 && (
                            <li className="text-zinc-400 list-none text-[10px] italic">
                              +{sc.mappedSpecialAddons.length - 3} more freebies...
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Apple Shortcuts-Style Action Stack Builder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-50 rounded-2xl max-w-2xl w-full shadow-2xl border border-zinc-200 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Top Header */}
            <div className="bg-white px-6 py-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-zinc-900 text-amber-400 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-900">
                    {editingId ? 'Edit Voice & Text Shortcut' : 'Build Voice & Text Shortcut'}
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Stack any 1 or combine all 4 automated actions inside a single trigger phrase
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Workflow Canvas */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* WHEN Card */}
              <div className="rounded-2xl bg-zinc-900 text-white p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                    <Mic className="w-3.5 h-3.5" />
                    <span>WHEN I SAY OR TYPE IN NOTES</span>
                  </span>
                  <span className="text-[10px] text-zinc-400">Trigger Phrase *</span>
                </div>
                <input
                  type="text"
                  value={triggerInput}
                  onChange={(e) => setTriggerInput(e.target.value)}
                  placeholder='e.g. "standard crew", "gold package", "all deliverables"'
                  className="w-full px-3.5 py-2.5 text-sm font-bold text-white bg-zinc-800 border border-zinc-700 rounded-xl placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <input
                  type="text"
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder="Optional description (e.g. Standard wedding combo with highlight + luxury album)"
                  className="w-full px-3 py-2 text-xs text-zinc-200 bg-zinc-800/60 border border-zinc-700/80 rounded-xl placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              {/* Action Stack Toggle Bar (+ Add Action Chips) */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                    THEN DO THESE ACTIONS ({activeActionCount} active)
                  </span>
                  <span className="text-[10px] text-zinc-400">Click chips to add / remove blocks</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEnableCrewAction((v) => !v)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      enableCrewAction
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:border-indigo-300'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>{enableCrewAction ? '✓ Assign Crew' : '+ Assign Crew'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnableDelivsAction((v) => !v)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      enableDelivsAction
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:border-emerald-300'
                    }`}
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>{enableDelivsAction ? '✓ Include Deliverables' : '+ Include Deliverables'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnablePriceAction((v) => !v)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      enablePriceAction
                        ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:border-violet-300'
                    }`}
                  >
                    <IndianRupee className="w-3.5 h-3.5" />
                    <span>{enablePriceAction ? '✓ Set Package Price' : '+ Set Package Price'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnableSpecialAddonsAction((v) => !v)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      enableSpecialAddonsAction
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:border-rose-300'
                    }`}
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>{enableSpecialAddonsAction ? '✓ Special Value Add-ons' : '+ Special Value Add-ons'}</span>
                  </button>
                </div>
              </div>

              {/* Action Block 1: Assign Crew */}
              {enableCrewAction && (
                <div className="bg-white border border-indigo-200 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-extrabold text-indigo-950">Action: Assign Crew</span>
                        <span className="ml-2 text-[10px] font-bold text-indigo-600">
                          ({activeCrewCount} roles selected)
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEnableCrewAction(false)}
                      className="text-[11px] font-semibold text-zinc-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {availableCrewRoles.map((roleName) => {
                      const qty = crewQtyMap[roleName] || 0;
                      return (
                        <div
                          key={roleName}
                          className={`px-3 py-2 border rounded-xl flex items-center justify-between gap-2 transition-all ${
                            qty > 0
                              ? 'bg-indigo-50/90 border-indigo-400'
                              : 'bg-zinc-50/70 border-zinc-200/90'
                          }`}
                        >
                          <span
                            className="text-xs font-semibold text-zinc-800 truncate"
                            title={roleName}
                          >
                            {roleName}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => adjustCrewQty(roleName, -1)}
                              className="w-6 h-6 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 flex items-center justify-center text-zinc-600"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={10}
                              value={qty}
                              onChange={(e) => {
                                const val = Math.max(
                                  0,
                                  Math.min(10, parseInt(e.target.value, 10) || 0)
                                );
                                setCrewQtyMap((prev) => ({ ...prev, [roleName]: val }));
                              }}
                              className="w-9 text-center text-xs font-bold border border-zinc-300 rounded-lg py-0.5 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => adjustCrewQty(roleName, 1)}
                              className="w-6 h-6 rounded-lg border border-indigo-300 bg-white hover:bg-indigo-50 flex items-center justify-center text-indigo-700"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Block 2: Include Deliverables */}
              {enableDelivsAction && (
                <div className="bg-white border border-emerald-200 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <PackageCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-extrabold text-emerald-950">
                          Action: Include Deliverables
                        </span>
                        <span className="ml-2 text-[10px] font-bold text-emerald-600">
                          ({selectedDelivs.length} selected)
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEnableDelivsAction(false)}
                      className="text-[11px] font-semibold text-zinc-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Search deliverables */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={delivSearch}
                      onChange={(e) => setDelivSearch(e.target.value)}
                      placeholder="Search deliverables..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="max-h-44 overflow-y-auto border border-zinc-200 rounded-xl p-2 space-y-1 bg-zinc-50/40">
                    {modalDeliverableList.length === 0 ? (
                      <p className="text-[11px] text-zinc-400 p-2 text-center">
                        No matching deliverables found. Add one below!
                      </p>
                    ) : (
                      modalDeliverableList.map((d) => {
                        const checked = selectedDelivs.some(
                          (sel) => sel.toLowerCase() === d.title.toLowerCase()
                        );
                        return (
                          <div
                            key={d.id}
                            onClick={() => toggleDeliv(d.title)}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition-all ${
                              checked
                                ? 'bg-emerald-100/90 text-emerald-950 font-bold'
                                : 'hover:bg-white text-zinc-700'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                                checked
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-zinc-300 bg-white'
                              }`}
                            >
                              {checked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="truncate flex-1">{d.title}</span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add custom deliverable */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customDelivInput}
                      onChange={(e) => setCustomDelivInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomDeliv();
                        }
                      }}
                      placeholder="Or add custom deliverable (e.g. 1 Luxury Photobook 40 Pages)..."
                      className="flex-1 px-3 py-1.5 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomDeliv}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Action Block 3: Set Package Price */}
              {enablePriceAction && (
                <div className="bg-white border border-violet-200 rounded-2xl p-4 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center">
                        <IndianRupee className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-extrabold text-violet-950">
                        Action: Set Default Package Price (₹)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEnablePriceAction(false)}
                      className="text-[11px] font-semibold text-zinc-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      placeholder="e.g. 185000"
                      className="flex-1 px-3.5 py-2 text-sm font-bold border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    />
                    {Number(priceInput) > 0 && (
                      <span className="px-3 py-2 bg-violet-50 border border-violet-200 rounded-xl text-xs font-extrabold text-violet-900 shrink-0">
                        ₹{Number(priceInput).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Action Block 4: Special Value Add-ons */}
              {enableSpecialAddonsAction && (
                <div className="bg-white border border-rose-200 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                        <Gift className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-extrabold text-rose-950">
                          Action: Include Special Value Add-ons
                        </span>
                        <span className="ml-2 text-[10px] font-bold text-rose-600">
                          ({selectedSpecialAddons.length} selected)
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEnableSpecialAddonsAction(false)}
                      className="text-[11px] font-semibold text-zinc-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>

                  <p className="text-[11px] text-rose-700 bg-rose-50/70 border border-rose-100 rounded-lg px-2.5 py-1.5">
                    Only triggers and shows the &ldquo;Special Value Additions&rdquo; quotation page when this phrase is spoken.
                  </p>

                  <div className="max-h-36 overflow-y-auto border border-zinc-200 rounded-xl p-2 space-y-1 bg-zinc-50/40">
                    {modalSpecialAddonList.length === 0 ? (
                      <p className="text-[11px] text-zinc-400 p-2 text-center">
                        No special value add-ons yet. Type a custom freebie below!
                      </p>
                    ) : (
                      modalSpecialAddonList.map((s) => {
                        const checked = selectedSpecialAddons.some(
                          (sel) => sel.toLowerCase() === s.title.toLowerCase()
                        );
                        return (
                          <div
                            key={s.id}
                            onClick={() => toggleSpecialAddon(s.title)}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition-all ${
                              checked
                                ? 'bg-rose-100/90 text-rose-950 font-bold'
                                : 'hover:bg-white text-zinc-700'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                                checked
                                  ? 'bg-rose-600 border-rose-600 text-white'
                                  : 'border-zinc-300 bg-white'
                              }`}
                            >
                              {checked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="truncate flex-1">{s.title}</span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customSpecialAddonInput}
                      onChange={(e) => setCustomSpecialAddonInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomSpecialAddon();
                        }
                      }}
                      placeholder="Or add complimentary item (e.g. Free 1TB Raw Data Hard Drive)..."
                      className="flex-1 px-3 py-1.5 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSpecialAddon}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {!enableCrewAction &&
                !enableDelivsAction &&
                !enablePriceAction &&
                !enableSpecialAddonsAction && (
                  <div className="p-6 text-center bg-white border border-dashed border-zinc-300 rounded-2xl text-xs text-zinc-500">
                    Click one or more action chips above (<ChevronRight className="w-3 h-3 inline" /> Assign Crew, Deliverables, Package Price, or Special Value Add-ons) to attach actions to this shortcut.
                  </div>
                )}
            </div>

            {/* Modal Footer */}
            <div className="bg-white px-6 py-3.5 border-t border-zinc-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-semibold text-zinc-500">
                {activeActionCount} {activeActionCount === 1 ? 'action' : 'actions'} ready in stack
              </span>
              <div className="flex items-center gap-2">
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
                  className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingShortcuts ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>Save Shortcut</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
