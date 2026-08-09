'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminQuotationTemplatesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/workspace/quotations');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0E0D0C] text-white flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-xs font-bold text-zinc-400">Redirecting to Workspace Quotations...</p>
    </div>
  );
}
