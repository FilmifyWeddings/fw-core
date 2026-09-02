'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] text-zinc-900 flex flex-col items-center justify-center p-6 font-sans selection:bg-amber-100">
      <div className="max-w-md w-full text-center space-y-5 bg-white border border-[#EBE7DF] p-8 rounded-3xl shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-300 text-[#b45309] font-black text-2xl flex items-center justify-center mx-auto">
          404
        </div>
        <div>
          <h1 className="text-xl font-black font-serif text-zinc-900">Page Not Found</h1>
          <p className="text-xs text-zinc-500 mt-1">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
          <Link
            href="/workspace"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d97706] to-[#b45309] text-white text-xs font-bold shadow-md inline-flex items-center justify-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Workspace Home</span>
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold inline-flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
