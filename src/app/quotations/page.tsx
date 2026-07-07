'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Sparkles, Save, Upload, Trash2, Plus, Check, Edit2, 
  Trash, ArrowLeft, ArrowRight, RotateCcw, Image as ImageIcon, 
  ChevronLeft, ChevronRight, FileDown, Type, AlignLeft, AlignCenter, 
  AlignRight, Bold, HelpCircle, Layout, Database, Sliders, CheckCircle2, 
  AlertCircle, DollarSign, RefreshCw
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

const DEFAULT_FUNCTIONS = [
  {
    id: 'func-haldi',
    title: '4 JAN - HALDI',
    items: ['Traditional Photography', 'Professional Traditional Videography', 'Candid Photography', 'Jaw-dropping Cinematography']
  },
  {
    id: 'func-sangeet',
    title: '4 JAN - SANGEET',
    items: ['Traditional Photography', 'Professional Traditional Videography', 'Candid Photography', 'Jaw-dropping Cinematography']
  },
  {
    id: 'func-wedding',
    title: '5 JAN - WEDDING',
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

  // Database / Templates States
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [activeQuotationId, setActiveQuotationId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Image Swap Modal States
  const [showImageModal, setShowImageModal] = useState(false);
  const [targetImageElement, setTargetImageElement] = useState<{ pageIndex: number; elementId: string } | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Inline edit state for elements
  const [inlineEditingText, setInlineEditingText] = useState<string | null>(null);

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
            group = { id: `func-${item.label?.toLowerCase().replace(/\s+/g, '-')}`, title: item.label || '', items: [] };
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

  // Save current workspace state to database
  const saveQuotation = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Format Page 3 dynamic elements into page state before saving
    const updatedPages = pages.map(page => {
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
            label: f.title
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
      setFunctions(prFuncs.map((f, i) => ({
        id: `func-preset-${i}`,
        title: f.date,
        items: f.items
      })));
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

  const deleteFunctionItem = (funcId: string, itemIndex: number) => {
    setFunctions(prev => prev.map(f => {
      if (f.id === funcId) {
        return { ...f, items: f.items.filter((_, idx) => idx !== itemIndex) };
      }
      return f;
    }));
  };

  const editFunctionItem = (funcId: string, itemIndex: number, newValue: string) => {
    setFunctions(prev => prev.map(f => {
      if (f.id === funcId) {
        const updatedItems = [...f.items];
        updatedItems[itemIndex] = newValue;
        return { ...f, items: updatedItems };
      }
      return f;
    }));
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
            </div>
            <button 
              onClick={resetToNew} 
              className="w-full text-center py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg font-medium transition flex items-center justify-center gap-1.5 border border-zinc-700/50"
            >
              <Plus className="w-3.5 h-3.5" />
              Create New Quotation
            </button>
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
              Page {activePageIndex + 1} of 4
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
                onClick={() => setActivePageIndex(prev => Math.min(3, prev + 1))}
                disabled={activePageIndex === 3}
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
          className="flex-1 overflow-y-auto p-10 flex flex-col items-center justify-start bg-[#F3EFEA] relative"
          onClick={() => setSelectedElement(null)}
        >
          
          {/* THE DIGITAL MATTE COVER PAPER PAGE (SCALABLE & SELECTABLE) */}
          <div 
            id="quotation-canvas-container"
            className="w-full max-w-[620px] shadow-2xl rounded-2xl overflow-hidden border border-[#E0D8CC] transition-all relative transform duration-300 hover:shadow-black/10 flex flex-col"
          >
            
            {/* The active canvas page with matte paper texture styling */}
            <div 
              className="relative aspect-[1/1.414] w-full bg-[#FAF6F0] p-10 flex flex-col justify-between select-none relative overflow-hidden"
              style={{
                backgroundImage: `radial-gradient(#ebe5da 1.5px, transparent 1.5px), radial-gradient(#ebe5da 1.5px, #FAF6F0 1.5px)`,
                backgroundSize: '30px 30px',
                backgroundPosition: '0 0, 15px 15px'
              }}
            >
              
              {/* Dynamic canvas element rendering */}
              {pages[activePageIndex]?.elements.map(el => {
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

              {/* DYNAMIC LIST COMPONENTS FOR PAGE 3 ONLY */}
              {activePageIndex === 2 && (
                <div className="absolute inset-x-10 top-[14%] bottom-8 flex flex-col justify-between z-10 select-text overflow-y-auto pr-1">
                  
                  {/* FUNCTIONS GRID (Haldi, Sangeet, Wedding) */}
                  <div className="grid grid-cols-3 gap-6">
                    {functions.map(func => (
                      <div key={func.id} className="bg-white/60 backdrop-blur-sm border border-[#E8E2D9]/70 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                        <div>
                          <div className="bg-[#606248] text-white text-[10px] font-bold tracking-widest uppercase rounded-full px-2.5 py-1 text-center font-serif mb-3">
                            {func.title}
                          </div>
                          
                          <ul className="space-y-1.5">
                            {func.items.map((item, idx) => (
                              <li key={idx} className="group flex items-start gap-1.5 text-[11px] font-medium text-zinc-700 leading-tight">
                                <span className="text-[#606248]">•</span>
                                <input
                                  type="text"
                                  value={item}
                                  onChange={e => editFunctionItem(func.id, idx, e.target.value)}
                                  className="bg-transparent border-none p-0 flex-1 focus:outline-none focus:ring-0 text-[11px] text-zinc-700 font-sans"
                                />
                                <button
                                  onClick={() => deleteFunctionItem(func.id, idx)}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 text-rose-500 hover:bg-rose-50 rounded transition"
                                >
                                  <Trash className="w-3 h-3" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <button
                          onClick={() => addFunctionItem(func.id)}
                          className="mt-3.5 w-full py-1 border border-dashed border-[#606248]/40 hover:border-[#606248] text-[#606248] hover:bg-[#606248]/5 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add Item
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* DELIVERABLES LIST BLOCK */}
                  <div className="bg-white/50 backdrop-blur-sm border border-[#E8E2D9]/50 rounded-xl p-5 mt-4 shadow-sm flex flex-col justify-between">
                    <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                      {deliverables.map((deliv, idx) => (
                        <li key={idx} className="group flex items-start gap-2 text-[11.5px] text-zinc-800 leading-relaxed font-sans">
                          <span className="text-[#606248] font-bold mt-0.5">•</span>
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

                    <button
                      onClick={addDeliverableItem}
                      className="mt-4 w-full py-1.5 border border-dashed border-[#606248]/30 hover:border-[#606248] text-[#606248] hover:bg-[#606248]/5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Deliverable
                    </button>
                  </div>

                </div>
              )}

              {/* FOOTER BAR (Cover brand branding) */}
              <div className="absolute bottom-6 left-10 right-10 flex items-center justify-between border-t border-[#E8E2D9]/50 pt-3 text-[9px] text-[#8A7E56] font-medium tracking-wide">
                <span>FILMIFY WEDDINGS</span>
                <span className="font-serif">Page {activePageIndex + 1} of 4</span>
                <span>DIGITAL QUOTATION</span>
              </div>

            </div>

          </div>

          {/* PAGE DOT INDICATORS */}
          <div className="flex items-center gap-2.5 mt-6 z-10">
            {[0, 1, 2, 3].map(pageIdx => (
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
              {page.elements.map(el => {
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
                          ? 'bg-[#606248] text-white px-4 rounded-xl shadow-sm' 
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

              {/* Page 3 Custom layout */}
              {pageIdx === 2 && (
                <div className="absolute inset-x-10 top-[14%] bottom-8 flex flex-col justify-between z-10">
                  {/* FUNCTIONS GRID */}
                  <div className="grid grid-cols-3 gap-6">
                    {functions.map(func => (
                      <div key={func.id} className="bg-white/60 border border-[#E8E2D9]/70 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                        <div>
                          <div className="bg-[#606248] text-white text-[10px] font-bold tracking-widest uppercase rounded-full px-2.5 py-1 text-center font-serif mb-3">
                            {func.title}
                          </div>
                          <ul className="space-y-1.5">
                            {func.items.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 text-[11px] font-medium text-zinc-700 leading-tight">
                                <span className="text-[#606248]">•</span>
                                <span className="font-sans">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* DELIVERABLES LIST */}
                  <div className="bg-white/50 border border-[#E8E2D9]/50 rounded-xl p-5 mt-4 shadow-sm">
                    <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                      {deliverables.map((deliv, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[11.5px] text-zinc-800 leading-relaxed font-sans">
                          <span className="text-[#606248] font-bold mt-0.5">•</span>
                          <span>{deliv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* FOOTER BAR */}
              <div className="absolute bottom-6 left-10 right-10 flex items-center justify-between border-t border-[#E8E2D9]/50 pt-3 text-[9px] text-[#8A7E56] font-medium tracking-wide">
                <span>FILMIFY WEDDINGS</span>
                <span className="font-serif">Page {pageIdx + 1} of 4</span>
                <span>DIGITAL QUOTATION</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
