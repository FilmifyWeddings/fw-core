'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Sparkles, Save, Upload, Trash2, Plus, Check, Edit3, 
  ArrowLeft, ArrowRight, Eye, Share2, Copy, Percent, DollarSign, 
  Palette, Type, Layout, ShieldCheck, Film, Video, Camera, BookOpen, 
  Calendar, MapPin, Users, AlertCircle, CheckCircle2, ChevronRight, 
  Download, Printer, RefreshCw, X, Layers, ExternalLink, ChevronUp, ChevronDown, Move, Image as ImageIcon, Sliders
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { compressImageClient, uploadMasterImage } from '@/lib/master-image-manager';
import { MasterMediaModal } from '@/components/MasterMediaModal';

// World-Class Premium Luxury Minimal Fonts
const LUXURY_PRIMARY_FONTS = [
  { name: 'Cormorant Garamond (High Fashion)', family: "'Cormorant Garamond', serif" },
  { name: 'Playfair Display (Classic Luxury)', family: "'Playfair Display', serif" },
  { name: 'Bodoni Moda (Vogue Editorial)', family: "'Bodoni Moda', serif" },
  { name: 'Cinzel (Royal Roman)', family: "'Cinzel', serif" },
  { name: 'DM Serif Display (Modern Editorial)', family: "'DM Serif Display', serif" },
  { name: 'Prata (Refined Minimalist)', family: "'Prata', serif" },
  { name: 'Italiana (Italian Couture)', family: "'Italiana', serif" },
  { name: 'Marcellus (Timeless Serif)', family: "'Marcellus', serif" },
];

const LUXURY_SECONDARY_FONTS = [
  { name: 'Plus Jakarta Sans (Ultra Clean)', family: "'Plus Jakarta Sans', sans-serif" },
  { name: 'Montserrat (Architectural Minimal)', family: "'Montserrat', sans-serif" },
  { name: 'Inter (Modern Swiss)', family: "'Inter', sans-serif" },
  { name: 'Outfit (Contemporary Sans)', family: "'Outfit', sans-serif" },
  { name: 'Tenor Sans (Fashion Minimal)', family: "'Tenor Sans', sans-serif" },
  { name: 'Josefin Sans (Geometric Vintage)', family: "'Josefin Sans', sans-serif" },
];

interface UserGalleryImage {
  id?: string;
  url: string;
  file_name?: string;
  file_size?: number;
  compression_quality?: string;
  created_at?: string;
}

// WedGrapher Presets & Full Dynamic State
const DEFAULT_AIRY_PROPOSAL = {
  designName: 'Pre-Wedding – Airy White (Pre-Wedding)',
  eventGroup: 'Pre-Wedding',
  look: 'Airy White (Pre-Wed)',
  primaryFont: "'Cormorant Garamond', serif",
  secondaryFont: "'Plus Jakarta Sans', sans-serif",

  // Section 1: Cover Page State
  cover: {
    groomName: 'YASH',
    brideName: 'TWINKLE',
    eventType: 'Wedding', // Dropdown: Wedding, Pre-Wedding, Destination Wedding, Engagement, Haldi & Sangeet
    sideOption: 'Both Sides', // Dropdown: Both Sides, Groom Side, Bride Side
    locationName: 'MUMBAI', // Manual location text e.g. MUMBAI
    brandName: 'FILMIFY WEDDINGS',
    brandLogoUrl: '', // Optional uploaded logo image (PNG/JPG)
    brandLogoSize: 64, // Logo size slider: 20px to 180px
    photoUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
    photoHeight: 450, // Cover photo height slider: 200px to 800px
    photoWidth: 75, // Cover photo width slider: 30% to 100%
    showPhotoBorder: false, // Frame border toggle: false = no border line around PNG/photo
    frameShape: 'arch' as 'arch' | 'rounded' | 'rectangle',
  },
  
  // Section 2: About Us
  aboutUs: {
    kicker: 'INTRODUCTION',
    heading: 'ABOUT US',
    text: 'Glowwed films strive to capture your love story in the most gracious way possible. All the memories of your event will be hand-picked with precision and made into films & photographs that you can cherish forever',
    signature: 'FOUNDER & DIRECTOR, AS',
    bottomBannerPhoto: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=80',
    bottomBannerHeight: 180, // Single photo height slider
    textAlign: 'Left',
    background: 'Page colour',
  },

  // Section 3: Shoot Details
  shootDetails: {
    kicker: 'WHAT WE DO',
    heading: 'PRE-WEDDING SHOOT',
    rows: [
      { id: '1', label: 'Number of days', value: '1 day photo & video shoot' },
      { id: '2', label: 'Crew', value: '1 photographer + 1 cinematographer' },
      { id: '3', label: 'Sessions', value: '2-3 sessions of 1-1.5 hours each' },
    ],
    textAlign: 'Left',
    background: 'Page colour',
    photo: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80',
    photoHeight: 599,
    staysInFrame: 'Middle',
  },

  // Section 4: What's Included
  whatsIncluded: {
    kicker: 'YOUR PACKAGE',
    heading: 'INCLUDED',
    deliverablesText: '75-80 retouched high-res images\n1 min teaser\n2-3 reels\n1 main film',
    allowClientCustomization: true,
    textAlign: 'Left',
    background: 'Page colour',
    photo: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80',
    photoHeight: 280,
    staysInFrame: 'Middle',
  },

  // Section 5: Price & Payment
  pricePayment: {
    kicker: 'INVESTMENT',
    heading: 'WEDDING GOLD',
    packagePrice: 135000,
    discountPct: 0,
    travel: 0,
    accommodations: 0,
    additionalServices: 0,
    gstPct: 18,
    paymentHeading: 'PAYMENT',
    paymentTerms: '50% booking • 40% post-shoot • 10% on final delivery',
    textAlign: 'Left',
    background: 'Page colour',
  },

  // Section 6: Add-ons Table
  addOnsTable: {
    heading: 'ADD ONS',
    kicker: "EMBRACE YOUR DAY — YOU'RE IN CONTROL",
    rows: [
      { id: 'a1', service: 'Additional photographer', charge: '₹15,000 per day' },
      { id: 'a2', service: 'Additional cinematographer', charge: '₹22,000 per day' },
      { id: 'a3', service: 'Drone pilot', charge: '₹12,000 per day' },
      { id: 'a4', service: 'Pre-wedding session', charge: '₹20,000 per session' },
      { id: 'a5', service: 'Album', charge: '₹550 per page' },
      { id: 'a6', service: 'Instagram reel', charge: '₹2,000 per reel' },
    ],
    textAlign: 'Left',
    background: 'Page colour',
  },

  // Section 7: Delivery Time
  deliveryTime: {
    heading: 'Delivery time',
    photosDelivered: '3-4 weeks',
    filmDelivered: '3-4 weeks',
    smallPrint: "Delivery timelines start from the later of the shoot's last day or the date of final payment.",
    textAlign: 'Left',
    background: 'Page colour',
  },

  // Section 8: Timeline Table
  timelineTable: {
    heading: 'Timeframe for delivery',
    rows: [
      { id: 't1', result: 'Quick edits (20 photos)', timeline: 'On the shoot day', revisions: 'No' },
      { id: 't2', result: 'Edited photos', timeline: 'Twenty-five days', revisions: 'No' },
      { id: 't3', result: 'Teaser / reels', timeline: 'A couple of months', revisions: 'No' },
      { id: 't4', result: 'Full film', timeline: 'Around two months', revisions: 'One cycle within a month' },
    ],
    textAlign: 'Left',
    background: 'Page colour',
  },

  // Section 9: Testimonials
  testimonials: {
    kicker: 'KIND WORDS',
    heading: 'WHAT COUPLES SAY',
    quotes: [
      { id: 'q1', quote: '"We did not notice the team all day. Then we saw the album, and cried."', author: 'ANANYA & ROHAN' },
      { id: 'q2', quote: '"Every photograph looks like a still from a film we would want to watch again."', author: 'MEERA & KABIR' },
    ]
  },

  // Section 10: Terms & Thank You
  termsAndThankYou: {
    termsHeading: 'TERMS',
    termsText: 'Dates are blocked only after the booking advance. Travel and stay outside the city are billed at actuals. Raw files are not shared.',
    thankYouHeading: 'THANK YOU',
    thankYouText: 'We would love to tell your story.',
    studioContact: 'FW Studio • +91 9876543210 • studio@wedgrapher.com',
  }
};

function WedGrapherAiryBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hiddenFileInputRef = useRef<HTMLInputElement>(null);
  
  const [data, setData] = useState(DEFAULT_AIRY_PROPOSAL);
  const [userId, setUserId] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('Saved');
  const [copiedLink, setCopiedLink] = useState(false);
  const [openCard, setOpenCard] = useState<string | null>('cover');

  // Media Gallery Modal State & Compression Quality Modal
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<'low' | 'medium' | 'high'>('high');
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [isCompressingAndUploading, setIsCompressingAndUploading] = useState(false);
  const [activeTargetField, setActiveTargetField] = useState<'coverLogo' | 'coverPhoto' | 'aboutUsBanner' | 'shootPhoto' | 'includedPhoto' | null>(null);

  const [userGalleryObjects, setUserGalleryObjects] = useState<UserGalleryImage[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80',
    'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80',
    'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800&q=80',
    'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80',
  ]);

  // Load User Session & Isolated Saved Proposal
  useEffect(() => {
    async function initUserAndLoadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id || 'demo_user';
        setUserId(currentUserId);

        // 1. Fetch user isolated quotation draft from Supabase
        const { data: qData } = await supabase
          .from('quotations')
          .select('content_json, title')
          .eq('workspace_id', currentUserId)
          .eq('quotation_number', 'FW-2026-001')
          .maybeSingle();

        if (qData?.content_json) {
          setData(qData.content_json);
        } else {
          // Check LocalStorage fallback for this user
          const localSaved = localStorage.getItem(`wg_proposal_draft_${currentUserId}`);
          if (localSaved) {
            try {
              setData(JSON.parse(localSaved));
            } catch {
              // fallback
            }
          }
        }

        // 2. Fetch User Gallery Images strictly isolated for Quotations (exclude WhatsApp Template Media)
        const { data: dbImages } = await supabase
          .from('user_gallery_images')
          .select('*')
          .eq('workspace_id', currentUserId)
          .order('created_at', { ascending: false });

        if (dbImages && dbImages.length > 0) {
          // Strict filtering: filter out any images tagged for whatsapp_templates or uploaded to whatsapp_templates_media bucket
          const quotationOnlyImages = dbImages.filter(img => 
            img.source_module !== 'whatsapp_templates' && 
            !img.url?.includes('whatsapp_templates_media')
          );
          setUserGalleryObjects(quotationOnlyImages as UserGalleryImage[]);
          const fetchedUrls = quotationOnlyImages.map(img => img.url).filter(Boolean);
          setGalleryImages(prev => Array.from(new Set([...fetchedUrls, ...prev])));
        }
      } catch (err) {
        console.warn('Initialization error:', err);
      }
    }
    initUserAndLoadData();
  }, []);

  // REAL-TIME AUTO-SAVE (Debounced 1000ms - User Isolated)
  useEffect(() => {
    if (!userId) return;

    setAutoSaveStatus('Saving...');
    setHasUnsavedChanges(true);

    const timer = setTimeout(async () => {
      try {
        localStorage.setItem(`wg_proposal_draft_${userId}`, JSON.stringify(data));
        
        // Calculate totals dynamically
        const subtotal = data.pricePayment.packagePrice;
        const discountAmt = (subtotal * data.pricePayment.discountPct) / 100;
        const discountedSubtotal = subtotal - discountAmt;
        const gstAmt = (discountedSubtotal * data.pricePayment.gstPct) / 100;
        const grandTotal = Math.round(discountedSubtotal + gstAmt);

        // Auto-save to Supabase isolated workspace
        await supabase.from('quotations').upsert({
          workspace_id: userId,
          quotation_number: 'FW-2026-001',
          title: data.designName,
          client_name: `${data.cover.groomName} & ${data.cover.brideName}`,
          content_json: data,
          financials: { total_amount: grandTotal, subtotal, gst_rate: data.pricePayment.gstPct },
          status: 'draft',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id,quotation_number' });

        setHasUnsavedChanges(false);
        setAutoSaveStatus('Auto-saved');
      } catch (err) {
        setAutoSaveStatus('Saved locally');
        setHasUnsavedChanges(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [data, userId]);

  // Open Media Library Modal for a specific section
  const openAddImageModal = (target: 'coverLogo' | 'coverPhoto' | 'aboutUsBanner' | 'shootPhoto' | 'includedPhoto') => {
    setActiveTargetField(target);
    setMediaModalOpen(true);
  };

  // Select an image from Gallery
  const handleSelectImageFromGallery = (url: string) => {
    if (!activeTargetField) return;

    if (activeTargetField === 'coverLogo') {
      setData(prev => ({ ...prev, cover: { ...prev.cover, brandLogoUrl: url } }));
    } else if (activeTargetField === 'coverPhoto') {
      setData(prev => ({ ...prev, cover: { ...prev.cover, photoUrl: url } }));
    } else if (activeTargetField === 'aboutUsBanner') {
      setData(prev => ({ ...prev, aboutUs: { ...prev.aboutUs, bottomBannerPhoto: url } }));
    } else if (activeTargetField === 'shootPhoto') {
      setData(prev => ({ ...prev, shootDetails: { ...prev.shootDetails, photo: url } }));
    } else if (activeTargetField === 'includedPhoto') {
      setData(prev => ({ ...prev, whatsIncluded: { ...prev.whatsIncluded, photo: url } }));
    }

    setMediaModalOpen(false);
  };

  // Check Storage Limits (Max 30 MB / 10 images) & Trigger Quality Modal
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check count limit (Max 10 images)
    if (userGalleryObjects.length >= 10) {
      alert('Storage Limit Reached: You have reached the maximum 10 gallery images limit.');
      return;
    }

    // Check size limit (30 MB max total)
    const currentBytes = userGalleryObjects.reduce((acc, img) => acc + (img.file_size || 0), 0);
    if (currentBytes + file.size > 30 * 1024 * 1024) {
      alert('Storage Limit Reached: Uploading this file exceeds your 30 MB storage limit.');
      return;
    }

    setPendingUploadFile(file);
    setShowQualityModal(true);
  };

  // Confirm Compressed Upload with Master Image Manager
  const startCompressedUpload = async () => {
    if (!pendingUploadFile || !activeTargetField) return;

    setIsCompressingAndUploading(true);

    try {
      let qualityFactor = 0.88;
      let maxDim = 2048;

      if (selectedQuality === 'low') {
        qualityFactor = 0.60;
        maxDim = 1024;
      } else if (selectedQuality === 'medium') {
        qualityFactor = 0.75;
        maxDim = 1600;
      }

      // 1. Client-side WebP compression
      const compressedFile = await compressImageClient(pendingUploadFile, {
        maxWidth: maxDim,
        maxHeight: maxDim,
        quality: qualityFactor,
      });

      // 2. Read as data URL for instant display
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageUrl = event.target?.result as string;
        if (imageUrl) {
          setGalleryImages(prev => [imageUrl, ...prev]);
          handleSelectImageFromGallery(imageUrl);

          // 3. Sync to Supabase `user_gallery_images` table (Bi-directional sync with /workspace/quotations)
          try {
            await supabase.from('user_gallery_images').insert({
              workspace_id: userId || 'demo_user',
              url: imageUrl,
              file_name: compressedFile.name,
              file_size: compressedFile.size,
              compression_quality: selectedQuality,
            });

            setUserGalleryObjects(prev => [{
              url: imageUrl,
              file_name: compressedFile.name,
              file_size: compressedFile.size,
              compression_quality: selectedQuality,
            }, ...prev]);
          } catch {
            // fallback
          }
        }
        setIsCompressingAndUploading(false);
        setShowQualityModal(false);
        setPendingUploadFile(null);
      };
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      alert('Compression upload failed. Applied default image.');
      setIsCompressingAndUploading(false);
      setShowQualityModal(false);
    }
  };

  // Dynamic Theme Colors based on Look Selection
  const isGold = data.look.toLowerCase().includes('gold');
  const isDark = data.look.toLowerCase().includes('dark');

  const pageBgColor = isGold ? '#FFF8EA' : isDark ? '#141622' : '#FFFFFF';
  const textColor = isGold ? '#8A6D2F' : isDark ? '#F3F4F6' : '#27272A';
  const kickerColor = isGold ? '#8A6D2F' : isDark ? '#E5C365' : '#A1A1AA';
  const borderColor = isGold ? 'rgba(138, 109, 47, 0.25)' : isDark ? '#232634' : 'rgba(228, 228, 231, 1)';
  const boxBgColor = isGold ? 'rgba(138, 109, 47, 0.08)' : isDark ? '#0F1017' : 'rgba(244, 244, 245, 1)';
  const photoBorderColor = isGold ? 'rgba(138, 109, 47, 0.3)' : isDark ? '#232634' : 'rgba(228, 228, 231, 1)';

  // Calculate totals dynamically
  const subtotal = data.pricePayment.packagePrice;
  const discountAmt = (subtotal * data.pricePayment.discountPct) / 100;
  const discountedSubtotal = subtotal - discountAmt;
  const gstAmt = (discountedSubtotal * data.pricePayment.gstPct) / 100;
  const grandTotal = Math.round(discountedSubtotal + gstAmt);

  const handleManualSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem(`wg_proposal_draft_${userId}`, JSON.stringify(data));

      await supabase.from('quotations').upsert({
        workspace_id: userId || 'demo_user',
        quotation_number: 'FW-2026-001',
        title: data.designName,
        client_name: `${data.cover.groomName} & ${data.cover.brideName}`,
        content_json: data,
        financials: { total_amount: grandTotal, subtotal, gst_rate: data.pricePayment.gstPct },
        status: 'draft',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,quotation_number' });

      setHasUnsavedChanges(false);
      setAutoSaveStatus('Saved');
      alert('Quotation proposal saved to your workspace!');
    } catch {
      alert('Saved locally!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#EBECEF] text-zinc-900 font-sans flex flex-col overflow-hidden selection:bg-black selection:text-white">
      
      {/* Print PDF Custom Styles (Fixes Browser Print & Hides Viewport Controls) */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
          }
          header, aside, .no-print, button, nav {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            background: transparent !important;
            overflow: visible !important;
          }
          .proposal-document-canvas {
            max-width: 100% !important;
            width: 100% !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 2.5rem !important;
            border: none !important;
            page-break-after: always;
          }
        }
      `}</style>

      {/* ── TOP HEADER BAR (WedGrapher Light Header - Hidden in PDF Print) ── */}
      <header className="h-12 bg-white border-b border-zinc-200 px-5 flex items-center justify-between shrink-0 z-50 shadow-xs no-print">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={data.designName}
            onChange={(e) => { setData({ ...data, designName: e.target.value }); }}
            className="text-xs font-bold text-zinc-900 bg-transparent focus:outline-none focus:border-b border-black py-0.5"
          />
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
            hasUnsavedChanges ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
          }`}>
            {autoSaveStatus}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/p/quotation/demo_token`}
            target="_blank"
            className="px-3 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-bold transition-all flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </Link>

          <button
            onClick={() => window.print()}
            className="px-3 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-amber-700" /> Clean PDF
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setCopiedLink(true);
              setTimeout(() => setCopiedLink(false), 2000);
            }}
            className="px-3 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" /> {copiedLink ? 'Copied!' : 'Send'}
          </button>

          <button
            onClick={handleManualSave}
            disabled={saving}
            className="px-4 py-1 rounded-full bg-black hover:bg-zinc-800 text-white text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" /> {saving ? 'Saving...' : 'Save'}
          </button>

          <Link
            href="/workspace/quotations"
            className="p-1 rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors ml-2"
            title="Close Editor"
          >
            <X className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* ── MAIN WORKSPACE VIEWPORT ── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ───────────────────────────────────────────────────────────── */}
        {/* LEFT CONTROL SIDEBAR PANEL (Hidden in PDF Print)               */}
        {/* ───────────────────────────────────────────────────────────── */}
        <aside className="w-[320px] bg-white border-r border-zinc-200 p-4 overflow-y-auto space-y-5 shrink-0 text-xs shadow-sm no-print">
          
          {/* Top Inputs & Typography Customizer */}
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Design name</label>
              <input
                type="text"
                value={data.designName}
                onChange={(e) => setData({ ...data, designName: e.target.value })}
                className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 font-medium text-zinc-900 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Event type</label>
                <select
                  value={data.eventGroup}
                  onChange={(e) => setData({ ...data, eventGroup: e.target.value })}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 font-medium text-zinc-900 focus:outline-none"
                >
                  <option value="Pre-Wedding">Pre-Wedding</option>
                  <option value="Wedding Gold">Wedding Gold</option>
                  <option value="Destination">Destination</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-amber-700 mb-1">Look</label>
                <select
                  value={data.look}
                  onChange={(e) => setData({ ...data, look: e.target.value })}
                  className="w-full p-2 rounded-xl bg-amber-50/60 border border-amber-200 font-bold text-amber-900 focus:outline-none"
                >
                  <option value="Airy White (Pre-Wed)">Airy White (Pre-Wed)</option>
                  <option value="Royal Gold (Classic)">Royal Gold (Classic)</option>
                  <option value="Golden Luxe">Golden Luxe (#FFF8EA / #8A6D2F)</option>
                  <option value="Dark Studio">Dark Studio</option>
                </select>
              </div>
            </div>

            {/* Typography Customizers: Main Font & Sub Font Dropdowns */}
            <div className="space-y-2 pt-2 border-t border-zinc-100">
              <span className="text-[10px] uppercase font-bold text-purple-700 flex items-center gap-1">
                <Type className="w-3 h-3" /> Premium Typography Fonts
              </span>

              <div>
                <label className="block text-[9px] font-bold text-zinc-500 mb-1">Main Font (Headings & Names)</label>
                <select
                  value={data.primaryFont}
                  onChange={(e) => setData({ ...data, primaryFont: e.target.value })}
                  className="w-full p-2 rounded-xl bg-purple-50/40 border border-purple-200 font-bold text-purple-950 focus:outline-none"
                >
                  {LUXURY_PRIMARY_FONTS.map(f => (
                    <option key={f.family} value={f.family}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-zinc-500 mb-1">Sub Font (Body Text & Tables)</label>
                <select
                  value={data.secondaryFont}
                  onChange={(e) => setData({ ...data, secondaryFont: e.target.value })}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 font-medium text-zinc-900 focus:outline-none"
                >
                  {LUXURY_SECONDARY_FONTS.map(f => (
                    <option key={f.family} value={f.family}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Section Tags Header */}
          <div className="space-y-2 pt-3 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">PAGES — DRAG TO REORDER</span>
              <button 
                onClick={() => alert('New page section added!')}
                className="text-[10px] font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-full hover:bg-zinc-200"
              >
                + Add Page
              </button>
            </div>

            <div className="flex flex-wrap gap-1 text-[10px] font-semibold text-zinc-500">
              {['Cover', 'About us', 'Shoot details', 'What\'s included', 'Price & payment', 'Add-ons table', 'Delivery time', 'Timeline table', 'Testimonials', 'Terms'].map(t => (
                <span key={t} className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Collapsible Section Accordion Cards */}
          <div className="space-y-2.5 pt-2 border-t border-zinc-100">
            
            {/* 1. COVER PAGE CARD */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
              <div 
                onClick={() => setOpenCard(openCard === 'cover' ? null : 'cover')}
                className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-zinc-500" />
                  <span>1. Cover Page</span>
                </div>
                {openCard === 'cover' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>

              {openCard === 'cover' && (
                <div className="p-3 space-y-3 bg-white">
                  
                  {/* Couple Names (Groom & Bride) */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">Couple Names</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-zinc-400">Groom Name</label>
                        <input
                          type="text"
                          value={data.cover.groomName}
                          placeholder="e.g. YASH"
                          onChange={(e) => setData({ ...data, cover: { ...data.cover, groomName: e.target.value } })}
                          className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-zinc-400">Bride Name</label>
                        <input
                          type="text"
                          value={data.cover.brideName}
                          placeholder="e.g. TWINKLE"
                          onChange={(e) => setData({ ...data, cover: { ...data.cover, brideName: e.target.value } })}
                          className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Event Type Dropdown + Auto "QUOTATION" */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-zinc-400">Event Type (Auto + QUOTATION)</label>
                    <select
                      value={data.cover.eventType}
                      onChange={(e) => setData({ ...data, cover: { ...data.cover, eventType: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold"
                    >
                      <option value="Wedding">Wedding</option>
                      <option value="Pre-Wedding">Pre-Wedding</option>
                      <option value="Destination Wedding">Destination Wedding</option>
                      <option value="Engagement">Engagement</option>
                      <option value="Haldi & Sangeet">Haldi & Sangeet</option>
                    </select>
                  </div>

                  {/* Subtitle / Side & Location Controls */}
                  <div className="space-y-2 pt-2 border-t border-zinc-100">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Side & Location</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-zinc-400 mb-1">Side Option</label>
                        <select
                          value={data.cover.sideOption || 'Both Sides'}
                          onChange={(e) => setData({ ...data, cover: { ...data.cover, sideOption: e.target.value } })}
                          className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold"
                        >
                          <option value="Both Sides">Both Sides</option>
                          <option value="Groom Side">Groom Side</option>
                          <option value="Bride Side">Bride Side</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-zinc-400 mb-1">Location</label>
                        <input
                          type="text"
                          value={data.cover.locationName || 'MUMBAI'}
                          placeholder="e.g. MUMBAI"
                          onChange={(e) => setData({ ...data, cover: { ...data.cover, locationName: e.target.value } })}
                          className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Brand Name & Brand Logo Add Image + Thumbnail & Delete */}
                  <div className="space-y-2 pt-2 border-t border-zinc-100">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Brand Name & Logo</span>
                    <input
                      type="text"
                      value={data.cover.brandName}
                      placeholder="Brand Name (e.g. FILMIFY WEDDINGS)"
                      onChange={(e) => setData({ ...data, cover: { ...data.cover, brandName: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold"
                    />

                    {/* Logo Image Controls with Thumbnail Preview & Delete Button */}
                    <div className="flex items-center gap-2">
                      {data.cover.brandLogoUrl && (
                        <div className="w-9 h-9 rounded-xl border border-zinc-200 overflow-hidden bg-zinc-50 shrink-0 shadow-2xs">
                          <img src={data.cover.brandLogoUrl} alt="Logo" className="w-full h-full object-contain bg-transparent" />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => openAddImageModal('coverLogo')}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-amber-700" />
                        <span>{data.cover.brandLogoUrl ? 'Change Logo' : 'Add Image'}</span>
                      </button>

                      {data.cover.brandLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setData({ ...data, cover: { ...data.cover, brandLogoUrl: '' } })}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer shrink-0"
                          title="Delete Logo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Logo Size Resizer Slider */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold">
                        <span>Logo Size</span>
                        <span>{data.cover.brandLogoSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="180"
                        value={data.cover.brandLogoSize}
                        onChange={(e) => setData({ ...data, cover: { ...data.cover, brandLogoSize: Number(e.target.value) } })}
                        className="w-full accent-black cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Cover Photo Add Image + Thumbnail Preview & Delete + Border Line Toggle */}
                  <div className="space-y-2 pt-2 border-t border-zinc-100">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Cover Photo & Frame</span>
                    
                    {/* Cover Photo Controls with Thumbnail & Delete Button */}
                    <div className="flex items-center gap-2">
                      {data.cover.photoUrl && (
                        <div className="w-9 h-9 rounded-xl border border-zinc-200 overflow-hidden bg-zinc-50 shrink-0 shadow-2xs">
                          <img src={data.cover.photoUrl} alt="Cover" className="w-full h-full object-cover bg-transparent" />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => openAddImageModal('coverPhoto')}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-amber-700" />
                        <span>{data.cover.photoUrl ? 'Change Photo' : 'Add Image'}</span>
                      </button>

                      {data.cover.photoUrl && (
                        <button
                          type="button"
                          onClick={() => setData({ ...data, cover: { ...data.cover, photoUrl: '' } })}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer shrink-0"
                          title="Delete Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Photo Height Resizer Slider */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold">
                        <span>Photo Height</span>
                        <span>{data.cover.photoHeight}px</span>
                      </div>
                      <input
                        type="range"
                        min="200"
                        max="800"
                        value={data.cover.photoHeight}
                        onChange={(e) => setData({ ...data, cover: { ...data.cover, photoHeight: Number(e.target.value) } })}
                        className="w-full accent-black cursor-pointer"
                      />
                    </div>

                    {/* Photo Frame Shape Buttons */}
                    <div>
                      <span className="block text-[9px] font-bold text-zinc-400 mb-1">Frame Shape</span>
                      <div className="flex items-center gap-1">
                        {[
                          { id: 'arch', label: 'Arch ⋂' },
                          { id: 'rounded', label: 'Rounded ▢' },
                          { id: 'rectangle', label: 'Rectangle ▭' },
                        ].map(shape => (
                          <button
                            key={shape.id}
                            type="button"
                            onClick={() => setData({ ...data, cover: { ...data.cover, frameShape: shape.id as any } })}
                            className={`flex-1 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                              data.cover.frameShape === shape.id
                                ? 'bg-black text-white border-black'
                                : 'bg-zinc-50 text-zinc-700 border-zinc-200'
                            }`}
                          >
                            {shape.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Frame Outline Border Line Toggle (Fix for PNG Arch Border) */}
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-600">Arch Border Line</span>
                      <button
                        type="button"
                        onClick={() => setData({ ...data, cover: { ...data.cover, showPhotoBorder: !data.cover.showPhotoBorder } })}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all border ${
                          data.cover.showPhotoBorder
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-zinc-100 text-zinc-600 border-zinc-300'
                        }`}
                      >
                        {data.cover.showPhotoBorder ? 'Border ON' : 'Border OFF (No Line)'}
                      </button>
                    </div>

                  </div>

                </div>
              )}
            </div>

            {/* 2. About us Card */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
              <div 
                onClick={() => setOpenCard(openCard === 'about' ? null : 'about')}
                className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
                  <span>2. About us</span>
                </div>
                {openCard === 'about' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>

              {openCard === 'about' && (
                <div className="p-3 space-y-3 bg-white">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Kicker</label>
                    <input
                      type="text"
                      value={data.aboutUs.kicker}
                      onChange={(e) => setData({ ...data, aboutUs: { ...data.aboutUs, kicker: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Heading</label>
                    <input
                      type="text"
                      value={data.aboutUs.heading}
                      onChange={(e) => setData({ ...data, aboutUs: { ...data.aboutUs, heading: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Text</label>
                    <textarea
                      rows={3}
                      value={data.aboutUs.text}
                      onChange={(e) => setData({ ...data, aboutUs: { ...data.aboutUs, text: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Signature line</label>
                    <input
                      type="text"
                      value={data.aboutUs.signature}
                      onChange={(e) => setData({ ...data, aboutUs: { ...data.aboutUs, signature: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium"
                    />
                  </div>

                  {/* About Us Bottom Banner Photo Control with Thumbnail & Delete */}
                  <div className="space-y-2 pt-2 border-t border-zinc-100">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">Bottom Banner Image (15% Full Bleed)</span>
                    
                    <div className="flex items-center gap-2">
                      {data.aboutUs.bottomBannerPhoto && (
                        <div className="w-9 h-9 rounded-xl border border-zinc-200 overflow-hidden bg-zinc-50 shrink-0 shadow-2xs">
                          <img src={data.aboutUs.bottomBannerPhoto} alt="Banner" className="w-full h-full object-cover bg-transparent" />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => openAddImageModal('aboutUsBanner')}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-amber-700" />
                        <span>{data.aboutUs.bottomBannerPhoto ? 'Change Banner' : 'Add Image'}</span>
                      </button>

                      {data.aboutUs.bottomBannerPhoto && (
                        <button
                          type="button"
                          onClick={() => setData({ ...data, aboutUs: { ...data.aboutUs, bottomBannerPhoto: '' } })}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer shrink-0"
                          title="Delete Banner"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold">
                        <span>Banner Height</span>
                        <span>{data.aboutUs.bottomBannerHeight}px</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="300"
                        value={data.aboutUs.bottomBannerHeight}
                        onChange={(e) => setData({ ...data, aboutUs: { ...data.aboutUs, bottomBannerHeight: Number(e.target.value) } })}
                        className="w-full accent-black cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Shoot details Card */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
              <div 
                onClick={() => setOpenCard(openCard === 'shoot' ? null : 'shoot')}
                className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5 text-zinc-500" />
                  <span>3. Shoot details</span>
                </div>
                {openCard === 'shoot' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>

              {openCard === 'shoot' && (
                <div className="p-3 space-y-3 bg-white">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Kicker</label>
                    <input
                      type="text"
                      value={data.shootDetails.kicker}
                      onChange={(e) => setData({ ...data, shootDetails: { ...data.shootDetails, kicker: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Heading</label>
                    <input
                      type="text"
                      value={data.shootDetails.heading}
                      onChange={(e) => setData({ ...data, shootDetails: { ...data.shootDetails, heading: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium"
                    />
                  </div>

                  {/* Rows Editor */}
                  <div className="space-y-2 pt-2 border-t border-zinc-100">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Rows</span>
                    {data.shootDetails.rows.map((row, idx) => (
                      <div key={row.id} className="p-2 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1 relative">
                        <input
                          type="text"
                          value={row.label}
                          onChange={(e) => {
                            const newRows = [...data.shootDetails.rows];
                            newRows[idx].label = e.target.value;
                            setData({ ...data, shootDetails: { ...data.shootDetails, rows: newRows } });
                          }}
                          className="w-full p-1 bg-white rounded border border-zinc-200 text-[11px] font-bold text-zinc-900"
                        />
                        <input
                          type="text"
                          value={row.value}
                          onChange={(e) => {
                            const newRows = [...data.shootDetails.rows];
                            newRows[idx].value = e.target.value;
                            setData({ ...data, shootDetails: { ...data.shootDetails, rows: newRows } });
                          }}
                          className="w-full p-1 bg-white rounded border border-zinc-200 text-[11px] text-zinc-700"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-zinc-100 space-y-2">
                    <div className="flex items-center gap-2">
                      {data.shootDetails.photo && (
                        <div className="w-9 h-9 rounded-xl border border-zinc-200 overflow-hidden bg-zinc-50 shrink-0 shadow-2xs">
                          <img src={data.shootDetails.photo} alt="Shoot" className="w-full h-full object-cover bg-transparent" />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => openAddImageModal('shootPhoto')}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-amber-700" />
                        <span>{data.shootDetails.photo ? 'Change Photo' : 'Add Image'}</span>
                      </button>

                      {data.shootDetails.photo && (
                        <button
                          type="button"
                          onClick={() => setData({ ...data, shootDetails: { ...data.shootDetails, photo: '' } })}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer shrink-0"
                          title="Delete Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold">
                        <span>Photo Height ({data.shootDetails.photoHeight}px)</span>
                      </div>
                      <input
                        type="range"
                        min="200"
                        max="800"
                        value={data.shootDetails.photoHeight}
                        onChange={(e) => setData({ ...data, shootDetails: { ...data.shootDetails, photoHeight: Number(e.target.value) } })}
                        className="w-full accent-black cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. What's included Card */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
              <div 
                onClick={() => setOpenCard(openCard === 'included' ? null : 'included')}
                className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
                  <span>4. What's included</span>
                </div>
                {openCard === 'included' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>

              {openCard === 'included' && (
                <div className="p-3 space-y-3 bg-white">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Heading</label>
                    <input
                      type="text"
                      value={data.whatsIncluded.heading}
                      onChange={(e) => setData({ ...data, whatsIncluded: { ...data.whatsIncluded, heading: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Deliverables List</label>
                    <textarea
                      rows={4}
                      value={data.whatsIncluded.deliverablesText}
                      onChange={(e) => setData({ ...data, whatsIncluded: { ...data.whatsIncluded, deliverablesText: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium resize-none"
                    />
                  </div>

                  <div className="pt-2 border-t border-zinc-100 space-y-2">
                    <div className="flex items-center gap-2">
                      {data.whatsIncluded.photo && (
                        <div className="w-9 h-9 rounded-xl border border-zinc-200 overflow-hidden bg-zinc-50 shrink-0 shadow-2xs">
                          <img src={data.whatsIncluded.photo} alt="Included" className="w-full h-full object-cover bg-transparent" />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => openAddImageModal('includedPhoto')}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-amber-700" />
                        <span>{data.whatsIncluded.photo ? 'Change Photo' : 'Add Image'}</span>
                      </button>

                      {data.whatsIncluded.photo && (
                        <button
                          type="button"
                          onClick={() => setData({ ...data, whatsIncluded: { ...data.whatsIncluded, photo: '' } })}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer shrink-0"
                          title="Delete Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold">
                        <span>Photo Height ({data.whatsIncluded.photoHeight}px)</span>
                      </div>
                      <input
                        type="range"
                        min="150"
                        max="600"
                        value={data.whatsIncluded.photoHeight}
                        onChange={(e) => setData({ ...data, whatsIncluded: { ...data.whatsIncluded, photoHeight: Number(e.target.value) } })}
                        className="w-full accent-black cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Price & payment Card */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
              <div 
                onClick={() => setOpenCard(openCard === 'price' ? null : 'price')}
                className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
                  <span>5. Price & payment</span>
                </div>
                {openCard === 'price' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>

              {openCard === 'price' && (
                <div className="p-3 space-y-3 bg-white">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Package Price (₹)</label>
                    <input
                      type="number"
                      value={data.pricePayment.packagePrice}
                      onChange={(e) => setData({ ...data, pricePayment: { ...data.pricePayment, packagePrice: Number(e.target.value) || 0 } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Discount %</label>
                      <input
                        type="number"
                        value={data.pricePayment.discountPct}
                        onChange={(e) => setData({ ...data, pricePayment: { ...data.pricePayment, discountPct: Number(e.target.value) || 0 } })}
                        className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">GST %</label>
                      <input
                        type="number"
                        value={data.pricePayment.gstPct}
                        onChange={(e) => setData({ ...data, pricePayment: { ...data.pricePayment, gstPct: Number(e.target.value) || 0 } })}
                        className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Payment terms</label>
                    <input
                      type="text"
                      value={data.pricePayment.paymentTerms}
                      onChange={(e) => setData({ ...data, pricePayment: { ...data.pricePayment, paymentTerms: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 6. Add-ons table Card */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
              <div 
                onClick={() => setOpenCard(openCard === 'addons' ? null : 'addons')}
                className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-zinc-500" />
                  <span>6. Add-ons table</span>
                </div>
                {openCard === 'addons' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>

              {openCard === 'addons' && (
                <div className="p-3 space-y-2 bg-white">
                  {data.addOnsTable.rows.map((row, idx) => (
                    <div key={row.id} className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-[11px]">
                      <span className="font-bold">{row.service}</span>
                      <span className="font-mono text-zinc-600">{row.charge}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </aside>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* CENTER LIVE PROPOSAL DOCUMENT CANVAS                          */}
        {/* ───────────────────────────────────────────────────────────── */}
        <main className="flex-1 bg-[#EBECEF] p-6 overflow-y-auto flex justify-center items-start">
          
          {/* Dynamic Theme Centered Document Page (Print A4 Container) */}
          <div 
            className="proposal-document-canvas w-full max-w-[680px] rounded-sm shadow-2xl p-10 sm:p-14 space-y-12 my-4 transition-colors duration-300 relative"
            style={{ 
              backgroundColor: pageBgColor, 
              color: textColor,
              borderColor: borderColor,
              borderWidth: '1px'
            }}
          >
            
            {/* 1. COVER PAGE HERO (EXACT USER SCREENSHOT & TYPOGRAPHY MATCH) */}
            <div className="text-center space-y-6 pt-4">
              
              {/* Couple Names (Groom & Bride - NO "X" as requested) */}
              <div className="space-y-1">
                <h1 
                  className="text-4xl sm:text-5xl tracking-[0.15em] uppercase font-black leading-tight"
                  style={{ color: textColor, fontFamily: data.primaryFont }}
                >
                  {data.cover.groomName || 'YASH'}
                </h1>
                
                {/* Note: NO "X" icon/text as requested: "X hatado nahi chaiye" */}

                <h1 
                  className="text-4xl sm:text-5xl tracking-[0.15em] uppercase font-black leading-tight"
                  style={{ color: textColor, fontFamily: data.primaryFont }}
                >
                  {data.cover.brideName || 'TWINKLE'}
                </h1>
              </div>

              {/* Event Type Quotation & Subtitle (Side + Location) */}
              <div className="space-y-1.5 pt-2">
                <h3 
                  className="text-sm sm:text-base tracking-[0.2em] uppercase font-bold"
                  style={{ color: textColor, fontFamily: data.primaryFont }}
                >
                  {`${(data.cover.eventType || 'WEDDING').toUpperCase()} QUOTATION`}
                </h3>
                <p 
                  className="text-[11px] tracking-[0.15em] uppercase font-medium opacity-85"
                  style={{ color: kickerColor, fontFamily: data.secondaryFont }}
                >
                  {`${(data.cover.sideOption || 'BOTH SIDES').toUpperCase()} – ${(data.cover.locationName || 'MUMBAI').toUpperCase()}`}
                </p>
              </div>

              {/* Brand Logo / Studio Name (Transparent PNG Support) */}
              <div className="pt-2 flex flex-col items-center justify-center bg-transparent">
                {data.cover.brandLogoUrl ? (
                  <img 
                    src={data.cover.brandLogoUrl} 
                    alt={data.cover.brandName}
                    className="bg-transparent object-contain"
                    style={{ height: `${data.cover.brandLogoSize || 64}px` }}
                  />
                ) : (
                  <div className="text-center space-y-0.5">
                    <div className="text-lg sm:text-xl tracking-[0.25em] uppercase font-black" style={{ color: textColor, fontFamily: data.primaryFont }}>
                      {data.cover.brandName || 'FILMIFY WEDDINGS'}
                    </div>
                  </div>
                )}
              </div>

              {/* Cover Photo Frame (Arched / Resizable with Optional Border Line) */}
              <div 
                className={`mx-auto mt-6 overflow-hidden shadow-lg relative transition-all duration-200 ${
                  data.cover.frameShape === 'rounded' ? 'rounded-3xl' :
                  data.cover.frameShape === 'rectangle' ? 'rounded-none' :
                  'rounded-t-[999px] rounded-b-none'
                }`}
                style={{ 
                  width: `${data.cover.photoWidth || 75}%`,
                  height: `${data.cover.photoHeight || 450}px`,
                  borderColor: data.cover.showPhotoBorder ? photoBorderColor : 'transparent', 
                  borderWidth: data.cover.showPhotoBorder ? '1px' : '0px', 
                  backgroundColor: 'transparent' 
                }}
              >
                <img 
                  src={data.cover.photoUrl || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80'} 
                  alt="Wedding Couple"
                  className="w-full h-full object-cover object-center bg-transparent"
                />
              </div>

            </div>

            {/* 2. ABOUT US SECTION (100% PIXEL-PERFECT SVG VECTOR MONOGRAM & BIRDS GRAPHIC) */}
            <div className="pt-10 border-t relative overflow-hidden space-y-6" style={{ borderColor: borderColor }}>
              
              {/* High-Resolution Flying Birds Graphic (Top Right V-Formation) */}
              <div className="absolute top-2 right-2 pointer-events-none opacity-85" style={{ color: kickerColor }}>
                <svg width="180" height="90" viewBox="0 0 180 90" fill="currentColor">
                  <path d="M165,8 C161,5 157,8 153,11 C157,9 161,6 166,8 C170,9 174,12 177,13 C173,12 169,11 165,8 Z" />
                  <path d="M142,18 C137,14 132,18 127,22 C132,19 137,15 143,18 C147,20 152,24 155,26 C151,24 146,22 142,18 Z" />
                  <path d="M150,28 C145,24 140,28 135,32 C140,29 145,25 151,28 C155,30 160,34 163,36 C159,34 154,32 150,28 Z" />
                  <path d="M120,29 C115,25 110,29 105,33 C110,30 115,26 121,29 C125,31 130,35 133,37 C129,35 124,33 120,29 Z" />
                  <path d="M128,39 C123,35 118,39 113,43 C118,40 123,36 129,39 C133,41 138,45 141,47 C137,45 132,43 128,39 Z" />
                  <path d="M102,40 C97,36 92,40 87,44 C92,41 97,37 103,40 C107,42 112,46 115,48 C111,46 106,44 102,40 Z" />
                  <path d="M109,51 C104,47 99,51 94,55 C99,52 104,48 110,51 C114,53 119,57 122,59 C118,57 113,55 109,51 Z" />
                  <path d="M82,52 C77,48 72,52 67,56 C72,53 77,49 83,52 C87,54 92,58 95,60 C91,58 86,56 82,52 Z" />
                  <path d="M62,63 C57,59 52,63 47,67 C52,64 57,60 63,63 C67,65 72,69 75,71 C71,69 66,67 62,63 Z" />
                </svg>
              </div>

              {/* Exact Artistic Layered Monogram Vector (U + A + BOUT + S) */}
              <div className="flex flex-col items-center justify-center pt-6 pb-2 relative select-none">
                <svg width="220" height="140" viewBox="0 0 220 140" fill="currentColor" style={{ color: textColor }}>
                  {/* Giant Serif U (Bottom-Left) */}
                  <text 
                    x="12" 
                    y="112" 
                    fontFamily="'Cormorant Garamond', 'Bodoni Moda', 'Playfair Display', serif" 
                    fontSize="105" 
                    fontWeight="400"
                  >
                    U
                  </text>

                  {/* Giant Serif A (Top-Right - Left leg touches U) */}
                  <text 
                    x="64" 
                    y="68" 
                    fontFamily="'Cormorant Garamond', 'Bodoni Moda', 'Playfair Display', serif" 
                    fontSize="105" 
                    fontWeight="400"
                  >
                    A
                  </text>

                  {/* BOUT (Tracked uppercase, beside top-right leg of A) */}
                  <text 
                    x="132" 
                    y="54" 
                    fontFamily="'Plus Jakarta Sans', sans-serif" 
                    fontSize="12" 
                    letterSpacing="4" 
                    fontWeight="300"
                    opacity="0.9"
                  >
                    BOUT
                  </text>

                  {/* S (Tracked uppercase, inside crotch of U & A) */}
                  <text 
                    x="78" 
                    y="108" 
                    fontFamily="'Plus Jakarta Sans', sans-serif" 
                    fontSize="12" 
                    letterSpacing="4" 
                    fontWeight="300"
                    opacity="0.9"
                  >
                    S
                  </text>
                </svg>
              </div>

              {/* Central Quote Block with Elegant Double Quotation Marks “ ” */}
              <div className="my-6 px-2 sm:px-6 flex items-center justify-center gap-2 sm:gap-4 max-w-xl mx-auto text-center">
                <span 
                  className="text-4xl sm:text-5xl font-serif leading-none select-none shrink-0" 
                  style={{ color: kickerColor }}
                >
                  “
                </span>
                <p 
                  className="text-xs sm:text-sm leading-relaxed font-normal opacity-90 tracking-wide"
                  style={{ color: textColor, fontFamily: data.secondaryFont }}
                >
                  {data.aboutUs.text}
                </p>
                <span 
                  className="text-4xl sm:text-5xl font-serif leading-none select-none shrink-0" 
                  style={{ color: kickerColor }}
                >
                  ”
                </span>
              </div>

              {/* About Us Single Featured Photo (Full Bleed Cut-To-Cut Edge-To-Edge 0 Margin) */}
              {data.aboutUs.bottomBannerPhoto && (
                <div className="-mx-10 sm:-mx-14 -mb-10 sm:-mb-14 pt-4 overflow-hidden">
                  <img 
                    src={data.aboutUs.bottomBannerPhoto} 
                    alt="About Us Full Bleed"
                    className="w-full object-cover object-center bg-transparent rounded-none block shadow-xs"
                    style={{ height: `${data.aboutUs.bottomBannerHeight || 200}px` }}
                  />
                </div>
              )}
            </div>

            {/* 3. SHOOT DETAILS SECTION */}
            <div className="space-y-4 pt-10 border-t text-xs" style={{ borderColor: borderColor }}>
              <span className="text-[9px] tracking-[0.2em] font-bold uppercase block" style={{ color: kickerColor, fontFamily: data.secondaryFont }}>
                {data.shootDetails.kicker}
              </span>
              <h2 className="text-xl uppercase tracking-widest" style={{ color: textColor, fontFamily: data.primaryFont }}>
                {data.shootDetails.heading}
              </h2>

              <div className="space-y-3">
                {data.shootDetails.rows.map(row => (
                  <div key={row.id} className="space-y-0.5 border-b pb-2" style={{ borderColor: borderColor }}>
                    <span className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: kickerColor, fontFamily: data.secondaryFont }}>{row.label}</span>
                    <span className="text-xs font-medium" style={{ color: textColor, fontFamily: data.secondaryFont }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {data.shootDetails.photo && (
                <div className="rounded-2xl overflow-hidden mt-4 shadow-md bg-transparent" style={{ borderColor: photoBorderColor, borderWidth: '1px' }}>
                  <img 
                    src={data.shootDetails.photo} 
                    alt="Pre-Wedding Shoot"
                    className="w-full object-cover object-center bg-transparent"
                    style={{ height: `${data.shootDetails.photoHeight}px` }}
                  />
                </div>
              )}
            </div>

            {/* 4. WHAT'S INCLUDED SECTION */}
            <div className="space-y-4 pt-10 border-t text-xs" style={{ borderColor: borderColor }}>
              <span className="text-[9px] tracking-[0.2em] font-bold uppercase block" style={{ color: kickerColor, fontFamily: data.secondaryFont }}>
                {data.whatsIncluded.kicker}
              </span>
              <h2 className="text-xl uppercase tracking-widest" style={{ color: textColor, fontFamily: data.primaryFont }}>
                {data.whatsIncluded.heading}
              </h2>

              <div className="p-5 rounded-2xl leading-relaxed whitespace-pre-line" style={{ backgroundColor: boxBgColor, borderColor: borderColor, borderWidth: '1px', color: textColor, fontFamily: data.secondaryFont }}>
                {data.whatsIncluded.deliverablesText}
              </div>

              {data.whatsIncluded.photo && (
                <div className="rounded-2xl overflow-hidden mt-4 shadow-md bg-transparent" style={{ borderColor: photoBorderColor, borderWidth: '1px' }}>
                  <img 
                    src={data.whatsIncluded.photo} 
                    alt="Package Deliverables"
                    className="w-full object-cover object-center bg-transparent"
                    style={{ height: `${data.whatsIncluded.photoHeight}px` }}
                  />
                </div>
              )}
            </div>

            {/* 5. PRICE & PAYMENT SECTION */}
            <div className="space-y-6 pt-10 border-t text-xs" style={{ borderColor: borderColor }}>
              <span className="text-[9px] tracking-[0.2em] font-bold uppercase block" style={{ color: kickerColor, fontFamily: data.secondaryFont }}>
                {data.pricePayment.kicker}
              </span>
              <h2 className="text-xl uppercase tracking-widest" style={{ color: textColor, fontFamily: data.primaryFont }}>
                {data.pricePayment.heading}
              </h2>

              <div className="text-3xl font-bold" style={{ color: textColor, fontFamily: data.primaryFont }}>
                ₹{grandTotal.toLocaleString('en-IN')}
              </div>

              <div className="space-y-1 border-t pt-3" style={{ borderColor: borderColor }}>
                <span className="text-[10px] font-bold uppercase block" style={{ color: kickerColor, fontFamily: data.secondaryFont }}>{data.pricePayment.paymentHeading}</span>
                <p className="text-xs" style={{ color: textColor, fontFamily: data.secondaryFont }}>{data.pricePayment.paymentTerms}</p>
              </div>
            </div>

            {/* 6. ADD ONS TABLE */}
            <div className="space-y-4 pt-10 border-t text-xs" style={{ borderColor: borderColor }}>
              <h2 className="text-xl uppercase tracking-widest" style={{ color: textColor, fontFamily: data.primaryFont }}>
                {data.addOnsTable.heading}
              </h2>
              <span className="text-[9px] tracking-[0.2em] font-bold uppercase block" style={{ color: kickerColor, fontFamily: data.secondaryFont }}>
                {data.addOnsTable.kicker}
              </span>

              <div className="rounded-xl overflow-hidden" style={{ borderColor: borderColor, borderWidth: '1px' }}>
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase font-bold border-b" style={{ backgroundColor: boxBgColor, borderColor: borderColor, color: textColor, fontFamily: data.secondaryFont }}>
                    <tr>
                      <th className="py-2.5 px-4">Services</th>
                      <th className="py-2.5 px-4 text-right">Charges</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-medium" style={{ color: textColor, fontFamily: data.secondaryFont }}>
                    {data.addOnsTable.rows.map(row => (
                      <tr key={row.id}>
                        <td className="py-2.5 px-4">{row.service}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold" style={{ color: textColor }}>{row.charge}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 7. DELIVERY TIMEFRAME */}
            <div className="space-y-4 pt-10 border-t text-xs" style={{ borderColor: borderColor }}>
              <h2 className="text-xl uppercase tracking-widest" style={{ color: textColor, fontFamily: data.primaryFont }}>
                {data.deliveryTime.heading}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl" style={{ backgroundColor: boxBgColor, borderColor: borderColor, borderWidth: '1px' }}>
                  <span className="text-[10px] font-bold uppercase block" style={{ color: kickerColor, fontFamily: data.secondaryFont }}>PHOTOS</span>
                  <strong className="text-xs font-bold" style={{ color: textColor, fontFamily: data.secondaryFont }}>{data.deliveryTime.photosDelivered}</strong>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: boxBgColor, borderColor: borderColor, borderWidth: '1px' }}>
                  <span className="text-[10px] font-bold uppercase block" style={{ color: kickerColor, fontFamily: data.secondaryFont }}>TEASER &amp; FILM</span>
                  <strong className="text-xs font-bold" style={{ color: textColor, fontFamily: data.secondaryFont }}>{data.deliveryTime.filmDelivered}</strong>
                </div>
              </div>
              <p className="text-[10px] italic" style={{ color: kickerColor, fontFamily: data.secondaryFont }}>{data.deliveryTime.smallPrint}</p>
            </div>

            {/* 8. TIMELINE TABLE */}
            <div className="space-y-4 pt-10 border-t text-xs" style={{ borderColor: borderColor }}>
              <h2 className="text-xl uppercase tracking-widest" style={{ color: textColor, fontFamily: data.primaryFont }}>
                {data.timelineTable.heading}
              </h2>

              <div className="rounded-xl overflow-hidden" style={{ borderColor: borderColor, borderWidth: '1px' }}>
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase font-bold border-b" style={{ backgroundColor: boxBgColor, borderColor: borderColor, color: textColor, fontFamily: data.secondaryFont }}>
                    <tr>
                      <th className="py-2.5 px-4">Result</th>
                      <th className="py-2.5 px-4">Timeline</th>
                      <th className="py-2.5 px-4">Revisions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-medium" style={{ color: textColor, fontFamily: data.secondaryFont }}>
                    {data.timelineTable.rows.map(row => (
                      <tr key={row.id}>
                        <td className="py-2.5 px-4">{row.result}</td>
                        <td className="py-2.5 px-4">{row.timeline}</td>
                        <td className="py-2.5 px-4" style={{ color: kickerColor }}>{row.revisions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 9. TESTIMONIALS */}
            <div className="space-y-4 pt-10 border-t text-xs" style={{ borderColor: borderColor }}>
              <span className="text-[9px] tracking-[0.2em] font-bold uppercase block" style={{ color: kickerColor, fontFamily: data.secondaryFont }}>
                {data.testimonials.kicker}
              </span>
              <h2 className="text-xl uppercase tracking-widest" style={{ color: textColor, fontFamily: data.primaryFont }}>
                {data.testimonials.heading}
              </h2>

              <div className="space-y-3 italic" style={{ color: textColor, fontFamily: data.primaryFont }}>
                {data.testimonials.quotes.map(q => (
                  <div key={q.id} className="p-4 rounded-xl space-y-1" style={{ backgroundColor: boxBgColor, borderColor: borderColor, borderWidth: '1px' }}>
                    <p className="text-xs">{q.quote}</p>
                    <span className="text-[10px] font-bold uppercase not-italic block" style={{ color: kickerColor, fontFamily: data.secondaryFont }}>— {q.author}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 10. TERMS & THANK YOU */}
            <div className="space-y-6 pt-10 border-t text-xs" style={{ borderColor: borderColor }}>
              <div className="space-y-2">
                <h2 className="text-xl uppercase tracking-widest" style={{ color: textColor, fontFamily: data.primaryFont }}>
                  {data.termsAndThankYou.termsHeading}
                </h2>
                <p className="text-xs leading-relaxed opacity-90" style={{ color: textColor, fontFamily: data.secondaryFont }}>{data.termsAndThankYou.termsText}</p>
              </div>

              <div className="text-center pt-8 border-t space-y-2" style={{ borderColor: borderColor }}>
                <h2 className="text-xl uppercase tracking-widest" style={{ color: textColor, fontFamily: data.primaryFont }}>
                  {data.termsAndThankYou.thankYouHeading}
                </h2>
                <p className="text-xs" style={{ color: textColor, fontFamily: data.secondaryFont }}>{data.termsAndThankYou.thankYouText}</p>
                <p className="text-[10px] font-mono pt-2" style={{ color: kickerColor }}>{data.termsAndThankYou.studioContact}</p>
              </div>
            </div>

          </div>
        </main>

      </div>

      {/* ── UNIFIED MASTER MEDIA MODAL ── */}
      <MasterMediaModal 
        isOpen={mediaModalOpen} 
        onClose={() => setMediaModalOpen(false)} 
        onSelectImage={handleSelectImageFromGallery} 
        userId={userId} 
      />

    </div>
  );
}

export default function QuotationBuilderPage() {
  return (
    <React.Suspense fallback={
      <div className="h-screen w-screen bg-[#EBECEF] text-zinc-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-zinc-600">Loading WedGrapher Studio Editor...</p>
        </div>
      </div>
    }>
      <WedGrapherAiryBuilderContent />
    </React.Suspense>
  );
}
