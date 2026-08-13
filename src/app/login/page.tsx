'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Staging environment checks (only active on staging domain e.g. staging.studiocore.in)
  const allowedStagingEmailsRaw = process.env.NEXT_PUBLIC_ALLOWED_STAGING_EMAILS || '';
  const isStagingDomain = typeof window !== 'undefined' && (
    window.location.hostname.includes('staging') ||
    process.env.NEXT_PUBLIC_IS_STAGING === 'true'
  );
  const isStagingRestricted = isStagingDomain && allowedStagingEmailsRaw.trim().length > 0;

  const allowedStagingEmails = allowedStagingEmailsRaw
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  // Read URL search params on load (for unauthorized_staging error)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const errParam = searchParams.get('error');
    if (errParam === 'unauthorized_staging') {
      setError('Access Denied: This staging environment is restricted to authorized testing accounts only.');
    } else if (errParam) {
      setError(decodeURIComponent(errParam));
    }

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // If user session exists, verify email on staging
        const userEmail = (session.user.email || '').trim().toLowerCase();
        const isMasterAdmin = userEmail === 'filmifyweddings@gmail.com';
        if (isStagingDomain && allowedStagingEmails.length > 0 && !allowedStagingEmails.includes(userEmail) && !isMasterAdmin) {
          await supabase.auth.signOut();
          document.cookie = 'sb-access-token=; path=/; max-age=0';
          document.cookie = 'sb-refresh-token=; path=/; max-age=0';
          setError('Access Denied: This staging environment is restricted to authorized testing accounts only.');
          return;
        }

        const redirectTo = searchParams.get('redirectTo') || '/workspace';
        if (redirectTo) {
          router.push(redirectTo);
        }
      }
    };
    checkSession();
  }, [router, allowedStagingEmailsRaw]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetEmail = email.trim().toLowerCase();
    const isMasterAdmin = targetEmail === 'filmifyweddings@gmail.com';

    // Check staging email authorization client-side
    if (isStagingDomain && allowedStagingEmails.length > 0 && !allowedStagingEmails.includes(targetEmail) && !isMasterAdmin) {
      setError('Access Denied: This staging environment is restricted to authorized testing accounts only.');
      return;
    }

    if (isSignUp && isStagingRestricted) {
      setError('Staging Environment: Registration is disabled. Only authorized testing accounts can log in.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // Sign Up Flow
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: targetEmail,
          password,
          options: {
            data: {
              workspace_name: workspaceName.trim() || `${targetEmail.split('@')[0]}'s Studio`,
            }
          }
        });

        if (signUpErr) throw signUpErr;
        const { user, session } = data;

        if (user) {
          if (!session) {
            alert('Account created successfully! Please check your email to confirm your account before logging in.');
            setIsSignUp(false);
            return;
          }
          
          alert('Account created successfully! Logging in...');
          window.location.href = '/dashboard/integrations/whatsapp-web';
        }
      } else {
        // Log In Flow via Server-Side API (Sets HTTP Cookies reliably)
        const searchParams = new URLSearchParams(window.location.search);
        const redirectTo = searchParams.get('redirectTo') || '/workspace';

        let loginSuccess = false;
        try {
          const apiRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: targetEmail, password }),
          });

          const apiJson = await apiRes.json().catch(() => ({}));

          if (apiRes.ok && apiJson.success) {
            loginSuccess = true;
            // Also sync client-side Supabase state and cookies directly
            const signInRes = await supabase.auth.signInWithPassword({ email: targetEmail, password }).catch(() => null);
            if (signInRes?.data?.session) {
              const maxAge = 60 * 60 * 24 * 7;
              const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
              document.cookie = `sb-access-token=${signInRes.data.session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure}`;
              document.cookie = `sb-refresh-token=${signInRes.data.session.refresh_token}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure}`;
            }
            window.location.href = redirectTo;
            return;
          } else if (apiJson.error) {
            setError(apiJson.error);
            setLoading(false);
            return;
          }
        } catch (_) {}

        // Client-side fallback if server API is unreachable
        if (!loginSuccess) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: targetEmail,
            password,
          });

          if (signInErr) throw signInErr;

          if (signInData?.session) {
            const maxAge = 60 * 60 * 24 * 7;
            const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
            document.cookie = `sb-access-token=${signInData.session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure}`;
            document.cookie = `sb-refresh-token=${signInData.session.refresh_token}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure}`;
          }

          window.location.href = redirectTo;
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070708] text-white flex items-center justify-center p-4 selection:bg-zinc-800 font-sans relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 rounded-2xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10 space-y-6"
      >
        {/* Staging environment badge */}
        {isStagingRestricted && (
          <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-extrabold text-center flex items-center justify-center gap-1.5">
            <span>🔒 STAGING ENVIRONMENT</span>
            <span className="opacity-60">•</span>
            <span>Authorized Testing Only</span>
          </div>
        )}

        {/* Header Title */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center font-bold text-lg text-black shadow-lg shadow-orange-500/20 mx-auto">
            FW
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-4">
            {isSignUp ? 'Create your platform account' : 'Sign in to FW Core'}
          </h2>
          <p className="text-xs text-zinc-400">
            {isSignUp ? 'Set up workspace & link WhatsApp campaigns' : 'Manage your wedding photography leads'}
          </p>
        </div>

        {/* Error notice */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 shadow-lg"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </motion.div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && !isStagingRestricted && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Workspace / Studio Name</label>
              <div className="relative">
                <Sparkles className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Dreamy Shoots Studio"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Account Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 mt-6 shadow-xl cursor-pointer"
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Workspace' : 'Sign In'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Signup / Sign in Toggle */}
        {!isStagingRestricted ? (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-zinc-400 hover:text-white transition-colors underline underline-offset-4 cursor-pointer"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        ) : (
          <div className="text-center pt-2 text-[11px] text-amber-400/80 font-medium">
            Registration is disabled on Staging. Contact administrator for testing access.
          </div>
        )}

        {/* Compliance Footer Links */}
        <div className="flex justify-center gap-4 text-[10px] text-zinc-500 pt-4 border-t border-zinc-900/60">
          <Link href="/privacy-policy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/terms-of-service" className="hover:text-white transition-colors">
            Terms of Service
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
