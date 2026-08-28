'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  HardDrive, Database, Search, Cloud, Laptop, Server, Plus, RefreshCw, 
  Folder, Film, Image as ImageIcon, CheckCircle2, AlertTriangle, ExternalLink, 
  Copy, Check, MapPin, User, Tag, Clock, ArrowUpRight, ShieldCheck, Sparkles, 
  Trash2, Edit3, Monitor, Layers, ChevronRight, Download, Filter, Eye, Cpu, Zap, X
} from 'lucide-react';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import { promptAndScanDirectory, formatBytes } from '@/lib/storage/disk-scanner';
import { supabase } from '@/lib/supabase';

interface DriveAccount {
  id: string;
  account_email: string;
  account_label: string;
  total_storage_bytes: number;
  used_storage_bytes: number;
  last_synced_at: string;
  is_active: boolean;
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
  total_capacity_bytes: number;
  free_capacity_bytes: number;
  assigned_to_user_name?: string;
  is_currently_mounted: boolean;
  last_scanned_at: string;
  storage_agent_machines?: {
    id: string;
    machine_name: string;
    is_online: boolean;
  };
}

interface StudioMachine {
  id: string;
  machine_name: string;
  machine_os: string;
  agent_token: string;
  last_heartbeat_at: string;
  is_online: boolean;
  active_drives_json?: any[];
}

interface IndexedItem {
  id: string;
  storage_source_type: 'GOOGLE_DRIVE' | 'PHYSICAL_DISK';
  folder_name: string;
  folder_path: string;
  relative_path?: string;
  client_id?: string;
  client_name?: string;
  web_view_link?: string;
  total_size_bytes: number;
  photo_count: number;
  video_count: number;
  other_files_count: number;
  event_category: 'RAW_PHOTOS' | 'RAW_VIDEOS' | 'SELECTION' | 'EDITS' | 'DELIVERABLES';
  tags: string[];
  last_modified_at?: string;
  storage_drive_accounts?: {
    account_email: string;
    account_label: string;
  };
  storage_physical_disks?: {
    disk_name: string;
    disk_label: string;
    drive_letter?: string;
    physical_location: string;
    assigned_to_user_name?: string;
    is_currently_mounted?: boolean;
    storage_agent_machines?: {
      machine_name: string;
      is_online: boolean;
    };
  };
}

