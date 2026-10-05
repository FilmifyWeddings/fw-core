'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, HardDrive, Trash2, Eye, X, FileText, Play, Film, 
  Image as ImageIcon, RefreshCw, Tag, ExternalLink, Check, Loader2,
  Upload, Search, CheckCircle2, AlertCircle
} from 'lucide-react';
import { 
  WhatsAppMediaFile, 
  StorageQuotaStats, 
  getWhatsAppTemplateStorageUsage, 
  getCachedWhatsAppTemplateStorageUsage,
  listWhatsAppTemplateMediaFiles, 
  deleteWhatsAppTemplateMediaFile,
  checkWhatsAppStorageQuotaGuard
} from '@/lib/whatsapp-template-media-manager';

export interface WhatsAppTemplateMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  templateName?: string;
  selectedMediaUrl?: string;
  onSelectMediaUrl?: (url: string) => void;
  onSelectMediaFile?: (file: WhatsAppMediaFile) => void;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function WhatsAppTemplateMediaModal({
  isOpen,
  onClose,
  workspaceId,
  templateName,
  selectedMediaUrl,
  onSelectMediaUrl,
  onSelectMediaFile,
}: WhatsAppTemplateMediaModalProps) {
  const [files, setFiles] = useState<WhatsAppMediaFile[]>([]);
  const [stats, setStats] = useState<StorageQuotaStats>(() => {
    return getCachedWhatsAppTemplateStorageUsage(workspaceId) || {
      totalBytes: 0,
      totalMB: 0,
      maxMB: 500,
      usagePercentage: 0,
      filesCount: 0,
    };
  });
  const [loading, setLoading] = useState(true);
  const [selectedMediaForPreview, setSelectedMediaForPreview] = useState<WhatsAppMediaFile | null>(null);
  const [selectedFile, setSelectedFile] = useState<WhatsAppMediaFile | null>(null);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'image' | 'video' | 'doc'>('all');

  // In-modal Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // Delete state
  const [fileToDelete, setFileToDelete] = useState<WhatsAppMediaFile | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const isSelectionMode = Boolean(onSelectMediaFile || onSelectMediaUrl);

  // Re-hydrate cached stats whenever workspaceId changes
  useEffect(() => {
    if (workspaceId) {
      const cached = getCachedWhatsAppTemplateStorageUsage(workspaceId);
      if (cached) setStats(cached);
    }
  }, [workspaceId]);

  const loadMediaData = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const [quotaData, fileList] = await Promise.all([
        getWhatsAppTemplateStorageUsage(workspaceId),
        listWhatsAppTemplateMediaFiles(workspaceId),
        fetch(`/api/whatsapp/templates/upload?workspaceId=${encodeURIComponent(workspaceId)}&sync=true`).catch(() => null)
      ]);
      setStats(quotaData);
      setFiles(fileList);
    } catch (err) {
      console.warn('[WhatsAppTemplateMediaModal] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMediaData();
      setSearchQuery('');
      setUploadError(null);
    }
  }, [isOpen, workspaceId]);

  // Synchronize initial selected file with selectedMediaUrl prop
  useEffect(() => {
    if (selectedMediaUrl && files.length > 0) {
      const matched = files.find(f => f.url === selectedMediaUrl || (f.fileKey && selectedMediaUrl.includes(f.fileKey)));
      if (matched) {
        setSelectedFile(matched);
      }
    } else if (!selectedMediaUrl) {
      setSelectedFile(null);
    }
  }, [selectedMediaUrl, files, isOpen]);

  useEffect(() => {
    const handleUpdate = () => loadMediaData();
    if (typeof window !== 'undefined') {
      window.addEventListener('wa_template_media_updated', handleUpdate);
      return () => window.removeEventListener('wa_template_media_updated', handleUpdate);
    }
  }, [workspaceId]);

  // Handle uploading a new file inside the modal
  const handleModalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // 1. Quota guard check (500 MB limit)
    const quotaCheck = await checkWhatsAppStorageQuotaGuard(workspaceId, file.size);
    if (!quotaCheck.allowed) {
      setUploadError(quotaCheck.message || 'Storage Quota Exceeded (500 MB Limit Reached). Please delete existing media or upgrade storage.');
      if (e.target) e.target.value = '';
      return;
    }

    // 2. WhatsApp Size limits: Images 16MB, Videos 16MB, Documents 50MB
    let maxLimit = 50 * 1024 * 1024;
    let typeName = "file";
    if (file.type.startsWith('image/')) {
      maxLimit = 16 * 1024 * 1024;
      typeName = "image";
    } else if (file.type.startsWith('video/') || file.name.match(/\.(mp4|m4v|mov|avi|mkv|webm|3gp)$/i)) {
      maxLimit = 16 * 1024 * 1024;
      typeName = "video";
    }

    if (file.size > maxLimit) {
      const maxLimitMb = maxLimit / (1024 * 1024);
      const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setUploadError(`File is too large (${fileSizeMb} MB). WhatsApp ${typeName} limit is ${maxLimitMb} MB.`);
      if (e.target) e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const targetWorkspaceId = workspaceId || '00000000-0000-0000-0000-000000000000';
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspaceId', targetWorkspaceId);
      formData.append('templateName', templateName || 'template');

      const res = await fetch(`/api/whatsapp/templates/upload?workspaceId=${encodeURIComponent(targetWorkspaceId)}&templateName=${encodeURIComponent(templateName || 'template')}`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload media file');
      }

      const newFile: WhatsAppMediaFile = {
        name: data.fileName || file.name,
        url: data.fileUrl,
        size: data.fileSize || data.fileSizeBytes || file.size,
        created_at: new Date().toISOString(),
        mime_type: data.mimeType || file.type,
        usedInTemplates: templateName ? [templateName] : [],
        fileKey: data.fileKey || '',
      };

      setFiles(prev => [newFile, ...prev.filter(f => f.name !== newFile.name)]);
      setSelectedFile(newFile);

      // Refresh storage meter
      const freshStats = await getWhatsAppTemplateStorageUsage(workspaceId);
      setStats(freshStats);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wa_template_media_updated'));
      }
    } catch (err: any) {
      console.error('[MediaModal] Upload error:', err);
      setUploadError(err.message || 'Failed to upload media');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Handle confirming file deletion
  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    const file = fileToDelete;
    setIsDeleting(true);

    try {
      setFiles(prev => prev.filter(f => f.name !== file.name));
      if (selectedFile?.name === file.name) {
        setSelectedFile(null);
      }
      setStats(prev => {
        const newTotalBytes = Math.max(0, prev.totalBytes - file.size);
        const newTotalMB = +(newTotalBytes / (1024 * 1024)).toFixed(1);
        return {
          ...prev,
          totalBytes: newTotalBytes,
          totalMB: newTotalMB,
          usagePercentage: Math.min(100, +((newTotalBytes / (500 * 1024 * 1024)) * 100).toFixed(1)),
          filesCount: Math.max(0, prev.filesCount - 1),
        };
      });

      await deleteWhatsAppTemplateMediaFile(workspaceId, file.name, file.fileKey);
      setFileToDelete(null);
    } catch (delErr) {
      console.error('[MediaModal] Delete error:', delErr);
    } finally {
      setIsDeleting(false);
    }
  };

  // Confirm selection and attach to template
  const handleConfirmSelect = (fileToAttach?: WhatsAppMediaFile) => {
    const target = fileToAttach || selectedFile;
    if (!target) return;
    if (onSelectMediaFile) {
      onSelectMediaFile(target);
    }
    if (onSelectMediaUrl) {
      onSelectMediaUrl(target.url);
    }
    onClose();
  };

  // Filtering files
  const filteredFiles = files.filter(file => {
    if (searchQuery.trim()) {
      if (!file.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
        return false;
      }
    }
    if (activeFilter === 'image') {
      return file.mime_type?.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|webp|gif|avif)$/i);
    }
    if (activeFilter === 'video') {
      return file.mime_type?.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|mkv|3gp)$/i);
    }
    if (activeFilter === 'doc') {
      return file.mime_type?.includes('pdf') || file.name.match(/\.(pdf|doc|docx|txt|xls|xlsx)$/i);
    }
    return true;
  });

  const imageCount = files.filter(f => f.mime_type?.startsWith('image/') || f.name.match(/\.(jpg|jpeg|png|webp|gif|avif)$/i)).length;
  const videoCount = files.filter(f => f.mime_type?.startsWith('video/') || f.name.match(/\.(mp4|webm|mov|mkv|3gp)$/i)).length;
  const docCount = files.filter(f => f.mime_type?.includes('pdf') || f.name.match(/\.(pdf|doc|docx|txt|xls|xlsx)$/i)).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 no-print">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-zinc-950 rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden relative max-h-[92vh] flex flex-col"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-900 shrink-0">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-emerald-500" />
                <span>{isSelectionMode ? 'Select Media for Template' : 'WhatsApp Template Media Storage'}</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                {isSelectionMode 
                  ? 'Choose one media file to attach or upload a new one (strictly 1 media per template).'
                  : 'Dedicated 500 MB Storage Quota for Broadcasts & Templates'
                }
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Storage Quota Progress Meter */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2 shrink-0">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-2 text-zinc-900 dark:text-white">
                <HardDrive className="w-4 h-4 text-emerald-500" />
                <span>Storage Meter</span>
              </span>
              <span className={stats.usagePercentage >= 90 ? 'text-rose-500 font-extrabold' : 'text-zinc-700 dark:text-zinc-300'}>
                {stats.totalMB} MB / 500 MB ({stats.usagePercentage}%)
              </span>
            </div>

            <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  stats.usagePercentage >= 90 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${stats.usagePercentage}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-zinc-500 dark:text-zinc-400 font-medium pt-0.5">
              <span>Uploaded Media Assets: <strong className="text-zinc-800 dark:text-zinc-200">{stats.filesCount}</strong></span>
              <button 
                type="button"
                onClick={loadMediaData}
                className="hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 text-[11px] font-bold cursor-pointer text-emerald-600 dark:text-emerald-400"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
          </div>

          {/* Upload Error Banner */}
          {uploadError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-400 shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{uploadError}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setUploadError(null)} 
                className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-200 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Search, Filter Tabs & Upload Button Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 shrink-0">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs font-bold'
                    : 'hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                All ({files.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('image')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeFilter === 'image'
                    ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                    : 'hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Images ({imageCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('video')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeFilter === 'video'
                    ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                    : 'hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Videos ({videoCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('doc')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeFilter === 'doc'
                    ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-2xs font-bold'
                    : 'hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Docs ({docCount})
              </button>
            </div>

            {/* Search Input & Inline Upload Button */}
            <div className="flex items-center gap-2 flex-1 sm:max-w-md justify-end">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search media files..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Upload Media File Input & Button */}
              <input
                ref={modalFileInputRef}
                type="file"
                accept="image/*,video/*,application/pdf"
                onChange={handleModalFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => modalFileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Media</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Media Assets Gallery Grid */}
          {loading ? (
            <div className="py-20 text-center space-y-2">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-zinc-500">Loading studio media library...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="py-16 text-center space-y-2 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30">
              <ImageIcon className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto" />
              <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                {searchQuery ? 'No media files match your search.' : 'No media files found in this category.'}
              </p>
              <p className="text-[11px] text-zinc-400">Click "Upload Media" to add images, videos, or documents under your 500 MB quota.</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[46vh] sm:max-h-[50vh] p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 block w-full">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 w-full">
                {filteredFiles.map((file, idx) => {
                  const isVideo = file.mime_type?.includes('video') || file.name.match(/\.(mp4|webm|mov)$/i);
                  const isDoc = file.mime_type?.includes('pdf') || file.name.match(/\.(pdf|doc|docx|txt)$/i);
                  const templateNameTag = file.usedInTemplates[0] || 'Unlinked';
                  const isSelected = selectedFile?.name === file.name || (selectedFile?.url && selectedFile.url === file.url);

                  return (
                    <div
                      key={file.name + idx}
                      onClick={() => setSelectedFile(file)}
                      onDoubleClick={() => handleConfirmSelect(file)}
                      className={`group relative w-full h-48 rounded-2xl overflow-hidden border transition-all cursor-pointer flex flex-col shrink-0 select-none ${
                        isSelected 
                          ? 'border-emerald-500 ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/10 bg-emerald-50/5 dark:bg-emerald-950/20' 
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-2xs hover:shadow-md'
                      }`}
                    >
                      {/* Selected Checkmark Badge (Top Right) */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-20 bg-emerald-500 text-white rounded-full p-1 shadow-lg ring-2 ring-white dark:ring-zinc-950 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}

                      {/* Type Badge (Top Left) */}
                      <div className="absolute top-2 left-2 z-10 pointer-events-none">
                        {isVideo ? (
                          <span className="px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md text-[8.5px] font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-1 border border-blue-400/20 shadow-sm">
                            <Film className="w-2.5 h-2.5" /> Video
                          </span>
                        ) : isDoc ? (
                          <span className="px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md text-[8.5px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1 border border-amber-400/20 shadow-sm">
                            <FileText className="w-2.5 h-2.5" /> PDF
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md text-[8.5px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1 border border-emerald-400/20 shadow-sm">
                            <ImageIcon className="w-2.5 h-2.5" /> Image
                          </span>
                        )}
                      </div>

                      {/* Thumbnail Media Visual Layer */}
                      <div className="relative w-full h-32 bg-zinc-100 dark:bg-zinc-900 overflow-hidden flex items-center justify-center">
                        {isVideo ? (
                          <div className="relative w-full h-full bg-zinc-950 flex flex-col items-center justify-center">
                            <video 
                              src={file.url} 
                              preload="metadata" 
                              className="w-full h-full object-cover opacity-85" 
                            />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg">
                                <Play className="w-4 h-4 fill-white ml-0.5" />
                              </div>
                            </div>
                          </div>
                        ) : isDoc ? (
                          <div className="w-full h-full p-3 bg-zinc-900/90 flex flex-col items-center justify-center text-center space-y-1.5">
                            <FileText className="w-8 h-8 text-amber-500" />
                            <span className="text-[10px] text-zinc-300 truncate max-w-full px-2 font-mono">
                              PDF Document
                            </span>
                          </div>
                        ) : (
                          <img 
                            src={file.url} 
                            alt={file.name} 
                            className="w-full h-full object-cover block transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        )}

                        {/* Hover Quick Action Buttons (Eye Preview & Delete) */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2 backdrop-blur-2xs z-20">
                          {/* Lightbox Preview Eye Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMediaForPreview(file);
                            }}
                            className="p-2 rounded-full bg-white text-zinc-900 hover:bg-zinc-100 cursor-pointer shadow-xl transition-transform hover:scale-110"
                            title="Preview Media"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Select Check Button */}
                          {isSelectionMode && !isSelected && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(file);
                              }}
                              className="p-2 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer shadow-xl transition-transform hover:scale-110"
                              title="Select this file"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete File Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFileToDelete(file);
                            }}
                            className="p-2 rounded-full bg-rose-600 text-white hover:bg-rose-700 cursor-pointer shadow-xl transition-transform hover:scale-110"
                            title="Delete File from Storage"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Card Bottom Meta (File Name & Size) */}
                      <div className="p-2.5 bg-white dark:bg-zinc-950 flex flex-col justify-between flex-1 min-w-0 border-t border-zinc-100 dark:border-zinc-900">
                        <p 
                          className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate" 
                          title={file.name}
                        >
                          {file.name}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mt-1">
                          <span>{formatFileSize(file.size)}</span>
                          <span className="truncate max-w-[90px] text-zinc-500" title={`Used in: ${templateNameTag}`}>
                            {templateNameTag}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Bar */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between shrink-0">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[55%]">
              {selectedFile ? (
                <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span className="text-zinc-800 dark:text-zinc-200 truncate font-semibold">{selectedFile.name}</span>
                  <span className="text-zinc-400 shrink-0">({formatFileSize(selectedFile.size)})</span>
                </span>
              ) : (
                <span>Click any media asset to select for this template</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {isSelectionMode ? (
                <button
                  type="button"
                  onClick={() => handleConfirmSelect()}
                  disabled={!selectedFile}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  <span>Attach to Template</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold cursor-pointer transition-colors"
                >
                  Close Gallery
                </button>
              )}
            </div>
          </div>

          {/* Full-Screen Preview Lightbox Modal */}
          <AnimatePresence>
            {selectedMediaForPreview && (
              <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                <button
                  type="button"
                  onClick={() => setSelectedMediaForPreview(null)}
                  className="fixed top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all border border-white/15 cursor-pointer shadow-xl z-10 hover:scale-105"
                >
                  <X className="w-6 h-6" />
                </button>

                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  className="relative max-w-4xl max-h-[85vh] w-full flex flex-col items-center justify-center"
                >
                  {selectedMediaForPreview.mime_type?.includes('video') || selectedMediaForPreview.name.match(/\.(mp4|webm|mov)$/i) ? (
                    <video 
                      src={selectedMediaForPreview.url} 
                      controls 
                      autoPlay 
                      className="max-w-full max-h-[75vh] rounded-2xl border border-white/10 shadow-2xl"
                    />
                  ) : selectedMediaForPreview.mime_type?.includes('pdf') || selectedMediaForPreview.name.match(/\.(pdf)$/i) ? (
                    <div className="w-full h-[75vh] bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 flex flex-col">
                      <iframe src={selectedMediaForPreview.url} className="w-full h-full border-none" />
                    </div>
                  ) : (
                    <img 
                      src={selectedMediaForPreview.url} 
                      alt={selectedMediaForPreview.name} 
                      className="max-w-full max-h-[75vh] object-contain rounded-2xl border border-white/10 shadow-2xl"
                    />
                  )}

                  <div className="mt-3 text-center text-white space-y-2">
                    <p className="text-sm font-bold flex items-center justify-center gap-2">
                      <span>{selectedMediaForPreview.name}</span>
                      <a 
                        href={selectedMediaForPreview.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-emerald-400 hover:text-emerald-300"
                        title="Open original file link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </p>
                    <p className="text-xs text-zinc-300">
                      {formatFileSize(selectedMediaForPreview.size)} • {new Date(selectedMediaForPreview.created_at).toLocaleString()}
                    </p>

                    {isSelectionMode && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const file = selectedMediaForPreview;
                            setSelectedMediaForPreview(null);
                            handleConfirmSelect(file);
                          }}
                          className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>Attach This Media</span>
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Delete Confirmation Modal */}
          <AnimatePresence>
            {fileToDelete && (
              <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white dark:bg-zinc-950 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-zinc-200 dark:border-zinc-800 relative text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400 shadow-sm">
                      <Trash2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                        Permanently Delete Media?
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Are you sure you want to delete <span className="font-semibold text-zinc-800 dark:text-zinc-200 break-all">"{fileToDelete.name}"</span>?
                      </p>
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                        This file will be permanently removed from storage and detached from templates. This action cannot be undone.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-900">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setFileToDelete(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleConfirmDelete}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Yes, Delete</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
