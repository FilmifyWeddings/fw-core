'use client';

import React, { useState } from 'react';
import { soundCtrl } from './SoundController';
import { 
  X, Crown, Calendar, Sparkles, CheckCircle2, 
  MapPin, Clock, ShieldCheck, Send
} from 'lucide-react';

interface VIPBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultService?: string;
  customizationDetails?: string;
}

export const VIPBookingModal: React.FC<VIPBookingModalProps> = ({
  isOpen,
  onClose,
  defaultService = 'Bridal Bespoke Consultation',
  customizationDetails = '',
}) => {
  const [service, setService] = useState(defaultService);
  const [salon, setSalon] = useState('The Imperial Pavilion, New Delhi');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [notes, setNotes] = useState(customizationDetails);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundCtrl.playChime(880);
    setSubmitted(true);
  };

  const handleResetAndClose = () => {
    soundCtrl.playClick();
    setSubmitted(false);
    onClose();
  };

  return (
    <div
      onClick={handleResetAndClose}
      className="fixed inset-0 z-50 bg-[#2A2723]/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-[#FBF8F3] border border-[#D4AF37] rounded-3xl p-6 sm:p-10 shadow-2xl overflow-y-auto max-h-[92vh]"
      >
        {/* Close Button */}
        <button
          onClick={handleResetAndClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-[#FAF5EC] border border-[#EADCC9] text-[#2A2723]/70 hover:text-[#2A2723] hover:border-[#D4AF37] transition-all"
          aria-label="Close booking modal"
        >
          <X className="w-4 h-4" />
        </button>

        {!submitted ? (
          <div>
            {/* Modal Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF5EC] border border-[#D4AF37]/35 text-[10px] font-sans font-semibold tracking-widest text-[#D4AF37] uppercase mb-2">
                <Crown className="w-3.5 h-3.5" />
                <span>Private Salon Reservation</span>
              </div>
              <h3
                className="text-2xl sm:text-3xl font-serif text-[#2A2723] uppercase tracking-wide"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Request VIP Appointment
              </h3>
              <p className="text-xs text-[#2A2723]/75 font-sans mt-1">
                Our Private Client Concierge will contact you within 6 business hours.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Service Selection */}
              <div>
                <label className="text-[10px] font-sans tracking-widest uppercase text-[#2A2723]/70 font-semibold block mb-1.5">
                  Consultation Type
                </label>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#EADCC9] text-xs font-sans text-[#2A2723] focus:border-[#D4AF37] focus:outline-none"
                >
                  <option value="Bridal Bespoke Consultation">Bridal Bespoke Consultation (In-Person Atelier)</option>
                  <option value="Virtual Stylist Session">Virtual Stylist Session (3D Video Stream)</option>
                  <option value="Worldwide Concierge Fitting">Worldwide Concierge Fitting (Residence / Palace)</option>
                </select>
              </div>

              {/* Salon Location */}
              <div>
                <label className="text-[10px] font-sans tracking-widest uppercase text-[#2A2723]/70 font-semibold block mb-1.5">
                  Preferred Salon / Venue
                </label>
                <select
                  value={salon}
                  onChange={(e) => setSalon(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#EADCC9] text-xs font-sans text-[#2A2723] focus:border-[#D4AF37] focus:outline-none"
                >
                  <option value="The Imperial Pavilion, New Delhi">The Imperial Pavilion, New Delhi</option>
                  <option value="Mayfair Haute Couture Studio, London">Mayfair Studio, London</option>
                  <option value="Fifth Avenue Private Salon, New York">Fifth Avenue Suite, New York</option>
                  <option value="Virtual Suite (Worldwide)">Virtual 3D Video Suite (Worldwide)</option>
                </select>
              </div>

              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-sans tracking-widest uppercase text-[#2A2723]/70 font-semibold block mb-1.5">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    placeholder="e.g. Maharani Gayatri Devi"
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#EADCC9] text-xs font-sans text-[#2A2723] focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-sans tracking-widest uppercase text-[#2A2723]/70 font-semibold block mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    placeholder="queen@couture.com"
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#EADCC9] text-xs font-sans text-[#2A2723] focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>

              {/* Phone & Wedding Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-sans tracking-widest uppercase text-[#2A2723]/70 font-semibold block mb-1.5">
                    Phone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    placeholder="+91 / +1 / +44 ..."
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#EADCC9] text-xs font-sans text-[#2A2723] focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-sans tracking-widest uppercase text-[#2A2723]/70 font-semibold block mb-1.5">
                    Occasion / Wedding Date
                  </label>
                  <input
                    type="date"
                    value={weddingDate}
                    onChange={(e) => setWeddingDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#EADCC9] text-xs font-sans text-[#2A2723] focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>

              {/* Customization or Fitting Notes */}
              <div>
                <label className="text-[10px] font-sans tracking-widest uppercase text-[#2A2723]/70 font-semibold block mb-1.5">
                  Bespoke Notes / Measurement Details
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  placeholder="Share details on your bridal color preference, silhouette or 3D fitting configurations..."
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#EADCC9] text-xs font-sans text-[#2A2723] focus:border-[#D4AF37] focus:outline-none resize-none"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-full bg-[#2A2723] text-[#FAF8F3] text-xs font-sans font-semibold tracking-[0.2em] uppercase border border-[#D4AF37] hover:bg-[#FAF5EC] hover:text-[#2A2723] transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Confirm VIP Appointment Request</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-[10px] font-sans text-[#2A2723]/60 pt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Strict Discretion & Royal Privacy Accord</span>
              </div>
            </form>
          </div>
        ) : (
          /* Confirmation State */
          <div className="text-center py-8 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-[#FAF5EC] border-2 border-[#D4AF37] flex items-center justify-center mx-auto mb-6 text-[#D4AF37] shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <span className="text-xs font-sans tracking-[0.28em] uppercase text-[#D4AF37] font-semibold block mb-2">
              Reservation Confirmed
            </span>

            <h3
              className="text-2xl sm:text-3xl font-serif text-[#2A2723] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              We Await Your Presence, {fullName || 'Excellency'}
            </h3>

            <p className="text-xs sm:text-sm text-[#2A2723]/80 font-sans max-w-md mx-auto leading-relaxed mb-6">
              Your appointment request for <strong>{service}</strong> at <strong>{salon}</strong> has been prioritized. Our Senior Atelier Concierge will contact you at <strong>{phone || email}</strong> with formal salon coordinates.
            </p>

            <button
              onClick={handleResetAndClose}
              className="px-8 py-3 rounded-full bg-[#2A2723] text-[#FAF8F3] text-xs font-sans tracking-[0.2em] uppercase border border-[#D4AF37]"
            >
              Return To Experience
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
