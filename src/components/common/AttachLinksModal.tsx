'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Link2, Plus, Trash2, ExternalLink, Check, Sparkles 
} from 'lucide-react';

export interface DeliverableAttachedLink {
  id: string;
  title: string;
  url: string;
}

interface AttachLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  initialLinks?: DeliverableAttachedLink[];
  onSave: (links: DeliverableAttachedLink[]) => Promise<void> | void;
}

const PRESET_LINK_TITLES = [
  'Google Drive Raw',
  'Draft Review',
  'YouTube Preview',
  'Vimeo Master',
  'Dropbox Files',
  'Frame.io Review',
  'Final High-Res Export'
];

export default function AttachLinksModal({
  isOpen,
  onClose,
  title,
  subtitle,
  initialLinks = [],
  onSave,
}: AttachLinksModalProps) {
  const [links, setLinks] = useState<DeliverableAttachedLink[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialLinks && initialLinks.length > 0) {
        setLinks(initialLinks.map(l => ({ ...l, id: l.id || `link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` })));
      } else {
        setLinks([{ id: `link_${Date.now()}`, title: 'Review / Drive Link', url: '' }]);
      }
    }
  }, [isOpen, initialLinks]);

  if (!isOpen) return null;

  const handleAddLink = (presetTitle?: string) => {
    setLinks(prev => [
      ...prev,
      {
        id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: presetTitle || '',
        url: '',
      }
    ]);
  };

  const handleUpdateLink = (id: string, field: 'title' | 'url', value: string) => {
    setLinks(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleRemoveLink = (id: string) => {
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  const handleSave = async () => {
    // Filter out completely blank rows
    const valid = links
      .map(l => ({
        ...l,
        title: l.title.trim() || 'Project Link',
        url: l.url.trim()
      }))
      .filter(l => l.url.length > 0);

    setIsSaving(true);
    try {
      await onSave(valid);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[170] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-2xs">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-transparent"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-[#FAF8F5] rounded-3xl shadow-2xl border-2 border-amber-300 flex flex-col z-10 overflow-hidden text-stone-900"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-white border-b border-amber-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center shadow-2xs">
                <Link2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                  <span>Attach Project &amp; Review Links</span>
                </h3>
                <p className="text-xs text-stone-500 font-medium truncate max-w-[280px] sm:max-w-md">
                  {title} {subtitle ? `• ${subtitle}` : ''}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center cursor-pointer transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5 overflow-y-auto max-h-[60vh] space-y-3.5">
            {/* Quick Preset Pills */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                Quick Title Presets
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {PRESET_LINK_TITLES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAddLink(preset)}
                    className="px-2.5 py-1 rounded-xl bg-white hover:bg-amber-50 text-stone-700 hover:text-amber-900 border border-stone-200 text-[11px] font-bold shadow-2xs transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>{preset}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Links Rows */}
            <div className="space-y-2.5 pt-1">
              {links.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border-2 border-dashed border-stone-200 bg-white space-y-2">
                  <p className="text-xs text-stone-500 font-medium">No links attached yet.</p>
                  <button
                    type="button"
                    onClick={() => handleAddLink()}
                    className="px-3 py-1.5 bg-amber-50 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold hover:bg-amber-100 cursor-pointer"
                  >
                    + Add First Link
                  </button>
                </div>
              ) : (
                links.map((link, idx) => (
                  <div 
                    key={link.id} 
                    className="p-3 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1">
                        <span className="w-5 h-5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          placeholder="Link Title (e.g. YouTube Draft, Google Drive Raw)..."
                          value={link.title}
                          onChange={(e) => handleUpdateLink(link.id, 'title', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-extrabold text-stone-900 focus:bg-white focus:outline-none focus:border-amber-500 shadow-2xs"
                        />
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {link.url && (
                          <a
                            href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-stone-100 text-stone-600 hover:text-amber-700 hover:bg-amber-50 transition cursor-pointer"
                            title="Test open link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveLink(link.id)}
                          className="p-1.5 rounded-lg bg-stone-100 text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Remove link"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <input
                        type="url"
                        placeholder="https://drive.google.com/... or https://youtube.com/..."
                        value={link.url}
                        onChange={(e) => handleUpdateLink(link.id, 'url', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-medium text-stone-800 focus:bg-white focus:outline-none focus:border-amber-500 shadow-2xs"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {links.length > 0 && (
              <button
                type="button"
                onClick={() => handleAddLink()}
                className="w-full py-2 bg-stone-100 hover:bg-amber-50 border border-dashed border-stone-300 hover:border-amber-400 rounded-xl text-xs font-bold text-stone-700 hover:text-amber-900 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-amber-600" />
                <span>Add Another Link</span>
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 sm:p-4 bg-white border-t border-amber-200/80 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSaving ? 'Saving...' : 'Save Links'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
