'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, HardDrive, Trash2, Eye, X, FileText, Play, Film, 
  Image as ImageIcon, RefreshCw, Tag, ExternalLink, Check
} from 'lucide-react';
import { 
  WhatsAppMediaFile, 
  StorageQuotaStats, 
  getWhatsAppTemplateStorageUsage, 
  listWhatsAppTemplateMediaFiles, 
  deleteWhatsAppTemplateMediaFile 
} from '@/lib/whatsapp-template-media-manager';

interface WhatsAppTemplateMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onSelectMediaUrl?: (url: string) => void;
}

export function WhatsAppTemplateMediaModal({
  isOpen,
  onClose,
  workspaceId,
  onSelectMediaUrl
}: WhatsAppTemplateMediaModalProps) {
  const [files, setFiles] = useState<WhatsAppMediaFile[]>([]);
  const [stats, setStats] = useState<StorageQuotaStats>({
    totalBytes: 0,
    totalMB: 0,
    maxMB: 500,
    usagePercentage: 0,
    filesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedMediaForPreview, setSelectedMediaForPreview] = useState<WhatsAppMediaFile | null>(null);

  const loadMediaData = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const [quotaData, fileList] = await Promise.all([
        getWhatsAppTemplateStorageUsage(workspaceId),
        listWhatsAppTemplateMediaFiles(workspaceId)
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
    }
  }, [isOpen, workspaceId]);

  useEffect(() => {
    const handleUpdate = () => loadMediaData();
    if (typeof window !== 'undefined') {
      window.addEventListener('wa_template_media_updated', handleUpdate);
      return () => window.removeEventListener('wa_template_media_updated', handleUpdate);
    }
  }, [workspaceId]);

  const handleDeleteFile = async (file: WhatsAppMediaFile) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"? This will instantly free up storage space under your 500 MB quota.`)) return;

    // Instant local state update for zero-delay UI grid and quota meter feedback
    setFiles(prev => prev.filter(f => f.name !== file.name));
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

    await deleteWhatsAppTemplateMediaFile(workspaceId, file.name);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 no-print">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-zinc-950 rounded-3xl max-w-4xl w-full p-6 space-y-4 shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden relative max-h-[90vh] flex flex-col"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-900 shrink-0">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-green-500" />
                <span>WhatsApp Template Media Storage</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Dedicated 500 MB Storage Quota for Broadcasts & Templates</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Storage Quota Progress Meter Header (Strict 500 MB Limit) */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-2 text-zinc-900 dark:text-white">
                <HardDrive className="w-4 h-4 text-green-500" />
                <span>Storage Meter</span>
              </span>
              <span className={stats.usagePercentage >= 90 ? 'text-rose-500 font-extrabold' : 'text-zinc-700 dark:text-zinc-300'}>
                {stats.totalMB} MB / 500 MB ({stats.usagePercentage}%)
              </span>
            </div>

            {/* Real-time Percentage Progress Bar */}
            <div className="w-full h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  stats.usagePercentage >= 90 ? 'bg-rose-500' : 'bg-green-500'
                }`}
                style={{ width: `${stats.usagePercentage}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-zinc-500 dark:text-zinc-400 font-medium pt-0.5">
              <span>Uploaded Media Assets: <strong className="text-zinc-800 dark:text-zinc-200">{stats.filesCount}</strong></span>
              <button 
                type="button"
                onClick={loadMediaData}
                className="hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 text-[11px] font-bold cursor-pointer text-green-600 dark:text-green-400"
              >
                <RefreshCw className="w-3 h-3" /> Refresh Meter
              </button>
            </div>
          </div>

          {/* PROPER SCROLLING JUSTIFIED PHOTO GALLERY GRID */}
          <div className="space-y-2 shrink-0">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
              <span>Media Assets Gallery ({files.length})</span>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-zinc-500">Loading visual gallery...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="py-16 text-center space-y-2 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30">
              <ImageIcon className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto" />
              <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">No template media files uploaded yet.</p>
              <p className="text-[11px] text-zinc-400">Media uploaded when creating templates will appear here under your 500 MB quota.</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[52vh] p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 block w-full">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
                {files.map((file, idx) => {
                  const isVideo = file.mime_type?.includes('video') || file.name.match(/\.(mp4|webm|mov)$/i);
                  const isDoc = file.mime_type?.includes('pdf') || file.name.match(/\.(pdf|doc|docx|txt)$/i);
                  const templateName = file.usedInTemplates[0] || 'Unlinked';

                  return (
                    <div
                      key={idx}
                      className="group relative w-full h-44 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 shadow-sm hover:shadow-xl hover:border-green-500 transition-all cursor-default flex flex-col shrink-0"
                    >
                      {/* Media Render Layer */}
                      {isVideo ? (
                        <div className="relative w-full h-full bg-zinc-950 flex flex-col items-center justify-center">
                          <video 
                            src={file.url} 
                            preload="metadata" 
                            className="w-full h-full object-cover opacity-80" 
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg">
                              <Play className="w-5 h-5 fill-white ml-0.5" />
                            </div>
                          </div>
                          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md text-[8px] font-extrabold text-green-400 uppercase tracking-wider flex items-center gap-1 z-10">
                            <Film className="w-2.5 h-2.5" /> VIDEO
                          </span>
                        </div>
                      ) : isDoc ? (
                        <div className="w-full h-full p-4 bg-zinc-900 flex flex-col items-center justify-center text-center space-y-2">
                          <FileText className="w-10 h-10 text-amber-500" />
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-mono font-bold uppercase border border-amber-500/20">
                            PDF / DOC
                          </span>
                          <span className="text-[10px] text-zinc-300 truncate max-w-full px-2">
                            {file.name}
                          </span>
                        </div>
                      ) : (
                        <img 
                          src={file.url} 
                          alt={file.name} 
                          className="w-full h-full object-cover block"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      )}

                      {/* HOVER OVERLAY WITH EYE & DELETE BUTTONS */}
                      <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2.5 backdrop-blur-xs z-20">
                        {/* View Button (Eye Icon) */}
                        <button
                          type="button"
                          onClick={() => setSelectedMediaForPreview(file)}
                          className="p-2.5 rounded-full bg-white text-zinc-900 hover:bg-zinc-100 cursor-pointer shadow-xl transition-transform hover:scale-110"
                          title="View Lightbox Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Select for Template Button (If invoked via builder) */}
                        {onSelectMediaUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectMediaUrl(file.url);
                              onClose();
                            }}
                            className="p-2.5 rounded-full bg-green-500 text-white hover:bg-green-600 cursor-pointer shadow-xl transition-transform hover:scale-110"
                            title="Select for Template"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete Button (Trash Icon - Red) */}
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file)}
                          className="p-2.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 cursor-pointer shadow-xl transition-transform hover:scale-110"
                          title="Delete File"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* BOTTOM OVERLAY BADGE ON EACH CARD */}
                      <div className="absolute bottom-2 inset-x-2 z-10 pointer-events-none">
                        <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[9px] font-bold text-white/90 border border-white/15 truncate block max-w-full">
                          Template: {templateName}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900 flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold cursor-pointer transition-colors"
            >
              Close Gallery
            </button>
          </div>

          {/* Full-Screen Preview Lightbox Modal (selectedMediaForPreview) */}
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
                      className="max-w-full max-h-[80vh] rounded-3xl border border-white/10 shadow-2xl"
                    />
                  ) : selectedMediaForPreview.mime_type?.includes('pdf') || selectedMediaForPreview.name.match(/\.(pdf)$/i) ? (
                    <div className="w-full h-[75vh] bg-zinc-900 rounded-3xl overflow-hidden border border-white/10 flex flex-col">
                      <iframe src={selectedMediaForPreview.url} className="w-full h-full border-none" />
                    </div>
                  ) : (
                    <img 
                      src={selectedMediaForPreview.url} 
                      alt={selectedMediaForPreview.name} 
                      className="max-w-full max-h-[80vh] object-contain rounded-3xl border border-white/10 shadow-2xl"
                    />
                  )}

                  <div className="mt-3 text-center text-white space-y-1">
                    <p className="text-sm font-bold flex items-center justify-center gap-2">
                      <span>{selectedMediaForPreview.name}</span>
                      <a 
                        href={selectedMediaForPreview.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-green-400 hover:text-green-300"
                        title="Open original file link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </p>
                    <p className="text-xs text-zinc-300">
                      {(selectedMediaForPreview.size / (1024 * 1024)).toFixed(2)} MB • {new Date(selectedMediaForPreview.created_at).toLocaleString()}
                    </p>
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
