'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Sparkles, Save, Upload, Trash2, Plus, Check, Edit2, 
  Trash, ArrowLeft, ArrowRight, RotateCcw, Image as ImageIcon, 
  ChevronLeft, ChevronRight, FileDown, Type, AlignLeft, AlignCenter, 
  AlignRight, Bold, HelpCircle, Layout, Database, Sliders, CheckCircle2, 
  AlertCircle, DollarSign, RefreshCw, FolderOpen, History, Search
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { 
  CanvasPage, CanvasElement, PricingSummary, 
  Quotation, QuotationPreset, QuotationTemplate 
} from '@/types';

// ==========================================
// CONSTANTS & INITIAL DATA SEEDS
// ==========================================

const CORPORATE_BRAND_PALETTE = [
  { name: 'Rich Gold', hex: '#D4AF37' },
  { name: 'Deep Olive', hex: '#606248' },
  { name: 'Muted Sand', hex: '#C2B280' },
  { name: 'Jet Black', hex: '#111111' },
  { name: 'Soft Cream', hex: '#FAF6F0' },
  { name: 'Paper White', hex: '#FDFBF7' }
];

const FONTS_LIST = [
  { name: 'Playfair Display', family: 'Playfair Display, serif' },
  { name: 'Cormorant Garamond', family: 'Cormorant Garamond, serif' },
  { name: 'Montserrat', family: 'Montserrat, sans-serif' },
  { name: 'Inter', family: 'Inter, sans-serif' }
];

const DEFAULT_DELIVERABLES = [
  'All the ULTRA FHD Raw Photos will be delivered.',
  'Best Selected Manual HD Edited Photos.',
  'Jaw-dropping Cinematic Wedding Film. (Combined of all events)',
  'Wedding Teaser & Wedding Insta Reel.',
  'Individual FAMILY PORTFOLIOS.',
  'Traditional Full Length Video of Each Event Separate.',
  'One Year Data Drive Access.',
  'Indigo Photobooks of total 30 Sheets (200 Photos approx in total) with HD Prints.',
  'Mini Album Book & One Photobook Calendar.'
];

const FUNCTION_NAMES = ['HALDI', 'SANGEET', 'WEDDING', 'RECEPTION', 'MEHNDI', 'ENGAGEMENT', 'PRE-WEDDING', 'COCKTAIL'];

const REQUIREMENT_OPTIONS = [
  'Traditional Photography',
  'Professional Traditional Videography',
  'Candid Photography',
  'Jaw-dropping Cinematography',
  'Drone Aerial Shots',
  'Wedding Teaser & Reel',
  'Full Length separate video',
  'Live Streaming (Youtube/FB)',
  'LED Wall Setup',
  'Crane/Jib Operation'
];

const DELIVERABLE_OPTIONS = [
  '1 Premium Photobook',
  'Indigo Photobook 30 Sheets',
  'Mini Album Book',
  'One Photobook Calendar',
  'Pen Drive Storage',
  'Google Drive Link',
  '1 Year Data Drive Access',
  'Raw Photo Delivery (JPEG/RAW)',
  'Cinematic Teaser & Highlight Film'
];

const SESSION_HOURS_OPTIONS = [
  '4 Hours Session',
  '6 Hours Session',
  '8 Hours - Full Day',
  '12 Hours - Extended',
  'Unlimited - Multi-Day'
];

const DEFAULT_FUNCTIONS = [
  {
    id: 'func-haldi',
    title: '2026-01-04 | 10:00 | 4 Hours Session | HALDI',
    name: 'HALDI',
    date: '2026-01-04',
    time: '10:00',
    hours: '4 Hours Session',
    items: ['Traditional Photography', 'Professional Traditional Videography', 'Candid Photography', 'Jaw-dropping Cinematography']
  },
  {
    id: 'func-sangeet',
    title: '2026-01-04 | 18:00 | 6 Hours Session | SANGEET',
    name: 'SANGEET',
    date: '2026-01-04',
    time: '18:00',
    hours: '6 Hours Session',
    items: ['Traditional Photography', 'Professional Traditional Videography', 'Candid Photography', 'Jaw-dropping Cinematography']
  },
  {
    id: 'func-wedding',
    title: '2026-01-05 | 09:00 | 8 Hours - Full Day | WEDDING',
    name: 'WEDDING',
    date: '2026-01-05',
    time: '09:00',
    hours: '8 Hours - Full Day',
    items: ['Traditional Photography', 'Professional Traditional Videography', 'Candid Photography', 'Jaw-dropping Cinematography']
  }
];

const DEFAULT_TEMPLATE_CONFIG: CanvasPage[] = [
  // Page 1: Cover
  {
    pageIndex: 0,
    pageType: 'cover',
    elements: [
      {
        id: 'cover-couple-names',
        type: 'text',
        content: 'PRNAY x MAYURI',
        x: 10, y: 8, width: 80, height: 10,
        fontSize: 38, fontFamily: 'Playfair Display', color: '#606248',
        fontWeight: 'bold', textAlign: 'center'
      },
      {
        id: 'cover-subtitle-1',
        type: 'text',
        content: 'WEDDING QUOTATION',
        x: 10, y: 22, width: 80, height: 5,
        fontSize: 18, fontFamily: 'Cormorant Garamond', color: '#C2B280',
        fontWeight: 'normal', textAlign: 'center', letterSpacing: '0.15em'
      },
      {
        id: 'cover-subtitle-2',
        type: 'text',
        content: 'BOTH SIDES - LOCATION',
        x: 10, y: 26, width: 80, height: 5,
        fontSize: 11, fontFamily: 'Inter', color: '#706E6A',
        fontWeight: 'normal', textAlign: 'center', letterSpacing: '0.05em'
      },
      {
        id: 'cover-logo-text',
        type: 'text',
        content: 'FILMIFY WEDDINGS',
        x: 10, y: 35, width: 80, height: 6,
        fontSize: 22, fontFamily: 'Cormorant Garamond', color: '#606248',
        fontWeight: 'bold', textAlign: 'center', letterSpacing: '0.1em'
      },
      {
        id: 'cover-hero-image',
        type: 'image',
        content: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
        x: 15, y: 46, width: 70, height: 46
      }
    ]
  },
  // Page 2: About Us
  {
    pageIndex: 1,
    pageType: 'about',
    elements: [
      {
        id: 'about-heading',
        type: 'text',
        content: 'ABOUT US',
        x: 10, y: 15, width: 80, height: 10,
        fontSize: 28, fontFamily: 'Playfair Display', color: '#606248',
        fontWeight: 'bold', textAlign: 'center'
      },
      {
        id: 'about-quote',
        type: 'text',
        content: '“ Glowwed films strive to capture your love story in the most gracious way possible. All the memories of your event will be hand-picked with precision and made into films & photographs that you can cherish forever. ”',
        x: 12, y: 30, width: 76, height: 20,
        fontSize: 15, fontFamily: 'Cormorant Garamond', color: '#111111',
        fontWeight: 'normal', textAlign: 'center', fontStyle: 'italic'
      },
      {
        id: 'about-img-left',
        type: 'image',
        content: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=600',
        x: 10, y: 55, width: 38, height: 35
      },
      {
        id: 'about-img-right',
        type: 'image',
        content: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&q=80&w=600',
        x: 52, y: 55, width: 38, height: 35
      }
    ]
  },
  // Page 3: Functions & Deliverables
  {
    pageIndex: 2,
    pageType: 'functions',
    elements: [
      {
        id: 'functions-heading',
        type: 'text',
        content: 'FUNCTIONS',
        x: 10, y: 5, width: 80, height: 6,
        fontSize: 24, fontFamily: 'Playfair Display', color: '#606248',
        fontWeight: 'bold', textAlign: 'center'
      },
      {
        id: 'deliverables-heading',
        type: 'text',
        content: 'Deliverables',
        x: 10, y: 44, width: 80, height: 6,
        fontSize: 22, fontFamily: 'Cormorant Garamond', color: '#606248',
        fontWeight: 'bold', textAlign: 'center', fontStyle: 'italic'
      }
    ]
  },
  // Page 4: Early Booking Offer
  {
    pageIndex: 3,
    pageType: 'pricing',
    elements: [
      {
        id: 'pricing-heading',
        type: 'text',
        content: 'EARLY BOOKING OFFER',
        x: 10, y: 8, width: 80, height: 8,
        fontSize: 32, fontFamily: 'Playfair Display', color: '#606248',
        fontWeight: 'bold', textAlign: 'center'
      },
      {
        id: 'pricing-main-price',
        type: 'text',
        content: 'Rs 80,000/-',
        x: 20, y: 18, width: 60, height: 8,
        fontSize: 34, fontFamily: 'Playfair Display', color: '#606248',
        fontWeight: 'bold', textAlign: 'center'
      },
      {
        id: 'pricing-regular-price',
        type: 'text',
        content: 'Regular Quotation : Rs 1,00,000/-',
        x: 20, y: 28, width: 60, height: 5,
        fontSize: 16, fontFamily: 'Inter', color: '#706E6A',
        fontWeight: 'normal', textAlign: 'center'
      },
      {
        id: 'pricing-excludes',
        type: 'text',
        content: 'This excludes travel, accommodation, food & any add-on services.',
        x: 15, y: 35, width: 70, height: 4,
        fontSize: 10, fontFamily: 'Inter', color: '#706E6A',
        fontWeight: 'normal', textAlign: 'center'
      },
      {
        id: 'pricing-savings-banner',
        type: 'text',
        content: 'Save Rs 20,000 With Our Special Offer. The Special Offer Ends in the Next 7 days.',
        x: 10, y: 44, width: 80, height: 8,
        fontSize: 14, fontFamily: 'Inter', color: '#FFFFFF',
        fontWeight: 'bold', textAlign: 'center'
      },
      {
        id: 'pricing-palace-image',
        type: 'image',
        content: 'https://images.unsplash.com/photo-1546412414-8035e1776c9a?auto=format&fit=crop&q=80&w=800',
        x: 10, y: 56, width: 80, height: 28
      },
      {
        id: 'pricing-logo-text',
        type: 'text',
        content: 'FILMIFY WEDDINGS',
        x: 10, y: 88, width: 80, height: 5,
        fontSize: 18, fontFamily: 'Cormorant Garamond', color: '#606248',
        fontWeight: 'bold', textAlign: 'center', letterSpacing: '0.1em'
      }
    ]
  }
];

const PRESETS_LIST: Omit<QuotationPreset, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  {
    package_name: 'Gold Premium Package',
    data_payload: {
      pricing: { regular_price: 150000, offer_price: 120000 },
      functions: [
        { date: '4 JAN - HALDI', title: 'HALDI PRESTIGE', items: ['UltraHD Drone Coverage', 'Candid Wedding Team', 'Traditional Videography', 'Premium Retouching'] },
        { date: '4 JAN - SANGEET', title: 'SANGEET EXTRAVAGANZA', items: ['Live Event Streaming', 'Slow Motion Booth', 'Candid Snaps', '2 Cinematographers'] },
        { date: '5 JAN - WEDDING', title: 'GRAND WEDDING', items: ['2 Candid Photographers', '2 Cinematographers', '4K Cinematic Film', 'Raw Footage Drive'] }
      ],
      deliverables: [
        'All the UltraHD 4K Raw Photos delivered via private SSD.',
        '150 Premium Hand-Edited High Fidelity Digital Sheets.',
        '1x Cinematic Wedding Movie (30-40 mins) in Dolby Atmos.',
        '1x Interactive Instagram Reel Highlight teaser.',
        '2x Indigo Luxury Leather Photobooks (12x36 Diamond coated).',
        '1x Wooden Desktop Custom Calendar & Desktop Portrait Holder.',
        '2 Year High-Speed Cloud Storage Backup.'
      ]
    }
  },
  {
    package_name: 'Silver Essential Package',
    data_payload: {
      pricing: { regular_price: 100000, offer_price: 80000 },
      functions: [
        { date: '4 JAN - HALDI', title: 'HALDI ESSENTIAL', items: ['Traditional Photography', 'Candid Coverage', 'Raw File Delivery'] },
        { date: '5 JAN - WEDDING', title: 'WEDDING CLASSIC', items: ['Candid Photography', 'Traditional Video', '15 min Cinematic Highlights'] }
      ],
      deliverables: [
        'All high-resolution digital files via Google Drive.',
        '80 Premium Selected Hand-Edited Digital Sheets.',
        '1x Cinematic Wedding Highlights Film (10-15 mins).',
        '1x Leatherette Premium Photobook (12x18 sheets).',
        '1 Year Cloud Link Access.'
      ]
    }
  },
  {
    package_name: 'Platinum Regal Package',
    data_payload: {
      pricing: { regular_price: 250000, offer_price: 199000 },
      functions: [
        { date: '3 JAN - PRE-WEDDING', title: 'REGAL PRE-WEDDING', items: ['Drone Cinematic Shoot', 'Styling Consultation', '3 Signature Video Clips'] },
        { date: '4 JAN - HALDI', title: 'ROYAL HALDI', items: ['High-speed photography', 'Cinematic drone details', 'Candid coverage'] },
        { date: '4 JAN - SANGEET', title: 'SANGEET RHYTHM', items: ['Live performance multicam', 'Jimmy Jib Crane setup', 'Steadycam coverage'] },
        { date: '5 JAN - WEDDING', title: 'THE ROYAL BRIDE & GROOM', items: ['3 Candid Photographers', '3 Cinematographers', 'Same Day Edit Teaser', 'Crane & Drone'] }
      ],
      deliverables: [
        'Same-day wedding teaser delivered at Reception.',
        '250 Masterfully Retouched Editorial Sheets.',
        '1x Director Cut Wedding Feature Film (60 mins).',
        '3x Customized Premium Matte Hardcover Albums.',
        'All RAW files + edited files delivered on custom Regal Wooden USB Drive.',
        'Lifetime Cloud storage access & gallery hosting.',
        'Pre-Wedding Signature Video Played on Wedding Screen.'
      ]
    }
  }
];

