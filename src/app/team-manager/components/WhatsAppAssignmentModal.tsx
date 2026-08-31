'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, Copy, MessageCircle, Send, Calendar, Clock, MapPin, 
  User, CheckCheck, Sparkles, Phone, ExternalLink 
} from 'lucide-react';
import { FWTeamMember, FWProject, FWSubEvent } from '@/types';

export interface WhatsAppAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: FWTeamMember | null;
  role: string;
  project: FWProject | null;
  subEvent: FWSubEvent | null;
  studioName?: string;
  projectManagerName?: string;
}

export default function WhatsAppAssignmentModal({
  isOpen,
  onClose,
  member,
  role,
  project,
  subEvent,
  studioName = 'StudioCore',
  projectManagerName = 'Studio Manager',
}: WhatsAppAssignmentModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !member) return null;

  const cleanMemberName = member.name ? member.name.replace(/\.\.\./g, '').trim() : 'Team Member';
  const clientName = project?.client_name || 'Wedding Shoot';
  const eventTitle = subEvent?.event_title || 'Wedding Event';
  
  // Format Date & Time
  let dateText = 'Date: TBD';
  if (subEvent?.event_date) {
    const d = new Date(subEvent.event_date);
    if (!isNaN(d.getTime())) {
      dateText = d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  }

  const isOvernight = Boolean(subEvent?.roll_call_time && subEvent?.dismissal_estimate_time && (
    subEvent.dismissal_estimate_time < subEvent.roll_call_time
  ));

  let timeText = 'Time: Flexible';
  if (subEvent?.roll_call_time) {
    const startFormatted = subEvent.roll_call_time;
    const endFormatted = subEvent.dismissal_estimate_time || 'Wrap';
    timeText = `${startFormatted} → ${endFormatted} ${isOvernight ? '(🌙 Overnight)' : ''}`;
  }

  const venueText = subEvent?.venue_name ? `${subEvent.venue_name}${subEvent.venue_map_link ? ` (${subEvent.venue_map_link})` : ''}` : 'Location will be shared soon';

  // Construct the exact WhatsApp message
  const whatsappMessage = `👋 Hello ${cleanMemberName},
You have been assigned as *${role}* for an upcoming shoot!

📸 *Project:* ${clientName} (${eventTitle})
📅 *Date:* ${dateText}
⏰ *Timing:* ${timeText}
📍 *Location / Venue:* ${venueText}
👤 *Project Manager:* ${projectManagerName}

Please confirm your availability.
— *${studioName}*`;

  // WhatsApp click to chat URL
  const rawPhone = member.phone || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(whatsappMessage);
  const waUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone.startsWith('91') || cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone}`}?text=${encodedMessage}`
    : `https://api.whatsapp.com/send?text=${encodedMessage}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const currentTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col relative"
        >
          {/* MODAL HEADER: WHATSAPP GREEN THEME */}
          <div className="bg-[#075E54] text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                {member.avatar_url ? (
                  // eslint-disable-next-next/no-img-element
                  <img
                    src={member.avatar_url}
                    alt={cleanMemberName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white/40 shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#128C7E] text-white flex items-center justify-center font-black text-xs border-2 border-white/40">
                    {cleanMemberName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#075E54] absolute bottom-0 right-0" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-white text-base tracking-tight leading-tight">
                    {cleanMemberName}
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-700/80 text-[10px] font-bold text-emerald-200 uppercase">
                    {role}
                  </span>
                </div>
                <p className="text-xs text-emerald-100 font-medium mt-0.5">
                  {member.phone || 'No phone number added'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* WHATSAPP CHAT PREVIEW CONTAINER (LIGHT AUTHENTIC DOODLE PATTERN) */}
          <div className="bg-[#EFEAE2] p-4 md:p-6 space-y-4 overflow-y-auto max-h-[60vh] relative border-b border-stone-200">
            {/* DATE SEPARATOR PILL */}
            <div className="flex justify-center">
              <span className="px-3 py-1 rounded-lg bg-white/80 backdrop-blur-sm text-[10px] font-bold text-stone-600 shadow-2xs uppercase tracking-wider">
                TODAY • CREW DISPATCH PREVIEW
              </span>
            </div>

            {/* WHATSAPP BUBBLE CARD */}
            <div className="flex items-start gap-2">
              <div className="bg-white rounded-2xl rounded-tl-xs p-4 shadow-md border border-stone-200/80 max-w-md w-full text-stone-900 text-xs sm:text-sm leading-relaxed space-y-2.5 relative">
                <p className="font-semibold text-stone-800">
                  👋 Hello <span className="font-black text-stone-950">{cleanMemberName}</span>,
                </p>
                <p className="text-stone-700">
                  You have been assigned as <span className="font-extrabold text-emerald-700">*{role}*</span> for an upcoming shoot!
                </p>

                <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/70 space-y-1.5 text-xs text-stone-800">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-stone-500">📸 Project:</span>
                    <span className="font-extrabold text-stone-950">{clientName} ({eventTitle})</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-stone-500">📅 Date:</span>
                    <span className="text-stone-900">{dateText}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-stone-500">⏰ Timing:</span>
                    <span className="text-stone-900">{timeText}</span>
                  </div>
                  <div className="flex items-start gap-1.5 font-bold">
                    <span className="text-stone-500 shrink-0">📍 Venue:</span>
                    <span className="text-stone-900 break-words">{venueText}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-stone-500">👤 PM:</span>
                    <span className="text-stone-900">{projectManagerName}</span>
                  </div>
                </div>

                <p className="text-stone-700 text-[11px] font-medium pt-1">
                  Please confirm your availability.
                </p>
                <p className="text-stone-500 text-[10px] font-bold">
                  — *{studioName}*
                </p>

                {/* BUBBLE FOOTER TIME + DOUBLE TICK */}
                <div className="flex items-center justify-end gap-1 text-[9px] text-stone-400 font-semibold pt-1">
                  <span>{currentTimeStr}</span>
                  <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                </div>
              </div>
            </div>
          </div>

          {/* MODAL ACTION BUTTONS */}
          <div className="p-4 bg-white flex flex-wrap items-center justify-between gap-2.5">
            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                copied
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-600" />
                  <span>Copy Message</span>
                </>
              )}
            </button>

            {/* Right Buttons: Share on WhatsApp & Done */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl text-xs font-extrabold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
              >
                Skip / Done
              </button>

              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setTimeout(onClose, 1000)}
                className="px-5 py-2.5 rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-black shadow-md shadow-emerald-600/30 flex items-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Share on WhatsApp</span>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
