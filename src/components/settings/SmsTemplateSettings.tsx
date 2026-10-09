'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Save, CheckCircle2, AlertCircle, 
  Sparkles, RefreshCw, Smartphone, KeyRound, ShieldCheck, 
  Info, ExternalLink 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SmsTemplateSettings() {
  const [headline, setHeadline] = useState('StudioCore Verification');
  const [bodyText, setBodyText] = useState('Your StudioCore verification code is {OTP}. Valid for 10 minutes. Do not share this OTP with anyone.');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch current template on mount
  useEffect(() => {
    async function loadTemplate() {
      try {
        setLoading(true);
        const res = await fetch('/api/settings/sms-template?key=google_onboarding_otp');
        if (res.ok) {
          const data = await res.json();
          if (data?.template) {
            if (data.template.headline) setHeadline(data.template.headline);
            if (data.template.bodyText) setBodyText(data.template.bodyText);
          }
        }
      } catch (err) {
        console.warn('Failed to load SMS template:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTemplate();
  }, []);

  const handleSave = async () => {
    if (!bodyText.includes('{OTP}')) {
      setToast({
        type: 'error',
        message: 'The SMS text must include the {OTP} placeholder where the 6-digit code will appear.',
      });
      return;
    }

    try {
      setSaving(true);
      setToast(null);
      const res = await fetch('/api/settings/sms-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey: 'google_onboarding_otp',
          headline: headline.trim(),
          bodyText: bodyText.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToast({
          type: 'success',
          message: 'SMS OTP Template saved successfully! New Google signups will receive this exact message.',
        });
      } else {
        setToast({
          type: 'error',
          message: data.error || 'Failed to update SMS template.',
        });
      }
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err.message || 'Network error while saving SMS template.',
      });
    } finally {
      setSaving(false);
    }
  };

  const insertPlaceholder = (tag: string) => {
    if (!bodyText.includes(tag)) {
      setBodyText(prev => `${prev} ${tag}`);
    }
  };

  // Preview formatted SMS text
  const previewText = bodyText.replace('{OTP}', '849201');
  const charCount = bodyText.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  return (
    <div className="bg-white border border-amber-200/90 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
            <MessageSquare className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-amber-950 flex items-center gap-2">
              SMS OTP Template & Normal Message Settings
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#0F9D58] border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                Active
              </span>
            </h2>
            <p className="text-xs font-medium text-zinc-500">
              Customize the exact headline and matter sent via Normal SMS (टेक्स्ट मैसेज) to Google signups and team members.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Save className="w-4 h-4 text-white" />
          )}
          <span>{saving ? 'Saving Changes...' : 'Save SMS Template'}</span>
        </button>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2 ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-zinc-400 hover:text-zinc-700 text-sm font-bold ml-2"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: Edit Headline & Matter */}
        <div className="lg:col-span-7 space-y-5">
          {/* Headline Input */}
          <div>
            <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wider block mb-1.5">
              SMS Headline / Header Title <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. StudioCore Security"
                className="w-full px-4 py-2.5 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-amber-500 shadow-xs"
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Appears at the top of the SMS notification or as the sender headline prefix.
            </p>
          </div>

          {/* SMS Body Matter */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wider block">
                SMS Matter / Message Body <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => insertPlaceholder('{OTP}')}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition"
              >
                + Insert {'{OTP}'}
              </button>
            </div>

            <textarea
              rows={4}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="e.g. Your StudioCore verification code is {OTP}. Valid for 10 minutes."
              className="w-full px-4 py-3 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-medium text-amber-950 focus:outline-none focus:border-amber-500 shadow-xs leading-relaxed"
            />

            <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1.5 px-0.5">
              <span className="flex items-center gap-1">
                {bodyText.includes('{OTP}') ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {'{OTP}'} tag is active
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Missing {'{OTP}'} placeholder
                  </span>
                )}
              </span>
              <span>
                {charCount} characters ({smsSegments} SMS {smsSegments > 1 ? 'credits' : 'credit'})
              </span>
            </div>
          </div>

          {/* Fast2SMS Gateway Status & Anti-Spam Info */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 border border-amber-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black text-amber-950">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Fast2SMS Gateway & Anti-Spam Protection</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#0F9D58] text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                Fast2SMS Active
              </span>
            </div>

            <p className="text-[11.5px] text-zinc-600 leading-relaxed">
              StudioCore uses <strong>Fast2SMS Quick OTP Gateway</strong> for high-speed SMS delivery across India with 100% DND bypass. All OTPs are protected by automatic anti-spam rate limiting.
            </p>

            {/* Anti-Spam Protection Badges */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
              <div className="p-2.5 rounded-xl bg-white border border-amber-200/70 flex items-center gap-2 text-slate-800">
                <span className="w-5 h-5 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-black">60s</span>
                <span>Cooldown Timer (Resend delay)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-amber-200/70 flex items-center gap-2 text-slate-800">
                <span className="w-5 h-5 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center text-[10px] font-black">3x</span>
                <span>Max 3 OTPs / 24 Hours / Number</span>
              </div>
            </div>

            {/* Fast2SMS Setup Steps */}
            <div className="bg-white/90 p-3 rounded-xl border border-amber-200/70 space-y-1.5 text-[11px] text-zinc-700">
              <div className="font-extrabold text-amber-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Fast2SMS API Setup Steps:</span>
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-zinc-600">
                <li>
                  <strong>fast2sms.com</strong> पर जाएं और लॉग इन / साइन अप करें।
                </li>
                <li>
                  Left sidebar में <strong>Dev API</strong> पर क्लिक करें और अपनी <strong>Authorization API Key</strong> कॉपी करें।
                </li>
                <li>
                  अपने <code>.env.local</code> में जोड़ें: <code>FAST2SMS_API_KEY=your_copied_key_here</code>
                </li>
              </ol>
            </div>

            <div className="pt-1 text-[11px] text-zinc-500 font-mono flex flex-wrap items-center gap-2">
              <span>Environment Variable:</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 font-bold">FAST2SMS_API_KEY</span>
            </div>
          </div>
        </div>

        {/* Right Phone Mockup Preview */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="text-center mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500 flex items-center justify-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-amber-600" />
              Live Normal SMS Mobile Preview
            </span>
          </div>

          {/* Phone Frame */}
          <div className="w-full max-w-[310px] bg-zinc-900 rounded-[2.2rem] p-3 shadow-xl border-4 border-zinc-800">
            {/* Phone Screen */}
            <div className="bg-[#121620] rounded-[1.6rem] p-4 text-white min-h-[380px] flex flex-col justify-between overflow-hidden relative border border-zinc-700/50">
              {/* Speaker / Camera Notch */}
              <div className="w-24 h-4 bg-zinc-900 rounded-full mx-auto mb-4 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800 ml-auto mr-3" />
              </div>

              {/* Messages Header */}
              <div className="text-center pb-3 border-b border-zinc-800/80 mb-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-black text-xs flex items-center justify-center mx-auto shadow-md mb-1">
                  SC
                </div>
                <div className="text-xs font-bold text-zinc-200">
                  {headline || 'StudioCore'}
                </div>
                <div className="text-[10px] text-zinc-400 font-medium">
                  Normal SMS • Today, 10:42 AM
                </div>
              </div>

              {/* SMS Bubble */}
              <div className="space-y-2 flex-1">
                <div className="bg-zinc-800/90 text-zinc-100 p-3.5 rounded-2xl rounded-tl-sm border border-zinc-700/60 shadow-md">
                  <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-amber-400" />
                    <span>{headline || 'StudioCore Verification'}</span>
                  </div>
                  <p className="text-[11.5px] leading-relaxed font-sans text-zinc-200 whitespace-pre-wrap">
                    {previewText.split('849201').map((part, i, arr) => (
                      <React.Fragment key={i}>
                        {part}
                        {i < arr.length - 1 && (
                          <span className="font-mono font-black text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/40 tracking-wider">
                            849201
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </p>
                  <div className="text-right mt-1.5 text-[9px] text-zinc-400">
                    10:42 AM • Normal SMS
                  </div>
                </div>
              </div>

              {/* Bottom text bar */}
              <div className="pt-2 text-center text-[10px] text-zinc-500">
                Encrypted SMS Carrier Delivery
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
