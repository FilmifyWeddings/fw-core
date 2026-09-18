'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useSaraJoSmith } from '@/context/SaraJoSmithContext';

const PRESET_PHOTOGRAPHY = [
  {
    title: 'Editorial Twilight Couple',
    url: 'https://static.showit.co/1200/Ovz9LfXkYfXYanX0Cwracw/298575/aedcef5d-6f60-47e2-932a-ba3e9d3a6958.jpg',
  },
  {
    title: 'Outdoor Wedding Hug',
    url: 'https://static.showit.co/1200/Wx6b7eQMnWdtdI1KMqXWPA/298575/sabrina_jaxson-9.jpg',
  },
  {
    title: 'Sailboat Vows & Floral',
    url: 'https://static.showit.co/1200/Q9oj6wPsZcrmVcrpx7UiJg/298575/k_x_finished-67.jpg',
  },
  {
    title: 'Golden Hour Embrace',
    url: 'https://static.showit.co/1200/qAgYUwRbNmCKnVkGcHrdUQ/298575/haliee_drew-15.jpg',
  },
  {
    title: 'Bridal Veil & Smile',
    url: 'https://static.showit.co/1200/lw87UfpgwfcJVLl0JlxVCQ/298575/img_0082.jpg',
  },
  {
    title: 'Emotional Ceremony Vows',
    url: 'https://static.showit.co/1200/Cdog-5v0WZ7egSrR5drYtQ/298575/googewedding-16.jpg',
  },
  {
    title: 'Vintage Black & White Dance',
    url: 'https://static.showit.co/1200/TXJIMa8xpDIniOOIcV9QPQ/298575/sarah_chase-35.jpg',
  },
  {
    title: 'Maternity Connection',
    url: 'https://static.showit.co/1200/NlPWzT7Nn5mS0Xgzl6tUog/298575/img_5883.jpg',
  },
  {
    title: 'Georgia Sunset Fields',
    url: 'https://static.showit.co/1200/TKWFCTk0eSKq2v5hHSgB1w/298575/sarah_chase-66.jpg',
  },
  {
    title: 'Wedding Rings Detail',
    url: 'https://static.showit.co/1200/QDYE_zObBo8nagyuDrdOYw/298575/turner-46.jpg',
  },
];

