'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface CountryItem {
  code: string;
  country: string;
  flag: string;
  name: string;
}

export const COUNTRIES_LIST: CountryItem[] = [
  { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+971', country: 'AE', flag: '🇦🇪', name: 'United Arab Emirates' },
  { code: '+1', country: 'CA', flag: '🇨🇦', name: 'Canada' },
  { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: '+65', country: 'SG', flag: '🇸🇬', name: 'Singapore' },
  { code: '+966', country: 'SA', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+974', country: 'QA', flag: '🇶🇦', name: 'Qatar' },
  { code: '+968', country: 'OM', flag: '🇴🇲', name: 'Oman' },
  { code: '+965', country: 'KW', flag: '🇰🇼', name: 'Kuwait' },
  { code: '+973', country: 'BH', flag: '🇧🇭', name: 'Bahrain' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
  { code: '+39', country: 'IT', flag: '🇮🇹', name: 'Italy' },
  { code: '+34', country: 'ES', flag: '🇪🇸', name: 'Spain' },
  { code: '+31', country: 'NL', flag: '🇳🇱', name: 'Netherlands' },
  { code: '+41', country: 'CH', flag: '🇨🇭', name: 'Switzerland' },
  { code: '+64', country: 'NZ', flag: '🇳🇿', name: 'New Zealand' },
  { code: '+60', country: 'MY', flag: '🇲🇾', name: 'Malaysia' },
  { code: '+66', country: 'TH', flag: '🇹🇭', name: 'Thailand' },
  { code: '+62', country: 'ID', flag: '🇮🇩', name: 'Indonesia' },
  { code: '+81', country: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: '+27', country: 'ZA', flag: '🇿🇦', name: 'South Africa' },
  { code: '+55', country: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: '+7', country: 'RU', flag: '🇷🇺', name: 'Russia' },
];

export interface CountryPhoneInputProps {
  value: string;
  onChange: (fullPhone: string, countryCode: string, localNumber: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export function parsePhoneAndCode(raw: string): { code: string; number: string } {
  if (!raw) return { code: '+91', number: '' };
  const trimmed = raw.trim();

  // Check if string starts with any known country dial code
  for (const c of COUNTRIES_LIST) {
    if (trimmed.startsWith(c.code)) {
      const rest = trimmed.substring(c.code.length).trim();
      return { code: c.code, number: rest };
    }
  }

  // If starts with +, match generic +digits
  const genericMatch = trimmed.match(/^(\+\d{1,4})\s*(.*)$/);
  if (genericMatch) {
    return { code: genericMatch[1], number: genericMatch[2].trim() };
  }

  return { code: '+91', number: trimmed };
}

export default function CountryPhoneInput({
  value,
  onChange,
  placeholder = '98765 43210',
  disabled = false,
  className = '',
  required = false
}: CountryPhoneInputProps) {
  const { code: initialCode, number: initialNumber } = parsePhoneAndCode(value);
  const [selectedCode, setSelectedCode] = useState<string>(initialCode || '+91');
  const [localNumber, setLocalNumber] = useState<string>(initialNumber || '');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync state if external value changes meaningfully
  useEffect(() => {
    const parsed = parsePhoneAndCode(value);
    if (parsed.code !== selectedCode || parsed.number !== localNumber) {
      setSelectedCode(parsed.code);
      setLocalNumber(parsed.number);
    }
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const activeCountry = useMemo(() => {
    return COUNTRIES_LIST.find(c => c.code === selectedCode) || COUNTRIES_LIST[0];
  }, [selectedCode]);

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return COUNTRIES_LIST;
    const q = searchQuery.toLowerCase().trim();
    return COUNTRIES_LIST.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.code.includes(q) || 
      c.country.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleCountrySelect = (c: CountryItem) => {
    setSelectedCode(c.code);
    setIsOpen(false);
    setSearchQuery('');
    const full = localNumber ? `${c.code} ${localNumber}` : '';
    onChange(full, c.code, localNumber);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    // Strip redundant leading country code or + if user pasted full number
    if (raw.startsWith('+')) {
      const parsed = parsePhoneAndCode(raw);
      setSelectedCode(parsed.code);
      raw = parsed.number;
    }
    setLocalNumber(raw);
    const full = raw ? `${selectedCode} ${raw}`.trim() : '';
    onChange(full, selectedCode, raw);
  };

  return (
    <div className={`relative flex items-center gap-2 ${className}`}>
      {/* Country Code Trigger */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className="h-10 sm:h-11 px-3 bg-[#FDFBF7] dark:bg-zinc-800 border border-[#EAE5DA] dark:border-zinc-700 hover:border-amber-400 dark:hover:border-amber-600 rounded-xl text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 transition-all shadow-2xs focus:outline-none cursor-pointer shrink-0 disabled:opacity-50"
        >
          <span className="text-base leading-none">{activeCountry.flag}</span>
          <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">{activeCountry.code}</span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 max-h-72 bg-[#FEFDF9] dark:bg-zinc-900 border border-[#EAE5DA] dark:border-zinc-800 rounded-2xl shadow-2xl p-2 z-[9999999] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Search Input */}
            <div className="relative mb-2 shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country or code..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Country List */}
            <div className="overflow-y-auto space-y-0.5 max-h-52 pr-1">
              {filteredCountries.length === 0 ? (
                <div className="py-4 text-center text-xs text-zinc-400 font-medium">No countries found</div>
              ) : (
                filteredCountries.map((c) => {
                  const isSelected = c.code === activeCountry.code && c.country === activeCountry.country;
                  return (
                    <button
                      key={`${c.country}-${c.code}`}
                      type="button"
                      onClick={() => handleCountrySelect(c)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-amber-100/70 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300' 
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none">{c.flag}</span>
                        <span className="truncate max-w-[130px] font-semibold">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[11px]">
                        <span>{c.code}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Phone Number Input */}
      <input
        type="tel"
        required={required}
        disabled={disabled}
        value={localNumber}
        onChange={handleNumberChange}
        placeholder={placeholder}
        className="w-full h-10 sm:h-11 px-4 bg-[#FDFBF7] dark:bg-zinc-800 border border-[#EAE5DA] dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 shadow-2xs transition-all flex-1"
      />
    </div>
  );
}
