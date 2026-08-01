'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, HardDrive, Trash2, Eye, X, FileText, Film, Image as ImageIcon, 
  AlertTriangle, RefreshCw, CheckCircle2, Tag
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
    maxMB: 1024,
    usagePercentage: 0,
    filesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activePreview, setActivePreview] = useState<WhatsAppMediaFile | null>(null);

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

  const handleDelete = async (file: WhatsAppMediaFile) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"? This action cannot be undone.`)) return;

    // Instant local state update for zero-delay response
    setFiles(prev => prev.filter(f => f.name !== file.name));
    setStats(prev => {
      const newTotalBytes = Math.max(0, prev.totalBytes - file.size);
      const newTotalMB = +(newTotalBytes / (1024 * 1024)).toFixed(1);
      return {
        ...prev,
        totalBytes: newTotalBytes,
        totalMB: newTotalMB,
        usagePercentage: Math.min(100, +((newTotalBytes / (1024 * 1024 * 1024)) * 100).toFixed(1)),
        filesCount: Math.max(0, prev.filesCount - 1),
      };
    });

    await deleteWhatsAppTemplateMediaFile(workspaceId, file.name);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 no-print">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-2xl border border-zinc-200 overflow-hidden relative max-h-[90vh] flex flex-col"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 shrink-0">
            <div>
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <Folder className="w-5 h-5 text-green-600" />
                <span>WhatsApp Template Media Storage</span>
              </h3>
              <p className="text-xs text-zinc-500 font-medium">Dedicated 1 GB Storage Quota for Broadcasts & Templates</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Storage Quota Progress Card (1,024 MB Limit) */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-700">
              <span className="flex items-center gap-2 text-zinc-900">
                <HardDrive className="w-4 h-4 text-green-600" />
                <span>Template Media Quota</span>
              </span>
              <span className={stats.usagePercentage >= 95 ? 'text-rose-600 font-extrabold' : 'text-zinc-700'}>
                {stats.totalMB} MB / {stats.maxMB} MB ({stats.usagePercentage}%)
              </span>
            </div>

            {/* Percentage Progress Bar */}
            <div className="w-full h-2.5 bg-zinc-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  stats.usagePercentage >= 90 ? 'bg-rose-500' : 'bg-green-600'
                }`}
                style={{ width: `${stats.usagePercentage}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-zinc-500 font-medium pt-0.5">
              <span>Files Uploaded: <strong className="text-zinc-800">{stats.filesCount}</strong></span>
              <button 
                onClick={loadMediaData}
                className="hover:text-zinc-800 flex items-center gap-1 text-[11px] font-bold cursor-pointer text-green-700"
              >
                <RefreshCw className="w-3 h-3" /> Refresh Meter
              </button>
            </div>
          </div>

          {/* Media Files Grid */}
          <div className="space-y-2 flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">
              <span>Uploaded Template Media ({files.length})</span>
            </div>

            {loading ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-zinc-500">Loading template media gallery...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="py-12 text-center space-y-2 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
                <Folder className="w-10 h-10 text-zinc-300 mx-auto" />
                <p className="text-xs font-bold text-zinc-600">No template media files uploaded yet.</p>
                <p className="text-[11px] text-zinc-400">Media uploaded when creating templates will appear here under your 1 GB quota.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pr-1 flex-1 min-h-0">
                {files.map((file, idx) => {
                  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
                  const isVideo = file.mime_type?.includes('video') || file.name.match(/\.(mp4|webm|mov)$/i);

                  return (
                    <div
                      key={idx}
                      className="group relative rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-900/90 flex flex-col shadow-xs hover:border-green-500 transition-all"
                    >
                      {/* Media Thumbnail Container */}
                      <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden flex items-center justify-center">
                        {isVideo ? (
                          <div className="relative w-full h-full flex items-center justify-center bg-zinc-900">
                            <Film className="w-8 h-8 text-green-400 opacity-80" />
                            <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-bold text-white uppercase">
                              Video
                            </span>
                          </div>
                        ) : (
                          <img 
                            src={file.url} 
                            alt={file.name} 
                            className="w-full h-full object-cover bg-transparent"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        )}

                        {/* Hover Actions Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                          {/* Lightbox Eye View Button */}
                          <button
                            type="button"
                            onClick={() => setActivePreview(file)}
                            className="p-2 rounded-full bg-white text-zinc-900 hover:bg-zinc-100 cursor-pointer shadow-md transition-transform hover:scale-110"
                            title="View Media Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Select for Template Button */}
                          {onSelectMediaUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectMediaUrl(file.url);
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded-full bg-green-500 text-white text-[10px] font-extrabold hover:bg-green-600 cursor-pointer shadow-md"
                            >
                              Use
                            </button>
                          )}

                          {/* Delete Media Button */}
                          <button
                            type="button"
                            onClick={() => handleDelete(file)}
                            className="p-2 rounded-full bg-rose-600 text-white hover:bg-rose-700 cursor-pointer shadow-md transition-transform hover:scale-110"
                            title="Delete File"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* File Details & Template Tags */}
                      <div className="p-2.5 bg-white space-y-1">
                        <p className="text-xs font-bold text-zinc-900 truncate" title={file.name}>
                          {file.name}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium">
                          <span>{fileSizeMB} MB</span>
                          <span>{new Date(file.created_at).toLocaleDateString()}</span>
                        </div>

                        {/* Template Usage Tag */}
                        {file.usedInTemplates.length > 0 ? (
                          <div className="pt-1 flex flex-wrap gap-1">
                            {file.usedInTemplates.map((tName, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-50 text-green-800 text-[9px] font-extrabold border border-green-200 truncate max-w-full">
                                <Tag className="w-2.5 h-2.5" />
                                <span className="truncate">Used in: {tName}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-block text-[9px] text-zinc-400 italic">
                            Unassigned Template Media
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-zinc-100 flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold cursor-pointer"
            >
              Close
            </button>
          </div>

          {/* Full-Screen Lightbox Preview Modal */}
          <AnimatePresence>
            {activePreview && (
              <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                <button
                  type="button"
                  onClick={() => setActivePreview(null)}
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
                  {activePreview.mime_type?.includes('video') || activePreview.name.match(/\.(mp4|webm|mov)$/i) ? (
                    <video 
                      src={activePreview.url} 
                      controls 
                      autoPlay 
                      className="max-w-full max-h-[80vh] rounded-3xl border border-white/10 shadow-2xl"
                    />
                  ) : (
                    <img 
                      src={activePreview.url} 
                      alt={activePreview.name} 
                      className="max-w-full max-h-[80vh] object-contain rounded-3xl border border-white/10 shadow-2xl"
                    />
                  )}

                  <div className="mt-3 text-center text-white space-y-1">
                    <p className="text-sm font-bold">{activePreview.name}</p>
                    <p className="text-xs text-zinc-300">
                      {(activePreview.size / (1024 * 1024)).toFixed(2)} MB • {new Date(activePreview.created_at).toLocaleString()}
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
