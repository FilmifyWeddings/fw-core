'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  HardDrive, Database, Search, Cloud, Plus, RefreshCw, 
  Folder, Film, Image as ImageIcon, CheckCircle2, AlertTriangle, ExternalLink, 
  Copy, Check, MapPin, User, Tag, Clock, ArrowUpRight, ShieldCheck, Sparkles, 
  Trash2, Edit3, Monitor, Layers, ChevronRight, Download, Filter, Eye, Cpu, Zap, X,
  FolderOpen, Laptop, CheckSquare, Square, ChevronDown, Building2, Calendar, FolderPlus,
  Users, CheckCircle
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

interface ManualSubEventForm {
  name: string;
  date: string;
  venue: string;
  crew: { name: string; role: string }[];
}

export default function StorageHubPage() {
  const router = useRouter();
  const { workspaceId, userName } = useWorkspace();
  const effectiveWsId = workspaceId || '00000000-0000-0000-0000-000000000000';

  // Data states
  const [projects, setProjects] = useState<ProjectAsset[]>([]);
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [disks, setDisks] = useState<PhysicalDisk[]>([]);
  const [driveAccounts, setDriveAccounts] = useState<DriveAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // URL Toast feedback
  const [urlToast, setUrlToast] = useState<{ type: 'success' | 'warning' | 'info'; message: string } | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'INGESTING' | 'COPIED_LOCAL' | 'BACKED_UP_CLOUD' | 'ARCHIVED'>('ALL');

  // Copy path feedback
  const [copiedPathId, setCopiedPathId] = useState<string | null>(null);

  // Modals
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showConnectDriveModal, setShowConnectDriveModal] = useState(false);
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

  // Manual Project Form states
  const [manualClientName, setManualClientName] = useState('');
  const [manualEventDate, setManualEventDate] = useState('');
  const [manualPackageAmount, setManualPackageAmount] = useState('');
  const [manualSelectedDiskId, setManualSelectedDiskId] = useState('');
  const [manualSubEvents, setManualSubEvents] = useState<ManualSubEventForm[]>([
    {
      name: 'Main Wedding',
      date: new Date().toISOString().split('T')[0],
      venue: '',
      crew: [
        { name: 'Lead Photographer', role: 'Traditional Photography' },
        { name: 'Candid Cinematographer', role: 'Candid Cinematography' }
      ]
    }
  ]);
  const [availableLeads, setAvailableLeads] = useState<any[]>([]);
  const [selectedLeadIdForProject, setSelectedLeadIdForProject] = useState('');
  const [savingProject, setSavingProject] = useState(false);

  // Connect Google Drive Form states
  const [connectDriveTab, setConnectDriveTab] = useState<'gis' | 'manual' | 'oauth'>('gis');
  const [manualDriveEmail, setManualDriveEmail] = useState('');
  const [manualDriveLabel, setManualDriveLabel] = useState('Primary Wedding Deliverables');
  const [manualDriveCapacityGb, setManualDriveCapacityGb] = useState<number>(2000);
  const [manualDriveUsedGb, setManualDriveUsedGb] = useState<number>(0);
  const [isConnectingGis, setIsConnectingGis] = useState(false);
  const [gisStatusText, setGisStatusText] = useState('');

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

  // Handle URL redirect query parameters (e.g. from Google OAuth callback)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const email = params.get('email');
    const err = params.get('error');
    const reason = params.get('reason');

    if (connected === 'true') {
      setUrlToast({
        type: 'success',
        message: `🎉 Google Drive (${email ? decodeURIComponent(email) : 'Account'}) connected successfully!`
      });
      window.history.replaceState({}, '', '/workspace/storage');
      loadStorageData();
    } else if (err) {
      if (err === 'token_failed') {
        setUrlToast({
          type: 'warning',
          message: `Google authorization note: "${reason || 'token_failed'}". You can use "⚡ 1-Click Instant Sign-In" or enter your storage capacity manually.`
        });
        setShowConnectDriveModal(true);
        setConnectDriveTab('manual');
      } else {
        setUrlToast({
          type: 'warning',
          message: `Notice from Google connection: ${err}`
        });
      }
      window.history.replaceState({}, '', '/workspace/storage');
    }
  }, [loadStorageData]);

  // Load available leads when opening manual project modal
  const handleOpenAddProjectModal = async () => {
    setShowAddProjectModal(true);
    setManualClientName('');
    setManualEventDate(new Date().toISOString().split('T')[0]);
    setManualPackageAmount('');
    setSelectedLeadIdForProject('');
    setManualSubEvents([
      {
        name: 'Main Wedding',
        date: new Date().toISOString().split('T')[0],
        venue: '',
        crew: [
          { name: 'Lead Photographer', role: 'Traditional Photography' },
          { name: 'Candid Cinematographer', role: 'Candid Cinematography' }
        ]
      }
    ]);

    try {
      const res = await fetch(`/api/leads?workspace_id=${effectiveWsId}`).then(r => r.json());
      if (res.leads || res.data) {
        setAvailableLeads(res.leads || res.data || []);
      }
    } catch (_) {}
  };

  // Populate manual project modal from selected lead
  const handleSelectLeadToAutofill = (leadId: string) => {
    setSelectedLeadIdForProject(leadId);
    const matched = availableLeads.find(l => l.id === leadId);
    if (!matched) return;

    const raw = matched.raw_payload || {};
    const name = raw.couple_name || raw.couple_names || matched.name || '';
    setManualClientName(name);
    setManualEventDate(matched.event_date || new Date().toISOString().split('T')[0]);
    setManualPackageAmount(String(matched.budget || ''));

    const rawEvents = raw.events || raw.sub_events;
    if (Array.isArray(rawEvents) && rawEvents.length > 0) {
      setManualSubEvents(rawEvents.map((ev: any) => ({
        name: ev.name || ev.title || 'Wedding Event',
        date: ev.date || matched.event_date || new Date().toISOString().split('T')[0],
        venue: ev.venue || matched.location || '',
        crew: Array.isArray(ev.crew) ? ev.crew.map((c: any) => ({
          name: c.name || 'Crew Member',
          role: c.role || 'Cinematography'
        })) : [
          { name: 'Photographer', role: 'Photography' }
        ]
      })));
    }
  };

  // Real-time synchronization
  useEffect(() => {
    const channel = supabase.channel(`storage-hub-${effectiveWsId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storage_project_assets' }, () => {
        loadStorageData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storage_drive_accounts' }, () => {
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
          copied_by: nextCopiedState ? (userName || 'Studio Editor') : null,
        };
      });
      return { ...ev, crew: updatedCrew };
    });

    const allCopied = updatedSubEvents.every(ev => ev.crew.every(c => c.is_copied));
    const nextStatus = allCopied 
      ? (targetProject.google_drive_backup?.is_backed_up ? 'BACKED_UP_CLOUD' : 'COPIED_LOCAL')
      : 'INGESTING';

    setProjects(prev => prev.map(p => p.id === projectId ? {
      ...p,
      sub_events: updatedSubEvents,
      overall_storage_status: nextStatus as any,
    } : p));

    await fetch('/api/storage/projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: projectId,
        sub_events: updatedSubEvents,
        overall_storage_status: nextStatus,
      }),
    });
  };

  // Assign Physical Disk
  const handleAssignDisk = async (projectId: string, diskId: string) => {
    const targetDisk = disks.find(d => d.id === diskId);
    if (!targetDisk) return;

    const targetProject = projects.find(p => p.id === projectId);
    if (!targetProject) return;

    const exists = targetProject.assigned_disks?.some(d => d.disk_id === diskId);
    let updatedDisks: AssignedDiskItem[];

    if (exists) {
      updatedDisks = targetProject.assigned_disks.filter(d => d.disk_id !== diskId);
    } else {
      const newAssigned: AssignedDiskItem = {
        disk_id: targetDisk.id,
        disk_name: targetDisk.disk_name,
        drive_type: targetDisk.disk_type,
        role: 'Primary Raw Archive',
        folder_path: `${targetDisk.disk_name}/${targetProject.client_name.replace(/[^a-zA-Z0-9]/g, '_')}_RAW`,
        folder_name: `${targetProject.client_name}_RAW`,
        total_size_gb: 0,
        file_count: 0,
        last_scanned_at: new Date().toISOString(),
        scanned_on_machine: 'Studio Workstation',
      };
      updatedDisks = [...(targetProject.assigned_disks || []), newAssigned];
    }

    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, assigned_disks: updatedDisks } : p));

    await fetch('/api/storage/projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: projectId, assigned_disks: updatedDisks }),
    });
  };

  // HTML5 Native File System Access API
  const handlePickDirectory = async (projectId: string, diskItemIndex: number) => {
    if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
      alert('Your browser does not support the Native Directory Picker. Supported in Chrome, Edge, and Opera desktop.');
      return;
    }

    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'read',
      });

      if (!dirHandle) return;

      const folderName = dirHandle.name;
      let totalBytes = 0;
      let fileCount = 0;
      let photoCount = 0;
      let videoCount = 0;

      const photoExts = ['.arw', '.cr3', '.cr2', '.nef', '.dng', '.jpg', '.jpeg', '.png', '.raw'];
      const videoExts = ['.mp4', '.mov', '.mxf', '.braw', '.avi'];

      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          fileCount++;
          const file = await entry.getFile();
          totalBytes += file.size;
          const lowerName = file.name.toLowerCase();
          if (photoExts.some(ext => lowerName.endsWith(ext))) photoCount++;
          if (videoExts.some(ext => lowerName.endsWith(ext))) videoCount++;
        }
      }

      const totalSizeGb = Number((totalBytes / (1024 * 1024 * 1024)).toFixed(2));
      const targetProject = projects.find(p => p.id === projectId);
      if (!targetProject) return;

      const updatedDisks = [...(targetProject.assigned_disks || [])];
      if (updatedDisks[diskItemIndex]) {
        updatedDisks[diskItemIndex] = {
          ...updatedDisks[diskItemIndex],
          folder_name: folderName,
          folder_path: `[Local]: /Volumes/${folderName}`,
          total_size_gb: totalSizeGb,
          file_count: fileCount,
          photo_count: photoCount,
          video_count: videoCount,
          last_scanned_at: new Date().toISOString(),
          scanned_on_machine: window.navigator.userAgent.includes('Mac') ? 'Mac Studio' : 'Windows Rig',
        };
      }

      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, assigned_disks: updatedDisks } : p));

      await fetch('/api/storage/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId, assigned_disks: updatedDisks }),
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Directory Picker Error:', err);
      }
    }
  };

  // Copy local folder path
  const handleCopyPath = (path: string, id: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPathId(id);
    setTimeout(() => setCopiedPathId(null), 2500);
  };

  // Google Folder Navigation
  const fetchGoogleFolders = useCallback(async (accountId: string, parentId: string = 'root') => {
    setGoogleFolderLoading(true);
    try {
      const res = await fetch(`/api/storage/google/folders?account_id=${accountId}&parent_id=${parentId}`);
      const json = await res.json();
      if (json.success) {
        setGoogleFolders(json.folders || []);
      }
    } catch (err) {
      console.warn('Failed to fetch google folders:', err);
    } finally {
      setGoogleFolderLoading(false);
    }
  }, []);

  const handleOpenGooglePicker = (project: ProjectAsset) => {
    setActiveProjectForGoogle(project);
    setSelectedFolderForLink(null);
    setGoogleBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
    setGoogleCurrentFolder({ id: 'root', name: 'My Drive' });

    if (driveAccounts.length > 0) {
      const acc = driveAccounts[0];
      setSelectedGoogleAccount(acc);
      fetchGoogleFolders(acc.id, 'root');
    }
    setShowGooglePickerModal(true);
  };

  const handleNavigateGoogleFolder = (folder: { id: string; name: string }) => {
    if (!selectedGoogleAccount) return;
    setGoogleCurrentFolder(folder);
    setGoogleBreadcrumbs(prev => [...prev, folder]);
    fetchGoogleFolders(selectedGoogleAccount.id, folder.id);
  };

  const handleBreadcrumbClick = (crumb: { id: string; name: string }, index: number) => {
    if (!selectedGoogleAccount) return;
    setGoogleBreadcrumbs(prev => prev.slice(0, index + 1));
    setGoogleCurrentFolder(crumb);
    fetchGoogleFolders(selectedGoogleAccount.id, crumb.id);
  };

  // Create Google Drive Folder
  const handleCreateDriveFolder = async () => {
    if (!selectedGoogleAccount || !newDriveFolderName.trim()) return;
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

  // Submit Manual Project Card Form
  const handleCreateManualProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualClientName.trim()) return;

    setSavingProject(true);
    try {
      const selectedDisk = disks.find(d => d.id === manualSelectedDiskId);
      const assignedDisksPayload: AssignedDiskItem[] = selectedDisk ? [
        {
          disk_id: selectedDisk.id,
          disk_name: selectedDisk.disk_name,
          drive_type: selectedDisk.disk_type,
          role: 'Primary Raw Archive',
          folder_path: `${selectedDisk.disk_name}/${manualClientName.replace(/[^a-zA-Z0-9]/g, '_')}_RAW`,
          folder_name: `${manualClientName.trim()}_RAW`,
          total_size_gb: 0,
          file_count: 0,
        }
      ] : [];

      const formattedSubEvents: SubEventItem[] = manualSubEvents.map((ev, evIdx) => ({
        id: `ev_${evIdx + 1}_${Date.now()}`,
        name: ev.name.trim() || `Event ${evIdx + 1}`,
        date: ev.date || manualEventDate || new Date().toISOString().split('T')[0],
        venue: ev.venue || '',
        crew: ev.crew.map((c, cIdx) => ({
          id: `cr_${evIdx + 1}_${cIdx + 1}`,
          name: c.name.trim() || `Crew Member ${cIdx + 1}`,
          role: c.role || 'Photography',
          assigned_card_ids: [],
          assigned_card_names: [],
          is_copied: false,
          copied_at: null,
          copied_by: null,
        }))
      }));

      const payload = {
        workspace_id: effectiveWsId,
        lead_id: selectedLeadIdForProject || `manual_${Date.now()}`,
        client_name: manualClientName.trim(),
        event_date: manualEventDate || new Date().toISOString().split('T')[0],
        package_amount: Number(manualPackageAmount) || 0,
        sub_events: formattedSubEvents,
        assigned_disks: assignedDisksPayload,
        google_drive_backup: {},
        overall_storage_status: 'INGESTING',
      };

      const res = await fetch('/api/storage/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.project) {
        setProjects(prev => [json.project, ...prev.filter(p => p.id !== json.project.id)]);
        setShowAddProjectModal(false);
        setUrlToast({
          type: 'success',
          message: `🎉 Storage Project Card created for "${manualClientName}"!`
        });
      } else {
        alert(json.error || 'Failed to create storage card');
      }
    } catch (err: any) {
      alert(err?.message || 'Error creating storage project');
    } finally {
      setSavingProject(false);
    }
  };

  // Google Identity Services (GIS) One-Click Sign-In
  const handleGisConnect = () => {
    if (typeof window === 'undefined') return;
    setIsConnectingGis(true);
    setGisStatusText('Initializing Google Sign-In...');

    const loadGsiScript = () => {
      return new Promise<void>((resolve, reject) => {
        if ((window as any).google?.accounts?.oauth2) return resolve();
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.body.appendChild(script);
      });
    };

    loadGsiScript().then(() => {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: '666330539586-q0s8vvr4osdah4e60rd75s3keolfgmc0.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.metadata.readonly',
        callback: async (resp: any) => {
          if (resp.error) {
            setIsConnectingGis(false);
            setGisStatusText('');
            alert('Google Sign-In cancelled or failed: ' + resp.error);
            return;
          }

          if (resp.access_token) {
            setGisStatusText('Detecting Google Drive Storage Quota...');
            try {
              let email = 'studio.drive@gmail.com';
              let name = 'Studio Google Drive';
              try {
                const uRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                  headers: { Authorization: `Bearer ${resp.access_token}` },
                });
                if (uRes.ok) {
                  const uData = await uRes.json();
                  email = uData.email || email;
                  name = uData.name || email.split('@')[0];
                }
              } catch (_) {}

              let totalGb = 2000;
              let usedGb = 0;
              try {
                const abRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
                  headers: { Authorization: `Bearer ${resp.access_token}` },
                });
                if (abRes.ok) {
                  const abData = await abRes.json();
                  const q = abData.storageQuota || {};
                  if (q.limit) totalGb = Number((Number(q.limit) / (1024 ** 3)).toFixed(1));
                  if (q.usage) usedGb = Number((Number(q.usage) / (1024 ** 3)).toFixed(1));
                }
              } catch (_) {}

              const saveRes = await fetch('/api/storage/google/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  workspace_id: effectiveWsId,
                  account_email: email,
                  account_label: name,
                  total_storage_gb: totalGb,
                  used_storage_gb: usedGb,
                  access_token: resp.access_token,
                }),
              });

              const json = await saveRes.json();
              if (json.success && json.account) {
                setDriveAccounts(prev => [json.account, ...prev.filter(a => a.id !== json.account.id)]);
                setShowConnectDriveModal(false);
                setUrlToast({
                  type: 'success',
                  message: `🎉 Google Drive (${email}) connected! (${usedGb} GB used of ${totalGb} GB)`
                });
              }
            } catch (ex: any) {
              alert('Failed to detect Google Drive quota: ' + ex.message);
            } finally {
              setIsConnectingGis(false);
              setGisStatusText('');
            }
          }
        }
      });
      client.requestAccessToken({ prompt: 'consent' });
    }).catch(() => {
      setIsConnectingGis(false);
      setGisStatusText('');
      window.location.href = `/api/storage/google/auth?workspace_id=${encodeURIComponent(effectiveWsId)}&return_url=/workspace/storage`;
    });
  };

  // Direct manual link of Google Account
  const handleManualDriveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDriveEmail.trim()) return;

    try {
      const res = await fetch('/api/storage/google/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: effectiveWsId,
          account_email: manualDriveEmail.trim(),
          account_label: manualDriveLabel.trim() || 'Wedding Deliverables Drive',
          total_storage_gb: Number(manualDriveCapacityGb) || 2000,
          used_storage_gb: Number(manualDriveUsedGb) || 0,
        }),
      });

      const json = await res.json();
      if (json.success && json.account) {
        setDriveAccounts(prev => [json.account, ...prev.filter(a => a.id !== json.account.id)]);
        setShowConnectDriveModal(false);
        setManualDriveEmail('');
        setUrlToast({
          type: 'success',
          message: `🎉 Google Drive (${json.account.account_email}) linked successfully!`
        });
      } else {
        alert(json.error || 'Failed to save drive account');
      }
    } catch (err: any) {
      alert(err?.message || 'Error saving drive account');
    }
  };

  // Disconnect Google Account
  const handleDeleteGoogleAccount = async (id: string) => {
    if (!confirm('Are you sure you want to disconnect this Google Drive account?')) return;
    try {
      const res = await fetch(`/api/storage/google/accounts?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setDriveAccounts(prev => prev.filter(a => a.id !== id));
        setUrlToast({ type: 'info', message: 'Google Drive disconnected' });
      }
    } catch (_) {}
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
      {/* ── URL NOTIFICATION BANNER / TOAST ── */}
      {urlToast && (
        <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 text-xs font-bold transition-all ${
          urlToast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
            : urlToast.type === 'warning'
            ? 'bg-amber-50 text-amber-900 border-amber-200'
            : 'bg-blue-50 text-blue-900 border-blue-200'
        }`}>
          <div className="max-w-7xl mx-auto flex-1 flex items-center gap-2">
            {urlToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{urlToast.message}</span>
          </div>
          <button
            onClick={() => setUrlToast(null)}
            className="p-1 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
              {/* PRIMARY ACTION: + Add Project Card */}
              <button
                type="button"
                onClick={handleOpenAddProjectModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md shadow-amber-600/20 transition cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                <span>+ Add Project Card</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConnectDriveModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Cloud className="w-4 h-4 text-blue-600" />
                <span>+ Connect Google Drive</span>
              </button>

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

        {/* ── PROMINENT GOOGLE DRIVE CLOUD ACCOUNTS SECTION ── */}
        <div className="bg-white p-5 rounded-2xl border border-[#EAE5DA] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  Connected Google Drive Cloud Accounts
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {driveAccounts.length} Active
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Live cloud storage quota tracking & direct folder links for client wedding cards
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowConnectDriveModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Connect Google Drive</span>
            </button>
          </div>

          {driveAccounts.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-slate-500">
                No Google Drive accounts connected yet. Link your Google account to automatically track storage and link raw backup folders to client cards.
              </div>
              <button
                type="button"
                onClick={() => setShowConnectDriveModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shrink-0"
              >
                ⚡ Connect Google Drive Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {driveAccounts.map(acc => {
                const totalGb = Number((acc.total_storage_bytes / (1024 ** 3)).toFixed(1)) || 2000;
                const usedGb = Number((acc.used_storage_bytes / (1024 ** 3)).toFixed(1)) || 0;
                const freeGb = Math.max(0, Number((totalGb - usedGb).toFixed(1)));
                const percent = Math.min(100, Math.round((usedGb / (totalGb || 1)) * 100));

                return (
                  <div key={acc.id} className="p-4 rounded-xl border border-slate-200 bg-[#FAF9F6] space-y-3 relative group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                          <Cloud className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{acc.account_email}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {acc.account_label || 'Studio Google Drive'}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                        Active
                      </span>
                    </div>

                    {/* Storage Meter Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-600">
                        <span>{usedGb >= 1000 ? `${(usedGb / 1000).toFixed(2)} TB` : `${usedGb} GB`} used</span>
                        <span>{freeGb >= 1000 ? `${(freeGb / 1000).toFixed(2)} TB` : `${freeGb} GB`} free</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            percent > 90 ? 'bg-red-500' : percent > 75 ? 'bg-amber-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{percent}% allocated</span>
                        <span>Total: {totalGb >= 1000 ? `${(totalGb / 1000).toFixed(1)} TB` : `${totalGb} GB`}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGoogleAccount(acc);
                          setShowGooglePickerModal(true);
                        }}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Folder className="w-3 h-3" />
                        <span>Browse Folders</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteGoogleAccount(acc.id)}
                        className="text-[11px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
              { id: 'INGESTING', label: '⏳ Ingest Pending' },
              { id: 'COPIED_LOCAL', label: '💾 Copied to Local' },
              { id: 'BACKED_UP_CLOUD', label: '☁️ Cloud Backed Up' },
              { id: 'ARCHIVED', label: '🗄️ Archived' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── PROJECT CARDS LIST ── */}
        {loading ? (
          <div className="py-24 text-center bg-white rounded-3xl border border-[#EAE5DA] space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-600" />
            <p className="text-sm font-bold text-slate-600">Loading Studio Storage Hub & Assets...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-[#EAE5DA] p-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-700 mx-auto flex items-center justify-center font-bold">
              <HardDrive className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">No Storage Project Cards Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Project cards are automatically created when a lead is booked. You can also create a card manually anytime!
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddProjectModal}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md shadow-amber-600/20 inline-flex items-center gap-2 cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>+ Create Client Storage Card Now</span>
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredProjects.map(project => {
              const allCopied = project.sub_events?.every(ev => ev.crew?.every(c => c.is_copied));
              const hasCloudBackup = Boolean(project.google_drive_backup?.is_backed_up);

              return (
                <div
                  key={project.id}
                  className="bg-white rounded-3xl border border-[#EAE5DA] p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-5"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F4EFE6] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#FAF8F3] border border-[#EAE5DA] flex items-center justify-center text-slate-800 font-black text-sm shrink-0">
                        {project.client_name?.slice(0, 2).toUpperCase() || 'ST'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                            {project.client_name}
                          </h2>
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            hasCloudBackup 
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : allCopied
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {hasCloudBackup ? '☁️ Cloud Backed Up' : allCopied ? '💾 Copied to Local' : '⏳ Ingest Pending'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5">
                          <span>📅 {project.event_date || 'Date Pending'}</span>
                          {project.package_amount > 0 && (
                            <span>💰 ₹{project.package_amount.toLocaleString('en-IN')}</span>
                          )}
                          <span>📸 {project.sub_events?.length || 0} Sub-Events</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Link Buttons */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleOpenGooglePicker(project)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                          hasCloudBackup
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <Cloud className="w-3.5 h-3.5 text-blue-600" />
                        <span>{hasCloudBackup ? 'Drive Linked' : '+ Link Google Drive'}</span>
                      </button>
                    </div>
                  </div>

                  {/* ── SUB-EVENTS & CREW-WISE CARD OFFLOADING ── */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Sub-Events & Crew Media Cards
                    </h3>

                    <div className="grid grid-cols-1 gap-3">
                      {project.sub_events?.map(event => (
                        <div
                          key={event.id}
                          className="bg-[#FAF8F3] border border-[#EBE6DB] rounded-2xl p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-amber-600" />
                              <span className="text-xs font-black text-slate-900">{event.name}</span>
                              <span className="text-[11px] font-medium text-slate-500">({event.date})</span>
                            </div>
                            {event.venue && (
                              <span className="text-[11px] text-slate-500 truncate max-w-[200px]">📍 {event.venue}</span>
                            )}
                          </div>

                          {/* Crew list in event */}
                          <div className="space-y-2">
                            {event.crew?.map(member => (
                              <div
                                key={member.id}
                                className="bg-white border border-slate-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-[200px]">
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                                    <User className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-black text-slate-900">{member.name}</div>
                                    <div className="text-[10px] font-semibold text-slate-500">{member.role}</div>
                                  </div>
                                </div>

                                {/* 3D Memory Card Assignment Dropdown */}
                                <div className="flex items-center gap-2 flex-1 max-w-sm">
                                  <div className="relative w-full">
                                    <select
                                      aria-label={`Assign Memory Card for ${member.name}`}
                                      value=""
                                      onChange={e => {
                                        if (e.target.value === '__add_new__') {
                                          setShowAddCardModal(true);
                                        } else if (e.target.value) {
                                          handleAssignMemoryCard(project.id, event.id, member.id, e.target.value);
                                        }
                                      }}
                                      className="w-full px-3 py-1.5 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-amber-600 cursor-pointer shadow-2xs appearance-none pr-8"
                                    >
                                      <option value="">
                                        {member.assigned_card_names?.length > 0 
                                          ? `+ Add Another Card (${member.assigned_card_names.length} assigned)` 
                                          : 'Select Memory Card (SD / CFexpress)...'}
                                      </option>
                                      {memoryCards.map(c => (
                                        <option key={c.id} value={c.id}>
                                          {c.card_name} ({c.card_type} • {c.capacity_gb}GB • {c.speed_class})
                                        </option>
                                      ))}
                                      <option value="__add_new__">➕ Register New Card...</option>
                                    </select>
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  </div>
                                </div>

                                {/* Assigned Card Tags */}
                                {member.assigned_card_names?.length > 0 && (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {member.assigned_card_names.map((name, nIdx) => (
                                      <span
                                        key={nIdx}
                                        className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1"
                                      >
                                        <Cpu className="w-3 h-3 text-amber-600" />
                                        <span>{name}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* 3D Emerald Green Copied Checkbox */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleCopied(project.id, event.id, member.id)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                                    member.is_copied
                                      ? 'bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                                  }`}
                                >
                                  {member.is_copied ? (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                                      <span>Copied & Dumped</span>
                                    </>
                                  ) : (
                                    <>
                                      <Square className="w-4 h-4 stroke-[1.5]" />
                                      <span>Mark Copied</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── PHYSICAL DISK CATALOG & LOCAL FOLDER PICKER ── */}
                  <div className="space-y-3 pt-2 border-t border-[#F4EFE6]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Assigned Hard Drives / SSDs & Local Rig Folders
                      </h3>

                      {/* Dropdown to assign disk */}
                      <div className="relative">
                        <select
                          aria-label="Assign Hard Drive or SSD"
                          value=""
                          onChange={e => {
                            if (e.target.value === '__add_new_disk__') {
                              setShowAddDiskModal(true);
                            } else if (e.target.value) {
                              handleAssignDisk(project.id, e.target.value);
                            }
                          }}
                          className="px-3 py-1.5 bg-[#FAF8F3] border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer pr-8"
                        >
                          <option value="">+ Assign Physical Disk...</option>
                          {disks.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.disk_name} ({d.disk_type} • {d.total_capacity_gb}GB)
                            </option>
                          ))}
                          <option value="__add_new_disk__">➕ Add New Hard Drive...</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {project.assigned_disks?.length === 0 ? (
                      <div className="p-3 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 text-center">
                        No physical storage disk assigned yet. Select a disk from the dropdown above.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {project.assigned_disks?.map((diskItem, dIdx) => (
                          <div
                            key={diskItem.disk_id}
                            className="bg-slate-50/70 border border-slate-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-[220px]">
                              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                                <HardDrive className="w-4 h-4 text-emerald-600" />
                              </div>
                              <div>
                                <div className="text-xs font-black text-slate-900">{diskItem.disk_name}</div>
                                <div className="text-[10px] text-slate-500 font-semibold">{diskItem.drive_type}</div>
                              </div>
                            </div>

                            {/* Folder Path and Metadata */}
                            <div className="flex-1 min-w-0 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 text-xs font-mono flex items-center justify-between gap-2">
                              <div className="truncate text-slate-700">
                                {diskItem.folder_path || 'No folder picked yet'}
                              </div>
                              {diskItem.folder_path && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyPath(diskItem.folder_path, `${project.id}_${dIdx}`)}
                                  className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 shrink-0 p-1 rounded-md hover:bg-slate-100 cursor-pointer"
                                  title="Copy path for editing rig"
                                >
                                  {copiedPathId === `${project.id}_${dIdx}` ? (
                                    <span className="text-emerald-600 flex items-center gap-0.5">
                                      <Check className="w-3 h-3" /> Copied
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-0.5">
                                      <Copy className="w-3 h-3" /> Copy Path
                                    </span>
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Native Directory Picker Trigger */}
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handlePickDirectory(project.id, dIdx)}
                                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                                title="Pick folder directly from local disk"
                              >
                                <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                                <span>{diskItem.folder_name ? 'Change Folder' : 'Pick Folder'}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── GOOGLE DRIVE BACKUP STATUS BANNER ── */}
                  {project.google_drive_backup?.is_backed_up && (
                    <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Cloud className="w-5 h-5 text-blue-600 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-extrabold text-blue-950">Google Drive Backup: </span>
                          <span className="font-semibold text-blue-800 truncate">
                            {project.google_drive_backup.folder_name || 'Project Folder'}
                          </span>
                          <span className="text-[11px] text-blue-600 ml-2">
                            ({project.google_drive_backup.account_email})
                          </span>
                        </div>
                      </div>

                      {project.google_drive_backup.web_view_link && (
                        <a
                          href={project.google_drive_backup.web_view_link}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shrink-0 shadow-xs"
                        >
                          <span>Open in Drive</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL 1: CREATE MANUAL CLIENT STORAGE PROJECT CARD ── */}
      {showAddProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-5 sm:p-6 border border-[#EAE5DA] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Create Client Storage Project Card
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Add project card manually or autocomplete from booked leads
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddProjectModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Autocomplete from Existing Lead */}
            {availableLeads.length > 0 && (
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3 space-y-1.5">
                <label className="text-[11px] font-black uppercase text-amber-900 tracking-wider block">
                  ⚡ Optional: Select Existing Lead to Autocomplete
                </label>
                <select
                  aria-label="Select existing lead to autofill"
                  value={selectedLeadIdForProject}
                  onChange={e => handleSelectLeadToAutofill(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="">-- Choose a lead or enter details below --</option>
                  {availableLeads.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name} {l.event_date ? `(${l.event_date})` : ''} - ₹{l.budget || 0}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <form onSubmit={handleCreateManualProject} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Client / Wedding Name *</label>
                  <input
                    type="text"
                    required
                    value={manualClientName}
                    onChange={e => setManualClientName(e.target.value)}
                    placeholder="e.g. Pooja & Rahul Wedding"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Main Event Date</label>
                  <input
                    type="date"
                    value={manualEventDate}
                    onChange={e => setManualEventDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Package Budget (₹)</label>
                  <input
                    type="number"
                    value={manualPackageAmount}
                    onChange={e => setManualPackageAmount(e.target.value)}
                    placeholder="e.g. 150000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Initial Physical Disk (Optional)</label>
                  <select
                    aria-label="Select initial physical disk"
                    value={manualSelectedDiskId}
                    onChange={e => setManualSelectedDiskId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="">-- No Disk Initially --</option>
                    {disks.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.disk_name} ({d.disk_type} • {d.total_capacity_gb}GB)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sub-Events Builder */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
                    Sub-Events & Crew Assignment
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setManualSubEvents(prev => [
                        ...prev,
                        {
                          name: `Event ${prev.length + 1}`,
                          date: manualEventDate || new Date().toISOString().split('T')[0],
                          venue: '',
                          crew: [{ name: 'Photographer', role: 'Photography' }]
                        }
                      ]);
                    }}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Sub-Event</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {manualSubEvents.map((ev, evIdx) => (
                    <div key={evIdx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={ev.name}
                          onChange={e => {
                            const val = e.target.value;
                            setManualSubEvents(prev => prev.map((item, idx) => idx === evIdx ? { ...item, name: val } : item));
                          }}
                          placeholder="Event Name (e.g. Sangeet, Wedding Ceremony)"
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                        />
                        {manualSubEvents.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setManualSubEvents(prev => prev.filter((_, idx) => idx !== evIdx))}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Crew list */}
                      <div className="pl-2 border-l-2 border-amber-300 space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                          <span>Crew Members:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setManualSubEvents(prev => prev.map((item, idx) => idx === evIdx ? {
                                ...item,
                                crew: [...item.crew, { name: `Crew ${item.crew.length + 1}`, role: 'Cinematography' }]
                              } : item));
                            }}
                            className="text-[10px] font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
                          >
                            + Add Crew
                          </button>
                        </div>

                        {ev.crew.map((cr, crIdx) => (
                          <div key={crIdx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={cr.name}
                              onChange={e => {
                                const val = e.target.value;
                                setManualSubEvents(prev => prev.map((item, idx) => idx === evIdx ? {
                                  ...item,
                                  crew: item.crew.map((c, i) => i === crIdx ? { ...c, name: val } : c)
                                } : item));
                              }}
                              placeholder="Crew Name"
                              className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-medium"
                            />
                            <input
                              type="text"
                              value={cr.role}
                              onChange={e => {
                                const val = e.target.value;
                                setManualSubEvents(prev => prev.map((item, idx) => idx === evIdx ? {
                                  ...item,
                                  crew: item.crew.map((c, i) => i === crIdx ? { ...c, role: val } : c)
                                } : item));
                              }}
                              placeholder="Role"
                              className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-medium"
                            />
                            {ev.crew.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setManualSubEvents(prev => prev.map((item, idx) => idx === evIdx ? {
                                    ...item,
                                    crew: item.crew.filter((_, i) => i !== crIdx)
                                  } : item));
                                }}
                                className="p-1 text-slate-400 hover:text-red-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProject || !manualClientName.trim()}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingProject ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Storage Project Card</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CONNECT GOOGLE DRIVE (GIS / DIRECT / OAUTH) ── */}
      {showConnectDriveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 border border-[#EAE5DA] shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Connect Google Drive Account
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Link Google storage account to manage client folders & live quota
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectDriveModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Connection Method Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setConnectDriveTab('gis')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                  connectDriveTab === 'gis'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⚡ 1-Click Google Sign-In
              </button>
              <button
                type="button"
                onClick={() => setConnectDriveTab('manual')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                  connectDriveTab === 'manual'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📝 Direct Link Account
              </button>
              <button
                type="button"
                onClick={() => setConnectDriveTab('oauth')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                  connectDriveTab === 'oauth'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🔗 Web Redirect
              </button>
            </div>

            {/* Tab 1: 1-Click GIS Google Sign-In */}
            {connectDriveTab === 'gis' && (
              <div className="space-y-4 py-2 text-center">
                <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-2xl text-xs text-slate-600 space-y-2">
                  <p className="font-bold text-blue-950">
                    Direct in-browser Google Authentication
                  </p>
                  <p className="text-[11px]">
                    Opens the official Google account chooser in a popup. Automatically retrieves your email and live storage quota without leaving this page!
                  </p>
                </div>

                {isConnectingGis ? (
                  <div className="py-6 space-y-2">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                    <p className="text-xs font-bold text-slate-600">{gisStatusText || 'Connecting to Google...'}</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGisConnect}
                    className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <Cloud className="w-5 h-5" />
                    <span>Sign In with Google Account</span>
                  </button>
                )}
              </div>
            )}

            {/* Tab 2: Direct Link Account */}
            {connectDriveTab === 'manual' && (
              <form onSubmit={handleManualDriveSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Google Account Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. wedding.studio@gmail.com"
                    value={manualDriveEmail}
                    onChange={e => setManualDriveEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Drive Purpose / Label</label>
                  <input
                    type="text"
                    placeholder="e.g. 2TB Wedding Deliverables Cloud"
                    value={manualDriveLabel}
                    onChange={e => setManualDriveLabel(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Total Account Capacity</label>
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {[
                      { label: '15 GB (Free)', value: 15 },
                      { label: '100 GB', value: 100 },
                      { label: '2 TB (2000 GB)', value: 2000 },
                      { label: '5 TB (5000 GB)', value: 5000 },
                    ].map(preset => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setManualDriveCapacityGb(preset.value)}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition cursor-pointer text-center ${
                          manualDriveCapacityGb === preset.value
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={manualDriveCapacityGb}
                      onChange={e => setManualDriveCapacityGb(Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                    />
                    <span className="text-xs font-bold text-slate-500 shrink-0">GB Total</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Current Used Space (Optional)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={manualDriveUsedGb}
                      onChange={e => setManualDriveUsedGb(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                    />
                    <span className="text-xs font-bold text-slate-500 shrink-0">GB Used</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition cursor-pointer shadow-md shadow-blue-600/20"
                  >
                    ⚡ Link Google Drive Now
                  </button>
                </div>
              </form>
            )}

            {/* Tab 3: OAuth Web Redirect */}
            {connectDriveTab === 'oauth' && (
              <div className="space-y-3 py-2 text-center">
                <p className="text-xs text-slate-600">
                  Redirects to Google accounts page. After sign-in, you will be redirected straight back to this Studio Storage page.
                </p>
                <a
                  href={`/api/storage/google/auth?workspace_id=${encodeURIComponent(effectiveWsId)}&return_url=/workspace/storage`}
                  className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Proceed with Web Redirect</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 3: ADD MEMORY CARD ── */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 border border-[#EAE5DA] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Add New Memory Card</h3>
                  <p className="text-xs text-slate-500 font-medium">Register card into studio inventory</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCardModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCardSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Card Name / Label *</label>
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
                    <option value="1000">1 TB (1000 GB)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Speed Class</label>
                <input
                  type="text"
                  value={newCardSpeed}
                  onChange={e => setNewCardSpeed(e.target.value)}
                  placeholder="e.g. V90 300MB/s, V60 150MB/s"
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
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer"
                >
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: ADD HARD DRIVE / SSD ── */}
      {showAddDiskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 border border-[#EAE5DA] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Add Hard Drive / SSD</h3>
                  <p className="text-xs text-slate-500 font-medium">Register storage drive into catalog</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDiskModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDiskSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Drive Name / Label *</label>
                <input
                  type="text"
                  required
                  value={newDiskName}
                  onChange={e => setNewDiskName(e.target.value)}
                  placeholder="e.g. Samsung T7 2TB #1, LaCie 4TB Rugged"
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

      {/* ── MODAL 5: INTERACTIVE GOOGLE DRIVE FOLDER PICKER ── */}
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

              {/* Breadcrumbs Trail */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1">
                {googleBreadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.id || idx}>
                    {idx > 0 && <span className="text-slate-300">/</span>}
                    <button
                      type="button"
                      onClick={() => handleBreadcrumbClick(crumb, idx)}
                      className={`font-bold hover:underline cursor-pointer ${
                        idx === googleBreadcrumbs.length - 1 ? 'text-blue-600' : 'text-slate-500'
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Folder List Content */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2 min-h-[220px]">
              {googleFolderLoading ? (
                <div className="py-16 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                  <p className="text-xs font-semibold text-slate-500">Loading Google Drive Folders...</p>
                </div>
              ) : googleFolders.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  No subfolders found in this directory. Create one below!
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
