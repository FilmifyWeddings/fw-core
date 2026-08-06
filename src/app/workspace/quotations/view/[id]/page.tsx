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
    if (!loading && isPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [loading, isPrint]);

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
