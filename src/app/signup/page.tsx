'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState<'DETAILS' | 'OTP_VERIFICATION'>('DETAILS');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // STEP 1: Initiate Signup & Trigger OTP Email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      // Use signUp with user metadata (Supabase sends the Confirm Signup OTP)
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      // If Supabase created user but email is unconfirmed, show OTP screen
      setStep('OTP_VERIFICATION');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify the 6-digit OTP Token
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'signup', // 'signup' handles confirm signup token
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (data.session || data.user) {
        // Create / Update public profile row for the verified user
        await supabase.from('profiles').upsert({
          id: data.user?.id,
          full_name: fullName.trim(),
          role: 'owner',
          updated_at: new Date().toISOString(),
        });

        // Redirect directly to the dashboard
        router.push('/workspace');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    });
    setLoading(false);
    if (error) setErrorMessage(error.message);
    else alert('A new OTP has been sent to your email.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FDFBF7] dark:bg-[#151413]">
      <div className="w-full max-w-md bg-white dark:bg-[#1E1C1A] rounded-2xl p-8 border border-amber-900/15 shadow-xl">
        {step === 'DETAILS' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Create Account</h2>
            <p className="text-xs text-neutral-500">Sign up to get started with your studio workspace</p>

            {errorMessage && (
              <div className="p-3 text-xs rounded-lg bg-red-50 text-red-600 border border-red-200">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Sahil Dhonde"
                className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Send Verification Code'}
            </button>

            <div className="text-center pt-2">
              <Link href="/login" className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
                Already have an account? <span className="text-amber-600 font-semibold hover:underline">Log in</span>
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Verify Your Email</h2>
            <p className="text-xs text-neutral-500">
              We have sent a 6-digit OTP code to <span className="font-semibold text-neutral-800 dark:text-neutral-200">{email}</span>
            </p>

            {errorMessage && (
              <div className="p-3 text-xs rounded-lg bg-red-50 text-red-600 border border-red-200">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Enter 6-Digit Code</label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123456"
                className="w-full mt-1 px-3.5 py-3 rounded-xl border border-amber-900/30 bg-amber-50/20 text-center tracking-[8px] text-lg font-bold text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Complete Signup'}
            </button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => setStep('DETAILS')}
                className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300 underline cursor-pointer"
              >
                Change Email
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="text-amber-600 font-semibold hover:underline cursor-pointer"
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
