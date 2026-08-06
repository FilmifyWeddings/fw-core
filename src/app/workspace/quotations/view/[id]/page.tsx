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

    // Execute DOM Computed CSS Inlining & Style Freeze before print execution
    const container = document.getElementById('quotation-canvas-container');
    if (!container) return;

    // 1. Force explicit image pixel dimensions and display block
    const images = container.querySelectorAll('img');
    images.forEach((img: HTMLImageElement) => {
      const rect = img.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        img.style.width = `${rect.width}px`;
        img.style.height = `${rect.height}px`;
      }
      img.style.display = 'block';
      img.style.objectFit = 'cover';
      img.style.setProperty('-webkit-print-color-adjust', 'exact', 'important');
      img.style.setProperty('print-color-adjust', 'exact', 'important');
    });

    // 2. Freeze computed CSS inline on all child nodes
    const allNodes = container.querySelectorAll('*');
    allNodes.forEach((node) => {
      const el = node as HTMLElement;
      if (!el.style) return;
      const cs = window.getComputedStyle(el);

      const props = [
        'backgroundColor', 'color', 'borderColor', 'borderWidth', 'borderStyle', 'borderRadius',
        'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
        'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform',
        'display', 'flexDirection', 'justifyContent', 'alignItems', 'gap', 'gridTemplateColumns',
        'boxSizing', 'opacity'
      ];

      props.forEach((prop) => {
        const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        const val = cs.getPropertyValue(cssProp);
        if (val && val !== 'initial' && val !== 'normal' && val !== 'none' && val !== '0px 0px 0px 0px') {
          el.style.setProperty(cssProp, val, 'important');
        }
      });

      el.style.setProperty('-webkit-print-color-adjust', 'exact', 'important');
      el.style.setProperty('print-color-adjust', 'exact', 'important');
    });

    // 3. Inject explicit @font-face rules into document head for custom fonts if missing
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

    // Trigger auto-print when requested after fonts and images are settled
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
      <div className="min-h-screen flex items-center justify-center bg-white text-zinc-600 font-sans text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-800 rounded-full animate-spin"></div>
          <span>Loading Quotation View...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      id="quotation-canvas-container"
      className="w-full min-h-screen bg-white"
      dangerouslySetInnerHTML={{ __html: htmlContent }} 
    />
  );
}
