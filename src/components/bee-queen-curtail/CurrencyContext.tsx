'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  formatPrice: (priceInInr: number) => string;
  rates: Record<CurrencyCode, number>;
  symbols: Record<CurrencyCode, string>;
}

const RATES: Record<CurrencyCode, number> = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0094,
  AED: 0.044,
};

const SYMBOLS: Record<CurrencyCode, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED ',
};

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'INR',
  setCurrency: () => {},
  formatPrice: () => '',
  rates: RATES,
  symbols: SYMBOLS,
});

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>('INR');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('bqc_currency') as CurrencyCode;
      if (saved && RATES[saved]) {
        setCurrencyState(saved);
      }
    } catch (_) {}
  }, []);

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    try {
      localStorage.setItem('bqc_currency', c);
    } catch (_) {}
  };

  const formatPrice = (priceInInr: number): string => {
    const converted = priceInInr * RATES[currency];
    const symbol = SYMBOLS[currency];

    if (currency === 'INR') {
      return `${symbol}${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(priceInInr)}`;
    }

    return `${symbol}${new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(Math.round(converted))}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        formatPrice,
        rates: RATES,
        symbols: SYMBOLS,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
