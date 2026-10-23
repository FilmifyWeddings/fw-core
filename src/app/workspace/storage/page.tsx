'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HardDrive, Database, Search, Cloud, Plus, RefreshCw, 
  Folder, Film, Image as ImageIcon, CheckCircle2, AlertTriangle, ExternalLink, 
  Copy, Check, MapPin, User, Tag, Clock, ArrowUpRight, ShieldCheck, Sparkles, 
  Trash2, Edit3, Monitor, Layers, ChevronRight, Download, Filter, Eye, Cpu, Zap, X,
  FolderOpen, Laptop, CheckSquare, Square, ChevronDown, Building2, Calendar, FolderPlus,
  Users, CheckCircle, ArrowUpDown, Grid, List, FileText, Video, Music,
  MoreVertical, MoreHorizontal, Settings, ChevronUp, Moon, Link as LinkIcon, MessageSquare,
  UserPlus, Minus, Server, Disc
} from 'lucide-react';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import { supabase } from '@/lib/supabase';
import { getActiveGoogleClientId } from '@/lib/google-credentials';
import { fetchWorkspaceEventTypes, DEFAULT_EVENT_TYPES, type WorkspaceEventType } from '@/lib/workspace-settings';

// Clean drive types without parentheses
const DRIVE_TYPES = [
  { id: 'EXTERNAL_SSD', label: 'SSD', desc: 'USB 3.2 / Thunderbolt NVMe', badge: 'Fastest' },
  { id: 'HDD_RACK', label: 'HDD Rack', desc: 'High-Capacity Cold Storage', badge: 'Archive' },
  { id: 'INTERNAL_DRIVE', label: 'Internal Drive', desc: 'Workstation PCIe / SATA', badge: 'Local' },
  { id: 'NVME_SSD', label: 'NVMe SSD', desc: '4K/8K Editing Scratch Disk', badge: 'Ultra' },
  { id: 'NAS', label: 'NAS', desc: 'Central Multi-User Studio Storage', badge: 'Network' },
  { id: 'OTHER', label: 'Other / Pen Drive', desc: 'Portable Transfer Media', badge: 'Media' },
];

const formatCleanDriveType = (rawType?: string): string => {
  if (!rawType) return 'External Drive';
  const found = DRIVE_TYPES.find(t => t.id === rawType || t.label.toLowerCase() === rawType.toLowerCase());
  if (found) return found.label;
  return rawType.replace(/\s*\([^)]*\)/g, '').replace(/_/g, ' ').trim();
};

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

interface GoogleFolder {
  id: string;
  name: string;
  webViewLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  sizeBytes?: number;
  filesCount?: number;
  foldersCount?: number;
  formattedSize?: string;
}

interface GoogleFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string | null;
  webViewLink?: string;
  previewUrl?: string;
  sizeBytes: number;
  createdTime?: string;
  isImage?: boolean;
  isVideo?: boolean;
  isAudio?: boolean;
}

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
  notes?: string;
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
  color_tag?: string;
  notes?: string;
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
  id?: string;
  label?: string;
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

interface GoogleDriveBackupFolder {
  id: string;
  label?: string;
  name: string;
  webViewLink?: string;
  account_id?: string;
  account_email?: string;
  linked_at?: string;
}

