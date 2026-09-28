'use client';

import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Trash2, 
  FileText, 
  Video, 
  Image as ImageIcon, 
  AlertCircle, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';

interface AddTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onTemplateCreated?: (template: any) => void;
}

interface TemplateFormState {
  name: string;
  category: string;
  language: string;
  type: 'text' | 'media';
  textBody: string;
  media_url: string;
  media_file_key: string;
  media_mime: string;
  media_file_name: string;
  media_file_size: number | null;
}

const MAX_IMAGE_SIZE = 16 * 1024 * 1024; // 16MB
const MAX_MEDIA_SIZE = 50 * 1024 * 1024; // 50MB for video and PDF

export function AddTemplateModal({ isOpen, onClose, workspaceId, onTemplateCreated }: AddTemplateModalProps) {
  const [form, setForm] = useState<TemplateFormState>({
    name: '',
    category: 'MARKETING',
    language: 'en_US',
    type: 'text',
    textBody: '',
    media_url: '',
    media_file_key: '',
    media_mime: '',
    media_file_name: '',
    media_file_size: null,
  });

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);

    // 1. File size checks (Up to 50MB for video/document, 16MB for image)
    const isImage = file.type.startsWith('image/');
    const maxLimit = isImage ? MAX_IMAGE_SIZE : MAX_MEDIA_SIZE;
    const maxLimitMb = maxLimit / (1024 * 1024);

    if (file.size > maxLimit) {
      const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMessage(`File exceeds limit. Selected file is ${fileSizeMb}MB, but maximum allowed size is ${maxLimitMb}MB.`);
      if (e.target) e.target.value = '';
      return;
    }

    setUploading(true);
    setUploadProgress(`Uploading ${file.name} (${formatFileSize(file.size)})...`);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspaceId', workspaceId || '00000000-0000-0000-0000-000000000000');
      formData.append('templateName', form.name || 'template');

      // Native streaming multipart upload without base64 bloat for large files
      let res = await fetch('/api/whatsapp/templates/upload', {
        method: 'POST',
        body: formData,
      });

      // Safe base64 fallback only for small files <= 4MB if multipart failed
      if (!res.ok && res.status !== 413 && file.size <= 4 * 1024 * 1024) {
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          res = await fetch('/api/whatsapp/templates/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64,
              fileName: file.name,
              mimeType: file.type,
              workspaceId,
              templateName: form.name || 'template',
            }),
          });
        } catch {}
      }

      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const rawText = await res.text().catch(() => '');
        if (res.status === 413 || rawText.includes('413 Request Entity Too Large')) {
          throw new Error('File size exceeds server upload limit (max 50MB). Please choose a smaller file.');
        }
        throw new Error(`Server upload error (HTTP ${res.status})`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload media to cloud storage');
      }

      // Store both media_url and media_file_key in form state
      setForm(prev => ({
        ...prev,
        type: 'media',
        media_url: data.fileUrl,
        media_file_key: data.fileKey,
        media_mime: data.mimeType || file.type,
        media_file_name: data.fileName || file.name,
        media_file_size: data.fileSizeBytes || file.size,
      }));

      setUploadProgress(null);
    } catch (err: any) {
      console.error('[AddTemplateModal] Upload error:', err);
      setErrorMessage(err.message || 'File upload failed');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Two-way cascade delete: deletes from B2 bucket and removes Supabase record
  const handleDeleteMedia = async () => {
    if (!form.media_file_key && !form.media_url) {
      setForm(prev => ({
        ...prev,
        media_url: '',
        media_file_key: '',
        media_mime: '',
        media_file_name: '',
        media_file_size: null,
      }));
      return;
    }

    try {
      setUploading(true);
      setUploadProgress('Deleting media from cloud storage...');
      await fetch('/api/whatsapp/templates/delete-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          fileKey: form.media_file_key || form.media_url,
        }),
      });

      // Clear local state
      setForm(prev => ({
        ...prev,
        media_url: '',
        media_file_key: '',
        media_mime: '',
        media_file_name: '',
        media_file_size: null,
      }));
    } catch (delErr) {
      console.error('[AddTemplateModal] Delete media error:', delErr);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleSaveTemplate = async () => {
    if (!form.name.trim()) {
      setErrorMessage('Please enter a template name.');
      return;
    }
    if (!form.textBody.trim()) {
      setErrorMessage('Please enter template message text.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: Record<string, any> = {
        body: form.textBody,
      };

      if (form.type === 'media' && form.media_url) {
        payload.mediaUrl = form.media_url;
        payload.media_url = form.media_url;
        payload.mediaFileKey = form.media_file_key;
        payload.media_file_key = form.media_file_key;
        payload.mediaMime = form.media_mime;
        payload.media_mime = form.media_mime;
        payload.mediaFileName = form.media_file_name;
        payload.mediaFileSize = form.media_file_size;
      }

      const res = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          name: form.name.trim().toLowerCase().replace(/\s+/g, '_'),
          category: form.category,
          language: form.language,
          type: form.type,
          payload,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save template');
      }

      const savedData = await res.json();
      if (onTemplateCreated) onTemplateCreated(savedData);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save template');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Create WhatsApp Template</h3>
            <p className="text-xs text-zinc-500">Configure text or rich media template with B2 cloud storage</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 flex-1">
          {errorMessage && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Template Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Template Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. wedding_intro_video"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              >
                <option value="MARKETING">Marketing (Offers & Announcements)</option>
                <option value="UTILITY">Utility (Account & Order Updates)</option>
                <option value="AUTHENTICATION">Authentication (OTPs)</option>
              </select>
            </div>
          </div>

          {/* Media Header Section */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                Media Header Attachment
              </label>
              <span className="text-[11px] text-zinc-400">JPG, PNG, WebP (16MB) • MP4, PDF (50MB)</span>
            </div>

            {form.media_url ? (
              <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-500/30 dark:border-emerald-500/20 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Icon / Thumbnail */}
                    {form.media_mime.includes('video') ? (
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                        <Video className="w-5 h-5" />
                      </div>
                    ) : form.media_mime.includes('pdf') ? (
                      <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    ) : (
                      <img 
                        src={form.media_url} 
                        alt="Preview" 
                        className="w-10 h-10 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 shrink-0" 
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate max-w-xs sm:max-w-sm">
                        {form.media_file_name || 'media_attachment'}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-mono">
                        {form.media_mime} • {formatFileSize(form.media_file_size)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDeleteMedia}
                    disabled={uploading}
                    className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                    title="Delete media from cloud storage"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Rich Live Preview */}
                {form.media_mime.includes('video') ? (
                  <div className="rounded-xl overflow-hidden bg-black/90 aspect-video max-h-52 flex items-center justify-center">
                    <video src={form.media_url} controls className="max-h-52 w-full object-contain" />
                  </div>
                ) : form.media_mime.includes('pdf') ? (
                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-rose-500" />
                      <span className="font-medium text-zinc-700 dark:text-zinc-200">PDF Document Ready</span>
                    </div>
                    <a 
                      href={form.media_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-emerald-600 hover:underline text-[11px] font-semibold"
                    >
                      View Document →
                    </a>
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden max-h-48 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                    <img src={form.media_url} alt="Uploaded Header" className="max-h-48 w-full object-contain" />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/mp4,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl transition cursor-pointer bg-white/50 dark:bg-zinc-800/40 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 group"
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {uploadProgress || 'Uploading media to Backblaze B2...'}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                        Click to upload Image, Video, or Document
                      </span>
                      <span className="text-[11px] text-zinc-400 mt-0.5">
                        Native direct streaming to B2 • Up to 50MB
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Message Body */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Message Text Body
            </label>
            <textarea
              rows={4}
              value={form.textBody}
              onChange={e => setForm(p => ({ ...p, textBody: e.target.value }))}
              placeholder="Type your message here... Use {{1}}, {{2}} for dynamic tags."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-sans"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveTemplate}
            disabled={submitting || uploading}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}
