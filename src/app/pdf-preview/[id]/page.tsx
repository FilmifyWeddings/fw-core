import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { BirdsSVG, MonogramSVG } from '@/components/QuotationSVGs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// Color Themes Registry
const COLOR_THEMES: Record<string, any> = {
  'cherry-red-cream': { primary: '#750505', background: '#FBFCEB', text: '#750505', kicker: '#750505', borderColor: 'rgba(117, 5, 5, 0.2)', boxBgColor: 'rgba(117, 5, 5, 0.06)' },
  'cream-cherry-red': { primary: '#FBFCEB', background: '#750505', text: '#FBFCEB', kicker: '#FFECD1', borderColor: 'rgba(251, 252, 235, 0.25)', boxBgColor: 'rgba(251, 252, 235, 0.08)' },
  'cyprus-sand-dune': { primary: '#004643', background: '#F0EDE5', text: '#004643', kicker: '#004643', borderColor: 'rgba(0, 70, 67, 0.2)', boxBgColor: 'rgba(0, 70, 67, 0.06)' },
  'sand-dune-cyprus': { primary: '#F0EDE5', background: '#004643', text: '#F0EDE5', kicker: '#E6CFA7', borderColor: 'rgba(240, 237, 229, 0.25)', boxBgColor: 'rgba(240, 237, 229, 0.08)' },
  'plum-milk': { primary: '#381932', background: '#FFF3E6', text: '#381932', kicker: '#381932', borderColor: 'rgba(56, 25, 50, 0.2)', boxBgColor: 'rgba(56, 25, 50, 0.06)' },
  'milk-plum': { primary: '#FFF3E6', background: '#381932', text: '#FFF3E6', kicker: '#FFECD1', borderColor: 'rgba(255, 243, 230, 0.25)', boxBgColor: 'rgba(255, 243, 230, 0.08)' },
  'sand-chocolate': { primary: '#3E000C', background: '#FFECD1', text: '#3E000C', kicker: '#3E000C', borderColor: 'rgba(62, 0, 12, 0.2)', boxBgColor: 'rgba(62, 0, 12, 0.06)' },
  'chocolate-sand': { primary: '#FFECD1', background: '#3E000C', text: '#FFECD1', kicker: '#FFECD1', borderColor: 'rgba(255, 236, 209, 0.25)', boxBgColor: 'rgba(255, 236, 209, 0.08)' },
  'feldgrau-wheat': { primary: '#3A4B41', background: '#E6CFA7', text: '#3A4B41', kicker: '#3A4B41', borderColor: 'rgba(58, 75, 65, 0.2)', boxBgColor: 'rgba(58, 75, 65, 0.06)' },
  'wheat-feldgrau': { primary: '#E6CFA7', background: '#3A4B41', text: '#E6CFA7', kicker: '#E6CFA7', borderColor: 'rgba(230, 207, 167, 0.25)', boxBgColor: 'rgba(230, 207, 167, 0.08)' },
  'noctis-marigold': { primary: '#1F2235', background: '#E3A419', text: '#1F2235', kicker: '#1F2235', borderColor: 'rgba(31, 34, 53, 0.2)', boxBgColor: 'rgba(31, 34, 53, 0.08)' },
  'marigold-noctis': { primary: '#E3A419', background: '#1F2235', text: '#E3A419', kicker: '#E3A419', borderColor: 'rgba(227, 164, 25, 0.25)', boxBgColor: 'rgba(227, 164, 25, 0.08)' },
  'champagne-obsidian': { primary: '#111111', background: '#F7F4EF', text: '#111111', kicker: '#71717A', borderColor: 'rgba(228, 228, 231, 1)', boxBgColor: 'rgba(244, 244, 245, 1)' },
  'obsidian-champagne': { primary: '#F7F4EF', background: '#111111', text: '#F7F4EF', kicker: '#D4D4D8', borderColor: 'rgba(247, 244, 239, 0.25)', boxBgColor: 'rgba(247, 244, 239, 0.08)' },
  'forest-olive-ivory': { primary: '#2C352E', background: '#F2EFE9', text: '#2C352E', kicker: '#58695C', borderColor: 'rgba(44, 53, 46, 0.2)', boxBgColor: 'rgba(44, 53, 46, 0.06)' },
  'ivory-forest-olive': { primary: '#F2EFE9', background: '#2C352E', text: '#F2EFE9', kicker: '#E2DFD9', borderColor: 'rgba(242, 239, 233, 0.25)', boxBgColor: 'rgba(242, 239, 233, 0.08)' },
  'airy-white': { primary: '#27272A', background: '#FFFFFF', text: '#27272A', kicker: '#A1A1AA', borderColor: 'rgba(228, 228, 231, 1)', boxBgColor: 'rgba(244, 244, 245, 1)' },
  'royal-gold': { primary: '#8A6D2F', background: '#FFF8EA', text: '#8A6D2F', kicker: '#8A6D2F', borderColor: 'rgba(138, 109, 47, 0.25)', boxBgColor: 'rgba(138, 109, 47, 0.08)' },
  'dark-studio': { primary: '#F3F4F6', background: '#141622', text: '#F3F4F6', kicker: '#E5C365', borderColor: '#232634', boxBgColor: '#0F1017' }
};