// Utility to humanize bytes to MB / GB / TB
const formatBytesHuman = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 GB';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1000) return `${(gb / 1024).toFixed(1)} TB`;
  if (gb < 1) {
    const mb = bytes / (1024 * 1024);
    return `${Math.round(mb)} MB`;
  }
  return `${gb.toFixed(1)} GB`;
};

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
  folders?: GoogleDriveBackupFolder[];
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
  id: string;
  name: string;
  subEventNames?: string[];
  date: string;
  isDateTbd?: boolean;
  isOvernight?: boolean;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  shiftSlot?: string;
  venue: string;
  mapLink?: string;
  crew: { name: string; role: string }[];
  notes?: string;
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

  // Modals for Top Metric Cards
  const [showDriveAccountsModal, setShowDriveAccountsModal] = useState(false);
  const [showDisksListModal, setShowDisksListModal] = useState(false);
  const [showCardsListModal, setShowCardsListModal] = useState(false);
  const [showProjectsSummaryModal, setShowProjectsSummaryModal] = useState(false);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);

  // Active Crew Member Memory Card Popover
  const [activeCardAssignPopover, setActiveCardAssignPopover] = useState<{
    projectId: string;
    eventId: string;
    crewId: string;
  } | null>(null);
  const [cardAssignSearch, setCardAssignSearch] = useState('');

  // Google Folder Details Menu Popover state
  const [folderMenuOpenId, setFolderMenuOpenId] = useState<string | null>(null);
  const [folderDetailsModalData, setFolderDetailsModalData] = useState<GoogleFolder | null>(null);

  // Add Project hard disks threaded dropdown state
  const [isDiskSelectDropdownOpen, setIsDiskSelectDropdownOpen] = useState(false);
  const [diskSearchQuery, setDiskSearchQuery] = useState('');

  // 📂 Collapsible Project Cards & Dedicated Physical Drive Dropdowns state
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());
  const [openDiskDropdownProjectId, setOpenDiskDropdownProjectId] = useState<string | null>(null);
  const [projectDiskSearchQuery, setProjectDiskSearchQuery] = useState('');

  // Confirmation Modal state for Folder Deletion (Local & Drive)
  const [deleteFolderConfirmation, setDeleteFolderConfirmation] = useState<{
    type: 'local' | 'drive';
    projectId: string;
    folderIndexOrId: number | string;
    folderName: string;
    folderLabel: string;
  } | null>(null);

  // 3D Dropdown state for Multiple Google Drive Accounts in Explorer
  const [isGoogleAccountDropdownOpen, setIsGoogleAccountDropdownOpen] = useState(false);

  // 💽 3D Dropdown state for Local Folder Drive Selector
  const [openFolderDiskDropdownKey, setOpenFolderDiskDropdownKey] = useState<string | null>(null);

  // 🏷️ Studio Settings Event Types (Functions & Events)
  const [workspaceEventTypes, setWorkspaceEventTypes] = useState<WorkspaceEventType[]>(DEFAULT_EVENT_TYPES);

  // 🏷️ Manual Project Form shoot types state
  const [manualSelectedEventTypes, setManualSelectedEventTypes] = useState<string[]>(['Wedding Ceremony']);
  const [isManualShootTypeDropdownOpen, setIsManualShootTypeDropdownOpen] = useState(false);
  const [manualShootTypeSearch, setManualShootTypeSearch] = useState('');

  // 📝 Edit Details Modal state for Client Storage Project Cards (Isolated to Storage Hub)
  const [editingProjectModal, setEditingProjectModal] = useState<ProjectAsset | null>(null);
  const [editProjectClientName, setEditProjectClientName] = useState('');
  const [editProjectEventDate, setEditProjectEventDate] = useState('');
  const [editProjectShootTypes, setEditProjectShootTypes] = useState<string[]>([]);
  const [isEditShootTypeDropdownOpen, setIsEditShootTypeDropdownOpen] = useState(false);
  const [editShootTypeSearch, setEditShootTypeSearch] = useState('');
  const [savingEditProject, setSavingEditProject] = useState(false);

  const toggleCardExpansion = (projectId: string) => {
    setExpandedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const handleExpandAllCards = () => {
    setExpandedCardIds(new Set(projects.map(p => p.id)));
  };

  const handleCollapseAllCards = () => {
    setExpandedCardIds(new Set());
  };

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
  const [manualSelectedDiskIds, setManualSelectedDiskIds] = useState<string[]>([]);
  const [manualSubEvents, setManualSubEvents] = useState<ManualSubEventForm[]>([
    {
      id: 'sub_1',
      name: 'Wedding Ceremony',
      subEventNames: ['Wedding Ceremony'],
      date: new Date().toISOString().split('T')[0],
      isDateTbd: false,
      isOvernight: false,
      startTime: '09:00 AM',
      endTime: '02:00 PM',
      shiftSlot: 'None (Standard)',
      venue: '',
      mapLink: '',
      crew: [
        { name: 'Lead Photographer', role: 'Traditional Photography' },
        { name: 'Candid Cinematographer', role: 'Candid Cinematography' }
      ],
      notes: ''
    }
  ]);
  const [availableLeads, setAvailableLeads] = useState<any[]>([]);
  const [selectedLeadIdForProject, setSelectedLeadIdForProject] = useState('');
  const [savingProject, setSavingProject] = useState(false);

  // UI Display states
  const [showAllDriveAccounts, setShowAllDriveAccounts] = useState(false);
  const [expandedProjectIds, setExpandedProjectIds] = useState<Record<string, boolean>>({});

  // Connect Google Drive Form states
  const [connectDriveTab, setConnectDriveTab] = useState<'oauth' | 'manual' | 'gis'>('oauth');
  const [manualDriveEmail, setManualDriveEmail] = useState('');
  const [manualDriveLabel, setManualDriveLabel] = useState('Primary Wedding Deliverables');
  const [manualDriveCapacityGb, setManualDriveCapacityGb] = useState<number>(2000);
  const [manualDriveUsedGb, setManualDriveUsedGb] = useState<number>(0);
  const [isConnectingGis, setIsConnectingGis] = useState(false);
  const [gisStatusText, setGisStatusText] = useState('');

  // Google Folder Browser / Explorer states (Exact match with Google Drive Integration)
  const [selectedGoogleAccount, setSelectedGoogleAccount] = useState<DriveAccount | null>(null);
  const [googleFolders, setGoogleFolders] = useState<GoogleFolder[]>([]);
  const [googleFiles, setGoogleFiles] = useState<GoogleFile[]>([]);
  const [googleCurrentFolder, setGoogleCurrentFolder] = useState<any>({ id: 'root', name: 'My Drive' });
  const [googleBreadcrumbs, setGoogleBreadcrumbs] = useState<any[]>([{ id: 'root', name: 'My Drive' }]);
  const [googleFolderLoading, setGoogleFolderLoading] = useState(false);
  const [googleNextPageToken, setGoogleNextPageToken] = useState<string | null>(null);
  const [googleLoadingMore, setGoogleLoadingMore] = useState(false);
  const [selectedFolderForLink, setSelectedFolderForLink] = useState<any | null>(null);

  const [explorerSearch, setExplorerSearch] = useState('');
  const [explorerSortField, setExplorerSortField] = useState<'name' | 'date' | 'size'>('name');
  const [explorerSortOrder, setExplorerSortOrder] = useState<'asc' | 'desc'>('asc');
  const [explorerViewMode, setExplorerViewMode] = useState<'grid' | 'list'>('grid');
  const [explorerTotalFiles, setExplorerTotalFiles] = useState<number | null>(null);
  const [explorerTotalFolders, setExplorerTotalFolders] = useState<number | null>(null);
  const [explorerTotalSize, setExplorerTotalSize] = useState<string>('0 MB');
  const [explorerIsGlobalSearch, setExplorerIsGlobalSearch] = useState(false);
  const [explorerPreviewFile, setExplorerPreviewFile] = useState<GoogleFile | null>(null);

  const isValidWs = Boolean(
    effectiveWsId &&
    effectiveWsId !== '00000000-0000-0000-0000-000000000000' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveWsId)
  );

  // Load all initial data
  const loadStorageData = useCallback(async () => {
    if (!isValidWs) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [projRes, cardsRes, disksRes, drivesRes, eventTypesData] = await Promise.all([
        fetch(`/api/storage/projects?workspace_id=${effectiveWsId}`).then(r => r.json()),
        fetch(`/api/storage/cards?workspace_id=${effectiveWsId}`).then(r => r.json()),
        fetch(`/api/storage/disks?workspace_id=${effectiveWsId}`).then(r => r.json()),
        fetch(`/api/storage/google/accounts?workspace_id=${effectiveWsId}`).then(r => r.json()),
        fetchWorkspaceEventTypes(effectiveWsId).catch(() => DEFAULT_EVENT_TYPES),
      ]);

      if (projRes.success) setProjects(projRes.projects || []);
      if (cardsRes.success) setMemoryCards(cardsRes.cards || []);
      if (disksRes.success) setDisks(disksRes.disks || []);
      if (eventTypesData && eventTypesData.length > 0) {
        setWorkspaceEventTypes(eventTypesData);
      }
      if (drivesRes.success) {
        const accs = drivesRes.accounts || [];
        setDriveAccounts(accs);
        setSelectedGoogleAccount(prev => {
          if (prev && accs.some((a: any) => a.id === prev.id)) return prev;
          return accs.length > 0 ? accs[0] : null;
        });
      }
    } catch (err) {
      console.warn('[StorageHub] Error fetching storage data:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveWsId, isValidWs]);

  useEffect(() => {
    if (isValidWs) {
      loadStorageData();
    }
  }, [isValidWs, loadStorageData]);

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

  // Listen for popup Google OAuth completion message
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleMsg = (ev: MessageEvent) => {
      if (ev.data?.type === 'GOOGLE_DRIVE_CONNECTED') {
        setShowConnectDriveModal(false);
        setUrlToast({
          type: 'success',
          message: `🎉 Google Drive (${ev.data.email ? decodeURIComponent(ev.data.email) : 'Account'}) connected successfully!`
        });
        loadStorageData();
      }
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, [loadStorageData]);

  // Load available leads when opening manual project modal (Strictly Booked Clients Only)
  const handleOpenAddProjectModal = async () => {
    setShowAddProjectModal(true);
    setManualClientName('');
    setManualEventDate(new Date().toISOString().split('T')[0]);
    setSelectedLeadIdForProject('');
    setManualSelectedDiskIds([]);
    setManualSelectedEventTypes(['Wedding Ceremony']);
    setIsManualShootTypeDropdownOpen(false);
    setManualShootTypeSearch('');
    setManualSubEvents([
      {
        name: 'Wedding Ceremony',
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
      const rawLeads = res.leads || res.data || [];
      const bookedOnly = rawLeads.filter((l: any) => {
        const s = String(l.status || l.stage || '').toLowerCase();
        const rawStatus = String(l.raw_payload?.status || '').toLowerCase();
        return (
          s === 'booked' ||
          s === 'closed' ||
          s === 'converted' ||
          s.includes('book') ||
          s.includes('close') ||
          s.includes('won') ||
          Boolean(l.client_id) ||
          rawStatus === 'booked'
        );
      });
      setAvailableLeads(bookedOnly);
    } catch (_) {}
  };

  // Populate manual project modal from selected booked client
  const handleSelectLeadToAutofill = (leadId: string) => {
    setSelectedLeadIdForProject(leadId);
    const matched = availableLeads.find(l => l.id === leadId);
    if (!matched) return;

    const raw = matched.raw_payload || {};
    const name = raw.couple_name || raw.couple_names || matched.name || '';
    setManualClientName(name);
    setManualEventDate(matched.event_date || new Date().toISOString().split('T')[0]);

    const rawEvents = raw.events || raw.sub_events;
    if (Array.isArray(rawEvents) && rawEvents.length > 0) {
      const extractedTypes = rawEvents.map((ev: any) => ev.name || ev.title).filter(Boolean);
      if (extractedTypes.length > 0) {
        setManualSelectedEventTypes(extractedTypes);
      }
      setManualSubEvents(rawEvents.map((ev: any) => ({
        name: ev.name || ev.title || 'Wedding Ceremony',
        date: ev.date || matched.event_date || new Date().toISOString().split('T')[0],
        venue: ev.venue || matched.location || '',
        crew: Array.isArray(ev.crew || ev.team_members) && (ev.crew || ev.team_members).length > 0
          ? (ev.crew || ev.team_members).map((c: any) => ({
              name: c.name || c.member_name || 'Crew Member',
              role: c.role || 'Traditional Photography'
            }))
          : [
              { name: 'Lead Photographer', role: 'Traditional Photography' },
              { name: 'Candid Cinematographer', role: 'Candid Cinematography' }
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
  // Multi-Select Toggle Memory Card for Crew Member
  const handleToggleMemoryCardForCrew = async (projectId: string, eventId: string, crewId: string, card: MemoryCard) => {
    const targetProject = projects.find(p => p.id === projectId);
    if (!targetProject) return;

    let updatedSubEvents: SubEventItem[] = [];

    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      updatedSubEvents = p.sub_events.map(ev => {
        if (ev.id !== eventId) return ev;
        const updatedCrew = ev.crew.map(cr => {
          if (cr.id !== crewId) return cr;
          const currentCards = cr.assigned_card_ids || [];
          const currentNames = cr.assigned_card_names || [];
          const exists = currentCards.includes(card.id);
          const nextCards = exists ? currentCards.filter(id => id !== card.id) : [...currentCards, card.id];
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

    try {
      await fetch('/api/storage/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId, sub_events: updatedSubEvents }),
      });
    } catch (err) {
      console.warn('Failed to update crew memory card:', err);
    }
  };

  // Card update handlers (Single Card fallback)
  const handleAssignMemoryCard = async (projectId: string, eventId: string, crewId: string, cardId: string) => {
    const card = memoryCards.find(c => c.id === cardId);
    if (!card) return;
    await handleToggleMemoryCardForCrew(projectId, eventId, crewId, card);
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

  // 💽 Helper to extract assigned disk IDs from project notes or assigned_disks
  const getProjectAssignedDiskIds = (project: ProjectAsset): string[] => {
    if (project.notes) {
      try {
        const match = project.notes.match(/assigned_disk_ids:\s*(\[[^\]]*\])/);
        if (match && match[1]) {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (_) {}
    }
    const fromDisks = (project.assigned_disks || []).map(d => d.disk_id).filter(Boolean);
    return Array.from(new Set(fromDisks));
  };

  // 🏷️ Helper to extract shoot types / event types for a client storage card
  const getProjectShootTypes = (project: ProjectAsset): string[] => {
    if (project.notes) {
      try {
        const match = project.notes.match(/shoot_types:\s*(\[[^\]]*\])/);
        if (match && match[1]) {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (_) {}
    }
    // Fallback: extract distinct event names from project.sub_events
    if (project.sub_events && project.sub_events.length > 0) {
      const fromSubs = project.sub_events
        .map(se => se.name?.trim())
        .filter((n): n is string => Boolean(n) && n !== 'Project Folder');
      if (fromSubs.length > 0) return Array.from(new Set(fromSubs));
    }
    return [];
  };

  // 📝 Save updated storage project card details (Client Name, Date, Shoot Types)
  // Strictly isolated to storage_project_assets - zero side-effects on CRM leads or quotations
  const handleSaveProjectDetails = async () => {
    if (!editingProjectModal) return;
    if (!editProjectClientName.trim()) {
      alert('Client / Wedding name cannot be empty');
      return;
    }
    setSavingEditProject(true);
    try {
      const targetProject = editingProjectModal;
      let newNotes = targetProject.notes || '';
      const tag = `shoot_types: ${JSON.stringify(editProjectShootTypes)}`;
      if (newNotes.includes('shoot_types:')) {
        newNotes = newNotes.replace(/shoot_types:\s*(\[[^\]]*\])/, tag);
      } else {
        newNotes = newNotes ? `${newNotes}\n${tag}` : tag;
      }

      // Also ensure sub_events has the shoot types represented
      const existingSubEvents = targetProject.sub_events || [];
      const updatedSubEvents: SubEventItem[] = [...existingSubEvents];

      editProjectShootTypes.forEach((st, idx) => {
        const exists = updatedSubEvents.some(se => se.name.toLowerCase() === st.toLowerCase());
        if (!exists) {
          updatedSubEvents.push({
            id: `ev_${Date.now()}_${idx}`,
            name: st,
            date: editProjectEventDate || targetProject.event_date || new Date().toISOString().split('T')[0],
            venue: '',
            crew: [
              {
                id: `cr_${Date.now()}_${idx}_1`,
                name: 'Lead Photographer',
                role: 'Traditional Photography',
                assigned_card_ids: [],
                assigned_card_names: [],
                is_copied: false,
                copied_at: null,
                copied_by: null,
              }
            ]
          });
        }
      });

      const payload = {
        id: targetProject.id,
        client_name: editProjectClientName.trim(),
        event_date: editProjectEventDate || targetProject.event_date || '',
        notes: newNotes,
        sub_events: updatedSubEvents,
      };

      const res = await fetch('/api/storage/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.project) {
        setProjects(prev => prev.map(p => p.id === targetProject.id ? { ...p, ...json.project } : p));
        setEditingProjectModal(null);
        setUrlToast({
          type: 'success',
          message: `🎉 Storage card details updated for "${editProjectClientName.trim()}"!`
        });
      } else {
        // Optimistic local fallback
        setProjects(prev => prev.map(p => p.id === targetProject.id ? {
          ...p,
          client_name: editProjectClientName.trim(),
          event_date: editProjectEventDate,
          notes: newNotes,
          sub_events: updatedSubEvents,
        } : p));
        setEditingProjectModal(null);
        setUrlToast({
          type: 'success',
          message: `Storage card details updated locally!`
        });
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to update storage project details');
    } finally {
      setSavingEditProject(false);
    }
  };

  // Toggle physical hard drive / SSD assignment for a client project (supports multiple drives)
  const handleToggleProjectDisk = async (projectId: string, diskId: string) => {
    const targetProject = projects.find(p => p.id === projectId);
    if (!targetProject) return;

    const currentIds = getProjectAssignedDiskIds(targetProject);
    const isAdding = !currentIds.includes(diskId);
    const nextIds = isAdding
      ? [...currentIds, diskId]
      : currentIds.filter(id => id !== diskId);

    // Ensure assigned_disks array properly contains the disk allocation item
    let updatedDisks = [...(targetProject.assigned_disks || [])];
    if (isAdding) {
      const diskObj = disks.find(d => d.id === diskId);
      if (diskObj && !updatedDisks.some(d => d.disk_id === diskId)) {
        updatedDisks.push({
          id: `disk_assign_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          disk_id: diskObj.id,
          disk_name: diskObj.disk_name,
          drive_type: diskObj.disk_type || 'EXTERNAL_SSD',
          label: `${targetProject.client_name} Footage`,
          folder_name: targetProject.client_name,
          folder_path: `${diskObj.drive_letter ? diskObj.drive_letter + ':/' : ''}${targetProject.client_name}`,
          role: 'Raw Dump',
          total_size_gb: 0,
          file_count: 0,
          photo_count: 0,
          video_count: 0,
        });
      }
    } else {
      updatedDisks = updatedDisks.filter(d => d.disk_id !== diskId);
    }

    // Update notes safely to persist multi-assigned disk IDs
    let newNotes = targetProject.notes || '';
    const tag = `assigned_disk_ids: ${JSON.stringify(nextIds)}`;
    if (newNotes.includes('assigned_disk_ids:')) {
      newNotes = newNotes.replace(/assigned_disk_ids:\s*(\[[^\]]*\])/, tag);
    } else {
      newNotes = newNotes ? `${newNotes}\n${tag}` : tag;
    }

    setProjects(prev => prev.map(p => p.id === projectId ? {
      ...p,
      notes: newNotes,
      assigned_disks: updatedDisks
    } : p));

    try {
      const res = await fetch('/api/storage/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId, notes: newNotes, assigned_disks: updatedDisks })
      });
      if (!res.ok) throw new Error('API PATCH failed');
    } catch (err) {
      console.warn('API PATCH failed, persisting directly to Supabase:', err);
      try {
        await supabase
          .from('storage_project_assets')
          .update({
            notes: newNotes,
            assigned_disks: updatedDisks,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId);
      } catch (dbErr) {
        console.error('Direct Supabase update failed:', dbErr);
      }
    }
  };

  // Sync Live Drive Account Quota
  const handleSyncDriveAccount = async (accountId: string) => {
    setSyncingAccountId(accountId);
    try {
      const res = await fetch('/api/storage/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId }),
      });
      const data = await res.json();
      if (data.success && data.account) {
        setDriveAccounts(prev => prev.map(a => a.id === accountId ? {
          ...a,
          total_storage_bytes: data.account.total_storage_bytes,
          used_storage_bytes: data.account.used_storage_bytes,
          last_synced_at: data.account.last_synced_at,
        } : a));
        setUrlToast({
          type: 'success',
          message: 'Storage quota synced successfully!'
        });
      }
    } catch (err) {
      console.warn('Sync failed:', err);
    } finally {
      setSyncingAccountId(null);
    }
  };

  // Add a new Local Event Folder to a Client Project
  // Add a new Local Event Folder to a Client Project
  const handleAddLocalFolder = async (projectId: string) => {
    const targetProject = projects.find(p => p.id === projectId);
    if (!targetProject) return;

    const assignedIds = getProjectAssignedDiskIds(targetProject);
    const matchedAssignedDisks = disks.filter(d => assignedIds.includes(d.id));
    const activeDisk = matchedAssignedDisks[0] || disks.find(d => targetProject.assigned_disks?.some(ad => ad.disk_id === d.id)) || disks[0];
    const diskId = activeDisk?.id || '';
    const diskName = activeDisk?.disk_name || 'Primary Storage';
    const driveType = activeDisk?.disk_type || 'External HDD';

    let folderName = '';
    let folderPath = '';
    let totalSizeGb = 0;
    let fileCount = 0;
    let photoCount = 0;
    let videoCount = 0;

    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
        if (dirHandle) {
          folderName = dirHandle.name;
          folderPath = `${diskName} (${driveType})/${folderName}`;
          
          let totalBytes = 0;
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
          totalSizeGb = Number((totalBytes / (1024 * 1024 * 1024)).toFixed(2));
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    const existingCount = targetProject.assigned_disks?.length || 0;
    const defaultLabels = ['Pre-Wedding', 'Wedding', 'Reception', 'Haldi', 'Sangeet', 'Engagement'];
    const assignedLabel = folderName ? folderName.replace(/_/g, ' ') : (defaultLabels[existingCount % defaultLabels.length] || `Event Folder ${existingCount + 1}`);

    const newFolder: AssignedDiskItem = {
      id: `local_f_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      label: assignedLabel,
      disk_id: diskId,
      disk_name: diskName,
      drive_type: driveType,
      role: 'Raw Dump',
      folder_path: folderPath || `${diskName} (${driveType})/${assignedLabel.replace(/[^a-zA-Z0-9]/g, '_')}_RAW`,
      folder_name: folderName || `${assignedLabel}_RAW`,
      total_size_gb: totalSizeGb,
      file_count: fileCount,
      photo_count: photoCount,
      video_count: videoCount,
      last_scanned_at: new Date().toISOString(),
      scanned_on_machine: typeof window !== 'undefined' && window.navigator.userAgent.includes('Mac') ? 'Mac Studio' : 'Windows Rig',
    };

    const updatedDisks = [...(targetProject.assigned_disks || []), newFolder];

    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, assigned_disks: updatedDisks } : p));

    await fetch('/api/storage/projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: projectId, assigned_disks: updatedDisks }),
    });
  };

  // Update Local Folder Label (e.g. "Pre-Wedding", "Wedding", "Haldi")
  const handleUpdateLocalFolderLabel = async (projectId: string, folderIdx: number, newLabel: string) => {
    const targetProject = projects.find(p => p.id === projectId);
    if (!targetProject) return;

    const updatedDisks = targetProject.assigned_disks.map((d, i) => {
      if (i !== folderIdx) return d;
      return { ...d, label: newLabel };
    });

    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, assigned_disks: updatedDisks } : p));

    await fetch('/api/storage/projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: projectId, assigned_disks: updatedDisks }),
    });
  };

  // Update which hard disk/SSD a local folder is stored on
  const handleUpdateLocalFolderDisk = async (projectId: string, folderIdx: number, newDiskId: string) => {
    const targetProject = projects.find(p => p.id === projectId);
    if (!targetProject) return;
    const chosenDisk = disks.find(d => d.id === newDiskId);
    const diskName = chosenDisk?.disk_name || 'Primary Storage';
    const driveType = chosenDisk?.disk_type || 'External HDD';

    const updatedDisks = targetProject.assigned_disks.map((d, i) => {
      if (i !== folderIdx) return d;
      const existingFolderOnly = d.folder_name || d.folder_path?.split('/').pop() || 'RAW';
      return {
        ...d,
        disk_id: newDiskId,
        disk_name: diskName,
        drive_type: driveType,
        folder_path: `${diskName} (${driveType})/${existingFolderOnly}`,
      };
    });

    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, assigned_disks: updatedDisks } : p));

    await fetch('/api/storage/projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: projectId, assigned_disks: updatedDisks }),
    });
  };

  // Remove a Local Folder from project
  const handleRemoveLocalFolder = async (projectId: string, folderIdx: number) => {
    const targetProject = projects.find(p => p.id === projectId);
    if (!targetProject) return;

    const updatedDisks = targetProject.assigned_disks.filter((_, i) => i !== folderIdx);

    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, assigned_disks: updatedDisks } : p));

    await fetch('/api/storage/projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: projectId, assigned_disks: updatedDisks }),
    });
  };

  // Execute confirmed folder removal from modal (Local or Drive)
  const handleConfirmDeleteFolder = async () => {
    if (!deleteFolderConfirmation) return;
    const { type, projectId, folderIndexOrId } = deleteFolderConfirmation;
    if (type === 'local') {
      await handleRemoveLocalFolder(projectId, Number(folderIndexOrId));
    } else {
      await handleUnlinkGoogleFolder(projectId, String(folderIndexOrId));
    }
    setDeleteFolderConfirmation(null);
  };

  // HTML5 Native File System Access API - Pick / Change Folder
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

      const assignedIds = getProjectAssignedDiskIds(targetProject);
      const matchedAssignedDisks = disks.filter(d => assignedIds.includes(d.id));
      const activeDisk = matchedAssignedDisks[0] || disks.find(d => targetProject.assigned_disks?.some(ad => ad.disk_id === d.id)) || disks[0];
      const diskPrefix = activeDisk?.disk_name ? `${activeDisk.disk_name} (${activeDisk.disk_type || 'External HDD'})` : 'Local Storage';

      const updatedDisks = [...(targetProject.assigned_disks || [])];
      if (updatedDisks[diskItemIndex]) {
        const existing = updatedDisks[diskItemIndex];
        updatedDisks[diskItemIndex] = {
          ...existing,
          disk_id: existing.disk_id || activeDisk?.id || '',
          disk_name: existing.disk_name || activeDisk?.disk_name || diskPrefix,
          drive_type: existing.drive_type || activeDisk?.disk_type || 'External HDD',
          label: existing.label || folderName.replace(/_/g, ' '),
          folder_name: folderName,
          folder_path: `${diskPrefix}/${folderName}`,
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

  // Update Google Drive Folder Label (e.g. "Pre-Wedding", "Wedding", "Deliverables")
  const handleUpdateDriveFolderLabel = async (projectId: string, folderId: string, newLabel: string) => {
    const targetProject = projects.find(p => p.id === projectId);
    if (!targetProject) return;

    const currentFolders = targetProject.google_drive_backup?.folders || [];
    const updatedFolders = currentFolders.map(f => {
      if (f.id !== folderId) return f;
      return { ...f, label: newLabel };
    });

    const updatedBackup = {
      ...targetProject.google_drive_backup,
      folders: updatedFolders,
    };

    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, google_drive_backup: updatedBackup } : p));

    await fetch('/api/storage/projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: projectId, google_drive_backup: updatedBackup }),
    });
  };

  // Copy local folder path
  const handleCopyPath = (path: string, id: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPathId(id);
    setTimeout(() => setCopiedPathId(null), 2500);
  };

  // ── FULL GOOGLE DRIVE EXPLORER METHODS (Exact match with Google Drive Integration) ──

  // Format Bytes helper
  const formatBytes = (bytes?: number) => {
    if (!bytes || isNaN(bytes) || bytes === 0) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb < 1) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (gb >= 1000) return (gb / 1024).toFixed(1) + ' TB';
    return gb.toFixed(1) + ' GB';
  };

  // Fetch Folder Contents inside Explorer Modal (100-item paging, real stats upfront & deep search)
  const loadExplorerFolder = useCallback(async (
    accountId: string,
    parentId: string = 'root',
    pageToken?: string,
    fetchAll: boolean = false,
    searchQuery?: string
  ) => {
    try {
      if (pageToken) {
        setGoogleLoadingMore(true);
      } else {
        setGoogleFolderLoading(true);
      }
      let url = `/api/storage/google/folders?account_id=${encodeURIComponent(accountId)}&parent_id=${encodeURIComponent(parentId)}&workspace_id=${encodeURIComponent(effectiveWsId)}`;
      if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
      if (fetchAll) {
        url += `&fetch_all=true`;
      } else {
        url += `&page_size=100`;
      }
      if (searchQuery && searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (pageToken) {
            setGoogleFolders(prev => [...prev, ...(data.folders || [])]);
            setGoogleFiles(prev => [...prev, ...(data.files || [])]);
          } else {
            setGoogleFolders(data.folders || []);
            setGoogleFiles(data.files || []);
            setExplorerTotalFiles(typeof data.total_files_count === 'number' ? data.total_files_count : (data.files || []).length);
            setExplorerTotalFolders(typeof data.total_folders_count === 'number' ? data.total_folders_count : (data.folders || []).length);
            setExplorerTotalSize(data.total_size_formatted || '0 MB');
            setExplorerIsGlobalSearch(Boolean(data.is_search_result));
          }
          setGoogleNextPageToken(data.nextPageToken || null);
          if (data.currentFolder?.name) {
            setGoogleCurrentFolder(data.currentFolder);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load explorer folder:', err);
    } finally {
      setGoogleFolderLoading(false);
      setGoogleLoadingMore(false);
    }
  }, [effectiveWsId]);

  // Deep Google Drive Search with 400ms debounce
  useEffect(() => {
    if (!showGooglePickerModal || !selectedGoogleAccount) return;

    const timer = setTimeout(() => {
      const q = explorerSearch.trim();
      if (q.length >= 2) {
        loadExplorerFolder(selectedGoogleAccount.id, googleCurrentFolder.id, undefined, false, q);
      } else if (q.length === 0 && explorerIsGlobalSearch) {
        setExplorerIsGlobalSearch(false);
        loadExplorerFolder(selectedGoogleAccount.id, googleCurrentFolder.id);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [explorerSearch, showGooglePickerModal, selectedGoogleAccount, googleCurrentFolder.id, explorerIsGlobalSearch, loadExplorerFolder]);

  // Open Explorer for a specific connected account
  const handleOpenExplorerForAccount = (account: DriveAccount) => {
    setSelectedGoogleAccount(account);
    setActiveProjectForGoogle(null);
    setGoogleBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
    setGoogleCurrentFolder({ id: 'root', name: 'My Drive' });
    setExplorerSearch('');
    setExplorerIsGlobalSearch(false);
    setExplorerTotalFiles(null);
    setExplorerTotalFolders(null);
    setExplorerTotalSize('0 MB');
    setGoogleNextPageToken(null);
    setShowGooglePickerModal(true);
    loadExplorerFolder(account.id, 'root');
  };

  // Open Explorer from a Project Card to Link Google Drive
  const handleOpenGooglePicker = (project: ProjectAsset) => {
    setActiveProjectForGoogle(project);
    const acc = selectedGoogleAccount || (driveAccounts.length > 0 ? driveAccounts[0] : null);
    if (acc) {
      setSelectedGoogleAccount(acc);
      setGoogleBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
      setGoogleCurrentFolder({ id: 'root', name: 'My Drive' });
      setExplorerSearch('');
      setExplorerIsGlobalSearch(false);
      setExplorerTotalFiles(null);
      setExplorerTotalFolders(null);
      setExplorerTotalSize('0 MB');
      setGoogleNextPageToken(null);
      setShowGooglePickerModal(true);
      loadExplorerFolder(acc.id, 'root');
    } else {
      setShowConnectDriveModal(true);
      setUrlToast({
        type: 'warning',
        message: 'Please connect a Google Drive account first to link backup folders!'
      });
    }
  };

  // Navigate deeper into subfolder
  const handleExplorerNavigateFolder = (folder: GoogleFolder) => {
    setGoogleBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    setGoogleCurrentFolder({ id: folder.id, name: folder.name });
    setExplorerSearch('');
    setExplorerIsGlobalSearch(false);
    setExplorerTotalFiles(null);
    setExplorerTotalFolders(null);
    setExplorerTotalSize('0 MB');
    if (selectedGoogleAccount) {
      loadExplorerFolder(selectedGoogleAccount.id, folder.id);
    }
  };

  // Navigate via breadcrumb click
  const handleExplorerBreadcrumbClick = (idx: number) => {
    const target = googleBreadcrumbs[idx];
    const newBreadcrumbs = googleBreadcrumbs.slice(0, idx + 1);
    setGoogleBreadcrumbs(newBreadcrumbs);
    setGoogleCurrentFolder(target);
    setExplorerSearch('');
    setExplorerIsGlobalSearch(false);
    setExplorerTotalFiles(null);
    setExplorerTotalFolders(null);
    setExplorerTotalSize('0 MB');
    if (selectedGoogleAccount) {
      loadExplorerFolder(selectedGoogleAccount.id, target.id);
    }
  };

  // Load next 100 files
  const handleExplorerLoadMore = () => {
    if (selectedGoogleAccount && googleNextPageToken && !googleLoadingMore) {
      loadExplorerFolder(selectedGoogleAccount.id, googleCurrentFolder.id, googleNextPageToken, false, explorerSearch.trim());
    }
  };

  // Load all files
  const handleExplorerLoadAll = () => {
    if (selectedGoogleAccount && !googleLoadingMore) {
      loadExplorerFolder(selectedGoogleAccount.id, googleCurrentFolder.id, undefined, true, explorerSearch.trim());
    }
  };

  // Link selected Google Drive folder to Active Project
  // Link selected Google Drive folder to Active Project (Supports Multiple Folders)
  const handleLinkFolderToProject = async (folder: GoogleFolder | { id: string; name: string; webViewLink?: string }) => {
    if (!activeProjectForGoogle || !selectedGoogleAccount) return;

    const currentBackup = activeProjectForGoogle.google_drive_backup || {};
    let currentFolders: GoogleDriveBackupFolder[] = [];
    if (Array.isArray(currentBackup.folders) && currentBackup.folders.length > 0) {
      currentFolders = [...currentBackup.folders];
    } else if (currentBackup.folder_id && currentBackup.folder_name) {
      currentFolders = [{
        id: currentBackup.folder_id,
        name: currentBackup.folder_name,
        webViewLink: currentBackup.web_view_link,
        account_id: currentBackup.account_id,
        account_email: currentBackup.account_email,
        linked_at: currentBackup.backed_up_at,
      }];
    }

    const newFolderObj: GoogleDriveBackupFolder = {
      id: folder.id,
      label: folder.name.replace(/_/g, ' '),
      name: folder.name,
      webViewLink: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`,
      account_id: selectedGoogleAccount.id,
      account_email: selectedGoogleAccount.account_email,
      linked_at: new Date().toISOString(),
    };

    const alreadyExists = currentFolders.some(f => f.id === folder.id);
    const updatedFolders = alreadyExists ? currentFolders : [...currentFolders, newFolderObj];

    const backupPayload: GoogleDriveBackupItem = {
      is_backed_up: true,
      account_id: selectedGoogleAccount.id,
      account_email: selectedGoogleAccount.account_email,
      folder_id: folder.id,
      folder_name: folder.name,
      web_view_link: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`,
      backup_status: 'COMPLETED',
      backed_up_at: new Date().toISOString(),
      folders: updatedFolders,
    };

    setProjects(prev => prev.map(p => p.id === activeProjectForGoogle.id ? {
      ...p,
      google_drive_backup: backupPayload,
      overall_storage_status: 'BACKED_UP_CLOUD',
    } : p));

    setShowGooglePickerModal(false);
    setUrlToast({
      type: 'success',
      message: `🎉 Google Drive folder "${folder.name}" linked to ${activeProjectForGoogle.client_name}!`
    });

    try {
      await fetch('/api/storage/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeProjectForGoogle.id,
          google_drive_backup: backupPayload,
          overall_storage_status: 'BACKED_UP_CLOUD',
        }),
      });
    } catch (err) {
      console.warn('Failed to persist google drive backup:', err);
    }
  };

  // Unlink a specific Google Drive folder from a project
  const handleUnlinkGoogleFolder = async (projectId: string, folderId: string) => {
    const targetProject = projects.find(p => p.id === projectId);
    if (!targetProject) return;

    const currentBackup = targetProject.google_drive_backup || {};
    let currentFolders: GoogleDriveBackupFolder[] = [];
    if (Array.isArray(currentBackup.folders) && currentBackup.folders.length > 0) {
      currentFolders = currentBackup.folders;
    } else if (currentBackup.folder_id) {
      currentFolders = [{
        id: currentBackup.folder_id,
        name: currentBackup.folder_name || 'Root Folder',
        webViewLink: currentBackup.web_view_link,
        account_id: currentBackup.account_id,
        account_email: currentBackup.account_email,
      }];
    }

    const updatedFolders = currentFolders.filter(f => f.id !== folderId);
    const stillHasFolders = updatedFolders.length > 0;

    const backupPayload: GoogleDriveBackupItem = {
      ...currentBackup,
      is_backed_up: stillHasFolders,
      folder_id: stillHasFolders ? updatedFolders[0].id : undefined,
      folder_name: stillHasFolders ? updatedFolders[0].name : undefined,
      web_view_link: stillHasFolders ? updatedFolders[0].webViewLink : undefined,
      folders: updatedFolders,
    };

    const allCopied = targetProject.sub_events?.length > 0 && targetProject.sub_events.every(ev => ev.crew?.every(c => c.is_copied));
    const nextStatus = stillHasFolders ? 'BACKED_UP_CLOUD' : (allCopied ? 'COPIED_LOCAL' : 'INGESTING');

    setProjects(prev => prev.map(p => p.id === projectId ? {
      ...p,
      google_drive_backup: backupPayload,
      overall_storage_status: nextStatus as any,
    } : p));

    try {
      await fetch('/api/storage/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: projectId,
          google_drive_backup: backupPayload,
          overall_storage_status: nextStatus,
        }),
      });
    } catch (err) {
      console.warn('Failed to unlink Google Drive folder:', err);
    }
  };

  // Filter and sort items in Explorer
  const sortedExplorerFolders = useMemo(() => {
    const list = [...googleFolders];
    return list.sort((a, b) => {
      if (explorerSortField === 'name') {
        return explorerSortOrder === 'asc'
          ? (a.name || '').localeCompare(b.name || '')
          : (b.name || '').localeCompare(a.name || '');
      }
      return 0;
    });
  }, [googleFolders, explorerSortField, explorerSortOrder]);

  const sortedExplorerFiles = useMemo(() => {
    const list = [...googleFiles];
    return list.sort((a, b) => {
      if (explorerSortField === 'name') {
        return explorerSortOrder === 'asc'
          ? (a.name || '').localeCompare(b.name || '')
          : (b.name || '').localeCompare(a.name || '');
      }
      if (explorerSortField === 'size') {
        const szA = a.sizeBytes || 0;
        const szB = b.sizeBytes || 0;
        return explorerSortOrder === 'asc' ? szA - szB : szB - szA;
      }
      return 0;
    });
  }, [googleFiles, explorerSortField, explorerSortOrder]);

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
      const selectedDisks = disks.filter(d => manualSelectedDiskIds.includes(d.id));
      const assignedDisksPayload: AssignedDiskItem[] = selectedDisks.map(selectedDisk => ({
        disk_id: selectedDisk.id,
        disk_name: selectedDisk.disk_name,
        drive_type: selectedDisk.disk_type,
        role: 'Primary Raw Archive',
        folder_path: `${selectedDisk.disk_name}/${manualClientName.replace(/[^a-zA-Z0-9]/g, '_')}_RAW`,
        folder_name: `${manualClientName.trim()}_RAW`,
        total_size_gb: 0,
        file_count: 0,
      }));

      let notes = '';
      if (manualSelectedDiskIds.length > 0) {
        notes += `assigned_disk_ids: ${JSON.stringify(manualSelectedDiskIds)}\n`;
      }
      if (manualSelectedEventTypes.length > 0) {
        notes += `shoot_types: ${JSON.stringify(manualSelectedEventTypes)}\n`;
      }

      let formattedSubEvents: SubEventItem[] = [];
      if (manualSelectedEventTypes.length > 0) {
        formattedSubEvents = manualSelectedEventTypes.map((st, sIdx) => ({
          id: `ev_${sIdx + 1}_${Date.now()}`,
          name: st.trim(),
          date: manualEventDate || new Date().toISOString().split('T')[0],
          venue: '',
          crew: [
            {
              id: `cr_${sIdx + 1}_1`,
              name: 'Lead Photographer',
              role: 'Traditional Photography',
              assigned_card_ids: [],
              assigned_card_names: [],
              is_copied: false,
              copied_at: null,
              copied_by: null,
            },
            {
              id: `cr_${sIdx + 1}_2`,
              name: 'Candid Cinematographer',
              role: 'Candid Cinematography',
              assigned_card_ids: [],
              assigned_card_names: [],
              is_copied: false,
              copied_at: null,
              copied_by: null,
            }
          ]
        }));
      } else {
        formattedSubEvents = manualSubEvents.map((ev, evIdx) => ({
          id: `ev_${evIdx + 1}_${Date.now()}`,
          name: ev.name.trim() || `Event ${evIdx + 1}`,
          date: ev.date || manualEventDate || new Date().toISOString().split('T')[0],
          venue: ev.venue || '',
          crew: ev.crew.map((c, cIdx) => ({
            id: `cr_${evIdx + 1}_${cIdx + 1}`,
            name: c.name.trim() || `Crew Member ${cIdx + 1}`,
            role: c.role || 'Traditional Photography',
            assigned_card_ids: [],
            assigned_card_names: [],
            is_copied: false,
            copied_at: null,
            copied_by: null,
          }))
        }));
      }

      const matchedLead = availableLeads.find(l => l.id === selectedLeadIdForProject);
      const payload = {
        workspace_id: effectiveWsId,
        lead_id: selectedLeadIdForProject || `manual_${Date.now()}`,
        client_name: manualClientName.trim(),
        event_date: manualEventDate || new Date().toISOString().split('T')[0],
        package_amount: Number(matchedLead?.budget) || 0,
        sub_events: formattedSubEvents,
        assigned_disks: assignedDisksPayload,
        google_drive_backup: {},
        overall_storage_status: 'INGESTING',
        notes: notes.trim(),
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

  // Google OAuth Popup Window Flow
  const handleOAuthPopup = () => {
    if (typeof window === 'undefined') return;
    if (!isValidWs) {
      alert('Studio workspace is loading. Please wait a moment and try again.');
      return;
    }
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    const authUrl = `/api/storage/google/auth?workspace_id=${encodeURIComponent(effectiveWsId)}&return_url=/workspace/storage`;
    window.open(authUrl, 'google_oauth_popup', `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`);
  };

  // Google Identity Services (GIS) One-Click Sign-In
  const handleGisConnect = () => {
    if (typeof window === 'undefined') return;
    if (!isValidWs) {
      alert('Studio workspace is loading. Please wait a moment and try again.');
      return;
    }
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
      const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || getActiveGoogleClientId();
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.metadata.readonly',
        prompt: 'select_account',
        callback: async (resp: any) => {
          if (resp.error) {
            setIsConnectingGis(false);
            setGisStatusText('');
            const errStr = String(resp.error || '');
            if (errStr.includes('origin') || errStr.includes('popup_closed') || errStr.includes('invalid_client')) {
              setConnectDriveTab('manual');
              setUrlToast({
                type: 'warning',
                message: 'Google Cloud origin not registered. Switched to Instant Direct Link tab!'
              });
            } else {
              alert('Google Sign-In cancelled or failed: ' + resp.error);
            }
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
      setConnectDriveTab('manual');
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
      const res = await fetch(`/api/storage/google/accounts?id=${id}&workspace_id=${effectiveWsId}`, { method: 'DELETE' });
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

    const totalDriveBytes = driveAccounts.reduce((acc, a) => acc + (a.total_storage_bytes || (2000 * 1024 * 1024 * 1024)), 0);
    const usedDriveBytes = driveAccounts.reduce((acc, a) => acc + (a.used_storage_bytes || 0), 0);
    const totalDriveTb = Number((totalDriveBytes / (1024 * 1024 * 1024 * 1024)).toFixed(1));
    const usedDriveTb = Number((usedDriveBytes / (1024 * 1024 * 1024 * 1024)).toFixed(1));

    return {
      totalProjects,
      ingestingCount,
      copiedCount,
      cloudCount,
      totalDisks,
      totalDiskCapacityTb,
      freeDiskCapacityTb,
      totalDriveBytes,
      usedDriveBytes,
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
          <div className="w-full max-w-[1600px] mx-auto flex-1 flex items-center gap-2">
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
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 shadow-xs">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Storage & Media Hub
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
                onClick={loadStorageData}
                className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 transition cursor-pointer"
                title="Refresh Storage Hub"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── METRICS OVERVIEW CARDS (Interactive Popovers) ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            {/* Metric 1: Booked Projects */}
            <div 
              className="p-3.5 bg-[#FAF8F3] border border-[#EBE6DB] rounded-2xl flex items-center justify-between gap-3 shadow-2xs group"
            >
              <div className="flex items-center gap-3 min-w-0">
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
            </div>

            {/* Metric 2: Registered Memory Cards */}
            <div 
              onClick={() => setShowCardsListModal(true)}
              className="p-3.5 bg-[#FAF8F3] hover:bg-[#F5F1E8] border border-[#EBE6DB] hover:border-emerald-400 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition shadow-2xs hover:shadow-xs group"
              title="Click to view all Registered Memory Cards"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <SDCardIcon className="w-5 h-5" />
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
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
            </div>

            {/* Metric 3: Physical Disks & SSDs */}
            <div 
              onClick={() => setShowDisksListModal(true)}
              className="p-3.5 bg-[#FAF8F3] hover:bg-[#F5F1E8] border border-[#EBE6DB] hover:border-indigo-400 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition shadow-2xs hover:shadow-xs group"
              title="Click to view all Registered Physical Hard Drives & SSDs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
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
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition" />
            </div>

            {/* Metric 4: Connected Google Drive Accounts */}
            <div 
              onClick={() => setShowDriveAccountsModal(true)}
              className="p-3.5 bg-[#FAF8F3] hover:bg-[#F5F1E8] border border-[#EBE6DB] hover:border-blue-400 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition shadow-2xs hover:shadow-xs group"
              title="Click to view Connected Google Drive Accounts"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#EBE6DB] flex items-center justify-center p-2 shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                  <svg viewBox="0 0 87.3 78" className="w-6 h-6">
                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-black text-slate-900 leading-none">
                    {driveAccounts.length} Drive Accs
                  </div>
                  <div className="text-[11px] text-slate-500 font-semibold mt-1 truncate">
                    {formatBytesHuman(stats.usedDriveBytes)} / {formatBytesHuman(stats.totalDriveBytes)} Used
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT CONTAINER (Edge-to-Edge 1600px) ── */}
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 pt-6 space-y-6">

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

            <button
              type="button"
              onClick={expandedCardIds.size === filteredProjects.length && filteredProjects.length > 0 ? handleCollapseAllCards : handleExpandAllCards}
              className="px-3 py-1.5 rounded-xl border border-[#EAE5DA] bg-[#FAF8F3] hover:bg-[#F5F1E8] text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs shrink-0"
              title="Expand or Collapse all client storage cards"
            >
              {expandedCardIds.size === filteredProjects.length && filteredProjects.length > 0 ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                  <span>Collapse All</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                  <span>Expand All</span>
                </>
              )}
            </button>
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
              const allCopied = project.sub_events?.length > 0 && project.sub_events.every(ev => ev.crew?.every(c => c.is_copied));
              const hasCloudBackup = Boolean(project.google_drive_backup?.is_backed_up);
              const isExpanded = expandedCardIds.has(project.id);
              const projectDiskIds = getProjectAssignedDiskIds(project);
              const assignedDisksList = disks.filter(d => projectDiskIds.includes(d.id));
              const primaryDisk = assignedDisksList[0] || disks.find(d => project.assigned_disks?.some(ad => ad.disk_id === d.id)) || disks[0];

              // Filter out any assistant roles from sub-events for display
              const cleanSubEvents = (project.sub_events || []).map(ev => ({
                ...ev,
                crew: (ev.crew || []).filter(c => {
                  const r = (c.role || '').toLowerCase();
                  return !r.includes('assistant') && !r.includes('light') && !r.includes('helper') && !r.includes('driver');
                })
              }));

              // Extract linked Google Drive folders (array)
              const linkedFolders: GoogleDriveBackupFolder[] = (project.google_drive_backup?.folders && project.google_drive_backup.folders.length > 0)
                ? project.google_drive_backup.folders
                : (project.google_drive_backup?.folder_id ? [{
                    id: project.google_drive_backup.folder_id,
                    name: project.google_drive_backup.folder_name || 'Project Folder',
                    webViewLink: project.google_drive_backup.web_view_link,
                    account_email: project.google_drive_backup.account_email,
                  }] : []);

              const projectShootTypes = getProjectShootTypes(project);

              return (
                <div
                  key={project.id}
                  className="bg-white rounded-3xl border border-[#EAE5DA] p-5 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-4"
                >
                  {/* Card Header */}
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isExpanded ? 'border-b border-[#F4EFE6] pb-4' : ''}`}>
                    <div 
                      onClick={() => toggleCardExpansion(project.id)}
                      className="flex items-center gap-3 cursor-pointer select-none group/title flex-1 min-w-0"
                      title="Click anywhere to toggle project storage details"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#FAF8F3] border border-[#EBE6DB] group-hover/title:border-amber-400 flex items-center justify-center text-slate-800 font-black text-sm shrink-0 transition">
                        {project.client_name?.slice(0, 2).toUpperCase() || 'ST'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight group-hover/title:text-amber-800 transition">
                            {project.client_name}
                          </h2>
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            hasCloudBackup 
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : (project.assigned_disks?.length > 0)
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {hasCloudBackup ? '☁️ Cloud Backed Up' : (project.assigned_disks?.length > 0) ? '💾 Saved to Local Rig' : '⏳ Ingest Pending'}
                          </span>

                          {/* Shoot Type Badges */}
                          {projectShootTypes.length > 0 ? (
                            projectShootTypes.map((st, sIdx) => (
                              <span
                                key={sIdx}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/90 shadow-2xs flex items-center gap-1"
                              >
                                <Tag className="w-2.5 h-2.5 text-amber-600" />
                                <span>{st}</span>
                              </span>
                            ))
                          ) : (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProjectModal(project);
                                setEditProjectClientName(project.client_name);
                                setEditProjectEventDate(project.event_date);
                                setEditProjectShootTypes([]);
                                setIsEditShootTypeDropdownOpen(false);
                                setEditShootTypeSearch('');
                              }}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-50 hover:bg-amber-50 text-slate-500 hover:text-amber-800 border border-dashed border-slate-300 hover:border-amber-400 cursor-pointer flex items-center gap-1 transition"
                              title="Click to add shoot types for this card"
                            >
                              <Plus className="w-2.5 h-2.5 text-amber-600" />
                              <span>Add Shoot Type</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5 flex-wrap">
                          <span>📅 {project.event_date || 'Date Pending'}</span>
                          <span>💾 {project.assigned_disks?.length || 0} Local Folder{project.assigned_disks?.length === 1 ? '' : 's'}</span>
                          {linkedFolders.length > 0 && (
                            <span className="text-blue-600 font-bold">☁️ {linkedFolders.length} Cloud Folder{linkedFolders.length > 1 ? 's' : ''}</span>
                          )}
                          {assignedDisksList.length > 0 && (
                            <span className="text-emerald-700 font-bold">💽 {assignedDisksList.length} Assigned Drive{assignedDisksList.length > 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons: Edit Details + Show/Hide Details */}
                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProjectModal(project);
                          setEditProjectClientName(project.client_name);
                          setEditProjectEventDate(project.event_date);
                          setEditProjectShootTypes(getProjectShootTypes(project));
                          setIsEditShootTypeDropdownOpen(false);
                          setEditShootTypeSearch('');
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                        title="Edit storage project details (Client Name, Date, Shoot Types)"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleCardExpansion(project.id)}
                        className={`px-3.5 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                          isExpanded
                            ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600'
                            : 'bg-[#FAF8F3] hover:bg-[#F5F1E8] text-slate-800 border-[#EBE6DB]'
                        }`}
                        title={isExpanded ? 'Collapse card details' : 'Show storage details'}
                      >
                        <span>{isExpanded ? 'Hide Details ▲' : 'Show Details ▼'}</span>
                      </button>
                    </div>
                  </div>

                  {/* ── EXPANDED DETAILS: DUAL SIDE-BY-SIDE STORAGE BOXES (LOCAL RIG & GOOGLE DRIVE) ── */}
                  {isExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                      {/* 1. Local Machine / SSD Storage Box (Multiple Local Event Folders Supported) */}
                      <div className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#EBE6DB] flex flex-col justify-start gap-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
                              <HardDrive className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-slate-900 truncate">
                                Local Machine / SSD Storage Paths
                              </h4>
                              <p className="text-[11px] text-slate-500 truncate">
                                {project.assigned_disks?.length 
                                  ? `${project.assigned_disks.length} Local Folder${project.assigned_disks.length > 1 ? 's' : ''} Configured` 
                                  : 'Physical hard drive / editing rig storage'}
                              </p>
                            </div>
                          </div>

                          {/* Add Local Folder Button */}
                          <button
                            type="button"
                            onClick={() => handleAddLocalFolder(project.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0 transition"
                            title="Add another local folder for this client (e.g. Pre-Wedding, Wedding)"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Add Folder</span>
                          </button>
                        </div>

                        {/* 💽 Dedicated 3D Assigned Physical Drive / SSD Card (Distinct Minimal Styling) */}
                        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border border-indigo-200/90 shadow-xs space-y-2.5 relative">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-700 flex items-center justify-center shrink-0">
                                <SSDIcon className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                                <HardDrive className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                                <label className="text-[11px] font-black uppercase tracking-wider text-indigo-950">
                                  Assigned Physical Drives / SSDs
                                </label>
                                {assignedDisksList.length > 0 && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">
                                    {assignedDisksList.length} {assignedDisksList.length === 1 ? 'Drive' : 'Drives'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Link
                              href="/settings?tab=storage"
                              target="_blank"
                              className="text-[10px] font-bold text-indigo-700 hover:text-indigo-800 flex items-center gap-1 shrink-0"
                            >
                              <Settings className="w-3 h-3" />
                              <span>Settings</span>
                            </Link>
                          </div>

                          {/* Dropdown Toggle Trigger Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setOpenDiskDropdownProjectId(prev => prev === project.id ? null : project.id);
                              setProjectDiskSearchQuery('');
                            }}
                            className="w-full min-h-[38px] p-2 bg-white hover:bg-slate-50 border border-indigo-200/80 hover:border-indigo-400 rounded-xl text-left transition flex items-center justify-between gap-2 cursor-pointer shadow-2xs"
                          >
                            <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
                              {assignedDisksList.length === 0 ? (
                                <span className="text-xs text-slate-400 font-medium">
                                  Click to assign physical drives & SSDs (e.g. Sandisk 4TB SSD)...
                                </span>
                              ) : (
                                assignedDisksList.map(d => (
                                  <span
                                    key={d.id}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs"
                                    style={{ borderLeftWidth: '3.5px', borderLeftColor: d.color_tag || '#10B981' }}
                                  >
                                    <HardDrive className="w-3 h-3 text-slate-500 shrink-0" />
                                    <span className="truncate max-w-[130px]">{d.disk_name}</span>
                                    <span className="text-[10px] text-slate-400 font-normal">
                                      ({d.total_capacity_gb >= 1000 ? `${(d.total_capacity_gb / 1000).toFixed(0)}TB` : `${d.total_capacity_gb}GB`})
                                    </span>
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleProjectDisk(project.id, d.id);
                                      }}
                                      className="w-3.5 h-3.5 rounded-full hover:bg-rose-500 hover:text-white text-slate-400 flex items-center justify-center transition cursor-pointer ml-0.5"
                                    >
                                      <X className="w-2.5 h-2.5 stroke-[3]" />
                                    </span>
                                  </span>
                                ))
                              )}
                            </div>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${openDiskDropdownProjectId === project.id ? 'rotate-180' : ''}`} />
                          </button>

                          {/* 3D Dropdown Popover Panel */}
                          <AnimatePresence>
                            {openDiskDropdownProjectId === project.id && (
                              <motion.div
                                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-indigo-200 shadow-xl z-30 p-3 space-y-2.5"
                              >
                                <div className="relative">
                                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                  <input
                                    type="text"
                                    value={projectDiskSearchQuery}
                                    onChange={(e) => setProjectDiskSearchQuery(e.target.value)}
                                    placeholder="Search hard drives & SSDs..."
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500"
                                  />
                                </div>

                                <div className="max-h-48 overflow-y-auto space-y-1.5">
                                  {disks
                                    .filter(d => !projectDiskSearchQuery || d.disk_name.toLowerCase().includes(projectDiskSearchQuery.toLowerCase()) || d.disk_type.toLowerCase().includes(projectDiskSearchQuery.toLowerCase()))
                                    .map(d => {
                                      const isSelected = projectDiskIds.includes(d.id);
                                      return (
                                        <div
                                          key={d.id}
                                          onClick={() => handleToggleProjectDisk(project.id, d.id)}
                                          className={`p-2 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                            isSelected
                                              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                                          }`}
                                          style={{ borderLeftWidth: '4px', borderLeftColor: d.color_tag || '#10B981' }}
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <div
                                              className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs text-[10px] font-bold"
                                              style={{ backgroundColor: d.color_tag || '#10B981' }}
                                            >
                                              <HardDrive className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="min-w-0">
                                              <div className="text-xs truncate font-bold text-slate-900">{d.disk_name}</div>
                                              <div className="text-[10px] text-slate-400">
                                                {d.disk_type} • {d.total_capacity_gb >= 1000 ? `${(d.total_capacity_gb / 1000).toFixed(1)} TB` : `${d.total_capacity_gb} GB`}
                                                {d.physical_location ? ` • ${d.physical_location}` : ''}
                                              </div>
                                            </div>
                                          </div>
                                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                            isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'
                                          }`}>
                                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Multiple Local Folders List (Expanded without internal scrollbar) */}
                        <div className="space-y-2.5">
                          {(project.assigned_disks && project.assigned_disks.length > 0) ? (
                            project.assigned_disks.map((folder, fIdx) => {
                              const folderLabel = folder.label || folder.folder_name?.replace(/_RAW$/i, '') || (fIdx === 0 ? 'Pre-Wedding' : `Folder ${fIdx + 1}`);

                              return (
                                <div
                                  key={folder.id || fIdx}
                                  className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-2"
                                >
                                  {/* Top row: Folder Icon + Custom Label Input + Action Buttons */}
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                                        <Folder className="w-4 h-4 fill-amber-500/20" />
                                      </div>
                                      <input
                                        type="text"
                                        placeholder="Event name (e.g. Pre-Wedding, Wedding, Haldi)"
                                        value={folderLabel}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setProjects(prev => prev.map(p => p.id === project.id ? {
                                            ...p,
                                            assigned_disks: p.assigned_disks.map((d, i) => i === fIdx ? { ...d, label: val } : d)
                                          } : p));
                                        }}
                                        onBlur={(e) => handleUpdateLocalFolderLabel(project.id, fIdx, e.target.value)}
                                        className="px-2 py-1 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-amber-400 rounded-lg text-xs font-bold text-slate-900 transition flex-1 min-w-[120px]"
                                        title="Click to rename folder label (e.g. Pre-Wedding, Wedding, Reception)"
                                      />
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handlePickDirectory(project.id, fIdx)}
                                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                                        title="Select / change folder path from disk"
                                      >
                                        <FolderOpen className="w-3 h-3 text-amber-600" />
                                        <span>{folder.folder_path ? 'Change' : 'Pick Folder'}</span>
                                      </button>
                                      {/* Delete folder button (Replaced X with Trash2) */}
                                      <button
                                        type="button"
                                        onClick={() => setDeleteFolderConfirmation({
                                          type: 'local',
                                          projectId: project.id,
                                          folderIndexOrId: fIdx,
                                          folderName: folder.folder_name || folderLabel,
                                          folderLabel: folderLabel
                                        })}
                                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                        title="Remove this folder"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Folder Drive Origin Badge + 3D Dropdown Switcher */}
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    {(() => {
                                      const dropdownKey = `${project.id}_${fIdx}`;
                                      const isOpen = openFolderDiskDropdownKey === dropdownKey;
                                      const currentDisk = disks.find(d => d.id === folder.disk_id) || primaryDisk;
                                      const currentDiskName = folder.disk_name || (currentDisk ? currentDisk.disk_name : 'Primary Storage');
                                      const currentDiskType = formatCleanDriveType(folder.drive_type || (currentDisk ? currentDisk.disk_type : 'SSD'));
                                      const currentDiskColor = currentDisk?.color_tag || '#10B981';

                                      return (
                                        <div className="relative inline-block">
                                          <button
                                            type="button"
                                            onClick={() => setOpenFolderDiskDropdownKey(prev => prev === dropdownKey ? null : dropdownKey)}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/90 shadow-2xs hover:shadow-xs transition cursor-pointer text-left"
                                            style={{ borderLeftWidth: '3.5px', borderLeftColor: currentDiskColor }}
                                            title="Click to switch physical drive or SSD for this folder"
                                          >
                                            <div
                                              className="w-4 h-4 rounded-md flex items-center justify-center text-white shrink-0 text-[9px] font-bold shadow-2xs"
                                              style={{ backgroundColor: currentDiskColor }}
                                            >
                                              <HardDrive className="w-2.5 h-2.5" />
                                            </div>
                                            <div className="min-w-0 flex items-center gap-1.5 text-xs">
                                              <span className="font-extrabold text-slate-900 truncate max-w-[130px]">{currentDiskName}</span>
                                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white border border-slate-200/80 text-slate-600">
                                                {currentDiskType}
                                              </span>
                                              {currentDisk?.total_capacity_gb && (
                                                <span className="text-[10px] font-semibold text-emerald-700">
                                                  {currentDisk.total_capacity_gb >= 1000 ? `${(currentDisk.total_capacity_gb / 1000).toFixed(0)}TB` : `${currentDisk.total_capacity_gb}GB`}
                                                </span>
                                              )}
                                            </div>
                                            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                                          </button>

                                          {/* 3D Dropdown Popover */}
                                          <AnimatePresence>
                                            {isOpen && (
                                              <motion.div
                                                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                                className="absolute left-0 top-full mt-1.5 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl z-40 p-2 space-y-1.5"
                                              >
                                                <div className="px-2 py-1 border-b border-slate-100 flex items-center justify-between">
                                                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                                    <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
                                                    <span>Assign Storage Drive</span>
                                                  </span>
                                                  <Link
                                                    href="/settings?tab=storage"
                                                    target="_blank"
                                                    className="text-[10px] font-bold text-amber-700 hover:text-amber-800"
                                                  >
                                                    + Manage
                                                  </Link>
                                                </div>

                                                <div className="max-h-52 overflow-y-auto space-y-1">
                                                  {disks.length === 0 ? (
                                                    <div className="p-3 text-center text-xs text-slate-400">
                                                      No physical drives registered
                                                    </div>
                                                  ) : (
                                                    disks.map(d => {
                                                      const isSelected = (folder.disk_id === d.id) || (!folder.disk_id && primaryDisk?.id === d.id);
                                                      const cleanType = formatCleanDriveType(d.disk_type);
                                                      const capStr = d.total_capacity_gb >= 1000 ? `${(d.total_capacity_gb / 1000).toFixed(0)} TB` : `${d.total_capacity_gb} GB`;

                                                      return (
                                                        <div
                                                          key={d.id}
                                                          onClick={() => {
                                                            handleUpdateLocalFolderDisk(project.id, fIdx, d.id);
                                                            setOpenFolderDiskDropdownKey(null);
                                                          }}
                                                          className={`p-2 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                                            isSelected
                                                              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                                                              : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-700'
                                                          }`}
                                                          style={{ borderLeftWidth: '3.5px', borderLeftColor: d.color_tag || '#10B981' }}
                                                        >
                                                          <div className="flex items-center gap-2 min-w-0">
                                                            <div
                                                              className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 text-[10px] font-bold shadow-2xs"
                                                              style={{ backgroundColor: d.color_tag || '#10B981' }}
                                                            >
                                                              <HardDrive className="w-3.5 h-3.5" />
                                                            </div>
                                                            <div className="min-w-0">
                                                              <div className="text-xs truncate font-extrabold text-slate-900">{d.disk_name}</div>
                                                              <div className="text-[10px] text-slate-400 font-medium">
                                                                {cleanType} • <span className="text-emerald-700 font-bold">{capStr}</span>
                                                                {d.physical_location ? ` • ${d.physical_location}` : ''}
                                                              </div>
                                                            </div>
                                                          </div>
                                                          {isSelected && (
                                                            <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                                                            </div>
                                                          )}
                                                        </div>
                                                      );
                                                    })
                                                  )}
                                                </div>
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  {/* Bottom row: Path display & copy */}
                                  <div className="flex items-center justify-between gap-2 bg-slate-50/80 px-2.5 py-1.5 rounded-lg border border-slate-200/60 text-[11px] font-mono text-slate-600">
                                    <span className="truncate select-all" title={folder.folder_path || ''}>
                                      {folder.folder_path || 'No local directory selected yet'}
                                    </span>
                                    {folder.folder_path && (
                                      <button
                                        type="button"
                                        onClick={() => handleCopyPath(folder.folder_path, `${project.id}_f_${fIdx}`)}
                                        className="text-[10px] font-sans font-bold text-slate-500 hover:text-slate-900 shrink-0 ml-1 flex items-center gap-0.5 cursor-pointer"
                                      >
                                        {copiedPathId === `${project.id}_f_${fIdx}` ? (
                                          <span className="text-emerald-600 flex items-center gap-1">
                                            <Check className="w-2.5 h-2.5" /> Copied
                                          </span>
                                        ) : (
                                          <span className="flex items-center gap-1">
                                            <Copy className="w-2.5 h-2.5" /> Copy
                                          </span>
                                        )}
                                      </button>
                                    )}
                                  </div>

                                  {/* Scanned metadata stats if available */}
                                  {(folder.file_count > 0 || folder.total_size_gb > 0) && (
                                    <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 pt-0.5">
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                                        📦 {folder.total_size_gb} GB
                                      </span>
                                      <span>•</span>
                                      <span>📄 {folder.file_count} Files</span>
                                      {folder.photo_count !== undefined && folder.photo_count > 0 && (
                                        <>
                                          <span>•</span>
                                          <span>📸 {folder.photo_count} Photos</span>
                                        </>
                                      )}
                                      {folder.video_count !== undefined && folder.video_count > 0 && (
                                        <>
                                          <span>•</span>
                                          <span>🎬 {folder.video_count} Videos</span>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="bg-white p-3 rounded-xl border border-dashed border-amber-200 text-xs text-slate-400 font-medium text-center">
                              No local folders assigned yet. Click &apos;+ Add Folder&apos; above to assign Pre-Wedding, Wedding, or Haldi raw directories.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 2. Google Drive Cloud Backup Box (Multiple Folders Supported with Event Labels) */}
                      <div className="p-4 rounded-2xl bg-[#F6F9FE] border border-blue-150 flex flex-col justify-start gap-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-white border border-blue-200 flex items-center justify-center p-1.5 shrink-0 shadow-2xs">
                              <svg viewBox="0 0 87.3 78" className="w-full h-full">
                                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-slate-900 truncate">
                                Google Drive Cloud Backup
                              </h4>
                              <p className="text-[11px] text-slate-500 truncate">
                                {hasCloudBackup 
                                  ? `${linkedFolders.length} Cloud Folder${linkedFolders.length > 1 ? 's' : ''} Linked`
                                  : 'Cloud archive & deliverable storage'}
                              </p>
                            </div>
                          </div>

                          {/* Add / Link Google Drive Folder Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenGooglePicker(project)}
                            className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0 transition"
                          >
                            <Cloud className="w-3.5 h-3.5" />
                            <span>+ Add Drive Folder</span>
                          </button>
                        </div>

                        {/* Multiple Linked Drive Folders List (Expanded without internal scrollbar) */}
                        <div className="space-y-2.5">
                          {linkedFolders.length > 0 ? (
                            linkedFolders.map((folder, gdIdx) => {
                              const driveLabel = folder.label || folder.name || (gdIdx === 0 ? 'Wedding' : `Folder ${gdIdx + 1}`);

                              return (
                                <div
                                  key={folder.id}
                                  className="bg-white p-2.5 sm:p-3 rounded-xl border border-blue-200/80 shadow-2xs space-y-2"
                                >
                                  {/* Top row: Drive Icon + Custom Label Input + Open / Remove */}
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                                        <Folder className="w-4 h-4 fill-blue-500/20 text-blue-600" />
                                      </div>
                                      <input
                                        type="text"
                                        placeholder="Event name (e.g. Pre-Wedding, Wedding, Deliverables)"
                                        value={driveLabel}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setProjects(prev => prev.map(p => p.id === project.id ? {
                                            ...p,
                                            google_drive_backup: {
                                              ...p.google_drive_backup,
                                              folders: (p.google_drive_backup.folders || []).map(f => f.id === folder.id ? { ...f, label: val } : f)
                                            }
                                          } : p));
                                        }}
                                        onBlur={(e) => handleUpdateDriveFolderLabel(project.id, folder.id, e.target.value)}
                                        className="px-2 py-1 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-blue-400 rounded-lg text-xs font-bold text-slate-900 transition flex-1 min-w-[120px]"
                                        title="Click to rename Drive folder label (e.g. Pre-Wedding, Wedding, Deliverables)"
                                      />
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {folder.webViewLink && (
                                        <a
                                          href={folder.webViewLink}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center gap-1 transition"
                                        >
                                          <span>Open ↗</span>
                                        </a>
                                      )}
                                      {/* Delete folder button (Replaced X with Trash2) */}
                                      <button
                                        type="button"
                                        onClick={() => setDeleteFolderConfirmation({
                                          type: 'drive',
                                          projectId: project.id,
                                          folderIndexOrId: folder.id,
                                          folderName: folder.name || driveLabel,
                                          folderLabel: driveLabel
                                        })}
                                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                        title="Unlink this folder"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Bottom row: Drive Folder Name & Account Email */}
                                  <div className="flex items-center justify-between gap-2 bg-blue-50/50 px-2.5 py-1.5 rounded-lg border border-blue-100 text-[11px] text-slate-600">
                                    <span className="font-bold text-blue-950 truncate" title={folder.name}>
                                      📁 {folder.name}
                                    </span>
                                    {folder.account_email && (
                                      <span className="text-[10px] text-slate-400 font-mono truncate shrink-0">
                                        {folder.account_email}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="bg-white p-3 rounded-xl border border-dashed border-blue-200 text-xs text-slate-400 font-medium text-center">
                              No Google Drive folder linked yet. Click &apos;+ Add Drive Folder&apos; above to link client raw dumps or deliverables.
                            </div>
                          )}
                        </div>
                      </div>
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
            {/* Quick Autocomplete from Booked Client */}
            {availableLeads.length > 0 && (
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3.5 space-y-1.5">
                <label className="text-[11px] font-black uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Choose Booked Client (Auto-fills Event & Crew)</span>
                </label>
                <div className="relative">
                  <select
                    aria-label="Select booked client to autofill"
                    value={selectedLeadIdForProject}
                    onChange={e => handleSelectLeadToAutofill(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 appearance-none pr-8 cursor-pointer shadow-2xs"
                  >
                    <option value="">-- Choose a booked client or enter details below --</option>
                    {availableLeads.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name} {l.event_date ? `(${l.event_date})` : ''} • Booked Client
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
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

              {/* 3D Multi-Select Type of Shoot (Event Types) Dropdown */}
              <div className="space-y-1.5 relative">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                    <span>Type of Shoot (Event Types)</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      {manualSelectedEventTypes.length} Selected
                    </span>
                  </label>
                  <Link
                    href="/settings?tab=functions"
                    target="_blank"
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Studio Events Settings</span>
                  </Link>
                </div>

                {/* Dropdown Toggle Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsManualShootTypeDropdownOpen(!isManualShootTypeDropdownOpen)}
                  className="w-full min-h-[42px] px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl flex items-center justify-between gap-2 text-left transition cursor-pointer shadow-2xs"
                >
                  <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
                    {manualSelectedEventTypes.length === 0 ? (
                      <span className="text-xs text-slate-400 font-medium">
                        Click to select shoot types (e.g. Pre-Wedding, Haldi, Wedding Ceremony)...
                      </span>
                    ) : (
                      manualSelectedEventTypes.map((st, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs"
                        >
                          <Tag className="w-3 h-3 text-amber-600" />
                          <span>{st}</span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setManualSelectedEventTypes(prev => prev.filter(t => t !== st));
                            }}
                            className="w-3.5 h-3.5 rounded-full hover:bg-rose-500 hover:text-white text-slate-400 flex items-center justify-center transition cursor-pointer ml-0.5"
                          >
                            <X className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        </span>
                      ))
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isManualShootTypeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Popover Panel */}
                <AnimatePresence>
                  {isManualShootTypeDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white border border-amber-200 rounded-2xl shadow-xl p-3 space-y-2.5 max-h-64 overflow-y-auto"
                    >
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={manualShootTypeSearch}
                          onChange={e => setManualShootTypeSearch(e.target.value)}
                          placeholder="Search or type custom shoot type..."
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div className="space-y-1">
                        {workspaceEventTypes
                          .filter(et => !manualShootTypeSearch || et.name.toLowerCase().includes(manualShootTypeSearch.toLowerCase()))
                          .map(et => {
                            const isSelected = manualSelectedEventTypes.some(t => t.toLowerCase() === et.name.toLowerCase());
                            return (
                              <div
                                key={et.id}
                                onClick={() => {
                                  setManualSelectedEventTypes(prev =>
                                    isSelected
                                      ? prev.filter(t => t.toLowerCase() !== et.name.toLowerCase())
                                      : [...prev, et.name]
                                  );
                                }}
                                className={`p-2 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold shadow-2xs'
                                    : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Tag className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span className="text-xs truncate font-bold text-slate-900">{et.name}</span>
                                  {et.category && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium">
                                      {et.category}
                                    </span>
                                  )}
                                </div>
                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                  isSelected ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300'
                                }`}>
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </div>
                            );
                          })}

                        {manualShootTypeSearch.trim() && !workspaceEventTypes.some(et => et.name.toLowerCase() === manualShootTypeSearch.toLowerCase().trim()) && (
                          <button
                            type="button"
                            onClick={() => {
                              const customName = manualShootTypeSearch.trim();
                              if (!manualSelectedEventTypes.includes(customName)) {
                                setManualSelectedEventTypes(prev => [...prev, customName]);
                              }
                              setManualShootTypeSearch('');
                            }}
                            className="w-full p-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold text-left flex items-center gap-2 cursor-pointer transition"
                          >
                            <Plus className="w-3.5 h-3.5 text-amber-600" />
                            <span>Add "{manualShootTypeSearch.trim()}" as custom shoot type</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Threaded Multi-Select Physical Hard Disks / SSDs Dropdown */}
              <div className="space-y-1.5 relative">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-amber-600" />
                    <span>Assign Physical Hard Disks / SSDs</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {manualSelectedDiskIds.length} Selected
                    </span>
                  </label>
                  <Link
                    href="/settings?tab=storage"
                    target="_blank"
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Manage in Settings</span>
                  </Link>
                </div>

                {/* Dropdown Toggle Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsDiskSelectDropdownOpen(!isDiskSelectDropdownOpen)}
                  className="w-full min-h-[42px] px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl flex items-center justify-between gap-2 text-left transition cursor-pointer shadow-2xs"
                >
                  <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
                    {manualSelectedDiskIds.length === 0 ? (
                      <span className="text-xs text-slate-400 font-medium">
                        Click to select physical hard disks &amp; SSDs registered in Settings...
                      </span>
                    ) : (
                      disks
                        .filter(d => manualSelectedDiskIds.includes(d.id))
                        .map(d => (
                          <span
                            key={d.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs"
                            style={{ borderLeftWidth: '3.5px', borderLeftColor: d.color_tag || '#3B82F6' }}
                          >
                            <span className="truncate max-w-[130px]">{d.disk_name}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({d.total_capacity_gb >= 1000 ? `${(d.total_capacity_gb / 1000).toFixed(0)}TB` : `${d.total_capacity_gb}GB`})
                            </span>
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setManualSelectedDiskIds(prev => prev.filter(id => id !== d.id));
                              }}
                              className="w-3.5 h-3.5 rounded-full hover:bg-rose-500 hover:text-white text-slate-400 flex items-center justify-center transition cursor-pointer ml-0.5"
                            >
                              <X className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          </span>
                        ))
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isDiskSelectDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Popover Panel */}
                <AnimatePresence>
                  {isDiskSelectDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 space-y-2.5 max-h-72 overflow-y-auto"
                    >
                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={diskSearchQuery}
                          onChange={e => setDiskSearchQuery(e.target.value)}
                          placeholder="Search hard drives & SSDs..."
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      {disks.length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-amber-200 bg-amber-50/50 text-center space-y-1.5">
                          <p className="text-xs font-bold text-amber-900">No physical disks registered yet in Settings</p>
                          <p className="text-[11px] text-amber-700">Add external SSDs, HDDs, or NAS arrays in Studio Settings.</p>
                          <Link
                            href="/settings?tab=storage"
                            target="_blank"
                            className="inline-flex items-center gap-1 px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-black hover:bg-amber-700"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Go to Settings &gt; Studio Storage</span>
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {disks
                            .filter(d => !diskSearchQuery || d.disk_name.toLowerCase().includes(diskSearchQuery.toLowerCase()) || d.disk_type.toLowerCase().includes(diskSearchQuery.toLowerCase()) || (d.notes && d.notes.toLowerCase().includes(diskSearchQuery.toLowerCase())))
                            .map(d => {
                              const isSelected = manualSelectedDiskIds.includes(d.id);
                              const formattedCap = d.total_capacity_gb >= 1000 
                                ? `${(d.total_capacity_gb / 1000).toFixed(0)} TB`
                                : `${d.total_capacity_gb} GB`;

                              return (
                                <div
                                  key={d.id}
                                  onClick={() => {
                                    setManualSelectedDiskIds(prev =>
                                      prev.includes(d.id) ? prev.filter(id => id !== d.id) : [...prev, d.id]
                                    );
                                  }}
                                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                                  }`}
                                  style={{ borderLeftWidth: '4px', borderLeftColor: d.color_tag || '#3B82F6' }}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs"
                                      style={{ backgroundColor: d.color_tag || '#3B82F6' }}
                                    >
                                      {d.disk_type === 'NAS' ? (
                                        <Server className="w-3.5 h-3.5" />
                                      ) : (
                                        <HardDrive className="w-3.5 h-3.5" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-xs truncate font-extrabold">{d.disk_name}</div>
                                      <div className="text-[10px] text-slate-400 font-normal flex items-center gap-1.5">
                                        <span className="font-semibold text-slate-600">{d.disk_type?.replace(/_/g, ' ')}</span>
                                        <span>•</span>
                                        <span className="font-bold text-emerald-700">{formattedCap}</span>
                                        {d.physical_location && (
                                          <>
                                            <span>•</span>
                                            <span>📍 {d.physical_location}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="shrink-0">
                                    {isSelected ? (
                                      <CheckSquare className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                                    ) : (
                                      <Square className="w-4 h-4 text-slate-300" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
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
                onClick={() => setConnectDriveTab('oauth')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                  connectDriveTab === 'oauth'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⚡ Google Sign-In (OAuth)
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
                📝 Instant Direct Link
              </button>
              <button
                type="button"
                onClick={() => setConnectDriveTab('gis')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                  connectDriveTab === 'gis'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                In-Browser GIS
              </button>
            </div>

            {/* Tab 1: Official Google OAuth Sign-In */}
            {connectDriveTab === 'oauth' && (
              <div className="space-y-4 py-2">
                <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs space-y-1.5">
                  <p className="font-bold text-blue-950 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Official Google OAuth 2.0 Connection</span>
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Connect your studio Google Drive with secure, official Google consent. Automatically detects your account email, live storage quota (Used / Free space), and registers it to Studio Storage.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleOAuthPopup}
                    className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md shadow-blue-600/25 transition flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <Cloud className="w-5 h-5" />
                    <span>⚡ Sign In with Google (Popup Window)</span>
                  </button>

                  <a
                    href={`/api/storage/google/auth?workspace_id=${encodeURIComponent(effectiveWsId)}&return_url=/workspace/storage`}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Or Proceed via Full Page Web Redirect</span>
                  </a>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Active OAuth Credentials</span>
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono space-y-0.5">
                    <div className="truncate"><span className="text-slate-400">OAuth Client:</span> Google Identity Services 2.0</div>
                    <div className="truncate"><span className="text-slate-400">Redirect URI:</span> https://studiocore.in/api/storage/google/callback</div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Instant Direct Link Account (Zero Config) */}
            {connectDriveTab === 'manual' && (
              <form onSubmit={handleManualDriveSubmit} className="space-y-3.5">
                <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs space-y-1">
                  <p className="font-bold text-blue-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Instant Zero-Configuration Link</span>
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Enter your Google email and select capacity below to immediately link your Drive account without needing Google Cloud Console setup.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Google Account Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. sushantnawale007@gmail.com"
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

            {/* Tab 3: 1-Click GIS Google Sign-In */}
            {connectDriveTab === 'gis' && (
              <div className="space-y-4 py-2 text-center">
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl text-left space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Google Cloud Console Requirement</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    If Google shows <strong>&quot;Error 401: invalid_client (no registered origin)&quot;</strong>, Google Cloud requires <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-mono">https://studiocore.in</code> in <em>Authorized JavaScript origins</em>.
                  </p>
                  <button
                    type="button"
                    onClick={() => setConnectDriveTab('manual')}
                    className="mt-1 text-[11px] font-bold text-blue-700 hover:text-blue-800 underline flex items-center gap-1 cursor-pointer"
                  >
                    👉 Switch to Instant Direct Link (no Google Cloud setup needed)
                  </button>
                </div>

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
                  <SDCardIcon className="w-5 h-5" />
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
                    <option value="500">500 GB</option>
                    <option value="1000">1 TB</option>
                    <option value="2000">2 TB</option>
                    <option value="4000">4 TB</option>
                    <option value="8000">8 TB</option>
                    <option value="16000">16 TB</option>
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

      {/* ── MODAL 5: EXACT GOOGLE DRIVE EXPLORER MODAL (100% Match with Integrations Hub) ── */}
      <AnimatePresence>
        {showGooglePickerModal && selectedGoogleAccount && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="w-full max-w-4xl bg-white dark:bg-[#12161F] rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800 flex items-center justify-center p-2 shrink-0">
                    <svg viewBox="0 0 87.3 78" className="w-full h-full">
                      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-zinc-950 dark:text-white truncate">
                        Google Drive Explorer
                      </h3>
                      {explorerIsGlobalSearch && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                          🔍 Deep Search (All Drive)
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-bold">
                        📦 Size: {explorerTotalSize || '0 MB'}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-2 flex-wrap mt-1">
                      {driveAccounts.length > 1 ? (
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() => setIsGoogleAccountDropdownOpen(prev => !prev)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs font-bold border border-zinc-200 dark:border-zinc-700 shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)] hover:border-blue-500/70 hover:shadow-md transition-all cursor-pointer"
                          >
                            <div className="w-4 h-4 shrink-0">
                              <svg viewBox="0 0 87.3 78" className="w-full h-full">
                                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                              </svg>
                            </div>
                            <span className="font-extrabold text-zinc-800 dark:text-zinc-100 truncate max-w-[170px] sm:max-w-[220px]">
                              {selectedGoogleAccount.account_email}
                            </span>
                            {selectedGoogleAccount.account_label && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-700/60 truncate max-w-[90px]">
                                {selectedGoogleAccount.account_label}
                              </span>
                            )}
                            <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${isGoogleAccountDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
                          </button>

                          {/* 3D Dropdown Menu */}
                          {isGoogleAccountDropdownOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setIsGoogleAccountDropdownOpen(false)}
                              />
                              <div className="absolute left-0 top-full mt-2 z-50 w-80 sm:w-96 p-2 bg-white/95 dark:bg-[#12161F]/95 backdrop-blur-xl rounded-2xl border border-zinc-200/90 dark:border-zinc-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.22),0_6px_16px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.9)] space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                                <div className="px-2.5 py-1 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                                    Connected Google Drives ({driveAccounts.length})
                                  </span>
                                  <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                                    Select Active Drive
                                  </span>
                                </div>
                                <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                  {driveAccounts.map(acc => {
                                    const isSelected = acc.id === selectedGoogleAccount.id;
                                    return (
                                      <button
                                        key={acc.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedGoogleAccount(acc);
                                          setGoogleBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
                                          setGoogleCurrentFolder({ id: 'root', name: 'My Drive' });
                                          setExplorerSearch('');
                                          setExplorerIsGlobalSearch(false);
                                          loadExplorerFolder(acc.id, 'root');
                                          setIsGoogleAccountDropdownOpen(false);
                                        }}
                                        className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                                          isSelected
                                            ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-400/80 dark:border-blue-700 shadow-[0_2px_8px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/30'
                                            : 'bg-zinc-50/70 dark:bg-zinc-800/40 border-zinc-200/70 dark:border-zinc-700/50 hover:bg-zinc-100/90 dark:hover:bg-zinc-800/80 hover:border-zinc-300'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xs flex items-center justify-center p-1.5 shrink-0 group-hover:scale-105 transition-transform">
                                            <svg viewBox="0 0 87.3 78" className="w-full h-full">
                                              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                                              <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                                              <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                                              <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                                              <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                                              <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                                            </svg>
                                          </div>
                                          <div className="min-w-0">
                                            <p className={`text-xs font-black truncate ${isSelected ? 'text-blue-900 dark:text-blue-200' : 'text-zinc-900 dark:text-white'}`}>
                                              {acc.account_email}
                                            </p>
                                            <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1.5 mt-0.5">
                                              <span>{acc.account_label || 'Google Drive Storage'}</span>
                                              {acc.storage_quota_bytes ? (
                                                <>
                                                  <span>•</span>
                                                  <span>{(acc.storage_quota_bytes / (1024**3)).toFixed(0)} GB Quota</span>
                                                </>
                                              ) : null}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="shrink-0 flex items-center">
                                          {isSelected ? (
                                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                              <Check className="w-3 h-3" />
                                            </div>
                                          ) : (
                                            <div className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-600 group-hover:border-blue-400" />
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold border border-zinc-200 dark:border-zinc-700">
                          <div className="w-3.5 h-3.5 shrink-0">
                            <svg viewBox="0 0 87.3 78" className="w-full h-full">
                              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                              <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                              <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                              <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                              <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                              <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                            </svg>
                          </div>
                          <span>{selectedGoogleAccount.account_email}</span>
                          {selectedGoogleAccount.account_label && (
                            <span className="text-[10px] text-zinc-500 font-normal">
                              ({selectedGoogleAccount.account_label})
                            </span>
                          )}
                        </div>
                      )}
                      <span>•</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        {explorerTotalFiles !== null ? explorerTotalFiles.toLocaleString() : sortedExplorerFiles.length} files
                      </span>
                      <span>•</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        {explorerTotalFolders !== null ? explorerTotalFolders.toLocaleString() : sortedExplorerFolders.length} folders
                      </span>
                      {sortedExplorerFiles.length < (explorerTotalFiles || 0) && (
                        <span className="text-blue-600 dark:text-blue-400">
                          (Showing {sortedExplorerFiles.length} of {(explorerTotalFiles || 0).toLocaleString()})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowGooglePickerModal(false)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Project Link Banner (When opened from a Project Card) */}
              {activeProjectForGoogle && (
                <div className="p-3 mx-4 sm:mx-6 mt-3 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-200/80 dark:border-blue-800/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Cloud className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                        Linking Destination for: <span className="text-blue-600 dark:text-blue-400">{activeProjectForGoogle.client_name}</span>
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Current Directory: <span className="font-bold text-zinc-800 dark:text-zinc-200">{googleCurrentFolder.name}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLinkFolderToProject(googleCurrentFolder)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Link Current Folder</span>
                  </button>
                </div>
              )}

              {/* Breadcrumb Path & Controls Bar */}
              <div className="p-3 sm:px-5 bg-zinc-50/70 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-1.5 text-xs overflow-x-auto scrollbar-none py-1">
                  {googleBreadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={crumb.id || idx}>
                      <button
                        onClick={() => handleExplorerBreadcrumbClick(idx)}
                        className={`hover:text-blue-600 transition-colors cursor-pointer font-medium whitespace-nowrap ${
                          idx === googleBreadcrumbs.length - 1
                            ? 'font-bold text-zinc-900 dark:text-white'
                            : 'text-zinc-500'
                        }`}
                      >
                        {crumb.name}
                      </button>
                      {idx < googleBreadcrumbs.length - 1 && (
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Filter, Sort & View Mode Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Search inside folder / Deep drive search */}
                  <div className="relative w-44 sm:w-56">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Deep search files/folders..."
                      value={explorerSearch}
                      onChange={e => setExplorerSearch(e.target.value)}
                      className="w-full pl-7 pr-7 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-250 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500 shadow-xs"
                    />
                    {explorerSearch && (
                      <button
                        onClick={() => {
                          setExplorerSearch('');
                          if (explorerIsGlobalSearch) {
                            setExplorerIsGlobalSearch(false);
                            if (selectedGoogleAccount) loadExplorerFolder(selectedGoogleAccount.id, googleCurrentFolder.id);
                          }
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Sort by dropdown */}
                  <div className="flex items-center bg-white dark:bg-zinc-800 border border-zinc-250 dark:border-zinc-700 rounded-xl p-0.5">
                    <button
                      onClick={() => {
                        setExplorerSortField(prev => (prev === 'name' ? 'date' : prev === 'date' ? 'size' : 'name'));
                      }}
                      className="px-2 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-blue-600 flex items-center gap-1 cursor-pointer capitalize"
                      title="Toggle sort field"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                      <span>{explorerSortField}</span>
                    </button>
                    <button
                      onClick={() => setExplorerSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                      className="px-1.5 py-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-mono cursor-pointer"
                      title="Toggle order"
                    >
                      {explorerSortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-white dark:bg-zinc-800 border border-zinc-250 dark:border-zinc-700 rounded-xl p-0.5">
                    <button
                      onClick={() => setExplorerViewMode('grid')}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        explorerViewMode === 'grid' ? 'bg-zinc-100 dark:bg-zinc-700 text-blue-600' : 'text-zinc-400'
                      }`}
                      title="Grid view"
                    >
                      <Grid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setExplorerViewMode('list')}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        explorerViewMode === 'list' ? 'bg-zinc-100 dark:bg-zinc-700 text-blue-600' : 'text-zinc-400'
                      }`}
                      title="List view"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-[350px]">
                {googleFolderLoading ? (
                  <div className="py-20 text-center space-y-3">
                    <RefreshCw className="w-7 h-7 animate-spin mx-auto text-blue-500" />
                    <p className="text-xs text-zinc-500 font-medium">Fetching folder contents & real count...</p>
                  </div>
                ) : (sortedExplorerFolders.length === 0 && sortedExplorerFiles.length === 0) ? (
                  <div className="py-20 text-center space-y-2">
                    <Folder className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto" />
                    <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                      {explorerIsGlobalSearch ? 'No search results found' : 'This folder is empty'}
                    </h4>
                    <p className="text-xs text-zinc-400">
                      {explorerIsGlobalSearch
                        ? 'Try searching with a different file or folder name.'
                        : 'No subfolders or media files found in this location.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* ── Subfolders Section ── */}
                    {sortedExplorerFolders.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider">
                          <span>Folders ({explorerTotalFolders !== null ? explorerTotalFolders.toLocaleString() : sortedExplorerFolders.length})</span>
                        </div>

                        {explorerViewMode === 'grid' ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {sortedExplorerFolders.map(folder => (
                              <div
                                key={folder.id}
                                onClick={() => handleExplorerNavigateFolder(folder)}
                                className="p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/60 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 border border-zinc-200/70 dark:border-zinc-750 hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer transition-all flex flex-col justify-between gap-2.5 group"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                                      <Folder className="w-5 h-5 fill-amber-500" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-bold text-zinc-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400" title={folder.name}>
                                        {folder.name}
                                      </p>
                                      <span className="text-[10px] text-zinc-400 font-mono">Folder</span>
                                    </div>
                                  </div>

                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFolderMenuOpenId(folderMenuOpenId === folder.id ? null : folder.id);
                                      }}
                                      className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition cursor-pointer"
                                      title="Folder options"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {folderMenuOpenId === folder.id && (
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-750 rounded-xl shadow-xl p-1 z-50 space-y-0.5 text-xs font-bold"
                                      >
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setFolderMenuOpenId(null);
                                            setFolderDetailsModalData(folder);
                                          }}
                                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center gap-2 cursor-pointer"
                                        >
                                          <Folder className="w-3.5 h-3.5 text-amber-500" />
                                          <span>Folder Details</span>
                                        </button>

                                        {activeProjectForGoogle && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setFolderMenuOpenId(null);
                                              handleLinkFolderToProject(folder);
                                            }}
                                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center gap-2 cursor-pointer"
                                          >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>+ Link to Project</span>
                                          </button>
                                        )}

                                        {folder.webViewLink && (
                                          <a
                                            href={folder.webViewLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setFolderMenuOpenId(null)}
                                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center gap-2 cursor-pointer"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                                            <span>Open in Drive</span>
                                          </a>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden">
                            {sortedExplorerFolders.map(folder => (
                              <div
                                key={folder.id}
                                onClick={() => handleExplorerNavigateFolder(folder)}
                                className="py-2.5 px-4 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 flex items-center justify-between cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <Folder className="w-4 h-4 fill-amber-500 text-amber-500 shrink-0" />
                                  <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                                    {folder.name}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFolderMenuOpenId(folderMenuOpenId === folder.id ? null : folder.id);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition cursor-pointer"
                                    title="Folder options"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>

                                  {folderMenuOpenId === folder.id && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-750 rounded-xl shadow-xl p-1 z-50 space-y-0.5 text-xs font-bold"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setFolderMenuOpenId(null);
                                          setFolderDetailsModalData(folder);
                                        }}
                                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center gap-2 cursor-pointer"
                                      >
                                        <Folder className="w-3.5 h-3.5 text-amber-500" />
                                        <span>Folder Details</span>
                                      </button>

                                      {activeProjectForGoogle && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setFolderMenuOpenId(null);
                                            handleLinkFolderToProject(folder);
                                          }}
                                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center gap-2 cursor-pointer"
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                          <span>+ Link to Project</span>
                                        </button>
                                      )}

                                      {folder.webViewLink && (
                                        <a
                                          href={folder.webViewLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={() => setFolderMenuOpenId(null)}
                                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center gap-2 cursor-pointer"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                                          <span>Open in Drive</span>
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Files & Media Section ── */}
                    {sortedExplorerFiles.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider">
                          <span>
                            Files & Media ({explorerTotalFiles !== null ? explorerTotalFiles.toLocaleString() : sortedExplorerFiles.length})
                          </span>
                          {sortedExplorerFiles.length < (explorerTotalFiles || 0) && (
                            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 normal-case">
                              Showing {sortedExplorerFiles.length} of {(explorerTotalFiles || 0).toLocaleString()} files
                            </span>
                          )}
                        </div>

                        {explorerViewMode === 'grid' ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {sortedExplorerFiles.map(file => (
                              <div
                                key={file.id}
                                onClick={() => setExplorerPreviewFile(file)}
                                className="p-3 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-750 cursor-pointer transition-all flex flex-col justify-between space-y-2 group"
                              >
                                <div className="w-full h-28 rounded-xl bg-zinc-200/70 dark:bg-zinc-700/60 overflow-hidden flex items-center justify-center relative">
                                  {file.thumbnailLink ? (
                                    <img
                                      src={file.thumbnailLink}
                                      alt={file.name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      loading="lazy"
                                    />
                                  ) : file.isImage ? (
                                    <ImageIcon className="w-8 h-8 text-blue-500" />
                                  ) : file.isVideo ? (
                                    <Video className="w-8 h-8 text-rose-500" />
                                  ) : file.isAudio ? (
                                    <Music className="w-8 h-8 text-emerald-500" />
                                  ) : (
                                    <FileText className="w-8 h-8 text-zinc-400" />
                                  )}

                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Eye className="w-5 h-5 text-white" />
                                  </div>
                                </div>

                                <div>
                                  <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate" title={file.name}>
                                    {file.name}
                                  </p>
                                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mt-0.5">
                                    <span>{formatBytes(file.sizeBytes)}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden">
                            {sortedExplorerFiles.map(file => (
                              <div
                                key={file.id}
                                onClick={() => setExplorerPreviewFile(file)}
                                className="py-2.5 px-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 flex items-center justify-between cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {file.isImage ? (
                                    <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
                                  ) : file.isVideo ? (
                                    <Video className="w-4 h-4 text-rose-500 shrink-0" />
                                  ) : file.isAudio ? (
                                    <Music className="w-4 h-4 text-emerald-500 shrink-0" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                                  )}
                                  <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate" title={file.name}>
                                    {file.name}
                                  </span>
                                </div>
                                <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                                  {formatBytes(file.sizeBytes)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Pagination / Load More Controls (100-item batches) */}
                        {googleNextPageToken && (
                          <div className="pt-6 pb-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={handleExplorerLoadMore}
                              disabled={googleLoadingMore}
                              className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                            >
                              {googleLoadingMore ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                              <span>Load Next 100 Items</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleExplorerLoadAll}
                              disabled={googleLoadingMore}
                              className="px-5 py-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-semibold text-xs border border-zinc-200 dark:border-zinc-700 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                            >
                              <span>⚡ Fetch All Remaining ({sortedExplorerFiles.length} of {explorerTotalFiles || sortedExplorerFiles.length} loaded)</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="text-xs text-zinc-500 font-medium truncate max-w-sm">
                  Current Folder: <strong className="text-zinc-800 dark:text-zinc-200">{googleCurrentFolder.name}</strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGooglePickerModal(false)}
                    className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl cursor-pointer transition"
                  >
                    Close
                  </button>
                  {activeProjectForGoogle && (
                    <button
                      type="button"
                      onClick={() => handleLinkFolderToProject(googleCurrentFolder)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Link Current Folder</span>
                    </button>
                  )}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── FILE PREVIEW MODAL ─────────────────────────────────────────── */}
      <AnimatePresence>
        {explorerPreviewFile && (
          <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-zinc-900 text-white rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="min-w-0 pr-3">
                  <h4 className="text-sm font-bold truncate">{explorerPreviewFile.name}</h4>
                  <p className="text-[11px] text-zinc-400 font-mono">{formatBytes(explorerPreviewFile.sizeBytes)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {explorerPreviewFile.webViewLink && (
                    <a
                      href={explorerPreviewFile.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in Drive</span>
                    </a>
                  )}
                  <button
                    onClick={() => setExplorerPreviewFile(null)}
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body: Direct Native Google Drive Previewer */}
              <div className="flex-1 overflow-hidden p-2 sm:p-4 flex items-center justify-center min-h-[440px] bg-black/90">
                <iframe
                  src={`https://drive.google.com/file/d/${explorerPreviewFile.id}/preview`}
                  className="w-full h-[72vh] rounded-2xl border-0 bg-zinc-950 shadow-inner"
                  allow="autoplay; fullscreen"
                  title={explorerPreviewFile.name}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── METRIC MODAL 1: BOOKED PROJECTS OVERVIEW ────────────────────── */}
      <AnimatePresence>
        {showProjectsSummaryModal && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-amber-50/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <span>Booked Client Projects &amp; Storage Overview</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                        {projects.length} Booked
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      All CRM Booked Clients &amp; Bookings with Sub-events, crew assignments, and offload statuses
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProjectsSummaryModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Projects List */}
              <div className="p-4 overflow-y-auto space-y-3 flex-1">
                {projects.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <Folder className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-sm font-bold text-slate-600">No booked projects found</p>
                    <p className="text-xs text-slate-400">Projects will appear automatically when leads reach Booked stage in CRM.</p>
                  </div>
                ) : (
                  projects.map(p => {
                    const totalCrew = (p.sub_events || []).reduce((acc, ev) => acc + (ev.crew?.length || 0), 0);
                    const copiedCrew = (p.sub_events || []).reduce((acc, ev) => acc + (ev.crew?.filter(c => c.is_copied).length || 0), 0);
                    const allCopied = totalCrew > 0 && copiedCrew === totalCrew;
                    const primaryDisk = p.assigned_disks?.[0];
                    const driveBackup = p.google_drive_backup;
                    const driveFolders = Array.isArray(driveBackup?.folders) && driveBackup.folders.length > 0
                      ? driveBackup.folders
                      : (driveBackup?.folder_name ? [{ name: driveBackup.folder_name }] : []);

                    return (
                      <div
                        key={p.id}
                        className="p-3.5 bg-slate-50/70 hover:bg-amber-50/40 border border-slate-200 hover:border-amber-300 rounded-2xl transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-slate-900 truncate">{p.client_name}</h4>
                            <span className="text-[11px] font-bold text-slate-500 font-mono flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{p.event_date || 'Date TBD'}</span>
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                              p.overall_storage_status === 'BACKED_UP_CLOUD'
                                ? 'bg-blue-100 text-blue-800'
                                : (p.overall_storage_status === 'COPIED_LOCAL'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800')
                            }`}>
                              {p.overall_storage_status?.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                            <span className="font-semibold text-slate-700">
                              {p.sub_events?.length || 0} Sub-Events
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400" />
                              <span>{totalCrew} Crew Allocated</span>
                            </span>
                            <span>•</span>
                            <span className={`inline-flex items-center gap-1 font-bold ${allCopied ? 'text-emerald-700' : 'text-amber-700'}`}>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{copiedCrew} / {totalCrew} Cards Copied</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap pt-0.5">
                            <span className="flex items-center gap-1 font-mono">
                              <HardDrive className="w-3 h-3 text-emerald-600" />
                              <span>{primaryDisk ? primaryDisk.disk_name : 'No Local Disk Assigned'}</span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Cloud className="w-3 h-3 text-blue-600" />
                              <span>{driveFolders.length > 0 ? `${driveFolders.length} Google Drive Folder(s)` : 'No Cloud Backup'}</span>
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setShowProjectsSummaryModal(false);
                            setExpandedProjectIds(prev => ({ ...prev, [p.id]: true }));
                            const el = document.getElementById(`project-card-${p.id}`);
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer shrink-0"
                        >
                          View Storage Card &rarr;
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowProjectsSummaryModal(false)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── METRIC MODAL 2: REGISTERED MEMORY CARDS ─────────────────────── */}
      <AnimatePresence>
        {showCardsListModal && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-amber-50/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center font-bold">
                    <SDCardIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <span>Registered Studio Memory Cards</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                        {memoryCards.length} Registered
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      SD Cards, CFexpress, and MicroSD inventory synced from Studio Settings
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/settings?tab=storage"
                    target="_blank"
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Manage in Settings</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowCardsListModal(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Memory Cards Grid */}
              <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
                {memoryCards.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <SDCardIcon className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-sm font-bold text-slate-600">No memory cards registered yet</p>
                    <p className="text-xs text-slate-400">Add cards in Studio Settings &gt; Studio Storage.</p>
                    <Link
                      href="/settings?tab=storage"
                      target="_blank"
                      className="inline-flex items-center gap-1 px-4 py-2 bg-amber-600 text-white text-xs font-black rounded-xl hover:bg-amber-700 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add First Memory Card</span>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {memoryCards.map(c => {
                      const formattedCap = c.capacity_gb >= 1000 
                        ? `${(c.capacity_gb / 1000).toFixed(0)} TB`
                        : `${c.capacity_gb} GB`;

                      return (
                        <div
                          key={c.id}
                          className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center gap-3 shadow-2xs hover:shadow-xs transition"
                          style={{ borderLeftWidth: '4px', borderLeftColor: c.color_tag || '#F59E0B' }}
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs relative overflow-hidden"
                            style={{ backgroundColor: c.color_tag || '#F59E0B' }}
                          >
                            <SDCardIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-xs font-black text-slate-900 truncate" title={c.card_name}>
                                {c.card_name}
                              </h4>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 shrink-0">
                                {formattedCap}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                              <span className="font-semibold text-slate-700">{c.card_type?.replace(/_/g, ' ')}</span>
                              {c.speed_class && <span>• {c.speed_class}</span>}
                            </div>
                            {c.notes && (
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">{c.notes}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowCardsListModal(false)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── METRIC MODAL 3: DISKS & DRIVES INVENTORY ───────────────────── */}
      <AnimatePresence>
        {showDisksListModal && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-emerald-50/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center font-bold">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <span>Physical Hard Drives &amp; SSD Storage Racks</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {disks.length} Registered
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      SSDs, HDDs, and NAS arrays registered in Studio Settings
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/settings?tab=storage"
                    target="_blank"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Manage in Settings</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowDisksListModal(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Disks Grid */}
              <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
                {disks.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <HardDrive className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-sm font-bold text-slate-600">No physical storage drives registered</p>
                    <p className="text-xs text-slate-400">Add external SSDs, HDDs, or NAS arrays in Studio Settings.</p>
                    <Link
                      href="/settings?tab=storage"
                      target="_blank"
                      className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl hover:bg-emerald-700 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add First Hard Drive / SSD</span>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {disks.map(d => {
                      const formattedCap = d.total_capacity_gb >= 1000 
                        ? `${(d.total_capacity_gb / 1000).toFixed(0)} TB`
                        : `${d.total_capacity_gb} GB`;

                      return (
                        <div
                          key={d.id}
                          className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center gap-3 shadow-2xs hover:shadow-xs transition"
                          style={{ borderLeftWidth: '4px', borderLeftColor: d.color_tag || '#3B82F6' }}
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                            style={{ backgroundColor: d.color_tag || '#3B82F6' }}
                          >
                            {d.disk_type === 'NAS' ? (
                              <Server className="w-5 h-5" />
                            ) : (
                              <HardDrive className="w-5 h-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-xs font-black text-slate-900 truncate" title={d.disk_name}>
                                {d.disk_name}
                              </h4>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 shrink-0">
                                {formattedCap}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                              <span className="font-semibold text-slate-700">{d.disk_type?.replace(/_/g, ' ')}</span>
                              {d.physical_location && <span>• 📍 {d.physical_location}</span>}
                            </div>
                            {d.notes && (
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">{d.notes}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowDisksListModal(false)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── METRIC MODAL 4: CONNECTED GOOGLE DRIVE ACCOUNTS ─────────────── */}
      <AnimatePresence>
        {showDriveAccountsModal && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-blue-50/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-blue-200 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                    <svg viewBox="0 0 87.3 78" className="w-6 h-6">
                      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <span>Connected Google Drive Cloud Accounts</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                        {driveAccounts.length} Connected
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Live storage quota meters and account folder browsing
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDriveAccountsModal(false);
                      setShowConnectDriveModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Connect New Google Drive</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDriveAccountsModal(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Accounts List */}
              <div className="p-4 overflow-y-auto space-y-3 flex-1">
                {driveAccounts.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Cloud className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-sm font-bold text-slate-600">No Google Drive accounts connected</p>
                    <p className="text-xs text-slate-400">Connect a Google account to enable cloud backups.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDriveAccountsModal(false);
                        setShowConnectDriveModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Connect Google Drive</span>
                    </button>
                  </div>
                ) : (
                  driveAccounts.map(acc => {
                    const usedBytes = Number(acc.used_storage_bytes) || 0;
                    const totalBytes = Number(acc.total_storage_bytes) || (2000 * 1024 * 1024 * 1024);
                    const percentUsed = totalBytes > 0 ? Math.min(100, Math.round((usedBytes / totalBytes) * 100)) : 0;

                    return (
                      <div
                        key={acc.id}
                        className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs hover:bg-blue-50/30 transition"
                      >
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-900">{acc.account_email}</span>
                            {acc.account_label && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                                {acc.account_label}
                              </span>
                            )}
                          </div>

                          {/* Quota Progress Bar */}
                          <div className="w-full max-w-md space-y-1">
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full transition-all"
                                style={{ width: `${percentUsed}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                              <span>{formatBytesHuman(usedBytes)} Used</span>
                              <span>{percentUsed}% of {formatBytesHuman(totalBytes)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={syncingAccountId === acc.id}
                            onClick={() => handleSyncDriveAccount(acc.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                            title="Sync live quota from Google Drive API"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncingAccountId === acc.id ? 'animate-spin text-blue-600' : ''}`} />
                            <span className="hidden sm:inline">Sync Quota</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowDriveAccountsModal(false);
                              handleOpenExplorerForAccount(acc);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-xs border border-blue-200 transition cursor-pointer flex items-center gap-1"
                            title="Browse folders inside this account"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Browse Folders</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGoogleAccount(acc.id)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Disconnect Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowDriveAccountsModal(false)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── FOLDER DETAILS MODAL (FROM THREE DOTS MENU) ─────────────────── */}
      <AnimatePresence>
        {folderDetailsModalData && (
          <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <Folder className="w-5 h-5 fill-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate" title={folderDetailsModalData.name}>
                      {folderDetailsModalData.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">Google Drive Folder</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFolderDetailsModalData(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5 p-3 bg-slate-50 rounded-2xl text-center">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Subfolders</span>
                  <p className="text-sm font-extrabold text-amber-700">{folderDetailsModalData.foldersCount ?? 0}</p>
                </div>
                <div className="space-y-0.5 border-x border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Files</span>
                  <p className="text-sm font-extrabold text-blue-700">{folderDetailsModalData.filesCount ?? 0}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Est. Size</span>
                  <p className="text-sm font-extrabold text-emerald-700">{folderDetailsModalData.formattedSize || '0 MB'}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                {activeProjectForGoogle && (
                  <button
                    type="button"
                    onClick={() => {
                      handleLinkFolderToProject(folderDetailsModalData);
                      setFolderDetailsModalData(null);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Link to Active Project</span>
                  </button>
                )}
                {folderDetailsModalData.webViewLink && (
                  <a
                    href={folderDetailsModalData.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Drive</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setFolderDetailsModalData(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 6: ENGLISH FOLDER UNLINK / REMOVAL CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {deleteFolderConfirmation && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-white dark:bg-[#12161F] rounded-3xl border border-zinc-200/90 dark:border-zinc-800 shadow-2xl overflow-hidden p-6 space-y-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 shadow-xs">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-zinc-950 dark:text-white">
                    Remove Folder Link?
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Are you sure you want to remove this folder from this project?
                  </p>
                </div>
              </div>

              {/* Folder Details Box */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    deleteFolderConfirmation.type === 'local'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                  }`}>
                    {deleteFolderConfirmation.type === 'local' ? (
                      <>
                        <HardDrive className="w-3 h-3" /> Local Machine / SSD
                      </>
                    ) : (
                      <>
                        <Cloud className="w-3 h-3" /> Google Drive Cloud
                      </>
                    )}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-black text-zinc-900 dark:text-white truncate">
                    {deleteFolderConfirmation.folderName || 'Selected Folder'}
                  </p>
                  {deleteFolderConfirmation.folderLabel && (
                    <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {deleteFolderConfirmation.folderLabel}
                    </p>
                  )}
                </div>
              </div>

              {/* Safety Assurance Alert */}
              <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  Files remain 100% safe
                </p>
                <p className="text-zinc-600 dark:text-zinc-400 pl-5">
                  This only removes the folder linkage in Filmify Studio Hub. Your original photos and video files on your physical disk or Google Drive will not be touched or deleted.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteFolderConfirmation(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteFolder}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Yes, Remove Folder</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 7: 3D EDIT STORAGE PROJECT DETAILS MODAL (STORAGE ISOLATED) ── */}
      <AnimatePresence>
        {editingProjectModal && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl bg-white rounded-3xl p-5 sm:p-6 border border-[#EAE5DA] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Edit Storage Project Details
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Update client name, event date, and shoot types for this card
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProjectModal(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Data Isolation Notice (English) */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 text-[11px] text-indigo-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-indigo-950">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  Isolated Storage Hub Update
                </p>
                <p className="text-indigo-800 leading-relaxed">
                  Changes made here only affect this Storage Hub card. Parent CRM leads, quotations, and studio financials remain 100% untouched and preserved.
                </p>
              </div>

              <div className="space-y-4">
                {/* Client Name & Event Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Client / Wedding Name *</label>
                    <input
                      type="text"
                      value={editProjectClientName}
                      onChange={e => setEditProjectClientName(e.target.value)}
                      placeholder="e.g. Pooja & Rahul Wedding"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Main Event Date</label>
                    <input
                      type="date"
                      value={editProjectEventDate}
                      onChange={e => setEditProjectEventDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                {/* 3D Multi-Select Shoot Types Dropdown */}
                <div className="space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-600" />
                      <span>Type of Shoot (Event Types)</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        {editProjectShootTypes.length} Selected
                      </span>
                    </label>
                    <Link
                      href="/settings?tab=functions"
                      target="_blank"
                      className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      <span>Studio Events Settings</span>
                    </Link>
                  </div>

                  {/* Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setIsEditShootTypeDropdownOpen(!isEditShootTypeDropdownOpen)}
                    className="w-full min-h-[42px] px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl flex items-center justify-between gap-2 text-left transition cursor-pointer shadow-2xs"
                  >
                    <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
                      {editProjectShootTypes.length === 0 ? (
                        <span className="text-xs text-slate-400 font-medium">
                          Click to select shoot types (e.g. Pre-Wedding, Haldi, Wedding Ceremony)...
                        </span>
                      ) : (
                        editProjectShootTypes.map((st, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs"
                          >
                            <Tag className="w-3 h-3 text-amber-600" />
                            <span>{st}</span>
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditProjectShootTypes(prev => prev.filter(t => t !== st));
                              }}
                              className="w-3.5 h-3.5 rounded-full hover:bg-rose-500 hover:text-white text-slate-400 flex items-center justify-center transition cursor-pointer ml-0.5"
                            >
                              <X className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          </span>
                        ))
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isEditShootTypeDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* 3D Popover Panel */}
                  <AnimatePresence>
                    {isEditShootTypeDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white border border-amber-200 rounded-2xl shadow-xl p-3 space-y-2.5 max-h-64 overflow-y-auto"
                      >
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={editShootTypeSearch}
                            onChange={e => setEditShootTypeSearch(e.target.value)}
                            placeholder="Search or type custom shoot type..."
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        {/* List of event types from Studio Settings */}
                        <div className="space-y-1">
                          {workspaceEventTypes
                            .filter(et => !editShootTypeSearch || et.name.toLowerCase().includes(editShootTypeSearch.toLowerCase()))
                            .map(et => {
                              const isSelected = editProjectShootTypes.some(t => t.toLowerCase() === et.name.toLowerCase());
                              return (
                                <div
                                  key={et.id}
                                  onClick={() => {
                                    setEditProjectShootTypes(prev =>
                                      isSelected
                                        ? prev.filter(t => t.toLowerCase() !== et.name.toLowerCase())
                                        : [...prev, et.name]
                                    );
                                  }}
                                  className={`p-2 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                    isSelected
                                      ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold shadow-2xs'
                                      : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Tag className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span className="text-xs truncate font-bold text-slate-900">{et.name}</span>
                                    {et.category && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium">
                                        {et.category}
                                      </span>
                                    )}
                                  </div>
                                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                    isSelected ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300'
                                  }`}>
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                </div>
                              );
                            })}

                          {/* Allow adding custom shoot type if search query is not in list */}
                          {editShootTypeSearch.trim() && !workspaceEventTypes.some(et => et.name.toLowerCase() === editShootTypeSearch.toLowerCase().trim()) && (
                            <button
                              type="button"
                              onClick={() => {
                                const customName = editShootTypeSearch.trim();
                                if (!editProjectShootTypes.includes(customName)) {
                                  setEditProjectShootTypes(prev => [...prev, customName]);
                                }
                                setEditShootTypeSearch('');
                              }}
                              className="w-full p-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold text-left flex items-center gap-2 cursor-pointer transition"
                            >
                              <Plus className="w-3.5 h-3.5 text-amber-600" />
                              <span>Add "{editShootTypeSearch.trim()}" as custom shoot type</span>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingProjectModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProjectDetails}
                  disabled={savingEditProject}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md shadow-amber-600/20 cursor-pointer flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {savingEditProject ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
