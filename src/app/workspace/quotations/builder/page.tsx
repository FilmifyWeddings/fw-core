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
  Download, Printer, RefreshCw, X, Layers, ExternalLink, ChevronUp, ChevronDown, Move, Image as ImageIcon, Sliders,
  ZoomIn, ZoomOut, Maximize2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { compressImageClient, uploadMasterImage } from '@/lib/master-image-manager';
import { MasterMediaModal } from '@/components/MasterMediaModal';
import { CanvaFontSelector } from '@/components/CanvaFontSelector';
import { loadCustomFontsFromAPI, registerFontFace, ensureFontsReady } from '@/lib/font-loader';

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
    photoFocalY: 50, // Vertical crop focal point 0-100%
    showPhotoBorder: false, // Frame border toggle: false = no border line around PNG/photo
    frameShape: 'arch' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
  },
  
  // Section 2: About Us
  aboutUs: {
    kicker: 'INTRODUCTION',
    heading: 'ABOUT US',
    text: 'Glowwed films strive to capture your love story in the most gracious way possible. All the memories of your event will be hand-picked with precision and made into films & photographs that you can cherish forever',
    signature: 'FOUNDER & DIRECTOR, AS',
    bottomBannerPhoto: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=80',
    bottomBannerHeight: 450, // Photo height slider
    frameShape: 'full-width' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
    photoFocalY: 50,  // Vertical crop focal point 0-100%
    photoWidth: 75,
    textAlign: 'Left',
    background: 'Page colour',
  },

  // Section 3: Pre-Wedding Shoot Details
  shootDetails: {
    kicker: 'WHAT WE DO',
    heading: 'Pre-Wedding Shoot',
    daysText: '1 Day Shoot',
    crewText: 'Candid Photography\nCinematography\nPortable Changing Room',
    deliverablesHeading: 'Deliverables',
    deliverablesText: 'Full Ultra HD Super-Fine Raw Photos\nApprox. 50 High Resolution Edited Images\n3 Save The Dates Photos\n1 count Down Reel\n1 video Reel',
    photo: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80',
    photoHeight: 450, // Default height matching Cover page proportion
    photoWidth: 75,   // Same default width as cover page
    photoFocalY: 50,  // Range 0% (Top) to 100% (Bottom) vertical focal point
    photoAlignment: 'Center Card' as 'Left Fit' | 'Right Fit' | 'Center Card' | 'Full Bleed',
    frameShape: 'arch' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
    isWatermarkBackground: false,
    watermarkOpacity: 40,
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
    photoHeight: 450,
    frameShape: 'rounded' as 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background',
    photoFocalY: 50,
    photoWidth: 75,
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

// Reusable Premium 3D Curved Segmented Selector for Photo Layout Style
interface Photo3DLayoutSelectorProps {
  value: 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background';
  onChange: (newShape: 'arch' | 'rounded' | 'rectangle' | 'full-width' | 'background') => void;
}

const PHOTO_SHAPE_OPTIONS = [
  { value: 'arch', label: 'Arch', icon: '⋂' },
  { value: 'rounded', label: 'Rounded', icon: '▣' },
  { value: 'rectangle', label: 'Rectangle', icon: '▬' },
  { value: 'full-width', label: 'Full Width', icon: '◻' },
  { value: 'background', label: 'Background', icon: '⊡' },
] as const;

function Photo3DLayoutSelector({ value, onChange }: Photo3DLayoutSelectorProps) {
  const currentVal = value || 'arch';
  return (
    <div className="space-y-1">
      <label className="block text-[9px] font-bold text-amber-900/80 uppercase tracking-wider">
        Photo Layout Style
      </label>
      <div 
        className="grid grid-cols-5 gap-1 p-1.5 rounded-2xl border border-amber-300/80 bg-gradient-to-b from-amber-100/90 via-amber-50 to-amber-200/60"
        style={{
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.12), inset 0 -1px 2px rgba(255,255,255,0.8), 0 2px 6px rgba(0,0,0,0.04)'
        }}
      >
        {PHOTO_SHAPE_OPTIONS.map(opt => {
          const isActive = currentVal === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`py-1.5 px-0.5 rounded-xl text-[8px] font-black transition-all duration-200 flex flex-col items-center justify-center gap-0.5 leading-tight cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-b from-white via-amber-50 to-amber-100 text-amber-950 scale-[0.96] border border-amber-400/90 shadow-[0_3px_8px_rgba(180,130,40,0.35),_inset_0_1px_0_rgba(255,255,255,0.95)] font-black'
                  : 'text-zinc-500 hover:text-amber-950 hover:bg-white/60 border border-transparent'
              }`}
            >
              <span className="text-[13px] leading-none font-bold">{opt.icon}</span>
              <span className="text-center truncate w-full text-[8px] font-extrabold">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WedGrapherAiryBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hiddenFileInputRef = useRef<HTMLInputElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [data, setData] = useState(DEFAULT_AIRY_PROPOSAL);
  const [userId, setUserId] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('Saved');
  const [copiedLink, setCopiedLink] = useState(false);
  const [openCard, setOpenCard] = useState<string | null>('cover');

  // Viewport Zoom & Scaling Engine (A4 794px base)
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);

  // Responsive Auto-Scale Calculation
  const autoFitScale = () => {
    if (mainContainerRef.current) {
      const availableWidth = mainContainerRef.current.clientWidth - 48;
      if (availableWidth < 794 && availableWidth > 200) {
        const fitScale = Math.max(0.35, Math.min(1.0, Number((availableWidth / 794).toFixed(2))));
        setZoomScale(fitScale);
      } else {
        setZoomScale(1.0);
      }
    }
  };

  useEffect(() => {
    autoFitScale();
    window.addEventListener('resize', autoFitScale);
    return () => window.removeEventListener('resize', autoFitScale);
  }, []);

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

  // Load Custom Fonts from API on initial mount
  useEffect(() => {
    loadCustomFontsFromAPI();
  }, []);

  // Ensure initial primary and secondary fonts are registered
  useEffect(() => {
    if (data.primaryFont) registerFontFace({ name: data.primaryFont.replace(/['"]/g, '').split(',')[0], family: data.primaryFont, category: 'Luxury Serif' });
    if (data.secondaryFont) registerFontFace({ name: data.secondaryFont.replace(/['"]/g, '').split(',')[0], family: data.secondaryFont, category: 'Minimal Sans-Serif' });
  }, [data.primaryFont, data.secondaryFont]);

  // Clean Browser Print PDF Export
  const handleCleanPDFExport = async () => {
    setIsExportingPDF(true);
    try {
      await ensureFontsReady();
      await new Promise(r => setTimeout(r, 150));
      window.print();
    } catch (err) {
      console.error('Clean PDF export error:', err);
      window.print();
    } finally {
      setIsExportingPDF(false);
    }
  };

  // 1:1 Pixel-Perfect High-Resolution Multi-Page A4 PDF Generator
  const handleDownloadPDFCanvas = async () => {
    if (!canvasRef.current) return;
    const previousScale = zoomScale;
    setIsExportingPDF(true);
    
    // Temporarily reset scale to 1.0 for accurate 1:1 capture
    setZoomScale(1.0);

    try {
      await ensureFontsReady();
      await new Promise(r => setTimeout(r, 300));

      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const pageElements = canvasRef.current.querySelectorAll('.a4-page-section');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();   // 595.28 pt
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 841.89 pt

      if (pageElements && pageElements.length > 0) {
        for (let i = 0; i < pageElements.length; i++) {
          const pageEl = pageElements[i] as HTMLElement;
          const canvas = await html2canvas(pageEl, {
            scale: 3, // Crisp 300 DPI Rendering
            useCORS: true,
            allowTaint: true,
            logging: false,
            width: 794,
            windowWidth: 794,
            backgroundColor: pageBgColor,
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.96);
          if (i > 0) {
            pdf.addPage('a4', 'p');
          }
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        }
      } else {
        // Fallback single canvas mode
        const element = canvasRef.current;
        const canvas = await html2canvas(element, {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          logging: false,
          width: 794,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const calculatedHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, calculatedHeight);
      }

      pdf.save(`${data.designName || 'Quotation_Proposal'}.pdf`);
    } catch (err) {
      console.error('Download PDF canvas error:', err);
      window.print();
    } finally {
      setZoomScale(previousScale);
      setIsExportingPDF(false);
    }
  };

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

        // 2. Fetch User Gallery Images strictly isolated for Quotations
        const { data: dbImages } = await supabase
          .from('user_gallery_images')
          .select('*')
          .eq('workspace_id', currentUserId)
          .order('created_at', { ascending: false });

        if (dbImages && dbImages.length > 0) {
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

    if (userGalleryObjects.length >= 10) {
      alert('Storage Limit Reached: You have reached the maximum 10 gallery images limit.');
      return;
    }

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

      const compressedFile = await compressImageClient(pendingUploadFile, {
        maxWidth: maxDim,
        maxHeight: maxDim,
        quality: qualityFactor,
      });

      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageUrl = event.target?.result as string;
        if (imageUrl) {
          setGalleryImages(prev => [imageUrl, ...prev]);
          handleSelectImageFromGallery(imageUrl);

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
      
      {/* ── PRINT & PDF EXPORT CSS (0px Margins, Exact A4 Page Breaks) ── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          body, html {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, aside, .no-print, button, nav, .page-indicator {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            background: transparent !important;
            overflow: visible !important;
          }
          .proposal-canvas-container {
            transform: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .a4-page-section {
            width: 794px !important;
            min-height: 1123px !important;
            height: 1123px !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ── TOP HEADER BAR ── */}
      <header className="h-12 bg-white border-b border-zinc-200 px-4 sm:px-5 flex items-center justify-between shrink-0 z-50 shadow-xs no-print">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={data.designName}
            onChange={(e) => { setData({ ...data, designName: e.target.value }); }}
            className="text-xs font-bold text-zinc-900 bg-transparent focus:outline-none focus:border-b border-black py-0.5 max-w-[200px] sm:max-w-[320px] truncate"
          />
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border hidden sm:inline-block ${
            hasUnsavedChanges ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
          }`}>
            {autoSaveStatus}
          </span>
        </div>

        {/* Viewport Zoom Controls */}
        <div className="flex items-center gap-1.5 bg-zinc-100 px-2 py-1 rounded-full border border-zinc-200 text-[10px] font-bold text-zinc-700">
          <button 
            type="button" 
            onClick={() => setZoomScale(s => Math.max(0.35, Number((s - 0.1).toFixed(2))))} 
            className="p-1 hover:bg-zinc-200 rounded-full transition-all cursor-pointer" 
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3 text-zinc-600" />
          </button>
          <span className="w-10 text-center font-mono font-bold text-zinc-800">{Math.round(zoomScale * 100)}%</span>
          <button 
            type="button" 
            onClick={() => setZoomScale(s => Math.min(1.5, Number((s + 0.1).toFixed(2))))} 
            className="p-1 hover:bg-zinc-200 rounded-full transition-all cursor-pointer" 
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3 text-zinc-600" />
          </button>
          <button 
            type="button" 
            onClick={autoFitScale} 
            className="px-1.5 py-0.5 bg-white border border-zinc-300 rounded-md text-[9px] hover:bg-zinc-50 cursor-pointer transition-all ml-0.5" 
            title="Fit to Screen Width"
          >
            Fit
          </button>
          <button 
            type="button" 
            onClick={() => setZoomScale(1.0)} 
            className="px-1.5 py-0.5 bg-white border border-zinc-300 rounded-md text-[9px] hover:bg-zinc-50 cursor-pointer transition-all" 
            title="100% Zoom"
          >
            100%
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Link
            href={`/p/quotation/demo_token`}
            target="_blank"
            className="px-3 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-bold transition-all flex items-center gap-1.5 hidden md:flex"
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </Link>

          <button
            onClick={handleCleanPDFExport}
            disabled={isExportingPDF}
            className="px-3 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Export Clean PDF (Print View)"
          >
            <Printer className="w-3.5 h-3.5 text-amber-700" /> {isExportingPDF ? 'Preparing...' : 'Clean PDF'}
          </button>

          <button
            onClick={handleDownloadPDFCanvas}
            disabled={isExportingPDF}
            className="px-3 py-1 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            title="Download High-Res 300 DPI Multi-Page PDF"
          >
            <Download className="w-3.5 h-3.5 text-amber-700" /> Download PDF
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setCopiedLink(true);
              setTimeout(() => setCopiedLink(false), 2000);
            }}
            className="px-3 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer hidden lg:flex"
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
            className="p-1 rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors ml-1"
            title="Close Editor"
          >
            <X className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* ── MAIN WORKSPACE VIEWPORT ── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ───────────────────────────────────────────────────────────── */}
        {/* LEFT CONTROL SIDEBAR PANEL                                    */}
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

            {/* Canva-Style Typography Customizers */}
            <div className="space-y-3 pt-2 border-t border-zinc-100">
              <span className="text-[10px] uppercase font-bold text-purple-700 flex items-center gap-1">
                <Type className="w-3 h-3" /> Canva-Style Typography Engine
              </span>

              <CanvaFontSelector
                label="Main Font (Headings & Names)"
                value={data.primaryFont}
                onChange={(family, fontItem) => {
                  registerFontFace(fontItem);
                  setData({ ...data, primaryFont: family });
                }}
              />

              <CanvaFontSelector
                label="Sub Font (Body Text & Tables)"
                value={data.secondaryFont}
                onChange={(family, fontItem) => {
                  registerFontFace(fontItem);
                  setData({ ...data, secondaryFont: family });
                }}
              />
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

                  {/* Event Type Dropdown */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-zinc-400">Event Type</label>
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

                  {/* Brand Name & Brand Logo */}
                  <div className="space-y-2 pt-2 border-t border-zinc-100">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Brand Name & Logo</span>
                    <input
                      type="text"
                      value={data.cover.brandName}
                      placeholder="Brand Name (e.g. FILMIFY WEDDINGS)"
                      onChange={(e) => setData({ ...data, cover: { ...data.cover, brandName: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold"
                    />

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

                    <div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold">
                        <span>Logo Size</span>
                        <span>{data.cover.brandLogoSize}px</span>
                      </div>
                      <input
                        type="range" min="20" max="180"
                        value={data.cover.brandLogoSize}
                        onChange={(e) => setData({ ...data, cover: { ...data.cover, brandLogoSize: Number(e.target.value) } })}
                        className="w-full accent-black cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Cover Photo Add Image & Layout Selector */}
                  <div className="space-y-2 pt-2 border-t border-zinc-100">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Cover Photo & Frame</span>
                    
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

                    <Photo3DLayoutSelector
                      value={data.cover.frameShape || 'arch'}
                      onChange={(newShape) => {
                        const isSmallShape = ['arch', 'rounded', 'rectangle'].includes(newShape);
                        const newHeight = isSmallShape && (data.cover.photoHeight > 450 || !data.cover.photoHeight) ? 420 : data.cover.photoHeight;
                        setData({
                          ...data,
                          cover: {
                            ...data.cover,
                            frameShape: newShape,
                            photoHeight: newHeight,
                          }
                        });
                      }}
                    />

                    {data.cover.photoUrl && (
                      <div className="space-y-1.5 p-2 rounded-xl bg-amber-50/60 border border-amber-200/80">
                        <div className="flex items-center justify-between text-[10px] text-amber-900 font-bold">
                          <span>Photo Focus (Up / Down)</span>
                          <span className="font-mono text-amber-700">{data.cover.photoFocalY ?? 50}%</span>
                        </div>
                        <input
                          type="range" min="0" max="100"
                          value={data.cover.photoFocalY ?? 50}
                          onChange={(e) => setData({ ...data, cover: { ...data.cover, photoFocalY: Number(e.target.value) } })}
                          className="w-full accent-amber-700 cursor-pointer"
                        />
                      </div>
                    )}

                    {data.cover.frameShape !== 'background' && (
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold">
                          <span>Photo Height</span>
                          <span>{data.cover.photoHeight}px</span>
                        </div>
                        <input
                          type="range" min="200" max="800"
                          value={data.cover.photoHeight}
                          onChange={(e) => setData({ ...data, cover: { ...data.cover, photoHeight: Number(e.target.value) } })}
                          className="w-full accent-black cursor-pointer"
                        />
                      </div>
                    )}

                    {['arch', 'rounded', 'rectangle'].includes(data.cover.frameShape || 'arch') && (
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold">
                          <span>Photo Width</span>
                          <span>{data.cover.photoWidth || 75}%</span>
                        </div>
                        <input
                          type="range" min="30" max="100"
                          value={data.cover.photoWidth || 75}
                          onChange={(e) => setData({ ...data, cover: { ...data.cover, photoWidth: Number(e.target.value) } })}
                          className="w-full accent-black cursor-pointer"
                        />
                      </div>
                    )}

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
                        {data.cover.showPhotoBorder ? 'Border ON' : 'Border OFF'}
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
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Text</label>
                    <textarea
                      rows={3}
                      value={data.aboutUs.text}
                      onChange={(e) => setData({ ...data, aboutUs: { ...data.aboutUs, text: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium resize-none"
                    />
                  </div>

                  <div className="space-y-2 pt-2 border-t border-zinc-100">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">Banner Image</span>
                    
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
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <Photo3DLayoutSelector
                      value={data.aboutUs.frameShape || 'full-width'}
                      onChange={(newShape) => {
                        setData({ ...data, aboutUs: { ...data.aboutUs, frameShape: newShape } });
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Pre-Wedding Shoot Details Card */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
              <div 
                onClick={() => setOpenCard(openCard === 'shoot' ? null : 'shoot')}
                className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5 text-amber-700" />
                  <span>3. Pre-Wedding</span>
                </div>
                {openCard === 'shoot' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>

              {openCard === 'shoot' && (
                <div className="p-3 space-y-3 bg-white">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Heading</label>
                    <input
                      type="text"
                      value={data.shootDetails.heading || 'Pre-Wedding Shoot'}
                      onChange={(e) => setData({ ...data, shootDetails: { ...data.shootDetails, heading: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Deliverables Items</label>
                    <textarea
                      rows={4}
                      value={data.shootDetails.deliverablesText || ''}
                      onChange={(e) => setData({ ...data, shootDetails: { ...data.shootDetails, deliverablesText: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium resize-none text-[11px]"
                    />
                  </div>

                  <div className="pt-2 border-t border-zinc-100 space-y-2.5">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">Pre-Wedding Photo</span>
                    
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
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <Photo3DLayoutSelector
                      value={data.shootDetails.frameShape || 'arch'}
                      onChange={(newShape) => {
                        setData({ ...data, shootDetails: { ...data.shootDetails, frameShape: newShape } });
                      }}
                    />
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
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Deliverables List</label>
                    <textarea
                      rows={4}
                      value={data.whatsIncluded.deliverablesText}
                      onChange={(e) => setData({ ...data, whatsIncluded: { ...data.whatsIncluded, deliverablesText: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium resize-none"
                    />
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
                </div>
              )}
            </div>

          </div>

        </aside>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* CENTER LIVE PROPOSAL DOCUMENT CANVAS                          */}
        {/* ───────────────────────────────────────────────────────────── */}
        <main 
          ref={mainContainerRef}
          className="flex-1 bg-[#EBECEF] p-4 sm:p-8 overflow-y-auto overflow-x-auto flex flex-col items-center justify-start space-y-8"
        >
          
          {/* Scaled A4 Container Wrapper */}
          <div 
            className="proposal-canvas-container flex flex-col items-center space-y-12 transition-transform duration-200 origin-top"
            style={{ 
              transform: `scale(${zoomScale})`, 
              transformOrigin: 'top center',
              width: '794px',
              marginBottom: `${(zoomScale - 1) * 2400}px`
            }}
            ref={canvasRef}
          >

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* PAGE 1: COVER PAGE (FIXED A4 794px x 1123px ASPECT RATIO)     */}
            {/* ═════════════════════════════════════════════════════════════ */}
            <div 
              className="a4-page-section w-[794px] h-[1123px] shrink-0 rounded-sm shadow-2xl relative overflow-hidden flex flex-col items-center justify-between text-center transition-colors duration-300 border border-zinc-300/60 select-none"
              style={{ 
                backgroundColor: pageBgColor, 
                color: textColor,
                fontFamily: data.secondaryFont
              }}
            >
              
              {/* FULL-BLEED ABSOLUTE BACKGROUND IMAGE (WHEN BACKGROUND SHAPE IS SELECTED) */}
              {data.cover.photoUrl && data.cover.frameShape === 'background' && (
                <div className="absolute inset-0 z-0 overflow-hidden w-full h-full">
                  <img 
                    src={data.cover.photoUrl} 
                    alt="Cover Background" 
                    className="w-full h-full object-cover block"
                    style={{ objectPosition: `50% ${data.cover.photoFocalY ?? 50}%` }}
                  />
                  {/* Subtle Contrast Overlay Tint */}
                  <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none" />
                </div>
              )}

              {/* COVER CONTENT LAYER (ALWAYS STRICTLY VERTICALLY & HORIZONTALLY CENTERED) */}
              <div className="relative z-10 flex flex-col items-center justify-between h-full w-full p-12 py-16 text-center my-auto">
                
                {/* Top Section / Brand Header */}
                <div className="w-full flex flex-col items-center justify-center space-y-2">
                  {data.cover.brandLogoUrl ? (
                    <img 
                      src={data.cover.brandLogoUrl} 
                      alt={data.cover.brandName}
                      className="bg-transparent object-contain drop-shadow-xs"
                      style={{ height: `${data.cover.brandLogoSize || 64}px` }}
                    />
                  ) : (
                    <div className="text-center space-y-0.5">
                      <div 
                        className="text-xl tracking-[0.25em] uppercase font-black" 
                        style={{ color: data.cover.frameShape === 'background' && data.cover.photoUrl ? '#FFFFFF' : textColor, fontFamily: data.primaryFont }}
                      >
                        {data.cover.brandName || 'FILMIFY WEDDINGS'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Center Content Section (Couple Names & Event Type) */}
                <div className="w-full space-y-6 flex flex-col items-center justify-center my-auto">
                  
                  {/* Couple Names */}
                  <div className="space-y-1">
                    <h1 
                      className="text-5xl tracking-[0.18em] uppercase font-black leading-tight drop-shadow-sm"
                      style={{ color: data.cover.frameShape === 'background' && data.cover.photoUrl ? '#FFFFFF' : textColor, fontFamily: data.primaryFont }}
                    >
                      {data.cover.groomName || 'YASH'}
                    </h1>
                    <div className="text-2xl font-serif opacity-75 my-1" style={{ color: data.cover.frameShape === 'background' && data.cover.photoUrl ? '#F3F4F6' : kickerColor }}>&amp;</div>
                    <h1 
                      className="text-5xl tracking-[0.18em] uppercase font-black leading-tight drop-shadow-sm"
                      style={{ color: data.cover.frameShape === 'background' && data.cover.photoUrl ? '#FFFFFF' : textColor, fontFamily: data.primaryFont }}
                    >
                      {data.cover.brideName || 'TWINKLE'}
                    </h1>
                  </div>

                  {/* Non-Background Frame Shapes (Arch, Rounded, Rectangle, Full Width) */}
                  {data.cover.photoUrl && data.cover.frameShape !== 'background' && (
                    <div className="w-full my-4">
                      {data.cover.frameShape === 'full-width' ? (
                        <div className="-mx-12 w-[794px] overflow-hidden">
                          <img 
                            src={data.cover.photoUrl} 
                            alt="Cover Full Bleed"
                            className="w-full object-cover block shadow-xs"
                            style={{ 
                              height: `${data.cover.photoHeight || 420}px`,
                              objectPosition: `50% ${data.cover.photoFocalY ?? 50}%` 
                            }}
                          />
                        </div>
                      ) : (
                        <div 
                          className={`mx-auto overflow-hidden shadow-lg relative transition-all duration-200 ${
                            data.cover.frameShape === 'rounded' ? 'rounded-3xl' :
                            data.cover.frameShape === 'rectangle' ? 'rounded-none' :
                            'rounded-t-[999px] rounded-b-none'
                          }`}
                          style={{ 
                            width: `${data.cover.photoWidth || 75}%`,
                            height: `${data.cover.photoHeight || 420}px`,
                            borderColor: data.cover.showPhotoBorder ? photoBorderColor : 'transparent', 
                            borderWidth: data.cover.showPhotoBorder ? '1px' : '0px', 
                            backgroundColor: 'transparent' 
                          }}
                        >
                          <img 
                            src={data.cover.photoUrl} 
                            alt="Wedding Couple"
                            className="w-full h-full object-cover bg-transparent"
                            style={{ objectPosition: `50% ${data.cover.photoFocalY ?? 50}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Event Type & Subtitle */}
                  <div className="space-y-2 pt-2">
                    <h3 
                      className="text-base tracking-[0.2em] uppercase font-bold"
                      style={{ color: data.cover.frameShape === 'background' && data.cover.photoUrl ? '#FFFFFF' : textColor, fontFamily: data.primaryFont }}
                    >
                      {`${(data.cover.eventType || 'WEDDING').toUpperCase()} QUOTATION`}
                    </h3>
                    <p 
                      className="text-xs tracking-[0.18em] uppercase font-medium opacity-90"
                      style={{ color: data.cover.frameShape === 'background' && data.cover.photoUrl ? '#E5E7EB' : kickerColor, fontFamily: data.secondaryFont }}
                    >
                      {`${(data.cover.sideOption || 'BOTH SIDES').toUpperCase()} – ${(data.cover.locationName || 'MUMBAI').toUpperCase()}`}
                    </p>
                  </div>

                </div>

                {/* Footer Tag */}
                <div className="w-full pt-4 text-[10px] tracking-[0.2em] font-mono font-bold uppercase opacity-80" style={{ color: data.cover.frameShape === 'background' && data.cover.photoUrl ? '#E5E7EB' : kickerColor }}>
                  EXCLUSIVELY PREPARED FOR YOU
                </div>

              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* PAGE 2: ABOUT US & MONOGRAM (FIXED A4 794px x 1123px)         */}
            {/* ═════════════════════════════════════════════════════════════ */}
            <div 
              className="a4-page-section w-[794px] min-h-[1123px] shrink-0 rounded-sm shadow-2xl relative overflow-hidden flex flex-col justify-between p-12 transition-colors duration-300 border border-zinc-300/60"
              style={{ 
                backgroundColor: pageBgColor, 
                color: textColor,
                fontFamily: data.secondaryFont
              }}
            >
              
              {/* Birds Graphic */}
              <div className="absolute top-8 right-12 pointer-events-none opacity-85">
                <div 
                  className="w-[240px] h-[120px]"
                  style={{
                    backgroundColor: kickerColor || textColor,
                    WebkitMaskImage: `url(/images/Birds.svg)`,
                    maskImage: `url(/images/Birds.svg)`,
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain',
                  }}
                />
              </div>

              <div className="space-y-8 my-auto text-center w-full relative z-10">
                <span className="text-xs tracking-[0.25em] uppercase font-bold block" style={{ color: kickerColor }}>
                  {data.aboutUs.kicker || 'INTRODUCTION'}
                </span>
                
                <h2 className="text-3xl tracking-widest uppercase font-normal" style={{ color: textColor, fontFamily: data.primaryFont }}>
                  {data.aboutUs.heading || 'ABOUT US'}
                </h2>

                {/* Artistic Layered Monogram */}
                <div className="flex flex-col items-center justify-center my-4 select-none">
                  <div 
                    className="w-[280px] h-[140px]"
                    style={{
                      backgroundColor: textColor,
                      WebkitMaskImage: `url(/images/A%26U.svg)`,
                      maskImage: `url(/images/A%26U.svg)`,
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                      WebkitMaskSize: 'contain',
                      maskSize: 'contain',
                      WebkitMaskPosition: 'center',
                    }}
                  />
                </div>

                {/* Central Quote Block */}
                <div className="my-6 px-6 flex items-center justify-center gap-3 max-w-xl mx-auto text-center">
                  <span className="text-4xl font-serif leading-none select-none shrink-0" style={{ color: kickerColor }}>“</span>
                  <p className="text-sm leading-relaxed font-normal opacity-90 tracking-wide" style={{ color: textColor, fontFamily: data.secondaryFont }}>
                    {data.aboutUs.text}
                  </p>
                  <span className="text-4xl font-serif leading-none select-none shrink-0" style={{ color: kickerColor }}>”</span>
                </div>

                <div className="text-xs tracking-[0.2em] font-bold uppercase pt-2" style={{ color: kickerColor }}>
                  {data.aboutUs.signature}
                </div>
              </div>

              {/* Full-Bleed Banner Photo (100% 0px Gap) */}
              {data.aboutUs.bottomBannerPhoto && (
                <div className="-mx-12 -mb-12 w-[794px] overflow-hidden shrink-0 mt-6">
                  <img
                    src={data.aboutUs.bottomBannerPhoto}
                    alt="About Us Full Bleed"
                    className="w-full object-cover block shadow-xs"
                    style={{ 
                      height: `${data.aboutUs.bottomBannerHeight || 380}px`, 
                      objectPosition: `50% ${data.aboutUs.photoFocalY ?? 50}%` 
                    }}
                  />
                </div>
              )}

            </div>

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* PAGE 3: PRE-WEDDING SHOOT DETAILS (FIXED A4 794px x 1123px)    */}
            {/* ═════════════════════════════════════════════════════════════ */}
            <div 
              className="a4-page-section w-[794px] min-h-[1123px] shrink-0 rounded-sm shadow-2xl relative overflow-hidden flex flex-col justify-between transition-colors duration-300 border border-zinc-300/60 p-12"
              style={{ 
                backgroundColor: pageBgColor, 
                color: textColor,
                fontFamily: data.secondaryFont
              }}
            >
              
              {/* Full-Bleed Watermark Overlay (Option 5) */}
              {data.shootDetails.photo && data.shootDetails.frameShape === 'background' && (
                <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden w-full h-full">
                  <img 
                    src={data.shootDetails.photo} 
                    alt="Pre-Wedding Watermark"
                    className="w-full h-full object-cover filter grayscale-[15%] opacity-35"
                    style={{ objectPosition: `50% ${data.shootDetails.photoFocalY ?? 50}%` }}
                  />
                </div>
              )}

              <div className="relative z-10 space-y-8 my-auto w-full">
                
                <div className="text-center space-y-2">
                  <span className="text-xs tracking-[0.25em] uppercase font-bold block" style={{ color: kickerColor }}>
                    {data.shootDetails.kicker || 'WHAT WE DO'}
                  </span>
                  <h2 
                    className="text-4xl tracking-wide font-normal" 
                    style={{ color: textColor, fontFamily: data.primaryFont }}
                  >
                    {data.shootDetails.heading || 'Pre-Wedding Shoot'}
                  </h2>
                </div>

                {/* Days & Crew List */}
                <div className="space-y-3 max-w-lg mx-auto pl-4">
                  <p className="text-base font-bold tracking-wide" style={{ color: textColor }}>
                    {data.shootDetails.daysText || '1 Day Shoot'}
                  </p>

                  <ul className="space-y-2 list-disc list-inside text-sm font-normal opacity-90 leading-relaxed">
                    {(data.shootDetails.crewText || 'Candid Photography\nCinematography\nPortable Changing Room')
                      .split('\n')
                      .filter(Boolean)
                      .map((item, idx) => (
                        <li key={idx} className="tracking-wide">
                          <span className="font-medium ml-1">{item.trim()}</span>
                        </li>
                      ))}
                  </ul>
                </div>

                {/* Deliverables */}
                <div className="pt-4 space-y-4 max-w-lg mx-auto pl-4">
                  <h3 
                    className="text-2xl tracking-wide font-normal text-left" 
                    style={{ color: textColor, fontFamily: data.primaryFont }}
                  >
                    {data.shootDetails.deliverablesHeading || 'Deliverables'}
                  </h3>

                  <ul className="space-y-2 list-disc list-inside text-sm font-normal opacity-90 leading-relaxed">
                    {(data.shootDetails.deliverablesText || 'Full Ultra HD Super-Fine Raw Photos\nApprox. 50 High Resolution Edited Images\n3 Save The Dates Photos\n1 count Down Reel\n1 video Reel')
                      .split('\n')
                      .filter(Boolean)
                      .map((item, idx) => (
                        <li key={idx} className="tracking-wide">
                          <span className="font-medium ml-1">{item.trim()}</span>
                        </li>
                      ))}
                  </ul>
                </div>

                {/* Full-Bleed Edge-to-Edge Photo Layout */}
                {data.shootDetails.photo && data.shootDetails.frameShape === 'full-width' && (
                  <div className="-mx-12 -mb-12 w-[794px] overflow-hidden mt-6">
                    <img 
                      src={data.shootDetails.photo} 
                      alt="Pre-Wedding Full Bleed"
                      className="w-full object-cover block shadow-xs"
                      style={{ 
                        height: `${data.shootDetails.photoHeight || 380}px`,
                        objectPosition: `50% ${data.shootDetails.photoFocalY ?? 50}%` 
                      }}
                    />
                  </div>
                )}

                {/* Arch / Shaped Photo */}
                {data.shootDetails.photo && ['arch', 'rounded', 'rectangle'].includes(data.shootDetails.frameShape || 'arch') && (
                  <div 
                    className={`mx-auto mt-6 overflow-hidden shadow-md relative transition-all duration-300 ${
                      (data.shootDetails.frameShape || 'arch') === 'arch'
                        ? 'rounded-t-[999px] rounded-b-none'
                        : data.shootDetails.frameShape === 'rectangle'
                        ? 'rounded-none'
                        : 'rounded-2xl'
                    }`}
                    style={{ 
                      width: `${data.shootDetails.photoWidth || 75}%`,
                      height: `${data.shootDetails.photoHeight || 380}px`,
                      borderColor: photoBorderColor,
                      borderWidth: '1px',
                      backgroundColor: 'transparent'
                    }}
                  >
                    <img 
                      src={data.shootDetails.photo} 
                      alt="Pre-Wedding Shoot"
                      className="w-full h-full object-cover bg-transparent"
                      style={{ objectPosition: `50% ${data.shootDetails.photoFocalY ?? 50}%` }}
                    />
                  </div>
                )}

              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* PAGE 4: WHAT'S INCLUDED (FIXED A4 794px x 1123px)             */}
            {/* ═════════════════════════════════════════════════════════════ */}
            <div 
              className="a4-page-section w-[794px] min-h-[1123px] shrink-0 rounded-sm shadow-2xl relative overflow-hidden flex flex-col justify-between p-12 transition-colors duration-300 border border-zinc-300/60"
              style={{ 
                backgroundColor: pageBgColor, 
                color: textColor,
                fontFamily: data.secondaryFont
              }}
            >
              <div className="space-y-6 my-auto w-full">
                <span className="text-xs tracking-[0.25em] font-bold uppercase block" style={{ color: kickerColor }}>
                  {data.whatsIncluded.kicker}
                </span>
                <h2 className="text-3xl uppercase tracking-widest font-normal" style={{ color: textColor, fontFamily: data.primaryFont }}>
                  {data.whatsIncluded.heading}
                </h2>

                <div className="p-8 rounded-2xl leading-relaxed whitespace-pre-line text-sm border" style={{ backgroundColor: boxBgColor, borderColor: borderColor, color: textColor }}>
                  {data.whatsIncluded.deliverablesText}
                </div>

                {data.whatsIncluded.photo && (
                  <div className="pt-4">
                    {data.whatsIncluded.frameShape === 'full-width' ? (
                      <div className="-mx-12 w-[794px] overflow-hidden">
                        <img 
                          src={data.whatsIncluded.photo} 
                          alt="Included Full Bleed" 
                          className="w-full object-cover block shadow-xs"
                          style={{ height: `${data.whatsIncluded.photoHeight || 360}px`, objectPosition: `50% ${data.whatsIncluded.photoFocalY ?? 50}%` }}
                        />
                      </div>
                    ) : (
                      <div 
                        className={`mx-auto overflow-hidden shadow-md relative transition-all duration-300 ${
                          (data.whatsIncluded.frameShape || 'rounded') === 'arch'
                            ? 'rounded-t-[999px] rounded-b-none'
                            : (data.whatsIncluded.frameShape || 'rounded') === 'rectangle'
                            ? 'rounded-none'
                            : 'rounded-2xl'
                        }`}
                        style={{ 
                          width: `${data.whatsIncluded.photoWidth || 75}%`,
                          height: `${data.whatsIncluded.photoHeight || 360}px`, 
                          borderColor: photoBorderColor, 
                          borderWidth: '1px' 
                        }}
                      >
                        <img
                          src={data.whatsIncluded.photo}
                          alt="Package Deliverables"
                          className="w-full h-full object-cover bg-transparent"
                          style={{ objectPosition: `50% ${data.whatsIncluded.photoFocalY ?? 50}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* PAGE 5: INVESTMENT & ADD-ONS TABLE (FIXED A4 794px x 1123px)   */}
            {/* ═════════════════════════════════════════════════════════════ */}
            <div 
              className="a4-page-section w-[794px] min-h-[1123px] shrink-0 rounded-sm shadow-2xl relative overflow-hidden flex flex-col justify-between p-12 transition-colors duration-300 border border-zinc-300/60"
              style={{ 
                backgroundColor: pageBgColor, 
                color: textColor,
                fontFamily: data.secondaryFont
              }}
            >
              <div className="space-y-8 my-auto w-full">
                
                {/* Price Section */}
                <div className="space-y-4 border-b pb-8" style={{ borderColor }}>
                  <span className="text-xs tracking-[0.25em] font-bold uppercase block" style={{ color: kickerColor }}>
                    {data.pricePayment.kicker}
                  </span>
                  <h2 className="text-3xl uppercase tracking-widest font-normal" style={{ color: textColor, fontFamily: data.primaryFont }}>
                    {data.pricePayment.heading}
                  </h2>

                  <div className="text-4xl font-black" style={{ color: textColor, fontFamily: data.primaryFont }}>
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </div>

                  <div className="pt-2">
                    <span className="text-xs font-bold uppercase block" style={{ color: kickerColor }}>{data.pricePayment.paymentHeading}</span>
                    <p className="text-xs font-medium" style={{ color: textColor }}>{data.pricePayment.paymentTerms}</p>
                  </div>
                </div>

                {/* Add-ons Table */}
                <div className="space-y-4 pt-4">
                  <h2 className="text-2xl uppercase tracking-widest font-normal" style={{ color: textColor, fontFamily: data.primaryFont }}>
                    {data.addOnsTable.heading}
                  </h2>
                  <span className="text-[10px] tracking-[0.2em] font-bold uppercase block" style={{ color: kickerColor }}>
                    {data.addOnsTable.kicker}
                  </span>

                  <div className="rounded-xl overflow-hidden border" style={{ borderColor }}>
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] uppercase font-bold border-b" style={{ backgroundColor: boxBgColor, borderColor, color: textColor }}>
                        <tr>
                          <th className="py-3 px-4">Services</th>
                          <th className="py-3 px-4 text-right">Charges</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-medium" style={{ color: textColor }}>
                        {data.addOnsTable.rows.map(row => (
                          <tr key={row.id}>
                            <td className="py-3 px-4 font-semibold">{row.service}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold">{row.charge}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* PAGE 6: DELIVERY TIMELINE & TERMS (FIXED A4 794px x 1123px)   */}
            {/* ═════════════════════════════════════════════════════════════ */}
            <div 
              className="a4-page-section w-[794px] min-h-[1123px] shrink-0 rounded-sm shadow-2xl relative overflow-hidden flex flex-col justify-between p-12 transition-colors duration-300 border border-zinc-300/60"
              style={{ 
                backgroundColor: pageBgColor, 
                color: textColor,
                fontFamily: data.secondaryFont
              }}
            >
              <div className="space-y-8 my-auto w-full">
                
                {/* Timeline Table */}
                <div className="space-y-4">
                  <h2 className="text-2xl uppercase tracking-widest font-normal" style={{ color: textColor, fontFamily: data.primaryFont }}>
                    {data.timelineTable.heading}
                  </h2>

                  <div className="rounded-xl overflow-hidden border" style={{ borderColor }}>
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] uppercase font-bold border-b" style={{ backgroundColor: boxBgColor, borderColor, color: textColor }}>
                        <tr>
                          <th className="py-3 px-4">Result</th>
                          <th className="py-3 px-4">Timeline</th>
                          <th className="py-3 px-4">Revisions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-medium" style={{ color: textColor }}>
                        {data.timelineTable.rows.map(row => (
                          <tr key={row.id}>
                            <td className="py-3 px-4 font-semibold">{row.result}</td>
                            <td className="py-3 px-4">{row.timeline}</td>
                            <td className="py-3 px-4 font-mono text-zinc-500">{row.revisions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Terms & Thank You */}
                <div className="space-y-6 pt-6 border-t" style={{ borderColor }}>
                  <div className="space-y-2">
                    <h2 className="text-xl uppercase tracking-widest font-normal" style={{ color: textColor, fontFamily: data.primaryFont }}>
                      {data.termsAndThankYou.termsHeading}
                    </h2>
                    <p className="text-xs leading-relaxed opacity-90">{data.termsAndThankYou.termsText}</p>
                  </div>

                  <div className="text-center pt-8 border-t space-y-2" style={{ borderColor }}>
                    <h2 className="text-2xl uppercase tracking-widest font-normal" style={{ color: textColor, fontFamily: data.primaryFont }}>
                      {data.termsAndThankYou.thankYouHeading}
                    </h2>
                    <p className="text-xs">{data.termsAndThankYou.thankYouText}</p>
                    <p className="text-[10px] font-mono font-bold pt-2 opacity-80" style={{ color: kickerColor }}>{data.termsAndThankYou.studioContact}</p>
                  </div>
                </div>

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
