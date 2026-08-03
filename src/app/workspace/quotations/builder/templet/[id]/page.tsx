'use client';

import React, { useEffect } from 'react';
import QuotationBuilderPage from '../../page';

export default function TemplateQuotationBuilderPage() {
  useEffect(() => {
    console.log('[TEMPLET_1_A4_STRICT_V3_SUCCESS]');
  }, []);

  return (
    <React.Suspense fallback={
      <div className="h-screen w-screen bg-[#EBECEF] text-zinc-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-zinc-600">Loading Quotation Template...</p>
        </div>
      </div>
    }>
      <QuotationBuilderPage />
    </React.Suspense>
  );
}
