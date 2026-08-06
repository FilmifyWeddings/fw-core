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
  'cherry-red-cream': { name: 'Cherry Red & Cream', primary: '#750505', background: '#FBFCEB', text: '#750505', kicker: '#750505', borderColor: '#750505', boxBgColor: '#FBFCEB' },
  'emerald-gold': { name: 'Emerald & Gold', primary: '#043927', background: '#F4F7F4', text: '#043927', kicker: '#C5A059', borderColor: '#C5A059', boxBgColor: '#EAF0EC' },
  'royal-navy': { name: 'Royal Navy & Cream', primary: '#0A192F', background: '#F8F9FA', text: '#0A192F', kicker: '#D4AF37', borderColor: '#D4AF37', boxBgColor: '#EEF2F6' },
  'charcoal-minimal': { name: 'Charcoal Minimal', primary: '#1A1A1A', background: '#FFFFFF', text: '#1A1A1A', kicker: '#666666', borderColor: '#E5E5E5', boxBgColor: '#F9F9F9' }
};

interface PdfPreviewProps {
  params: Promise<{ id: string }>;
}

export default async function PdfPreviewPage({ params }: PdfPreviewProps) {
  const { id } = await params;

  // 1. Fetch document directly from Supabase DB unauthenticated for server-side Chromium
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

  const cover = documentData?.cover || {};
  const themeId = documentData?.theme || 'cherry-red-cream';
  const activeTheme = COLOR_THEMES[themeId] || COLOR_THEMES['cherry-red-cream'];
  const primaryFont = documentData?.primaryFont || "'Cormorant Garamond', serif";
  const secondaryFont = documentData?.secondaryFont || "'Plus Jakarta Sans', sans-serif";

  const brandName = cover.brandName || 'STUDIOCORE';
  const groomName = cover.groomName || 'Rahul';
  const brideName = cover.brideName || 'Neha';
  const eventDate = cover.eventDate || 'DECEMBER 24, 2026';
  const location = cover.location || 'JAIPUR, RAJASTHAN';
  const coverPhoto = cover.photoUrl || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80';

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=794, initial-scale=1" />
        <title>{documentData?.designName || 'Quotation Preview'} - PDF Engine</title>

        {/* Load Google Fonts directly into preview document */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" 
          rel="stylesheet" 
        />

        <style>{`
          * {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: ${activeTheme.text} !important;
            font-family: ${secondaryFont} !important;
            width: 794px !important;
          }
          .pdf-container {
            width: 794px !important;
            margin: 0 auto !important;
            background: #ffffff !important;
          }
          .pdf-page {
            width: 794px !important;
            min-height: 1123px !important;
            padding: 48px !important;
            position: relative !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            background-color: ${activeTheme.background} !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
          }
          .serif-heading {
            font-family: ${primaryFont} !important;
          }
        `}</style>
      </head>
      <body>
        {/* Dedicated PDF Render Host (0 Sidebars, 0 Navbars, 0 Auth Redirects) */}
        <div id="quotation-full-canvas" className="pdf-container" data-rendered="true">
          
          {/* PAGE 1: COVER PAGE */}
          <section className="pdf-page flex flex-col justify-between items-center text-center">
            <div className="w-full flex flex-col items-center space-y-4 pt-6">
              <BirdsSVG textColor={activeTheme.primary} />
              <p className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: activeTheme.kicker }}>
                WEDDING PHOTOGRAPHY & FILMS
              </p>
              <h1 className="serif-heading text-4xl font-normal tracking-wide uppercase" style={{ color: activeTheme.primary }}>
                {brandName}
              </h1>
            </div>

            {/* Cover Photo */}
            <div className="w-full h-[420px] rounded-2xl overflow-hidden shadow-sm my-6">
              <img 
                src={coverPhoto} 
                alt="Cover Photo" 
                className="w-full h-full object-cover" 
              />
            </div>

            {/* Couple Names & Details */}
            <div className="w-full flex flex-col items-center space-y-3 pb-6">
              <h2 className="serif-heading text-3xl font-bold tracking-tight" style={{ color: activeTheme.primary }}>
                {groomName} & {brideName}
              </h2>
              <div className="flex items-center gap-3 text-xs font-semibold tracking-wider text-zinc-600">
                <span>{eventDate}</span>
                <span>•</span>
                <span>{location}</span>
              </div>
            </div>

            {/* Footer Watermark */}
            <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] font-semibold text-zinc-400">
              Created by StudioCore.in
            </div>
          </section>

          {/* ADDITIONAL SECTIONS & DETAILS */}
          {documentData?.about && (
            <section className="pdf-page flex flex-col justify-between">
              <div className="space-y-6">
                <div className="border-b pb-4" style={{ borderColor: activeTheme.borderColor }}>
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: activeTheme.kicker }}>
                    ABOUT US
                  </p>
                  <h2 className="serif-heading text-3xl font-bold" style={{ color: activeTheme.primary }}>
                    {documentData.about.heading || 'OUR STORY & VISION'}
                  </h2>
                </div>
                <p className="text-sm leading-relaxed text-zinc-700">
                  {documentData.about.text || 'We capture timeless, authentic wedding moments with cinematic artistry.'}
                </p>
              </div>

              <div className="text-center text-[10px] font-semibold text-zinc-400 pb-2">
                Created by StudioCore.in
              </div>
            </section>
          )}

        </div>
      </body>
    </html>
  );
}
