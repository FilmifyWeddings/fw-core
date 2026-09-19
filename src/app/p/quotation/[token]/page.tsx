'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function PublicProposalPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function resolveAndRedirect() {
      setLoading(true);
      setErrorMsg(null);

      if (!token) {
        setErrorMsg('Invalid quotation token');
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch quotation record by public_token
        let targetId = '';
        const { data: quoteRow } = await supabase
          .from('quotations')
          .select('quotation_number, id, status')
          .eq('public_token', token)
          .maybeSingle();

        if (quoteRow) {
          targetId = quoteRow.quotation_number || quoteRow.id;
        } else {
          // 2. Fallback: check by quotation_number or id
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
          let fallbackQuery = supabase.from('quotations').select('quotation_number, id');
          if (isUuid) {
            fallbackQuery = fallbackQuery.or(`id.eq.${token},quotation_number.eq.${token}`);
          } else {
            fallbackQuery = fallbackQuery.eq('quotation_number', token);
          }
          const { data: quoteFallback } = await fallbackQuery.maybeSingle();

          if (quoteFallback) {
            targetId = quoteFallback.quotation_number || quoteFallback.id;
          } else {
            // 3. Fallback: check quotation_documents by template_id
            const { data: docRow } = await supabase
              .from('quotation_documents')
              .select('template_id')
              .eq('template_id', token)
              .maybeSingle();

            if (docRow?.template_id) {
              targetId = docRow.template_id;
            } else {
              // 4. Default to token directly
              targetId = token;
            }
          }
        }

        // Redirect seamlessly to builder in read-only public preview mode
        router.replace(`/workspace/quotations/builder/templet/${targetId}?preview=public&token=${token}`);
      } catch (e) {
        console.error('[Public Preview Router] Resolution error:', e);
        // Even on catch, try navigating directly to public preview
        router.replace(`/workspace/quotations/builder/templet/${token}?preview=public&token=${token}`);
      }
    }

    resolveAndRedirect();
  }, [token, router]);

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#F0EDE5] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-100 border border-rose-300 text-rose-600 flex items-center justify-center mb-4 shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-2">Quotation Preview Unavailable</h2>
        <p className="text-xs font-medium text-zinc-600 max-w-sm">{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0EDE5] flex flex-col items-center justify-center p-6">
      <div className="w-10 h-10 border-3 border-[#004643] border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-xs font-bold text-[#004643] tracking-widest uppercase">Opening Quotation Preview...</p>
    </div>
  );
}
