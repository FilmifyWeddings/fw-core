'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Camera,
  Upload,
  ArrowLeft,
  ExternalLink,
  QrCode,
  Lock,
  Calendar,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
  HardDrive,
  Users,
  Download,
  Share2,
  Eye,
  RefreshCw,
  Plus,
  X,
  Printer,
  Copy,
  Check,
  Star,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { batchUploadPhotos } from '@/lib/imageProcessor';
import { getPublicGalleryUrl } from '@/lib/r2';

interface EventGallery {
  id: string;
  workspace_id: string;
  title: string;
  slug: string;
  event_date: string;
  pin_code: string | null;
  cover_url: string | null;
  allow_downloads: boolean;
  is_active: boolean;
  created_at: string;
}

interface PhotoItem {
  id: string;
  gallery_id: string;
  original_key: string;
  preview_key: string;
  thumbnail_key: string;
  preview_url: string;
  thumbnail_url: string;
  width: number;
  height: number;
  size_bytes: number;
  face_count: number;
  created_at: string;
}

export default function GalleryCollectionPage() {
  const params = useParams();
  const router = useRouter();
  const galleryId = params?.id as string;

  const [gallery, setGallery] = useState<EventGallery | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Uploader State
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; percentage: number; status: string }>({
    current: 0,
    total: 0,
    percentage: 0,
    status: '',
  });

  // Modals & Lightbox
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isStandeeModalOpen, setIsStandeeModalOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Gallery Info & Photos
  const loadGalleryAndPhotos = useCallback(async () => {
    if (!galleryId) return;
    setLoading(true);

    try {
      // Fetch gallery info
      const { data: gal, error: gError } = await supabase
        .from('event_galleries')
        .select('*')
        .eq('id', galleryId)
        .single();

      if (gError || !gal) {
        throw new Error(gError?.message || 'Gallery not found');
      }
      setGallery(gal);

      // Fetch photos via API
      const pRes = await fetch(`/api/gallery/photos?gallery_id=${galleryId}`);
      const pJson = await pRes.json();
      if (pJson.success && Array.isArray(pJson.photos)) {
        setPhotos(pJson.photos);
      }
    } catch (err: any) {
      console.error('Failed to load gallery collection:', err);
    } finally {
      setLoading(false);
    }
  }, [galleryId]);

  useEffect(() => {
    loadGalleryAndPhotos();
  }, [loadGalleryAndPhotos]);

  // 2. Direct R2 Batch Uploader with Instant Zero-Reload Rendering
  const handleStartUpload = async () => {
    if (!gallery || uploadFiles.length === 0) return;

    setUploading(true);
    setUploadProgress({
      current: 0,
      total: uploadFiles.length,
      percentage: 0,
      status: 'Generating WebP previews & thumbnails in browser...',
    });

    try {
      const result = await batchUploadPhotos(gallery.id, uploadFiles, (current, total, percentage, status) => {
        setUploadProgress({ current, total, percentage, status });
      });

      if (result.success || result.uploadedCount > 0) {
        setUploadFiles([]);
        setIsUploadModalOpen(false);

        // Instantly reload photos without full page reload
        const pRes = await fetch(`/api/gallery/photos?gallery_id=${gallery.id}`);
        const pJson = await pRes.json();
        if (pJson.success && Array.isArray(pJson.photos)) {
          setPhotos(pJson.photos);
        }
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // 3. Set Cover Photo
  const handleSetCover = async (photo: PhotoItem) => {
    if (!gallery) return;
    const coverUrl = photo.preview_url;

    try {
      await supabase
        .from('event_galleries')
        .update({ cover_url: coverUrl })
        .eq('id', gallery.id);

      setGallery(prev => (prev ? { ...prev, cover_url: coverUrl } : null));
    } catch (err: any) {
      alert(`Failed to set cover: ${err.message}`);
    }
  };

  // 4. Delete Single Photo
  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      const res = await fetch(`/api/gallery/photos?photo_id=${photoId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
      }
    } catch (err: any) {
      alert(`Failed to delete photo: ${err.message}`);
    }
  };

  // 5. Download Original High-Res
  const handleDownloadOriginal = async (photo: PhotoItem) => {
    try {
      const res = await fetch('/api/gallery/download-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalKey: photo.original_key, previewKey: photo.preview_url }),
      });
      const json = await res.json();
      if (json.success && json.downloadUrl) {
        const a = document.createElement('a');
        a.href = json.downloadUrl;
        a.download = `wedding_photo_${photo.id}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        window.open(photo.preview_url, '_blank');
      }
    } catch (err) {
      window.open(photo.preview_url, '_blank');
    }
  };

  const getPublicUrl = (slug: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/g/${slug}`;
    }
    return `https://studiocore.in/g/${slug}`;
  };

  const totalFaces = photos.reduce((acc, p) => acc + (p.face_count || 0), 0);
  const totalSizeBytes = photos.reduce((acc, p) => acc + (Number(p.size_bytes) || 0), 0);
  const totalSizeMb = (totalSizeBytes / (1024 * 1024)).toFixed(1);

  if (loading && !gallery) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-8 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs font-bold text-zinc-600">Loading Gallery Collection...</p>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-zinc-800">Gallery Not Found</h2>
        <Link href="/workspace/gallery" className="text-xs font-bold text-amber-600 hover:underline">
          &larr; Back to AI Galleries
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 font-sans p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* ─────────────────────────────────────────────────────────────
          1. NAVIGATION & GALLERY HEADER
      ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          href="/workspace/gallery"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All AI Galleries</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsStandeeModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-800 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-amber-600" />
            <span>Table Standee</span>
          </button>

          <a
            href={`/g/${gallery.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-zinc-900/10 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 text-amber-400" />
            <span>View Guest Portal</span>
          </a>
        </div>
      </div>

      {/* Gallery Showcase Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2D8] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-200 overflow-hidden shrink-0 shadow-sm">
            {gallery.cover_url ? (
              <img src={gallery.cover_url} alt={gallery.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500 bg-zinc-800">
                <Camera className="w-8 h-8 text-zinc-600" />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                {gallery.title}
              </h1>
              {gallery.pin_code && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black border border-amber-200 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600" />
                  <span>PIN: {gallery.pin_code}</span>
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-500 font-mono">
              Public Link: <span className="text-blue-600 font-bold">{getPublicUrl(gallery.slug)}</span>
            </p>

            <div className="flex items-center gap-4 text-xs font-bold text-zinc-500 pt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                {new Date(gallery.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span className="text-emerald-700 font-bold">{photos.length} Photos</span>
              <span className="text-blue-700 font-bold">{totalFaces} Faces Indexed</span>
              <span className="text-purple-700 font-bold">{totalSizeMb} MB Storage</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>+ Upload Photos (WebP Direct R2)</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. PHOTOS GRID & INSTANT CDN PREVIEWS
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-zinc-900">Gallery Media Collection</h2>
            <p className="text-xs text-zinc-400">Streamed with sub-second latency from dedicated Cloudflare R2 CDN.</p>
          </div>

          <button
            onClick={loadGalleryAndPhotos}
            className="p-2 rounded-xl bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 transition cursor-pointer"
            title="Refresh Photos"
          >
            <RefreshCw className={'w-4 h-4 ' + (loading ? 'animate-spin' : '')} />
          </button>
        </div>

        {photos.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-zinc-200 space-y-4 shadow-2xs">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
              <ImageIcon className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-800">No Photos in this Gallery Yet</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Drag and drop your wedding photos to compress and stream directly to Cloudflare R2 bucket.
              </p>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-6 py-3 rounded-2xl bg-amber-500 text-white text-xs font-bold inline-flex items-center gap-2 hover:bg-amber-600 transition cursor-pointer shadow-md"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Photos Now</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {photos.map((photo, idx) => {
              const isCover = gallery.cover_url === photo.preview_url;

              return (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhotoIndex(idx)}
                  className="group relative aspect-square bg-zinc-100 rounded-2xl overflow-hidden border border-zinc-200 shadow-2xs cursor-pointer hover:shadow-md transition-all"
                >
                  <img
                    src={photo.thumbnail_url}
                    alt="Gallery thumbnail"
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Badges */}
                  {isCover && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black shadow-sm flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-white" />
                      <span>Cover</span>
                    </div>
                  )}

                  {photo.face_count > 0 && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[9px] font-bold border border-white/20">
                      👥 {photo.face_count} {photo.face_count === 1 ? 'Face' : 'Faces'}
                    </div>
                  )}

                  {/* Actions on Hover */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity text-white">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetCover(photo);
                      }}
                      className="p-1.5 rounded-lg bg-black/50 hover:bg-amber-500 transition cursor-pointer text-[10px] font-bold"
                      title="Set as Cover"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadOriginal(photo);
                        }}
                        className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 transition cursor-pointer"
                        title="Download Original"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhoto(photo.id);
                        }}
                        className="p-1.5 rounded-lg bg-black/50 hover:bg-rose-600 transition cursor-pointer"
                        title="Delete Photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. BATCH PHOTO UPLOADER MODAL (CLIENT WEBP + DIRECT R2)
      ───────────────────────────────────────────────────────────── */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-zinc-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-zinc-900">Upload Photos to Gallery</h3>
                <span className="text-xs text-zinc-400">Direct-to-Cloudflare R2 Bucket Pipeline</span>
              </div>
              <button
                type="button"
                disabled={uploading}
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!uploading ? (
              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-300 hover:border-amber-500 bg-[#FBF9F5] rounded-3xl p-8 text-center cursor-pointer transition-all space-y-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-zinc-800">
                      Click or Drag &amp; Drop Wedding Photos
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      RAW / JPEG / PNG files will be converted to high-speed WebP and sent directly to R2
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setUploadFiles(Array.from(e.target.files));
                      }
                    }}
                  />
                </div>

                {uploadFiles.length > 0 && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 font-bold">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{uploadFiles.length} photos queued for direct upload</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadFiles([])}
                      className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={uploadFiles.length === 0}
                    onClick={handleStartUpload}
                    className="flex-1 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Upload &amp; Auto-Index Faces ({uploadFiles.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-3.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 space-y-5 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto animate-pulse">
                  <Upload className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-black text-zinc-900">
                    Uploading &amp; Compressing to Cloudflare R2...
                  </h4>
                  <p className="text-xs text-zinc-500 font-mono">
                    {uploadProgress.status || `Processing photo ${uploadProgress.current} of ${uploadProgress.total}`}
                  </p>
                </div>

                <div className="space-y-1.5 max-w-md mx-auto">
                  <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200 p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress.percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500">
                    <span>{uploadProgress.current} / {uploadProgress.total} uploaded</span>
                    <span>{uploadProgress.percentage}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. TABLE STANDEE & QR CODE MODAL
      ───────────────────────────────────────────────────────────── */}
      {isStandeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-zinc-200 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-black text-zinc-900">Printable Wedding Table Standee</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStandeeModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div id="standee-print-card" className="bg-[#FAF9F5] border-2 border-amber-400/60 rounded-3xl p-8 text-center space-y-5 shadow-inner">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 bg-amber-100/80 px-3 py-1 rounded-full border border-amber-300">
                  ✨ Instant AI Guest Gallery
                </span>
                <h2 className="text-xl font-black text-zinc-900 tracking-tight pt-2">
                  {gallery.title}
                </h2>
                <p className="text-xs text-zinc-500 font-serif italic">
                  Find all your wedding photos instantly with AI Selfie Search
                </p>
              </div>

              <div className="w-44 h-44 bg-white p-3 rounded-2xl border-2 border-zinc-900 mx-auto shadow-md flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(getPublicUrl(gallery.slug))}`}
                  alt="Gallery QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-1 text-xs">
                <p className="font-bold text-zinc-800">1. Scan QR with your phone camera</p>
                <p className="font-bold text-zinc-800">2. Take a quick selfie to find your photos</p>
                {gallery.pin_code && (
                  <p className="font-mono text-xs font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md inline-block border border-amber-300">
                    PIN Code: {gallery.pin_code}
                  </p>
                )}
              </div>

              <div className="pt-2 text-[10px] font-bold text-zinc-400 tracking-wider uppercase border-t border-zinc-200">
                Powered by StudioCore AI
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Print Standee Card</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(getPublicUrl(gallery.slug));
                  setCopiedUrl(true);
                  setTimeout(() => setCopiedUrl(false), 2000);
                }}
                className="px-4 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedUrl ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. LIGHTBOX MODAL
      ───────────────────────────────────────────────────────────── */}
      {selectedPhotoIndex !== null && photos[selectedPhotoIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between text-white p-4 sm:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between z-10">
            <span className="text-xs font-bold text-zinc-400">
              {selectedPhotoIndex + 1} of {photos.length}
            </span>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDownloadOriginal(photos[selectedPhotoIndex])}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Download Original</span>
              </button>

              <button
                onClick={() => setSelectedPhotoIndex(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
            <img
              src={photos[selectedPhotoIndex].preview_url}
              alt="Preview"
              className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}

    </div>
  );
}
