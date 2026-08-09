'use client';

import React from 'react';
import { StudioCoreAiryBuilderContent } from '@/components/StudioCoreAiryBuilderContent';

export default function AdminSystemTemplateBuilderPage() {
  return (
    <React.Suspense fallback={
      <div className="h-screen w-screen bg-[#0E0D0C] text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-zinc-400">Loading Admin System Template Editor...</p>
        </div>
      </div>
    }>
      <StudioCoreAiryBuilderContent mode="admin-system-template" />
    </React.Suspense>
  );
}
