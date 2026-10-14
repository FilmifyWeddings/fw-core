'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, RefreshCw, HardDrive, Plus, Trash2, Folder, File,
  Search, Eye, ExternalLink, ChevronRight, Grid, List,
  Calendar, CheckCircle2, AlertCircle, Clock, X, Download,
  ArrowUpDown, FileText, Image as ImageIcon, Video, Music,
  FolderOpen, ShieldCheck, Sparkles, Filter
} from 'lucide-react';
import { useBhamstra, BhamstraProvider } from '@/lib/context/BhamstraContext';
import { supabase } from '@/lib/supabase';

interface DriveAccount {
  id: string;
  workspace_id: string;
  account_email: string;
  account_label?: string;
  total_storage_bytes?: number;
  used_storage_bytes?: number;
  last_synced_at?: string;
  is_active: boolean;
  created_at?: string;
}

interface GoogleFolder {
  id: string;
  name: string;
  webViewLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  sizeBytes?: number;
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

type SortField = 'name' | 'date' | 'size';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

function GoogleDriveIntegrationCore() {
  const router = useRouter();
  const { workspaceId, userId } = useBhamstra();
  const effectiveWs = (workspaceId && workspaceId !== 'all') ? workspaceId : (userId || '');

  const [accounts, setAccounts] = useState<DriveAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Folder Browser Modal State
  const [browserOpen, setBrowserOpen] = useState(false);
  const [activeAccount, setActiveAccount] = useState<DriveAccount | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([
    { id: 'root', name: 'My Drive' }
  ]);
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [currentFolderName, setCurrentFolderName] = useState('My Drive');
  const [folders, setFolders] = useState<GoogleFolder[]>([]);
  const [files, setFiles] = useState<GoogleFile[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [folderSearch, setFolderSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Preview Modal State
  const [previewFile, setPreviewFile] = useState<GoogleFile | null>(null);

  // Fetch only Drive accounts belonging strictly to storage_drive_accounts
  const fetchAccounts = useCallback(async () => {
    if (!effectiveWs) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/storage/google/accounts?workspace_id=${encodeURIComponent(effectiveWs)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAccounts(data.accounts || []);
        }
      }
    } catch (err: any) {
      console.warn('Failed to fetch drive accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveWs]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Handle Connect New Account
  const handleConnectAccount = () => {
    if (!effectiveWs) return;
    const authUrl = `/api/storage/google/auth?workspace_id=${encodeURIComponent(effectiveWs)}&return_url=${encodeURIComponent('/workspace/integrations/google-drive')}`;
    window.location.href = authUrl;
  };

  // Handle Sync Account Quota
  const handleSyncAccount = async (account: DriveAccount) => {
    try {
      setSyncingId(account.id);
      const res = await fetch('/api/storage/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: account.id, workspace_id: effectiveWs }),
      });
      if (res.ok) {
        await fetchAccounts();
      }
    } catch (err) {
      console.warn('Sync failed:', err);
    } finally {
      setSyncingId(null);
    }
  };

  // Handle Disconnect Account
  const handleDisconnect = async (account: DriveAccount) => {
    if (!confirm(`Are you sure you want to disconnect Google Drive account (${account.account_email})?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/storage/google/accounts?id=${encodeURIComponent(account.id)}&workspace_id=${encodeURIComponent(effectiveWs)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAccounts(prev => prev.filter(a => a.id !== account.id));
      }
    } catch (err: any) {
      alert('Failed to disconnect account: ' + err.message);
    }
  };

  // Fetch Folder Contents inside Modal
  const loadFolderContents = useCallback(async (accountId: string, parentId: string) => {
    try {
      setLoadingItems(true);
      const url = `/api/storage/google/folders?account_id=${encodeURIComponent(accountId)}&parent_id=${encodeURIComponent(parentId)}&workspace_id=${encodeURIComponent(effectiveWs)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFolders(data.folders || []);
          setFiles(data.files || []);
          if (data.currentFolder?.name) {
            setCurrentFolderName(data.currentFolder.name);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load folder:', err);
    } finally {
      setLoadingItems(false);
    }
  }, [effectiveWs]);

  // Open Browser for specific account
  const handleOpenBrowser = (account: DriveAccount) => {
    setActiveAccount(account);
    setBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
    setCurrentFolderId('root');
    setCurrentFolderName('My Drive');
    setFolderSearch('');
    setBrowserOpen(true);
    loadFolderContents(account.id, 'root');
  };

  // Navigate deeper into folder
  const handleNavigateFolder = (folder: GoogleFolder) => {
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
    setCurrentFolderName(folder.name);
    if (activeAccount) {
      loadFolderContents(activeAccount.id, folder.id);
    }
  };

  // Navigate to breadcrumb
  const handleBreadcrumbClick = (idx: number) => {
    const target = breadcrumbs[idx];
    const newBreadcrumbs = breadcrumbs.slice(0, idx + 1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolderId(target.id);
    setCurrentFolderName(target.name);
    if (activeAccount) {
      loadFolderContents(activeAccount.id, target.id);
    }
  };

  // Format Bytes helper
  const formatBytes = (bytes?: number) => {
    if (!bytes || isNaN(bytes) || bytes === 0) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb < 1) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (gb >= 1000) return (gb / 1024).toFixed(1) + ' TB';
    return gb.toFixed(1) + ' GB';
  };

  // Filter and Sort items inside Browser
  const sortedFolders = useMemo(() => {
    let list = [...folders];
    if (folderSearch.trim()) {
      const q = folderSearch.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortField === 'name') {
        return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (sortField === 'date') {
        const tA = new Date(a.modifiedTime || a.createdTime || 0).getTime();
        const tB = new Date(b.modifiedTime || b.createdTime || 0).getTime();
        return sortOrder === 'asc' ? tA - tB : tB - tA;
      }
      return 0;
    });
    return list;
  }, [folders, folderSearch, sortField, sortOrder]);

  const sortedFiles = useMemo(() => {
    let list = [...files];
    if (folderSearch.trim()) {
      const q = folderSearch.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortField === 'name') {
        return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (sortField === 'date') {
        const tA = new Date(a.createdTime || 0).getTime();
        const tB = new Date(b.createdTime || 0).getTime();
        return sortOrder === 'asc' ? tA - tB : tB - tA;
      }
      if (sortField === 'size') {
        return sortOrder === 'asc' ? a.sizeBytes - b.sizeBytes : b.sizeBytes - a.sizeBytes;
      }
      return 0;
    });
    return list;
  }, [files, folderSearch, sortField, sortOrder]);

  const totalItemCount = sortedFolders.length + sortedFiles.length;

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#090C10] text-zinc-900 dark:text-zinc-100 p-4 sm:p-6 lg:p-10 font-sans antialiased">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ── Top Navigation & Back Header ───────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              href="/workspace/integrations"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Integrations Hub</span>
            </Link>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-850 border border-zinc-200/80 dark:border-zinc-750 shadow-md flex items-center justify-center p-2.5 shrink-0">
                <svg viewBox="0 0 87.3 78" className="w-full h-full">
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                  <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                  <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                  <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                  <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                  <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                </svg>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
                    Google Drive Integration
                  </h1>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                    Cloud Storage
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                  Connect multiple studio Google Drive accounts to manage shoot deliverables and browse cloud folders.
                </p>
              </div>
            </div>
          </div>

          {/* Connect Google Drive Button */}
          <button
            onClick={handleConnectAccount}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-950 hover:bg-zinc-850 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 font-semibold text-xs shadow-md transition-all cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Google Drive</span>
          </button>
        </div>

        {/* ── Connected Accounts Grid ────────────────────────────────────── */}
        {loading ? (
          <div className="py-24 text-center space-y-3 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-xs font-semibold text-zinc-500">Loading connected Google Drive accounts...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-10 sm:p-16 text-center space-y-5 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800 flex items-center justify-center mx-auto p-3.5 shadow-inner">
              <svg viewBox="0 0 87.3 78" className="w-full h-full">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                No Google Drive accounts connected yet
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Connect your studio's Google Drive to automatically organize wedding RAW backups, browse cloud folders, and track storage quotas.
              </p>
            </div>
            <button
              onClick={handleConnectAccount}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-950 hover:bg-zinc-850 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 font-semibold text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Connect First Account</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {accounts.map((account) => {
              const totalBytes = account.total_storage_bytes || 2000 * 1024 * 1024 * 1024;
              const usedBytes = account.used_storage_bytes || 0;
              const freeBytes = Math.max(0, totalBytes - usedBytes);
              const usedPercent = Math.min(100, Math.round((usedBytes / totalBytes) * 100));
              const isSyncing = syncingId === account.id;

              return (
                <div
                  key={account.id}
                  className="bg-white dark:bg-[#12161F] rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-6 shadow-xl shadow-zinc-200/30 dark:shadow-none flex flex-col justify-between space-y-6 hover:border-blue-400/50 dark:hover:border-blue-600/50 transition-all group"
                >
                  {/* Card Header */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 shadow-xs flex items-center justify-center p-2 shrink-0">
                        <svg viewBox="0 0 87.3 78" className="w-full h-full">
                          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                          <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                        </svg>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Active</span>
                        </span>

                        <button
                          onClick={() => handleDisconnect(account)}
                          className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Disconnect account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-zinc-950 dark:text-white truncate" title={account.account_email}>
                        {account.account_email}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {account.account_label || 'Wedding Deliverables Storage'}
                      </p>
                    </div>

                    {/* Storage Progress Bar */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-zinc-600 dark:text-zinc-400">Used: {formatBytes(usedBytes)}</span>
                        <span className="text-zinc-900 dark:text-white font-mono">{usedPercent}%</span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                          style={{ width: `${usedPercent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                        <span>Free: {formatBytes(freeBytes)}</span>
                        <span>Total: {formatBytes(totalBytes)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleSyncAccount(account)}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
                      title="Sync storage quota"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} />
                      <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
                    </button>

                    <button
                      onClick={() => handleOpenBrowser(account)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Browse Folders</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ── GOOGLE DRIVE FOLDER PICKER MODAL (Browse Folders) ──────────── */}
      <AnimatePresence>
        {browserOpen && activeAccount && (
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
                    <h3 className="font-bold text-sm text-zinc-950 dark:text-white truncate">
                      Google Drive Explorer
                    </h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                      {activeAccount.account_email} • {totalItemCount} items loaded
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBrowserOpen(false)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Breadcrumb Path & Controls Bar */}
              <div className="p-3 sm:px-5 bg-zinc-50/70 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                
                {/* Breadcrumbs */}
                <div className="flex items-center gap-1.5 text-xs overflow-x-auto scrollbar-none py-1">
                  {breadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={crumb.id}>
                      <button
                        onClick={() => handleBreadcrumbClick(idx)}
                        className={`hover:text-blue-600 transition-colors cursor-pointer font-medium whitespace-nowrap ${
                          idx === breadcrumbs.length - 1
                            ? 'font-bold text-zinc-900 dark:text-white'
                            : 'text-zinc-500'
                        }`}
                      >
                        {crumb.name}
                      </button>
                      {idx < breadcrumbs.length - 1 && (
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Filter, Sort & View Mode Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Search inside folder */}
                  <div className="relative w-40 sm:w-48">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter folder..."
                      value={folderSearch}
                      onChange={e => setFolderSearch(e.target.value)}
                      className="w-full pl-7 pr-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-250 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500 shadow-xs"
                    />
                  </div>

                  {/* Sort by dropdown */}
                  <div className="flex items-center bg-white dark:bg-zinc-800 border border-zinc-250 dark:border-zinc-700 rounded-xl p-0.5">
                    <button
                      onClick={() => {
                        setSortField(prev => (prev === 'name' ? 'date' : prev === 'date' ? 'size' : 'name'));
                      }}
                      className="px-2 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-blue-600 flex items-center gap-1 cursor-pointer capitalize"
                      title="Toggle sort field"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                      <span>{sortField}</span>
                    </button>
                    <button
                      onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                      className="px-1.5 py-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-mono cursor-pointer"
                      title="Toggle order"
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-white dark:bg-zinc-800 border border-zinc-250 dark:border-zinc-700 rounded-xl p-0.5">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        viewMode === 'grid' ? 'bg-zinc-100 dark:bg-zinc-700 text-blue-600' : 'text-zinc-400'
                      }`}
                      title="Grid view"
                    >
                      <Grid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        viewMode === 'list' ? 'bg-zinc-100 dark:bg-zinc-700 text-blue-600' : 'text-zinc-400'
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
                {loadingItems ? (
                  <div className="py-20 text-center space-y-3">
                    <RefreshCw className="w-7 h-7 animate-spin mx-auto text-blue-500" />
                    <p className="text-xs text-zinc-500 font-medium">Fetching folder contents...</p>
                  </div>
                ) : totalItemCount === 0 ? (
                  <div className="py-20 text-center space-y-2">
                    <Folder className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto" />
                    <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">This folder is empty</h4>
                    <p className="text-xs text-zinc-400">No subfolders or media files found in this location.</p>
                  </div>
                ) : (
                  <div className="space-y-6">

                    {/* ── Subfolders Section ── */}
                    {sortedFolders.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider">
                          <span>Folders ({sortedFolders.length})</span>
                        </div>

                        {viewMode === 'grid' ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {sortedFolders.map(folder => (
                              <div
                                key={folder.id}
                                onClick={() => handleNavigateFolder(folder)}
                                className="p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/60 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 border border-zinc-200/70 dark:border-zinc-750 hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer transition-all flex items-center gap-3 group"
                              >
                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                                  <Folder className="w-5 h-5 fill-amber-500" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-zinc-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                    {folder.name}
                                  </p>
                                  <span className="text-[10px] text-zinc-400 font-mono">Folder</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden">
                            {sortedFolders.map(folder => (
                              <div
                                key={folder.id}
                                onClick={() => handleNavigateFolder(folder)}
                                className="py-2.5 px-4 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 flex items-center justify-between cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <Folder className="w-4 h-4 fill-amber-500 text-amber-500 shrink-0" />
                                  <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                                    {folder.name}
                                  </span>
                                </div>
                                <span className="text-[10px] text-zinc-400 font-mono">Folder</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Files & Media Section ── */}
                    {sortedFiles.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider">
                          <span>Files & Media ({sortedFiles.length})</span>
                        </div>

                        {viewMode === 'grid' ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {sortedFiles.map(file => (
                              <div
                                key={file.id}
                                onClick={() => setPreviewFile(file)}
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
                            {sortedFiles.map(file => (
                              <div
                                key={file.id}
                                onClick={() => setPreviewFile(file)}
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
                      </div>
                    )}

                  </div>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── FILE PREVIEW MODAL ─────────────────────────────────────────── */}
      <AnimatePresence>
        {previewFile && (
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
                  <h4 className="text-sm font-bold truncate">{previewFile.name}</h4>
                  <p className="text-[11px] text-zinc-400 font-mono">{formatBytes(previewFile.sizeBytes)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {previewFile.webViewLink && (
                    <a
                      href={previewFile.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in Drive</span>
                    </a>
                  )}
                  <button
                    onClick={() => setPreviewFile(null)}
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[350px] bg-black/40">
                {previewFile.isImage ? (
                  <img
                    src={previewFile.previewUrl || previewFile.thumbnailLink || previewFile.webViewLink}
                    alt={previewFile.name}
                    className="max-h-[70vh] max-w-full object-contain rounded-xl"
                  />
                ) : previewFile.isVideo ? (
                  <iframe
                    src={previewFile.previewUrl}
                    className="w-full h-[60vh] rounded-xl border-0"
                    allow="autoplay"
                  />
                ) : (
                  <div className="text-center space-y-4">
                    <FileText className="w-16 h-16 text-zinc-500 mx-auto" />
                    <div>
                      <p className="text-sm font-bold">{previewFile.name}</p>
                      <p className="text-xs text-zinc-400 mt-1">Preview not available directly in browser.</p>
                    </div>
                    {previewFile.webViewLink && (
                      <a
                        href={previewFile.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>View file on Google Drive</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function GoogleDriveIntegrationPage() {
  return (
    <BhamstraProvider>
      <GoogleDriveIntegrationCore />
    </BhamstraProvider>
  );
}
