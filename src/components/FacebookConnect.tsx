'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, CheckCircle2, RefreshCw, XCircle, ShieldCheck, ExternalLink, Zap } from 'lucide-react';

interface FacebookConnectProps {
  workspaceId?: string;
  isConnected?: boolean;
  connectedAccountName?: string;
  pagesCount?: number;
  onDisconnect?: () => void;
}

export default function FacebookConnect({
  workspaceId = '00000000-0000-0000-0000-000000000000',
  isConnected = false,
  connectedAccountName = 'Filmify Weddings Studio',
  pagesCount = 0,
  onDisconnect,
}: FacebookConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    
    // Redirect to backend OAuth route which builds the Meta dialog URL with CSRF state & scopes
    window.location.href = `${baseUrl}/api/auth/facebook?workspace_id=${encodeURIComponent(workspaceId)}`;
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-[24px] p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
        
        {/* Left Side: Meta Brand Icon & Status Info */}
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-[#0B111E] tracking-tight">
                Meta Ads & Facebook Pages Direct Sync
              </h3>

              {isConnected ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Connected ({pagesCount} Pages)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-extrabold text-[11px] flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-slate-400" /> Disconnected
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {isConnected
                ? `OAuth active for ${connectedAccountName}. Auto-subscribing leadgen webhooks across all managed pages.`
                : 'Connect Meta Business Account via OAuth 2.0 to auto-subscribe leadgen webhooks and sync leads to CRM.'}
            </p>
          </div>
        </div>

        {/* Right Side: Action Button */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          {isConnected ? (
            <>
              <button
                type="button"
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-black border border-slate-200/90 shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
              >
                {isConnecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-blue-600" />}
                <span>Re-Authenticate</span>
              </button>

              {onDisconnect && (
                <button
                  type="button"
                  onClick={onDisconnect}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold border border-rose-200 transition cursor-pointer"
                  title="Disconnect Meta Account"
                >
                  Disconnect
                </button>
              )}
            </>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto disabled:opacity-50"
            >
              {isConnecting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              )}
              <span>Connect Meta Ads</span>
            </motion.button>
          )}
        </div>

      </div>

      {/* Permission Scopes Footer */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-semibold flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>OAuth Scopes: <code>pages_show_list</code>, <code>pages_read_engagement</code>, <code>leads_retrieval</code>, <code>pages_manage_metadata</code></span>
        </div>
        <div className="flex items-center gap-1 text-blue-600 hover:underline cursor-pointer">
          <Zap className="w-3 h-3" />
          <span>Auto Webhook Subscription Active</span>
        </div>
      </div>
    </div>
  );
}
