'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  HardDrive, Database, Search, Cloud, Plus, RefreshCw, 
  Folder, Film, Image as ImageIcon, CheckCircle2, AlertTriangle, ExternalLink, 
  Copy, Check, MapPin, User, Tag, Clock, ArrowUpRight, ShieldCheck, Sparkles, 
  Trash2, Edit3, Monitor, Layers, ChevronRight, Download, Filter, Eye, Cpu, Zap, X,
  FolderOpen, Laptop, CheckSquare, Square, ChevronDown, Building2, Calendar
} from 'lucide-react';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import { supabase } from '@/lib/supabase';

interface MemoryCard {
  id: string;
  card_name: string;
  card_type: string;
  capacity_gb: number;
  speed_class: string;
  serial_number: string;
  color_tag: string;
  status: string;
  assigned_to_crew_name?: string;
}

interface PhysicalDisk {
  id: string;
  disk_name: string;
  disk_serial: string;
  disk_label: string;
  drive_letter?: string;
  disk_type: string;
  physical_location: string;
  total_capacity_gb: number;
  free_capacity_gb: number;
  is_currently_mounted: boolean;
}

interface DriveAccount {
  id: string;
  account_email: string;
  account_label: string;
  total_storage_bytes: number;
  used_storage_bytes: number;
  last_synced_at: string;
  is_active: boolean;
}

interface CrewMemberItem {
  id: string;
  name: string;
  role: string;
  assigned_card_ids: string[];
  assigned_card_names: string[];
  is_copied: boolean;
  copied_at: string | null;
  copied_by: string | null;
}

interface SubEventItem {
  id: string;
  name: string;
  date: string;
  venue?: string;
  crew: CrewMemberItem[];
}

interface AssignedDiskItem {
  disk_id: string;
  disk_name: string;
  drive_type: string;
  role: string;
  folder_path: string;
  folder_name: string;
  total_size_gb: number;
  file_count: number;
  photo_count?: number;
  video_count?: number;
  last_scanned_at?: string;
  scanned_on_machine?: string;
}

interface GoogleDriveBackupItem {
  is_backed_up?: boolean;
  account_id?: string;
  account_email?: string;
  folder_id?: string;
  folder_name?: string;
  web_view_link?: string;
  size_gb?: number;
  backup_status?: string;
  backed_up_at?: string;
}

interface ProjectAsset {
  id: string;
  workspace_id: string;
  lead_id?: string;
  client_id?: string;
  client_name: string;
  event_date: string;
  package_amount: number;
  booking_status: string;
  sub_events: SubEventItem[];
  assigned_disks: AssignedDiskItem[];
  google_drive_backup: GoogleDriveBackupItem;
  overall_storage_status: 'INGESTING' | 'COPIED_LOCAL' | 'BACKED_UP_CLOUD' | 'ARCHIVED';
  notes?: string;
  updated_at: string;
}