export const ImageReplaceModal: React.FC = () => {
  const { activeImageEdit, setActiveImageEdit, updateImage, uploadLocalImage } = useSaraJoSmith();
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [previewError, setPreviewError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeImageEdit) {
      setUrlInput(activeImageEdit.currentUrl);
      setPreviewError(false);
    }
  }, [activeImageEdit]);

  if (!activeImageEdit) return null;

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    updateImage(activeImageEdit.path, urlInput.trim());
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadLocalImage(activeImageEdit.path, file);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xs">
      <div
        className="fixed inset-0"
        onClick={() => setActiveImageEdit(null)}
      />

      <div className="relative w-full max-w-2xl bg-[#FAF8F5] border-2 border-amber-600/60 shadow-2xl rounded-sm p-6 z-10 overflow-y-auto max-h-[90vh] text-[#292421] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#292421]/15 mb-4">
          <div>
            <h3 className="font-sjs-heading text-xl uppercase tracking-wider text-[#292421] font-bold">
              Replace Photograph
            </h3>
            <p className="font-sjs-body text-xs text-[#292421]/70 mt-0.5">
              Target: <span className="font-semibold text-amber-900">{activeImageEdit.label || activeImageEdit.path}</span>
            </p>
          </div>
          <button
            onClick={() => setActiveImageEdit(null)}
            className="p-1 text-zinc-500 hover:text-black font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Method Tabs */}
        <div className="flex border-b border-zinc-300 mb-4 text-xs font-sjs-body uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 text-center transition-colors cursor-pointer ${
              activeTab === 'upload' ? 'border-b-2 border-amber-700 text-amber-900 font-bold bg-amber-500/10' : 'text-zinc-600 hover:text-black'
            }`}
          >
            📁 Upload from Computer
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-2 text-center transition-colors cursor-pointer ${
              activeTab === 'url' ? 'border-b-2 border-amber-700 text-amber-900 font-bold bg-amber-500/10' : 'text-zinc-600 hover:text-black'
            }`}
          >
            🔗 Paste Image URL
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-2 text-center transition-colors cursor-pointer ${
              activeTab === 'presets' ? 'border-b-2 border-amber-700 text-amber-900 font-bold bg-amber-500/10' : 'text-zinc-600 hover:text-black'
            }`}
          >
            ✨ 1-Click Presets
          </button>
        </div>

        {/* TAB 1: LOCAL FILE UPLOAD */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-amber-700/40 hover:border-amber-700 bg-amber-50/50 hover:bg-amber-100/50 rounded-md p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3"
            >
              <span className="text-4xl">📸</span>
              <div>
                <p className="font-sjs-body text-sm font-bold text-[#292421]">
                  Click to select photo from your computer
                </p>
                <p className="font-sjs-body text-xs text-zinc-500 mt-1">
                  Supports JPG, PNG, WEBP. Uploads instantly in full resolution!
                </p>
              </div>
              <button
                type="button"
                className="px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xs text-xs font-sjs-body uppercase tracking-wider font-semibold pointer-events-none"
              >
                {isUploading ? 'Uploading...' : 'Browse Files'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* TAB 2: PASTE URL */}
        {activeTab === 'url' && (
          <form onSubmit={handleApplyUrl} className="space-y-4">
            <div>
              <label className="block font-sjs-body text-xs uppercase tracking-wider text-[#292421] font-semibold mb-1.5">
                Paste Image URL:
              </label>
              <input
                type="url"
                required
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setPreviewError(false);
                }}
                placeholder="https://images.unsplash.com/... or https://static.showit.co/..."
                className="w-full bg-white border border-[#292421]/20 rounded-xs px-3 py-2 text-xs font-sjs-body text-[#292421] focus:outline-none focus:border-amber-700"
              />
            </div>

            {/* Live Preview Box */}
            <div className="bg-[#EFECE3] p-3 rounded-xs border border-[#292421]/15 flex flex-col items-center">
              <span className="font-sjs-body text-[10px] uppercase tracking-wider text-[#292421]/60 mb-2 font-semibold">
                Live Preview:
              </span>
              <div className="relative w-40 h-40 overflow-hidden rounded-xs border border-[#292421]/20 bg-white">
                {urlInput && !previewError ? (
                  <Image
                    src={urlInput}
                    alt="Preview"
                    fill
                    className="object-cover"
                    onError={() => setPreviewError(true)}
                    sizes="160px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-400 text-center p-2">
                    {previewError ? 'Failed to load image from URL' : 'No image URL provided'}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={!urlInput.trim() || previewError}
                className="px-6 py-2 bg-amber-800 hover:bg-amber-900 text-white font-sjs-body text-xs uppercase tracking-wider font-semibold rounded-xs shadow-xs disabled:opacity-50 cursor-pointer"
              >
                Apply Photo URL
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: 1-CLICK PRESETS */}
        {activeTab === 'presets' && (
          <div className="space-y-3">
            <span className="block font-sjs-body text-xs uppercase tracking-wider text-[#292421] font-semibold">
              Select Curated High-End Preset:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-h-56 overflow-y-auto p-1 sjs-scrollbar">
              {PRESET_PHOTOGRAPHY.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    updateImage(activeImageEdit.path, preset.url);
                  }}
                  className="group relative aspect-square rounded-2xs overflow-hidden border border-zinc-300 hover:border-amber-700 transition-all text-left cursor-pointer"
                  title={preset.title}
                >
                  <Image
                    src={preset.url}
                    alt={preset.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    sizes="80px"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-black/65 p-1 text-[8px] text-white truncate font-sjs-body">
                    {preset.title}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Cancel */}
        <div className="flex justify-end pt-4 border-t border-[#292421]/15 mt-4">
          <button
            type="button"
            onClick={() => setActiveImageEdit(null)}
            className="px-4 py-1.5 font-sjs-body text-xs text-[#292421]/70 hover:text-black cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
