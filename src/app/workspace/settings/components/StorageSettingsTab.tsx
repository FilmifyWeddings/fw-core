'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  HardDrive, Plus, Trash2, Check, RefreshCw, 
  Cloud, Save, CheckCircle2, AlertTriangle, ExternalLink,
  Edit3, X, Database, ShieldCheck, MapPin, ChevronDown, Server
} from 'lucide-react';

// 💾 Realistic SD Card Icon (Recognizable cut-corner bevel & metal contact pins)
const SDCardIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M4 4a2 2 0 0 1 2-2h10l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z" />
    <line x1="8" y1="5.5" x2="8" y2="8.5" />
    <line x1="11" y1="5.5" x2="11" y2="8.5" />
    <line x1="14" y1="5.5" x2="14" y2="8.5" />
    <line x1="17" y1="6.5" x2="17" y2="8.5" />
  </svg>
);

// 💽 High-End SSD / External Drive Icon
const SSDIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="7" y1="8" x2="7" y2="10" />
    <line x1="10" y1="8" x2="10" y2="10" />
    <line x1="13" y1="8" x2="13" y2="10" />
    <circle cx="17" cy="16" r="1.5" fill="currentColor" />
  </svg>
);

const DRIVE_TYPES = [
  { id: 'EXTERNAL_SSD', label: 'SSD', desc: 'USB 3.2 / Thunderbolt NVMe', badge: 'Fastest' },
  { id: 'HDD_RACK', label: 'HDD Rack', desc: 'High-Capacity Cold Storage', badge: 'Archive' },
  { id: 'INTERNAL_DRIVE', label: 'Internal Drive', desc: 'Workstation PCIe / SATA', badge: 'Local' },
  { id: 'NVME_SSD', label: 'NVMe SSD', desc: '4K/8K Editing Scratch Disk', badge: 'Ultra' },
  { id: 'NAS', label: 'NAS', desc: 'Central Multi-User Studio Storage', badge: 'Network' },
  { id: 'OTHER', label: 'Other / Pen Drive', desc: 'Portable Transfer Media', badge: 'Media' },
];

const PRESET_COLORS = [
  '#3b82f6', '#06b6d4', '#10b981', '#84cc16', 
  '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316'
];

