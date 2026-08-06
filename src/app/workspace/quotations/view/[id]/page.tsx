'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { renderQuotationToHTML } from '@/lib/pdf-html-generator';

export default function QuotationViewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const isPrint = searchParams.get('print') === 'true';

  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadQuotation() {
      if (!id) return;
      try {
        const { data: doc } = await supabase
          .from('quotation_documents')
          .select('content_json')
          .eq('template_id', id)
          .maybeSingle();

        if (doc?.content_json) {
          setHtmlContent(renderQuotationToHTML(doc.content_json));
        } else {
          setHtmlContent(renderQuotationToHTML({ templateId: id }));
        }
      } catch (err) {
        console.error('Error fetching quotation for view:', err);
        setHtmlContent(renderQuotationToHTML({ templateId: id }));
      } finally {
        setLoading(false);
      }
    }

    loadQuotation();
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
      className="w-full min-h-screen bg-white"
      dangerouslySetInnerHTML={{ __html: htmlContent }} 
    />
  );
}
