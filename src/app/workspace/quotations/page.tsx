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
  const [activeQuotationId, setActiveQuotationId] = useState<string>('1');
  const [activeCoverPhoto, setActiveCoverPhoto] = useState<string>('https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80');
  const [activeCoupleName, setActiveCoupleName] = useState<string>('Rahul & Neha');
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

  // Modals & Drawers States
  const [showQuotationsModal, setShowQuotationsModal] = useState<boolean>(false);
  const [showGalleryModal, setShowGalleryModal] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [quotationSearch, setQuotationSearch] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);

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
      price: '₹799/mo',
      category: 'Engagement'
    },
    {
      id: '4',
      title: 'Maternity — Peach & Bronze',
      subtitle: 'Maternity - 6 pages',
      price: '₹799/mo',
      category: 'Maternity'
    },
    {
      id: '5',
      title: 'Baby / Newborn — Dynamic Trend',
      subtitle: 'Newborn - 7 pages',
      price: '₹799/mo',
      category: 'Baby & Kids'
    },
    {
      id: '6',
      title: 'Birthday — Gold Hues',
      subtitle: 'Birthday - 5 pages',
      price: '₹799/mo',
      category: 'Events'
    }
  ];

  useEffect(() => {
    console.log('=== GLOBAL_SITE_SYNC_VERIFIED_799 ===');
    async function loadUserDataSilently() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id || 'demo_user';
        setUserId(currentUserId);

        const cached = localStorage.getItem(`wg_gallery_cache_${currentUserId}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              setUserImages(parsed);
            }
          } catch {}
        }

        const { data: qData } = await supabase
          .from('quotations')
          .select('id, title, client_name, quotation_number, financials, status, updated_at, content_json')
          .eq('workspace_id', currentUserId)
          .order('updated_at', { ascending: false });

        if (qData && qData.length > 0) {
          setQuotations(qData as SavedQuotation[]);
          const primary = qData[0];
          const primaryId = primary.quotation_number || primary.id;
          setActiveQuotationId(primaryId);

          if (primary.client_name) {
            setActiveCoupleName(primary.client_name);
          }

          if (primary.content_json?.cover?.photoUrl) {
            setActiveCoverPhoto(primary.content_json.cover.photoUrl);
          }
        } else if (currentUserId && currentUserId !== 'demo_user') {
          // Auto-create initial user DB quotation linked to user ID
          const defaultUuid = 'FW-' + Math.random().toString(36).substring(2, 9).toUpperCase();
          const { data: newRow } = await supabase
            .from('quotations')
            .upsert({
              workspace_id: currentUserId,
              quotation_number: defaultUuid,
              title: 'Wedding - Design 1',
              client_name: 'Rahul & Neha',
              status: 'draft',
              updated_at: new Date().toISOString()
            }, { onConflict: 'workspace_id,quotation_number' })
            .select('id, quotation_number')
            .maybeSingle();

          const createdId = newRow?.quotation_number || newRow?.id || defaultUuid;
          setActiveQuotationId(createdId);
        }

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (userImages.length >= 10) {
      alert('Maximum limit reached: You can upload up to 10 images.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    try {
      setUploadProgress(50);
      const uploadResult = await uploadMasterImage(supabase, file, {
        bucket: 'whatsapp_templates_media',
        folder: userId || 'user_uploads',
        cacheControl: '31536000',
        maxWidth: 2048,
        maxHeight: 2048,
        quality: 0.92,
      });

      setUploadProgress(80);

      if (!uploadResult.url) {
        throw new Error(uploadResult.error || 'Upload failed.');
      }

      const { data: newImg } = await supabase
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

  const filteredQuotations = quotations.filter(q => 
    q.title?.toLowerCase().includes(quotationSearch.toLowerCase()) ||
    q.client_name?.toLowerCase().includes(quotationSearch.toLowerCase()) ||
    q.quotation_number?.toLowerCase().includes(quotationSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#070708] text-slate-800 dark:text-zinc-100 p-4 lg:p-8 space-y-6 lg:space-y-8 pb-24 lg:pb-8">
      
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Quotation Designs
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 font-semibold leading-relaxed max-w-4xl">
          Win more bookings with a presentation that feels premium. Customize cover images, pricing, deliverables, and payment schedules.
        </p>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
        
        {/* CARD 1: QUOTATIONS */}
        <motion.div 
          whileHover={{ y: -3 }}
          onClick={() => setShowQuotationsModal(true)}
          className="rounded-2xl bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] dark:from-indigo-950/40 dark:to-indigo-900/20 border border-indigo-200/80 dark:border-indigo-900/50 p-4 sm:p-5 space-y-3 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-indigo-900/70 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200">
              Auto-saved
            </span>
          </div>

          <div>
            <span className="text-xs font-bold text-indigo-900/70 dark:text-indigo-300">Quotations</span>
            <h4 className="text-xl sm:text-2xl font-black text-indigo-950 dark:text-white mt-0.5">
              {quotations.length} <span className="text-xs sm:text-sm font-normal text-indigo-700/60 dark:text-indigo-400">/ 10 Limit</span>
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

          <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-900/50 flex items-center justify-between text-xs font-bold text-indigo-950 dark:text-indigo-200">
            <span>View All Quotations ({quotations.length})</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

        {/* CARD 2: IMAGES / USER GALLERY */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="rounded-2xl bg-gradient-to-br from-[#FDF2F8] to-[#FCE7F3] dark:from-pink-950/40 dark:to-pink-900/20 border border-pink-200/80 dark:border-pink-900/50 p-4 sm:p-5 space-y-3 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-pink-900/70 text-pink-600 dark:text-pink-300 flex items-center justify-center shadow-sm">
              <ImageIcon className="w-5 h-5" />
            </div>

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
              {userImages.length >= 10 ? <AlertTriangle className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {isUploading ? `Uploading... ${uploadProgress}%` : userImages.length >= 10 ? `Limit (${userImages.length}/10)` : 'Add Image'}
            </button>
          </div>

          <div>
            <span className="text-xs font-bold text-pink-900/70 dark:text-pink-300">Your Images</span>
            <h4 className="text-xl sm:text-2xl font-black text-pink-950 dark:text-white mt-0.5">
              {userImages.length} <span className="text-xs sm:text-sm font-normal text-pink-700/60 dark:text-pink-400">/ 10 Images</span>
            </h4>
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

      <input 
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Designs Header & Desktop Button */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Your Designs
        </h2>
      </div>

      {/* Responsive Designs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5">
        
        {/* CARD 1: Royale (Active & Unlocked - Dynamically bound to User DB Quotation UUID) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -4 }}
          className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800/90 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative"
        >
          <div>
            <div className="relative h-40 w-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
              <img 
                src={activeCoverPhoto} 
                alt="Royale Template"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
              <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-emerald-600/90 backdrop-blur-md text-white text-[9px] font-extrabold uppercase tracking-wider shadow-sm">
                Active
              </span>
            </div>

            <div className="p-3.5 space-y-1">
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                Royale
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                Wedding - 11 pages ({activeCoupleName})
              </p>
            </div>
          </div>

          <div className="p-3.5 pt-0 space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              <button 
                type="button"
                onClick={() => router.push(`/workspace/quotations/builder/templet/${activeQuotationId}`)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-[10px] font-bold text-center transition-colors cursor-pointer"
              >
                Preview
              </button>
              <button 
                type="button"
                onClick={async () => {
                  const newUuid = 'FW-' + Math.random().toString(36).substring(2, 9).toUpperCase();
                  if (userId) {
                    try {
                      await supabase.from('quotations').insert({
                        workspace_id: userId,
                        quotation_number: newUuid,
                        title: 'Wedding - Design 1 (Copy)',
                        client_name: activeCoupleName,
                        status: 'draft',
                        updated_at: new Date().toISOString()
                      });
                    } catch {}
                  }
                  router.push(`/workspace/quotations/builder/templet/${newUuid}`);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-[10px] font-bold text-center transition-colors cursor-pointer"
              >
                Duplicate
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button 
                type="button"
                onClick={() => router.push('/workspace/clients')}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-[10px] font-bold text-center transition-colors cursor-pointer"
              >
                Use for Lead
              </button>

              <Link
                href={`/workspace/quotations/builder/templet/${activeQuotationId}`}
                className="px-2.5 py-1.5 rounded-xl border border-amber-600/40 bg-gradient-to-r from-[#B88E4C] to-[#967236] text-white text-[11px] font-extrabold text-center block shadow-sm hover:brightness-105 transition-all"
              >
                Edit
              </Link>
            </div>
          </div>
        </motion.div>

        {/* CARDS 2-5: Coming Soon Templates (Only Image Blurred; Title & Buttons Fully Visible & Disabled) */}
        {[
          {
            id: 'cinematic',
            title: 'Cinematic',
            subtitle: 'Wedding & Film - 12 pages',
            image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80'
          },
          {
            id: 'heritage',
            title: 'Heritage',
            subtitle: 'Royal & Classic - 10 pages',
            image: 'https://images.unsplash.com/photo-1546412414-8035e1776c9a?auto=format&fit=crop&w=800&q=80'
          },
          {
            id: 'heirloom',
            title: 'Heirloom',
            subtitle: 'Vintage & Fine Art - 14 pages',
            image: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80'
          },
          {
            id: 'vows',
            title: 'Vows',
            subtitle: 'Modern & Minimalist - 8 pages',
            image: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=800&q=80'
          }
        ].map(tmpl => (
          <motion.div 
            key={tmpl.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800/90 overflow-hidden shadow-sm flex flex-col justify-between relative select-none"
          >
            <div>
              {/* Image Container with Backdrop Blur & Centered Badge ONLY */}
              <div className="relative h-40 w-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                <img 
                  src={tmpl.image} 
                  alt={tmpl.title}
                  className="w-full h-full object-cover grayscale opacity-50 backdrop-blur-md"
                />
                <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-2">
                  <span className="px-3 py-1 rounded-full bg-amber-500 text-zinc-950 font-black text-[10px] uppercase tracking-wider shadow-md border border-amber-300/40 select-none">
                    Coming Soon
                  </span>
                </div>
              </div>

              {/* Crisp, Unblurred Title & Subtitle */}
              <div className="p-3.5 space-y-1">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                  {tmpl.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                  {tmpl.subtitle}
                </p>
              </div>
            </div>

            {/* Crisp, Unblurred Action Buttons (Disabled with cursor-not-allowed) */}
            <div className="p-3.5 pt-0 space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                <button 
                  disabled 
                  type="button" 
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 text-[10px] font-bold text-center cursor-not-allowed opacity-60 select-none"
                >
                  Preview
                </button>
                <button 
                  disabled 
                  type="button" 
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 text-[10px] font-bold text-center cursor-not-allowed opacity-60 select-none"
                >
                  Duplicate
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button 
                  disabled 
                  type="button" 
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 text-[10px] font-bold text-center cursor-not-allowed opacity-60 select-none"
                >
                  Use for Lead
                </button>

                <button 
                  disabled 
                  type="button" 
                  className="px-2.5 py-1.5 rounded-xl border border-amber-600/30 bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 text-[11px] font-extrabold text-center cursor-not-allowed opacity-60 select-none"
                >
                  Edit
                </button>
              </div>
            </div>
          </motion.div>
        ))}

      </div>

      {/* Saved Quotations List Drawer Modal */}
      <AnimatePresence>
        {showQuotationsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 shrink-0">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Your Saved Quotations ({quotations.length} / 10)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    All created quotations are automatically saved to your account.
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

              <div className="relative shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Search quotation..."
                  value={quotationSearch}
                  onChange={(e) => setQuotationSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

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
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 flex items-center justify-between gap-3 hover:border-indigo-300 transition-all"
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
                          <span className="text-xs font-black text-slate-900 dark:text-white hidden sm:inline">
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
                <span className="text-[11px] text-slate-400 font-medium">Limit: Max 10 saved quotations</span>
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

      <MasterMediaModal 
        isOpen={showGalleryModal} 
        onClose={() => setShowGalleryModal(false)} 
        userId={userId} 
      />

    </div>
  );
}
