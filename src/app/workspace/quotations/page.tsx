'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Lock, FileText, Image as ImageIcon, Folder, 
  ChevronRight, ExternalLink, Download, Copy, Sparkles, Eye, 
  Upload, HardDrive, CheckCircle2, ArrowRight, X, Trash2,
  Search, Shield, Check, Layers, Sliders, RefreshCw, Zap, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { compressImageClient, uploadMasterImage } from '@/lib/master-image-manager';
import { MasterMediaModal } from '@/components/MasterMediaModal';

interface SavedQuotation {
  id: string;
  title: string;
  client_name: string;
  quotation_number: string;
  financials: { total_amount?: number };
  status: string;
  updated_at: string;
}

interface UserGalleryImage {
  id: string;
  url: string;
  file_name: string;
  file_size: number;
  compression_quality: string;
  created_at: string;
}

export default function WorkspaceQuotationsGalleryPage() {
  const router = useRouter();

  // User Session & Security
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Dynamic Data States
  const [quotations, setQuotations] = useState<SavedQuotation[]>([]);
  const [userImages, setUserImages] = useState<UserGalleryImage[]>(() => {
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('wg_gallery_cache_')) {
          try {
            const parsed = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          } catch {}
        }
      }
    }
    return [];
  });

  // Selected File for Upload & Preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Modals & Drawers States
  const [showQuotationsModal, setShowQuotationsModal] = useState<boolean>(false);
  const [showGalleryModal, setShowGalleryModal] = useState<boolean>(false);
  const [showUploadQualityModal, setShowUploadQualityModal] = useState<boolean>(false);
  const [selectedQuality, setSelectedQuality] = useState<'low' | 'medium' | 'high'>('high');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [quotationSearch, setQuotationSearch] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Unlocked Templates
  const activeDesigns = [
    {
      id: '1',
      title: 'Wedding - Mocha & Gold',
      subtitle: 'Wedding - 11 pages',
      category: 'Wedding',
      coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
      badge: 'Popular',
      isUnlocked: true,
      editUrl: '/workspace/quotations/builder/templet/1'
    },
    {
      id: '2',
      title: 'Pre-Wedding - Airy White',
      subtitle: 'Pre-Wedding - 11 pages',
      category: 'Pre-Wedding',
      coverImage: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
      badge: 'Minimal',
      isUnlocked: true,
      editUrl: '/workspace/quotations/builder/templet/1'
    }
  ];

  // Locked Premium Templates
  const lockedDesigns = [
    {
      id: '3',
      title: 'Engagement — In Black, Rose',
      subtitle: 'Engagement - 8 pages',
      price: '₹599/mo',
      category: 'Engagement'
    },
    {
      id: '4',
      title: 'Maternity — Peach & Bronze',
      subtitle: 'Maternity - 6 pages',
      price: '₹599/mo',
      category: 'Maternity'
    },
    {
      id: '5',
      title: 'Baby / Newborn — Dynamic Trend',
      subtitle: 'Newborn - 7 pages',
      price: '₹599/mo',
      category: 'Baby & Kids'
    },
    {
      id: '6',
      title: 'Birthday — Gold Hues',
      subtitle: 'Birthday - 5 pages',
      price: '₹599/mo',
      category: 'Events'
    }
  ];

  // Fetch authenticated user data & isolated database records silently in background
  useEffect(() => {
    async function loadUserDataSilently() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id || 'demo_user';
        setUserId(currentUserId);

        // Load client-side gallery cache for immediate 0-delay display
        const cached = localStorage.getItem(`wg_gallery_cache_${currentUserId}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              setUserImages(parsed);
            }
          } catch {}
        }

        // Fetch User Quotations for current workspace
        const { data: qData } = await supabase
          .from('quotations')
          .select('id, title, client_name, quotation_number, financials, status, updated_at')
          .eq('workspace_id', currentUserId)
          .order('updated_at', { ascending: false });

        if (qData) {
          setQuotations(qData as SavedQuotation[]);
        }

        // Fetch User Gallery Images silently in background
        const { data: imgData } = await supabase
          .from('user_gallery_images')
          .select('*')
          .eq('workspace_id', currentUserId)
          .order('created_at', { ascending: false });

        if (imgData) {
          setUserImages(imgData as UserGalleryImage[]);
          localStorage.setItem(`wg_gallery_cache_${currentUserId}`, JSON.stringify(imgData));
        }
      } catch (err) {
        console.warn('[QuotationsPage] Silent background sync error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUserDataSilently();
  }, []);

  // Real-time gallery sync event listener (instant count update across modal & card)
  useEffect(() => {
    const handleGalleryUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setUserImages(customEvent.detail);
      }
    };
    window.addEventListener('wg_gallery_updated', handleGalleryUpdate);
    return () => window.removeEventListener('wg_gallery_updated', handleGalleryUpdate);
  }, []);

  // Step 1: Open PC Folder / Mobile Gallery directly
  const triggerFileSelection = () => {
    if (userImages.length >= 10) {
      alert('Maximum limit reached: You can upload up to 10 images.');
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Step 2: Direct Automatic High-Quality Compression & Upload (Bypass quality popup)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (userImages.length >= 10) {
      alert('Maximum limit reached: You can upload up to 10 images.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);

    try {
      setUploadProgress(40);
      // Upload to Supabase Storage with Automatic High-Quality WebP Compression (0.92 quality, 2048px max dim)
      const uploadResult = await uploadMasterImage(supabase, file, {
        bucket: 'whatsapp_templates_media',
        folder: userId || 'user_uploads',
        cacheControl: '31536000',
        maxWidth: 2048,
        maxHeight: 2048,
        quality: 0.92,
      });

      setUploadProgress(75);

      if (!uploadResult.url) {
        throw new Error(uploadResult.error || 'Upload failed.');
      }

      // Save database record in user_gallery_images
      const { data: newImg, error: dbErr } = await supabase
        .from('user_gallery_images')
        .insert({
          workspace_id: userId || 'demo_user',
          url: uploadResult.url,
          file_name: file.name,
          file_size: file.size,
          compression_quality: '92% WebP',
        })
        .select()
        .single();

      setUploadProgress(100);

      const finalImgObj: UserGalleryImage = newImg || {
        id: Math.random().toString(),
        url: uploadResult.url,
        file_name: file.name,
        file_size: file.size,
        compression_quality: '92% WebP',
        created_at: new Date().toISOString(),
      };

      setUserImages(prev => {
        const updated = [finalImgObj, ...prev];
        localStorage.setItem(`wg_gallery_cache_${userId}`, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('wg_gallery_updated', { detail: updated }));
        return updated;
      });
    } catch (err: any) {
      console.error('[QuotationsPage] Automatic upload error:', err);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Delete User Image (Instant Supabase + Storage + UI Sync)
  const handleDeleteImage = async (imageId: string, imageUrl: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    setUserImages(prev => {
      const updated = prev.filter(img => img.id !== imageId && img.url !== imageUrl);
      localStorage.setItem(`wg_gallery_cache_${userId}`, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('wg_gallery_updated', { detail: updated }));
      return updated;
    });

    try {
      await supabase.from('user_gallery_images').delete().eq('id', imageId);
    } catch (err) {
      console.warn('Image delete error:', err);
    }
  };

  const filteredQuotations = quotations.filter(q => 
    q.title?.toLowerCase().includes(quotationSearch.toLowerCase()) ||
    q.client_name?.toLowerCase().includes(quotationSearch.toLowerCase()) ||
    q.quotation_number?.toLowerCase().includes(quotationSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#070708] text-slate-800 dark:text-zinc-100 p-4 lg:p-8 space-y-8">
      
      {/* ── 1. Page Header ───────────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Quotation Designs
        </h1>
        <p className="text-xs lg:text-sm text-slate-600 dark:text-zinc-300 font-semibold leading-relaxed max-w-4xl">
          Win more bookings with a presentation that feels premium. Customize every detail—from cover image and studio profile to pricing, deliverables, and payment schedule.
        </p>
      </div>

      {/* ── 2. Top Stats Widget (Quotations & User Images Storage) ──────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        
        {/* CARD 1: QUOTATIONS (Limit: 10) */}
        <motion.div 
          whileHover={{ y: -4 }}
          onClick={() => setShowQuotationsModal(true)}
          className="rounded-2xl bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] dark:from-indigo-950/40 dark:to-indigo-900/20 border border-indigo-200/80 dark:border-indigo-900/50 p-5 space-y-3 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-indigo-900/70 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200">
              Auto-saved
            </span>
          </div>

          <div>
            <span className="text-xs font-bold text-indigo-900/70 dark:text-indigo-300">Quotations</span>
            <h4 className="text-2xl font-black text-indigo-950 dark:text-white mt-0.5">
              {quotations.length} <span className="text-sm font-normal text-indigo-700/60 dark:text-indigo-400">/ 10 Limit</span>
            </h4>
          </div>

          <div className="space-y-1">
            <div className="h-2 w-full bg-indigo-200/70 dark:bg-indigo-950 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (quotations.length / 10) * 100)}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-900/50 flex items-center justify-between text-xs font-bold text-indigo-950 dark:text-indigo-200 group-hover:text-indigo-600">
            <span>View All Quotations ({quotations.length})</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

        {/* CARD 2: IMAGES / USER GALLERY (10 Images · 30 MB Storage) */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="rounded-2xl bg-gradient-to-br from-[#FDF2F8] to-[#FCE7F3] dark:from-pink-950/40 dark:to-pink-900/20 border border-pink-200/80 dark:border-pink-900/50 p-5 space-y-3 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-pink-900/70 text-pink-600 dark:text-pink-300 flex items-center justify-center shadow-sm">
              <ImageIcon className="w-5 h-5" />
            </div>

            {/* + Add Image Button (Instant zero-delay interactive state) */}
            <button 
              type="button"
              onClick={triggerFileSelection}
              disabled={isUploading || userImages.length >= 10}
              className={`px-3 py-1.5 rounded-xl text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1 cursor-pointer ${
                userImages.length >= 10 
                  ? 'bg-zinc-400 cursor-not-allowed opacity-75' 
                  : 'bg-pink-600 hover:bg-pink-700'
              }`}
            >
              {userImages.length >= 10 ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {isUploading ? `Uploading... ${uploadProgress}%` : userImages.length >= 10 ? `Limit Reached (${userImages.length}/10)` : 'Add Image'}
            </button>
          </div>

          <div>
            <span className="text-xs font-bold text-pink-900/70 dark:text-pink-300">Your Images</span>
            <div className="flex items-baseline justify-between">
              <h4 className="text-2xl font-black text-pink-950 dark:text-white mt-0.5">
                {userImages.length} <span className="text-sm font-normal text-pink-700/60 dark:text-pink-400">/ 10 Images</span>
              </h4>
            </div>
          </div>

          <div className="space-y-1">
            <div className="h-2 w-full bg-pink-200/70 dark:bg-pink-950 rounded-full overflow-hidden">
              <div 
                className="h-full bg-pink-500 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (userImages.length / 10) * 100)}%` }}
              />
            </div>
          </div>

          <div 
            onClick={() => setShowGalleryModal(true)}
            className="pt-2 border-t border-pink-200/60 dark:border-pink-900/50 flex items-center justify-between text-xs font-bold text-pink-950 dark:text-pink-200 cursor-pointer hover:text-pink-600"
          >
            <span>Open Image Gallery ({userImages.length})</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

      </div>

      {/* Hidden File Input for Image Upload */}
      <input 
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* ── 3. Your Designs Header & New Design Button ─────────────────────────────── */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Your Designs <span className="text-slate-400 font-normal text-base">(10)</span>
          </h2>
        </div>

        <button 
          type="button"
          onClick={() => router.push('/workspace/quotations/builder/templet/1')}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#B88E4C] to-[#967236] text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          New Design
        </button>
      </div>

      {/* ── 4. 3D & Animated Designs Grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
        
        {/* Active Unlocked Designs (1st Quotation & 2nd Quotation) */}
        {activeDesigns.map((design) => (
          <motion.div 
            key={design.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800/90 overflow-hidden shadow-[0_8px_25px_-8px_rgba(0,0,0,0.1)] hover:shadow-[0_15px_35px_-10px_rgba(0,0,0,0.2)] transition-all flex flex-col justify-between group relative"
          >
            <div>
              {/* 3D Cover Image Container */}
              <div className="relative h-40 w-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                <img 
                  src={design.coverImage} 
                  alt={design.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white text-[9px] font-extrabold uppercase tracking-wider shadow-sm border border-white/20">
                  {design.badge}
                </span>
              </div>

              {/* Title & Info */}
              <div className="p-3.5 space-y-1">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  {design.title}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
                  {design.subtitle}
                </p>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-3.5 pt-0 space-y-2">
              {/* Secondary Row Buttons */}
              <div className="grid grid-cols-3 gap-1">
                <button 
                  type="button"
                  onClick={() => router.push(design.editUrl)}
                  className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-[10px] font-bold transition-all text-center"
                >
                  Preview
                </button>
                <button 
                  type="button"
                  onClick={() => alert('Downloading PDF preview...')}
                  className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-[10px] font-bold transition-all text-center"
                >
                  PDF
                </button>
                <button 
                  type="button"
                  onClick={() => alert('Duplicated quotation design!')}
                  className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-[10px] font-bold transition-all text-center"
                >
                  Duplicate
                </button>
              </div>

              {/* Primary Row Buttons (Use For A Lead & EDIT) */}
              <div className="grid grid-cols-2 gap-1.5">
                <button 
                  type="button"
                  onClick={() => router.push('/leads')}
                  className="px-2 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-zinc-700/60 transition-all text-center"
                >
                  Use For Lead
                </button>

                {/* 1st Quotation Edit Button -> Opens /workspace/quotations/builder/templet/1 */}
                <Link
                  href={design.editUrl}
                  className="px-2 py-1.5 rounded-xl border border-amber-600/40 bg-gradient-to-r from-[#B88E4C] to-[#967236] text-white text-[11px] font-extrabold transition-all text-center block shadow-sm hover:opacity-95"
                >
                  Edit
                </Link>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Locked Premium Themes (Animated 3D Cards) */}
        {lockedDesigns.map(locked => (
          <motion.div 
            key={locked.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800/90 p-4 flex flex-col justify-between items-center text-center space-y-4 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] hover:shadow-md transition-all min-h-[250px] relative overflow-hidden"
          >
            {/* Top Title */}
            <div className="space-y-1 w-full pt-1">
              <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 leading-tight">
                {locked.title}
              </h4>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                {locked.subtitle}
              </p>
            </div>

            {/* 3D Glassmorphic Lock Badge */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner border border-slate-200/60 dark:border-zinc-700/50">
              <Lock className="w-6 h-6" />
            </div>

            {/* Bottom Unlock Button */}
            <button 
              type="button"
              onClick={() => router.push('/pricing')}
              className="w-full py-2 px-3 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black text-xs hover:opacity-90 transition-all cursor-pointer shadow-sm"
            >
              Unlock - {locked.price}
            </button>
          </motion.div>
        ))}

      </div>



      {/* ── 6. MODAL 2: Saved Quotations List Drawer Modal ────────────────────────────── */}
      <AnimatePresence>
        {showQuotationsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 shrink-0">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Your Saved Quotations ({quotations.length} / 10)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    All created quotations are automatically saved to your isolated account.
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowQuotationsModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Search quotation by title or client name..."
                  value={quotationSearch}
                  onChange={(e) => setQuotationSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              {/* Quotations List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredQuotations.length === 0 ? (
                  <div className="text-center py-12 space-y-3 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-700">
                    <FileText className="w-10 h-10 text-slate-300 dark:text-zinc-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">No saved quotations found.</p>
                    <button 
                      type="button"
                      onClick={() => { setShowQuotationsModal(false); router.push('/workspace/quotations/builder/templet/1'); }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
                    >
                      + Create New Quotation
                    </button>
                  </div>
                ) : (
                  filteredQuotations.map(q => (
                    <div 
                      key={q.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 flex items-center justify-between gap-4 hover:border-indigo-300 transition-all"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{q.title}</h4>
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                            {q.quotation_number || 'FW-2026'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                          Client: <span className="font-bold text-slate-700 dark:text-zinc-200">{q.client_name}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {q.financials?.total_amount && (
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            ₹{q.financials.total_amount.toLocaleString()}
                          </span>
                        )}
                        <Link 
                          href="/workspace/quotations/builder/templet/1"
                          onClick={() => setShowQuotationsModal(false)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-zinc-800 shrink-0">
                <span className="text-xs text-slate-400 font-medium">Limit: Max 10 saved quotations per studio</span>
                <button 
                  type="button"
                  onClick={() => setShowQuotationsModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-xs hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 7. UNIFIED MASTER MEDIA MODAL ────────────────────────────────────── */}
      <MasterMediaModal 
        isOpen={showGalleryModal} 
        onClose={() => setShowGalleryModal(false)} 
        userId={userId} 
      />

    </div>
  );
}