// 💽 Tactile 3D Capacity Input with Integrated GB / TB Dropdown
const CapacityInputWith3DDropdown: React.FC<{
  value: string;
  onChange: (val: string) => void;
  unit: 'GB' | 'TB';
  onUnitChange: (unit: 'GB' | 'TB') => void;
  theme?: 'amber' | 'emerald';
  placeholder?: string;
  required?: boolean;
}> = ({
  value,
  onChange,
  unit,
  onUnitChange,
  theme = 'amber',
  placeholder = '128',
  required = true,
}) => {
  const [open, setOpen] = useState(false);
  const isAmber = theme === 'amber';

  return (
    <div className={`relative flex items-center w-full rounded-xl border bg-white shadow-2xs transition-all ${
      isAmber 
        ? 'border-amber-300 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500' 
        : 'border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500'
    }`}>
      <input
        type="number"
        min="1"
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 px-3 py-2 bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
      />
      <div className="relative shrink-0 pr-1.5">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black shadow-xs border transition-all cursor-pointer select-none active:translate-y-0.5 whitespace-nowrap ${
            isAmber
              ? 'bg-gradient-to-b from-amber-50 via-amber-100/90 to-amber-200/90 hover:from-amber-100 hover:to-amber-300/90 border-amber-300/90 text-amber-950 shadow-amber-600/10'
              : 'bg-gradient-to-b from-emerald-50 via-emerald-100/90 to-emerald-200/90 hover:from-emerald-100 hover:to-emerald-300/90 border-emerald-300/90 text-emerald-950 shadow-emerald-600/10'
          }`}
          title="Click to toggle between GB and TB"
        >
          <span>{unit}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''} ${isAmber ? 'text-amber-800' : 'text-emerald-800'}`} />
        </button>

        {open && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setOpen(false)} 
            />
            <div className={`absolute right-0 top-full mt-1.5 w-36 bg-white rounded-xl border shadow-xl z-50 p-1 space-y-1 animate-in fade-in zoom-in-95 duration-100 ${
              isAmber ? 'border-amber-300' : 'border-emerald-300'
            }`}>
              <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Storage Unit
              </div>
              <button
                type="button"
                onClick={() => {
                  onUnitChange('GB');
                  setOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-black text-left flex items-center justify-between transition cursor-pointer ${
                  unit === 'GB'
                    ? (isAmber ? 'bg-amber-500 text-white shadow-2xs' : 'bg-emerald-600 text-white shadow-2xs')
                    : (isAmber ? 'hover:bg-amber-50 text-slate-800' : 'hover:bg-emerald-50 text-slate-800')
                }`}
              >
                <span>Gigabytes (GB)</span>
                {unit === 'GB' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  onUnitChange('TB');
                  setOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-black text-left flex items-center justify-between transition cursor-pointer ${
                  unit === 'TB'
                    ? (isAmber ? 'bg-amber-500 text-white shadow-2xs' : 'bg-emerald-600 text-white shadow-2xs')
                    : (isAmber ? 'hover:bg-amber-50 text-slate-800' : 'hover:bg-emerald-50 text-slate-800')
                }`}
              >
                <span>Terabytes (TB)</span>
                {unit === 'TB' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

interface StorageSettingsTabProps {
  workspaceId: string;
  onShowToast: (message: string) => void;
}

export default function StorageSettingsTab({
  workspaceId,
  onShowToast,
}: StorageSettingsTabProps) {
  const effectiveWs = workspaceId || '00000000-0000-0000-0000-000000000000';

  const [cards, setCards] = useState<any[]>([]);
  const [disks, setDisks] = useState<any[]>([]);
  const [drives, setDrives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Card form
  const [newCardName, setNewCardName] = useState('');
  const [newCardType, setNewCardType] = useState('SDXC V90');
  const [newCardCapacity, setNewCardCapacity] = useState('128');
  const [newCardCapacityUnit, setNewCardCapacityUnit] = useState<'GB' | 'TB'>('GB');
  const [newCardSpeed, setNewCardSpeed] = useState('V90 300MB/s');
  const [newCardColor, setNewCardColor] = useState('#F59E0B');
  const [newCardNotes, setNewCardNotes] = useState('');
  const [savingCard, setSavingCard] = useState(false);
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [showAddDiskForm, setShowAddDiskForm] = useState(false);

  // Disk form
  const [newDiskName, setNewDiskName] = useState('');
  const [newDiskType, setNewDiskType] = useState('EXTERNAL_SSD');
  const [isDriveTypeDropdownOpen, setIsDriveTypeDropdownOpen] = useState(false);
  const [newDiskCapacity, setNewDiskCapacity] = useState('2000');
  const [newDiskCapacityUnit, setNewDiskCapacityUnit] = useState<'GB' | 'TB'>('GB');
  const [newDiskLocation, setNewDiskLocation] = useState('Studio Shelf 1');
  const [newDiskColor, setNewDiskColor] = useState('#3B82F6');
  const [newDiskNotes, setNewDiskNotes] = useState('');
  const [savingDisk, setSavingDisk] = useState(false);

  // 3D Popups for Editing Card & Drive
  const [editingCardModal, setEditingCardModal] = useState<any | null>(null);
  const [editingDiskModal, setEditingDiskModal] = useState<any | null>(null);
  const [isModalDriveTypeDropdownOpen, setIsModalDriveTypeDropdownOpen] = useState(false);
  const [savingModalCard, setSavingModalCard] = useState(false);
  const [savingModalDisk, setSavingModalDisk] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cardsRes, disksRes, drivesRes] = await Promise.all([
        fetch(`/api/storage/cards?workspace_id=${effectiveWs}`).then(r => r.json()).catch(() => ({ success: false, cards: [] })),
        fetch(`/api/storage/disks?workspace_id=${effectiveWs}`).then(r => r.json()).catch(() => ({ success: false, disks: [] })),
        fetch(`/api/storage/google/accounts?workspace_id=${effectiveWs}`).then(r => r.json()).catch(() => ({ success: false, accounts: [] })),
      ]);

      if (cardsRes.success) setCards(cardsRes.cards || []);
      if (disksRes.success) setDisks(disksRes.disks || []);
      if (drivesRes.success) setDrives(drivesRes.accounts || []);
    } catch (err) {
      console.warn('Failed to load storage settings:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveWs]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardName.trim()) return;
    setSavingCard(true);

    try {
      const capGb = newCardCapacityUnit === 'TB' ? Number(newCardCapacity) * 1000 : Number(newCardCapacity);
      const res = await fetch('/api/storage/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: effectiveWs,
          card_name: newCardName.trim(),
          card_type: newCardType || 'SDXC V90',
          capacity_gb: capGb || 128,
          speed_class: newCardSpeed,
          color_tag: newCardColor,
          notes: newCardNotes.trim(),
        }),
      });
      const json = await res.json();
      if (json.success && json.card) {
        setCards(prev => [...prev, json.card]);
        setNewCardName('');
        setNewCardNotes('');
        onShowToast('Memory card added successfully!');
      }
    } catch (_) {
      onShowToast('Failed to add memory card');
    } finally {
      setSavingCard(false);
    }
  };

  const handleEditCardClick = (card: any) => {
    let capVal = String(card.capacity_gb || 128);
    let capUnit: 'GB' | 'TB' = 'GB';
    if (card.capacity_gb >= 1000 && card.capacity_gb % 1000 === 0) {
      capVal = String(card.capacity_gb / 1000);
      capUnit = 'TB';
    }
    setEditingCardModal({
      ...card,
      capacity_val: capVal,
      capacity_unit: capUnit,
    });
  };

  const handleSaveModalCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCardModal || !editingCardModal.card_name?.trim()) return;
    setSavingModalCard(true);
    try {
      const capGb = editingCardModal.capacity_unit === 'TB'
        ? Number(editingCardModal.capacity_val) * 1000
        : Number(editingCardModal.capacity_val);
      const res = await fetch('/api/storage/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCardModal.id,
          workspace_id: effectiveWs,
          card_name: editingCardModal.card_name.trim(),
          card_type: editingCardModal.card_type || 'SDXC V90',
          capacity_gb: capGb || 128,
          speed_class: editingCardModal.speed_class || '',
          color_tag: editingCardModal.color_tag || '#F59E0B',
          notes: (editingCardModal.notes || '').trim(),
        }),
      });
      const json = await res.json();
      if (json.success && json.card) {
        setCards(prev => prev.map(c => c.id === editingCardModal.id ? json.card : c));
        setEditingCardModal(null);
        onShowToast('Memory card updated successfully!');
      }
    } catch (_) {
      onShowToast('Failed to update card');
    } finally {
      setSavingModalCard(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm('Are you sure you want to delete this memory card?')) return;
    try {
      const res = await fetch(`/api/storage/cards?id=${id}&workspace_id=${effectiveWs}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setCards(prev => prev.filter(c => c.id !== id));
        onShowToast('Memory card deleted');
      }
    } catch (_) {}
  };

  const handleAddDisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiskName.trim()) return;
    setSavingDisk(true);

    try {
      const capGb = newDiskCapacityUnit === 'TB' ? Number(newDiskCapacity) * 1000 : Number(newDiskCapacity);
      const res = await fetch('/api/storage/disks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: effectiveWs,
          disk_name: newDiskName.trim(),
          disk_type: newDiskType,
          total_capacity_gb: capGb || 2000,
          free_capacity_gb: Math.round((capGb || 2000) * 0.8),
          physical_location: newDiskLocation.trim() || 'Studio Shelf 1',
          color_tag: newDiskColor,
          notes: newDiskNotes.trim(),
        }),
      });
      const json = await res.json();
      if (json.success && json.disk) {
        setDisks(prev => [...prev, json.disk]);
        setNewDiskName('');
        setNewDiskNotes('');
        onShowToast('Hard Drive / SSD added successfully!');
      }
    } catch (_) {
      onShowToast('Failed to add hard drive');
    } finally {
      setSavingDisk(false);
    }
  };

  const handleEditDiskClick = (disk: any) => {
    let capVal = String(disk.total_capacity_gb || 2000);
    let capUnit: 'GB' | 'TB' = 'GB';
    if (disk.total_capacity_gb >= 1000 && disk.total_capacity_gb % 1000 === 0) {
      capVal = String(disk.total_capacity_gb / 1000);
      capUnit = 'TB';
    }
    setEditingDiskModal({
      ...disk,
      capacity_val: capVal,
      capacity_unit: capUnit,
    });
  };

  const handleSaveModalDisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDiskModal || !editingDiskModal.disk_name?.trim()) return;
    setSavingModalDisk(true);
    try {
      const capGb = editingDiskModal.capacity_unit === 'TB'
        ? Number(editingDiskModal.capacity_val) * 1000
        : Number(editingDiskModal.capacity_val);
      const res = await fetch('/api/storage/disks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingDiskModal.id,
          workspace_id: effectiveWs,
          disk_name: editingDiskModal.disk_name.trim(),
          disk_type: editingDiskModal.disk_type || 'EXTERNAL_SSD',
          total_capacity_gb: capGb || 2000,
          free_capacity_gb: Math.round((capGb || 2000) * 0.8),
          physical_location: (editingDiskModal.physical_location || '').trim() || 'Studio Shelf 1',
          color_tag: editingDiskModal.color_tag || '#3B82F6',
          notes: (editingDiskModal.notes || '').trim(),
        }),
      });
      const json = await res.json();
      if (json.success && json.disk) {
        setDisks(prev => prev.map(d => d.id === editingDiskModal.id ? json.disk : d));
        setEditingDiskModal(null);
        onShowToast('Storage drive updated successfully!');
      }
    } catch (_) {
      onShowToast('Failed to update hard drive');
    } finally {
      setSavingModalDisk(false);
    }
  };

  const handleDeleteDisk = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hard drive?')) return;
    try {
      const res = await fetch(`/api/storage/disks?id=${id}&workspace_id=${effectiveWs}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setDisks(prev => prev.filter(d => d.id !== id));
        onShowToast('Hard drive deleted');
      }
    } catch (_) {}
  };

  return (
    <div className="space-y-6">
      {/* ── 1. MEMORY CARDS INVENTORY ── */}
      <div className="bg-white border border-amber-200/90 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-amber-100 pb-4 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center font-bold shrink-0">
              <SDCardIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold text-amber-950 truncate">Memory Cards Inventory</h2>
              <p className="text-xs font-medium text-zinc-500 truncate">
                Register SD Cards & CFexpress media used by crew during wedding events
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap shrink-0">
              {cards.length} Cards in Stock
            </span>
            <button
              type="button"
              onClick={() => setShowAddCardForm(prev => !prev)}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              {showAddCardForm ? (
                <>
                  <X className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Close Form</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ Add Memory Card</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Add Card Form (Shown ONLY when Add button clicked) */}
        {showAddCardForm && (
          <form onSubmit={async (e) => {
            await handleAddCard(e);
            setShowAddCardForm(false);
          }} className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/80 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider">+ Register New Memory Card</h3>
              <button
                type="button"
                onClick={() => setShowAddCardForm(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">Card Name / Label *</label>
                <input
                  type="text"
                  required
                  value={newCardName}
                  onChange={e => setNewCardName(e.target.value)}
                  placeholder="e.g. Sony Tough 128GB #1"
                  className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">Card Type (Manual) *</label>
                <input
                  type="text"
                  required
                  value={newCardType}
                  onChange={e => setNewCardType(e.target.value)}
                  placeholder="e.g. SDXC V90, CFexpress Type A..."
                  className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">Capacity *</label>
                <CapacityInputWith3DDropdown
                  value={newCardCapacity}
                  onChange={setNewCardCapacity}
                  unit={newCardCapacityUnit}
                  onUnitChange={setNewCardCapacityUnit}
                  theme="amber"
                  placeholder="128"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="w-full sm:w-72">
                <input
                  type="text"
                  value={newCardSpeed}
                  onChange={e => setNewCardSpeed(e.target.value)}
                  placeholder="Speed Class: e.g. V90 300MB/s"
                  className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCardForm(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCard || !newCardName.trim()}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {savingCard ? 'Adding...' : '+ Add Card to Inventory'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Cards Visual Grid / List */}
        <div className="space-y-2.5">
          {cards.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              No memory cards registered yet. Use the form above to add your first studio card!
            </div>
          ) : (
            cards.map(card => {
              const formattedCap = card.capacity_gb >= 1000 
                ? `${(card.capacity_gb / 1000).toFixed(1)} TB`
                : `${card.capacity_gb} GB`;

              return (
                <div
                  key={card.id}
                  className="p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-amber-400 hover:shadow-md transition-all flex items-center justify-between gap-3 shadow-2xs"
                  style={{ borderLeftWidth: '5px', borderLeftColor: card.color_tag || '#F59E0B' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm relative overflow-hidden"
                      style={{ backgroundColor: card.color_tag || '#F59E0B' }}
                    >
                      <SDCardIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-black text-slate-900 truncate">{card.card_name}</h4>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                          {formattedCap}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{card.card_type?.replace(/_/g, ' ')}</span>
                        {card.speed_class && <span>⚡ {card.speed_class}</span>}
                        {card.notes && <span className="text-slate-400 truncate max-w-[150px]">• {card.notes}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEditCardClick(card)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 transition cursor-pointer shadow-2xs"
                      title="Edit Card"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCard(card.id)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer shadow-2xs"
                      title="Delete Card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 2. PHYSICAL HARD DRIVES & SSDS ── */}
      <div className="bg-white border border-emerald-200/90 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-emerald-100 pb-4 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center font-bold shrink-0">
              <SSDIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold text-slate-900 truncate">Hard Drives & SSDs Catalog</h2>
              <p className="text-xs font-medium text-zinc-500 truncate">
                Manage physical external hard drives, SSDs, and storage locations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap shrink-0">
              {disks.length} Drives Registered
            </span>
            <button
              type="button"
              onClick={() => setShowAddDiskForm(prev => !prev)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              {showAddDiskForm ? (
                <>
                  <X className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Close Form</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ Add Hard Drive / SSD</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Add Disk Form (Shown ONLY when Add button is clicked) */}
        {showAddDiskForm && (
          <form onSubmit={async (e) => {
            await handleAddDisk(e);
            setShowAddDiskForm(false);
          }} className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200/80 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider">+ Register Hard Drive / SSD</h3>
              <button
                type="button"
                onClick={() => setShowAddDiskForm(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">Drive Name / Label *</label>
                <input
                  type="text"
                  required
                  value={newDiskName}
                  onChange={e => setNewDiskName(e.target.value)}
                  placeholder="e.g. Lacie 4TB Rugged #1"
                  className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              
              {/* Drive Type 3D Dropdown (Clean labels, NO parentheses) */}
              <div className="relative">
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">Drive Type *</label>
                <button
                  type="button"
                  onClick={() => setIsDriveTypeDropdownOpen(prev => !prev)}
                  className="w-full px-3 py-2 bg-white border border-emerald-200 hover:border-emerald-400 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between transition cursor-pointer shadow-2xs"
                >
                  <span className="truncate">
                    {DRIVE_TYPES.find(t => t.id === newDiskType)?.label || newDiskType}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDriveTypeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDriveTypeDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-emerald-200 shadow-xl z-30 p-2 space-y-1">
                    {DRIVE_TYPES.map(type => (
                      <div
                        key={type.id}
                        onClick={() => {
                          setNewDiskType(type.id);
                          setIsDriveTypeDropdownOpen(false);
                        }}
                        className={`p-2 rounded-xl border transition flex items-center justify-between gap-2 cursor-pointer ${
                          newDiskType === type.id
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                            : 'hover:bg-slate-50 border-transparent text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{type.label}</div>
                          <div className="text-[10px] text-slate-400">{type.desc}</div>
                        </div>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                          {type.badge}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">Capacity *</label>
                <CapacityInputWith3DDropdown
                  value={newDiskCapacity}
                  onChange={setNewDiskCapacity}
                  unit={newDiskCapacityUnit}
                  onUnitChange={setNewDiskCapacityUnit}
                  theme="emerald"
                  placeholder="2000"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="w-full sm:w-72">
                <input
                  type="text"
                  value={newDiskLocation}
                  onChange={e => setNewDiskLocation(e.target.value)}
                  placeholder="Physical Location: e.g. Desk 1, Shelf B"
                  className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDiskForm(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDisk || !newDiskName.trim()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {savingDisk ? 'Adding...' : '+ Add Drive to Catalog'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Disks Visual Grid / List */}
        <div className="space-y-2.5">
          {disks.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              No physical hard drives registered yet.
            </div>
          ) : (
            disks.map(disk => {
              const formattedCap = disk.total_capacity_gb >= 1000 
                ? `${(disk.total_capacity_gb / 1000).toFixed(1)} TB`
                : `${disk.total_capacity_gb} GB`;

              return (
                <div
                  key={disk.id}
                  className="p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-emerald-400 hover:shadow-md transition-all flex items-center justify-between gap-3 shadow-2xs"
                  style={{ borderLeftWidth: '5px', borderLeftColor: disk.color_tag || '#3B82F6' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm relative"
                      style={{ backgroundColor: disk.color_tag || '#3B82F6' }}
                    >
                      {disk.disk_type === 'NAS' ? (
                        <Server className="w-5 h-5 text-white" />
                      ) : disk.disk_type === 'EXTERNAL_SSD' || disk.disk_type === 'NVME_SSD' ? (
                        <SSDIcon className="w-5 h-5 text-white" />
                      ) : (
                        <HardDrive className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-black text-slate-900 truncate">{disk.disk_name}</h4>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                          {formattedCap}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{disk.disk_type?.replace(/_/g, ' ')}</span>
                        {disk.physical_location && <span>• 📍 {disk.physical_location}</span>}
                        {disk.notes && <span className="text-slate-400 truncate max-w-[150px]">• {disk.notes}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEditDiskClick(disk)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 transition cursor-pointer shadow-2xs"
                      title="Edit Drive"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDisk(disk.id)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer shadow-2xs"
                      title="Delete Drive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 3. CONNECTED GOOGLE DRIVE ACCOUNTS ── */}
      <div className="bg-white border border-blue-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-blue-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Connected Google Drive Accounts</h2>
              <p className="text-xs font-medium text-zinc-500">
                Multi-account cloud backup integration with live storage quota tracking
              </p>
            </div>
          </div>
          <Link
            href={`/api/storage/google/auth?workspace_id=${encodeURIComponent(effectiveWs)}&return_url=/workspace/settings`}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Connect Google Account</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {drives.length === 0 ? (
            <div className="col-span-2 py-8 text-center text-zinc-400 text-xs font-semibold">
              No Google Drive accounts connected. Click &quot;Connect Google Account&quot; to enable one-click folder backups!
            </div>
          ) : (
            drives.map(acc => {
              const totalGb = Number((acc.total_storage_bytes / (1024 * 1024 * 1024)).toFixed(1)) || 2000;
              const usedGb = Number((acc.used_storage_bytes / (1024 * 1024 * 1024)).toFixed(1)) || 0;
              const percent = Math.min(100, Math.round((usedGb / totalGb) * 100)) || 0;

              return (
                <div key={acc.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-900">{acc.account_email}</h4>
                      <span className="text-[10px] text-blue-700 font-bold">{acc.account_label || 'Studio Drive'}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span>{usedGb} GB used</span>
                      <span>{totalGb} GB total</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 3D POPUP MODAL: EDIT MEMORY CARD ── */}
      {editingCardModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 border border-amber-300/80 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center font-bold">
                  <SDCardIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Edit Memory Card</h3>
                  <p className="text-xs text-slate-500 font-medium">Update memory card specifications in studio inventory</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCardModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModalCard} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 block">Card Name / Label *</label>
                  <input
                    type="text"
                    required
                    value={editingCardModal.card_name || ''}
                    onChange={e => setEditingCardModal({ ...editingCardModal, card_name: e.target.value })}
                    placeholder="e.g. Sony Tough G 128GB #1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 block">Card Type *</label>
                  <input
                    type="text"
                    required
                    value={editingCardModal.card_type || ''}
                    onChange={e => setEditingCardModal({ ...editingCardModal, card_type: e.target.value })}
                    placeholder="e.g. SDXC V90, CFexpress Type A..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 block">Storage Capacity *</label>
                  <CapacityInputWith3DDropdown
                    value={editingCardModal.capacity_val || '128'}
                    onChange={val => setEditingCardModal({ ...editingCardModal, capacity_val: val })}
                    unit={editingCardModal.capacity_unit || 'GB'}
                    onUnitChange={unit => setEditingCardModal({ ...editingCardModal, capacity_unit: unit })}
                    theme="amber"
                    placeholder="128"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 block">Speed Class / Rating</label>
                  <input
                    type="text"
                    value={editingCardModal.speed_class || ''}
                    onChange={e => setEditingCardModal({ ...editingCardModal, speed_class: e.target.value })}
                    placeholder="e.g. V90 300MB/s, 1700MB/s"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Color Sticker / Hardware Tag</span>
                  <span className="font-mono text-[10px] text-slate-400">{editingCardModal.color_tag}</span>
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditingCardModal({ ...editingCardModal, color_tag: c })}
                      className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                        editingCardModal.color_tag === c ? 'scale-125 border-slate-900 shadow-xs' : 'border-white hover:scale-110 shadow-2xs'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-slate-200">
                    <input
                      type="color"
                      value={editingCardModal.color_tag || '#F59E0B'}
                      onChange={e => setEditingCardModal({ ...editingCardModal, color_tag: e.target.value })}
                      className="w-7 h-7 rounded-lg cursor-pointer border border-amber-300 p-0.5 bg-white"
                    />
                    <span className="text-[10px] font-bold text-slate-700">Custom</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 mb-1 block">Notes / Assigned Camera (Optional)</label>
                <input
                  type="text"
                  value={editingCardModal.notes || ''}
                  onChange={e => setEditingCardModal({ ...editingCardModal, notes: e.target.value })}
                  placeholder="e.g. Primary FX3 A-Cam card, kept in Pelican case 1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCardModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingModalCard}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  {savingModalCard && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 3D POPUP MODAL: EDIT HARD DRIVE / SSD ── */}
      {editingDiskModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 border border-emerald-300/80 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center font-bold">
                  <SSDIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Edit Storage Drive / SSD</h3>
                  <p className="text-xs text-slate-500 font-medium">Update physical drive specifications & shelf location</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDiskModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModalDisk} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 block">Drive Name / Model *</label>
                  <input
                    type="text"
                    required
                    value={editingDiskModal.disk_name || ''}
                    onChange={e => setEditingDiskModal({ ...editingDiskModal, disk_name: e.target.value })}
                    placeholder="e.g. Samsung T7 Shield 2TB"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="relative">
                  <label className="text-[11px] font-bold text-slate-700 mb-1 block">Drive Type *</label>
                  <button
                    type="button"
                    onClick={() => setIsModalDriveTypeDropdownOpen(prev => !prev)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-emerald-400 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between transition cursor-pointer shadow-2xs"
                  >
                    <span className="truncate">
                      {DRIVE_TYPES.find(t => t.id === editingDiskModal.disk_type)?.label || editingDiskModal.disk_type}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isModalDriveTypeDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isModalDriveTypeDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-emerald-200 shadow-xl z-50 p-2 space-y-1 max-h-48 overflow-y-auto">
                      {DRIVE_TYPES.map(type => (
                        <div
                          key={type.id}
                          onClick={() => {
                            setEditingDiskModal({ ...editingDiskModal, disk_type: type.id });
                            setIsModalDriveTypeDropdownOpen(false);
                          }}
                          className={`p-2 rounded-xl border transition flex items-center justify-between gap-2 cursor-pointer ${
                            editingDiskModal.disk_type === type.id
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                              : 'hover:bg-slate-50 border-transparent text-slate-700'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-900">{type.label}</div>
                            <div className="text-[10px] text-slate-400">{type.desc}</div>
                          </div>
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                            {type.badge}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 block">Storage Capacity *</label>
                  <CapacityInputWith3DDropdown
                    value={editingDiskModal.capacity_val || '2000'}
                    onChange={val => setEditingDiskModal({ ...editingDiskModal, capacity_val: val })}
                    unit={editingDiskModal.capacity_unit || 'GB'}
                    onUnitChange={unit => setEditingDiskModal({ ...editingDiskModal, capacity_unit: unit })}
                    theme="emerald"
                    placeholder="2000"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 block">Physical Location / Shelf</label>
                  <input
                    type="text"
                    value={editingDiskModal.physical_location || ''}
                    onChange={e => setEditingDiskModal({ ...editingDiskModal, physical_location: e.target.value })}
                    placeholder="e.g. Studio Desk 1, Safe, Edit Rig 2"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Color Label / Sticker Tag</span>
                  <span className="font-mono text-[10px] text-slate-400">{editingDiskModal.color_tag}</span>
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditingDiskModal({ ...editingDiskModal, color_tag: c })}
                      className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                        editingDiskModal.color_tag === c ? 'scale-125 border-slate-900 shadow-xs' : 'border-white hover:scale-110 shadow-2xs'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-slate-200">
                    <input
                      type="color"
                      value={editingDiskModal.color_tag || '#3B82F6'}
                      onChange={e => setEditingDiskModal({ ...editingDiskModal, color_tag: e.target.value })}
                      className="w-7 h-7 rounded-lg cursor-pointer border border-emerald-300 p-0.5 bg-white"
                    />
                    <span className="text-[10px] font-bold text-slate-700">Custom</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 mb-1 block">Notes / Purpose (Optional)</label>
                <input
                  type="text"
                  value={editingDiskModal.notes || ''}
                  onChange={e => setEditingDiskModal({ ...editingDiskModal, notes: e.target.value })}
                  placeholder="e.g. Primary wedding raw footage archive"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDiskModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingModalDisk}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  {savingModalDisk && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
