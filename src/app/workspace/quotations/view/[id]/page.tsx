'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

export default function QuotationViewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const isPrint = searchParams.get('print') === 'true';

  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadQuotationHTML() {
      if (!id) return;
      try {
        const res = await fetch(`/api/quotations/${id}/render-html`);
        if (res.ok) {
          const html = await res.text();
          setHtmlContent(html);
        } else {
          console.warn('[QuotationViewPage] Server returned non-200 for render-html');
        }
      } catch (err) {
        console.error('[QuotationViewPage] Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadQuotationHTML();
  }, [id]);

  useEffect(() => {
    if (loading || !htmlContent) return;

    const container = document.getElementById('quotation-canvas-container');
    if (!container) return;

    // Inject font definitions if missing
    let fontStyleTag = document.getElementById('embedded-print-fonts');
    if (!fontStyleTag) {
      fontStyleTag = document.createElement('style');
      fontStyleTag.id = 'embedded-print-fonts';
      fontStyleTag.innerHTML = `
        @font-face {
          font-family: 'Bevola Demo Regular';
          src: url('/custom-fonts/BevolaDemo-Regular.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: block;
        }
        @font-face {
          font-family: 'Bevola Demo';
          src: url('/custom-fonts/BevolaDemo-Regular.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: block;
        }
      `;
      document.head.appendChild(fontStyleTag);
    }

    // 4. Force last section page-break-after to avoid to prevent trailing blank page
    const sectionEls = container.querySelectorAll('section, .pdf-page, .quotation-canvas-page');
    if (sectionEls.length > 0) {
      const lastEl = sectionEls[sectionEls.length - 1] as HTMLElement;
      lastEl.style.setProperty('page-break-after', 'avoid', 'important');
      lastEl.style.setProperty('break-after', 'avoid', 'important');
    }

    if (isPrint) {
      const triggerPrint = async () => {
        if (document.fonts && document.fonts.ready) {
          try { await document.fonts.ready; } catch (e) {}
        }
        setTimeout(() => {
          window.print();
        }, 500);
      };
      triggerPrint();
    }
  }, [loading, htmlContent, isPrint]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e5e7eb] text-zinc-600 font-sans text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-800 rounded-full animate-spin"></div>
          <span>Loading Clean A4 Document View...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="quotation-view-root min-h-screen w-full bg-[#e5e7eb] flex flex-col items-center justify-start py-0">
      {/* Global CSS to override platform sidebar navigation and enforce clean Canva A4 viewer layout */}
      <style jsx global>{`
        /* Hide platform sidebar navigation on view route */
        aside, nav, .sidebar-container, header, .no-print {
          display: none !important;
        }
        main {
          padding-left: 0 !important;
          margin-left: 0 !important;
          width: 100% !important;
          background-color: #e5e7eb !important;
        }
        body, html {
          background-color: #e5e7eb !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* 1. Strict A4 Page Dimensions & Borders */
        .pdf-page, .quotation-canvas-page {
          width: 794px !important;
          height: 1123px !important;
          min-height: 1123px !important;
          max-height: 1123px !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          border: none !important;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1) !important;
          margin: 0 auto !important;
        }

        /* 2. Canva-Style Gap Between Pages */
        .canvas-wrapper, #quotation-canvas-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px !important;
          padding: 0 0 32px 0 !important;
          background-color: #e5e7eb;
          width: 100%;
        }

        @media screen and (max-width: 768px) {
          .quotation-view-root {
            padding: 0 !important;
            overflow-x: hidden !important;
          }
          .canvas-wrapper, #quotation-canvas-container {
            gap: 16px !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100vw !important;
            overflow-x: hidden !important;
          }
        }

        /* Standard A4 Print Rules */
        @media print {
          @page {
            size: 210mm 297mm;
            margin: 0 !important;
          }
          html, body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .quotation-view-root, #quotation-canvas-container, .canvas-wrapper, main {
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
          }
          aside, nav, header, footer, .sidebar-container, .no-print, .canva-page-label {
            display: none !important;
          }
          .canvas-wrapper, #quotation-canvas-container {
            gap: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            background-color: transparent !important;
          }
          .pdf-page, .quotation-canvas-page, section {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
          }
          .pdf-page:last-child, .quotation-canvas-page:last-child, section:last-child, .pdf-page:last-of-type, section:last-of-type {
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-after: unset !important;
            break-after: unset !important;
          }
        }
      `}</style>

      <div 
        id="quotation-canvas-container"
        className="canvas-wrapper w-full min-h-screen bg-[#e5e7eb]"
        dangerouslySetInnerHTML={{ __html: htmlContent }} 
      />
    </div>
  );
}
