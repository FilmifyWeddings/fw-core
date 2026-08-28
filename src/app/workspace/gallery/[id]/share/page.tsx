'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Camera,
  ArrowLeft,
  Share2,
  Copy,
  Check,
  QrCode,
  Lock,
  Unlock,
  MessageCircle,
  ExternalLink,
  Printer,
  X,
  Users,
  CheckSquare,
  ShieldCheck,
  Crown,
  Eye,
  Settings,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface EventGallery {
  id: string;
  title: string;
  slug: string;
  event_date: string;
  pin_code: string | null;
  cover_url: string | null;
  allow_downloads: boolean;
  is_active: boolean;
}

export default function GalleryShareCenterPage() {
  const params = useParams();
  const router = useRouter();
  const galleryId = params?.id as string;

  const [gallery, setGallery] = useState<EventGallery | null>(null);
  const [loading, setLoading] = useState(true);

  // Toggle States for Controls
  const [guestAskPin, setGuestAskPin] = useState(false);
  const [fullAccessAskPin, setFullAccessAskPin] = useState(true);
  const [fullAccessRequireReg, setFullAccessRequireReg] = useState(false);
  const [selectionActive, setSelectionActive] = useState(true);

  // Standee Modal State
  const [isStandeeModalOpen, setIsStandeeModalOpen] = useState(false);
  const [standeeMode, setStandeeMode] = useState<string>('guest');

  // Copy Feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadGallery = useCallback(async () => {
    if (!galleryId) return;
    setLoading(true);

    try {
      const gRes = await fetch(`/api/gallery/events?id=${galleryId}`);
      const gJson = await gRes.json();

      if (!gJson.success || !gJson.gallery) {
        throw new Error(gJson.error || 'Gallery not found');
      }
      const gal = gJson.gallery;
      setGallery(gal);
      setGuestAskPin(!!gal.pin_code);
      setFullAccessAskPin(!!gal.pin_code);
    } catch (err: any) {
      console.error('Error loading gallery share center:', err);
    } finally {
      setLoading(false);
    }
  }, [galleryId]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const getBaseOrigin = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'https://studiocore.in';
  };

  const getShareUrl = (mode: string) => {
    if (!gallery) return '';
    return `${getBaseOrigin()}/g/${gallery.slug}?mode=${mode}`;
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const copyWhatsAppMessage = (title: string, mode: string, key: string) => {
    if (!gallery) return;
    const url = getShareUrl(mode);
    const pinText = gallery.pin_code ? `\n🔐 PIN Code: ${gallery.pin_code}` : '';

    const message = `✨ *${gallery.title}* ✨\n\n📸 Access your wedding photos instantly using the link below:\n👉 ${url}${pinText}\n\n_Find all your special moments with AI Selfie Search!_`;

    navigator.clipboard.writeText(message);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  if (loading || !gallery) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6 text-zinc-500 text-xs font-bold">
        Loading Share Links Center...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-900 font-sans p-4 sm:p-8 space-y-8 max-w-5xl mx-auto">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & NAVIGATION
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/workspace/gallery/${gallery.id}`}
            className="p-2.5 rounded-xl bg-white border border-[#E7E2D8] text-zinc-500 hover:text-zinc-900 transition shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider border border-amber-200">
                Share Center
              </span>
              <span className="text-xs font-bold text-zinc-400">
                {gallery.title}
              </span>
            </div>
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              Event Access &amp; Share Links
            </h1>
          </div>
        </div>

        <a
          href={`/g/${gallery.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-zinc-900/10 cursor-pointer shrink-0"
        >
          <ExternalLink className="w-4 h-4 text-amber-400" />
          <span>Open Live Portal</span>
        </a>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. THE 4 ACCESS CARDS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD 1: GUEST ACCESS */}
        <div className="bg-white rounded-3xl p-6 border border-[#E7E2D8] shadow-2xs space-y-5 flex flex-col justify-between hover:border-amber-400 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                <Camera className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black">
                ✨ Recommended for Guests
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900">1. Guest Access (Selfie Search)</h3>
              <p className="text-xs text-zinc-500 font-medium mt-1">
                Guests can take a selfie or upload a photo to find and view <strong>only their own photos</strong> with sub-second AI matching.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#FBF9F5] border border-[#E7E2D8] text-xs font-mono text-zinc-700 truncate">
              {getShareUrl('guest')}
            </div>

            {/* Controls */}
            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-700">Do not ask PIN for selfie scan</span>
              <input
                type="checkbox"
                checked={!guestAskPin}
                onChange={(e) => setGuestAskPin(!e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-3 border-t border-zinc-100">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => copyToClipboard(getShareUrl('guest'), 'guest_url')}
                className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                {copiedKey === 'guest_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'guest_url' ? 'Copied Link' : 'Copy Link'}</span>
              </button>

              <button
                onClick={() => copyWhatsAppMessage(gallery.title, 'guest', 'guest_wa')}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
              >
                {copiedKey === 'guest_wa' ? <Check className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'guest_wa' ? 'Copied Message' : 'WhatsApp Share'}</span>
              </button>
            </div>

            <button
              onClick={() => {
                setStandeeMode('guest');
                setIsStandeeModalOpen(true);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-600" />
              <span>Print Table Standee (QR Code)</span>
            </button>
          </div>
        </div>

        {/* CARD 2: FULL ACCESS */}
        <div className="bg-white rounded-3xl p-6 border border-[#E7E2D8] shadow-2xs space-y-5 flex flex-col justify-between hover:border-amber-400 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-black">
                Full Gallery
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900">2. Full Access Link</h3>
              <p className="text-xs text-zinc-500 font-medium mt-1">
                People with this link can view <strong>all photos across all collections</strong> in the event.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#FBF9F5] border border-[#E7E2D8] text-xs font-mono text-zinc-700 truncate">
              {getShareUrl('all')}
            </div>

            {/* Controls */}
            <div className="space-y-2 pt-2 border-t border-zinc-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-700">Require PIN Code</span>
                <input
                  type="checkbox"
                  checked={fullAccessAskPin}
                  onChange={(e) => setFullAccessAskPin(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-700">Require Guest Registration</span>
                <input
                  type="checkbox"
                  checked={fullAccessRequireReg}
                  onChange={(e) => setFullAccessRequireReg(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-3 border-t border-zinc-100">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => copyToClipboard(getShareUrl('all'), 'all_url')}
                className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                {copiedKey === 'all_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'all_url' ? 'Copied Link' : 'Copy Link'}</span>
              </button>

              <button
                onClick={() => copyWhatsAppMessage(gallery.title, 'all', 'all_wa')}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
              >
                {copiedKey === 'all_wa' ? <Check className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'all_wa' ? 'Copied Message' : 'WhatsApp Share'}</span>
              </button>
            </div>

            <button
              onClick={() => {
                setStandeeMode('all');
                setIsStandeeModalOpen(true);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-zinc-600" />
              <span>View QR Code</span>
            </button>
          </div>
        </div>

        {/* CARD 3: PHOTO SELECTION WITH FULL ACCESS */}
        <div className="bg-white rounded-3xl p-6 border border-[#E7E2D8] shadow-2xs space-y-5 flex flex-col justify-between hover:border-amber-400 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center shadow-xs">
                <CheckSquare className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-black">
                Album Selection
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900">3. Photo Selection Link</h3>
              <p className="text-xs text-zinc-500 font-medium mt-1">
                Allows client to <strong>favorite and select photos</strong> for album print and final delivery.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#FBF9F5] border border-[#E7E2D8] text-xs font-mono text-zinc-700 truncate">
              {getShareUrl('selection')}
            </div>

            {/* Controls */}
            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-700">Photo selection active</span>
              <input
                type="checkbox"
                checked={selectionActive}
                onChange={(e) => setSelectionActive(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-3 border-t border-zinc-100">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => copyToClipboard(getShareUrl('selection'), 'selection_url')}
                className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                {copiedKey === 'selection_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'selection_url' ? 'Copied Link' : 'Copy Link'}</span>
              </button>

              <button
                onClick={() => copyWhatsAppMessage(gallery.title, 'selection', 'selection_wa')}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
              >
                {copiedKey === 'selection_wa' ? <Check className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'selection_wa' ? 'Copied Message' : 'WhatsApp Share'}</span>
              </button>
            </div>

            <button
              onClick={() => {
                setStandeeMode('selection');
                setIsStandeeModalOpen(true);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-zinc-600" />
              <span>View QR Code</span>
            </button>
          </div>
        </div>

        {/* CARD 4: VIP GUEST ACCESS LINK */}
        <div className="bg-white rounded-3xl p-6 border border-[#E7E2D8] shadow-2xs space-y-5 flex flex-col justify-between hover:border-amber-400 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                <Crown className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black">
                VIP Access
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900">4. VIP Guest Access Link</h3>
              <p className="text-xs text-zinc-500 font-medium mt-1">
                Instant access without asking for phone number or email before taking selfie.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#FBF9F5] border border-[#E7E2D8] text-xs font-mono text-zinc-700 truncate">
              {getShareUrl('vip')}
            </div>

            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
              <span className="font-bold">Bypasses registration gates</span>
              <span className="text-[10px] font-bold text-emerald-600">Active</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-3 border-t border-zinc-100">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => copyToClipboard(getShareUrl('vip'), 'vip_url')}
                className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                {copiedKey === 'vip_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'vip_url' ? 'Copied Link' : 'Copy Link'}</span>
              </button>

              <button
                onClick={() => copyWhatsAppMessage(gallery.title, 'vip', 'vip_wa')}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
              >
                {copiedKey === 'vip_wa' ? <Check className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'vip_wa' ? 'Copied Message' : 'WhatsApp Share'}</span>
              </button>
            </div>

            <button
              onClick={() => {
                setStandeeMode('vip');
                setIsStandeeModalOpen(true);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-600" />
              <span>Print Table Standee</span>
            </button>
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. PRINTABLE TABLE STANDEE MODAL
      ───────────────────────────────────────────────────────────── */}
      {isStandeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-zinc-200 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-black text-zinc-900">Printable Wedding Table Standee</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStandeeModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div id="standee-print-card" className="bg-[#FAF9F5] border-2 border-amber-400/60 rounded-3xl p-8 text-center space-y-5 shadow-inner">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 bg-amber-100/80 px-3 py-1 rounded-full border border-amber-300">
                  ✨ Instant AI Guest Gallery
                </span>
                <h2 className="text-xl font-black text-zinc-900 tracking-tight pt-2">
                  {gallery.title}
                </h2>
                <p className="text-xs text-zinc-500 font-serif italic">
                  Find all your wedding photos instantly with AI Selfie Search
                </p>
              </div>

              <div className="w-44 h-44 bg-white p-3 rounded-2xl border-2 border-zinc-900 mx-auto shadow-md flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(getShareUrl(standeeMode))}`}
                  alt="Gallery QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-1 text-xs">
                <p className="font-bold text-zinc-800">1. Scan QR with your phone camera</p>
                <p className="font-bold text-zinc-800">2. Take a quick selfie to find your photos</p>
                {gallery.pin_code && standeeMode !== 'vip' && (
                  <p className="font-mono text-xs font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md inline-block border border-amber-300">
                    PIN Code: {gallery.pin_code}
                  </p>
                )}
              </div>

              <div className="pt-2 text-[10px] font-bold text-zinc-400 tracking-wider uppercase border-t border-zinc-200">
                Powered by StudioCore AI
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Print Standee Card</span>
              </button>

              <button
                type="button"
                onClick={() => copyToClipboard(getShareUrl(standeeMode), 'standee_url')}
                className="px-4 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === 'standee_url' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === 'standee_url' ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
