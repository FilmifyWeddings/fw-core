'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  HardDrive, Cpu, Plus, Trash2, Check, RefreshCw, 
  Cloud, Save, CheckCircle2, AlertTriangle, ExternalLink,
  Edit3, X, Database, ShieldCheck, MapPin
} from 'lucide-react';

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
  const [newCardType, setNewCardType] = useState('SD_CARD');
  const [newCardCapacity, setNewCardCapacity] = useState('128');
  const [newCardSpeed, setNewCardSpeed] = useState('V90 300MB/s');
  const [savingCard, setSavingCard] = useState(false);

  // Disk form
  const [newDiskName, setNewDiskName] = useState('');
  const [newDiskType, setNewDiskType] = useState('EXTERNAL_SSD');
  const [newDiskCapacity, setNewDiskCapacity] = useState('2000');
  const [newDiskLocation, setNewDiskLocation] = useState('Studio Shelf 1');
  const [savingDisk, setSavingDisk] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cardsRes, disksRes, drivesRes] = await Promise.all([
        fetch(`/api/storage/cards?workspace_id=${effectiveWs}`).then(r => r.json()),
        fetch(`/api/storage/disks?workspace_id=${effectiveWs}`).then(r => r.json()),
        fetch(`/api/storage/google/accounts?workspace_id=${effectiveWs}`).then(r => r.json()),
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
      const res = await fetch('/api/storage/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: effectiveWs,
          card_name: newCardName.trim(),
          card_type: newCardType,
          capacity_gb: Number(newCardCapacity) || 128,
          speed_class: newCardSpeed,
        }),
      });
      const json = await res.json();
      if (json.success && json.card) {
        setCards(prev => [...prev, json.card]);
        setNewCardName('');
        onShowToast('Memory card added successfully!');
      }
    } catch (_) {
      onShowToast('Failed to add memory card');
    } finally {
      setSavingCard(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm('Are you sure you want to delete this memory card?')) return;
    try {
      const res = await fetch(`/api/storage/cards?id=${id}`, { method: 'DELETE' });
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
      const res = await fetch('/api/storage/disks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: effectiveWs,
          disk_name: newDiskName.trim(),
          disk_type: newDiskType,
          total_capacity_gb: Number(newDiskCapacity) || 2000,
          physical_location: newDiskLocation,
        }),
      });
      const json = await res.json();
      if (json.success && json.disk) {
        setDisks(prev => [...prev, json.disk]);
        setNewDiskName('');
        onShowToast('Hard Drive / SSD added successfully!');
      }
    } catch (_) {
      onShowToast('Failed to add hard drive');
    } finally {
      setSavingDisk(false);
    }
  };

  const handleDeleteDisk = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hard drive?')) return;
    try {
      const res = await fetch(`/api/storage/disks?id=${id}`, { method: 'DELETE' });
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
        <div className="flex items-center justify-between border-b border-amber-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-amber-950">Memory Cards Inventory</h2>
              <p className="text-xs font-medium text-zinc-500">
                Register SD Cards & CFexpress media used by crew during wedding events
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
            {cards.length} Cards in Stock
          </span>
        </div>

        {/* Add Card Form */}
        <form onSubmit={handleAddCard} className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/80 space-y-3">
          <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider">+ Register New Memory Card</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-zinc-600 block mb-1">Card Name / Label</label>
              <input
                type="text"
                required
                value={newCardName}
                onChange={e => setNewCardName(e.target.value)}
                placeholder="e.g. Sony Tough 128GB #1"
                className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-zinc-600 block mb-1">Card Type</label>
              <select
                value={newCardType}
                onChange={e => setNewCardType(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="SD_CARD">SD Card</option>
                <option value="CFEXPRESS_A">CFexpress Type A</option>
                <option value="CFEXPRESS_B">CFexpress Type B</option>
                <option value="MICRO_SD">MicroSD</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-zinc-600 block mb-1">Capacity</label>
              <select
                value={newCardCapacity}
                onChange={e => setNewCardCapacity(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="64">64 GB</option>
                <option value="128">128 GB</option>
                <option value="256">256 GB</option>
                <option value="512">512 GB</option>
                <option value="1000">1 TB</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="w-64">
              <input
                type="text"
                value={newCardSpeed}
                onChange={e => setNewCardSpeed(e.target.value)}
                placeholder="Speed Class: e.g. V90 300MB/s"
                className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <button
              type="submit"
              disabled={savingCard || !newCardName.trim()}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {savingCard ? 'Adding...' : '+ Add Card to Inventory'}
            </button>
          </div>
        </form>

        {/* Cards Table */}
        <div className="border border-zinc-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 font-black text-zinc-700">
              <tr>
                <th className="py-2.5 px-3">Card Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Capacity</th>
                <th className="py-2.5 px-3">Speed Class</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {cards.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-zinc-400 font-medium">
                    No memory cards registered yet. Use the form above to add your first studio card!
                  </td>
                </tr>
              ) : (
                cards.map(card => (
                  <tr key={card.id} className="hover:bg-amber-50/30 transition">
                    <td className="py-2.5 px-3 font-bold text-zinc-900 flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-amber-600" />
                      <span>{card.card_name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-600">{card.card_type.replace('_', ' ')}</td>
                    <td className="py-2.5 px-3 font-bold text-zinc-800">{card.capacity_gb} GB</td>
                    <td className="py-2.5 px-3 text-zinc-500">{card.speed_class || 'Standard'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteCard(card.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition cursor-pointer"
                        title="Delete Card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 2. PHYSICAL HARD DRIVES & SSDS ── */}
      <div className="bg-white border border-amber-200/90 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-amber-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-amber-950">Hard Drives & SSDs Catalog</h2>
              <p className="text-xs font-medium text-zinc-500">
                Manage physical external hard drives, SSDs, and storage locations
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
            {disks.length} Drives Registered
          </span>
        </div>

        {/* Add Disk Form */}
        <form onSubmit={handleAddDisk} className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200/80 space-y-3">
          <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider">+ Register Hard Drive / SSD</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-zinc-600 block mb-1">Drive Name / Label</label>
              <input
                type="text"
                required
                value={newDiskName}
                onChange={e => setNewDiskName(e.target.value)}
                placeholder="e.g. Lacie 4TB Rugged #1"
                className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-zinc-600 block mb-1">Drive Type</label>
              <select
                value={newDiskType}
                onChange={e => setNewDiskType(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="EXTERNAL_SSD">External SSD</option>
                <option value="EXTERNAL_HDD">External HDD</option>
                <option value="NVME_SSD">NVMe Drive</option>
                <option value="INTERNAL_HDD">Internal HDD</option>
                <option value="NAS_SERVER">Studio NAS</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-zinc-600 block mb-1">Capacity (GB)</label>
              <select
                value={newDiskCapacity}
                onChange={e => setNewDiskCapacity(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="1000">1 TB (1000 GB)</option>
                <option value="2000">2 TB (2000 GB)</option>
                <option value="4000">4 TB (4000 GB)</option>
                <option value="8000">8 TB (8000 GB)</option>
                <option value="16000">16 TB (16000 GB)</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="w-64">
              <input
                type="text"
                value={newDiskLocation}
                onChange={e => setNewDiskLocation(e.target.value)}
                placeholder="Physical Location: e.g. Desk 1, Shelf B"
                className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={savingDisk || !newDiskName.trim()}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {savingDisk ? 'Adding...' : '+ Add Drive to Catalog'}
            </button>
          </div>
        </form>

        {/* Disks Table */}
        <div className="border border-zinc-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 font-black text-zinc-700">
              <tr>
                <th className="py-2.5 px-3">Drive Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Capacity</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {disks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-zinc-400 font-medium">
                    No physical hard drives registered yet.
                  </td>
                </tr>
              ) : (
                disks.map(disk => (
                  <tr key={disk.id} className="hover:bg-emerald-50/30 transition">
                    <td className="py-2.5 px-3 font-bold text-zinc-900 flex items-center gap-2">
                      <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{disk.disk_name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-600">{disk.disk_type.replace('_', ' ')}</td>
                    <td className="py-2.5 px-3 font-bold text-zinc-800">{disk.total_capacity_gb} GB</td>
                    <td className="py-2.5 px-3 text-zinc-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-zinc-400" /> {disk.physical_location || 'Studio'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteDisk(disk.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition cursor-pointer"
                        title="Delete Hard Drive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 3. CONNECTED GOOGLE DRIVE ACCOUNTS ── */}
      <div className="bg-white border border-amber-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-amber-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-amber-950">Connected Google Drive Accounts</h2>
              <p className="text-xs font-medium text-zinc-500">
                Multi-account cloud backup integration with live storage quota tracking
              </p>
            </div>
          </div>
          <Link
            href="/api/storage/google/auth"
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
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
    </div>
  );
}
