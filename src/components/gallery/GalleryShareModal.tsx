'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Copy,
  Check,
  QrCode,
  Lock,
  MessageCircle,
  X,
  Users,
  CheckSquare,
  Key,
  KeyRound,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Save,
  Sparkles,
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
  couple_slug?: string | null;
  unique_code?: string | null;
  cover_url: string | null;
  allow_downloads: boolean;
  is_active: boolean;
  max_selection_limit?: number;
  guest_skip_pin?: boolean;
  full_access_skip_pin?: boolean;
  selection_skip_pin?: boolean;
  raw_payload?: any;
}

interface GalleryShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  gallery: EventGallery | null;
  onGalleryUpdated?: (updated: any) => void;
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

export default function GalleryShareModal({
  isOpen,
  onClose,
  gallery,
  onGalleryUpdated,
}: GalleryShareModalProps) {
  const [origin, setOrigin] = useState('https://studiocore.in');

  // PINs State
  const [guestPin, setGuestPin] = useState('700680');
  const [passKey, setPassKey] = useState('518399');
  const [isEditingGuestPin, setIsEditingGuestPin] = useState(false);
  const [isEditingPassKey, setIsEditingPassKey] = useState(false);
  const [isSavingPins, setIsSavingPins] = useState(false);

  // Toggle Controls
  const [guestAskPin, setGuestAskPin] = useState(true);
  const [fullAccessDoNotAskPin, setFullAccessDoNotAskPin] = useState(false);
  const [selectionDoNotAskPin, setSelectionDoNotAskPin] = useState(false);
  const [selectionMaxLimit, setSelectionMaxLimit] = useState<string>('50');

  // Standee Modal State
  const [isStandeeModalOpen, setIsStandeeModalOpen] = useState(false);
  const [standeeUrl, setStandeeUrl] = useState<string>('');
  const [standeeTitle, setStandeeTitle] = useState<string>('');
  const [standeePin, setStandeePin] = useState<string | null>(null);
  const [standeeType, setStandeeType] = useState<string>('Guest Access');
  const [activeDesignIndex, setActiveDesignIndex] = useState<number>(0);
  const [isDownloadingStandee, setIsDownloadingStandee] = useState<boolean>(false);
  const [standeeViewTab, setStandeeViewTab] = useState<'standee' | 'qr'>('standee');
  const [isDownloadingMainQr, setIsDownloadingMainQr] = useState<boolean>(false);
  const [isCopiedQrLink, setIsCopiedQrLink] = useState<boolean>(false);

  // Copy Feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const standeeCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  // Sync state with gallery whenever modal opens or gallery updates
  useEffect(() => {
    if (!gallery) return;

    const gPin = gallery.guest_pin || gallery.pin_code || '700680';
    const pKey = gallery.admin_pin || gallery.pass_key || gallery.pin_code || '518399';
    setGuestPin(gPin);
    setPassKey(pKey);

    // Sync Don't Ask PIN states from database
    const isGuestSkip = gallery.guest_skip_pin !== undefined
      ? Boolean(gallery.guest_skip_pin)
      : (gallery.raw_payload?.guest_pin_enabled !== undefined ? !gallery.raw_payload.guest_pin_enabled : false);
    setGuestAskPin(!isGuestSkip);

    setFullAccessDoNotAskPin(Boolean(gallery.full_access_skip_pin));
    setSelectionDoNotAskPin(Boolean(gallery.selection_skip_pin));

    if (gallery.max_selection_limit) {
      setSelectionMaxLimit(String(gallery.max_selection_limit));
    }
  }, [gallery, isOpen]);

  // Handle URL change shallow push when modal opens/closes
  useEffect(() => {
    if (!isOpen) return;

    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.get('modal') !== 'share') {
        currentUrl.searchParams.set('modal', 'share');
        window.history.pushState({ modal: 'share' }, '', currentUrl.toString());
      }

      const handlePopState = () => {
        const u = new URL(window.location.href);
        if (u.searchParams.get('modal') !== 'share') {
          onClose();
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleClose();
        }
      };

      window.addEventListener('popstate', handlePopState);
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.get('modal') === 'share') {
        currentUrl.searchParams.delete('modal');
        window.history.pushState({}, '', currentUrl.pathname + (currentUrl.search ? currentUrl.search : ''));
      }
    }
    onClose();
  };

  // Centralized Backend Save Function
  const saveShareSettingsToBackend = async (overrides: {
    guest_pin?: string;
    admin_pin?: string;
    guest_skip_pin?: boolean;
    full_access_skip_pin?: boolean;
    selection_skip_pin?: boolean;
    max_limit?: number;
  }) => {
    if (!gallery?.id) return;
    setIsSavingPins(true);

    const payload = {
      action: 'save_share_settings',
      gallery_id: gallery.id,
      guest_pin: overrides.guest_pin !== undefined ? overrides.guest_pin : guestPin,
      admin_pin: overrides.admin_pin !== undefined ? overrides.admin_pin : passKey,
      guest_skip_pin: overrides.guest_skip_pin !== undefined ? overrides.guest_skip_pin : !guestAskPin,
      full_access_skip_pin: overrides.full_access_skip_pin !== undefined ? overrides.full_access_skip_pin : fullAccessDoNotAskPin,
      selection_skip_pin: overrides.selection_skip_pin !== undefined ? overrides.selection_skip_pin : selectionDoNotAskPin,
      max_limit: overrides.max_limit !== undefined ? overrides.max_limit : parseInt(selectionMaxLimit, 10) || 50,
    };

    try {
      const res = await fetch('/api/gallery/selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success && onGalleryUpdated) {
        onGalleryUpdated({
          ...gallery,
          guest_pin: payload.guest_pin,
          admin_pin: payload.admin_pin,
          pass_key: payload.admin_pin,
          guest_skip_pin: payload.guest_skip_pin,
          full_access_skip_pin: payload.full_access_skip_pin,
          selection_skip_pin: payload.selection_skip_pin,
          max_selection_limit: payload.max_limit,
        });
      }
    } catch (err) {
      console.error('Failed to save share settings:', err);
    } finally {
      setIsSavingPins(false);
    }
  };

  const handleSaveGuestPin = () => {
    setIsEditingGuestPin(false);
    saveShareSettingsToBackend({ guest_pin: guestPin.trim() });
  };

  const handleSavePassKey = () => {
    setIsEditingPassKey(false);
    saveShareSettingsToBackend({ admin_pin: passKey.trim() });
  };

  const handleToggleGuestPin = (doNotAsk: boolean) => {
    const askPin = !doNotAsk;
    setGuestAskPin(askPin);
    saveShareSettingsToBackend({ guest_skip_pin: doNotAsk });
  };

  const handleToggleFullAccessPin = (doNotAsk: boolean) => {
    setFullAccessDoNotAskPin(doNotAsk);
    saveShareSettingsToBackend({ full_access_skip_pin: doNotAsk });
  };

  const handleToggleSelectionPin = (doNotAsk: boolean) => {
    setSelectionDoNotAskPin(doNotAsk);
    saveShareSettingsToBackend({ selection_skip_pin: doNotAsk });
  };

  const handleLimitChange = (val: string) => {
    setSelectionMaxLimit(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      saveShareSettingsToBackend({ max_limit: num });
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Download high-resolution 3x2 standee PNG
  const handleDownloadStandee = async () => {
    if (!standeeCardRef.current) return;
    setIsDownloadingStandee(true);
    try {
      const dataUrl = await toPng(standeeCardRef.current, {
        cacheBust: true,
        pixelRatio: 3,
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

  const handleDownloadMainQr = async () => {
    if (!standeeUrl) return;
    setIsDownloadingMainQr(true);
    try {
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(standeeUrl)}`;
      const res = await fetch(qrApiUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const safeTitle = (gallery?.title || 'wedding').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${safeTitle}_${standeeType.replace(/\s+/g, '_')}_QR_Code.png`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Failed to download QR code:', err);
      alert('Could not download QR image. Please try again.');
    } finally {
      setIsDownloadingMainQr(false);
    }
  };

  const handleCopyQrLink = () => {
    if (!standeeUrl || typeof window === 'undefined') return;
    navigator.clipboard.writeText(standeeUrl);
    setIsCopiedQrLink(true);
    setTimeout(() => setIsCopiedQrLink(false), 2000);
  };

  if (!isOpen || !gallery) return null;

  const studioSlug = (gallery as any)?.studio_slug || (gallery as any)?.studio_branding?.studio_slug || 'studio';
  const eventName = (gallery as any)?.couple_slug || gallery?.slug || 'event';
  const eventId = gallery?.id || gallery?.slug || 'view';

  // Dynamic URLs matching user requirement: /eventname/studioname/guest-access/eventid
  const guestAccessUrl = !guestAskPin
    ? `${origin}/${eventName}/${studioSlug}/guest-access/${eventId}?share_key=${guestPin}`
    : `${origin}/${eventName}/${studioSlug}/guest-access/${eventId}`;

  const fullAccessUrl = fullAccessDoNotAskPin
    ? `${origin}/${eventName}/${studioSlug}/full-access/${eventId}?pass_key=${passKey}`
    : `${origin}/${eventName}/${studioSlug}/full-access/${eventId}`;

  const photoSelectionUrl = selectionDoNotAskPin
    ? `${origin}/${eventName}/${studioSlug}/selection/${eventId}?pass_key=${passKey}`
    : `${origin}/${eventName}/${studioSlug}/selection/${eventId}`;

  const guestWhatsAppMessage = `Hello!\nWe're excited to share your personal photo gallery from the event. This link will take you directly to your own photos, so you can relive and enjoy the special moments captured just for you:\n\n${guestAccessUrl}\n\nThank you for being a part of our event – we hope these memories bring a smile to your face!`;

  const fullAccessWhatsAppMessage = `Hi there!\nWe're delighted to share the complete gallery from the event with you. Please use the link below to view and enjoy all the photos captured during the celebration:\n\n${fullAccessUrl}\n\nFeel free to revisit these memories anytime and share your favorite moments with friends and family.`;

  const photoSelectionWhatsAppMessage = `Hello!\nHere's your exclusive access to the full event photo gallery. You can also select and mark your favorite photos directly within the gallery:\n\n${photoSelectionUrl}\n\nWe hope you enjoy browsing through the collection and finding the moments that mean the most to you.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      
      {/* Click outside backdrop to close */}
      <div className="fixed inset-0 -z-10" onClick={handleClose} />

      <div className="bg-[#FAF9F5] text-zinc-900 rounded-3xl p-5 sm:p-8 max-w-6xl w-full border border-[#E7E2D8] shadow-2xl space-y-6 relative max-h-[92vh] overflow-y-auto scrollbar-thin">
        
        {/* ─────────────────────────────────────────────────────────────
            HEADER & CLOSE BUTTON
        ───────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-[#E7E2D8] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center font-black shadow-2xs">
              <Sparkles className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider border border-amber-200">
                  Share Links Center
                </span>
                <span className="text-xs font-bold text-zinc-400">
                  {gallery.title}
                </span>
                {isSavingPins && (
                  <span className="text-[10px] text-amber-600 font-bold animate-pulse">
                    Saving to cloud...
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                Event Access &amp; Dynamic Links
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-2xl bg-white border border-[#E7E2D8] text-zinc-500 hover:text-zinc-900 hover:bg-[#F2EEE6] transition cursor-pointer shadow-2xs"
            title="Close Share Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            THE 3 DYNAMIC ACCESS CARDS (RESPONSIVE GRID)
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* CARD 1: GUEST ACCESS */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E7E2D8] shadow-xs space-y-5 flex flex-col justify-between hover:border-amber-400 transition-all">
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

              {/* Dedicated & Custom Editable PIN Box */}
              <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase font-bold text-amber-800 block">Guest PIN Code</span>
                    {isEditingGuestPin ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <input
                          type="text"
                          value={guestPin}
                          onChange={(e) => setGuestPin(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveGuestPin()}
                          className="w-24 px-2 py-0.5 bg-white border border-amber-400 rounded-md text-xs font-mono font-black text-zinc-900 focus:outline-hidden"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleSaveGuestPin}
                          className="p-1 rounded-md bg-amber-600 text-white hover:bg-amber-700 transition"
                          title="Save PIN"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-black text-zinc-900">{guestPin}</span>
                        <button
                          type="button"
                          onClick={() => setIsEditingGuestPin(true)}
                          className="p-1 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-md transition"
                          title="Edit Custom PIN"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(guestPin, 'pin_guest')}
                  className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-[11px] font-bold text-amber-900 hover:bg-amber-100 transition cursor-pointer shrink-0"
                >
                  {copiedKey === 'pin_guest' ? 'Copied' : 'Copy PIN'}
                </button>
              </div>

              {/* Animated Toggle: Do not ask PIN */}
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-zinc-800 block">Do not ask PIN</span>
                  <span className="text-[10px] text-zinc-400 block">Saved in database</span>
                </div>
                <AnimatedToggle
                  checked={!guestAskPin}
                  onChange={handleToggleGuestPin}
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
                  <span>{copiedKey === 'guest_wa' ? 'Copied!' : 'WhatsApp'}</span>
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
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E7E2D8] shadow-xs space-y-5 flex flex-col justify-between hover:border-blue-400 transition-all">
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

              {/* Dedicated & Custom Editable PIN Box */}
              <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <KeyRound className="w-4 h-4 text-blue-700 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase font-bold text-blue-800 block">Access PIN Code</span>
                    {isEditingPassKey ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <input
                          type="text"
                          value={passKey}
                          onChange={(e) => setPassKey(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSavePassKey()}
                          className="w-24 px-2 py-0.5 bg-white border border-blue-400 rounded-md text-xs font-mono font-black text-zinc-900 focus:outline-hidden"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleSavePassKey}
                          className="p-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition"
                          title="Save PIN"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-black text-zinc-900">{passKey}</span>
                        <button
                          type="button"
                          onClick={() => setIsEditingPassKey(true)}
                          className="p-1 text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded-md transition"
                          title="Edit Custom PIN"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(passKey, 'pin_full')}
                  className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-[11px] font-bold text-blue-900 hover:bg-blue-100 transition cursor-pointer shrink-0"
                >
                  {copiedKey === 'pin_full' ? 'Copied' : 'Copy PIN'}
                </button>
              </div>

              {/* Animated Toggle: Do not ask PIN */}
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-zinc-800 block">Do not ask PIN</span>
                  <span className="text-[10px] text-zinc-400 block">Saved in database</span>
                </div>
                <AnimatedToggle
                  checked={fullAccessDoNotAskPin}
                  onChange={handleToggleFullAccessPin}
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
                  <span>{copiedKey === 'full_wa' ? 'Copied!' : 'WhatsApp'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStandeeUrl(fullAccessUrl);
                  setStandeeTitle(gallery.title);
                  setStandeePin(fullAccessDoNotAskPin ? null : passKey);
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
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E7E2D8] shadow-xs space-y-5 flex flex-col justify-between hover:border-purple-400 transition-all">
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

              {/* Dedicated & Custom Editable PIN Box */}
              <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-200/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Key className="w-4 h-4 text-purple-700 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase font-bold text-purple-800 block">Pass Key</span>
                    {isEditingPassKey ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <input
                          type="text"
                          value={passKey}
                          onChange={(e) => setPassKey(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSavePassKey()}
                          className="w-24 px-2 py-0.5 bg-white border border-purple-400 rounded-md text-xs font-mono font-black text-zinc-900 focus:outline-hidden"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleSavePassKey}
                          className="p-1 rounded-md bg-purple-600 text-white hover:bg-purple-700 transition"
                          title="Save PIN"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-black text-zinc-900">{passKey}</span>
                        <button
                          type="button"
                          onClick={() => setIsEditingPassKey(true)}
                          className="p-1 text-purple-700 hover:text-purple-900 hover:bg-purple-100 rounded-md transition"
                          title="Edit Custom PIN"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(passKey, 'pass_key_copy')}
                  className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-[11px] font-bold text-purple-900 hover:bg-purple-100 transition cursor-pointer shrink-0"
                >
                  {copiedKey === 'pass_key_copy' ? 'Copied' : 'Copy Key'}
                </button>
              </div>

              {/* Controls */}
              <div className="space-y-2.5 pt-2 border-t border-zinc-100 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-zinc-800 block">Do not ask Pass Key</span>
                    <span className="text-[10px] text-zinc-400 block">Saved in database</span>
                  </div>
                  <AnimatedToggle
                    checked={selectionDoNotAskPin}
                    onChange={handleToggleSelectionPin}
                    colorClass="bg-purple-600"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="font-bold text-zinc-800 block">Max Selection Limit</span>
                    <span className="text-[10px] text-zinc-400 block">Saved in database</span>
                  </div>
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
                  <span>{copiedKey === 'selection_wa' ? 'Copied!' : 'WhatsApp'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStandeeUrl(photoSelectionUrl);
                  setStandeeTitle(gallery.title);
                  setStandeePin(selectionDoNotAskPin ? null : passKey);
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

      </div>

      {/* ─────────────────────────────────────────────────────────────
          CANVA 3X2 WEDDING TABLE STANDEE MODAL
      ───────────────────────────────────────────────────────────── */}
      {isStandeeModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-2xl w-full border border-zinc-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Clean Single Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-900 tracking-tight">
                    {standeeType} • QR Code & 2x3 Table Standee
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-medium">
                    Main High-Resolution QR Code & 8 Minimalist 2x3 Canva Print Templates
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsStandeeModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* View Switcher: 2x3 Table Standees vs Main Direct QR Code */}
            <div className="flex items-center p-1 bg-zinc-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setStandeeViewTab('standee')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  standeeViewTab === 'standee'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <span>🎨 2x3 Table Standees (8 Designs)</span>
              </button>
              <button
                type="button"
                onClick={() => setStandeeViewTab('qr')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  standeeViewTab === 'qr'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>📱 Main High-Res QR Code</span>
              </button>
            </div>

            {/* TAB 1: MAIN HIGH-RES STANDALONE QR CODE */}
            {standeeViewTab === 'qr' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="bg-[#FAF9F5] border border-[#E7E2D8] rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-700 font-bold block">
                      {standeeType.toUpperCase()}
                    </span>
                    <h4 className="text-xl font-black text-zinc-900 tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                      {standeeTitle}
                    </h4>
                  </div>

                  {/* Ultra HD Crisp QR Code */}
                  <div className="w-56 h-56 sm:w-64 sm:h-64 bg-white p-3 rounded-3xl border-2 border-zinc-200 shadow-xl flex items-center justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(standeeUrl)}`}
                      alt="Main High-Res QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {standeePin && (
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-mono text-xs font-black">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>ACCESS PIN: {standeePin}</span>
                    </div>
                  )}

                  <p className="text-xs text-zinc-500 max-w-xs leading-relaxed font-medium">
                    Point any smartphone camera at the QR code to open the gallery directly.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadMainQr}
                    disabled={isDownloadingMainQr}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-amber-600/20 active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isDownloadingMainQr ? 'Downloading 1000x1000 PNG...' : 'Download High-Res QR (PNG)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyQrLink}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
                  >
                    {isCopiedQrLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                    <span>{isCopiedQrLink ? 'Link Copied!' : 'Copy Direct Link'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: 2x3 TABLE STANDEES (8 DESIGNS) */}
            {standeeViewTab === 'standee' && (
              <>
            {/* Slider Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-zinc-50 px-4 py-2.5 rounded-2xl border border-zinc-100 gap-2 text-xs">
              <span className="font-bold text-zinc-600 truncate max-w-sm">
                Design {activeDesignIndex + 1} of 8:
                <strong className="text-zinc-900 ml-1.5 font-black">
                  {activeDesignIndex === 0 && 'Warm Ivory & Champagne Botanical'}
                  {activeDesignIndex === 1 && 'Royal Heritage Elephant & Gold'}
                  {activeDesignIndex === 2 && 'Royal Forest Emerald & Gold'}
                  {activeDesignIndex === 3 && 'Boho Terracotta & Sun Arch'}
                  {activeDesignIndex === 4 && 'Modern Obsidian & Crisp White'}
                  {activeDesignIndex === 5 && 'Blush Petal Rose & Gold'}
                  {activeDesignIndex === 6 && 'Regal Midnight Navy & Platinum'}
                  {activeDesignIndex === 7 && 'Earthy Sage & Eucalyptus'}
                </strong>
              </span>

              <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto py-0.5">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveDesignIndex(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                      activeDesignIndex === idx ? 'w-5 bg-amber-600' : 'bg-zinc-300 hover:bg-zinc-400'
                    }`}
                    title={`Design ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* The 2x3 Standee Canvas Container */}
            <div className="relative group max-w-md mx-auto w-full">
              <button
                type="button"
                onClick={() => setActiveDesignIndex((prev) => (prev === 0 ? 7 : prev - 1))}
                className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition shadow-lg cursor-pointer"
                title="Previous Design"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setActiveDesignIndex((prev) => (prev === 7 ? 0 : prev + 1))}
                className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition shadow-lg cursor-pointer"
                title="Next Design"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div
                ref={standeeCardRef}
                className="w-full aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl select-none flex flex-col justify-between p-6 sm:p-7 transition-all duration-300 relative"
              >
                {/* DESIGN 1: WARM IVORY & CHAMPAGNE BOTANICAL */}
                {activeDesignIndex === 0 && (
                  <div className="w-full h-full bg-[#FCFAF5] border-4 border-amber-300/70 rounded-2xl p-5 flex flex-col justify-between text-zinc-900 shadow-inner relative">
                    <div className="text-center space-y-1.5 pt-1">
                      <div className="flex items-center justify-center gap-1.5 text-amber-700/80 mb-0.5">
                        <span className="text-xs">✦</span>
                        <span className="text-[9.5px] tracking-[0.3em] uppercase font-serif font-bold">
                          CELEBRATION OF LOVE
                        </span>
                        <span className="text-xs">✦</span>
                      </div>
                      <h2 
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }} 
                        className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight leading-tight"
                      >
                        {standeeTitle}
                      </h2>
                      <p className="text-[11px] text-zinc-500 font-serif italic">
                        Scan with your phone to discover your moments
                      </p>
                    </div>

                    <div className="flex flex-col items-center justify-center my-auto space-y-3">
                      <div className="w-36 h-36 sm:w-40 sm:h-40 bg-white p-2.5 rounded-2xl border-2 border-amber-400 shadow-md">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(standeeUrl)}`}
                          alt="QR Code"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="space-y-1 text-center text-xs">
                        <p className="font-bold text-zinc-800">1. Open Camera • 2. Scan QR • 3. Find Photos</p>
                        {standeePin && (
                          <div className="pt-0.5">
                            <span className="px-3 py-1 bg-amber-100 border border-amber-300 text-amber-900 font-mono text-xs font-black rounded-lg inline-block">
                              PIN: {standeePin}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-serif text-zinc-400 border-t border-amber-200/60 pt-2 tracking-wider">
                      <span>POWERED BY STUDIOCORE AI</span>
                      <span>THANK YOU FOR COMING</span>
                    </div>
                  </div>
                )}

                {/* DESIGN 2: ROYAL HERITAGE ELEPHANT & GOLD ARCH */}
                {activeDesignIndex === 1 && (
                  <div className="w-full h-full bg-[#FAF5EB] border-4 border-amber-500/80 rounded-2xl p-5 flex flex-col justify-between text-zinc-900 shadow-inner relative">
                    <div className="text-center space-y-1.5 pt-1">
                      {/* Royal Indian Elephant Minimal Silhouette SVG */}
                      <div className="flex justify-center text-amber-700">
                        <svg className="w-8 h-8 fill-current" viewBox="0 0 100 100">
                          <path d="M50 20c-15 0-25 8-28 20-3 1-8 5-8 10 0 8 6 12 10 12l2 16h6l1-12h14l1 12h6l2-16c4 0 10-4 10-12 0-5-5-9-8-10-3-12-13-20-28-20zm0 6c11 0 19 6 22 15-4 1-8 4-10 8-3-2-7-3-12-3s-9 1-12 3c-2-4-6-7-10-8 3-9 11-15 22-15z" />
                        </svg>
                      </div>
                      <span className="text-[9.5px] tracking-[0.3em] uppercase font-serif font-black text-amber-800 block">
                        ROYAL WEDDING CELEBRATION
                      </span>
                      <h2 
                        style={{ fontFamily: "'Cinzel', 'Playfair Display', serif" }} 
                        className="text-2xl sm:text-3xl font-black text-amber-950 tracking-wide leading-tight"
                      >
                        {standeeTitle}
                      </h2>
                      <p className="text-[11px] text-amber-800/80 font-serif italic">
                        Find every blessed moment captured with family
                      </p>
                    </div>

                    <div className="flex flex-col items-center justify-center my-auto space-y-3">
                      <div className="w-36 h-36 sm:w-40 sm:h-40 bg-white p-2.5 rounded-2xl border-2 border-amber-500 shadow-xl">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(standeeUrl)}`}
                          alt="QR Code"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="space-y-1 text-center text-xs text-amber-950">
                        <p className="font-bold">✦ Scan with phone camera to find your photos ✦</p>
                        {standeePin && (
                          <div className="pt-0.5">
                            <span className="px-3 py-1 bg-amber-500 text-white font-mono text-xs font-black rounded-lg inline-block shadow-xs">
                              PASS KEY: {standeePin}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-serif text-amber-800/70 border-t border-amber-300 pt-2 tracking-widest uppercase">
                      <span>SHUBH VIVAH</span>
                      <span>STUDIOCORE LUXURY</span>
                    </div>
                  </div>
                )}

                {/* DESIGN 3: ROYAL FOREST EMERALD & GOLD */}
                {activeDesignIndex === 2 && (
                  <div className="w-full h-full bg-gradient-to-b from-[#072B22] via-[#0A382E] to-[#041E17] border-4 border-amber-400/80 rounded-2xl p-5 flex flex-col justify-between text-white shadow-2xl relative">
                    <div className="text-center space-y-1.5 pt-1">
                      <span className="text-[9.5px] tracking-[0.3em] uppercase font-serif text-amber-300 block font-bold">
                        EXCLUSIVE WEDDING GALLERY
                      </span>
                      <h2 
                        style={{ fontFamily: "'Cinzel', 'Playfair Display', serif" }} 
                        className="text-2xl sm:text-3xl font-black text-amber-100 tracking-wide leading-tight drop-shadow-sm"
                      >
                        {standeeTitle}
                      </h2>
                      <p className="text-[11px] text-emerald-200/80 font-serif italic">
                        Point your camera &amp; instantly discover your moments
                      </p>
                    </div>

                    <div className="flex flex-col items-center justify-center my-auto space-y-3">
                      <div className="w-36 h-36 sm:w-40 sm:h-40 bg-white p-2.5 rounded-2xl border-2 border-amber-400 shadow-xl">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(standeeUrl)}`}
                          alt="QR Code"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="space-y-1 text-center text-xs text-emerald-100">
                        <p className="font-bold">✦ 1. Open Camera  2. Scan QR  3. Face Search</p>
                        {standeePin && (
                          <div className="pt-0.5">
                            <span className="px-3 py-1 bg-amber-400 text-zinc-950 font-mono text-xs font-black rounded-lg inline-block shadow-md">
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

                {/* DESIGN 4: BOHO TERRACOTTA & SUN ARCH */}
                {activeDesignIndex === 3 && (
                  <div className="w-full h-full bg-[#FAF3EE] border-4 border-[#E8C8B5] rounded-2xl p-5 flex flex-col justify-between text-[#4A2D23] shadow-inner relative">
                    <div className="text-center space-y-1.5 pt-1">
                      <span className="text-[9.5px] tracking-[0.28em] uppercase font-serif font-black text-[#9E5743] block">
                        CELEBRATING FOREVER
                      </span>
                      <h2 
                        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }} 
                        className="text-2xl sm:text-3xl font-black text-[#3D2118] tracking-tight leading-tight"
                      >
                        {standeeTitle}
                      </h2>
                      <p className="text-[11px] text-[#805041] font-serif italic">
                        Find every moment captured with love &amp; joy
                      </p>
                    </div>

                    <div className="flex flex-col items-center justify-center my-auto space-y-3">
                      <div className="w-36 h-36 sm:w-40 sm:h-40 bg-white p-2.5 rounded-2xl border-2 border-[#D98B75] shadow-md">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(standeeUrl)}`}
                          alt="QR Code"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="space-y-1 text-center text-xs text-[#523228]">
                        <p className="font-bold">🌸 Scan with phone • Snap selfie • Get photos</p>
                        {standeePin && (
                          <div className="pt-0.5">
                            <span className="px-3 py-1 bg-[#F0D5C7] text-[#52291E] font-mono text-xs font-black rounded-lg inline-block border border-[#DFB6A2]">
                              PIN: {standeePin}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-serif text-[#8A5A4D] border-t border-[#ECCDBE] pt-2 tracking-wider">
                      <span>WITH GRATITUDE</span>
                      <span>STUDIOCORE AI</span>
                    </div>
                  </div>
                )}

                {/* DESIGN 5: MODERN OBSIDIAN & CRISP WHITE */}
                {activeDesignIndex === 4 && (
                  <div className="w-full h-full bg-[#121214] border-2 border-zinc-700 rounded-2xl p-5 flex flex-col justify-between text-white shadow-2xl relative">
                    <div className="text-center space-y-1.5 pt-1">
                      <span className="text-[9.5px] tracking-[0.35em] uppercase font-mono text-zinc-400 block">
                        DIGITAL EVENT ARCHIVE
                      </span>
                      <h2 
                        style={{ fontFamily: "'Italiana', 'Instrument Serif', Georgia, serif" }} 
                        className="text-3xl sm:text-4xl font-normal text-white tracking-tight leading-tight"
                      >
                        {standeeTitle}
                      </h2>
                      <p className="text-[11px] text-zinc-400 font-mono">
                        Instant biometric face recognition
                      </p>
                    </div>

                    <div className="flex flex-col items-center justify-center my-auto space-y-3">
                      <div className="w-36 h-36 sm:w-40 sm:h-40 bg-white p-2.5 rounded-2xl border-4 border-zinc-300 shadow-xl">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(standeeUrl)}`}
                          alt="QR Code"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="space-y-1 text-center text-xs text-zinc-300 font-mono">
                        <p className="font-bold">Scan • Face Match • Save Full Res</p>
                        {standeePin && (
                          <div className="pt-0.5">
                            <span className="px-3 py-1 bg-white text-zinc-950 font-mono text-xs font-black rounded-lg inline-block">
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

                {/* DESIGN 6: BLUSH PETAL ROSE & GOLD */}
                {activeDesignIndex === 5 && (
                  <div className="w-full h-full bg-[#FDF8F7] border-4 border-rose-300/80 rounded-2xl p-5 flex flex-col justify-between text-zinc-900 shadow-inner relative">
                    <div className="text-center space-y-1.5 pt-1">
                      <span className="text-[9.5px] tracking-[0.3em] uppercase font-serif text-rose-800 font-bold block">
                        THE WEDDING OF
                      </span>
                      <h2 
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }} 
                        className="text-2xl sm:text-3xl font-black text-rose-950 tracking-tight leading-tight"
                      >
                        {standeeTitle}
                      </h2>
                      <p className="text-[11px] text-rose-700/80 font-serif italic">
                        Scan with your phone to relive every romantic moment
                      </p>
                    </div>

                    <div className="flex flex-col items-center justify-center my-auto space-y-3">
                      <div className="w-36 h-36 sm:w-40 sm:h-40 bg-white p-2.5 rounded-2xl border-2 border-rose-400 shadow-md">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(standeeUrl)}`}
                          alt="QR Code"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="space-y-1 text-center text-xs text-rose-900">
                        <p className="font-bold">✦ Open Camera • Scan QR • Download Photos ✦</p>
                        {standeePin && (
                          <div className="pt-0.5">
                            <span className="px-3 py-1 bg-rose-100 border border-rose-300 text-rose-950 font-mono text-xs font-black rounded-lg inline-block">
                              PIN: {standeePin}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-serif text-rose-400 border-t border-rose-200 pt-2 tracking-wider">
                      <span>CHERISHED MEMORIES</span>
                      <span>STUDIOCORE AI</span>
                    </div>
                  </div>
                )}

                {/* DESIGN 7: REGAL MIDNIGHT NAVY & PLATINUM */}
                {activeDesignIndex === 6 && (
                  <div className="w-full h-full bg-gradient-to-b from-[#0B132B] via-[#1C2541] to-[#0B132B] border-4 border-slate-400/60 rounded-2xl p-5 flex flex-col justify-between text-white shadow-2xl relative">
                    <div className="text-center space-y-1.5 pt-1">
                      <span className="text-[9.5px] tracking-[0.35em] uppercase font-mono text-cyan-300/80 block font-bold">
                        GUEST PHOTO PORTAL
                      </span>
                      <h2 
                        style={{ fontFamily: "'Cinzel', Georgia, serif" }} 
                        className="text-2xl sm:text-3xl font-black text-slate-100 tracking-wide leading-tight"
                      >
                        {standeeTitle}
                      </h2>
                      <p className="text-[11px] text-slate-300/80 font-serif italic">
                        Scan the code to access your high-resolution photos
                      </p>
                    </div>

                    <div className="flex flex-col items-center justify-center my-auto space-y-3">
                      <div className="w-36 h-36 sm:w-40 sm:h-40 bg-white p-2.5 rounded-2xl border-2 border-slate-300 shadow-xl">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(standeeUrl)}`}
                          alt="QR Code"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="space-y-1 text-center text-xs text-slate-200 font-mono">
                        <p className="font-bold">✦ Point Phone Camera &amp; Tap Notification ✦</p>
                        {standeePin && (
                          <div className="pt-0.5">
                            <span className="px-3 py-1 bg-cyan-500 text-slate-950 font-mono text-xs font-black rounded-lg inline-block">
                              PASS KEY: {standeePin}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-mono tracking-widest text-slate-400 border-t border-slate-700 pt-2 uppercase">
                      <span>STUDIOCORE AI</span>
                      <span>HIGH RESOLUTION</span>
                    </div>
                  </div>
                )}

                {/* DESIGN 8: EARTHY SAGE & EUCALYPTUS */}
                {activeDesignIndex === 7 && (
                  <div className="w-full h-full bg-[#F5F7F5] border-4 border-[#7A8B7B]/60 rounded-2xl p-5 flex flex-col justify-between text-[#2D3B2E] shadow-inner relative">
                    <div className="text-center space-y-1.5 pt-1">
                      <span className="text-[9.5px] tracking-[0.3em] uppercase font-serif font-black text-[#566A59] block">
                        TOGETHER WITH THEIR FAMILIES
                      </span>
                      <h2 
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }} 
                        className="text-2xl sm:text-3xl font-black text-[#1E2B20] tracking-tight leading-tight"
                      >
                        {standeeTitle}
                      </h2>
                      <p className="text-[11px] text-[#566A59] font-serif italic">
                        Find your photos instantly with AI face search
                      </p>
                    </div>

                    <div className="flex flex-col items-center justify-center my-auto space-y-3">
                      <div className="w-36 h-36 sm:w-40 sm:h-40 bg-white p-2.5 rounded-2xl border-2 border-[#7A8B7B] shadow-md">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(standeeUrl)}`}
                          alt="QR Code"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="space-y-1 text-center text-xs text-[#2D3B2E]">
                        <p className="font-bold">🍃 1. Scan QR  2. Snap quick selfie  3. Save photos</p>
                        {standeePin && (
                          <div className="pt-0.5">
                            <span className="px-3 py-1 bg-[#E1E8E2] border border-[#7A8B7B] text-[#1E2B20] font-mono text-xs font-black rounded-lg inline-block">
                              PIN: {standeePin}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-serif text-[#7A8B7B] border-t border-[#D0DAD2] pt-2 tracking-wider">
                      <span>THANK YOU FOR CELEBRATING</span>
                      <span>STUDIOCORE AI</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom Action Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-[11px] font-bold text-zinc-500">
                Resolution: 300 DPI High-Res Print ready • 2:3 Vertical Standee
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
            </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
