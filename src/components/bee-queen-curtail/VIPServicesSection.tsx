'use client';

import React, { useState } from 'react';
import { soundCtrl } from './SoundController';
import { 
  Crown, Calendar, Video, Plane, Sparkles, Check, 
  ArrowRight, ShieldCheck, Clock, MapPin, X
} from 'lucide-react';

interface VIPService {
  id: string;
  title: string;
  tagline: string;
  icon: React.ElementType;
  desc: string;
  highlights: string[];
  location: string;
  duration: string;
}

const VIP_SERVICES: VIPService[] = [
  {
    id: 'bridal-bespoke',
    title: 'Bridal Bespoke Consultation',
    tagline: 'Private Atelier Salon with the Creative Director',
    icon: Crown,
    desc: 'An exclusive private appointment at our flagship salon. Experience intimate fabric draping, inspect archival weave samples, and receive hand-drawn custom couture sketches tailored to your wedding itinerary.',
    highlights: [
      'Private Champagne Suite & High Tea',
      'Direct Sketching by Creative Director',
      'Access to Vintage Mughal Zari Archives',
      'Full Bridal Entourage Styling',
    ],
    location: 'Flagship Salons: New Delhi & London',
    duration: '2.5 Hours Dedicated Session',
  },
  {
    id: 'virtual-stylist',
    title: 'Virtual Stylist Session',
    tagline: 'High-Definition 3D Draping & Live Video Fitting',
    icon: Video,
    desc: 'Designed for international brides across the Americas, Europe, and Middle East. Our Head Drape Master conducts a real-time interactive 3D silhouette fitting session via private secure video broadcast.',
    highlights: [
      'Live 3D Virtual Dressing Room Integration',
      'Fabric Swatch Box Dispatched by Air Courier',
      'Precision Metric Guidance via Video',
      'Bilingual Stylists (English, Hindi, French)',
    ],
    location: 'Worldwide via Encrypted Video Suite',
    duration: '60 Minutes Live Stream',
  },
  {
    id: 'worldwide-fitting',
    title: 'Worldwide Concierge Fitting',
    tagline: 'White-Glove Master Tailors at Your Residence',
    icon: Plane,
    desc: 'For sovereign gala commissions and grand destination weddings. Our senior master tailors travel directly to your residence, suite, or palace anywhere in the world for final hand-stitched hem adjustments.',
    highlights: [
      'Senior Drape Master & Artisan Flying to You',
      'On-Location Steaming & Pressing Service',
      'Final Emergency Stitching on Wedding Day',
      'Heirloom Packaging & Travel Preservation Trunk',
    ],
    location: 'Global (NYC, London, Dubai, Paris, Mumbai)',
    duration: 'Multi-Day Bespoke Travel Concierge',
  },
];

interface VIPServicesSectionProps {
  onSelectService: (serviceTitle: string) => void;
}

export const VIPServicesSection: React.FC<VIPServicesSectionProps> = ({ onSelectService }) => {
  return (
    <section id="vip-services" className="relative w-full py-24 sm:py-32 bg-[#FBF8F3] overflow-hidden">
      
      {/* Decorative Gold Ambient Blur */}
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs font-sans tracking-[0.28em] uppercase text-[#D4AF37] font-semibold">
              Sovereign Client Services
            </span>
          </div>
          <h2
            className="text-3xl sm:text-5xl font-serif text-[#2A2723] uppercase tracking-wide leading-tight"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Curated Services & VIP Appointments
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#2A2723]/75 font-sans max-w-xl mx-auto">
            From private salon consultations in New Delhi and London to international white-glove home fittings.
          </p>
        </div>

        {/* 3 VIP Glassmorphic Frosted Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {VIP_SERVICES.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                className="group relative p-8 sm:p-10 rounded-3xl bg-[#FAF6F0]/80 backdrop-blur-md border border-[#EADCC9] shadow-[0_15px_40px_-15px_rgba(42,39,35,0.06)] flex flex-col justify-between transition-all duration-500 hover:-translate-y-2 hover:border-[#D4AF37] hover:shadow-[0_20px_50px_-15px_rgba(212,175,55,0.18)]"
              >
                {/* Top Service Emblem */}
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#FBF8F3] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] mb-6 shadow-xs group-hover:scale-110 group-hover:bg-[#2A2723] group-hover:text-[#D4AF37] transition-all duration-300">
                    <Icon className="w-6 h-6" />
                  </div>

                  <span className="text-[10px] font-sans tracking-[0.22em] uppercase text-[#D4AF37] font-semibold block mb-1">
                    {service.tagline}
                  </span>
                  
                  <h3
                    className="text-2xl font-serif text-[#2A2723] tracking-wide mb-3"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    {service.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#2A2723]/75 font-sans leading-relaxed mb-6">
                    {service.desc}
                  </p>

                  {/* Highlights Bullet List */}
                  <div className="space-y-2.5 py-4 border-t border-[#EADCC9]/60">
                    {service.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs font-sans text-[#2A2723]/80">
                        <Check className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer Info & Booking Action */}
                <div className="mt-8 pt-6 border-t border-[#EADCC9]/60">
                  <div className="flex items-center justify-between text-[11px] font-sans text-[#2A2723]/60 mb-4">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                      {service.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                      {service.duration}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      soundCtrl.playChime(792);
                      onSelectService(service.title);
                    }}
                    className="w-full py-3 rounded-full bg-[#2A2723] text-[#FAF8F3] text-xs font-sans font-semibold tracking-[0.2em] uppercase border border-[#2A2723] hover:bg-[#FAF5EC] hover:text-[#2A2723] hover:border-[#D4AF37] transition-all flex items-center justify-center gap-2 group/btn shadow-xs"
                  >
                    <span>Request Appointment</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37] group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
