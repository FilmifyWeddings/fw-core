'use client';

import React from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  IndianRupee,
  Briefcase,
  Building2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';

interface ShootDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shoot: {
    assignment_id?: string;
    sub_event_id?: string;
    project_id?: string;
    workspace_id?: string;
    studio_name: string;
    studio_logo?: string | null;
    client_name: string;
    couple_name: string;
    event_name: string;
    event_date: string;
    start_time: string;
    end_time: string;
    venue_location: string;
    role_name: string;
    agreed_amount: number;
    advance_amount?: number;
    paid_amount: number;
    balance_amount: number;
    payment_status: string;
    notes?: string;
  } | null;
}

export default function ShootDetailsModal({ isOpen, onClose, shoot }: ShootDetailsModalProps) {
  if (!isOpen || !shoot) return null;

  const agreed = Number(shoot.agreed_amount) || 0;
  const paid = Number(shoot.paid_amount ?? shoot.advance_amount) || 0;
  const bal = Number(shoot.balance_amount) != null ? Number(shoot.balance_amount) : Math.max(0, agreed - paid);
  const isPaid = (shoot.payment_status || '').toUpperCase() === 'PAID' || (bal <= 0 && agreed > 0);
  const isPartial = paid > 0 && bal > 0;

  const mapsUrl = shoot.venue_location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shoot.venue_location)}`
    : null;

  // Format date nicely
  let formattedDate = shoot.event_date;
  try {
    if (shoot.event_date && shoot.event_date !== 'TBD') {
      const d = new Date(shoot.event_date);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
    }
  } catch (_) {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-stone-900 to-zinc-900 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 uppercase tracking-wide">
              {shoot.role_name || 'Crew Member'}
            </span>
            <span className="text-[10px] text-stone-300 font-medium">
              {shoot.studio_name || 'Studio Partner'}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-white line-clamp-1">
            {shoot.couple_name || shoot.client_name || 'Wedding Event'}
          </h2>
          <p className="text-xs font-bold text-amber-300 mt-1 flex items-center gap-1.5">
            <span>{shoot.event_name || 'Main Shoot'}</span>
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Schedule & Timing Card */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
            <h4 className="text-[10px] uppercase font-black text-stone-400 tracking-wider">Date &amp; Shift Schedule</h4>
            
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100/80 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-stone-500 block">Shoot Date</span>
                <span className="text-sm font-black text-stone-900">{formattedDate}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100/80 border border-blue-200 flex items-center justify-center text-blue-800 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-stone-500 block">Call Time &amp; Shift</span>
                <span className="text-sm font-black text-stone-900">
                  {shoot.start_time || 'TBD'} {shoot.end_time ? `– ${shoot.end_time}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Venue & Location */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] uppercase font-black text-stone-400 tracking-wider">Venue Location</h4>
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 underline underline-offset-2"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="flex items-start gap-3 pt-1">
              <div className="w-9 h-9 rounded-xl bg-rose-100/80 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-stone-900 leading-snug">
                  {shoot.venue_location || 'Venue details will be updated by studio coordinator'}
                </span>
              </div>
            </div>
          </div>

          {/* Commercial & Payout Breakdown */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] uppercase font-black text-emerald-800 tracking-wider">Commercials &amp; Agreed Fee</h4>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                isPaid 
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                  : isPartial
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                {shoot.payment_status?.toUpperCase() || (isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'PENDING')}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2.5 rounded-xl bg-white border border-emerald-100">
                <span className="text-[9px] uppercase font-bold text-stone-400 block">Agreed Fee</span>
                <span className="text-sm sm:text-base font-black font-mono text-stone-900">
                  ₹{agreed.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-emerald-100">
                <span className="text-[9px] uppercase font-bold text-emerald-600 block">Received</span>
                <span className="text-sm sm:text-base font-black font-mono text-emerald-700">
                  ₹{paid.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-emerald-100">
                <span className="text-[9px] uppercase font-bold text-amber-700 block">Balance</span>
                <span className="text-sm sm:text-base font-black font-mono text-amber-800">
                  ₹{bal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Crew Notes / Instructions if any */}
          {shoot.notes && (
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-800">
                <FileText className="w-3.5 h-3.5" />
                <h4 className="text-xs font-bold">Studio Instructions &amp; Notes</h4>
              </div>
              <p className="text-xs text-stone-700 whitespace-pre-wrap leading-relaxed">
                {shoot.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <span className="text-[11px] text-stone-400 font-medium">
            Studio: <strong className="text-stone-700">{shoot.studio_name}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
