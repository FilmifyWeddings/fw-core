'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PublicProposalClientProps {
  token: string;
  targetId: string;
}

export default function PublicProposalClient({ token, targetId }: PublicProposalClientProps) {
  const router = useRouter();

  useEffect(() => {
    const destination = `/workspace/quotations/builder/templet/${targetId}?preview=public&token=${token}`;
    // Immediate client navigation
    router.replace(destination);
  }, [token, targetId, router]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#0C0A09] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mb-4 shadow-sm" />
      <h3 className="text-sm font-extrabold text-slate-800 dark:text-zinc-200 tracking-wider uppercase">
        Opening Quotation Preview...
      </h3>
      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
        Please wait while we load your personalized proposal.
      </p>
    </div>
  );
}
