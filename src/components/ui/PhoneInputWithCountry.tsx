'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface CountryItem {
  code: string;       // ISO 2-letter code e.g. 'IN'
  dialCode: string;   // e.g. '+91'
  name: string;       // e.g. 'India'
  flag: string;       // e.g. '🇮🇳'
}

export const COUNTRIES: CountryItem[] = [
  { code: 'IN', dialCode: '+91', name: 'India', flag: '🇮🇳' },
  { code: 'AE', dialCode: '+971', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'US', dialCode: '+1', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', dialCode: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', dialCode: '+1', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', dialCode: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: 'SG', dialCode: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: 'SA', dialCode: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'QA', dialCode: '+974', name: 'Qatar', flag: '🇶🇦' },
  { code: 'OM', dialCode: '+968', name: 'Oman', flag: '🇴🇲' },
  { code: 'KW', dialCode: '+965', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'BH', dialCode: '+973', name: 'Bahrain', flag: '🇧🇭' },
  { code: 'NP', dialCode: '+977', name: 'Nepal', flag: '🇳🇵' },
  { code: 'BD', dialCode: '+880', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'LK', dialCode: '+94', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'MY', dialCode: '+60', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'TH', dialCode: '+66', name: 'Thailand', flag: '🇹🇭' },
  { code: 'DE', dialCode: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', dialCode: '+33', name: 'France', flag: '🇫🇷' },
  { code: 'IT', dialCode: '+39', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', dialCode: '+34', name: 'Spain', flag: '🇪🇸' },
  { code: 'NL', dialCode: '+31', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'CH', dialCode: '+41', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'NZ', dialCode: '+64', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'ZA', dialCode: '+27', name: 'South Africa', flag: '🇿🇦' },
  { code: 'MU', dialCode: '+230', name: 'Mauritius', flag: '🇲🇺' },
  { code: 'ID', dialCode: '+62', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'PH', dialCode: '+63', name: 'Philippines', flag: '🇵🇭' },
  { code: 'JP', dialCode: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', dialCode: '+82', name: 'South Korea', flag: '🇰🇷' },
  { code: 'RU', dialCode: '+7', name: 'Russia', flag: '🇷🇺' },
];

export interface PhoneInputWithCountryProps {
  value?: string;
  onChange: (fullPhoneNumber: string, parts?: { countryCode: string; nationalNumber: string }) => void;
  defaultCountryCode?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
}

export default function PhoneInputWithCountry({
  value = '',
  onChange,
  defaultCountryCode = '+91',
  placeholder = '98765 43210',
  required = false,
  disabled = false,
  className = '',
  inputClassName = '',
  buttonClassName = '',
}: PhoneInputWithCountryProps) {
  // Parse incoming value to extract dialCode and nationalNumber
  const initialCountry = useMemo(() => {
    if (!value) return COUNTRIES.find(c => c.dialCode === defaultCountryCode) || COUNTRIES[0];
    const clean = value.trim();
    // Check longest matching dial code first
    const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
    for (const c of sorted) {
      if (clean.startsWith(c.dialCode)) {
        return c;
      }
    }
    return COUNTRIES.find(c => c.dialCode === defaultCountryCode) || COUNTRIES[0];
  }, [defaultCountryCode]);

  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(initialCountry);
  const [nationalNumber, setNationalNumber] = useState<string>(() => {
    if (!value) return '';
    const clean = value.trim();
    if (clean.startsWith(initialCountry.dialCode)) {
      return clean.slice(initialCountry.dialCode.length).trim();
    }
    return clean;
  });

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync if value prop changes from outside (e.g. form reset or auto-fill)
  useEffect(() => {
    if (value === undefined || value === null) return;
    const clean = String(value).trim();
    if (!clean) {
      setNationalNumber('');
      return;
    }

    const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
    let matched = false;
    for (const c of sorted) {
      if (clean.startsWith(c.dialCode)) {
        setSelectedCountry(c);
        setNationalNumber(clean.slice(c.dialCode.length).trim());
        matched = true;
        break;
      }
    }

    if (!matched) {
      setNationalNumber(clean);
    }
  }, [value]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Filter countries by search query
  const filteredCountries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.dialCode.includes(q) || 
      c.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleCountrySelect = (country: CountryItem) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchQuery('');
    const full = nationalNumber ? `${country.dialCode} ${nationalNumber}`.trim() : country.dialCode;
    onChange(full, { countryCode: country.dialCode, nationalNumber });
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;

    // Check if pasted number includes a dial code
    const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
    let detectedCountry: CountryItem | null = null;
    let strippedNumber = rawInput;

    for (const c of sorted) {
      if (rawInput.trim().startsWith(c.dialCode)) {
        detectedCountry = c;
        strippedNumber = rawInput.trim().slice(c.dialCode.length);
        break;
      }
    }

    const activeCountry = detectedCountry || selectedCountry;
    if (detectedCountry) {
      setSelectedCountry(detectedCountry);
    }

    // Clean number: allow digits and spaces
    const cleanNumber = strippedNumber.replace(/[^\d\s\-]/g, '');
    setNationalNumber(cleanNumber);

    const full = cleanNumber.trim() ? `${activeCountry.dialCode} ${cleanNumber.trim()}`.trim() : '';
    onChange(full, { countryCode: activeCountry.dialCode, nationalNumber: cleanNumber.trim() });
  };

  return (
    <div className={`relative flex items-center ${className}`} ref={dropdownRef}>
      {/* Country Code Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`h-9 sm:h-10 px-2.5 sm:px-3 bg-slate-50 dark:bg-stone-900 hover:bg-slate-100 dark:hover:bg-stone-800 border border-r-0 border-[#E8E5DF] dark:border-stone-700 rounded-l-xl text-slate-800 dark:text-stone-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 focus:outline-none focus:ring-1 focus:ring-amber-500/40 select-none shadow-2xs ${buttonClassName}`}
        title="Select Country Dial Code"
      >
        <span className="text-base leading-none">{selectedCountry.flag}</span>
        <span className="font-mono text-xs font-bold text-slate-700 dark:text-stone-200">
          {selectedCountry.dialCode}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Phone Number Input */}
      <input
        type="tel"
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        value={nationalNumber}
        onChange={handleNumberChange}
        className={`h-9 sm:h-10 flex-1 min-w-0 bg-white dark:bg-stone-900 border border-[#E8E5DF] dark:border-stone-700 rounded-r-xl px-3 py-2 text-slate-900 dark:text-stone-100 text-xs font-mono font-semibold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all shadow-2xs placeholder-slate-400 ${inputClassName}`}
      />

      {/* Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-1.5 w-64 sm:w-72 bg-white dark:bg-[#1C1A18] rounded-2xl shadow-2xl border border-[#EAE5DA] dark:border-stone-800 z-[9999999] overflow-hidden flex flex-col font-sans"
          >
            {/* Search Input */}
            <div className="p-2 border-b border-[#EAE5DA] dark:border-stone-800 bg-slate-50/60 dark:bg-stone-900/60">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search country or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white dark:bg-stone-800 border border-[#EAE5DA] dark:border-stone-700 rounded-lg text-slate-800 dark:text-stone-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                />
              </div>
            </div>

            {/* Country List */}
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-stone-800/60 p-1">
              {filteredCountries.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 font-medium">
                  No country found
                </div>
              ) : (
                filteredCountries.map((c) => {
                  const isSelected = selectedCountry.code === c.code && selectedCountry.dialCode === c.dialCode;
                  return (
                    <button
                      key={`${c.code}_${c.dialCode}`}
                      type="button"
                      onClick={() => handleCountrySelect(c)}
                      className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-left transition cursor-pointer text-xs ${
                        isSelected 
                          ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-950 dark:text-amber-200 font-bold' 
                          : 'hover:bg-slate-50 dark:hover:bg-stone-800/60 text-slate-700 dark:text-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base leading-none shrink-0">{c.flag}</span>
                        <span className="truncate text-xs">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="font-mono text-xs text-slate-500 dark:text-stone-400 font-semibold">
                          {c.dialCode}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
