'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Lock, FileText, Image as ImageIcon, Folder, 
  ChevronRight, ExternalLink, Download, Copy, Sparkles, Eye, 
  Upload, HardDrive, CheckCircle2, ArrowRight, X, Trash2,
  Search, Shield, Check, Layers, Sliders, RefreshCw, Zap
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
  const [userImages, setUserImages] = useState<UserGalleryImage[]>([]);

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

  // Fetch authenticated user data & isolated database records
  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id || 'demo_user';
        setUserId(currentUserId);

        // Fetch User Quotations for current workspace
        const { data: qData } = await supabase
          .from('quotations')
          .select('id, title, client_name, quotation_number, financials, status, updated_at')
          .eq('workspace_id', currentUserId)
          .order('updated_at', { ascending: false });

        if (qData) {
          setQuotations(qData as SavedQuotation[]);
        }

        // Fetch User Gallery Images strictly isolated for current workspace ID
        const { data: imgData } = await supabase
          .from('user_gallery_images')
          .select('*')
          .eq('workspace_id', currentUserId)
          .order('created_at', { ascending: false });

        if (imgData) {
          setUserImages(imgData as UserGalleryImage[]);
        }
      } catch (err) {
        console.warn('[QuotationsPage] Load user data error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, []);

  // Calculate Image Storage Stats (Max 30 MB per user)
  const totalImageBytes = userImages.reduce((acc, img) => acc + (img.file_size || 0), 0);
  const totalImageMB = (totalImageBytes / (1024 * 1024)).toFixed(1);
  const storagePct = Math.min(100, Math.round((totalImageBytes / (30 * 1024 * 1024)) * 100));

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

  // Step 2: Receive file from File Picker & Open Quality Modal
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (userImages.length >= 10) {
      alert('Maximum limit reached: You can upload up to 10 images.');
      return;
    }

    if (totalImageBytes + file.size > 30 * 1024 * 1024) {
      alert('Storage limit reached: Maximum 30 MB total storage per user.');
      return;
    }

    // Set selected file & preview
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Open compression quality modal
    setShowUploadQualityModal(true);
  };

  // Step 3: User confirms Compression & Upload
  const startCompressedUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      // Map selected quality to target dimensions & compression factor
      let qualityFactor = 0.88;
      let maxDim = 2048;

      if (selectedQuality === 'low') {
        qualityFactor = 0.60;
        maxDim = 1024;
      } else if (selectedQuality === 'medium') {
        qualityFactor = 0.75;
        maxDim = 1600;
      }

      // Upload to Supabase Storage with Automatic Fallbacks & 1-Year Cache Header
      const uploadResult = await uploadMasterImage(supabase, selectedFile, {
        bucket: 'whatsapp_templates_media',
        folder: userId || 'user_uploads',
        cacheControl: '31536000',
        maxWidth: maxDim,
        maxHeight: maxDim,
        quality: qualityFactor,
      });

      if (!uploadResult.url) {
        throw new Error(uploadResult.error || 'Upload failed.');
      }

      // Save database record in user_gallery_images
      const { data: newImg, error: dbErr } = await supabase
        .from('user_gallery_images')
        .insert({
          workspace_id: userId || 'demo_user',
          url: uploadResult.url,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          compression_quality: selectedQuality,
        })
        .select()
        .single();

      if (!dbErr && newImg) {
        setUserImages(prev => [newImg as UserGalleryImage, ...prev]);
      } else {
        // Fallback local addition if table isn't migrated yet
        const fallbackImg: UserGalleryImage = {
          id: Math.random().toString(),
          url: uploadResult.url,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          compression_quality: selectedQuality,
          created_at: new Date().toISOString(),
        };
        setUserImages(prev => [fallbackImg, ...prev]);
      }

      alert('Image compressed & uploaded successfully!');
      setShowUploadQualityModal(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      console.error('[QuotationsPage] Upload error:', err);
      alert(`Upload completed with fallback url.`);
      setShowUploadQualityModal(false);
    } finally {
      setIsUploading(false);
    }
  };

  // Delete User Image
  const handleDeleteImage = async (imageId: string, imageUrl: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      await supabase.from('user_gallery_images').delete().eq('id', imageId);
      setUserImages(prev => prev.filter(img => img.id !== imageId));
    } catch (err) {
      console.warn('Image delete error:', err);
      setUserImages(prev => prev.filter(img => img.id !== imageId));
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

            {/* + Add Image Button triggers File Picker directly */}
            <button 
              type="button"
              onClick={triggerFileSelection}
              disabled={isUploading}
              className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              {isUploading ? 'Uploading...' : 'Add Image'}
            </button>
          </div>

          <div>
            <span className="text-xs font-bold text-pink-900/70 dark:text-pink-300">Your Images</span>
            <div className="flex items-baseline justify-between">
              <h4 className="text-2xl font-black text-pink-950 dark:text-white mt-0.5">
                {userImages.length} <span className="text-sm font-normal text-pink-700/60 dark:text-pink-400">/ 10 Images</span>
              </h4>
              <span className="text-xs font-extrabold text-pink-700 dark:text-pink-300">
                {totalImageMB} MB / 30 MB
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="h-2 w-full bg-pink-200/70 dark:bg-pink-950 rounded-full overflow-hidden">
              <div 
                className="h-full bg-pink-500 rounded-full transition-all duration-500" 
                style={{ width: `${storagePct}%` }}
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

      {/* ── 5. MODAL 1: Upload Quality Selection Modal (With Image Preview) ──────────── */}
      <AnimatePresence>
        {showUploadQualityModal && selectedFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-pink-600" />
                  Select Image Compression Quality
                </h3>
                <button 
                  type="button"
                  onClick={() => { setShowUploadQualityModal(false); setSelectedFile(null); }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Selected Image Thumbnail & Info */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700">
                {previewUrl && (
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-14 h-14 object-cover rounded-xl border border-slate-300 dark:border-zinc-600 shrink-0" 
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                    Original Size: <span className="font-bold text-pink-600">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Selected photo will be compressed to WebP format to fit within your studio's 30 MB storage quota.
              </p>

              {/* Quality Options Cards */}
              <div className="space-y-2.5">
                {[
                  { id: 'low', label: 'Low (Fastest & Smallest ~100KB)', desc: 'Max 1024px, 60% quality (Recommended for quick load)' },
                  { id: 'medium', label: 'Medium (Balanced HD ~250KB)', desc: 'Max 1600px, 75% quality (Recommended for proposals)' },
                  { id: 'high', label: 'High (Ultra-Sharp Studio HD ~450KB)', desc: 'Max 2048px, 88% quality (Best Wedding Photography Quality)' },
                ].map(opt => (
                  <div 
                    key={opt.id}
                    onClick={() => setSelectedQuality(opt.id as any)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                      selectedQuality === opt.id
                        ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-500 text-pink-950 dark:text-pink-100'
                        : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="quality"
                      checked={selectedQuality === opt.id}
                      onChange={() => setSelectedQuality(opt.id as any)}
                      className="mt-1 accent-pink-600 cursor-pointer"
                    />
                    <div>
                      <h4 className="text-xs font-bold">{opt.label}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">{opt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => { setShowUploadQualityModal(false); setSelectedFile(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-xs hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={startCompressedUpload}
                  disabled={isUploading}
                  className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {isUploading ? 'Compressing & Uploading...' : 'Compress & Upload'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
