'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface CountryCode {
  code: string;
  country: string;
  flag: string;
  name: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+971', country: 'AE', flag: '🇦🇪', name: 'United Arab Emirates' },
  { code: '+1', country: 'CA', flag: '🇨🇦', name: 'Canada' },
  { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: '+65', country: 'SG', flag: '🇸🇬', name: 'Singapore' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
  { code: '+81', country: 'JP', flag: '🇯🇵', name: 'Japan' },
];

interface CountryFlagPhoneInputProps {
  countryCode: string;
  phoneNumber: string;
  onCountryCodeChange: (code: string) => void;
  onPhoneNumberChange: (phone: string) => void;
}

export default function CountryFlagPhoneInput({
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
}: CountryFlagPhoneInputProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];

  return (
    <div className="relative flex items-center gap-2">
      {/* ─── COUNTRY FLAG DROPDOWN TRIGGER ─── */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1.5 bg-[#F8F9FD] border border-[#6C5CE7]/10 hover:border-[#6C5CE7]/30 px-3 py-3 rounded-2xl text-xs font-bold text-[#0B111E] transition focus:outline-none"
        >
          <span className="text-base">{selectedCountry.flag}</span>
          <span className="text-xs font-bold text-[#4F5E74]">{selectedCountry.code}</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#4F5E74]" />
        </button>

        {/* ─── COUNTRY DROPDOWN MENU ─── */}
        {dropdownOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setDropdownOpen(false)} 
            />
            <div className="absolute top-full left-0 mt-1.5 z-50 w-52 bg-white border border-[#6C5CE7]/15 rounded-2xl shadow-xl max-h-56 overflow-y-auto p-1">
              {COUNTRY_CODES.map((c, idx) => (
                <button
                  key={`${c.country}-${idx}`}
                  type="button"
                  onClick={() => {
                    onCountryCodeChange(c.code);
                    setDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                    selectedCountry.code === c.code && selectedCountry.country === c.country
                      ? 'bg-[#6C5CE7]/10 text-[#6C5CE7]'
                      : 'text-[#4F5E74] hover:bg-zinc-50 hover:text-[#0B111E]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{c.flag}</span>
                    <span className="font-semibold">{c.name}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400">{c.code}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ─── PHONE NUMBER INPUT ─── */}
      <input
        type="tel"
        required
        placeholder="98765 43210"
        value={phoneNumber}
        onChange={(e) => onPhoneNumberChange(e.target.value)}
        className="flex-1 bg-[#F8F9FD] border border-[#6C5CE7]/10 px-4 py-3 rounded-2xl text-sm font-bold text-[#0B111E] placeholder:text-zinc-400 focus:outline-none focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/10 transition"
      />
    </div>
  );
}
