'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Camera, X, ArrowRight, ShieldCheck, Check, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function GoogleGLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

interface GoogleRoleConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: 'owner' | 'team_member';
}

export default function GoogleRoleConfirmModal({
  isOpen,
  onClose,
  defaultRole = 'owner',
}: GoogleRoleConfirmModalProps) {
  const [selectedRole, setSelectedRole] = useState<'owner' | 'team_member'>(defaultRole);
  const [loading, setLoading] = useState(false);

  // Sync default role when opening
  React.useEffect(() => {
    if (isOpen) {
      setSelectedRole(defaultRole);
      setLoading(false);
    }
  }, [isOpen, defaultRole]);

  const handleProceedGoogle = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sc_auth_role', selectedRole);
        document.cookie = `sc_auth_role=${selectedRole}; path=/; max-age=3600; SameSite=Lax`;
      }

      const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const baseOrigin = isLocalhost ? window.location.origin : 'https://studiocore.in';
      const redirectPath = `${baseOrigin}/auth/callback?role=${selectedRole}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectPath,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      console.error('[Google OAuth Error]:', err);
      alert(`Google Sign-In failed: ${err.message || 'Please try again'}`);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-[#FFFDF9] rounded-3xl p-5 sm:p-6 border border-[#EAE5DA] shadow-2xl space-y-4"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[#EAE5DA] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white border border-[#EAE5DA] flex items-center justify-center shadow-xs">
                <GoogleGLogo className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Continue with Google
                </h3>
                <p className="text-xs text-amber-800 font-bold">
                  Select your StudioCore account type
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-600 font-medium">
            Choose how you will use StudioCore with this Google account:
          </p>

          {/* Role Choice Cards */}
          <div className="grid grid-cols-1 gap-2.5">
            {/* Card 1: Studio Owner */}
            <button
              type="button"
              onClick={() => setSelectedRole('owner')}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start justify-between gap-3 ${
                selectedRole === 'owner'
                  ? 'bg-amber-500/10 border-amber-500 text-amber-950 shadow-xs'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedRole === 'owner' ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black text-slate-900">Studio Owner</h4>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Manage your photography & video business, client CRM, shoots, quotations & finances.
                  </p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                selectedRole === 'owner' ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300'
              }`}>
                {selectedRole === 'owner' && <Check className="w-3.5 h-3.5" />}
              </div>
            </button>

            {/* Card 2: Team Member / Freelancer */}
            <button
              type="button"
              onClick={() => setSelectedRole('team_member')}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start justify-between gap-3 ${
                selectedRole === 'team_member'
                  ? 'bg-indigo-500/10 border-indigo-500 text-indigo-950 shadow-xs'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedRole === 'team_member' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Camera className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-slate-900">Team Member & Freelancer</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    For photographers, cinematographers & editors to track assigned shoots and payouts.
                  </p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                selectedRole === 'team_member' ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
              }`}>
                {selectedRole === 'team_member' && <Check className="w-3.5 h-3.5" />}
              </div>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleProceedGoogle}
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Connecting to Google...</span>
              ) : (
                <>
                  <GoogleGLogo className="w-4 h-4 bg-white rounded-full p-0.5" />
                  <span>
                    Proceed as {selectedRole === 'owner' ? 'Studio Owner' : 'Team Partner'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