export default function QuotationMakerPage() {
  // Global States
  const [pages, setPages] = useState<CanvasPage[]>(DEFAULT_TEMPLATE_CONFIG);
  const [selectedElement, setSelectedElement] = useState<{ pageIndex: number; elementId: string } | null>(null);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  
  // Header Meta States
  const [clientName, setClientName] = useState<string>('Prnay x Mayuri Studio Client');
  const [coupleNames, setCoupleNames] = useState<string>('PRNAY x MAYURI');
  
  // Finance States
  const [regularPrice, setRegularPrice] = useState<number>(100000);
  const [offerPrice, setOfferPrice] = useState<number>(80000);
  const [savings, setSavings] = useState<number>(20000);
  const [flashSavings, setFlashSavings] = useState<boolean>(false);

  // Dynamic Lists (Page 3)
  const [functions, setFunctions] = useState(DEFAULT_FUNCTIONS);
  const [deliverables, setDeliverables] = useState<string[]>(DEFAULT_DELIVERABLES);
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Database / Templates States
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [activeQuotationId, setActiveQuotationId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isImportingTemplate, setIsImportingTemplate] = useState<boolean>(false);
  const [accentColor, setAccentColor] = useState<string>('#606248');
  const [accentHoverColor, setAccentHoverColor] = useState<string>('#4d4e3a');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('editorial');

  // Image Swap Modal States
  const [showImageModal, setShowImageModal] = useState(false);
  const [targetImageElement, setTargetImageElement] = useState<{ pageIndex: number; elementId: string } | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Inline edit state for elements
  const [inlineEditingText, setInlineEditingText] = useState<string | null>(null);

  // Workspace scaling states
  const [scale, setScale] = useState(0.5);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Client Folder & Versions system states
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
  const [archiveDirectories, setArchiveDirectories] = useState<any[]>([]);
  const [selectedArchiveDirectory, setSelectedArchiveDirectory] = useState<any>(null);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);

  const fetchArchive = async (query = '') => {
    setIsArchiveLoading(true);
    try {
      const res = await fetch(`/api/quotations/versions?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.directories) {
        setArchiveDirectories(data.directories);
        if (selectedArchiveDirectory) {
          const matched = data.directories.find((d: any) => d.clientName === selectedArchiveDirectory.clientName);
          setSelectedArchiveDirectory(matched || null);
        }
      }
    } catch (err: any) {
      console.error('[Archive] Fetch error:', err);
    } finally {
      setIsArchiveLoading(false);
    }
  };

  const getPaginatedPages = (): CanvasPage[] => {
    // Page 0: Cover
    const coverPage = pages.find(p => p.pageType === 'cover') || pages[0] || DEFAULT_TEMPLATE_CONFIG[0];
    // Page 1: About
    const aboutPage = pages.find(p => p.pageType === 'about') || pages[1] || DEFAULT_TEMPLATE_CONFIG[1];
    // Page Last: Pricing
    const pricingPage = pages.find(p => p.pageType === 'pricing') || pages[pages.length - 1] || DEFAULT_TEMPLATE_CONFIG[3];

    const maxPageHeight = 720;
    const paginatedFuncPages: CanvasPage[] = [];

    let currentFuncs: typeof functions = [];
    let currentHeight = 0;
    let pageIdxCounter = 2;

    functions.forEach(func => {
      const cardHeight = 45 + (func.items.length * 18) + 20;

      if (currentHeight + cardHeight > maxPageHeight && currentFuncs.length > 0) {
        paginatedFuncPages.push({
          pageIndex: pageIdxCounter++,
          pageType: 'functions',
          elements: [
            {
              id: `functions-heading-${pageIdxCounter}`,
              type: 'text',
              content: 'FUNCTIONS (CONTINUED)',
              x: 10, y: 5, width: 80, height: 6,
              fontSize: 24, fontFamily: 'Playfair Display', color: accentColor,
              fontWeight: 'bold', textAlign: 'center'
            }
          ],
          paginatedFuncs: [...currentFuncs],
          paginatedDelivs: [],
          showDeliverables: false
        });
        currentFuncs = [];
        currentHeight = 0;
      }

      currentFuncs.push(func);
      currentHeight += cardHeight;
    });

    const deliverablesHeaderHeight = 40;
    const deliverablesContentHeight = deliverables.length * 20;
    const totalDeliverablesHeight = deliverablesHeaderHeight + deliverablesContentHeight;

    if (currentHeight + totalDeliverablesHeight <= maxPageHeight) {
      paginatedFuncPages.push({
        pageIndex: pageIdxCounter++,
        pageType: 'functions',
        elements: [
          {
            id: `functions-heading-${pageIdxCounter}`,
            type: 'text',
            content: paginatedFuncPages.length === 0 ? 'FUNCTIONS' : 'FUNCTIONS (CONTINUED)',
            x: 10, y: 5, width: 80, height: 6,
            fontSize: 24, fontFamily: 'Playfair Display', color: accentColor,
            fontWeight: 'bold', textAlign: 'center'
          },
          {
            id: `deliverables-heading-${pageIdxCounter}`,
            type: 'text',
            content: 'Deliverables',
            x: 10, y: 44, width: 80, height: 6,
            fontSize: 22, fontFamily: 'Cormorant Garamond', color: accentColor,
            fontWeight: 'bold', textAlign: 'center', fontStyle: 'italic'
          }
        ],
        paginatedFuncs: [...currentFuncs],
        paginatedDelivs: [...deliverables],
        showDeliverables: true
      });
    } else {
      if (currentFuncs.length > 0) {
        paginatedFuncPages.push({
          pageIndex: pageIdxCounter++,
          pageType: 'functions',
          elements: [
            {
              id: `functions-heading-${pageIdxCounter}`,
              type: 'text',
              content: paginatedFuncPages.length === 0 ? 'FUNCTIONS' : 'FUNCTIONS (CONTINUED)',
              x: 10, y: 5, width: 80, height: 6,
              fontSize: 24, fontFamily: 'Playfair Display', color: accentColor,
              fontWeight: 'bold', textAlign: 'center'
            }
          ],
          paginatedFuncs: [...currentFuncs],
          paginatedDelivs: [],
          showDeliverables: false
        });
      }
      paginatedFuncPages.push({
        pageIndex: pageIdxCounter++,
        pageType: 'functions',
        elements: [
          {
            id: `deliverables-heading-${pageIdxCounter}`,
            type: 'text',
            content: 'Deliverables',
            x: 10, y: 5, width: 80, height: 6,
            fontSize: 22, fontFamily: 'Cormorant Garamond', color: accentColor,
            fontWeight: 'bold', textAlign: 'center', fontStyle: 'italic'
          }
        ],
        paginatedFuncs: [],
        paginatedDelivs: [...deliverables],
        showDeliverables: true
      });
    }

    const updatedPricingPage = {
      ...pricingPage,
      pageIndex: pageIdxCounter
    };

    return [
      { ...coverPage, pageIndex: 0 },
      { ...aboutPage, pageIndex: 1 },
      ...paginatedFuncPages,
      updatedPricingPage
    ];
  };

  const renderedPages = getPaginatedPages();

  // Dynamic flow restriction: auto-fit active index to paginated page count
  useEffect(() => {
    if (activePageIndex >= renderedPages.length) {
      setActivePageIndex(Math.max(0, renderedPages.length - 1));
    }
  }, [renderedPages.length, activePageIndex]);

  // Keep pages state in sync with dynamic paginate layout configurations
  useEffect(() => {
    const coverPage = pages.find(p => p.pageType === 'cover') || DEFAULT_TEMPLATE_CONFIG[0];
    const aboutPage = pages.find(p => p.pageType === 'about') || DEFAULT_TEMPLATE_CONFIG[1];
    const pricingPage = pages.find(p => p.pageType === 'pricing') || DEFAULT_TEMPLATE_CONFIG[3];

    const currentPaginated = getPaginatedPages();
    
    // Check deep elements changes or length mismatches
    const currentSerialized = JSON.stringify(pages.map(p => ({
      type: p.pageType,
      funcs: p.paginatedFuncs,
      delivs: p.paginatedDelivs,
      elements: p.elements
    })));
    const newSerialized = JSON.stringify(currentPaginated.map(p => ({
      type: p.pageType,
      funcs: p.paginatedFuncs,
      delivs: p.paginatedDelivs,
      elements: p.elements
    })));

    if (currentSerialized !== newSerialized) {
      setPages(currentPaginated);
    }
  }, [functions, deliverables, accentColor]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      if (workspaceRef.current) {
        const parent = workspaceRef.current;
        const parentWidth = parent.clientWidth - 48;
        const parentHeight = parent.clientHeight - 48;
        
        const baseWidth = 794;
        const baseHeight = 1123;
        
        const scaleX = parentWidth / baseWidth;
        const scaleY = parentHeight / baseHeight;
        
        const newScale = Math.min(scaleX, scaleY, 1);
        setScale(newScale);
      }
    };

    handleResize();
    
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (workspaceRef.current) {
      resizeObserver.observe(workspaceRef.current);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [activePageIndex]);

  // Preset Injections
  const [presets, setPresets] = useState<QuotationPreset[]>([]);

  // Initialize data and load from Supabase or localStorage
  useEffect(() => {
    fetchQuotationsAndPresets();
  }, []);

  // Update savings when pricing changes + trigger flash animation
  useEffect(() => {
    const computedSavings = regularPrice - offerPrice;
    setSavings(computedSavings);
    
    // Trigger CSS flash animation
    setFlashSavings(true);
    const timer = setTimeout(() => setFlashSavings(false), 800);

    // Update pricing text in page elements if they exist
    setPages(prevPages => 
      prevPages.map(page => {
        if (page.pageType === 'pricing') {
          return {
            ...page,
            elements: page.elements.map(el => {
              if (el.id === 'pricing-main-price') {
                return { ...el, content: `Rs ${offerPrice.toLocaleString()}/-` };
              }
              if (el.id === 'pricing-regular-price') {
                return { ...el, content: `Regular Quotation : Rs ${regularPrice.toLocaleString()}/-` };
              }
              if (el.id === 'pricing-savings-banner') {
                return { ...el, content: `Save Rs ${computedSavings.toLocaleString()} With Our Special Offer. The Special Offer Ends in the Next 7 days.` };
              }
              return el;
            })
          };
        }
        return page;
      })
    );

    return () => clearTimeout(timer);
  }, [regularPrice, offerPrice]);

  // Update couple names in Page 1 cover when the state updates
  useEffect(() => {
    setPages(prevPages => 
      prevPages.map(page => {
        if (page.pageIndex === 0) {
          return {
            ...page,
            elements: page.elements.map(el => {
              if (el.id === 'cover-couple-names') {
                return { ...el, content: coupleNames.toUpperCase() };
              }
              return el;
            })
          };
        }
        return page;
      })
    );
  }, [coupleNames]);

  // Fetch quotations and presets from Supabase
  const fetchQuotationsAndPresets = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Quotations
      const { data: qData, error: qError } = await supabase
        .from('quotations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (qError) throw qError;
      if (qData) setQuotations(qData);

      // 2. Fetch Presets
      const { data: pData, error: pError } = await supabase
        .from('quotation_presets')
        .select('*');

      if (pError) throw pError;
      if (pData && pData.length > 0) {
        setPresets(pData);
      } else {
        // Mock presets if none in db
        setPresets(PRESETS_LIST.map((p, idx) => ({
          id: `preset-${idx}`,
          user_id: 'default',
          package_name: p.package_name,
          data_payload: p.data_payload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })));
      }
    } catch (err: any) {
      console.warn('Supabase fetch issue, utilizing local fallback state. Details:', err.message);
      // Load from localStorage if present
      const savedLocal = localStorage.getItem('fw_quotations');
      if (savedLocal) {
        setQuotations(JSON.parse(savedLocal));
      }
      // Populate defaults
      setPresets(PRESETS_LIST.map((p, idx) => ({
        id: `preset-${idx}`,
        user_id: 'default',
        package_name: p.package_name,
        data_payload: p.data_payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })));
    } finally {
      setIsLoading(false);
    }
  };

  // Select a quotation to edit
  const loadQuotation = (quotation: Quotation) => {
    setActiveQuotationId(quotation.id);
    setClientName(quotation.client_name);
    setCoupleNames(quotation.couple_names || '');
    setPages(quotation.canvas_data);
    setRegularPrice(quotation.pricing_summary.regular_price);
    setOfferPrice(quotation.pricing_summary.offer_price);
    setSavings(quotation.pricing_summary.savings);
    
    // Parse dynamic components from state if available
    const funcPage = quotation.canvas_data.find(p => p.pageType === 'functions');
    if (funcPage) {
      // Re-hydrate functions and deliverables
      const funcsEl = funcPage.elements.find(el => el.id === 'functions-grid-container');
      if (funcsEl && funcsEl.gridItems) {
        // Group items back
        const grouped: any[] = [];
        funcsEl.gridItems.forEach(item => {
          let group = grouped.find(g => g.title === item.label);
          if (!group) {
            let name = 'HALDI';
            let date = '2026-01-04';
            let time = '10:00';
            let hours = '4 Hours Session';
            
            const parts = (item.label || '').split(' | ');
            if (parts.length === 4) {
              date = parts[0];
              time = parts[1];
              hours = parts[2];
              name = parts[3];
            } else if ((item.label || '').includes(' - ')) {
              const legacyParts = (item.label || '').split(' - ');
              name = (legacyParts[1] || 'HALDI').trim().toUpperCase();
              date = legacyParts[0] || '2026-01-04';
            } else if (item.label) {
              name = item.label.toUpperCase();
            }

            group = { 
              id: `func-${grouped.length}-${Date.now()}`, 
              title: item.label || '', 
              name,
              date,
              time,
              hours,
              items: [] 
            };
            grouped.push(group);
          }
          group.items.push(item.content);
        });
        if (grouped.length > 0) setFunctions(grouped);
      }
      
      const delivsEl = funcPage.elements.find(el => el.id === 'deliverables-list-container');
      if (delivsEl && delivsEl.gridItems) {
        setDeliverables(delivsEl.gridItems.map(item => item.content));
      }
    }
    
    showToast('Quotation loaded successfully!', 'success');
  };

  const handleTemplateImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingTemplate(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result;
        try {
          const res = await fetch('/api/quotations/import-template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64data, filename: file.name })
          });
          const data = await res.json();
          if (data.success) {
            setPages(data.pages);
            setCoupleNames(data.couple_names);
            setClientName(data.client_name);
            setRegularPrice(data.pricing_summary.regular_price);
            setOfferPrice(data.pricing_summary.offer_price);
            setSavings(data.pricing_summary.savings);
            showToast('AI Importer successfully extracted design layout and locked template components!', 'success');
          } else {
            showToast(data.error || 'Import failed', 'error');
          }
        } catch (err: any) {
          showToast(err.message || 'Import failed', 'error');
        } finally {
          setIsImportingTemplate(false);
        }
      };
    } catch (err: any) {
      showToast(err.message || 'Import failed', 'error');
      setIsImportingTemplate(false);
    }
  };

  // Save current workspace state to database
  const saveQuotation = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Format Page 3 dynamic elements into page state before saving
    const updatedPages = pages.map((page, idx) => {
      if (idx === 0) {
        return {
          ...page,
          elements: page.elements.map(el => {
            if (el.id === 'cover-couple-names') {
              return { ...el, content: coupleNames };
            }
            return el;
          })
        };
      }
      if (page.pageType === 'functions') {
        const titleEl = page.elements.find(el => el.id === 'functions-heading') || {
          id: 'functions-heading',
          type: 'text' as const,
          content: 'FUNCTIONS',
          x: 10, y: 5, width: 80, height: 6,
          fontSize: 24, fontFamily: 'Playfair Display', color: '#606248',
          fontWeight: 'bold' as const, textAlign: 'center' as const
        };
        const delivTitleEl = page.elements.find(el => el.id === 'deliverables-heading') || {
          id: 'deliverables-heading',
          type: 'text' as const,
          content: 'Deliverables',
          x: 10, y: 44, width: 80, height: 6,
          fontSize: 22, fontFamily: 'Cormorant Garamond', color: '#606248',
          fontWeight: 'bold' as const, textAlign: 'center' as const, fontStyle: 'italic' as const
        };

        // Custom structure container elements to persist inline lists
        const functionsContainer: CanvasElement = {
          id: 'functions-grid-container',
          type: 'shape',
          content: 'functions-grid',
          x: 10, y: 14, width: 80, height: 26,
          isGridContainer: true,
          gridItems: functions.flatMap(f => f.items.map((item, idx) => ({
            id: `${f.id}-item-${idx}`,
            content: item,
            label: `${f.date || '2026-01-04'} | ${f.time || '10:00'} | ${f.hours || '4 Hours Session'} | ${f.name || 'HALDI'}`
          })))
        };

        const deliverablesContainer: CanvasElement = {
          id: 'deliverables-list-container',
          type: 'shape',
          content: 'deliverables-list',
          x: 10, y: 52, width: 80, height: 42,
          isGridContainer: true,
          gridItems: deliverables.map((item, idx) => ({
            id: `deliv-item-${idx}`,
            content: item
          }))
        };

        return {
          ...page,
          elements: [titleEl, functionsContainer, delivTitleEl, deliverablesContainer]
        };
      }
      if (page.pageType === 'pricing') {
        return {
          ...page,
          elements: page.elements.map(el => {
            if (el.id === 'pricing-main-price') {
              return { ...el, content: `Rs ${offerPrice.toLocaleString()}/-` };
            }
            if (el.id === 'pricing-regular-price') {
              return { ...el, content: `Regular Quotation : Rs ${regularPrice.toLocaleString()}/-` };
            }
            if (el.id === 'pricing-savings-banner') {
              return { ...el, content: `Save Rs ${savings.toLocaleString()} With Our Special Offer. The Special Offer Ends in the Next 7 days.` };
            }
            return el;
          })
        };
      }
      return page;
    });

    const quotationPayload = {
      client_name: clientName,
      couple_names: coupleNames,
      current_page_index: activePageIndex,
      canvas_data: updatedPages,
      pricing_summary: {
        regular_price: regularPrice,
        offer_price: offerPrice,
        savings: savings
      }
    };

    // Trigger local filesystem versions save (Canva folder engine)
    try {
      const versionRes = await fetch('/api/quotations/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName,
          coupleNames: coupleNames,
          canvasData: updatedPages,
          pricingSummary: {
            regular_price: regularPrice,
            offer_price: offerPrice,
            savings: savings
          },
          quotationId: activeQuotationId
        })
      });
      const versionData = await versionRes.json();
      if (versionData.success) {
        console.log(`[File Engine] Saved version: ${versionData.filePath}`);
      }
    } catch (verErr: any) {
      console.warn('[File Engine] Error saving version:', verErr.message);
    }

    try {
      let result;
      if (activeQuotationId) {
        // Update
        result = await supabase
          .from('quotations')
          .update(quotationPayload)
          .eq('id', activeQuotationId)
          .select();
      } else {
        // Insert
        result = await supabase
          .from('quotations')
          .insert([quotationPayload])
          .select();
      }

      if (result.error) throw result.error;

      showToast('Quotation saved successfully in Supabase!', 'success');
      fetchQuotationsAndPresets();
      if (result.data && result.data[0]) {
        setActiveQuotationId(result.data[0].id);
      }
    } catch (err: any) {
      console.warn('Could not save to remote database. Storing in browser local storage instead.', err.message);
      
      // Save locally
      const savedLocal = localStorage.getItem('fw_quotations');
      let localList: Quotation[] = savedLocal ? JSON.parse(savedLocal) : [];
      
      if (activeQuotationId) {
        localList = localList.map(q => q.id === activeQuotationId ? {
          ...q,
          ...quotationPayload,
          updated_at: new Date().toISOString()
        } : q);
      } else {
        const newId = `local-quotation-${Date.now()}`;
        const newLocalQuote: Quotation = {
          id: newId,
          user_id: 'local-user',
          client_name: clientName,
          couple_names: coupleNames,
          current_page_index: activePageIndex,
          canvas_data: updatedPages,
          pricing_summary: {
            regular_price: regularPrice,
            offer_price: offerPrice,
            savings: savings
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        localList.unshift(newLocalQuote);
        setActiveQuotationId(newId);
      }
      
      localStorage.setItem('fw_quotations', JSON.stringify(localList));
      setQuotations(localList);
      showToast('Saved to Local Browser Storage (Database unreachable)', 'info');
    } finally {
      setIsSaving(false);
    }
  };

  // Create new blank quotation
  const resetToNew = () => {
    setActiveQuotationId(null);
    setClientName('New Client Quotation');
    setCoupleNames('PRNAY x MAYURI');
    setPages(DEFAULT_TEMPLATE_CONFIG);
    setRegularPrice(100000);
    setOfferPrice(80000);
    setFunctions(DEFAULT_FUNCTIONS);
    setDeliverables(DEFAULT_DELIVERABLES);
    setSelectedElement(null);
    showToast('Workspace reset to clean template cover.', 'info');
  };

  // Mutation handler for selected canvas element
  const updateSelectedElement = (key: string, value: any) => {
    if (!selectedElement) return;
    setPages(prevPages => 
      prevPages.map((page, pIdx) => {
        if (pIdx === selectedElement.pageIndex) {
          return {
            ...page,
            elements: page.elements.map(el => {
              if (el.id === selectedElement.elementId) {
                return { ...el, [key]: value };
              }
              return el;
            })
          };
        }
        return page;
      })
    );
  };

  // Presets Package Injector
  const injectPresetPackage = (preset: QuotationPreset) => {
    const { pricing, functions: prFuncs, deliverables: prDelivs } = preset.data_payload;

    if (pricing) {
      setRegularPrice(pricing.regular_price);
      setOfferPrice(pricing.offer_price);
    }

    if (prFuncs && prFuncs.length > 0) {
      setFunctions(prFuncs.map((f, i) => {
        let name = 'HALDI';
        let date = '2026-01-04';
        let time = '10:00';
        let hours = '4 Hours Session';
        
        const titleStr = f.date || '';
        const parts = titleStr.split(' | ');
        if (parts.length === 4) {
          date = parts[0];
          time = parts[1];
          hours = parts[2];
          name = parts[3];
        } else if (titleStr.includes(' - ')) {
          const legacyParts = titleStr.split(' - ');
          name = (legacyParts[1] || 'HALDI').trim().toUpperCase();
          date = legacyParts[0] || '2026-01-04';
        } else if (titleStr) {
          name = titleStr.toUpperCase();
        }

        return {
          id: `func-preset-${i}-${Date.now()}`,
          title: `${date} | ${time} | ${hours} | ${name}`,
          name,
          date,
          time,
          hours,
          items: f.items || []
        };
      }));
    }

    if (prDelivs && prDelivs.length > 0) {
      setDeliverables(prDelivs);
    }

    showToast(`Injected '${preset.package_name}' package elements into Page 3 and Page 4!`, 'success');
  };

  // Element Selection Handler
  const handleElementClick = (e: React.MouseEvent, pageIndex: number, elementId: string) => {
    e.stopPropagation();
    setSelectedElement({ pageIndex, elementId });
  };

  // Inline text edit saving
  const handleInlineTextSave = (pageIndex: number, elementId: string, newText: string) => {
    setPages(prevPages => 
      prevPages.map((page, pIdx) => {
        if (pIdx === pageIndex) {
          return {
            ...page,
            elements: page.elements.map(el => {
              if (el.id === elementId) {
                return { ...el, content: newText };
              }
              return el;
            })
          };
        }
        return page;
      })
    );
    setInlineEditingText(null);
  };

  // Image Asset Uploader trigger
  const triggerImageSwap = (pageIndex: number, elementId: string, currentUrl: string) => {
    setTargetImageElement({ pageIndex, elementId });
    setImageUrlInput(currentUrl);
    setShowImageModal(true);
  };

  // Save selected image swapping
  const saveImageSwap = () => {
    if (!targetImageElement || !imageUrlInput) return;
    
    setPages(prevPages => 
      prevPages.map((page, pIdx) => {
        if (pIdx === targetImageElement.pageIndex) {
          return {
            ...page,
            elements: page.elements.map(el => {
              if (el.id === targetImageElement.elementId) {
                return { ...el, content: imageUrlInput };
              }
              return el;
            })
          };
        }
        return page;
      })
    );

    setShowImageModal(false);
    setTargetImageElement(null);
    setImageUrlInput('');
    showToast('Image swapped successfully without breaking dimensions!', 'success');
  };

  // File Upload directly to Supabase storage bucket
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetImageElement) return;

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `quotation-assets/${fileName}`;

    try {
      const { data, error } = await supabase.storage
        .from('quotations')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('quotations')
        .getPublicUrl(filePath);

      setImageUrlInput(publicUrl);
      showToast('Image uploaded successfully to Supabase Storage!', 'success');
    } catch (err: any) {
      console.warn('Storage upload error. Creating local object URL for instant preview.', err.message);
      // Create local URL for preview
      const localUrl = URL.createObjectURL(file);
      setImageUrlInput(localUrl);
      showToast('Local preview generated (Storage bucket unavailable)', 'info');
    } finally {
      setIsUploading(false);
    }
  };

  // Toast notifications helpers
  const showToast = (msg: string, type: 'success' | 'info' | 'error') => {
    if (type === 'success') {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else if (type === 'error') {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    } else {
      setSuccessMessage(`ℹ️ ${msg}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Export all pages to a high-fidelity A4 PDF brochure
  const exportToPdf = async () => {
    setIsExporting(true);
    showToast('Preparing high-fidelity PDF brochure, please wait...', 'info');

    try {
      // 1. Wait for custom web fonts to be completely ready
      if (typeof window !== 'undefined' && document.fonts) {
        await document.fonts.ready;
      }
      
      // 2. Dynamically import html2canvas and jspdf to prevent Next.js SSR build failures
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      // 3. Create a portrait A4 PDF document
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // 4. Capture each page sequentially from offscreen A4 container
      for (let i = 0; i < pages.length; i++) {
        const pageElement = document.getElementById(`pdf-page-${i}`);
        if (!pageElement) continue;

        // Allow layout to stabilize
        await new Promise(resolve => setTimeout(resolve, 200));

        const canvas = await html2canvas(pageElement, {
          scale: 2, // 2x scale for premium vector/raster clarity
          useCORS: true, // critical for remote images (Unsplash / Supabase storage)
          allowTaint: true,
          logging: false,
          backgroundColor: '#FAF6F0'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        if (i > 0) {
          pdf.addPage();
        }

        // Fit page image to exact A4 dimensions: 210mm x 297mm
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }

      // 5. Download compiled PDF
      const formattedClientName = clientName
        .trim()
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/_+/g, '_')
        .toLowerCase();
      const filename = `${formattedClientName || 'quotation'}_brochure.pdf`;
      pdf.save(filename);
      showToast('PDF brochure exported successfully!', 'success');
    } catch (err: any) {
      console.error('PDF generation failure:', err);
      showToast(`PDF Export failed: ${err.message || err}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Helpers for inline edit items on Page 3 (Functions)
  const addFunctionItem = (funcId: string) => {
    setFunctions(prev => prev.map(f => {
      if (f.id === funcId) {
        return { ...f, items: [...f.items, 'New Function Deliverable Detail'] };
      }
      return f;
    }));
  };

  const addRequirementToFunction = (funcId: string, req: string) => {
    setFunctions(prev => prev.map(f => {
      if (f.id === funcId) {
        if (f.items.includes(req)) return f;
        const merged = { ...f, items: [...f.items, req] };
        merged.title = `${merged.date} | ${merged.time} | ${merged.hours} | ${merged.name}`;
        return merged;
      }
      return f;
    }));
  };

  const deleteFunctionItem = (funcId: string, itemIndex: number) => {
    setFunctions(prev => prev.map(f => {
      if (f.id === funcId) {
        const merged = { ...f, items: f.items.filter((_, idx) => idx !== itemIndex) };
        merged.title = `${merged.date} | ${merged.time} | ${merged.hours} | ${merged.name}`;
        return merged;
      }
      return f;
    }));
  };

  const editFunctionItem = (funcId: string, itemIndex: number, newValue: string) => {
    setFunctions(prev => prev.map(f => {
      if (f.id === funcId) {
        const updatedItems = [...f.items];
        updatedItems[itemIndex] = newValue;
        const merged = { ...f, items: updatedItems };
        merged.title = `${merged.date} | ${merged.time} | ${merged.hours} | ${merged.name}`;
        return merged;
      }
      return f;
    }));
  };

  const updateFunctionDetails = (funcId: string, updates: Partial<typeof DEFAULT_FUNCTIONS[0]>) => {
    setFunctions(prev => prev.map(f => {
      if (f.id === funcId) {
        const merged = { ...f, ...updates };
        merged.title = `${merged.date} | ${merged.time} | ${merged.hours} | ${merged.name}`;
        return merged;
      }
      return f;
    }));
  };

  const addNewFunctionCard = () => {
    const newId = `func-new-${Date.now()}`;
    const newFunc = {
      id: newId,
      title: '2026-01-06 | 10:00 | 4 Hours Session | NEW EVENT',
      name: 'NEW EVENT',
      date: '2026-01-06',
      time: '10:00',
      hours: '4 Hours Session',
      items: ['Candid Photography']
    };
    setFunctions(prev => [...prev, newFunc]);
  };

  const deleteFunctionCard = (funcId: string) => {
    setFunctions(prev => prev.filter(f => f.id !== funcId));
  };

  // Helpers for deliverables list items (Page 3)
  const addDeliverableItem = () => {
    setDeliverables(prev => [...prev, 'New deliverable detail description']);
  };

  const deleteDeliverableItem = (idx: number) => {
    setDeliverables(prev => prev.filter((_, i) => i !== idx));
  };

  const editDeliverableItem = (idx: number, newValue: string) => {
    setDeliverables(prev => {
      const copy = [...prev];
      copy[idx] = newValue;
      return copy;
    });
  };

  // Get active selected element properties
  const getSelectedElementProps = () => {
    if (!selectedElement) return null;
    const page = pages[selectedElement.pageIndex];
    if (!page) return null;
    return page.elements.find(el => el.id === selectedElement.elementId) || null;
  };

  const activeElement = getSelectedElementProps();

  return (
    <div className="flex h-screen bg-[#F3EFEA] text-zinc-900 overflow-hidden font-sans">
      {/* Dynamic Theme Color Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .theme-accent-text { color: ${accentColor} !important; }
        .theme-accent-bg { background-color: ${accentColor} !important; }
        .theme-accent-border { border-color: ${accentColor} !important; }
        .theme-accent-hover-bg:hover { background-color: ${accentHoverColor} !important; }
        .theme-accent-hover-text:hover { color: ${accentHoverColor} !important; }
        .theme-accent-focus:focus { border-color: ${accentColor} !important; --tw-ring-color: ${accentColor} !important; }
        .theme-accent-stroke { stroke: ${accentColor} !important; }
      `}} />
      
      {/* Toast Notifications */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-[99999] flex items-center gap-2.5 bg-emerald-950/90 text-emerald-300 border border-emerald-500/30 px-5 py-3.5 rounded-xl shadow-2xl backdrop-blur-md animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="fixed bottom-6 right-6 z-[99999] flex items-center gap-2.5 bg-rose-950/90 text-rose-300 border border-rose-500/30 px-5 py-3.5 rounded-xl shadow-2xl backdrop-blur-md animate-bounce">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          <span className="text-sm font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* LEFT SIDEBAR PANEL: SETTINGS & CONTROLS */}
      <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col justify-between flex-shrink-0 text-zinc-300">
        
        {/* Sidebar Header */}
        <div className="p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-[#D4AF37]" />
            <h1 className="text-lg font-bold tracking-tight text-white font-serif">Quotation Engine</h1>
          </div>
          <p className="text-xs text-zinc-500">Design premium digital canvas documents for clients.</p>
        </div>

        {/* Workspace Form inputs */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
          
          {/* Saved Quotations List */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <Database className="w-3.5 h-3.5" />
              Saved Quotations ({quotations.length})
            </label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {quotations.map(q => (
                <button
                  key={q.id}
                  onClick={() => loadQuotation(q)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition flex flex-col gap-0.5 border ${
                    activeQuotationId === q.id 
                      ? 'bg-[#606248]/30 border-[#606248] text-white' 
                      : 'bg-zinc-800/40 border-zinc-800 hover:bg-zinc-800 text-zinc-400'
                  }`}
                >
                  <span className="font-semibold truncate">{q.client_name}</span>
                  <span className="text-[10px] text-zinc-500 flex items-center justify-between">
                    <span>{q.couple_names || 'No names'}</span>
                    <span>{new Date(q.updated_at).toLocaleDateString()}</span>
                  </span>
                </button>
              ))}
              {quotations.length === 0 && (
                <p className="text-[11px] text-zinc-600 italic py-1">No saved quotations found.</p>
              )}
              <button 
                onClick={resetToNew} 
                className="w-full text-center py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg font-medium transition flex items-center justify-center gap-1.5 border border-zinc-700/50"
              >
                <Plus className="w-3.5 h-3.5" />
                Create New Quotation
              </button>
              <button 
                onClick={() => {
                  fetchArchive();
                  setShowArchiveModal(true);
                }}
                className="w-full text-center py-2 mt-1 bg-[#606248]/15 hover:bg-[#606248]/30 text-white text-xs rounded-lg font-medium transition flex items-center justify-center gap-1.5 border border-[#606248]/30"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#D4AF37]" />
                Open Archive Dashboard
              </button>
            </div>
          </div>

          <hr className="border-zinc-800" />

          {/* Template & Accent Theme Selection */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-2">
              <Layout className="w-3.5 h-3.5 text-[#D4AF37]" />
              Template & Accent Theme
            </h3>
            
            {/* Base Layout Template Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400 font-semibold">Choose Layout Template</label>
              <select
                value={selectedTemplateId}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedTemplateId(val);
                  showToast(`Switched starting layout template to ${val === 'editorial' ? 'Filmify Editorial' : 'Minimalist Clean'}.`, 'success');
                }}
                className="w-full bg-zinc-850 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#606248] transition cursor-pointer font-sans"
              >
                <option value="editorial">Filmify Premium Editorial (Monogram & Palace)</option>
                <option value="minimalist">Minimalist Clean Proposal (Modern & Spaced)</option>
              </select>
            </div>

            {/* Accent Theme Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-400 font-semibold">Select Accent Theme</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => { setAccentColor('#5D5B3F'); setAccentHoverColor('#4D4B34'); }}
                  className={`border p-2 rounded-lg flex items-center space-x-2 transition ${
                    accentColor === '#5D5B3F' ? 'bg-[#5D5B3F]/20 border-[#5D5B3F]' : 'bg-zinc-800/40 border-zinc-800 hover:bg-zinc-850'
                  }`}
                >
                  <span className="h-3 w-3 rounded-full bg-[#5D5B3F] inline-block shrink-0"></span>
                  <span className="text-[10px] font-semibold text-zinc-300 font-sans">Olive Garden</span>
                </button>
                <button 
                  onClick={() => { setAccentColor('#8D7249'); setAccentHoverColor('#735C3A'); }}
                  className={`border p-2 rounded-lg flex items-center space-x-2 transition ${
                    accentColor === '#8D7249' ? 'bg-[#8D7249]/20 border-[#8D7249]' : 'bg-zinc-800/40 border-zinc-800 hover:bg-zinc-850'
                  }`}
                >
                  <span className="h-3 w-3 rounded-full bg-[#8D7249] inline-block shrink-0"></span>
                  <span className="text-[10px] font-semibold text-zinc-300 font-sans">Royal Gold</span>
                </button>
                <button 
                  onClick={() => { setAccentColor('#8C4E4E'); setAccentHoverColor('#703D3D'); }}
                  className={`border p-2 rounded-lg flex items-center space-x-2 transition ${
                    accentColor === '#8C4E4E' ? 'bg-[#8C4E4E]/20 border-[#8C4E4E]' : 'bg-zinc-800/40 border-zinc-800 hover:bg-zinc-850'
                  }`}
                >
                  <span className="h-3 w-3 rounded-full bg-[#8C4E4E] inline-block shrink-0"></span>
                  <span className="text-[10px] font-semibold text-zinc-300 font-sans">Crimson Blush</span>
                </button>
                <button 
                  onClick={() => { setAccentColor('#1E1E1E'); setAccentHoverColor('#0A0A0A'); }}
                  className={`border p-2 rounded-lg flex items-center space-x-2 transition ${
                    accentColor === '#1E1E1E' ? 'bg-[#1E1E1E]/20 border-[#1E1E1E]' : 'bg-zinc-800/40 border-zinc-800 hover:bg-zinc-850'
                  }`}
                >
                  <span className="h-3 w-3 rounded-full bg-[#1E1E1E] inline-block shrink-0"></span>
                  <span className="text-[10px] font-semibold text-zinc-300 font-sans">Obsidian Black</span>
                </button>
              </div>
            </div>
          </div>

          <hr className="border-zinc-800" />

          {/* AI Template Importer */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              AI Design Template Importer
            </h3>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Upload a Canva PDF export or high-resolution template image. Our AI Vision model will extract the layouts, dimensions, typography, and lock the design structure while exposing dynamic placeholders.
            </p>
            <div className="relative border border-dashed border-zinc-700 hover:border-[#606248] rounded-xl p-4 transition bg-zinc-950/40 text-center cursor-pointer group">
              {isImportingTemplate ? (
                <div className="flex flex-col items-center justify-center py-2.5 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#D4AF37]" />
                  <span className="text-[11px] text-zinc-400 font-medium">AI Vision analyzing design...</span>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center py-1 gap-1">
                  <Upload className="w-6 h-6 text-zinc-500 group-hover:text-[#D4AF37] transition font-bold" />
                  <span className="text-[11px] text-zinc-400 font-semibold group-hover:text-white transition mt-1.5">Upload Template Capture</span>
                  <span className="text-[9px] text-zinc-600">Supports PDF, PNG, JPG</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleTemplateImport}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <hr className="border-zinc-800" />

          {/* Client Settings */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <Layout className="w-3.5 h-3.5" />
              Client Info & Meta
            </h3>
            
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400">Save Title / Client Name</label>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full bg-zinc-850 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#606248] transition"
                placeholder="e.g. Sushant x Shweta Studio Draft"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400">Couple Names (Page 1 Header)</label>
              <input
                type="text"
                value={coupleNames}
                onChange={e => setCoupleNames(e.target.value)}
                className="w-full bg-zinc-850 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#606248] transition"
                placeholder="e.g. SUSHANT x SHWETA"
              />
            </div>
          </div>

          <hr className="border-zinc-800" />

          {/* Preset Packages */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              1-Click Package Injection
            </h3>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Select a pre-designed photography tier package to instantly load functions, pricing, and deliverables.
            </p>
            <div className="space-y-2 pt-1">
              {presets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => injectPresetPackage(preset)}
                  className="w-full bg-zinc-800 hover:bg-[#606248]/25 hover:border-[#606248] border border-zinc-700/60 p-3 rounded-xl transition text-left group flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-white group-hover:text-[#D4AF37] transition">{preset.package_name}</h4>
                    <span className="text-[10px] text-zinc-500">
                      Offer: Rs {preset.data_payload.pricing?.offer_price.toLocaleString()}/-
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>

          <hr className="border-zinc-800" />

          {/* Pricing Controls */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5" />
              Finance Controller
            </h3>
            
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400">Regular Price (Rs)</label>
              <input
                type="number"
                value={regularPrice}
                onChange={e => setRegularPrice(Number(e.target.value))}
                className="w-full bg-zinc-850 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#606248] transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400">Special Offer Price (Rs)</label>
              <input
                type="number"
                value={offerPrice}
                onChange={e => setOfferPrice(Number(e.target.value))}
                className="w-full bg-zinc-850 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#606248] transition"
              />
            </div>
            
            <div className={`p-3 rounded-lg flex flex-col gap-0.5 border ${
              flashSavings 
                ? 'bg-amber-950/40 border-[#D4AF37] text-white animate-pulse' 
                : 'bg-zinc-850 border-zinc-800 text-zinc-400'
            }`}>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Auto-Calculated Savings</span>
              <span className="text-sm font-bold text-[#D4AF37]">Rs {savings.toLocaleString()}/-</span>
            </div>
          </div>

        </div>

        {/* Save button footer */}
        <div className="p-5 border-t border-zinc-800 bg-zinc-950/40">
          <button
            onClick={saveQuotation}
            disabled={isSaving}
            className="w-full bg-[#606248] hover:bg-[#4d4e3a] text-white font-medium text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-black/35 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save State to Database
          </button>
        </div>

      </div>

      {/* CENTER WORKSPACE: THE DRAG-SELECT EDITING CANVAS */}
      <div className="flex-1 flex flex-col overflow-hidden relative">

        {/* FLOATING CANVA-STYLE INSPECTOR TOOLBAR */}
        <div className="h-16 border-b border-[#E8E2D9] bg-[#FDFBF7] flex items-center justify-between px-6 flex-shrink-0 z-30 shadow-sm transition-all duration-200">
          
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold bg-[#606248]/15 text-[#606248] px-2.5 py-1.5 rounded-lg border border-[#606248]/10 font-serif">
              Page {activePageIndex + 1} of {renderedPages.length}
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setActivePageIndex(prev => Math.max(0, prev - 1))}
                disabled={activePageIndex === 0}
                className="p-2 hover:bg-[#FAF6F0] rounded-lg border border-[#E8E2D9] text-[#606248] disabled:opacity-30 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setActivePageIndex(prev => Math.min(renderedPages.length - 1, prev + 1))}
                disabled={activePageIndex === renderedPages.length - 1}
                className="p-2 hover:bg-[#FAF6F0] rounded-lg border border-[#E8E2D9] text-[#606248] disabled:opacity-30 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Element Inspector Context Bar */}
          {activeElement && activeElement.type === 'text' ? (
            <div className="flex items-center gap-4 bg-[#FAF6F0] border border-[#E8E2D9] rounded-xl px-4 py-1.5 shadow-sm animate-fade-in animate-duration-150">
              
              {/* Font Family selector */}
              <div className="flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-[#606248]" />
                <select
                  value={activeElement.fontFamily || 'Inter'}
                  onChange={e => updateSelectedElement('fontFamily', e.target.value)}
                  className="bg-transparent text-xs font-medium text-zinc-800 border-none outline-none cursor-pointer py-1 font-serif focus:ring-0"
                >
                  {FONTS_LIST.map(font => (
                    <option key={font.name} value={font.name}>{font.name}</option>
                  ))}
                </select>
              </div>

              <div className="w-px h-5 bg-[#E8E2D9]" />

              {/* Font Size control */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => updateSelectedElement('fontSize', Math.max(8, (activeElement.fontSize || 12) - 1))}
                  className="p-1 hover:bg-zinc-200/50 rounded text-zinc-650 text-xs font-bold"
                >
                  -
                </button>
                <input
                  type="number"
                  value={activeElement.fontSize || 12}
                  onChange={e => updateSelectedElement('fontSize', Number(e.target.value))}
                  className="w-9 text-center bg-transparent border-none text-xs font-semibold focus:outline-none"
                />
                <button
                  onClick={() => updateSelectedElement('fontSize', Math.min(120, (activeElement.fontSize || 12) + 1))}
                  className="p-1 hover:bg-zinc-200/50 rounded text-zinc-650 text-xs font-bold"
                >
                  +
                </button>
              </div>

              <div className="w-px h-5 bg-[#E8E2D9]" />

              {/* Text Align */}
              <div className="flex items-center gap-1 bg-white/60 border border-[#E8E2D9]/40 rounded-lg p-0.5">
                <button
                  onClick={() => updateSelectedElement('textAlign', 'left')}
                  className={`p-1.5 rounded transition ${activeElement.textAlign === 'left' ? 'bg-[#606248] text-white' : 'text-zinc-600 hover:bg-zinc-200/50'}`}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => updateSelectedElement('textAlign', 'center')}
                  className={`p-1.5 rounded transition ${activeElement.textAlign === 'center' ? 'bg-[#606248] text-white' : 'text-zinc-600 hover:bg-zinc-200/50'}`}
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => updateSelectedElement('textAlign', 'right')}
                  className={`p-1.5 rounded transition ${activeElement.textAlign === 'right' ? 'bg-[#606248] text-white' : 'text-zinc-600 hover:bg-zinc-200/50'}`}
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="w-px h-5 bg-[#E8E2D9]" />

              {/* Bold Toggle */}
              <button
                onClick={() => updateSelectedElement('fontWeight', activeElement.fontWeight === 'bold' ? 'normal' : 'bold')}
                className={`p-1.5 rounded transition border ${activeElement.fontWeight === 'bold' ? 'bg-[#606248] border-[#606248] text-white' : 'border-[#E8E2D9] text-zinc-600 hover:bg-zinc-200/50'}`}
              >
                <Bold className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-5 bg-[#E8E2D9]" />

              {/* Hex Brand Palette color selector */}
              <div className="flex items-center gap-1.5">
                {CORPORATE_BRAND_PALETTE.map(brandColor => (
                  <button
                    key={brandColor.hex}
                    onClick={() => updateSelectedElement('color', brandColor.hex)}
                    style={{ backgroundColor: brandColor.hex }}
                    title={brandColor.name}
                    className={`w-4 h-4 rounded-full border border-black/10 transition transform hover:scale-115 ${
                      activeElement.color?.toLowerCase() === brandColor.hex.toLowerCase() 
                        ? 'ring-2 ring-[#606248] ring-offset-1 ring-offset-[#FAF6F0]' 
                        : ''
                    }`}
                  />
                ))}
                
                {/* Custom Color Input */}
                <input
                  type="color"
                  value={activeElement.color || '#000000'}
                  onChange={e => updateSelectedElement('color', e.target.value)}
                  className="w-4 h-4 rounded-full border-none outline-none cursor-pointer p-0 overflow-hidden"
                  title="Custom Color"
                />
              </div>

            </div>
          ) : (
            <div className="text-xs text-[#8A7E56] font-medium italic flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Click any element on the template paper below to change layout parameters
            </div>
          )}

          {/* Right Header Operations */}
          <div className="flex items-center gap-3">
            <button
              onClick={exportToPdf}
              disabled={isExporting}
              className="px-4 py-2 bg-[#606248] hover:bg-[#4d4e3a] text-white text-xs font-semibold rounded-xl transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isExporting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </button>
            <button
              onClick={() => {
                resetToNew();
                showToast('Reset elements configuration to default.', 'info');
              }}
              className="p-2 border border-[#E8E2D9] rounded-xl hover:bg-[#FAF6F0] text-zinc-600 transition"
              title="Reset configuration"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* WORKSPACE VIEWPORT BACKDROP */}
        <div 
          ref={workspaceRef}
          className="flex-1 overflow-hidden flex flex-col items-center justify-center bg-[#F3EFEA] relative"
          onClick={() => setSelectedElement(null)}
        >
          
          {/* THE DIGITAL MATTE COVER PAPER PAGE (RESPONSIVE SCALED A4) */}
          <div 
            id="quotation-canvas-container"
            className="shadow-2xl rounded-2xl overflow-hidden border border-[#E0D8CC] bg-[#FAF6F0] flex flex-col"
            style={{
              width: '794px',
              height: '1123px',
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
              flexShrink: 0
            }}
          >
            
            {/* The active canvas page with matte paper texture styling */}
            <div 
              className="relative w-full h-full p-[75px] flex flex-col justify-between select-none overflow-hidden"
              style={{
                backgroundImage: `radial-gradient(#ebe5da 1.5px, transparent 1.5px), radial-gradient(#ebe5da 1.5px, #FAF6F0 1.5px)`,
                backgroundSize: '30px 30px',
                backgroundPosition: '0 0, 15px 15px',
                boxSizing: 'border-box'
              }}
            >
              
              {/* Dynamic canvas element rendering */}
              {activePageIndex !== 0 && activePageIndex !== 1 && activePageIndex !== renderedPages.length - 1 && renderedPages[activePageIndex]?.elements.map(el => {
                const isSelected = selectedElement?.pageIndex === activePageIndex && selectedElement?.elementId === el.id;
                
                // Style configurations
                const customStyle: React.CSSProperties = {
                  position: 'absolute',
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: `${el.width}%`,
                  height: el.height ? `${el.height}%` : 'auto',
                  fontFamily: el.fontFamily ? FONTS_LIST.find(f => f.name === el.fontFamily)?.family : 'inherit',
                  fontSize: el.fontSize ? `${el.fontSize}px` : 'inherit',
                  color: el.color || 'inherit',
                  fontWeight: el.fontWeight || 'normal',
                  fontStyle: el.fontStyle || 'normal',
                  textAlign: el.textAlign || 'left',
                  letterSpacing: el.letterSpacing || 'normal',
                  cursor: 'pointer'
                };

                // Render TEXT TYPE elements
                if (el.type === 'text') {
                  const isInlineEditing = inlineEditingText !== null && selectedElement?.elementId === el.id;

                  return (
                    <div
                      key={el.id}
                      onClick={(e) => handleElementClick(e, activePageIndex, el.id)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setInlineEditingText(el.content);
                      }}
                      style={customStyle}
                      className={`group transition rounded-md p-1.5 flex items-center justify-center ${
                        isSelected 
                          ? 'outline-2 outline-dashed outline-[#606248] bg-[#606248]/5' 
                          : 'hover:outline-1 hover:outline-dashed hover:outline-[#C2B280]/60'
                      } ${
                        el.id === 'pricing-savings-banner' 
                          ? 'bg-[#606248] text-white px-4 rounded-xl shadow-sm' 
                          : ''
                      }`}
                    >
                      {isInlineEditing ? (
                        <textarea
                          value={inlineEditingText || ''}
                          onChange={e => setInlineEditingText(e.target.value)}
                          onBlur={() => handleInlineTextSave(activePageIndex, el.id, inlineEditingText || '')}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleInlineTextSave(activePageIndex, el.id, inlineEditingText || '');
                            }
                          }}
                          autoFocus
                          className="w-full h-full bg-white text-zinc-950 p-1 border border-[#606248] rounded text-center focus:outline-none text-[13px] font-sans"
                        />
                      ) : (
                        <span className="w-full leading-relaxed select-text font-serif">
                          {el.content}
                        </span>
                      )}
                    </div>
                  );
                }

                // Render IMAGE TYPE elements
                if (el.type === 'image') {
                  return (
                    <div
                      key={el.id}
                      onClick={(e) => handleElementClick(e, activePageIndex, el.id)}
                      style={customStyle}
                      className={`group transition overflow-hidden rounded-xl bg-[#E8E2D9] relative border border-[#E0D8CC] shadow-sm ${
                        isSelected 
                          ? 'outline-2 outline-dashed outline-[#606248] bg-zinc-200' 
                          : 'hover:outline-1 hover:outline-dashed hover:outline-[#C2B280]/60'
                      }`}
                    >
                      <img 
                        src={el.content} 
                        alt="Canvas asset" 
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-103" 
                      />
                      
                      {/* Image uploader overlay */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerImageSwap(activePageIndex, el.id, el.content);
                        }}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-white font-medium text-xs"
                      >
                        <Upload className="w-4 h-4 text-[#D4AF37]" />
                        Swap Image
                      </button>
                    </div>
                  );
                }

                return null;
              })}

              {/* DYNAMIC LIST COMPONENTS FOR FUNCTIONS PAGES */}
              {pages[activePageIndex]?.pageType === 'functions' && (
                <div className="absolute inset-x-10 top-[14%] bottom-8 flex flex-col justify-start gap-4 z-10 select-text overflow-y-auto pr-1">
                  
                  {/* FUNCTIONS STACKED VERTICALLY */}
                  <div className="flex flex-col gap-4 w-full">
                    {(pages[activePageIndex]?.paginatedFuncs || []).map(func => {
                      const parts = func.title.split(' | ');
                      const displayDate = parts[0] || func.date || '2026-01-04';
                      const displayTime = parts[1] || func.time || '10:00';
                      const displayHours = parts[2] || func.hours || '4 Hours Session';
                      const displayName = parts[3] || func.name || func.title;

                      return (
                        <div key={func.id} className="relative bg-white/60 backdrop-blur-sm border border-[#E8E2D9]/70 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                          <div>
                            {/* Card Header Row */}
                            <div className="flex items-center justify-between gap-1.5 mb-2.5">
                              {/* Function Name Dropdown */}
                              <select
                                value={func.name}
                                onChange={e => updateFunctionDetails(func.id, { name: e.target.value.toUpperCase() })}
                                className="theme-accent-bg text-white text-[9px] font-bold tracking-widest uppercase rounded-full px-2 py-0.5 text-center font-serif focus:outline-none border-none cursor-pointer theme-accent-hover-bg transition"
                              >
                                {FUNCTION_NAMES.map(name => (
                                  <option key={name} value={name} className="bg-[#FAF6F0] theme-accent-text font-sans font-medium uppercase text-xs">
                                    {name}
                                  </option>
                                ))}
                              </select>

                              {/* Date Time Picker Trigger */}
                              <div className="relative flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActivePopover(activePopover === `datetime-${func.id}` ? null : `datetime-${func.id}`);
                                  }}
                                  className="text-[9px] font-bold text-[#8A7E56] theme-accent-hover-text border border-[#E8E2D9] rounded-md px-1.5 py-0.5 bg-[#FAF6F0]/80 transition flex items-center gap-1"
                                >
                                  <span>📅 {displayDate} | ⏰ {displayTime} ({displayHours.split(' ')[0]}h)</span>
                                </button>
                                
                                {/* Popover container */}
                                {activePopover === `datetime-${func.id}` && (
                                  <div className="absolute top-[28px] right-0 bg-[#FAF6F0] border border-[#E8E2D9] rounded-xl p-4 shadow-xl z-30 w-[240px] text-zinc-800 flex flex-col gap-3 select-text">
                                    <div className="text-xs font-bold theme-accent-text border-b border-[#E8E2D9]/60 pb-1.5 font-serif uppercase tracking-wider">
                                      Event Schedule
                                    </div>
                                    
                                    <div className="flex flex-col gap-1">
                                      <label className="text-[10px] text-zinc-500 font-semibold uppercase">Event Date</label>
                                      <input
                                        type="date"
                                        value={func.date}
                                        onChange={e => updateFunctionDetails(func.id, { date: e.target.value })}
                                        className="w-full bg-[#FAF6F0] border border-[#E8E2D9] rounded-lg px-2.5 py-1 text-xs theme-accent-focus focus:outline-none"
                                      />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                      <label className="text-[10px] text-zinc-500 font-semibold uppercase">Start Time</label>
                                      <input
                                        type="time"
                                        value={func.time}
                                        onChange={e => updateFunctionDetails(func.id, { time: e.target.value })}
                                        className="w-full bg-[#FAF6F0] border border-[#E8E2D9] rounded-lg px-2.5 py-1 text-xs theme-accent-focus focus:outline-none"
                                      />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                      <label className="text-[10px] text-zinc-500 font-semibold uppercase">Duration</label>
                                      <select
                                        value={func.hours}
                                        onChange={e => updateFunctionDetails(func.id, { hours: e.target.value })}
                                        className="w-full bg-[#FAF6F0] border border-[#E8E2D9] rounded-lg px-2.5 py-1 text-xs theme-accent-focus focus:outline-none"
                                      >
                                        {SESSION_HOURS_OPTIONS.map(opt => (
                                          <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                      </select>
                                    </div>

                                    <button
                                      onClick={() => setActivePopover(null)}
                                      className="mt-1 w-full theme-accent-bg text-white py-1.5 text-xs font-bold rounded-lg theme-accent-hover-bg transition"
                                    >
                                      Done
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Delete Card Trigger */}
                              <button
                                onClick={() => deleteFunctionCard(func.id)}
                                className="p-0.5 text-rose-500 hover:bg-rose-50 rounded transition"
                                title="Delete event"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            
                            {/* Requirements items list */}
                            <ul className="space-y-1">
                              {func.items.map((item: any, idx: number) => (
                                <li key={idx} className="group flex items-start gap-1.5 text-[10px] font-medium text-zinc-700 leading-tight">
                                  <span className="theme-accent-text">•</span>
                                  <span className="flex-1 font-sans">{item}</span>
                                  <button
                                    onClick={() => deleteFunctionItem(func.id, idx)}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-rose-500 hover:bg-rose-50 rounded transition"
                                  >
                                    <Trash className="w-2.5 h-2.5" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Requirements tag selector dropdown */}
                          <div className="relative mt-2">
                            {activePopover === `req-${func.id}` ? (
                              <div className="absolute bottom-[32px] left-0 bg-[#FAF6F0] border border-[#E8E2D9] rounded-xl p-2.5 shadow-xl z-30 flex flex-col gap-2 max-h-[180px] overflow-y-auto w-[200px] select-text">
                                <input
                                  type="text"
                                  placeholder="Search or type..."
                                  value={searchQuery}
                                  onChange={e => setSearchQuery(e.target.value)}
                                  className="w-full bg-[#FAF6F0] border border-[#E8E2D9] rounded-lg px-2 py-0.5 text-[10px] theme-accent-focus focus:outline-none text-zinc-800"
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' && searchQuery.trim()) {
                                      addRequirementToFunction(func.id, searchQuery.trim());
                                      setSearchQuery('');
                                      setActivePopover(null);
                                    }
                                  }}
                                />
                                
                                <div className="flex flex-col gap-0.5 overflow-y-auto max-h-[110px] pr-1">
                                  {REQUIREMENT_OPTIONS.filter(opt => opt.toLowerCase().includes(searchQuery.toLowerCase())).map(opt => (
                                    <button
                                      key={opt}
                                      onClick={() => {
                                        addRequirementToFunction(func.id, opt);
                                        setSearchQuery('');
                                        setActivePopover(null);
                                      }}
                                      className="w-full text-left px-2 py-1 hover:bg-zinc-800/10 rounded text-[10px] text-zinc-700 transition"
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                  {searchQuery.trim() && (
                                    <button
                                      onClick={() => {
                                        addRequirementToFunction(func.id, searchQuery.trim());
                                        setSearchQuery('');
                                        setActivePopover(null);
                                      }}
                                      className="w-full text-left px-2 py-1 hover:bg-zinc-800/10 rounded text-[10px] text-[#8A7E56] font-bold border-t border-[#E8E2D9]/40 transition"
                                    >
                                      + Add "{searchQuery}"
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setSearchQuery('');
                                  setActivePopover(`req-${func.id}`);
                                }}
                                className="w-full py-0.5 border border-dashed border-zinc-700 hover:theme-accent-border theme-accent-text hover:bg-zinc-800/10 text-[9px] font-bold rounded-lg transition flex items-center justify-center gap-1"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                Add Requirement
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Function Card Trigger (only on first functions page) */}
                    {functions.length < 6 && pages[activePageIndex]?.pageIndex === 2 && (
                      <button
                        onClick={addNewFunctionCard}
                        className="bg-[#FAF6F0]/40 border border-dashed border-zinc-700 hover:theme-accent-border hover:bg-[#FAF6F0]/70 rounded-xl p-4 flex flex-col items-center justify-center shadow-sm theme-accent-text text-xs font-bold transition gap-2"
                      >
                        <Plus className="w-6 h-6" />
                        Add Event Card
                      </button>
                    )}
                  </div>

                  {/* DELIVERABLES LIST BLOCK (only on pages marked showDeliverables) */}
                  {pages[activePageIndex]?.showDeliverables && (
                    <div className="bg-white/50 backdrop-blur-sm border border-[#E8E2D9]/50 rounded-xl p-4 mt-4 shadow-sm flex flex-col justify-between">
                      <div className="text-xs font-bold theme-accent-text border-b border-[#E8E2D9]/60 pb-1.5 mb-2 font-serif uppercase tracking-wider">
                        Deliverables
                      </div>
                      <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                        {(pages[activePageIndex]?.paginatedDelivs || []).map((deliv, idx) => (
                          <li key={idx} className="group flex items-start gap-2 text-[11.5px] text-zinc-800 leading-relaxed font-sans">
                            <span className="theme-accent-text font-bold mt-0.5">•</span>
                            <input
                              type="text"
                              value={deliv}
                              onChange={e => editDeliverableItem(idx, e.target.value)}
                              className="bg-transparent border-none p-0 flex-1 focus:outline-none focus:ring-0 text-[11.5px] text-zinc-800"
                            />
                            <button
                              onClick={() => deleteDeliverableItem(idx)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-rose-500 hover:bg-rose-50 rounded transition ml-1"
                            >
                              <Trash className="w-3 h-3" />
                            </button>
                          </li>
                        ))}
                      </ul>

                      {/* Deliverables tag selector dropdown */}
                      <div className="relative mt-4">
                        {activePopover === 'deliv' ? (
                          <div className="absolute bottom-[40px] left-1/2 transform -translate-x-1/2 bg-[#FAF6F0] border border-[#E8E2D9] rounded-xl p-3 shadow-xl z-30 flex flex-col gap-2 max-h-[220px] overflow-y-auto w-[240px] select-text">
                            <input
                              type="text"
                              placeholder="Search or add custom..."
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              className="w-full bg-[#FAF6F0] border border-[#E8E2D9] rounded-lg px-2 py-1 text-xs theme-accent-focus focus:outline-none text-zinc-800"
                              onKeyDown={e => {
                                if (e.key === 'Enter' && searchQuery.trim()) {
                                  setDeliverables(prev => [...prev, searchQuery.trim()]);
                                  setSearchQuery('');
                                  setActivePopover(null);
                                }
                              }}
                            />
                            
                            <div className="flex flex-col gap-1 overflow-y-auto max-h-[140px] pr-1">
                              {DELIVERABLE_OPTIONS.filter(opt => opt.toLowerCase().includes(searchQuery.toLowerCase())).map(opt => (
                                <button
                                  key={opt}
                                  onClick={() => {
                                    if (!deliverables.includes(opt)) {
                                      setDeliverables(prev => [...prev, opt]);
                                    }
                                    setSearchQuery('');
                                    setActivePopover(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 hover:bg-zinc-800/10 rounded text-[11px] text-zinc-700 transition"
                                >
                                  {opt}
                                </button>
                              ))}
                              {searchQuery.trim() && (
                                <button
                                  onClick={() => {
                                    setDeliverables(prev => [...prev, searchQuery.trim()]);
                                    setSearchQuery('');
                                    setActivePopover(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 hover:bg-zinc-800/10 rounded text-[11px] text-[#8A7E56] font-bold border-t border-[#E8E2D9]/40 transition"
                                >
                                  + Add custom "{searchQuery}"
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setActivePopover('deliv');
                            }}
                            className="w-full py-1.5 border border-dashed border-zinc-700 hover:theme-accent-border theme-accent-text hover:bg-zinc-800/10 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Deliverable
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Page 1 Custom Premium Cover Page Layout */}
              {activePageIndex === 0 && (
                <div className="absolute inset-0 flex flex-col justify-between p-[75px] z-15 select-text">
                  {/* Top Section */}
                  <div className="w-full flex flex-col items-center pt-4">
                    {/* Couple Names / Client x Partner */}
                    <div 
                      onClick={(e) => handleElementClick(e, 0, 'cover-couple-names')}
                      className={`w-full text-center transition px-2 py-1 rounded-lg hover:outline-1 hover:outline-dashed hover:outline-[#C2B280]/60`}
                      style={selectedElement?.elementId === 'cover-couple-names' ? { outline: `2px dashed ${accentColor}`, backgroundColor: `${accentColor}10` } : {}}
                    >
                      <input
                        type="text"
                        value={coupleNames}
                        onChange={e => setCoupleNames(e.target.value.toUpperCase())}
                        className="w-full text-center bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-3xl font-serif font-bold tracking-widest"
                        style={{ color: accentColor }}
                      />
                    </div>
                    
                    {/* Border Wrapper for WEDDING QUOTATION */}
                    <div className="w-full border-t border-b border-[#E8E2D9]/80 py-2.5 mt-3 flex flex-col items-center">
                      <div 
                        onClick={(e) => handleElementClick(e, 0, 'cover-subtitle-1')}
                        className={`w-full text-center transition px-2 py-0.5 rounded hover:outline-1 hover:outline-dashed hover:outline-[#C2B280]/60`}
                        style={selectedElement?.elementId === 'cover-subtitle-1' ? { outline: `2px dashed ${accentColor}`, backgroundColor: `${accentColor}10` } : {}}
                      >
                        <span className="text-xs font-serif text-[#C2B280] tracking-[0.25em] font-semibold">
                          WEDDING QUOTATION
                        </span>
                      </div>
                      
                      {/* Subtitle Parameters (Location / Date) */}
                      <div 
                        onClick={(e) => handleElementClick(e, 0, 'cover-subtitle-2')}
                        className={`w-full text-center transition px-2 py-0.5 rounded mt-1.5 hover:outline-1 hover:outline-dashed hover:outline-[#C2B280]/60`}
                        style={selectedElement?.elementId === 'cover-subtitle-2' ? { outline: `2px dashed ${accentColor}`, backgroundColor: `${accentColor}10` } : {}}
                      >
                        <input
                          type="text"
                          value={pages[0]?.elements.find(el => el.id === 'cover-subtitle-2')?.content || 'BOTH SIDES - LOCATION'}
                          onChange={e => {
                            const updatedVal = e.target.value;
                            setPages(prev => prev.map((p, pi) => {
                              if (pi === 0) {
                                return {
                                  ...p,
                                  elements: p.elements.map(el => el.id === 'cover-subtitle-2' ? { ...el, content: updatedVal } : el)
                                };
                              }
                              return p;
                            }));
                          }}
                          className="w-full text-center bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-[10px] text-zinc-500 font-sans tracking-[0.1em]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Middle Section: Logo */}
                  <div 
                    onClick={(e) => handleElementClick(e, 0, 'cover-logo-text')}
                    className={`absolute top-[38%] left-1/2 -translate-x-1/2 w-[80%] text-center transition px-3 py-1.5 rounded-xl z-20 hover:outline-1 hover:outline-dashed hover:outline-[#C2B280]/60`}
                    style={selectedElement?.elementId === 'cover-logo-text' ? { outline: `2px dashed ${accentColor}`, backgroundColor: `${accentColor}10` } : {}}
                  >
                    <div className="text-xl font-bold tracking-[0.18em] font-serif uppercase" style={{ color: accentColor }}>
                      FILMIFY WEDDINGS
                    </div>
                    <div className="text-[7px] text-[#8A7E56] font-sans tracking-[0.3em] uppercase mt-0.5">
                      Premium Editorial Studio
                    </div>
                  </div>

                  {/* Bottom Section: Hero couple image cutout */}
                  <div 
                    onClick={(e) => handleElementClick(e, 0, 'cover-hero-image')}
                    className={`absolute bottom-0 left-10 right-10 top-[48%] group transition overflow-hidden rounded-2xl bg-transparent border border-transparent shadow-none flex items-end justify-center z-10 hover:outline-1 hover:outline-dashed hover:outline-[#C2B280]/60`}
                    style={selectedElement?.elementId === 'cover-hero-image' ? { outline: `2px dashed ${accentColor}` } : {}}
                  >
                    <img 
                      src={pages[0]?.elements.find(el => el.id === 'cover-hero-image')?.content || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800'} 
                      alt="Cover couple cutout" 
                      className="w-full h-full object-contain" 
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerImageSwap(0, 'cover-hero-image', pages[0]?.elements.find(el => el.id === 'cover-hero-image')?.content || '');
                      }}
                      className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-white font-medium text-xs rounded-2xl animate-fade-in"
                    >
                      <Upload className="w-4 h-4 text-[#D4AF37]" />
                      Swap Couple Photo
                    </button>
                  </div>
                </div>
              )}

              {/* Page 2 Custom Premium About Us Layout */}
              {activePageIndex === 1 && (
                <div className="absolute inset-0 flex flex-col justify-between p-[75px] z-10 select-text">
                  {/* Birds flying at the top right */}
                  <div className="absolute top-[8%] right-[15%] opacity-80 pointer-events-none">
                    <svg width="140" height="60" viewBox="0 0 140 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* V-formation birds */}
                      <path d="M10 20 Q15 17 20 20 Q23 17 26 20" stroke={accentColor} strokeWidth="1.2" strokeLinecap="round" fill="none" />
                      <path d="M32 12 Q36 9 40 12 Q43 9 46 12" stroke={accentColor} strokeWidth="1" strokeLinecap="round" fill="none" />
                      <path d="M48 24 Q52 21 56 24 Q59 21 62 24" stroke={accentColor} strokeWidth="1.1" strokeLinecap="round" fill="none" />
                      <path d="M66 16 Q69 13 72 16 Q75 13 78 16" stroke={accentColor} strokeWidth="0.9" strokeLinecap="round" fill="none" />
                      <path d="M84 28 Q87 25 90 28 Q93 25 96 28" stroke={accentColor} strokeWidth="1" strokeLinecap="round" fill="none" />
                      <path d="M100 20 Q103 17 106 20 Q109 17 112 20" stroke={accentColor} strokeWidth="0.8" strokeLinecap="round" fill="none" />
                      <path d="M118 12 Q121 9 124 12 Q127 9 130 12" stroke={accentColor} strokeWidth="0.7" strokeLinecap="round" fill="none" />
                    </svg>
                  </div>

                  {/* Monogram logo */}
                  <div className="w-full flex justify-center items-center h-[120px] select-none mt-4">
                    <div className="relative w-[150px] h-[100px]">
                      {/* U and S */}
                      <div className="absolute left-[15px] top-[32px] flex items-baseline" style={{ color: accentColor }}>
                        <span className="text-7xl font-serif font-light">U</span>
                        <span className="text-[9px] font-sans tracking-[0.15em] ml-1 font-bold">S</span>
                      </div>
                      {/* A and BOUT */}
                      <div className="absolute left-[60px] top-[0px] flex items-baseline" style={{ color: accentColor }}>
                        <span className="text-7xl font-serif font-light">A</span>
                        <span className="text-[9px] font-sans tracking-[0.15em] ml-1 font-bold">BOUT</span>
                      </div>
                    </div>
                  </div>

                  {/* Quote Section */}
                  <div 
                    onClick={(e) => handleElementClick(e, 1, 'about-quote')}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      const content = pages[1]?.elements.find(el => el.id === 'about-quote')?.content || '';
                      setInlineEditingText(content);
                    }}
                    className={`relative px-12 py-3 mx-2 my-2 text-center flex items-center justify-center transition rounded-xl hover:outline-1 hover:outline-dashed hover:outline-[#C2B280]/60`}
                    style={selectedElement?.elementId === 'about-quote' ? { outline: `2px dashed ${accentColor}`, backgroundColor: `${accentColor}10` } : {}}
                  >
                    <span className="absolute left-4 top-0 text-4xl font-serif font-bold" style={{ color: accentColor }}>“</span>
                    {inlineEditingText !== null && selectedElement?.elementId === 'about-quote' ? (
                      <textarea
                        value={inlineEditingText}
                        onChange={e => setInlineEditingText(e.target.value)}
                        onBlur={() => handleInlineTextSave(1, 'about-quote', inlineEditingText)}
                        className="w-full bg-white text-zinc-950 p-2 rounded text-center text-xs font-sans focus:outline-none"
                        style={{ border: `1px solid ${accentColor}` }}
                        autoFocus
                      />
                    ) : (
                      <p className="text-[12px] font-sans text-zinc-700 leading-relaxed font-medium">
                        {pages[1]?.elements.find(el => el.id === 'about-quote')?.content}
                      </p>
                    )}
                    <span className="absolute right-4 bottom-0 text-4xl font-serif font-bold" style={{ color: accentColor }}>”</span>
                  </div>

                  {/* Two Photos Side-by-Side */}
                  <div className="grid grid-cols-2 gap-6 w-full px-2 mt-4">
                    {/* Left image */}
                    <div 
                      onClick={(e) => handleElementClick(e, 1, 'about-img-left')}
                      className={`group transition overflow-hidden rounded-xl bg-[#E8E2D9] relative border border-[#E0D8CC] shadow-sm aspect-[4/5] hover:outline-1 hover:outline-dashed hover:outline-[#C2B280]/60`}
                      style={selectedElement?.elementId === 'about-img-left' ? { outline: `2px dashed ${accentColor}` } : {}}
                    >
                      <img 
                        src={pages[1]?.elements.find(el => el.id === 'about-img-left')?.content || 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=600'} 
                        alt="About left couple" 
                        className="w-full h-full object-cover" 
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerImageSwap(1, 'about-img-left', pages[1]?.elements.find(el => el.id === 'about-img-left')?.content || '');
                        }}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-white font-medium text-xs rounded-xl"
                      >
                        <Upload className="w-4 h-4 text-[#D4AF37]" />
                        Swap Image
                      </button>
                    </div>

                    {/* Right image */}
                    <div 
                      onClick={(e) => handleElementClick(e, 1, 'about-img-right')}
                      className={`group transition overflow-hidden rounded-xl bg-[#E8E2D9] relative border border-[#E0D8CC] shadow-sm aspect-[4/5] hover:outline-1 hover:outline-dashed hover:outline-[#C2B280]/60`}
                      style={selectedElement?.elementId === 'about-img-right' ? { outline: `2px dashed ${accentColor}` } : {}}
                    >
                      <img 
                        src={pages[1]?.elements.find(el => el.id === 'about-img-right')?.content || 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&q=80&w=600'} 
                        alt="About right couple" 
                        className="w-full h-full object-cover" 
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerImageSwap(1, 'about-img-right', pages[1]?.elements.find(el => el.id === 'about-img-right')?.content || '');
                        }}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-white font-medium text-xs rounded-xl"
                      >
                        <Upload className="w-4 h-4 text-[#D4AF37]" />
                        Swap Image
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Page 4 Custom Premium Early Booking Offer Layout */}
              {activePageIndex === renderedPages.length - 1 && (
                <div className="absolute inset-x-[75px] top-[75px] bottom-0 z-10 flex flex-col justify-between select-text">
                  {/* Heading */}
                  <div className="w-full flex flex-col items-center">
                    <div className="text-3xl font-serif font-bold tracking-widest text-center uppercase" style={{ color: accentColor }}>
                      EARLY BOOKING OFFER
                    </div>
                    
                    {/* Offer Price Box */}
                    <div 
                      onClick={(e) => handleElementClick(e, renderedPages.length - 1, 'pricing-main-price')}
                      className={`border px-8 py-2.5 mt-5 rounded-lg text-center bg-white/40 shadow-sm transition hover:outline-1 hover:outline-dashed hover:outline-[#C2B280]/60`}
                      style={
                        selectedElement?.elementId === 'pricing-main-price' 
                          ? { outline: `2px dashed ${accentColor}`, borderColor: accentColor, backgroundColor: `${accentColor}10` }
                          : { borderColor: '#E8E2D9' }
                      }
                    >
                      <span className="text-2xl font-serif font-bold tracking-wider" style={{ color: accentColor }}>
                        Rs {offerPrice.toLocaleString()}/-
                      </span>
                    </div>

                    {/* Regular Price Subtitle */}
                    <div className="text-xs font-medium text-[#706E6A] tracking-wider mt-3">
                      Regular Quotation : Rs {regularPrice.toLocaleString()}/-
                    </div>

                    {/* Exclude notes box */}
                    <div className="border border-[#E8E2D9] px-6 py-2 mt-4 rounded bg-white/20 max-w-[420px] text-center">
                      <span className="text-[9.5px] font-sans text-zinc-500 tracking-wide font-medium leading-relaxed">
                        This excludes travel, accommodation, food & any add-on services.
                      </span>
                    </div>

                    {/* Savings Highlight Banner */}
                    <div className="w-full text-white py-3 px-6 mt-6 rounded-xl shadow-sm text-center font-bold text-[12px] tracking-wide font-sans leading-relaxed" style={{ backgroundColor: accentColor }}>
                      Save Rs {savings.toLocaleString()} With Our Special Offer. The Special Offer Ends in the Next 7 days.
                    </div>
                  </div>

                  {/* Logo overlay & bottom palace cover photo */}
                  <div className="relative w-full h-[320px] flex flex-col justify-between items-center mt-6">
                    {/* Centered Logo text right above the cutout skyline */}
                    <div className="text-center z-20 pb-4">
                      <div className="text-lg font-bold tracking-[0.2em] font-serif uppercase" style={{ color: accentColor }}>
                        FILMIFY WEDDINGS
                      </div>
                      <div className="text-[6.5px] text-[#8A7E56] font-sans tracking-[0.3em] uppercase mt-0.5 font-bold">
                        Premium Editorial Studio
                      </div>
                    </div>

                    {/* Palace/Castle cutout photo occupying the bottom */}
                    <div 
                      onClick={(e) => handleElementClick(e, renderedPages.length - 1, 'pricing-palace-image')}
                      className={`w-full h-[250px] relative overflow-hidden rounded-t-3xl border border-[#E0D8CC]/50 shadow-lg group transition`}
                      style={selectedElement?.elementId === 'pricing-palace-image' ? { outline: `2px dashed ${accentColor}` } : {}}
                    >
                      <img 
                        src={renderedPages[renderedPages.length - 1]?.elements.find(el => el.id === 'pricing-palace-image')?.content || 'https://images.unsplash.com/photo-1546412414-8035e1776c9a?auto=format&fit=crop&q=80&w=800'} 
                        alt="Palace backdrop" 
                        className="w-full h-full object-cover" 
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerImageSwap(renderedPages.length - 1, 'pricing-palace-image', renderedPages[renderedPages.length - 1]?.elements.find(el => el.id === 'pricing-palace-image')?.content || '');
                        }}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-white font-medium text-xs rounded-t-3xl"
                      >
                        <Upload className="w-4 h-4 text-[#D4AF37]" />
                        Swap Cover Image
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Canva Bounding Box / Moveable Transform Controls Overlay */}
              {selectedElement && selectedElement.pageIndex === activePageIndex && activeElement && (
                <MoveableTransformOverlay
                  element={activeElement}
                  pageIndex={selectedElement.pageIndex}
                  canvasWidth={644}
                  canvasHeight={973}
                  onChange={(updatedProps) => {
                    setPages(prev => prev.map((p, pi) => {
                      if (pi === selectedElement.pageIndex) {
                        return {
                          ...p,
                          elements: p.elements.map(el => el.id === activeElement.id ? { ...el, ...updatedProps } : el)
                        };
                      }
                      return p;
                    }));
                  }}
                />
              )}

              {/* FOOTER BAR (Cover brand branding) */}
              {activePageIndex !== 0 && (
                <div className="absolute bottom-6 left-10 right-10 flex items-center justify-between border-t border-[#E8E2D9]/50 pt-3 text-[9px] text-[#8A7E56] font-medium tracking-wide">
                  <span>FILMIFY WEDDINGS</span>
                  <span className="font-serif">Page {activePageIndex + 1} of {renderedPages.length}</span>
                  <span>DIGITAL QUOTATION</span>
                </div>
              )}

            </div>

          </div>

          {/* PAGE DOT INDICATORS */}
          <div className="flex items-center gap-2.5 mt-6 z-10">
            {renderedPages.map((_, pageIdx) => (
              <button
                key={pageIdx}
                onClick={() => setActivePageIndex(pageIdx)}
                className={`w-3.5 h-3.5 rounded-full border transition-all duration-300 ${
                  activePageIndex === pageIdx 
                    ? 'bg-[#606248] border-[#606248] scale-120' 
                    : 'bg-transparent border-[#8A7E56] hover:bg-[#8A7E56]/20'
                }`}
                title={`Go to Page ${pageIdx + 1}`}
              />
            ))}
          </div>

        </div>

      </div>

      {/* FILMIFY STUDIO ARCHIVE DASHBOARD MODAL */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-6 select-text">
          <div className="bg-[#FAF6F0] border border-[#E8E2D9] rounded-2xl w-full max-w-5xl h-[80vh] shadow-2xl flex flex-col overflow-hidden animate-zoom-in animate-duration-150">
            
            {/* Modal Header */}
            <div className="bg-[#FAF6F0] border-b border-[#E8E2D9] px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <FolderOpen className="w-5 h-5 text-[#D4AF37]" />
                <div>
                  <h3 className="text-base font-bold text-zinc-900 font-serif uppercase tracking-wider">
                    Filmify Studio Archive
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-sans tracking-wide">
                    Multi-version client directory & asset save files
                  </p>
                </div>
              </div>
              
              {/* Search Box */}
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search client names..."
                  value={archiveSearchQuery}
                  onChange={(e) => {
                    setArchiveSearchQuery(e.target.value);
                    fetchArchive(e.target.value);
                  }}
                  className="w-full bg-white border border-[#E8E2D9] rounded-full pl-9 pr-4 py-1.5 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#606248] placeholder-zinc-400 font-sans"
                />
              </div>

              <button 
                onClick={() => {
                  setShowArchiveModal(false);
                  setSelectedArchiveDirectory(null);
                }}
                className="text-zinc-500 hover:text-zinc-700 bg-white hover:bg-zinc-100 border border-[#E8E2D9] px-3 py-1 text-xs font-semibold rounded-lg transition"
              >
                Close
              </button>
            </div>

            {/* Modal Content - Left Sidebar (Clients) + Right View (Versions) */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Left Column: Client folders */}
              <div className="w-[320px] border-r border-[#E8E2D9] bg-[#FAF6F0]/60 overflow-y-auto p-4 flex flex-col gap-2">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 mb-1">
                  Client Directories
                </div>
                {isArchiveLoading && archiveDirectories.length === 0 ? (
                  <div className="flex items-center justify-center p-8 text-zinc-500 text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Scanning directories...
                  </div>
                ) : archiveDirectories.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-xs italic">
                    No client folders found matching your query.
                  </div>
                ) : (
                  archiveDirectories.map(dir => (
                    <button
                      key={dir.clientName}
                      onClick={() => setSelectedArchiveDirectory(dir)}
                      className={`w-full text-left p-3 rounded-xl transition-all border flex items-center justify-between gap-3 ${
                        selectedArchiveDirectory?.clientName === dir.clientName
                          ? 'bg-[#606248]/10 border-[#606248] text-zinc-900 shadow-sm'
                          : 'bg-white border-[#E8E2D9] hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#606248]/10 flex items-center justify-center text-[#606248] flex-shrink-0">
                          <FolderOpen className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate text-zinc-900">{dir.clientName}</div>
                          <div className="text-[10px] text-zinc-500 truncate font-sans">
                            {dir.versionsCount} version{dir.versionsCount > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <span className="text-[9px] text-zinc-400 font-sans">
                        {new Date(dir.lastUpdated).toLocaleDateString()}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {/* Right Column: Selected Client Versions List */}
              <div className="flex-1 bg-white overflow-y-auto p-6">
                {selectedArchiveDirectory ? (
                  <div className="space-y-6">
                    {/* Header Details */}
                    <div className="border-b border-[#E8E2D9]/60 pb-4">
                      <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-sans">
                        Client Directory Workspace
                      </div>
                      <h4 className="text-xl font-bold font-serif text-[#606248] mt-1 uppercase">
                        {selectedArchiveDirectory.clientName}
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-1 font-sans">
                        Isolate folder path: <code className="bg-zinc-100 px-1 py-0.5 rounded">storage/{selectedArchiveDirectory.clientName}/Quotations/</code>
                      </p>
                    </div>

                    {/* Versions Grid / Audit Log */}
                    <div className="space-y-4">
                      <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                        <History className="w-3.5 h-3.5" />
                        Timestamped Versions History
                      </div>

                      <div className="grid grid-cols-1 gap-3.5">
                        {selectedArchiveDirectory.versions.map((ver: any) => {
                          const formattedDateTime = new Date(ver.createdAt).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          });

                          return (
                            <div 
                              key={ver.filename}
                              className="border border-[#E8E2D9] rounded-xl p-4 flex items-center justify-between gap-4 hover:border-zinc-400 transition bg-[#FAF6F0]/20"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="bg-[#606248] text-white text-[10px] font-bold px-2 py-0.5 rounded font-serif">
                                    {ver.versionName}
                                  </span>
                                  <span className="text-[11px] text-zinc-500 font-sans font-medium">
                                    {formattedDateTime}
                                  </span>
                                </div>
                                <div className="text-xs font-semibold text-zinc-800">
                                  Couple: <span className="font-serif italic text-[#8A7E56]">{ver.coupleNames || 'Unspecified'}</span>
                                </div>
                                <div className="text-[10px] text-zinc-500 font-sans truncate max-w-md">
                                  File path: <code>{ver.filePath}</code>
                                </div>
                                {ver.pricingSummary && (
                                  <div className="text-[10px] text-zinc-600 font-sans flex items-center gap-3.5 pt-1.5 border-t border-dashed border-[#E8E2D9]/80 mt-1">
                                    <span>Regular: <strong>Rs {ver.pricingSummary.regular_price?.toLocaleString()}/-</strong></span>
                                    <span>Offer: <strong>Rs {ver.pricingSummary.offer_price?.toLocaleString()}/-</strong></span>
                                    <span className="text-emerald-600 font-semibold">Saved: Rs {ver.pricingSummary.savings?.toLocaleString()}/-</span>
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={() => {
                                  // Restore this version!
                                  setClientName(selectedArchiveDirectory.clientName);
                                  setCoupleNames(ver.coupleNames || '');
                                  
                                  // Re-hydrate state from canvasData
                                  if (ver.canvasData) {
                                    setPages(ver.canvasData);
                                    
                                    // Parse functions and deliverables
                                    const allFunctions: any[] = [];
                                    const allDeliverables: string[] = [];

                                    const funcPages = ver.canvasData.filter((p: any) => p.pageType === 'functions');
                                    funcPages.forEach((funcPage: any) => {
                                      const funcsEl = funcPage.elements.find((el: any) => el.id === 'functions-grid-container' || el.id.startsWith('functions-grid-container'));
                                      if (funcsEl && funcsEl.gridItems) {
                                        funcsEl.gridItems.forEach((item: any) => {
                                          let group = allFunctions.find(g => g.title === item.label);
                                          if (!group) {
                                            let name = 'HALDI';
                                            let date = '2026-01-04';
                                            let time = '10:00';
                                            let hours = '4 Hours Session';
                                            
                                            const parts = (item.label || '').split(' | ');
                                            if (parts.length === 4) {
                                              date = parts[0];
                                              time = parts[1];
                                              hours = parts[2];
                                              name = parts[3];
                                            }
                                            group = {
                                              id: `func-${allFunctions.length}-${Date.now()}`,
                                              title: item.label || '',
                                              name, date, time, hours,
                                              items: []
                                            };
                                            allFunctions.push(group);
                                          }
                                          group.items.push(item.content);
                                        });
                                      }

                                      const delivsEl = funcPage.elements.find((el: any) => el.id === 'deliverables-list-container' || el.id.startsWith('deliverables-list-container'));
                                      if (delivsEl && delivsEl.gridItems) {
                                        delivsEl.gridItems.forEach((item: any) => {
                                          if (!allDeliverables.includes(item.content)) {
                                            allDeliverables.push(item.content);
                                          }
                                        });
                                      }
                                    });
                                    if (allFunctions.length > 0) setFunctions(allFunctions);
                                    if (allDeliverables.length > 0) setDeliverables(allDeliverables);
                                  }

                                  if (ver.pricingSummary) {
                                    setRegularPrice(ver.pricingSummary.regular_price);
                                    setOfferPrice(ver.pricingSummary.offer_price);
                                    setSavings(ver.pricingSummary.savings);
                                  }

                                  setShowArchiveModal(false);
                                  setSelectedArchiveDirectory(null);
                                  showToast(`Restored version ${ver.versionName} for client ${selectedArchiveDirectory.clientName}!`, 'success');
                                }}
                                className="bg-[#606248] hover:bg-[#4d4e3a] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow transition"
                              >
                                Restore Draft
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-400">
                    <FolderOpen className="w-12 h-12 text-zinc-300 stroke-1 mb-3" />
                    <h5 className="text-sm font-bold text-zinc-700">No Client Folder Selected</h5>
                    <p className="text-xs text-zinc-500 max-w-sm mt-1 leading-relaxed">
                      Select a client workspace from the left pane to view its dynamic timestamped audit history and restore save files.
                    </p>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ASSET UPLOADER IMAGE MODAL */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-[#E8E2D9] dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 overflow-hidden animate-zoom-in animate-duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-900">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#D4AF37]" />
                Swap Canvas Image
              </h3>
              <button 
                onClick={() => {
                  setShowImageModal(false);
                  setTargetImageElement(null);
                }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              
              {/* Preview image */}
              <div className="aspect-[16/9] bg-zinc-100 dark:bg-zinc-900 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
                {imageUrlInput ? (
                  <img src={imageUrlInput} alt="Preview swap" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 gap-1.5">
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-[11px]">No image selected</span>
                  </div>
                )}
              </div>

              {/* File Uploader */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Upload File (Supabase Storage)</label>
                <div className="relative border border-dashed border-zinc-300 dark:border-zinc-800 hover:border-[#606248] rounded-lg p-4 transition flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-zinc-50/50 dark:bg-zinc-900/30">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <RefreshCw className="w-5 h-5 text-[#606248] animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-zinc-400" />
                  )}
                  <span className="text-[10px] text-zinc-650 font-medium">
                    {isUploading ? 'Uploading to bucket...' : 'Click to select / drag and drop image'}
                  </span>
                </div>
              </div>

              {/* Paste URL */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Paste Public Image URL</label>
                <input
                  type="text"
                  value={imageUrlInput}
                  onChange={e => setImageUrlInput(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-850 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#606248] text-zinc-900 dark:text-white"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-900">
              <button
                onClick={() => {
                  setShowImageModal(false);
                  setTargetImageElement(null);
                }}
                className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveImageSwap}
                disabled={!imageUrlInput}
                className="px-4 py-1.5 bg-[#606248] hover:bg-[#4d4e3a] text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
              >
                Apply Image Swap
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Offscreen A4 container for high-fidelity PDF generation */}
      <div 
        style={{ 
          position: 'absolute', 
          left: '-9999px', 
          top: '-9999px',
          width: '794px'
        }}
      >
        <div id="pdf-export-container" className="flex flex-col gap-10">
          {pages.map((page, pageIdx) => (
            <div 
              key={pageIdx}
              id={`pdf-page-${pageIdx}`}
              className="relative bg-[#FAF6F0] p-10 flex flex-col justify-between overflow-hidden"
              style={{
                width: '794px',
                height: '1123px',
                backgroundImage: `radial-gradient(#ebe5da 1.5px, transparent 1.5px), radial-gradient(#ebe5da 1.5px, #FAF6F0 1.5px)`,
                backgroundSize: '30px 30px',
                backgroundPosition: '0 0, 15px 15px',
                boxSizing: 'border-box'
              }}
            >
              {/* Dynamic elements */}
              {pageIdx !== 0 && pageIdx !== 1 && pageIdx !== 3 && page.elements.map(el => {
                const customStyle: React.CSSProperties = {
                  position: 'absolute',
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: `${el.width}%`,
                  height: el.height ? `${el.height}%` : 'auto',
                  fontFamily: el.fontFamily ? FONTS_LIST.find(f => f.name === el.fontFamily)?.family : 'inherit',
                  fontSize: el.fontSize ? `${el.fontSize}px` : 'inherit',
                  color: el.color || 'inherit',
                  fontWeight: el.fontWeight || 'normal',
                  fontStyle: el.fontStyle || 'normal',
                  textAlign: el.textAlign || 'left',
                  letterSpacing: el.letterSpacing || 'normal',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start'
                };

                if (el.type === 'text') {
                  return (
                    <div
                      key={el.id}
                      style={customStyle}
                      className={`p-1.5 leading-relaxed font-serif ${
                        el.id === 'pricing-savings-banner' 
                          ? 'theme-accent-bg text-white px-4 rounded-xl shadow-sm' 
                          : ''
                      }`}
                    >
                      <span className="w-full leading-relaxed select-text font-serif">
                        {el.content}
                      </span>
                    </div>
                  );
                }

                if (el.type === 'image') {
                  return (
                    <div
                      key={el.id}
                      style={customStyle}
                      className="overflow-hidden rounded-xl bg-[#E8E2D9] border border-[#E0D8CC] shadow-sm"
                    >
                      <img 
                        src={el.content} 
                        alt="PDF asset" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  );
                }

                return null;
              })}

              {/* PDF Functions layout */}
              {page.pageType === 'functions' && (
                <div className="absolute inset-x-10 top-[14%] bottom-8 flex flex-col justify-start gap-4 z-10">
                  {/* FUNCTIONS STACKED VERTICALLY */}
                  <div className="flex flex-col gap-4 w-full">
                    {(page.paginatedFuncs || []).map(func => {
                      const parts = func.title.split(' | ');
                      const displayDate = parts[0] || func.date || '2026-01-04';
                      const displayTime = parts[1] || func.time || '10:00';
                      const displayHours = parts[2] || func.hours || '4 Hours Session';
                      const displayName = parts[3] || func.name || func.title;

                      return (
                        <div key={func.id} style={{ pageBreakInside: 'avoid' }} className="bg-white/60 border border-[#E8E2D9]/70 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                          <div>
                            <div className="flex items-center justify-between border-b border-[#E8E2D9]/40 pb-1.5 mb-2.5">
                              <div className="theme-accent-bg text-white text-[9px] font-bold tracking-widest uppercase rounded-full px-2.5 py-0.5 text-center font-serif">
                                {displayName}
                              </div>
                              <div className="text-[8px] font-bold text-[#8A7E56] font-sans">
                                📅 {displayDate} | ⏰ {displayTime} ({displayHours.split(' ')[0]}h)
                              </div>
                            </div>
                            <ul className="space-y-1">
                              {func.items.map((item: any, idx: number) => (
                                <li key={idx} className="flex items-start gap-1.5 text-[9.5px] font-medium text-zinc-700 leading-tight">
                                  <span className="theme-accent-text">•</span>
                                  <span className="font-sans">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* DELIVERABLES LIST */}
                  {page.showDeliverables && (
                    <div className="bg-white/50 border border-[#E8E2D9]/50 rounded-xl p-4 mt-3 shadow-sm">
                      <div className="text-xs font-bold theme-accent-text border-b border-[#E8E2D9]/60 pb-1.5 mb-2 font-serif uppercase tracking-wider">
                        Deliverables
                      </div>
                      <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                        {(page.paginatedDelivs || []).map((deliv, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-[10.5px] text-zinc-800 leading-relaxed font-sans">
                            <span className="theme-accent-text font-bold">•</span>
                            <span>{deliv}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Page 1 Custom Premium Cover Page Layout */}
              {pageIdx === 0 && (
                <div className="absolute inset-0 flex flex-col justify-between p-[75px] z-15 select-text">
                  {/* Top Section */}
                  <div className="w-full flex flex-col items-center pt-4">
                    {/* Couple Names / Client x Partner */}
                    <div className="w-full text-center text-3xl font-serif theme-accent-text font-bold tracking-widest">
                      {coupleNames}
                    </div>
                    
                    {/* Border Wrapper for WEDDING QUOTATION */}
                    <div className="w-full border-t border-b border-[#E8E2D9]/80 py-2.5 mt-3 flex flex-col items-center">
                      <span className="text-xs font-serif text-[#C2B280] tracking-[0.25em] font-semibold">
                        WEDDING QUOTATION
                      </span>
                      <div className="text-[10px] text-[#706E6A] font-sans tracking-[0.1em] mt-1.5 text-center">
                        {pages[0]?.elements.find(el => el.id === 'cover-subtitle-2')?.content || 'BOTH SIDES - LOCATION'}
                      </div>
                    </div>
                  </div>

                  {/* Middle Section: Logo */}
                  <div className="absolute top-[38%] left-1/2 -translate-x-1/2 w-[80%] text-center z-20">
                    <div className="text-xl font-bold tracking-[0.18em] theme-accent-text font-serif uppercase">
                      FILMIFY WEDDINGS
                    </div>
                    <div className="text-[7px] text-[#8A7E56] font-sans tracking-[0.3em] uppercase mt-0.5">
                      Premium Editorial Studio
                    </div>
                  </div>

                  {/* Bottom Section: Hero couple image cutout */}
                  <div className="absolute bottom-0 left-10 right-10 top-[48%] flex items-end justify-center z-10">
                    <img 
                      src={pages[0]?.elements.find(el => el.id === 'cover-hero-image')?.content || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800'} 
                      alt="Cover couple cutout" 
                      className="w-full h-full object-contain" 
                    />
                  </div>
                </div>
              )}

              {/* Page 2 Custom Premium About Us Layout */}
              {pageIdx === 1 && (
                <div className="absolute inset-0 flex flex-col justify-between p-[75px] z-10 select-text">
                  {/* Birds flying at the top right */}
                  <div className="absolute top-[8%] right-[15%] opacity-80 pointer-events-none">
                    <svg width="140" height="60" viewBox="0 0 140 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* V-formation birds */}
                      <path d="M10 20 Q15 17 20 20 Q23 17 26 20" stroke={accentColor} strokeWidth="1.2" strokeLinecap="round" fill="none" />
                      <path d="M32 12 Q36 9 40 12 Q43 9 46 12" stroke={accentColor} strokeWidth="1" strokeLinecap="round" fill="none" />
                      <path d="M48 24 Q52 21 56 24 Q59 21 62 24" stroke={accentColor} strokeWidth="1.1" strokeLinecap="round" fill="none" />
                      <path d="M66 16 Q69 13 72 16 Q75 13 78 16" stroke={accentColor} strokeWidth="0.9" strokeLinecap="round" fill="none" />
                      <path d="M84 28 Q87 25 90 28 Q93 25 96 28" stroke={accentColor} strokeWidth="1" strokeLinecap="round" fill="none" />
                      <path d="M100 20 Q103 17 106 20 Q109 17 112 20" stroke={accentColor} strokeWidth="0.8" strokeLinecap="round" fill="none" />
                      <path d="M118 12 Q121 9 124 12 Q127 9 130 12" stroke={accentColor} strokeWidth="0.7" strokeLinecap="round" fill="none" />
                    </svg>
                  </div>

                  {/* Monogram logo */}
                  <div className="w-full flex justify-center items-center h-[120px] select-none mt-4">
                    <div className="relative w-[150px] h-[100px]">
                      {/* U and S */}
                      <div className="absolute left-[15px] top-[32px] flex items-baseline" style={{ color: accentColor }}>
                        <span className="text-7xl font-serif font-light">U</span>
                        <span className="text-[9px] font-sans tracking-[0.15em] ml-1 font-bold">S</span>
                      </div>
                      {/* A and BOUT */}
                      <div className="absolute left-[60px] top-[0px] flex items-baseline" style={{ color: accentColor }}>
                        <span className="text-7xl font-serif font-light">A</span>
                        <span className="text-[9px] font-sans tracking-[0.15em] ml-1 font-bold">BOUT</span>
                      </div>
                    </div>
                  </div>

                  {/* Quote Section */}
                  <div className="relative px-12 py-3 mx-2 my-2 text-center flex items-center justify-center">
                    <span className="absolute left-4 top-0 text-4xl font-serif font-bold" style={{ color: accentColor }}>“</span>
                    <p className="text-[12px] font-sans text-zinc-700 leading-relaxed font-medium">
                      {pages[1]?.elements.find(el => el.id === 'about-quote')?.content}
                    </p>
                    <span className="absolute right-4 bottom-0 text-4xl font-serif font-bold" style={{ color: accentColor }}>”</span>
                  </div>

                  {/* Two Photos Side-by-Side */}
                  <div className="grid grid-cols-2 gap-6 w-full px-2 mt-4">
                    <div className="overflow-hidden rounded-xl bg-[#E8E2D9] relative border border-[#E0D8CC] shadow-sm aspect-[4/5]">
                      <img 
                        src={pages[1]?.elements.find(el => el.id === 'about-img-left')?.content || 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=600'} 
                        alt="About left couple" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="overflow-hidden rounded-xl bg-[#E8E2D9] relative border border-[#E0D8CC] shadow-sm aspect-[4/5]">
                      <img 
                        src={pages[1]?.elements.find(el => el.id === 'about-img-right')?.content || 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&q=80&w=600'} 
                        alt="About right couple" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Page 4 Custom Premium Early Booking Offer Layout */}
              {pageIdx === 3 && (
                <div className="absolute inset-x-[75px] top-[75px] bottom-0 z-10 flex flex-col justify-between select-text">
                  {/* Heading */}
                  <div className="w-full flex flex-col items-center">
                    <div className="text-3xl font-serif theme-accent-text font-bold tracking-widest text-center uppercase">
                      EARLY BOOKING OFFER
                    </div>
                    
                    {/* Offer Price Box */}
                    <div className="border border-[#E8E2D9] px-8 py-2.5 mt-5 rounded-lg text-center bg-white/40 shadow-sm">
                      <span className="text-2xl font-serif font-bold theme-accent-text tracking-wider">
                        Rs {offerPrice.toLocaleString()}/-
                      </span>
                    </div>

                    {/* Regular Price Subtitle */}
                    <div className="text-xs font-medium text-[#706E6A] tracking-wider mt-3">
                      Regular Quotation : Rs {regularPrice.toLocaleString()}/-
                    </div>

                    {/* Exclude notes box */}
                    <div className="border border-[#E8E2D9] px-6 py-2 mt-4 rounded bg-white/20 max-w-[420px] text-center">
                      <span className="text-[9.5px] font-sans text-zinc-500 tracking-wide font-medium leading-relaxed">
                        This excludes travel, accommodation, food & any add-on services.
                      </span>
                    </div>

                    {/* Savings Highlight Banner */}
                    <div className="w-full theme-accent-bg text-white py-3 px-6 mt-6 rounded-xl shadow-sm text-center font-bold text-[12px] tracking-wide font-sans leading-relaxed">
                      Save Rs {savings.toLocaleString()} With Our Special Offer. The Special Offer Ends in the Next 7 days.
                    </div>
                  </div>

                  {/* Logo overlay & bottom palace cover photo */}
                  <div className="relative w-full h-[320px] flex flex-col justify-between items-center mt-6">
                    {/* Centered Logo text right above the cutout skyline */}
                    <div className="text-center z-20 pb-4">
                      <div className="text-lg font-bold tracking-[0.2em] theme-accent-text font-serif uppercase">
                        FILMIFY WEDDINGS
                      </div>
                      <div className="text-[6.5px] text-[#8A7E56] font-sans tracking-[0.3em] uppercase mt-0.5 font-bold">
                        Premium Editorial Studio
                      </div>
                    </div>

                    {/* Palace/Castle cutout photo occupying the bottom */}
                    <div className="w-full h-[250px] relative overflow-hidden rounded-t-3xl border border-[#E0D8CC]/50 shadow-lg">
                      <img 
                        src={pages[3]?.elements.find(el => el.id === 'pricing-palace-image')?.content || 'https://images.unsplash.com/photo-1546412414-8035e1776c9a?auto=format&fit=crop&q=80&w=800'} 
                        alt="Palace backdrop" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* FOOTER BAR */}
              {pageIdx !== 0 && (
                <div className="absolute bottom-6 left-10 right-10 flex items-center justify-between border-t border-[#E8E2D9]/50 pt-3 text-[9px] text-[#8A7E56] font-medium tracking-wide">
                  <span>FILMIFY WEDDINGS</span>
                  <span className="font-serif">Page {pageIdx + 1} of 4</span>
                  <span>DIGITAL QUOTATION</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// Canva-like Bounding Box / Transform Overlay Component
interface MoveableTransformOverlayProps {
  element: CanvasElement;
  pageIndex: number;
  canvasWidth: number;
  canvasHeight: number;
  onChange: (updated: Partial<CanvasElement>) => void;
}

const MoveableTransformOverlay: React.FC<MoveableTransformOverlayProps> = ({
  element,
  pageIndex,
  canvasWidth,
  canvasHeight,
  onChange
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null); // 'tl', 'tr', 'bl', 'br'
  const startPos = useRef({ x: 0, y: 0 });
  const startElementState = useRef({ x: 0, y: 0, width: 0, height: 0, fontSize: 0 });

  const handlePointerDown = (e: React.PointerEvent, action: 'drag' | 'resize', handle?: string) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    startPos.current = { x: e.clientX, y: e.clientY };
    startElementState.current = {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height || 8,
      fontSize: element.fontSize || 16
    };

    if (action === 'drag') {
      setIsDragging(true);
    } else if (action === 'resize' && handle) {
      setIsResizing(handle);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging && !isResizing) return;
    e.stopPropagation();

    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;

    // Convert pixel delta to percentage
    const deltaXPercent = (deltaX / canvasWidth) * 100;
    const deltaYPercent = (deltaY / canvasHeight) * 100;

    if (isDragging) {
      const nextX = Math.max(0, Math.min(100 - startElementState.current.width, startElementState.current.x + deltaXPercent));
      const nextY = Math.max(0, Math.min(100 - startElementState.current.height, startElementState.current.y + deltaYPercent));
      onChange({ x: Number(nextX.toFixed(2)), y: Number(nextY.toFixed(2)) });
    } else if (isResizing) {
      const handle = isResizing;
      let nextWidth = startElementState.current.width;
      let nextHeight = startElementState.current.height;
      let nextX = startElementState.current.x;
      let nextY = startElementState.current.y;

      const minWidthPercent = (20 / canvasWidth) * 100;
      const minHeightPercent = (20 / canvasHeight) * 100;

      if (handle === 'br') {
        nextWidth = startElementState.current.width + deltaXPercent;
        nextHeight = startElementState.current.height + deltaYPercent;
      } else if (handle === 'bl') {
        nextWidth = startElementState.current.width - deltaXPercent;
        nextHeight = startElementState.current.height + deltaYPercent;
        nextX = startElementState.current.x + deltaXPercent;
      } else if (handle === 'tr') {
        nextWidth = startElementState.current.width + deltaXPercent;
        nextHeight = startElementState.current.height - deltaYPercent;
        nextY = startElementState.current.y + deltaYPercent;
      } else if (handle === 'tl') {
        nextWidth = startElementState.current.width - deltaXPercent;
        nextHeight = startElementState.current.height - deltaYPercent;
        nextX = startElementState.current.x + deltaXPercent;
        nextY = startElementState.current.y + deltaYPercent;
      }

      if (nextWidth < minWidthPercent) {
        nextWidth = minWidthPercent;
        if (handle === 'bl' || handle === 'tl') {
          nextX = startElementState.current.x + startElementState.current.width - minWidthPercent;
        }
      }
      if (nextHeight < minHeightPercent) {
        nextHeight = minHeightPercent;
        if (handle === 'tr' || handle === 'tl') {
          nextY = startElementState.current.y + startElementState.current.height - minHeightPercent;
        }
      }

      // STRICT ASPECT RATIO LOCK FOR IMAGES
      if (element.type === 'image') {
        const aspect = startElementState.current.width / startElementState.current.height;
        const scaleW = nextWidth / startElementState.current.width;
        const scaleH = nextHeight / startElementState.current.height;
        const scale = Math.max(scaleW, scaleH);

        nextWidth = startElementState.current.width * scale;
        nextHeight = startElementState.current.height * scale;

        if (handle === 'bl') {
          nextX = startElementState.current.x + (startElementState.current.width - nextWidth);
        } else if (handle === 'tr') {
          nextY = startElementState.current.y + (startElementState.current.height - nextHeight);
        } else if (handle === 'tl') {
          nextX = startElementState.current.x + (startElementState.current.width - nextWidth);
          nextY = startElementState.current.y + (startElementState.current.height - nextHeight);
        }
      }

      // DYNAMIC FONT RESIZING FOR TEXT
      let nextFontSize = startElementState.current.fontSize;
      if (element.type === 'text') {
        const scale = nextWidth / startElementState.current.width;
        nextFontSize = Math.max(6, Math.round(startElementState.current.fontSize * scale));
      }

      onChange({
        x: Number(nextX.toFixed(2)),
        y: Number(nextY.toFixed(2)),
        width: Number(nextWidth.toFixed(2)),
        height: Number(nextHeight.toFixed(2)),
        fontSize: nextFontSize
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(false);
    setIsResizing(null);
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${element.x}%`,
        top: `${element.y}%`,
        width: `${element.width}%`,
        height: `${element.height || 8}%`,
        border: '2px solid #3b82f6',
        pointerEvents: 'auto',
        cursor: 'move',
        zIndex: 40
      }}
      onPointerDown={(e) => handlePointerDown(e, 'drag')}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Corner Handles */}
      {['tl', 'tr', 'bl', 'br'].map((handle) => {
        const style: React.CSSProperties = {
          position: 'absolute',
          width: '8px',
          height: '8px',
          backgroundColor: '#ffffff',
          border: '2px solid #3b82f6',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 50
        };

        if (handle === 'tl') { style.left = '0'; style.top = '0'; style.cursor = 'nwse-resize'; }
        if (handle === 'tr') { style.left = '100%'; style.top = '0'; style.cursor = 'nesw-resize'; }
        if (handle === 'bl') { style.left = '0'; style.top = '100%'; style.cursor = 'nesw-resize'; }
        if (handle === 'br') { style.left = '100%'; style.top = '100%'; style.cursor = 'nwse-resize'; }

        return (
          <div
            key={handle}
            style={style}
            onPointerDown={(e) => handlePointerDown(e, 'resize', handle)}
          />
        );
      })}
    </div>
  );
};

