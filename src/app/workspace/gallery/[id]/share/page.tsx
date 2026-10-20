'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Camera,
  ArrowLeft,
  Copy,
  Check,
  QrCode,
  Lock,
  MessageCircle,
  ExternalLink,
  Printer,
  X,
  Users,
  CheckSquare,
  Key,
  KeyRound,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import { toPng } from 'html-to-image';

interface EventGallery {
  id: string;
  workspace_id?: string;
  title: string;
  slug: string;
  event_date: string;
  pin_code: string | null;
  guest_pin?: string | null;
  admin_pin?: string | null;
  pass_key?: string | null;
  studio_slug?: string | null;
  event_number?: string | number | null;
  cover_url: string | null;
  allow_downloads: boolean;
  is_active: boolean;
  max_selection_limit?: number;
}

// Sleek Animated Toggle Switch
function AnimatedToggle({
  checked,
  onChange,
  colorClass = 'bg-amber-500',
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  colorClass?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
        checked ? colorClass : 'bg-zinc-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function GalleryShareCenterContent() {
  const params = useParams();
  const router = useRouter();
  const galleryId = (Array.isArray(params?.id) ? params?.id[0] : params?.id) as string;

  const [gallery, setGallery] = useState<EventGallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('https://studiocore.in');

  // Toggle Controls
  const [guestAskPin, setGuestAskPin] = useState(false);
  const [fullAccessAskPin, setFullAccessAskPin] = useState(true);
  const [selectionAskPin, setSelectionAskPin] = useState(true);
  const [selectionMaxLimit, setSelectionMaxLimit] = useState<string>('50');

  // Standee Modal State
  const [isStandeeModalOpen, setIsStandeeModalOpen] = useState(false);
  const [standeeUrl, setStandeeUrl] = useState<string>('');
  const [standeeTitle, setStandeeTitle] = useState<string>('');
  const [standeePin, setStandeePin] = useState<string | null>(null);
  const [standeeType, setStandeeType] = useState<string>('Guest Access');
  const [activeDesignIndex, setActiveDesignIndex] = useState<number>(0);
  const [isDownloadingStandee, setIsDownloadingStandee] = useState<boolean>(false);

  // Copy Feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const standeeCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const loadGallery = useCallback(async () => {
    if (!galleryId) return;
    setLoading(true);

    try {
      let gal: any = null;
      try {
        const gRes = await fetch(`/api/gallery/events?id=${galleryId}`);
        const gJson = await gRes.json();
        if (gJson.success && gJson.gallery) {
          gal = gJson.gallery;
        }
      } catch (_) {}

      if (!gal) {
        const slugRes = await fetch(`/api/gallery/events?slug=${galleryId}`);
        const slugJson = await slugRes.json();
        if (slugJson.success && slugJson.gallery) {
          gal = slugJson.gallery;
        }
      }

      if (!gal) {
        setGallery(null);
        return;
      }

      setGallery(gal);
      setGuestAskPin(!!gal.pin_code);
      setFullAccessAskPin(!!gal.pin_code);
      setSelectionAskPin(!!gal.pin_code);

      // Restore saved max selection limit
      try {
        const savedLimit = localStorage.getItem(`studiocore_max_limit_${gal.id}`);
        if (savedLimit) {
          setSelectionMaxLimit(savedLimit);
        } else if (gal.max_selection_limit) {
          setSelectionMaxLimit(String(gal.max_selection_limit));
        }
      } catch (_) {}
    } catch (err: any) {
      console.error('Error loading gallery share center:', err);
    } finally {
      setLoading(false);
    }
  }, [galleryId]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const handleLimitChange = (val: string) => {
    setSelectionMaxLimit(val);
    if (gallery?.id) {
      try {
        localStorage.setItem(`studiocore_max_limit_${gallery.id}`, val);
      } catch (_) {}
    }
  };

  const eventSlug = gallery?.slug || gallery?.id || 'event';
  const guestPin = gallery?.guest_pin || gallery?.pin_code || '700680';
  const passKey = gallery?.pass_key || gallery?.admin_pin || gallery?.pin_code || '518399';

  // Dynamic Link Structures directly mapped to /g/[slug]
  const guestAccessUrl = guestAskPin
    ? `${origin}/g/${eventSlug}?share_key=${guestPin}`
    : `${origin}/g/${eventSlug}`;

  const fullAccessUrl = fullAccessAskPin
    ? `${origin}/g/${eventSlug}?access=all&pass_key=${passKey}`
    : `${origin}/g/${eventSlug}?access=all`;

  const parsedLimit = parseInt(selectionMaxLimit, 10);
  const limitQuery = !isNaN(parsedLimit) && parsedLimit > 0 ? `&max_limit=${parsedLimit}` : '';
  const photoSelectionUrl = `${origin}/g/${eventSlug}?album_selection=true${selectionAskPin ? `&pass_key=${passKey}` : ''}${limitQuery}`;

  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // WhatsApp Templates strictly matching user's templates (No "Dear Guest", replaced with "Hello!")
  const guestWhatsAppMessage = `Hello!\nWe're excited to share your personal photo gallery from the event. This link will take you directly to your own photos, so you can relive and enjoy the special moments captured just for you:\n\n${guestAccessUrl}\n\nThank you for being a part of our event – we hope these memories bring a smile to your face!`;

  const fullAccessWhatsAppMessage = `Hi there!\nWe're delighted to share the complete gallery from the event with you. Please use the link below to view and enjoy all the photos captured during the celebration:\n\n${fullAccessUrl}\n\nFeel free to revisit these memories anytime and share your favorite moments with friends and family.`;

  const photoSelectionWhatsAppMessage = `Hello!\nHere's your exclusive access to the full event photo gallery. You can also select and mark your favorite photos directly within the gallery:\n\n${photoSelectionUrl}\n\nWe hope you enjoy browsing through the collection and finding the moments that mean the most to you.`;

  // Download high-resolution 3x2 standee PNG
  const handleDownloadStandee = async () => {
    if (!standeeCardRef.current) return;
    setIsDownloadingStandee(true);
    try {
      const dataUrl = await toPng(standeeCardRef.current, {
        cacheBust: true,
        pixelRatio: 3, // High-res 300 DPI equivalent for sharp table printing
      });
      const link = document.createElement('a');
      link.download = `${gallery?.title || 'wedding'}_table_standee_design_${activeDesignIndex + 1}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download standee:', err);
      alert('Could not download image. Please try the Print option.');
    } finally {
      setIsDownloadingStandee(false);
    }
  };

  if (loading || !gallery) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6 text-zinc-500 text-xs font-bold">
        Loading Share Links Center...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-900 font-sans p-4 sm:p-8 space-y-8 max-w-6xl mx-auto">
      
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
                Share Links Center
              </span>
              <span className="text-xs font-bold text-zinc-400">
                {gallery.title}
              </span>
            </div>
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              Event Access &amp; Dynamic Links
            </h1>
          </div>
        </div>

        <a
          href={guestAccessUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-zinc-900/10 cursor-pointer shrink-0"
        >
          <ExternalLink className="w-4 h-4 text-amber-400" />
          <span>Open Guest Portal</span>
        </a>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. THE 3 DYNAMIC ACCESS CARDS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CARD 1: GUEST ACCESS (STRICT SELFIE SCAN) */}
        <div className="bg-white rounded-3xl p-6 border border-[#E7E2D8] shadow-2xs space-y-5 flex flex-col justify-between hover:border-amber-400 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                <Camera className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black">
                ✨ Guest Face Wall
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900">1. Guest Access</h3>
              <p className="text-xs text-zinc-500 font-medium mt-1 leading-relaxed">
                People with this link can see <strong>Only Their Own Photos (Selfie Scan Required)</strong>. Full gallery is hidden.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#FBF9F5] border border-[#E7E2D8] text-xs font-mono text-zinc-700 truncate select-all">
              {guestAccessUrl}
            </div>

            {/* Dedicated PIN Box */}
            <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-700" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">Guest PIN Code</span>
                  <span className="text-xs font-mono font-black text-zinc-900">{guestPin}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(guestPin, 'pin_guest')}
                className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-[11px] font-bold text-amber-900 hover:bg-amber-100 transition cursor-pointer"
              >
                {copiedKey === 'pin_guest' ? 'Copied' : 'Copy PIN'}
              </button>
            </div>

            {/* Animated Toggle: Do not ask PIN */}
            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-700">Do not ask PIN</span>
              <AnimatedToggle
                checked={!guestAskPin}
                onChange={(val) => setGuestAskPin(!val)}
                colorClass="bg-amber-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-3 border-t border-zinc-100">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(guestAccessUrl, 'guest_url')}
                className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                {copiedKey === 'guest_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'guest_url' ? 'Copied Link' : 'Copy Link'}</span>
              </button>

              <button
                type="button"
                onClick={() => copyToClipboard(guestWhatsAppMessage, 'guest_wa')}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
              >
                {copiedKey === 'guest_wa' ? <Check className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'guest_wa' ? 'Copied Message!' : 'Copy Message'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setStandeeUrl(guestAccessUrl);
                setStandeeTitle(gallery.title);
                setStandeePin(guestAskPin ? guestPin : null);
                setStandeeType('Guest Access');
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
                Full Event
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900">2. Full Access</h3>
              <p className="text-xs text-zinc-500 font-medium mt-1 leading-relaxed">
                People with this link can see <strong>All the event photos</strong> across all sub-events.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#FBF9F5] border border-[#E7E2D8] text-xs font-mono text-zinc-700 truncate select-all">
              {fullAccessUrl}
            </div>

            {/* Dedicated PIN Box */}
            <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-700" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-800 block">Access PIN Code</span>
                  <span className="text-xs font-mono font-black text-zinc-900">{passKey}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(passKey, 'pin_full')}
                className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-[11px] font-bold text-blue-900 hover:bg-blue-100 transition cursor-pointer"
              >
                {copiedKey === 'pin_full' ? 'Copied' : 'Copy PIN'}
              </button>
            </div>

            {/* Animated Toggle: Require PIN Code */}
            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-700">Require PIN Code</span>
              <AnimatedToggle
                checked={fullAccessAskPin}
                onChange={(val) => setFullAccessAskPin(val)}
                colorClass="bg-blue-600"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-3 border-t border-zinc-100">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(fullAccessUrl, 'full_url')}
                className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                {copiedKey === 'full_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'full_url' ? 'Copied Link' : 'Copy Link'}</span>
              </button>

              <button
                type="button"
                onClick={() => copyToClipboard(fullAccessWhatsAppMessage, 'full_wa')}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
              >
                {copiedKey === 'full_wa' ? <Check className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'full_wa' ? 'Copied Message!' : 'Copy Message'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setStandeeUrl(fullAccessUrl);
                setStandeeTitle(gallery.title);
                setStandeePin(fullAccessAskPin ? passKey : null);
                setStandeeType('Full Access');
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
                Album Selection ON
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-900">3. Photo Selection with Full Access</h3>
              <p className="text-xs text-zinc-500 font-medium mt-1 leading-relaxed">
                People with this link can see All photos and the <strong>photo selection mode is ON</strong> for album prints.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#FBF9F5] border border-[#E7E2D8] text-xs font-mono text-zinc-700 truncate select-all">
              {photoSelectionUrl}
            </div>

            {/* Dedicated Pass Key Box */}
            <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-700" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-purple-800 block">Pass Key</span>
                  <span className="text-xs font-mono font-black text-zinc-900">{passKey}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(passKey, 'pass_key_copy')}
                className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-[11px] font-bold text-purple-900 hover:bg-purple-100 transition cursor-pointer"
              >
                {copiedKey === 'pass_key_copy' ? 'Copied' : 'Copy Key'}
              </button>
            </div>

            {/* Controls */}
            <div className="space-y-2.5 pt-2 border-t border-zinc-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-700">Require Pass Key</span>
                <AnimatedToggle
                  checked={selectionAskPin}
                  onChange={(val) => setSelectionAskPin(val)}
                  colorClass="bg-purple-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-700">Max Selection Limit</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    value={selectionMaxLimit}
                    onChange={(e) => handleLimitChange(e.target.value)}
                    placeholder="50"
                    className="w-20 px-2 py-1 bg-[#FAF9F5] border border-zinc-200 rounded-lg text-xs font-bold text-center focus:outline-hidden focus:border-purple-500 focus:bg-white"
                  />
                  <span className="text-[11px] text-zinc-400 font-bold">photos</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-3 border-t border-zinc-100">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(photoSelectionUrl, 'selection_url')}
                className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                {copiedKey === 'selection_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'selection_url' ? 'Copied Link' : 'Copy Link'}</span>
              </button>

              <button
                type="button"
                onClick={() => copyToClipboard(photoSelectionWhatsAppMessage, 'selection_wa')}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
              >
                {copiedKey === 'selection_wa' ? <Check className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'selection_wa' ? 'Copied Message!' : 'Copy Message'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setStandeeUrl(photoSelectionUrl);
                setStandeeTitle(gallery.title);
                setStandeePin(selectionAskPin ? passKey : null);
                setStandeeType('Photo Selection');
                setIsStandeeModalOpen(true);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-200 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-purple-700" />
              <span>View QR Code</span>
            </button>
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. LUXURY CANVA-STYLE 3X2 PRINTABLE WEDDING TABLE STANDEE MODAL
      ───────────────────────────────────────────────────────────── */}
      {isStandeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-2xl w-full border border-zinc-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header & Design Switcher Dots */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base font-black text-zinc-900 tracking-tight">
                    Wedding Table Standee (3 x 2 Ratio)
                  </h3>
                </div>
                <p className="text-[11px] text-zinc-400 font-medium">
                  {standeeType} • Minimalist Canva Print Templates
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsStandeeModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slider Navigation Bar */}
            <div className="flex items-center justify-between bg-zinc-50 px-4 py-2 rounded-2xl border border-zinc-100 text-xs">
              <span className="font-bold text-zinc-600">
                Design {activeDesignIndex + 1} of 4:
                <strong className="text-zinc-900 ml-1.5">
                  {activeDesignIndex === 0 && 'Warm Ivory & Champagne (Classic)'}
                  {activeDesignIndex === 1 && 'Royal Forest Emerald & Gold'}
                  {activeDesignIndex === 2 && 'Modern Obsidian & Monochrome'}
                  {activeDesignIndex === 3 && 'Boho Terracotta & Dusty Rose'}
                </strong>
              </span>

              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveDesignIndex(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                      activeDesignIndex === idx ? 'w-6 bg-amber-600' : 'bg-zinc-300 hover:bg-zinc-400'
                    }`}
                    title={`Design ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* The 3x2 Standee Canvas Container */}
            <div className="relative group">
              {/* Prev / Next Buttons */}
              <button
                type="button"
                onClick={() => setActiveDesignIndex((prev) => (prev === 0 ? 3 : prev - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition shadow-lg cursor-pointer"
                title="Previous Design"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setActiveDesignIndex((prev) => (prev === 3 ? 0 : prev + 1))}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition shadow-lg cursor-pointer"
                title="Next Design"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* ─────────────────────────────────────────────────────────
                  THE 4 CANVA 3x2 DESIGNS (Aspect Ratio 3:2)
              ───────────────────────────────────────────────────────── */}
              <div
                ref={standeeCardRef}
                className="w-full aspect-[3/2] rounded-3xl overflow-hidden shadow-xl select-none flex flex-col justify-between p-6 sm:p-8 transition-all duration-300"
              >
                {/* DESIGN 1: WARM IVORY & CHAMPAGNE EDITORIAL */}
                {activeDesignIndex === 0 && (
                  <div className="w-full h-full bg-[#FCFAF5] border-4 border-amber-300/60 rounded-2xl p-5 flex flex-col justify-between text-zinc-900 shadow-inner relative">
                    <div className="absolute top-2 right-2 text-[8px] tracking-widest uppercase font-bold text-amber-700/60 font-mono">
                      TABLE CARD
                    </div>
                    
                    <div className="text-center space-y-1">
                      <span className="text-[10px] tracking-[0.25em] uppercase font-serif text-amber-800">
                        CELEBRATION OF LOVE
                      </span>
                      <h2 
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }} 
                        className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight"
                      >
                        {standeeTitle}
                      </h2>
                      <p className="text-[11px] text-zinc-500 font-serif italic">
                        Scan below to view your personalized wedding photos
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-6 my-auto">
                      <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white p-2 rounded-2xl border-2 border-amber-400 shadow-md shrink-0">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(standeeUrl)}`}
                          alt="QR Code"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="space-y-1.5 text-left text-xs">
                        <p className="font-bold text-zinc-800">1. Open Phone Camera</p>
                        <p className="font-bold text-zinc-800">2. Point at QR Code</p>
                        <p className="font-bold text-zinc-800">3. Take a selfie &amp; find photos</p>
                        {standeePin && (
                          <div className="pt-1">
                            <span className="px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-900 font-mono text-[11px] font-black rounded-lg inline-block">
                              PIN: {standeePin}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-serif text-zinc-400 border-t border-amber-200/60 pt-2 tracking-wider">
                      <span>POWERED BY STUDIOCORE AI</span>
                      <span>THANK YOU FOR CELEBRATING WITH US</span>
                    </div>
                  </div>
                )}

                {/* DESIGN 2: ROYAL FOREST EMERALD & GOLD */}
                {activeDesignIndex === 1 && (
                  <div className="w-full h-full bg-gradient-to-br from-[#062D24] via-[#0A382E] to-[#041D17] border-4 border-amber-400/80 rounded-2xl p-5 flex flex-col justify-between text-white shadow-2xl relative">
                    <div className="text-center space-y-1">
                      <span className="text-[10px] tracking-[0.3em] uppercase font-serif text-amber-300">
                        ROYAL WEDDING GALLERY
                      </span>
                      <h2 
                        style={{ fontFamily: "'Cinzel', 'Playfair Display', serif" }} 
                        className="text-2xl sm:text-3xl font-black text-amber-100 tracking-wide drop-shadow-sm"
                      >
                        {standeeTitle}
                      </h2>
                      <p className="text-[11px] text-emerald-200/80 font-serif italic">
                        Point your camera &amp; instantly discover your moments
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-6 my-auto">
                      <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white p-2 rounded-2xl border-2 border-amber-400 shadow-xl shrink-0">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(standeeUrl)}`}
                          alt="QR Code"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="space-y-1.5 text-left text-xs text-emerald-100">
                        <p className="font-bold">✦ Open Camera App</p>
                        <p className="font-bold">✦ Scan QR Code</p>
                        <p className="font-bold">✦ Instant AI Face Search</p>
                        {standeePin && (
                          <div className="pt-1">
                            <span className="px-2.5 py-1 bg-amber-400 text-zinc-950 font-mono text-[11px] font-black rounded-lg inline-block shadow-md">
                              PASS KEY: {standeePin}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-mono tracking-widest text-emerald-400/70 border-t border-emerald-700/60 pt-2 uppercase">
                      <span>STUDIOCORE LUXURY</span>
                      <span>MEMORIES FOREVER</span>
                    </div>
                  </div>
                )}

                {/* DESIGN 3: MODERN OBSIDIAN & MONOCHROME EDITORIAL */}
                {activeDesignIndex === 2 && (
                  <div className="w-full h-full bg-[#121214] border-2 border-zinc-700 rounded-2xl p-5 flex flex-col justify-between text-white shadow-2xl relative">
                    <div className="text-center space-y-1">
                      <span className="text-[10px] tracking-[0.35em] uppercase font-mono text-zinc-400">
                        DIGITAL EVENT ARCHIVE
                      </span>
                      <h2 
                        style={{ fontFamily: "'Italiana', 'Instrument Serif', Georgia, serif" }} 
                        className="text-3xl sm:text-4xl font-normal text-white tracking-tight"
                      >
                        {standeeTitle}
                      </h2>
                      <p className="text-[11px] text-zinc-400 font-mono">
                        Fast biometric face search • High-resolution prints
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-6 my-auto">
                      <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white p-2 rounded-2xl border-4 border-zinc-200 shadow-xl shrink-0">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(standeeUrl)}`}
                          alt="QR Code"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="space-y-1.5 text-left text-xs text-zinc-300 font-mono">
                        <p className="font-bold">1. Scan with Phone</p>
                        <p className="font-bold">2. Quick Face Match</p>
                        <p className="font-bold">3. Save Your Photos</p>
                        {standeePin && (
                          <div className="pt-1">
                            <span className="px-2.5 py-1 bg-white text-zinc-950 font-mono text-[11px] font-black rounded-lg inline-block">
                              PIN: {standeePin}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-mono tracking-widest text-zinc-500 border-t border-zinc-800 pt-2 uppercase">
                      <span>STUDIOCORE.IN</span>
                      <span>TABLE GUEST ACCESS</span>
                    </div>
                  </div>
                )}

                {/* DESIGN 4: BOHO TERRACOTTA & DUSTY ROSE */}
                {activeDesignIndex === 3 && (
                  <div className="w-full h-full bg-[#FAF3EE] border-4 border-[#E8C8B5] rounded-2xl p-5 flex flex-col justify-between text-[#4A2D23] shadow-inner relative">
                    <div className="text-center space-y-1">
                      <span className="text-[10px] tracking-[0.25em] uppercase font-serif text-[#9E5743]">
                        WELCOME TO THE CELEBRATION
                      </span>
                      <h2 
                        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }} 
                        className="text-2xl sm:text-3xl font-black text-[#3D2118] tracking-tight"
                      >
                        {standeeTitle}
                      </h2>
                      <p className="text-[11px] text-[#805041] font-serif italic">
                        Find every moment captured with love
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-6 my-auto">
                      <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white p-2 rounded-2xl border-2 border-[#D98B75] shadow-md shrink-0">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(standeeUrl)}`}
                          alt="QR Code"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="space-y-1.5 text-left text-xs text-[#523228]">
                        <p className="font-bold">🌸 1. Scan the QR code</p>
                        <p className="font-bold">📸 2. Snap a quick selfie</p>
                        <p className="font-bold">✨ 3. Get all your photos</p>
                        {standeePin && (
                          <div className="pt-1">
                            <span className="px-2.5 py-1 bg-[#F0D5C7] text-[#52291E] font-mono text-[11px] font-black rounded-lg inline-block border border-[#DFB6A2]">
                              PIN: {standeePin}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-serif text-[#8A5A4D] border-t border-[#ECCDBE] pt-2 tracking-wider">
                      <span>WITH GRATITUDE</span>
                      <span>STUDIOCORE PHOTO DISCOVERY</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom Action Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-[11px] font-bold text-zinc-500">
                Resolution: 300 DPI High-Res Print ready • 3:2 Ratio
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleDownloadStandee}
                  disabled={isDownloadingStandee}
                  className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-amber-600/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloadingStandee ? 'Generating PNG...' : 'Download Design (PNG)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Standee</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default function GalleryShareCenterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6 text-zinc-500 text-xs font-bold">
          Loading Share Links Center...
        </div>
      }
    >
      <GalleryShareCenterContent />
    </Suspense>
  );
}