const DEFAULT_PAGE_SEQUENCE = [
  { id: 'cover', type: 'cover', label: 'Cover Page' },
  { id: 'aboutUs', type: 'aboutUs', label: 'About Us' },
  { id: 'shootDetails', type: 'shootDetails', label: 'Pre-Wedding Shoot' },
  { id: 'functionsPage', type: 'functionsPage', label: 'Functions & Coverage' },
  { id: 'deliverablesPage', type: 'deliverablesPage', label: 'Deliverables' },
  { id: 'specialValueAdditions', type: 'specialValueAdditions', label: 'Special Value Additions' },
  { id: 'pricingPage', type: 'pricingPage', label: 'Pricing Details' },
  { id: 'paymentTermsPage', type: 'paymentTermsPage', label: 'Payment Terms & Schedule' },
  { id: 'addOnsPage', type: 'addOnsPage', label: 'Add-Ons & Upgrades' },
  { id: 'termsPage', type: 'termsPage', label: 'Terms & Conditions' },
  { id: 'thankYouPage', type: 'thankYouPage', label: 'Thank You Page' }
];

interface PdfPreviewProps {
  params: Promise<{ id: string }>;
}

export default async function PdfPreviewPage({ params }: PdfPreviewProps) {
  const { id } = await params;

  // 1. Fetch document directly from Supabase DB
  let documentData: any = null;

  const { data: doc } = await supabaseAdmin
    .from('quotation_documents')
    .select('content_json')
    .eq('template_id', id)
    .maybeSingle();

  if (doc?.content_json) {
    documentData = doc.content_json;
  } else {
    const { data: legacy } = await supabaseAdmin
      .from('quotations')
      .select('content_json')
      .or(`id.eq.${id},quotation_number.eq.${id}`)
      .maybeSingle();
    documentData = legacy?.content_json || {};
  }

  const themeKey = documentData?.look || documentData?.theme || 'cyprus-sand-dune';
  const theme = COLOR_THEMES[themeKey] || COLOR_THEMES['cyprus-sand-dune'];
  const primaryFont = documentData?.primaryFont || "'Cormorant Garamond', serif";
  const secondaryFont = documentData?.secondaryFont || "'Plus Jakarta Sans', sans-serif";

  const pageSequence = (documentData?.pageSequence && documentData.pageSequence.length > 0) 
    ? documentData.pageSequence 
    : DEFAULT_PAGE_SEQUENCE;

  const cover = documentData?.cover || {};
  const coupleName = cover.coupleName || (cover.groomName ? `${cover.groomName} & ${cover.brideName}` : 'RAHUL & NEHA');
  const eventType = (cover.eventType || 'WEDDING').toUpperCase();
  const sideOption = cover.sideOption || 'BOTH SIDES';
  const locationName = cover.locationName || cover.location || 'MUMBAI';
  const brandName = cover.brandName || 'FILMIFY WEDDINGS';
  const brandLogoUrl = cover.brandLogoUrl || '';
  const coverPhoto = cover.photoUrl || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80';

  const aboutUs = documentData?.aboutUs || documentData?.about || {
    kicker: 'INTRODUCTION',
    heading: 'ABOUT US',
    text: 'Glowwed films strive to capture your love story in the most gracious way possible. All the memories of your event will be hand-picked with precision and made into films & photographs that you can cherish forever'
  };

  const shootDetails = documentData?.shootDetails || {
    kicker: 'WHAT WE DO',
    heading: 'Pre-Wedding Shoot',
    daysText: '1 Day Shoot\nCandid Photography\nCinematography\nPortable Changing Room',
    crewText: 'Full Ultra HD Super-Fine Raw Photos\nApprox 50 High Resolution Edited Images\n3 Save The Dates Photos\n1 count Down Reel\n1 video Reel'
  };

  const functionsPage = documentData?.functionsPage || {
    kicker: 'EVENT SCHEDULE',
    heading: 'Functions & Coverage',
    items: [
      { id: '1', title: 'HALDI & SANGEET', dateTime: '4 MAR 26 • 10:00 AM TO 05:00 PM • (7 Hours)', venue: 'JW MARRIOTT, MUMBAI', team: '2x Candid Photographers | 2x Cinematographers | 1x Drone' },
      { id: '2', title: 'WEDDING', dateTime: '5 MAR 26 • 04:00 PM TO 11:00 PM • (7 Hours)', venue: 'PALACE GROUNDS, MUMBAI', team: '2x Candid Photographers | 2x Cinematographers | 1x Drone | 1x Traditional Video' }
    ]
  };

  const deliverablesPage = documentData?.deliverablesPage || {
    kicker: 'WHAT WE DELIVER',
    heading: 'DELIVERABLES',
    selectedItems: ['Teaser Video (1-2 Min)', 'Main Highlight Film (15-20 Min)', 'Instagram Reels', 'All Raw Photos & Footage in Hard Drive', '75-80 Retouched High-Res Images']
  };

  const specialValueAdditions = documentData?.specialValueAdditions || {
    kicker: 'COMPLIMENTARY',
    heading: 'SPECIAL VALUE ADDITIONS',
    items: [
      { id: '1', title: 'Complimentary Pre-Wedding Session (1 Day)', free: true },
      { id: '2', title: 'Free Luxury Album Upgrade (40 Pages)', free: true },
      { id: '3', title: 'Drone Coverage Included for Wedding & Sangeet', free: true },
      { id: '4', title: 'Same Day Edit Reel for Instagram', free: true }
    ]
  };

  const pricingPage = documentData?.pricingPage || {
    kicker: 'INVESTMENT SUMMARY',
    heading: 'PRICING DETAILS',
    basePrice: 170000,
    discountAmount: 10000,
    discountPercent: 5
  };

  const paymentTermsPage = documentData?.paymentTermsPage || {
    kicker: 'PAYMENT SCHEDULE',
    heading: 'PAYMENT TERMS & SCHEDULE',
    steps: [
      { id: '1', stepName: 'Token Booking Amount', date: '10 FEB 26', amount: 25000, status: 'COMPLETED' },
      { id: '2', stepName: 'Advance Amount (Pre-Event)', date: '01 MAR 26', amount: 75000, status: 'PENDING' },
      { id: '3', stepName: 'On Wedding Day', date: '06 MAR 26', amount: 50000, status: 'PENDING' },
      { id: '4', stepName: 'Final Delivery Amount', date: '25 MAR 26', amount: 20000, status: 'PENDING' }
    ]
  };

  const addOnsPage = documentData?.addOnsPage || {
    kicker: "EMBRACE YOUR DAY - YOU'RE IN CONTROL",
    heading: 'ADD-ONS & UPGRADES',
    items: [
      { id: '1', title: 'Additional Candid Photographer', price: 15000 },
      { id: '2', title: 'Additional Cinematographer', price: 22000 },
      { id: '3', title: 'Extra Album Pages (Per 10 Pages)', price: 5000 }
    ]
  };

  const termsPage = documentData?.termsPage || {
    kicker: 'POLICIES & RULES',
    heading: 'TERMS & CONDITIONS',
    text: '1. Advance payment is non-refundable upon booking confirmation.\n2. Travel and accommodation charges outside base city shall be borne by client.\n3. Raw footage and unedited photos will be delivered as per agreed timelines.\n4. One cycle of revision is included for final video edits within 30 days of delivery.'
  };

  const thankYouPage = documentData?.thankYouPage || {
    heading: 'THANK YOU',
    subHeading: 'LOOKING FORWARD TO CREATING MAGIC',
    message: 'We would be honored to capture your celebration and create memories for a lifetime.',
    brandName: brandName,
    contactNumber: '+91 98765 43210',
    email: 'contact@filmifyweddings.com',
    website: 'www.filmifyweddings.com'
  };

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=794, initial-scale=1" />
        <title>{documentData?.designName || 'Quotation Preview'} - Canva Vector Engine</title>

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;800;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" 
          rel="stylesheet" 
        />

        <style>{`
          * {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            word-spacing: normal !important;
            font-variant-ligatures: none !important;
          }
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: ${theme.text} !important;
            font-family: ${secondaryFont} !important;
            width: 794px !important;
          }
          .pdf-container {
            width: 794px !important;
            margin: 0 auto !important;
            background: #ffffff !important;
          }
          .pdf-page {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            min-height: 297mm !important;
            padding: 48px !important;
            position: relative !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            background-color: ${theme.background} !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
          }
          .primary-font {
            font-family: ${primaryFont} !important;
          }
        `}</style>
      </head>
      <body>
        <div id="quotation-full-canvas" className="pdf-container" data-rendered="true">
          
          {pageSequence.map((pageItem: any, idx: number) => {
            const pageType = pageItem.type || pageItem.id;

            return (
              <React.Fragment key={pageItem.id || idx}>

                {/* 1. COVER PAGE */}
                {pageType === 'cover' && (
                  <section className="pdf-page flex flex-col justify-between items-center text-center">
                    <div className="w-full flex flex-col items-center space-y-4 pt-6">
                      <BirdsSVG textColor={theme.primary} />
                      <div className="space-y-3">
                        <h1 className="primary-font text-5xl tracking-[0.18em] uppercase font-black leading-tight drop-shadow-xs" style={{ color: theme.text }}>
                          {coupleName}
                        </h1>
                        <h3 className="primary-font text-base tracking-[0.2em] uppercase font-bold pt-1" style={{ color: theme.text }}>
                          {eventType} QUOTATION
                        </h3>
                      </div>
                    </div>

                    {coverPhoto && (
                      <div className="w-full h-[450px] rounded-2xl overflow-hidden shadow-sm my-6">
                        <img 
                          src={coverPhoto} 
                          alt="Cover Photo" 
                          className="w-full h-full object-cover" 
                          crossOrigin="anonymous"
                        />
                      </div>
                    )}

                    <div className="w-full flex flex-col items-center space-y-3 pb-4">
                      {(sideOption || locationName) && (
                        <p className="text-xs uppercase font-extrabold tracking-widest text-center" style={{ color: theme.text }}>
                          {[sideOption, locationName].filter(Boolean).join(' • ')}
                        </p>
                      )}

                      {(brandLogoUrl || brandName) && (
                        <div className="flex flex-col items-center gap-1.5 pt-1">
                          {brandLogoUrl && (
                            <img 
                              src={brandLogoUrl} 
                              alt="Brand Logo" 
                              crossOrigin="anonymous"
                              className="h-12 w-auto object-contain bg-transparent"
                            />
                          )}
                          {brandName && (
                            <p className="text-[11px] uppercase tracking-[0.25em] font-black text-center" style={{ color: theme.kicker }}>
                              {brandName}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* 2. ABOUT US */}
                {pageType === 'aboutUs' && (
                  <section className="pdf-page flex flex-col justify-between items-center text-center">
                    <div className="w-full max-w-xl mx-auto space-y-4 my-auto">
                      <span className="text-xs tracking-[0.25em] font-bold uppercase block" style={{ color: theme.kicker }}>
                        {aboutUs.kicker || 'INTRODUCTION'}
                      </span>
                      <h2 className="primary-font text-3xl uppercase tracking-widest font-normal" style={{ color: theme.text }}>
                        {aboutUs.heading || 'ABOUT US'}
                      </h2>
                      <p className="text-sm leading-relaxed opacity-90 font-normal pt-2 whitespace-pre-line text-center">
                        {aboutUs.text}
                      </p>
                      <div className="pt-4 flex justify-center">
                        <MonogramSVG textColor={theme.text} className="opacity-80 h-12 w-auto" />
                      </div>
                    </div>
                  </section>
                )}

                {/* 3. PRE-WEDDING SHOOT */}
                {pageType === 'shootDetails' && (
                  <section className="pdf-page flex flex-col justify-between items-center text-center">
                    <div className="w-full max-w-xl mx-auto space-y-4 my-auto">
                      <span className="text-xs tracking-[0.25em] font-bold uppercase block" style={{ color: theme.kicker }}>
                        {shootDetails.kicker || 'WHAT WE DO'}
                      </span>
                      <h2 className="primary-font text-3xl uppercase tracking-widest font-normal" style={{ color: theme.text }}>
                        {shootDetails.heading || 'Pre-Wedding Shoot'}
                      </h2>

                      <div className="grid grid-cols-2 gap-3 text-left pt-2">
                        <div className="p-4 rounded-xl border space-y-1" style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor, color: theme.text }}>
                          <span className="text-[10px] font-bold uppercase opacity-75" style={{ color: theme.kicker }}>Duration &amp; Days</span>
                          <p className="text-xs font-bold whitespace-pre-line">{shootDetails.daysText}</p>
                        </div>
                        <div className="p-4 rounded-xl border space-y-1" style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor, color: theme.text }}>
                          <span className="text-[10px] font-bold uppercase opacity-75" style={{ color: theme.kicker }}>Crew &amp; Equipment</span>
                          <p className="text-xs font-bold whitespace-pre-line">{shootDetails.crewText}</p>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* 4. FUNCTIONS & COVERAGE */}
                {pageType === 'functionsPage' && (
                  <section className="pdf-page flex flex-col justify-between items-center text-center">
                    <div className="w-full max-w-xl mx-auto space-y-4 my-auto">
                      <span className="text-xs tracking-[0.25em] font-bold uppercase block" style={{ color: theme.kicker }}>
                        {functionsPage.kicker || 'EVENT SCHEDULE'}
                      </span>
                      <h2 className="primary-font text-3xl uppercase tracking-widest font-normal" style={{ color: theme.text }}>
                        {functionsPage.heading || 'Functions & Coverage'}
                      </h2>

                      <div className="grid grid-cols-2 gap-3 text-left pt-2">
                        {(functionsPage.items || []).map((item: any, fIdx: number) => (
                          <div key={item.id || fIdx} className="p-4 rounded-xl border space-y-1.5" style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor, color: theme.text }}>
                            <h4 className="primary-font text-sm font-extrabold uppercase">{item.title || item.name}</h4>
                            {item.dateTime && <p className="text-[11px] font-semibold opacity-80">{item.dateTime}</p>}
                            {item.venue && <p className="text-[11px] font-medium opacity-75">{item.venue}</p>}
                            {item.team && <p className="text-[10px] font-mono font-bold pt-1 opacity-90" style={{ color: theme.kicker }}>{item.team}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* 5. DELIVERABLES */}
                {pageType === 'deliverablesPage' && (
                  <section className="pdf-page flex flex-col justify-between items-center text-center">
                    <div className="w-full max-w-xl mx-auto space-y-4 my-auto">
                      <span className="text-xs tracking-[0.25em] font-bold uppercase block" style={{ color: theme.kicker }}>
                        {deliverablesPage.kicker || 'WHAT WE DELIVER'}
                      </span>
                      <h2 className="primary-font text-3xl uppercase tracking-widest font-normal" style={{ color: theme.text }}>
                        {deliverablesPage.heading || 'DELIVERABLES'}
                      </h2>

                      <div className="space-y-2 text-left pt-2">
                        {(deliverablesPage.selectedItems || deliverablesPage.items || []).map((item: any, dIdx: number) => (
                          <div key={dIdx} className="p-3.5 rounded-xl border flex items-center gap-3" style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor, color: theme.text }}>
                            <div className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold" style={{ borderColor: theme.kicker, color: theme.kicker }}>✓</div>
                            <span className="text-xs font-bold">{typeof item === 'string' ? item : item.title || item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* 6. SPECIAL VALUE ADDITIONS */}
                {pageType === 'specialValueAdditions' && (
                  <section className="pdf-page flex flex-col justify-between items-center text-center">
                    <div className="w-full max-w-xl mx-auto space-y-4 my-auto">
                      <span className="text-xs tracking-[0.25em] font-bold uppercase block" style={{ color: theme.kicker }}>
                        {specialValueAdditions.kicker || 'COMPLIMENTARY'}
                      </span>
                      <h2 className="primary-font text-3xl uppercase tracking-widest font-normal" style={{ color: theme.text }}>
                        {specialValueAdditions.heading || 'SPECIAL VALUE ADDITIONS'}
                      </h2>

                      <div className="space-y-2 text-left pt-2">
                        {(specialValueAdditions.items || []).map((item: any, sIdx: number) => (
                          <div key={item.id || sIdx} className="p-3.5 rounded-xl border flex items-center justify-between" style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor, color: theme.text }}>
                            <span className="text-xs font-bold">{item.title || item.name}</span>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border" style={{ borderColor: theme.kicker, color: theme.kicker }}>FREE</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* 7. PRICING DETAILS */}
                {pageType === 'pricingPage' && (
                  <section className="pdf-page flex flex-col justify-between items-center text-center">
                    <div className="w-full max-w-xl mx-auto space-y-4 my-auto">
                      <span className="text-xs tracking-[0.25em] font-bold uppercase block" style={{ color: theme.kicker }}>
                        {pricingPage.kicker || 'INVESTMENT SUMMARY'}
                      </span>
                      <h2 className="primary-font text-3xl uppercase tracking-widest font-normal" style={{ color: theme.text }}>
                        {pricingPage.heading || 'PRICING DETAILS'}
                      </h2>

                      <div className="p-6 rounded-2xl border space-y-4 text-left shadow-xs" style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor, color: theme.text }}>
                        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: theme.borderColor }}>
                          <span className="text-xs font-bold uppercase">Package Base Quote</span>
                          <span className="text-sm font-extrabold font-sans">₹{Number(pricingPage.basePrice || 0).toLocaleString('en-IN')}</span>
                        </div>

                        {Number(pricingPage.discountAmount || 0) > 0 && (
                          <div className="flex items-center justify-between text-emerald-600 font-bold text-xs border-b pb-3" style={{ borderColor: theme.borderColor }}>
                            <span>Special Discount ({pricingPage.discountPercent || 0}%)</span>
                            <span className="font-sans">- ₹{Number(pricingPage.discountAmount).toLocaleString('en-IN')}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <span className="text-sm font-extrabold uppercase" style={{ color: theme.kicker }}>Net Total Investment</span>
                          <span className="text-2xl font-black text-amber-700 font-sans">₹{Number((pricingPage.basePrice || 0) - (pricingPage.discountAmount || 0)).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* 8. PAYMENT TERMS */}
                {pageType === 'paymentTermsPage' && (
                  <section className="pdf-page flex flex-col justify-between items-center text-center">
                    <div className="w-full max-w-xl mx-auto space-y-4 my-auto">
                      <span className="text-xs tracking-[0.25em] font-bold uppercase block" style={{ color: theme.kicker }}>
                        {paymentTermsPage.kicker || 'PAYMENT SCHEDULE'}
                      </span>
                      <h2 className="primary-font text-3xl uppercase tracking-widest font-normal" style={{ color: theme.text }}>
                        {paymentTermsPage.heading || 'PAYMENT TERMS & SCHEDULE'}
                      </h2>

                      <div className="rounded-2xl overflow-hidden border text-left shadow-xs" style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor, color: theme.text }}>
                        <table className="w-full text-xs border-collapse">
                          <thead className="text-[10px] uppercase font-bold border-b" style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor, color: theme.kicker }}>
                            <tr>
                              <th className="py-3 px-4">Milestone</th>
                              <th className="py-3 px-4">Due Date</th>
                              <th className="py-3 px-4 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y font-semibold" style={{ borderColor: theme.borderColor }}>
                            {(paymentTermsPage.steps || []).map((step: any, stIdx: number) => (
                              <tr key={step.id || stIdx} style={{ borderColor: theme.borderColor }}>
                                <td className="py-3.5 px-4 font-bold">{step.stepName}</td>
                                <td className="py-3.5 px-4">{step.date}</td>
                                <td className="py-3.5 px-4 text-right font-sans font-bold">₹{Number(step.amount || 0).toLocaleString('en-IN')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>
                )}

                {/* 9. ADD-ONS */}
                {pageType === 'addOnsPage' && (
                  <section className="pdf-page flex flex-col justify-between items-center text-center">
                    <div className="w-full max-w-xl mx-auto space-y-4 my-auto">
                      <span className="text-xs tracking-[0.25em] font-bold uppercase block" style={{ color: theme.kicker }}>
                        {addOnsPage.kicker || "EMBRACE YOUR DAY - YOU'RE IN CONTROL"}
                      </span>
                      <h2 className="primary-font text-3xl uppercase tracking-widest font-normal" style={{ color: theme.text }}>
                        {addOnsPage.heading || 'ADD-ONS & UPGRADES'}
                      </h2>

                      <div className="space-y-2 text-left pt-2">
                        {(addOnsPage.items || []).map((item: any, aIdx: number) => (
                          <div key={item.id || aIdx} className="p-3.5 rounded-xl border flex items-center justify-between" style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor, color: theme.text }}>
                            <span className="text-xs font-bold">{item.title}</span>
                            <span className="text-xs font-black font-sans">₹{Number(item.price || 0).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* 10. TERMS & CONDITIONS */}
                {pageType === 'termsPage' && (
                  <section className="pdf-page flex flex-col justify-between items-center text-center">
                    <div className="w-full max-w-xl mx-auto space-y-4 my-auto">
                      <span className="text-xs tracking-[0.25em] font-bold uppercase block mb-2" style={{ color: theme.kicker }}>
                        {termsPage.kicker || 'POLICIES & RULES'}
                      </span>
                      <h2 className="primary-font text-3xl uppercase tracking-widest font-normal mb-6" style={{ color: theme.text }}>
                        {termsPage.heading || 'TERMS & CONDITIONS'}
                      </h2>

                      <div className="p-6 rounded-2xl border shadow-xs leading-relaxed text-left space-y-3" style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor, color: theme.text }}>
                        <p className="text-xs whitespace-pre-line leading-relaxed opacity-90 font-medium">
                          {termsPage.text}
                        </p>
                      </div>
                    </div>
                  </section>
                )}

                {/* 11. THANK YOU PAGE */}
                {pageType === 'thankYouPage' && (
                  <section className="pdf-page flex flex-col justify-between items-center text-center py-14">
                    <div className="space-y-4 max-w-xl mx-auto my-auto">
                      <h1 className="primary-font text-5xl uppercase tracking-[0.2em] font-black leading-tight" style={{ color: theme.text }}>
                        {thankYouPage.heading || 'THANK YOU'}
                      </h1>
                      <h3 className="text-xs uppercase tracking-[0.25em] font-bold" style={{ color: theme.kicker }}>
                        {thankYouPage.subHeading || 'LOOKING FORWARD TO CREATING MAGIC'}
                      </h3>

                      {thankYouPage.message && (
                        <p className="text-sm leading-relaxed opacity-90 pt-3 max-w-md mx-auto" style={{ color: theme.text }}>
                          "{thankYouPage.message}"
                        </p>
                      )}
                    </div>

                    <div className="w-full pt-6 border-t" style={{ borderColor: theme.borderColor }}>
                      <div className="flex flex-row items-center justify-between gap-4 text-xs font-semibold">
                        <div className="flex items-center gap-3">
                          {(thankYouPage.brandLogoUrl || brandLogoUrl) && (
                            <img 
                              src={thankYouPage.brandLogoUrl || brandLogoUrl} 
                              alt="Brand Logo" 
                              crossOrigin="anonymous"
                              className="h-10 w-auto object-contain bg-transparent"
                            />
                          )}
                          <span className="primary-font font-extrabold uppercase tracking-widest text-sm" style={{ color: theme.text }}>
                            {thankYouPage.brandName || brandName || 'FILMIFY WEDDINGS'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
                          {thankYouPage.contactNumber && (
                            <span className="font-sans font-medium" style={{ color: theme.text }}>{thankYouPage.contactNumber}</span>
                          )}
                          {thankYouPage.email && (
                            <span className="font-sans font-medium" style={{ color: theme.text }}>{thankYouPage.email}</span>
                          )}
                          {thankYouPage.website && (
                            <span className="font-sans font-medium" style={{ color: theme.text }}>{thankYouPage.website}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                )}

              </React.Fragment>
            );
          })}

        </div>
      </body>
    </html>
  );
}