export default function StorageHubPage() {
  const { workspaceId, userName } = useWorkspace();
  const effectiveWsId = workspaceId || '00000000-0000-0000-0000-000000000000';

  // Data states
  const [projects, setProjects] = useState<ProjectAsset[]>([]);
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [disks, setDisks] = useState<PhysicalDisk[]>([]);
  const [driveAccounts, setDriveAccounts] = useState<DriveAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'INGESTING' | 'COPIED_LOCAL' | 'BACKED_UP_CLOUD' | 'ARCHIVED'>('ALL');

  // Copy path feedback
  const [copiedPathId, setCopiedPathId] = useState<string | null>(null);

  // Modals
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showAddDiskModal, setShowAddDiskModal] = useState(false);
  const [showGooglePickerModal, setShowGooglePickerModal] = useState(false);
  const [activeProjectForGoogle, setActiveProjectForGoogle] = useState<ProjectAsset | null>(null);

  // Form states for Add Card
  const [newCardName, setNewCardName] = useState('');
  const [newCardType, setNewCardType] = useState('SD_CARD');
  const [newCardCapacity, setNewCardCapacity] = useState('128');
  const [newCardSpeed, setNewCardSpeed] = useState('V90 300MB/s');

  // Form states for Add Disk
  const [newDiskName, setNewDiskName] = useState('');
  const [newDiskType, setNewDiskType] = useState('EXTERNAL_SSD');
  const [newDiskCapacity, setNewDiskCapacity] = useState('2000');
  const [newDiskLocation, setNewDiskLocation] = useState('Desk 1');

  // Google Folder Browser states
  const [selectedGoogleAccount, setSelectedGoogleAccount] = useState<DriveAccount | null>(null);
  const [googleFolders, setGoogleFolders] = useState<any[]>([]);
  const [googleCurrentFolder, setGoogleCurrentFolder] = useState<any>({ id: 'root', name: 'My Drive' });
  const [googleBreadcrumbs, setGoogleBreadcrumbs] = useState<any[]>([{ id: 'root', name: 'My Drive' }]);
  const [googleFolderLoading, setGoogleFolderLoading] = useState(false);
  const [selectedFolderForLink, setSelectedFolderForLink] = useState<any | null>(null);
  const [newDriveFolderName, setNewDriveFolderName] = useState('');
  const [creatingDriveFolder, setCreatingDriveFolder] = useState(false);

  // Load all initial data
  const loadStorageData = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, cardsRes, disksRes, drivesRes] = await Promise.all([
        fetch(`/api/storage/projects?workspace_id=${effectiveWsId}`).then(r => r.json()),
        fetch(`/api/storage/cards?workspace_id=${effectiveWsId}`).then(r => r.json()),
        fetch(`/api/storage/disks?workspace_id=${effectiveWsId}`).then(r => r.json()),
        fetch(`/api/storage/google/accounts?workspace_id=${effectiveWsId}`).then(r => r.json()),
      ]);

      if (projRes.success) setProjects(projRes.projects || []);
      if (cardsRes.success) setMemoryCards(cardsRes.cards || []);
      if (disksRes.success) setDisks(disksRes.disks || []);
      if (drivesRes.success) {
        setDriveAccounts(drivesRes.accounts || []);
        if (drivesRes.accounts?.length > 0 && !selectedGoogleAccount) {
          setSelectedGoogleAccount(drivesRes.accounts[0]);
        }
      }
    } catch (err) {
      console.warn('[StorageHub] Error fetching storage data:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveWsId, selectedGoogleAccount]);

  useEffect(() => {
    loadStorageData();
  }, [loadStorageData]);

  // Real-time synchronization
  useEffect(() => {
    const channel = supabase.channel(`storage-hub-${effectiveWsId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storage_project_assets' }, () => {
        loadStorageData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveWsId, loadStorageData]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        p.client_name?.toLowerCase().includes(q) ||
        p.event_date?.includes(q) ||
        p.sub_events?.some(ev => ev.name?.toLowerCase().includes(q) || ev.crew?.some(c => c.name?.toLowerCase().includes(q) || c.assigned_card_names?.some(n => n.toLowerCase().includes(q)))) ||
        p.assigned_disks?.some(d => d.disk_name?.toLowerCase().includes(q) || d.folder_path?.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'INGESTING') {
        return p.sub_events?.some(ev => ev.crew?.some(c => !c.is_copied));
      }
      if (statusFilter === 'COPIED_LOCAL') {
        const allCopied = p.sub_events?.every(ev => ev.crew?.every(c => c.is_copied));
        return allCopied && !p.google_drive_backup?.is_backed_up;
      }
      if (statusFilter === 'BACKED_UP_CLOUD') {
        return Boolean(p.google_drive_backup?.is_backed_up);
      }
      if (statusFilter === 'ARCHIVED') {
        return p.overall_storage_status === 'ARCHIVED';
      }
      return true;
    });
  }, [projects, searchQuery, statusFilter]);

  // Card update handlers
  const handleAssignMemoryCard = async (projectId: string, eventId: string, crewId: string, cardId: string) => {
    const card = memoryCards.find(c => c.id === cardId);
    if (!card) return;

    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const updatedSubEvents = p.sub_events.map(ev => {
        if (ev.id !== eventId) return ev;
        const updatedCrew = ev.crew.map(cr => {
          if (cr.id !== crewId) return cr;
          const currentCards = cr.assigned_card_ids || [];
          const currentNames = cr.assigned_card_names || [];
          const exists = currentCards.includes(cardId);
          const nextCards = exists ? currentCards.filter(id => id !== cardId) : [...currentCards, cardId];
          const nextNames = exists ? currentNames.filter(n => n !== card.card_name) : [...currentNames, card.card_name];
          return {
            ...cr,
            assigned_card_ids: nextCards,
            assigned_card_names: nextNames,
          };
        });
        return { ...ev, crew: updatedCrew };
      });
      return { ...p, sub_events: updatedSubEvents };
    }));

    // Persist to Supabase
    const targetProject = projects.find(p => p.id === projectId);
    if (!targetProject) return;

    const updatedSubEvents = targetProject.sub_events.map(ev => {
      if (ev.id !== eventId) return ev;
      const updatedCrew = ev.crew.map(cr => {
        if (cr.id !== crewId) return cr;
        const currentCards = cr.assigned_card_ids || [];
        const currentNames = cr.assigned_card_names || [];
        const exists = currentCards.includes(cardId);
        const nextCards = exists ? currentCards.filter(id => id !== cardId) : [...currentCards, cardId];
        const nextNames = exists ? currentNames.filter(n => n !== card.card_name) : [...currentNames, card.card_name];
        return {
          ...cr,
          assigned_card_ids: nextCards,
          assigned_card_names: nextNames,
        };
      });
      return { ...ev, crew: updatedCrew };
    });

    await fetch('/api/storage/projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: projectId, sub_events: updatedSubEvents }),
    });
  };

  // Toggle Is Copied checkmark
  const handleToggleCopied = async (projectId: string, eventId: string, crewId: string) => {
    const targetProject = projects.find(p => p.id === projectId);
    if (!targetProject) return;

    let nextCopiedState = false;
    const nowIso = new Date().toISOString();

    const updatedSubEvents = targetProject.sub_events.map(ev => {
      if (ev.id !== eventId) return ev;
      const updatedCrew = ev.crew.map(cr => {
        if (cr.id !== crewId) return cr;
        nextCopiedState = !cr.is_copied;
        return {
          ...cr,
          is_copied: nextCopiedState,
          copied_at: nextCopiedState ? nowIso : null,
          copied_by: nextCopiedState ? (userName || 'Studio Manager') : null,
        };
      });
      return { ...ev, crew: updatedCrew };
    });

    // Check overall storage status
    const allCopied = updatedSubEvents.every(ev => ev.crew.every(cr => cr.is_copied));
    const overallStatus = targetProject.google_drive_backup?.is_backed_up 
      ? 'BACKED_UP_CLOUD' 
      : (allCopied ? 'COPIED_LOCAL' : 'INGESTING');

    setProjects(prev => prev.map(p => p.id === projectId ? {
      ...p,
      sub_events: updatedSubEvents,
      overall_storage_status: overallStatus,
    } : p));

    await fetch('/api/storage/projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: projectId,
        sub_events: updatedSubEvents,
        overall_storage_status: overallStatus,
      }),
    });
  };

  // Assign Hard Drive / SSD
  const handleAssignDisk = async (projectId: string, diskId: string) => {
    const disk = disks.find(d => d.id === diskId);
    if (!disk) return;

    const targetProject = projects.find(p => p.id === projectId);
    if (!targetProject) return;

    const currentDisks = targetProject.assigned_disks || [];
    const exists = currentDisks.some(d => d.disk_id === diskId);
    if (exists) return;

    const newDiskEntry: AssignedDiskItem = {
      disk_id: disk.id,
      disk_name: disk.disk_name,
      drive_type: disk.disk_type,
      role: currentDisks.length === 0 ? 'PRIMARY_WORK_DRIVE' : 'BACKUP_MIRROR',
      folder_path: `${disk.drive_letter || 'D:'}\\Weddings\\${targetProject.client_name.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      folder_name: targetProject.client_name.replace(/[^a-zA-Z0-9_-]/g, '_'),
      total_size_gb: 0,
      file_count: 0,
      last_scanned_at: new Date().toISOString(),
      scanned_on_machine: typeof window !== 'undefined' ? window.location.hostname : 'Studio-PC',
    };

    const nextDisks = [...currentDisks, newDiskEntry];

    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, assigned_disks: nextDisks } : p));

    await fetch('/api/storage/projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: projectId, assigned_disks: nextDisks }),
    });
  };

  // Native Web File System Access API: Pick Directory
  const handlePickFolder = async (projectId: string, diskId: string) => {
    if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
      alert('Directory Picker API is available in Google Chrome, Microsoft Edge, and modern desktop browsers.');
      return;
    }

    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'read',
      });

      if (!dirHandle) return;

      const folderName = dirHandle.name;
      let fileCount = 0;
      let photoCount = 0;
      let videoCount = 0;
      let totalBytes = 0;

      // Recursive / iterative file counter (sampled up to 5000 files for high responsiveness)
      try {
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
            fileCount++;
            const name = entry.name.toLowerCase();
            if (name.endsWith('.arw') || name.endsWith('.cr3') || name.endsWith('.nef') || name.endsWith('.jpg') || name.endsWith('.dng')) {
              photoCount++;
            } else if (name.endsWith('.mp4') || name.endsWith('.mov') || name.endsWith('.mxf') || name.endsWith('.braw')) {
              videoCount++;
            }
            try {
              const file = await entry.getFile();
              totalBytes += file.size || 0;
            } catch (_) {}
          }
        }
      } catch (_) {}

      const totalSizeGb = Number((totalBytes / (1024 * 1024 * 1024)).toFixed(2)) || 0;

      const targetProject = projects.find(p => p.id === projectId);
      if (!targetProject) return;

      const assignedDisks = (targetProject.assigned_disks || []).map(d => {
        if (d.disk_id !== diskId) return d;
        return {
          ...d,
          folder_name: folderName,
          folder_path: `${d.folder_path ? d.folder_path.split('\\')[0] || 'D:' : 'D:'}\\${folderName}`,
          file_count: fileCount,
          photo_count: photoCount,
          video_count: videoCount,
          total_size_gb: totalSizeGb,
          last_scanned_at: new Date().toISOString(),
          scanned_on_machine: window.location.hostname || 'Local Workstation',
        };
      });

      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, assigned_disks: assignedDisks } : p));

      await fetch('/api/storage/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId, assigned_disks: assignedDisks }),
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error picking directory:', err);
      }
    }
  };

  // Copy Path to Clipboard
  const handleCopyPath = (path: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(path);
      setCopiedPathId(key);
      setTimeout(() => setCopiedPathId(null), 2500);
    }
  };

  // Open Google Drive Picker Modal
  const openGoogleDrivePicker = async (project: ProjectAsset) => {
    setActiveProjectForGoogle(project);
    setShowGooglePickerModal(true);
    setSelectedFolderForLink(null);

    if (driveAccounts.length > 0) {
      const activeAcc = selectedGoogleAccount || driveAccounts[0];
      setSelectedGoogleAccount(activeAcc);
      fetchGoogleFolders(activeAcc.id, 'root');
    }
  };

  // Fetch Google Drive Folders
  const fetchGoogleFolders = async (accountId: string, parentId = 'root') => {
    setGoogleFolderLoading(true);
    try {
      const res = await fetch(`/api/storage/google/folders?account_id=${accountId}&parent_id=${parentId}`);
      const json = await res.json();
      if (json.success) {
        setGoogleFolders(json.folders || []);
        setGoogleCurrentFolder(json.currentFolder || { id: parentId, name: 'Folder' });
      }
    } catch (err) {
      console.warn('Error fetching google folders:', err);
    } finally {
      setGoogleFolderLoading(false);
    }
  };

  // Navigate deeper in Google Drive
  const handleNavigateGoogleFolder = (folder: any) => {
    setGoogleBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    fetchGoogleFolders(selectedGoogleAccount!.id, folder.id);
  };

  // Navigate breadcrumb
  const handleBreadcrumbClick = (crumb: any, index: number) => {
    setGoogleBreadcrumbs(prev => prev.slice(0, index + 1));
    fetchGoogleFolders(selectedGoogleAccount!.id, crumb.id);
  };

  // Create New Folder in Google Drive
  const handleCreateDriveFolder = async () => {
    if (!newDriveFolderName.trim() || !selectedGoogleAccount) return;
    setCreatingDriveFolder(true);
    try {
      const res = await fetch('/api/storage/google/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: selectedGoogleAccount.id,
          name: newDriveFolderName.trim(),
          parent_id: googleCurrentFolder.id,
        }),
      });
      const json = await res.json();
      if (json.success && json.folder) {
        setGoogleFolders(prev => [json.folder, ...prev]);
        setSelectedFolderForLink(json.folder);
        setNewDriveFolderName('');
      }
    } catch (err) {
      console.warn('Create drive folder failed:', err);
    } finally {
      setCreatingDriveFolder(false);
    }
  };

  // Link selected Google Drive folder to Project
  const handleConfirmGoogleDriveLink = async () => {
    if (!activeProjectForGoogle || !selectedFolderForLink || !selectedGoogleAccount) return;

    const backupPayload: GoogleDriveBackupItem = {
      is_backed_up: true,
      account_id: selectedGoogleAccount.id,
      account_email: selectedGoogleAccount.account_email,
      folder_id: selectedFolderForLink.id,
      folder_name: selectedFolderForLink.name,
      web_view_link: selectedFolderForLink.webViewLink,
      backup_status: 'COMPLETED',
      backed_up_at: new Date().toISOString(),
    };

    setProjects(prev => prev.map(p => p.id === activeProjectForGoogle.id ? {
      ...p,
      google_drive_backup: backupPayload,
      overall_storage_status: 'BACKED_UP_CLOUD',
    } : p));

    setShowGooglePickerModal(false);

    await fetch('/api/storage/projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: activeProjectForGoogle.id,
        google_drive_backup: backupPayload,
        overall_storage_status: 'BACKED_UP_CLOUD',
      }),
    });
  };

  // Submit Add Card Form
  const handleAddCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardName.trim()) return;

    const res = await fetch('/api/storage/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: effectiveWsId,
        card_name: newCardName.trim(),
        card_type: newCardType,
        capacity_gb: Number(newCardCapacity) || 128,
        speed_class: newCardSpeed,
      }),
    });

    const json = await res.json();
    if (json.success && json.card) {
      setMemoryCards(prev => [...prev, json.card]);
      setNewCardName('');
      setShowAddCardModal(false);
    }
  };

  // Submit Add Disk Form
  const handleAddDiskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiskName.trim()) return;

    const res = await fetch('/api/storage/disks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: effectiveWsId,
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
      setShowAddDiskModal(false);
    }
  };

  // Storage Stats Calculation
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const ingestingCount = projects.filter(p => p.sub_events?.some(ev => ev.crew?.some(c => !c.is_copied))).length;
    const copiedCount = projects.filter(p => p.sub_events?.every(ev => ev.crew?.every(c => c.is_copied))).length;
    const cloudCount = projects.filter(p => p.google_drive_backup?.is_backed_up).length;

    const totalDisks = disks.length;
    const totalDiskCapacityTb = Number((disks.reduce((acc, d) => acc + (d.total_capacity_gb || 0), 0) / 1000).toFixed(1));
    const freeDiskCapacityTb = Number((disks.reduce((acc, d) => acc + (d.free_capacity_gb || 0), 0) / 1000).toFixed(1));

    const totalDriveTb = Number((driveAccounts.reduce((acc, a) => acc + (a.total_storage_bytes || 0), 0) / (1024 * 1024 * 1024 * 1024)).toFixed(1));
    const usedDriveTb = Number((driveAccounts.reduce((acc, a) => acc + (a.used_storage_bytes || 0), 0) / (1024 * 1024 * 1024 * 1024)).toFixed(1));

    return {
      totalProjects,
      ingestingCount,
      copiedCount,
      cloudCount,
      totalDisks,
      totalDiskCapacityTb,
      freeDiskCapacityTb,
      totalDriveTb,
      usedDriveTb,
      cardCount: memoryCards.length,
    };
  }, [projects, disks, driveAccounts, memoryCards]);

  return (
    <div className="min-h-screen bg-[#FDFCF9] text-slate-800 pb-24">
      {/* ── TOP HEADER ── */}
      <div className="bg-white border-b border-[#EAE5DA] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 shadow-xs">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    Studio Storage & Media Hub
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-800 border border-amber-500/20">
                      Tier-1 Enterprise
                    </span>
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    Memory Card Offloading • Hard Drive Inventory • Folder Picker • Multi-Account Google Drive
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/api/storage/google/auth"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-xs transition"
              >
                <Cloud className="w-4 h-4 text-blue-600" />
                <span>+ Connect Google Drive</span>
              </Link>

              <button
                type="button"
                onClick={() => setShowAddCardModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Cpu className="w-4 h-4 text-amber-600" />
                <span>+ Add Memory Card</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddDiskModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <HardDrive className="w-4 h-4 text-emerald-600" />
                <span>+ Add Hard Drive / SSD</span>
              </button>

              <button
                type="button"
                onClick={loadStorageData}
                className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 transition cursor-pointer"
                title="Refresh Storage Hub"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── METRICS OVERVIEW CARDS ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            {/* Metric 1 */}
            <div className="p-3.5 bg-[#FAF8F3] border border-[#EBE6DB] rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-black text-slate-900 leading-none">
                  {stats.totalProjects}
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-1 truncate">
                  Booked Projects ({stats.ingestingCount} Offloading)
                </div>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="p-3.5 bg-[#FAF8F3] border border-[#EBE6DB] rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-black text-slate-900 leading-none">
                  {stats.cardCount}
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-1 truncate">
                  Registered Memory Cards
                </div>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="p-3.5 bg-[#FAF8F3] border border-[#EBE6DB] rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-700 flex items-center justify-center shrink-0">
                <HardDrive className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-black text-slate-900 leading-none">
                  {stats.totalDisks} Disks
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-1 truncate">
                  {stats.freeDiskCapacityTb} TB / {stats.totalDiskCapacityTb} TB Free
                </div>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="p-3.5 bg-[#FAF8F3] border border-[#EBE6DB] rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-700 flex items-center justify-center shrink-0">
                <Cloud className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-black text-slate-900 leading-none">
                  {driveAccounts.length} Drive Accs
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-1 truncate">
                  {stats.usedDriveTb} TB / {stats.totalDriveTb} TB Used
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Filters and Search Bar */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#EAE5DA] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by client name, memory card, hard drive..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'ALL', label: 'All Projects' },
              { id: 'INGESTING', label: '⚠️ Ingest Pending' },
              { id: 'COPIED_LOCAL', label: '💾 Copied to Local' },
              { id: 'BACKED_UP_CLOUD', label: '☁️ Cloud Backed Up' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── PROJECTS LIST ── */}
        {loading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">Loading Storage Cards & Media Catalog...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#EAE5DA] shadow-xs space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
              <HardDrive className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-slate-900">No Storage Cards Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Storage cards are automatically created whenever a quotation is finalized or booked in Leads CRM!
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredProjects.map(project => {
              const allCopied = project.sub_events?.every(ev => ev.crew?.every(cr => cr.is_copied));
              const hasCloudBackup = Boolean(project.google_drive_backup?.is_backed_up);

              return (
                <div
                  key={project.id}
                  className="bg-white rounded-3xl border border-[#EAE5DA] p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow space-y-5"
                >
                  {/* ── CARD TOP HEADER ── */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#F0EBE0] gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
                        {project.client_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                            {project.client_name}
                          </h2>
                          {/* Overall Status Badge */}
                          {hasCloudBackup ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/15 text-blue-700 border border-blue-500/30">
                              <Cloud className="w-3 h-3" /> Backed Up to Cloud
                            </span>
                          ) : allCopied ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-800 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Copied to Local Disk
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-800 border border-amber-500/30 animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> Ingest Offloading Pending
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                          <span>Event Date: <strong>{project.event_date || 'TBD'}</strong></span>
                          <span>•</span>
                          <span>Booking: <strong>₹{project.package_amount?.toLocaleString('en-IN') || 0}</strong></span>
                        </p>
                      </div>
                    </div>

                    {/* Header Action Button */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openGoogleDrivePicker(project)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                          hasCloudBackup
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-95'
                        }`}
                      >
                        <Cloud className="w-3.5 h-3.5" />
                        <span>{hasCloudBackup ? 'Cloud Backup Linked' : 'Link Google Drive'}</span>
                      </button>
                    </div>
                  </div>

                  {/* ── SECTION 1: EVENT-WISE CREW & MEMORY CARDS OFFLOAD MATRIX ── */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-amber-600" />
                        Memory Cards & Crew Offloading
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowAddCardModal(true)}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
                      >
                        + Add Studio Card
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {(project.sub_events || []).map(event => (
                        <div key={event.id} className="bg-[#FAF8F4] border border-[#EAE4D8] rounded-2xl p-3.5 space-y-2.5">
                          {/* Event Sub-header */}
                          <div className="flex items-center justify-between border-b border-[#EAE4D8] pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              <h4 className="text-xs font-black text-slate-800">{event.name}</h4>
                              <span className="text-[11px] text-slate-400 font-medium">({event.date || project.event_date})</span>
                            </div>
                            {event.venue && (
                              <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" /> {event.venue}
                              </span>
                            )}
                          </div>

                          {/* Crew & Cards list */}
                          <div className="space-y-2">
                            {(event.crew || []).map(crew => (
                              <div
                                key={crew.id}
                                className="bg-white rounded-xl p-3 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs"
                              >
                                {/* Left: Crew Name and Role */}
                                <div className="flex items-center gap-2.5 min-w-[200px]">
                                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                                    <User className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-black text-slate-900">{crew.name}</div>
                                    <div className="text-[10px] text-slate-400 font-bold">{crew.role}</div>
                                  </div>
                                </div>

                                {/* Middle: 3D Memory Card Dropdown Selector */}
                                <div className="flex-1 max-w-sm">
                                  <div className="relative">
                                    <select
                                      aria-label={`Assign memory card to ${crew.name}`}
                                      value=""
                                      onChange={e => {
                                        if (e.target.value === 'NEW_CARD') {
                                          setShowAddCardModal(true);
                                        } else if (e.target.value) {
                                          handleAssignMemoryCard(project.id, event.id, crew.id, e.target.value);
                                        }
                                      }}
                                      className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer appearance-none pr-8"
                                    >
                                      <option value="">
                                        {crew.assigned_card_names?.length 
                                          ? `Assigned: ${crew.assigned_card_names.join(', ')}` 
                                          : 'Select Memory Card (SD / CFexpress)...'}
                                      </option>
                                      <option value="NEW_CARD" className="text-amber-700 font-black">
                                        + Register New Memory Card in Settings
                                      </option>
                                      {memoryCards.map(c => (
                                        <option key={c.id} value={c.id}>
                                          {c.card_name} ({c.capacity_gb}GB • {c.card_type.replace('_', ' ')})
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  </div>

                                  {/* Assigned Card Tags */}
                                  {crew.assigned_card_names?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {crew.assigned_card_names.map((cName, idx) => (
                                        <span
                                          key={idx}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-900 border border-amber-500/20"
                                        >
                                          <Cpu className="w-2.5 h-2.5 text-amber-600" />
                                          {cName}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Right: 3D Luxury Green Copied Checkmark */}
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCopied(project.id, event.id, crew.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-xs ${
                                      crew.is_copied
                                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20'
                                        : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600 border border-slate-200'
                                    }`}
                                  >
                                    {crew.is_copied ? (
                                      <>
                                        <Check className="w-4 h-4 stroke-[3]" />
                                        <span>Copied & Dumped</span>
                                      </>
                                    ) : (
                                      <>
                                        <Square className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Mark as Copied</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── SECTION 2: HARD DRIVES & SSDS STORAGE ── */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
                        Hard Drive / SSD Storage & Folders
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowAddDiskModal(true)}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                      >
                        + Add Hard Drive / SSD
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(project.assigned_disks || []).map((diskItem, dIdx) => (
                        <div
                          key={dIdx}
                          className="bg-[#FAF8F4] border border-[#EAE4D8] rounded-2xl p-3.5 space-y-3 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center shrink-0">
                                <HardDrive className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-slate-900">{diskItem.disk_name}</h4>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                  {diskItem.role === 'PRIMARY_WORK_DRIVE' ? 'Primary Drive' : 'Backup Mirror'}
                                </span>
                              </div>
                            </div>

                            {/* Pick Folder Button (Native API) */}
                            <button
                              type="button"
                              onClick={() => handlePickFolder(project.id, diskItem.disk_id)}
                              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                              <span>Pick Folder</span>
                            </button>
                          </div>

                          {/* Folder Path & Stats */}
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-mono font-bold text-slate-700 truncate" title={diskItem.folder_path}>
                                📁 {diskItem.folder_path || 'No folder picked yet'}
                              </span>
                              {diskItem.folder_path && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyPath(diskItem.folder_path, `${project.id}_${dIdx}`)}
                                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                  title="Copy Path"
                                >
                                  {copiedPathId === `${project.id}_${dIdx}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>

                            {diskItem.total_size_gb > 0 && (
                              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 pt-1 border-t border-slate-100">
                                <span>Size: <strong className="text-slate-800">{diskItem.total_size_gb} GB</strong></span>
                                <span>•</span>
                                <span>Files: <strong className="text-slate-800">{diskItem.file_count}</strong></span>
                                {diskItem.photo_count !== undefined && (
                                  <>
                                    <span>•</span>
                                    <span>Photos: <strong>{diskItem.photo_count}</strong></span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Dropdown to assign drive if none or add more */}
                      <div className="bg-[#FAF8F4]/60 border border-dashed border-[#DFD8C8] rounded-2xl p-3.5 flex flex-col justify-center gap-2">
                        <label className="text-[11px] font-bold text-slate-500">
                          + Assign Hard Drive / SSD:
                        </label>
                        <select
                          aria-label="Assign hard drive to project"
                          value=""
                          onChange={e => {
                            if (e.target.value === 'NEW_DISK') {
                              setShowAddDiskModal(true);
                            } else if (e.target.value) {
                              handleAssignDisk(project.id, e.target.value);
                            }
                          }}
                          className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="">Select Hard Drive / SSD from inventory...</option>
                          <option value="NEW_DISK" className="text-emerald-700 font-black">+ Register New Drive in Settings</option>
                          {disks.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.disk_name} ({d.disk_type.replace('_', ' ')} • {d.total_capacity_gb}GB • {d.physical_location})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* ── SECTION 3: CLOUD BACKUP (GOOGLE DRIVE) ── */}
                  <div className="pt-2 border-t border-[#F0EBE0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        hasCloudBackup ? 'bg-blue-500/15 text-blue-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <Cloud className="w-4 h-4" />
                      </div>
                      <div>
                        {hasCloudBackup ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-800">
                              Google Drive Folder: {project.google_drive_backup?.folder_name}
                            </span>
                            <span className="text-[10px] text-blue-700 font-bold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200">
                              {project.google_drive_backup?.account_email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-500">
                            Cloud Backup Pending (No Google Drive folder linked yet)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {project.google_drive_backup?.web_view_link && (
                        <a
                          href={project.google_drive_backup.web_view_link}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open in Drive</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => openGoogleDrivePicker(project)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                      >
                        {hasCloudBackup ? 'Change Folder' : 'Link Drive Folder'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL 1: ADD MEMORY CARD ── */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 border border-[#EAE5DA] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-black text-slate-900">Add Memory Card</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCardModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCardSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Card Name / Label</label>
                <input
                  type="text"
                  required
                  value={newCardName}
                  onChange={e => setNewCardName(e.target.value)}
                  placeholder="e.g. Sony Tough 128GB #1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Card Type</label>
                  <select
                    value={newCardType}
                    onChange={e => setNewCardType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="SD_CARD">SD Card</option>
                    <option value="CFEXPRESS_A">CFexpress Type A</option>
                    <option value="CFEXPRESS_B">CFexpress Type B</option>
                    <option value="MICRO_SD">MicroSD</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Capacity (GB)</label>
                  <select
                    value={newCardCapacity}
                    onChange={e => setNewCardCapacity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="64">64 GB</option>
                    <option value="128">128 GB</option>
                    <option value="256">256 GB</option>
                    <option value="512">512 GB</option>
                    <option value="1000">1 TB</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Speed / Class</label>
                <input
                  type="text"
                  value={newCardSpeed}
                  onChange={e => setNewCardSpeed(e.target.value)}
                  placeholder="e.g. V90 300MB/s, 800MB/s"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-md cursor-pointer"
                >
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ADD HARD DRIVE / SSD ── */}
      {showAddDiskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 border border-[#EAE5DA] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">Add Hard Drive / SSD</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDiskModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDiskSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Drive Name / Label</label>
                <input
                  type="text"
                  required
                  value={newDiskName}
                  onChange={e => setNewDiskName(e.target.value)}
                  placeholder="e.g. Lacie 4TB Rugged #1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Drive Type</label>
                  <select
                    value={newDiskType}
                    onChange={e => setNewDiskType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="EXTERNAL_SSD">External SSD</option>
                    <option value="EXTERNAL_HDD">External HDD</option>
                    <option value="NVME_SSD">NVMe Drive</option>
                    <option value="INTERNAL_HDD">Internal HDD</option>
                    <option value="NAS_SERVER">Studio NAS</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Capacity (GB)</label>
                  <select
                    value={newDiskCapacity}
                    onChange={e => setNewDiskCapacity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="1000">1 TB (1000 GB)</option>
                    <option value="2000">2 TB (2000 GB)</option>
                    <option value="4000">4 TB (4000 GB)</option>
                    <option value="8000">8 TB (8000 GB)</option>
                    <option value="16000">16 TB (16000 GB)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Physical Location</label>
                <input
                  type="text"
                  value={newDiskLocation}
                  onChange={e => setNewDiskLocation(e.target.value)}
                  placeholder="e.g. Desk 1, Shelf B, Safe Locker"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDiskModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer"
                >
                  Save Hard Drive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: INTERACTIVE GOOGLE DRIVE FOLDER PICKER ── */}
      {showGooglePickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-5 sm:p-6 border border-[#EAE5DA] shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-600 flex items-center justify-center">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Google Drive Folder Picker
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Select a folder for: <strong>{activeProjectForGoogle?.client_name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGooglePickerModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Account Selector & Breadcrumbs */}
            <div className="pt-3 pb-2 space-y-2 shrink-0 border-b border-slate-100">
              {driveAccounts.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Account:</span>
                  <select
                    aria-label="Select Google Drive Account"
                    value={selectedGoogleAccount?.id || ''}
                    onChange={e => {
                      const acc = driveAccounts.find(a => a.id === e.target.value);
                      if (acc) {
                        setSelectedGoogleAccount(acc);
                        setGoogleBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
                        fetchGoogleFolders(acc.id, 'root');
                      }
                    }}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                  >
                    {driveAccounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.account_email} ({a.account_label || 'Drive'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Breadcrumbs */}
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 overflow-x-auto py-1">
                {googleBreadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.id}>
                    {idx > 0 && <span className="text-slate-400">/</span>}
                    <button
                      type="button"
                      onClick={() => handleBreadcrumbClick(crumb, idx)}
                      className="hover:text-blue-600 hover:underline transition whitespace-nowrap cursor-pointer"
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Folder List Tree */}
            <div className="flex-1 overflow-y-auto py-3 space-y-1.5 min-h-[220px]">
              {googleFolderLoading ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">Loading Google Drive Folders...</p>
                </div>
              ) : googleFolders.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                  No subfolders found in this directory. You can create a new folder below!
                </div>
              ) : (
                googleFolders.map(folder => (
                  <div
                    key={folder.id}
                    className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                      selectedFolderForLink?.id === folder.id
                        ? 'bg-blue-50/80 border-blue-500 text-blue-950 shadow-2xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                    onClick={() => setSelectedFolderForLink(folder)}
                    onDoubleClick={() => handleNavigateGoogleFolder(folder)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-xs font-bold truncate">{folder.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleNavigateGoogleFolder(folder);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-600 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Create New Folder Inline */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={newDriveFolderName}
                onChange={e => setNewDriveFolderName(e.target.value)}
                placeholder="New folder name..."
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleCreateDriveFolder}
                disabled={creatingDriveFolder || !newDriveFolderName.trim()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {creatingDriveFolder ? 'Creating...' : '+ Create Folder'}
              </button>
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500 font-medium truncate max-w-[250px]">
                {selectedFolderForLink ? (
                  <span>Selected: <strong>{selectedFolderForLink.name}</strong></span>
                ) : (
                  <span>Click any folder above to select</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowGooglePickerModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmGoogleDriveLink}
                  disabled={!selectedFolderForLink}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  Confirm & Link Folder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