export default function DataManagerPage() {
  const { workspaceId, isOwner, userName } = useWorkspace();
  const effectiveWsId = workspaceId || '00000000-0000-0000-0000-000000000000';

  // Active Tab
  const [activeTab, setActiveTab] = useState<'search' | 'cloud' | 'disks' | 'machines' | 'matrix'>('search');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'GOOGLE_DRIVE' | 'PHYSICAL_DISK'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchResults, setSearchResults] = useState<IndexedItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTookMs, setSearchTookMs] = useState<number>(0);

  // Data Collections
  const [driveAccounts, setDriveAccounts] = useState<DriveAccount[]>([]);
  const [physicalDisks, setPhysicalDisks] = useState<PhysicalDisk[]>([]);
  const [machines, setMachines] = useState<StudioMachine[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Scanner States
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isConnectDriveModalOpen, setIsConnectDriveModalOpen] = useState(false);
  const [manualDriveEmail, setManualDriveEmail] = useState('');
  const [manualDriveLabel, setManualDriveLabel] = useState('Primary Wedding Backup');
  const [manualDriveCapacityGb, setManualDriveCapacityGb] = useState(2000);
  const [manualDriveUsedGb, setManualDriveUsedGb] = useState(0);
  const [driveConnectTab, setDriveConnectTab] = useState<'oauth' | 'manual'>('oauth');
  const [currentOrigin, setCurrentOrigin] = useState('https://studiocore.in');
  const [urlNotice, setUrlNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);
  const [oauthStatusText, setOauthStatusText] = useState('');

  // Load Google Identity Services (GIS) Client Library for instant OAuth popup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
      const params = new URLSearchParams(window.location.search);
      if (params.get('connected') === 'true') {
        const email = params.get('email') || 'your Google account';
        setUrlNotice({ type: 'success', message: `🎉 Google Drive (${email}) connected successfully & synced with your studio hub!` });
      } else if (params.get('error')) {
        const err = params.get('error');
        setUrlNotice({
          type: 'error',
          message: err === 'token_failed' 
            ? '⚠️ Google OAuth redirect verification failed. Please try clicking "Sign In with Google" below for instant popup connection.'
            : `⚠️ Google Drive connection notice: ${err}. Please click "Sign In with Google" below.`
        });
      }

      // Inject Google GIS script if not present
      if (!document.getElementById('google-gis-sdk')) {
        const script = document.createElement('script');
        script.id = 'google-gis-sdk';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
    }
  }, []);
  const [isAddDiskModalOpen, setIsAddDiskModalOpen] = useState(false);
  const [isAddMachineModalOpen, setIsAddMachineModalOpen] = useState(false);
  const [editingDisk, setEditingDisk] = useState<PhysicalDisk | null>(null);
  const [isScanningBrowser, setIsScanningBrowser] = useState(false);
  const [scanStatusMsg, setScanStatusMsg] = useState('');
  const [copiedPathId, setCopiedPathId] = useState<string | null>(null);
  const [newAgentToken, setNewAgentToken] = useState('');
  const [newMachineName, setNewMachineName] = useState('');

  // Manual Disk Form State
  const [manualDiskForm, setManualDiskForm] = useState({
    disk_name: '',
    disk_label: '',
    disk_type: 'EXTERNAL_HDD',
    physical_location: 'Office Rack 1 - Shelf A',
    total_capacity_gb: 4000,
    free_capacity_gb: 1800,
    assigned_to_user_name: '',
  });

  // Load All Storage Data & Live Google Drive Accounts
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch live Google Drive Accounts from API route (which uses supabaseAdmin)
      let accounts: DriveAccount[] = [];
      try {
        const drivesRes = await fetch('/api/storage/google/accounts?workspace_id=' + effectiveWsId).then(r => r.json());
        if (drivesRes.success && Array.isArray(drivesRes.accounts)) {
          accounts = drivesRes.accounts;
        }
      } catch (_) {}

      // Direct Supabase fallback
      if (accounts.length === 0) {
        let driveQuery = supabase
          .from('storage_drive_accounts')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (effectiveWsId && effectiveWsId !== '00000000-0000-0000-0000-000000000000') {
          driveQuery = driveQuery.or(`workspace_id.eq.${effectiveWsId},workspace_id.eq.00000000-0000-0000-0000-000000000000`);
        }

        const { data: dbAccounts } = await driveQuery;
        if (dbAccounts && Array.isArray(dbAccounts)) {
          accounts = dbAccounts;
        }
      }

      // Filter out any demo placeholders
      const liveDrives = accounts.filter(
        (d: any) => !d.account_email?.includes('primary@gmail.com') && !d.account_email?.includes('studio.drive.914')
      );
      setDriveAccounts(liveDrives);

      const [disksRes, machinesRes] = await Promise.all([
        fetch('/api/storage/physical/list?workspace_id=' + effectiveWsId).then(r => r.json()),
        fetch('/api/agent/machines?workspace_id=' + effectiveWsId).then(r => r.json()),
      ]);

      if (disksRes.success && Array.isArray(disksRes.disks)) {
        setPhysicalDisks(disksRes.disks);
      }
      if (machinesRes.success && Array.isArray(machinesRes.machines)) {
        setMachines(machinesRes.machines);
      }
    } catch (err) {
      console.error('[DataManager] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveWsId]);

  // Universal Instant Search Execution (< 15ms)
  const executeSearch = useCallback(async (query: string, source: string, cat: string) => {
    setSearchLoading(true);
    const start = Date.now();
    try {
      const url = '/api/storage/search?workspace_id=' + effectiveWsId + '&q=' + encodeURIComponent(query) + '&source_type=' + source + '&category=' + cat + '&limit=100';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.items)) {
        setSearchResults(json.items);
        setSearchTookMs(json.took_ms || (Date.now() - start));
      }
    } catch (err) {
      console.error('[DataManager] Search exception:', err);
    } finally {
      setSearchLoading(false);
    }
  }, [effectiveWsId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Trigger search on filter changes with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch(searchQuery, sourceFilter, categoryFilter);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery, sourceFilter, categoryFilter, executeSearch]);

  // Aggregate Metrics
  const stats = useMemo(() => {
    let totalBytes = 0;
    let usedBytes = 0;
    let totalPhotos = 0;
    let totalVideos = 0;

    driveAccounts.forEach(d => {
      totalBytes += Number(d.total_storage_bytes || 0);
      usedBytes += Number(d.used_storage_bytes || 0);
    });

    physicalDisks.forEach(p => {
      const capBytes = Number(p.total_capacity_bytes || (p.total_capacity_gb * 1024 * 1024 * 1024));
      const freeBytes = Number(p.free_capacity_bytes || (p.free_capacity_gb * 1024 * 1024 * 1024));
      totalBytes += capBytes;
      usedBytes += Math.max(0, capBytes - freeBytes);
    });

    searchResults.forEach(item => {
      totalPhotos += item.photo_count || 0;
      totalVideos += item.video_count || 0;
    });

    const freeBytes = Math.max(0, totalBytes - usedBytes);
    const usedPercentage = totalBytes > 0 ? Math.min(100, Math.round((usedBytes / totalBytes) * 100)) : 0;

    return {
      totalFormatted: formatBytes(totalBytes),
      usedFormatted: formatBytes(usedBytes),
      freeFormatted: formatBytes(freeBytes),
      usedPercentage,
      totalPhotos,
      totalVideos,
      connectedDrivesCount: driveAccounts.length,
      onlineMachinesCount: machines.filter(m => m.is_online).length,
      totalDisksCount: physicalDisks.length,
    };
  }, [driveAccounts, physicalDisks, searchResults, machines]);

  // Handle Browser Native Scan Directory
  const handleBrowserNativeScan = async () => {
    try {
      setIsScanningBrowser(true);
      setScanStatusMsg('Opening Directory Picker...');
      const scanSummary = await promptAndScanDirectory();

      if (!scanSummary) {
        setIsScanningBrowser(false);
        return;
      }

      setScanStatusMsg('Indexing ' + scanSummary.folders.length + ' folders from ' + scanSummary.diskName + '...');

      const res = await fetch('/api/storage/physical/sync-tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: effectiveWsId,
          disk_name: scanSummary.diskName,
          total_size_bytes: scanSummary.totalSizeBytes,
          total_photos: scanSummary.totalPhotos,
          total_videos: scanSummary.totalVideos,
          folders: scanSummary.folders,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setScanStatusMsg('Successfully indexed ' + scanSummary.folders.length + ' folders!');
        await loadAllData();
        executeSearch(searchQuery, sourceFilter, categoryFilter);
        setTimeout(() => setIsScanModalOpen(false), 1200);
      } else {
        alert(json.error || 'Failed to sync disk');
      }
    } catch (err: any) {
      console.error('[BrowserScan] Error:', err);
      alert(err.message || 'Scan cancelled or unsupported');
    } finally {
      setIsScanningBrowser(false);
    }
  };

  // Register New Studio Machine
  const handleRegisterMachine = async () => {
    if (!newMachineName.trim()) return;
    try {
      const res = await fetch('/api/agent/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: effectiveWsId,
          machine_name: newMachineName,
          machine_os: 'Windows',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewAgentToken(json.agent_token);
        await loadAllData();
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to register machine');
    }
  };

  // Manual Create Physical Disk
  const handleCreateManualDisk = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/storage/physical/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: effectiveWsId,
          ...manualDiskForm,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsAddDiskModalOpen(false);
        setManualDiskForm({
          disk_name: '',
          disk_label: '',
          disk_type: 'EXTERNAL_HDD',
          physical_location: 'Office Rack 1 - Shelf A',
          total_capacity_gb: 4000,
          free_capacity_gb: 1800,
          assigned_to_user_name: '',
        });
        await loadAllData();
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to save disk');
    }
  };

  // Automated Google Drive OAuth flow (Client GIS Popup with live quota auto-detection)
  const handleConnectGoogleDrive = () => {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      try {
        setIsConnectingOAuth(true);
        setOauthStatusText('Opening Google Account Chooser...');

        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: '666330539586-q0s8vvr4osdah4e60rd75s3keolfgmc0.apps.googleusercontent.com',
          scope: 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/drive.readonly',
          callback: async (resp: any) => {
            if (resp.error) {
              setIsConnectingOAuth(false);
              setOauthStatusText('');
              if (resp.error !== 'popup_closed_by_user') {
                alert('Google Sign-In notice: ' + (resp.error_description || resp.error));
              }
              return;
            }

            if (resp.access_token) {
              try {
                setOauthStatusText('Reading Google profile & email...');
                const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                  headers: { Authorization: `Bearer ${resp.access_token}` },
                });
                const userData = await userRes.json();
                const email = userData.email || 'studio.drive@gmail.com';
                const name = userData.name || email.split('@')[0];

                setOauthStatusText('Detecting real Google Drive storage quota...');
                const aboutRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota,user', {
                  headers: { Authorization: `Bearer ${resp.access_token}` },
                });
                const aboutData = await aboutRes.json();
                const quota = aboutData.storageQuota || {};
                
                let totalBytes = 15 * 1024 * 1024 * 1024;
                let usedBytes = 0;
                if (quota.limit) {
                  const parsed = parseInt(String(quota.limit), 10);
                  if (!isNaN(parsed) && parsed > 0) totalBytes = parsed;
                }
                if (quota.usage) {
                  const parsed = parseInt(String(quota.usage), 10);
                  if (!isNaN(parsed) && parsed >= 0) usedBytes = parsed;
                }

                setOauthStatusText('Linking connected Drive to Studio Hub...');
                const saveRes = await fetch('/api/storage/google/accounts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    workspace_id: effectiveWsId,
                    account_email: email,
                    account_label: name,
                    total_storage_gb: Number((totalBytes / (1024 ** 3)).toFixed(1)),
                    used_storage_gb: Number((usedBytes / (1024 ** 3)).toFixed(1)),
                    access_token: resp.access_token,
                  }),
                });

                const json = await saveRes.json();
                if (json.success && json.account) {
                  setDriveAccounts(prev => [json.account, ...prev.filter(a => a.id !== json.account.id)]);
                  setIsConnectDriveModalOpen(false);
                  setUrlNotice({
                    type: 'success',
                    message: `🎉 Google Drive (${email}) connected & storage detected automatically! (${(usedBytes / (1024 ** 3)).toFixed(1)} GB used of ${(totalBytes / (1024 ** 3)).toFixed(1)} GB)`
                  });
                  await loadAllData();
                } else {
                  alert(json.error || 'Failed to link Google Drive');
                }
              } catch (err: any) {
                console.error('OAuth auto-detect exception:', err);
                alert('Failed to detect Google Drive quota: ' + err.message);
              } finally {
                setIsConnectingOAuth(false);
                setOauthStatusText('');
              }
            }
          },
        });

        client.requestAccessToken({ prompt: 'consent' });
        return;
      } catch (err) {
        console.warn('GIS Token Client init failed, falling back to full redirect:', err);
      }
    }

    // Fallback to server-side full redirect OAuth flow
    window.location.href = `/api/storage/google/auth?workspace_id=${encodeURIComponent(effectiveWsId)}`;
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPathId(id);
    setTimeout(() => setCopiedPathId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 font-sans p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">

      {/* URL Notification Banner (OAuth feedback / Direct Link suggestion) */}
      {urlNotice && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold shadow-2xs ${
          urlNotice.type === 'success'
            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
            : 'bg-amber-50 text-amber-950 border-amber-300'
        }`}>
          <div className="flex items-center gap-2">
            {urlNotice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <span>{urlNotice.message}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {urlNotice.type === 'error' && (
              <button
                onClick={() => {
                  setDriveConnectTab('manual');
                  setIsConnectDriveModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 transition cursor-pointer"
              >
                ⚡ Open Instant Direct Link
              </button>
            )}
            <button
              onClick={() => setUrlNotice(null)}
              className="p-1 text-zinc-500 hover:text-zinc-800 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & ACTION CONTROLS
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-2xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1.5 shadow-2xs">
              <HardDrive className="w-3.5 h-3.5 text-amber-600" />
              Unified Storage Hub &amp; Cataloger
            </span>
            <span className="text-[11px] font-bold text-zinc-400 bg-zinc-100 px-2.5 py-0.5 rounded-full border border-zinc-200">
              ⚡ Sub-millisecond Instant Search
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
            StudioCore Data Manager
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 font-medium max-w-2xl">
            Index, track, and search your studio's wedding footage across multiple Google Drives, physical Hard Disks/SSDs, and background PC editing rigs in real-time.
          </p>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 pt-3 overflow-x-auto">
            {[
              { id: 'search', label: '🔍 Universal Search', count: searchResults.length },
              { id: 'cloud', label: '☁️ Google Drives', count: driveAccounts.length },
              { id: 'disks', label: '💾 Physical Disks', count: physicalDisks.length },
              { id: 'machines', label: '🖥️ Studio PCs & Agents', count: machines.length },
              { id: 'matrix', label: '👥 Client Data Matrix', count: null },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ' + (
                  activeTab === tab.id
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                )}
              >
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={'text-[10px] px-1.5 py-0.2 rounded-md font-mono ' + (
                    activeTab === tab.id ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-200 text-zinc-600'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Top Action CTAs */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsScanModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>🔌 Scan Hard Disk (Browser)</span>
          </button>

          <button
            onClick={() => setIsConnectDriveModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold transition flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <Cloud className="w-4 h-4 text-blue-500" />
            <span>+ Connect Google Drive</span>
          </button>

          <button
            onClick={() => {
              setNewAgentToken('');
              setNewMachineName('');
              setIsAddMachineModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <Laptop className="w-4 h-4 text-emerald-400" />
            <span>+ Link Studio PC</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TOP STATS RIBBON & UNIFIED STORAGE CAPACITY
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-2xs space-y-3 col-span-2 sm:col-span-1 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Unified Storage</span>
            <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
              {stats.usedPercentage}% Used
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-900">{stats.totalFormatted}</div>
            <div className="text-[11px] font-semibold text-zinc-500 flex items-center gap-1.5 mt-0.5">
              <span>{stats.usedFormatted} used</span>
              <span>•</span>
              <span className="text-emerald-600 font-bold">{stats.freeFormatted} available</span>
            </div>
          </div>
          <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden flex">
            <div 
              style={{ width: stats.usedPercentage + '%' }} 
              className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500" 
            />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-2xs space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5" /> Photos Indexed
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-emerald-950">
            {stats.totalPhotos.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] font-medium text-zinc-400">RAW (.CR3, .ARW, .NEF) + JPEGs</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-2xs space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider flex items-center gap-1">
              <Film className="w-3.5 h-3.5" /> Videos Tracked
            </span>
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-sky-950">
            {stats.totalVideos.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] font-medium text-zinc-400">ProRes, BRAW, MXF &amp; 4K MP4s</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-2xs space-y-2 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1">
            <Server className="w-3.5 h-3.5" /> Active Systems
          </span>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-black text-zinc-900">{stats.onlineMachinesCount} PCs</div>
              <span className="text-[10px] text-zinc-400 font-bold">Online Agents</span>
            </div>
            <div className="w-px h-8 bg-zinc-200" />
            <div>
              <div className="text-lg font-black text-zinc-900">{stats.connectedDrivesCount} Drives</div>
              <span className="text-[10px] text-zinc-400 font-bold">Google Cloud</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. CONNECTED STUDIO PCs REAL-TIME RIBBON
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-3xl border border-zinc-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-zinc-700 uppercase tracking-wider flex items-center gap-2">
            <Laptop className="w-4 h-4 text-emerald-600" />
            Studio PC Background Agents ({machines.length})
          </span>
          <button
            onClick={loadAllData}
            className="text-[11px] font-bold text-zinc-500 hover:text-zinc-900 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={'w-3 h-3 ' + (loading ? 'animate-spin text-amber-500' : '')} />
            <span>Refresh PCs</span>
          </button>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {machines.length === 0 ? (
            <div className="text-xs text-zinc-400 py-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>No background PC agents installed yet. Click "+ Link Studio PC" to auto-catalog editing rigs.</span>
            </div>
          ) : (
            machines.map(m => (
              <div
                key={m.id}
                className={'px-3.5 py-2 rounded-2xl border flex items-center gap-3 transition-all shrink-0 ' + (
                  m.is_online
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-500'
                )}
              >
                <div className="relative">
                  <Monitor className="w-4 h-4" />
                  <span className={'w-2 h-2 rounded-full absolute -top-0.5 -right-0.5 border border-white ' + (
                    m.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                  )} />
                </div>

                <div>
                  <div className="text-xs font-black leading-tight flex items-center gap-1.5">
                    <span>{m.machine_name}</span>
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded-md bg-white border border-zinc-200 font-mono font-normal">
                      {m.machine_os || 'Windows'}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-medium">
                    {m.is_online ? '🟢 Online • Syncing live' : '🔴 Offline'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. TAB CONTENT VIEWS
      ───────────────────────────────────────────────────────────── */}

      {/* ─── TAB 1: UNIVERSAL SEARCH & ASSET FINDER ─── */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-zinc-200 shadow-2xs space-y-3.5">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search any wedding footage, client couple, raw reel, teaser folder across all PCs and Drives..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-28 py-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-hidden focus:border-amber-500 transition shadow-inner"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-[10.5px] font-mono font-bold text-zinc-400 bg-zinc-100 px-2 py-1 rounded-lg border border-zinc-200">
                  {searchTookMs} ms
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-100">
              <div className="flex items-center gap-1.5">
                {[
                  { id: 'ALL', label: 'All Storage Sources' },
                  { id: 'GOOGLE_DRIVE', label: '☁️ Google Drive Only' },
                  { id: 'PHYSICAL_DISK', label: '💾 Physical HDDs/SSDs' },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSourceFilter(s.id as any)}
                    className={'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ' + (
                      sourceFilter === s.id
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto">
                {[
                  { id: 'ALL', label: 'All Categories' },
                  { id: 'RAW_PHOTOS', label: '📸 RAW Photos' },
                  { id: 'RAW_VIDEOS', label: '🎥 RAW Footage' },
                  { id: 'SELECTION', label: '✨ Selection' },
                  { id: 'EDITS', label: '🎬 Edits & Teasers' },
                  { id: 'DELIVERABLES', label: '📦 Deliverables' },
                ].map(c => (
                  <button
                    key={c.id}
                    onClick={() => setCategoryFilter(c.id)}
                    className={'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ' + (
                      categoryFilter === c.id
                        ? 'bg-amber-500 text-white'
                        : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100 border border-zinc-200'
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {searchLoading ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
              <p className="text-xs font-bold text-zinc-400">Searching indexed catalog...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200 space-y-3">
              <HardDrive className="w-10 h-10 text-zinc-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-800">No Indexed Media Folders Found</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  {searchQuery
                    ? 'No files matching "' + searchQuery + '". Try connecting a Google Drive account or scanning a Hard Disk.'
                    : 'Plug in a hard disk or connect Google Drive to search your wedding data in milliseconds.'}
                </p>
              </div>
              <button
                onClick={() => setIsScanModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>Scan Hard Disk Now</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map(item => {
                const isCloud = item.storage_source_type === 'GOOGLE_DRIVE';
                const isMounted = item.storage_physical_disks?.is_currently_mounted;
                const formattedSize = formatBytes(item.total_size_bytes);

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-2xs hover:shadow-md transition-all space-y-3.5 flex flex-col justify-between group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {isCloud ? (
                            <span className="px-2.5 py-1 rounded-xl text-[10.5px] font-black uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                              <Cloud className="w-3 h-3 text-blue-600" />
                              Google Drive
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl text-[10.5px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <HardDrive className="w-3 h-3 text-amber-600" />
                              Physical Disk
                            </span>
                          )}

                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                            {item.event_category?.replace('_', ' ')}
                          </span>
                        </div>

                        {isCloud && item.web_view_link ? (
                          <a
                            href={item.web_view_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-xl bg-zinc-50 hover:bg-blue-50 hover:text-blue-600 border border-zinc-200 text-zinc-500 transition cursor-pointer"
                            title="Open in Google Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <button
                            onClick={() => handleCopy(item.folder_path, item.id)}
                            className="p-1.5 rounded-xl bg-zinc-50 hover:bg-amber-50 hover:text-amber-600 border border-zinc-200 text-zinc-500 transition cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                            title="Copy Folder Path"
                          >
                            {copiedPathId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-black text-zinc-900 group-hover:text-amber-600 transition-colors line-clamp-1">
                          {item.folder_name}
                        </h3>
                        {item.client_name && (
                          <p className="text-xs font-semibold text-zinc-500 flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 text-zinc-400" />
                            <span>Client: {item.client_name}</span>
                          </p>
                        )}
                      </div>

                      <div className="bg-zinc-50 rounded-2xl p-2.5 border border-zinc-200/60 text-xs space-y-1">
                        {isCloud ? (
                          <div className="flex items-center gap-1.5 text-zinc-600 truncate">
                            <Cloud className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="truncate">{item.storage_drive_accounts?.account_email || 'Google Drive'}</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-zinc-800 flex items-center gap-1.5 truncate">
                                <HardDrive className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                {item.storage_physical_disks?.disk_name || 'External Hard Disk'}
                              </span>
                              {isMounted ? (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-md border border-emerald-200 shrink-0">
                                  🟢 Connected
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-1.5 py-0.2 rounded-md shrink-0">
                                  ⚪ Offline Disk
                                </span>
                              )}
                            </div>

                            {item.storage_physical_disks?.physical_location && (
                              <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
                                <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                <span>Shelf: {item.storage_physical_disks.physical_location}</span>
                              </div>
                            )}

                            <div className="text-[10px] text-zinc-400 font-mono truncate">
                              Path: {item.folder_path}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs font-bold text-zinc-600">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-emerald-700">
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                          {item.photo_count.toLocaleString('en-IN')} Photos
                        </span>
                        <span className="flex items-center gap-1 text-sky-700">
                          <Film className="w-3.5 h-3.5 text-sky-500" />
                          {item.video_count.toLocaleString('en-IN')} Videos
                        </span>
                      </div>

                      <span className="font-mono text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-lg border border-zinc-200">
                        {formattedSize}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: CLOUD DRIVES (MULTI-GOOGLE DRIVE) ─── */}
      {activeTab === 'cloud' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-zinc-900">Connected Google Drive Accounts</h2>
              <p className="text-xs text-zinc-500">Attach multiple Gmail / Google Workspace accounts for unlimited segmented storage.</p>
            </div>

            <button
              onClick={() => setIsConnectDriveModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-blue-600/20 cursor-pointer"
            >
              <Cloud className="w-4 h-4" />
              <span>+ Connect Another Google Account</span>
            </button>
          </div>

          {driveAccounts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200 space-y-4 shadow-2xs">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto">
                <Cloud className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-800">No Google Drive Connected</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Connect your studio's Google Workspace or personal Drive to automatically index client deliverables and wedding films.
                </p>
              </div>
              <button
                onClick={() => setIsConnectDriveModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-2 hover:bg-blue-700 transition cursor-pointer shadow-sm shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>+ Connect First Google Drive</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {driveAccounts.map(account => {
                const totalBytes = Number(account.total_storage_bytes) || (15 * 1024 * 1024 * 1024);
                const usedBytes = Number(account.used_storage_bytes) || 0;
                const usedGb = (usedBytes / (1024 ** 3)).toFixed(1);
                const totalGb = (totalBytes / (1024 ** 3)).toFixed(1);
                const progressPercent = Math.min(100, Math.round((usedBytes / (totalBytes || 1)) * 100));
                const isNearFull = progressPercent >= 85;

                return (
                  <div
                    key={account.id}
                    className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-2xs space-y-4 flex flex-col justify-between hover:border-blue-300 transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                            <Cloud className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-black text-zinc-900 truncate" title={account.account_email}>
                              {account.account_email}
                            </h3>
                            <span className="text-[10px] font-bold text-zinc-400 block truncate">
                              {account.account_label || 'Cloud Storage'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={'px-2 py-0.5 rounded-md text-[10px] font-bold border ' + (
                            isNearFull
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          )}>
                            {progressPercent}% Used
                          </span>

                          <button
                            onClick={async () => {
                              if (!confirm(`Are you sure you want to disconnect ${account.account_email}?`)) return;
                              await supabase.from('storage_drive_accounts').delete().eq('id', account.id);
                              await loadAllData();
                            }}
                            className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Disconnect Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-zinc-700 font-mono">{usedGb} GB used</span>
                          <span className="text-zinc-400 font-mono">Total: {totalGb} GB</span>
                        </div>
                        <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${progressPercent}%` }}
                            className={'h-full rounded-full transition-all ' + (
                              isNearFull ? 'bg-rose-500' : 'bg-blue-600'
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Synced {account.last_synced_at ? new Date(account.last_synced_at).toLocaleDateString('en-IN') : 'Just now'}
                      </span>

                      <button
                        onClick={async () => {
                          await fetch('/api/storage/google/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ account_id: account.id, workspace_id: effectiveWsId }),
                          });
                          await loadAllData();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-blue-50 hover:text-blue-700 text-zinc-700 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Sync Now</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: PHYSICAL DISKS & HARD DRIVES ─── */}
      {activeTab === 'disks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-zinc-900">Physical Hard Disks &amp; SSD Inventory</h2>
              <p className="text-xs text-zinc-500">Track shelf locations, assigned shooters/editors, and remaining gigabytes on all offline media.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsScanModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-amber-500/20 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>🔌 Scan Drive (Browser)</span>
              </button>

              <button
                onClick={() => setIsAddDiskModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Register Disk</span>
              </button>
            </div>
          </div>

          {physicalDisks.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200 space-y-3">
              <HardDrive className="w-12 h-12 text-zinc-300 mx-auto" />
              <h3 className="text-base font-bold text-zinc-800">No Physical Disks Cataloged</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Plug in your Seagate, Lacie, or Sandisk hard disk and scan it in seconds with the browser directory picker.
              </p>
              <button
                onClick={() => setIsScanModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-bold inline-block hover:bg-amber-600 transition cursor-pointer"
              >
                Scan Plugged-in Hard Disk
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {physicalDisks.map(disk => {
                const totalGb = disk.total_capacity_gb || 4000;
                const freeGb = disk.free_capacity_gb || 1800;
                const usedGb = Math.max(0, totalGb - freeGb);
                const usedPct = Math.round((usedGb / totalGb) * 100);

                return (
                  <div
                    key={disk.id}
                    className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-2xs space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                            <HardDrive className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-zinc-900 leading-tight">{disk.disk_name}</h3>
                            <span className="text-[10.5px] font-mono text-zinc-400 block mt-0.5">
                              SN: {disk.disk_serial || 'N/A'}
                            </span>
                          </div>
                        </div>

                        {disk.is_currently_mounted ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            🟢 Mounted {disk.drive_letter || ''}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-500 border border-zinc-200">
                            ⚪ Shelf / Offline
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2 text-zinc-600">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="font-semibold">{disk.physical_location || 'Main Storage Rack'}</span>
                        </div>

                        {disk.assigned_to_user_name && (
                          <div className="flex items-center gap-2 text-zinc-600">
                            <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>Assigned to: {disk.assigned_to_user_name}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-zinc-600">{usedGb} GB Used</span>
                          <span className="text-emerald-600">{freeGb} GB Free</span>
                        </div>
                        <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            style={{ width: usedPct + '%' }}
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-zinc-400">
                        {disk.disk_type || 'EXTERNAL_HDD'} • {totalGb} GB
                      </span>

                      <button
                        onClick={() => {
                          setEditingDisk(disk);
                          setManualDiskForm({
                            disk_name: disk.disk_name,
                            disk_label: disk.disk_label,
                            disk_type: disk.disk_type,
                            physical_location: disk.physical_location,
                            total_capacity_gb: disk.total_capacity_gb,
                            free_capacity_gb: disk.free_capacity_gb,
                            assigned_to_user_name: disk.assigned_to_user_name || '',
                          });
                          setIsAddDiskModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit Location</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: STUDIO PCs & BACKGROUND AGENTS ─── */}
      {activeTab === 'machines' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-zinc-900">Studio PCs &amp; Automated Background Agents</h2>
              <p className="text-xs text-zinc-500">Run the lightweight background agent on your editing PCs (PC-01 to PC-04) to catalog inserted drives automatically without opening the browser.</p>
            </div>

            <button
              onClick={() => {
                setNewAgentToken('');
                setNewMachineName('');
                setIsAddMachineModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Laptop className="w-4 h-4 text-emerald-400" />
              <span>+ Register New PC</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {machines.map(m => (
              <div
                key={m.id}
                className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-2xs space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={'w-11 h-11 rounded-2xl border flex items-center justify-center ' + (
                        m.is_online ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-zinc-50 border-zinc-200 text-zinc-400'
                      )}>
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-zinc-900">{m.machine_name}</h3>
                        <span className="text-[10px] font-mono text-zinc-400">Token: {m.agent_token}</span>
                      </div>
                    </div>

                    <span className={'px-2.5 py-1 rounded-xl text-[10.5px] font-black uppercase tracking-wider border ' + (
                      m.is_online
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                    )}>
                      {m.is_online ? '🟢 Online' : '🔴 Offline'}
                    </span>
                  </div>

                  {/* 1-Click Install Command */}
                  <div className="bg-zinc-900 text-zinc-100 p-3 rounded-2xl text-[11px] font-mono space-y-1 relative group">
                    <span className="text-[9.5px] font-bold text-zinc-400 block uppercase">1-Click PowerShell Setup Command:</span>
                    <p className="truncate text-amber-300">
                      {'irm https://studiocore.in/agents/install.ps1 | iex -args "' + m.agent_token + '"'}
                    </p>
                    <button
                      onClick={() => handleCopy('irm https://studiocore.in/agents/install.ps1 | iex -args "' + m.agent_token + '"', m.id)}
                      className="absolute right-2.5 top-2.5 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
                      title="Copy Setup Command"
                    >
                      {copiedPathId === m.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                  <span>Heartbeat: {m.last_heartbeat_at ? new Date(m.last_heartbeat_at).toLocaleTimeString('en-IN') : 'None'}</span>
                  <span>{m.machine_os || 'Windows 11'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 5: CLIENT DATA MATRIX ─── */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-2xs space-y-6">
          <div>
            <h2 className="text-base font-black text-zinc-900">Client Wedding Data Matrix</h2>
            <p className="text-xs text-zinc-500">Live overview of where each client's RAW footage, selections, edits, and final master deliverables reside.</p>
          </div>

          {searchResults.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-400">
              No client wedding data indexed yet. Use the universal search or scan a hard drive to populate the matrix.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {searchResults.slice(0, 25).map(item => (
                <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-zinc-900 truncate">{item.client_name || item.folder_name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                        {item.event_category}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 font-mono truncate">{item.folder_path}</p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-xs font-bold">
                    <span className="text-zinc-600">{item.photo_count} 📸 • {item.video_count} 🎥</span>
                    <span className="font-mono text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-lg border border-zinc-200">
                      {formatBytes(item.total_size_bytes)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. BROWSER DISK SCANNER MODAL
      ───────────────────────────────────────────────────────────── */}
      {isScanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-zinc-200 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
              <Zap className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-zinc-900">Scan Hard Disk or SSD</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                StudioCore uses the browser File System Access API to read folder structures and classify RAW photos and 4K footage without uploading any heavy media.
              </p>
            </div>

            {isScanningBrowser ? (
              <div className="py-6 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
                <p className="text-xs font-bold text-zinc-700">{scanStatusMsg}</p>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleBrowserNativeScan}
                  className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <HardDrive className="w-4 h-4" />
                  <span>Select Hard Disk / Folder</span>
                </button>

                <button
                  onClick={() => setIsScanModalOpen(false)}
                  className="w-full py-3 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. ADD STUDIO PC MODAL
      ───────────────────────────────────────────────────────────── */}
      {isAddMachineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-zinc-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-900">
                  <Laptop className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-900">Link Studio Editing PC</h3>
                  <span className="text-xs text-zinc-400">Background Real-Time Cataloger</span>
                </div>
              </div>
              <button
                onClick={() => setIsAddMachineModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {newAgentToken ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" /> PC Registered Successfully
                  </span>
                  <p className="text-xs font-medium">
                    Run this single command in PowerShell on your editing computer to start background drive monitoring:
                  </p>
                  <div className="bg-zinc-900 text-amber-300 p-3 rounded-xl font-mono text-xs break-all select-all">
                    {'irm https://studiocore.in/agents/install.ps1 | iex -args "' + newAgentToken + '"'}
                  </div>
                </div>

                <button
                  onClick={() => setIsAddMachineModalOpen(false)}
                  className="w-full py-3 rounded-2xl bg-zinc-900 text-white text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Machine Name / Rig Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Editing-Rig-01 (Rohit) or Mac-Studio-M2"
                    value={newMachineName}
                    onChange={(e) => setNewMachineName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-zinc-900"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleRegisterMachine}
                    className="flex-1 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Generate Agent Installer
                  </button>
                  <button
                    onClick={() => setIsAddMachineModalOpen(false)}
                    className="px-4 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. MANUAL DISK REGISTRATION MODAL
      ───────────────────────────────────────────────────────────── */}

      {/* ─────────────────────────────────────────────────────────────
          8. CONNECT GOOGLE DRIVE & OAUTH SETUP MODAL
      ───────────────────────────────────────────────────────────── */}
      {isConnectDriveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-zinc-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-900">Connect Google Drive</h3>
                  <span className="text-xs text-zinc-400">Multi-Account Wedding Cloud Sync</span>
                </div>
              </div>
              <button
                onClick={() => setIsConnectDriveModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Automated Google OAuth Section */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-2">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                  <Cloud className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>100% Automated Storage Detection</span>
                </div>
                <p className="text-[11.5px] leading-relaxed text-blue-900/80">
                  Sign in with your Google account. StudioCore will automatically read your account email, calculate used GB, total capacity, and show your live Drive storage card immediately.
                </p>
              </div>

              <button
                type="button"
                disabled={isConnectingOAuth}
                onClick={handleConnectGoogleDrive}
                className="w-full py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-700 text-white font-bold text-xs shadow-lg shadow-zinc-900/20 transition flex items-center justify-center gap-3 cursor-pointer"
              >
                {isConnectingOAuth ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                    <span>{oauthStatusText || 'Connecting to Google Drive...'}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Sign In with Google</span>
                  </>
                )}
              </button>

              {/* Google Cloud Console Redirect URI Info */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs space-y-1.5 text-zinc-600">
                <div className="flex items-center justify-between text-[11px] font-bold text-zinc-800">
                  <span>Authorized Callback URL:</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(currentOrigin + '/api/storage/google/callback', 'oauth-uri')}
                    className="p-1 rounded-lg bg-zinc-200/80 hover:bg-zinc-300 text-zinc-800 shrink-0 transition cursor-pointer flex items-center gap-1 text-[10px]"
                    title="Copy URL"
                  >
                    {copiedPathId === 'oauth-uri' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPathId === 'oauth-uri' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="bg-white p-2 rounded-xl font-mono text-[10px] border border-zinc-200 text-zinc-700 break-all select-all">
                  {currentOrigin + '/api/storage/google/callback'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddDiskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form onSubmit={handleCreateManualDisk} className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-zinc-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-zinc-900">
                {editingDisk ? 'Edit Physical Hard Disk' : 'Register Physical Storage Disk'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddDiskModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Disk Name / Model</label>
              <input
                type="text"
                required
                placeholder="e.g. Lacie 4TB Rugged #1"
                value={manualDiskForm.disk_name}
                onChange={(e) => setManualDiskForm({ ...manualDiskForm, disk_name: e.target.value })}
                className="w-full px-3.5 py-2 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Physical Shelf / Rack Location</label>
              <input
                type="text"
                placeholder="e.g. Office Rack 2 - Shelf B"
                value={manualDiskForm.physical_location}
                onChange={(e) => setManualDiskForm({ ...manualDiskForm, physical_location: e.target.value })}
                className="w-full px-3.5 py-2 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Total Capacity (GB)</label>
                <input
                  type="number"
                  value={manualDiskForm.total_capacity_gb}
                  onChange={(e) => setManualDiskForm({ ...manualDiskForm, total_capacity_gb: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Free Space (GB)</label>
                <input
                  type="number"
                  value={manualDiskForm.free_capacity_gb}
                  onChange={(e) => setManualDiskForm({ ...manualDiskForm, free_capacity_gb: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Assigned Shooter / Editor</label>
              <input
                type="text"
                placeholder="e.g. Vikram (Lead Cinematographer)"
                value={manualDiskForm.assigned_to_user_name}
                onChange={(e) => setManualDiskForm({ ...manualDiskForm, assigned_to_user_name: e.target.value })}
                className="w-full px-3.5 py-2 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-900"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition cursor-pointer"
              >
                Save Disk
              </button>
              <button
                type="button"
                onClick={() => setIsAddDiskModalOpen(false)}
                className="px-4 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
