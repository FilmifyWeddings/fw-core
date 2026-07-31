'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Play, Plus, Lock, FileText, Image as ImageIcon, Folder, 
  ChevronRight, ExternalLink, Download, Copy, Sparkles, Eye, 
  Upload, HardDrive, CheckCircle2, ArrowRight, HelpCircle, Star
} from 'lucide-react';

export default function WorkspaceQuotationsGalleryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [showTutorialModal, setShowTutorialModal] = useState(false);

  // Unlocked / Active Designs
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

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#070708] text-slate-800 dark:text-zinc-100 p-4 lg:p-8 space-y-6">
      
      {/* ── 1. Page Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Quotation Designs
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 dark:text-zinc-400 mt-1 max-w-2xl font-normal leading-relaxed">
            Your quotation as the couple sees it — cover photo, about you, the shoot, the price, the timelines. 
            Pick a design, edit the words, drop in your photos.
          </p>
        </div>
      </div>

      {/* ── 2. Tutorial Banner ───────────────────────────────────────────────────────── */}
      <div 
        onClick={() => setShowTutorialModal(true)}
        className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#FAF3E0] via-[#FFF9EE] to-[#FAF3E0] dark:from-amber-950/30 dark:via-zinc-900 dark:to-amber-950/20 border border-[#E9D7B8] dark:border-amber-900/40 p-4 lg:p-5 cursor-pointer shadow-sm hover:shadow-md transition-all"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#B88E4C] text-white flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
            <Play className="w-6 h-6 fill-white ml-0.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm lg:text-base font-bold text-[#5C451D] dark:text-amber-200 tracking-tight">
                How to edit - पूरा tutorial देखें
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E6CF9D] text-[#4A3716] dark:bg-amber-900/60 dark:text-amber-300">
                1 Min Guide
              </span>
            </div>
            <p className="text-xs text-[#8A6D3A] dark:text-amber-400/80 font-medium mt-0.5">
              Photo upload · design edit · export · link copy · WhatsApp send · 1 minute
            </p>
          </div>
          <div className="self-start sm:self-center">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#8A6D3A] dark:text-amber-300 group-hover:translate-x-1 transition-transform">
              Watch Now <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Free Plan Quota Bar ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 p-5 space-y-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800/80 pb-4">
          {/* Plan badge & metrics */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                Free Plan
              </span>
            </div>

            {/* Designs meter */}
            <div className="space-y-1 min-w-[120px]">
              <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                <span>Designs</span>
                <span className="text-rose-600 dark:text-rose-400 font-extrabold">10 / 2</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full w-full" />
              </div>
            </div>

            {/* Photos meter */}
            <div className="space-y-1 min-w-[120px]">
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                <span>Photos</span>
                <span>4 / 10</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-slate-800 dark:bg-zinc-300 rounded-full w-[40%]" />
              </div>
            </div>

            {/* Gallery space meter */}
            <div className="space-y-1 min-w-[140px]">
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                <span>Gallery space</span>
                <span>1.7 MB / 25 MB</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-slate-800 dark:bg-zinc-300 rounded-full w-[10%]" />
              </div>
            </div>

            {/* Quotations meter */}
            <div className="space-y-1 min-w-[120px]">
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                <span>Quotations</span>
                <span>0 / 2</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-slate-300 dark:bg-zinc-700 rounded-full w-0" />
              </div>
            </div>
          </div>

          {/* Upgrade Button */}
          <div>
            <button 
              type="button"
              onClick={() => router.push('/pricing')}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#B88E4C] to-[#8A6D3A] text-white font-bold text-xs shadow-md hover:opacity-95 transition-all"
            >
              Upgrade
            </button>
          </div>
        </div>

        {/* Feature Badges List */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {[
            'PDF Download',
            'Advanced Lead Forms',
            'Unlimited Quotations',
            'Unlimited Team Members',
            'Full Photo Gallery',
            'More Video Clips'
          ].map(feature => (
            <span 
              key={feature} 
              className="px-3 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>

      {/* ── 4. Photo Upload Banner ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-[#FAF6F0] dark:bg-amber-950/20 border border-[#EBE1D3] dark:border-amber-900/30 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <h3 className="text-sm lg:text-base font-bold text-[#5C451D] dark:text-amber-200">
            फोटो तैयार रखें
          </h3>
          <p className="text-xs text-[#8A6D3A] dark:text-amber-400/80 font-medium">
            अपनी फोटोज़ तैयार रखें, कम से कम 4-10 फोटोज़ अपलोड करें ताकि आप सुंदर डिज़ाइन बना सकें।
          </p>
          <span className="inline-block text-[11px] font-bold text-slate-500 dark:text-zinc-400 pt-1">
            4 photos ready
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button 
            type="button"
            className="px-4 py-2 rounded-xl bg-[#B88E4C] hover:bg-[#A07A3E] text-white font-bold text-xs shadow-sm transition-all"
          >
            गैलरी देखें
          </button>
          <button 
            type="button"
            className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-zinc-700/60 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            फोटो जोड़ें
          </button>
        </div>
      </div>

      {/* ── 5. Storage Stats Widget (Screenshot 0 layout) ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Documents Card */}
        <div className="rounded-2xl bg-[#EEF2FF] dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-indigo-900/60 flex items-center justify-center shadow-sm">
              <Folder className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-slate-400 text-xs font-bold">•••</span>
          </div>
          <div>
            <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">Documents</span>
            <h4 className="text-xl font-black text-slate-900 dark:text-white">640 Files</h4>
          </div>
          <div className="space-y-1">
            <div className="h-2 w-full bg-indigo-200 dark:bg-indigo-900/60 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full w-[49%]" />
            </div>
            <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-zinc-400">
              <span>24.5 GB</span>
              <span>50 GB</span>
            </div>
          </div>
          <div className="pt-2 border-t border-indigo-200/50 dark:border-indigo-900/40 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-zinc-200 cursor-pointer hover:text-indigo-600">
            <span>View</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Images Card */}
        <div className="rounded-2xl bg-[#FDF2F8] dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-pink-900/60 flex items-center justify-center shadow-sm">
              <ImageIcon className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            </div>
            <span className="text-slate-400 text-xs font-bold">•••</span>
          </div>
          <div>
            <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">Images</span>
            <h4 className="text-xl font-black text-slate-900 dark:text-white">1250 Files</h4>
          </div>
          <div className="space-y-1">
            <div className="h-2 w-full bg-pink-200 dark:bg-pink-900/60 rounded-full overflow-hidden">
              <div className="h-full bg-pink-500 rounded-full w-[65%]" />
            </div>
            <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-zinc-400">
              <span>32.5 GB</span>
              <span>50 GB</span>
            </div>
          </div>
          <div className="pt-2 border-t border-pink-200/50 dark:border-pink-900/40 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-zinc-200 cursor-pointer hover:text-pink-600">
            <span>View</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ── 6. Your Designs Header & New Design Button ─────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg lg:text-xl font-extrabold text-slate-900 dark:text-white">
            Your Designs <span className="text-slate-400 font-normal">(10)</span>
          </h2>
        </div>

        <button 
          type="button"
          onClick={() => router.push('/workspace/quotations/builder/templet/1')}
          className="px-4 py-2 rounded-xl bg-[#B88E4C] hover:bg-[#A07A3E] text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          New Design
        </button>
      </div>

      {/* ── 7. Designs Grid ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Active Unlocked Designs (1st Quotation & 2nd Quotation) */}
        {activeDesigns.map((design, idx) => (
          <div 
            key={design.id}
            className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div>
              {/* Cover Image */}
              <div className="relative h-36 w-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                <img 
                  src={design.coverImage} 
                  alt={design.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[9px] font-bold">
                  {design.badge}
                </span>
              </div>

              {/* Title & Info */}
              <div className="p-3 space-y-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {design.title}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
                  {design.subtitle}
                </p>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-3 pt-0 space-y-2">
              {/* Secondary Row Buttons */}
              <div className="grid grid-cols-3 gap-1">
                <button 
                  type="button"
                  onClick={() => router.push(design.editUrl)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-[10px] font-bold transition-all text-center"
                >
                  Preview
                </button>
                <button 
                  type="button"
                  onClick={() => alert('Downloading PDF preview...')}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-[10px] font-bold transition-all text-center"
                >
                  PDF
                </button>
                <button 
                  type="button"
                  onClick={() => alert('Duplicated quotation design!')}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-[10px] font-bold transition-all text-center"
                >
                  Duplicate
                </button>
              </div>

              {/* Primary Row Buttons (Use For A Lead & EDIT) */}
              <div className="grid grid-cols-2 gap-1.5">
                <button 
                  type="button"
                  onClick={() => router.push('/leads')}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 text-[11px] font-bold hover:bg-slate-50 dark:hover:bg-zinc-700/60 transition-all text-center"
                >
                  Use For A Lead
                </button>

                {/* 1st Quotation Edit Button -> Opens /workspace/quotations/builder/templet/1 */}
                <Link
                  href={design.editUrl}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-900 dark:text-white text-[11px] font-extrabold transition-all text-center block"
                >
                  Edit
                </Link>
              </div>
            </div>
          </div>
        ))}

        {/* Locked Premium Themes */}
        {lockedDesigns.map(locked => (
          <div 
            key={locked.id}
            className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 flex flex-col justify-between items-center text-center space-y-4 shadow-sm min-h-[240px]"
          >
            {/* Top Title */}
            <div className="space-y-1 w-full">
              <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 leading-tight">
                {locked.title}
              </h4>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                {locked.subtitle}
              </p>
            </div>

            {/* Middle Lock Icon */}
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 dark:text-zinc-500 shadow-inner">
              <Lock className="w-5 h-5" />
            </div>

            {/* Bottom Unlock Button */}
            <button 
              type="button"
              onClick={() => router.push('/pricing')}
              className="w-full py-2 px-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-extrabold text-xs hover:opacity-90 transition-all"
            >
              Unlock - {locked.price}
            </button>
          </div>
        ))}

      </div>

      {/* ── 8. Tutorial Modal ───────────────────────────────────────────────────────── */}
      {showTutorialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-amber-600" />
                How to edit - पूरा tutorial
              </h3>
              <button 
                type="button"
                onClick={() => setShowTutorialModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="aspect-video w-full rounded-xl bg-slate-950 flex items-center justify-center text-white relative overflow-hidden">
              <div className="text-center space-y-2 p-6">
                <Play className="w-12 h-12 text-amber-500 mx-auto fill-amber-500" />
                <p className="text-sm font-bold">Tutorial Video Preview</p>
                <p className="text-xs text-slate-400">
                  Photo upload · design edit · export · link copy · WhatsApp send
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                type="button"
                onClick={() => setShowTutorialModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-xs hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
