'use client';

import React from 'react';

// Official 100% Brand SVGs with exact brand colors

export const InstagramLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <radialGradient id="ig-grad1" cx="30%" cy="100%" r="130%">
      <stop offset="0%" stopColor="#fdf497" />
      <stop offset="5%" stopColor="#fdf497" />
      <stop offset="45%" stopColor="#fd5949" />
      <stop offset="60%" stopColor="#d6249f" />
      <stop offset="90%" stopColor="#285AEB" />
    </radialGradient>
    <rect width="24" height="24" rx="6" fill="url(#ig-grad1)" />
    <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8.2A3.2 3.2 0 1 1 12 8.8a3.2 3.2 0 0 1 0 6.4z" fill="#fff" />
    <circle cx="16.5" cy="7.5" r="1.1" fill="#fff" />
  </svg>
);

export const FacebookLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#1877F2" />
    <path d="M14.5 12h-2v7h-3v-7h-1.5V9.5H12.5V8c0-2 1-3 3-3h2.5v2.5h-1.5c-.7 0-1 .3-1 1v1h2.5L14.5 12z" fill="#fff" />
  </svg>
);

export const MetaLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 8.35C10.74 6.8 9.3 6 7.6 6 4.3 6 2 8.65 2 12s2.3 6 5.6 6c1.7 0 3.14-.8 4.4-2.35C13.26 17.2 14.7 18 16.4 18c3.3 0 5.6-2.65 5.6-6s-2.3-6-5.6-6c-1.7 0-3.14.8-4.4 2.35zM7.6 15.6C5.4 15.6 4 14.1 4 12s1.4-3.6 3.6-3.6c1.2 0 2.2.6 3.1 1.7C9.8 11.2 8.8 12 7.6 12v3.6zm8.8 0c-1.2 0-2.2-.8-3.1-1.9 1-1.1 2-1.7 3.1-1.7 2.2 0 3.6 1.5 3.6 3.6s-1.4 3.6-3.6 3.6z" fill="#0081FB" />
  </svg>
);

export const WhatsAppLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#25D366" />
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.34.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.88 1.21 3.08.15.2 2.09 3.19 5.07 4.48.71.3 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.43-.07-.13-.27-.2-.57-.35z" fill="#fff" />
  </svg>
);

export const GoogleDriveLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M8.27 15.5L4 8.1 8.27 0.7h8.54L21.08 8.1l-4.27 7.4H8.27z" fill="none" />
    <path d="M8.27 15.5L4 8.1h8.54L16.8 15.5H8.27z" fill="#34A853" />
    <path d="M12.54 8.1L8.27 0.7H16.81l4.27 7.4h-8.54z" fill="#FFBA00" />
    <path d="M4 8.1l4.27-7.4L4.27 8.1H4z" fill="#0066DA" />
    <path d="M4 8.1L8.27 15.5 4 8.1z" fill="#4285F4" />
  </svg>
);

export const GoogleSheetsLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect width="18" height="22" x="3" y="1" rx="2" fill="#0F9D58" />
    <path d="M14 1v6h6L14 1z" fill="#87CEAC" />
    <path d="M7 11h10v2H7v-2zm0 4h10v2H7v-2zm0 4h10v2H7v-2z" fill="#fff" />
  </svg>
);

export const GoogleCalendarLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect width="18" height="18" x="3" y="4" rx="3" fill="#4285F4" />
    <path d="M3 8h18V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2z" fill="#1565C0" />
    <text x="12" y="17" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold" fontFamily="sans-serif">31</text>
  </svg>
);

export const GmailLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M2.5 19.5h19V7.5L12 13 2.5 7.5v12z" fill="#EA4335" />
    <path d="M21.5 4.5L12 11.5 2.5 4.5H2.5A2 2 0 0 0 0.5 6.5v1h23v-1a2 2 0 0 0-2-2h-.5z" fill="#C5221F" />
    <path d="M2.5 19.5V7.5L12 14.5l9.5-7v12h-19z" fill="#4285F4" opacity="0.2" />
  </svg>
);

export const AdobeLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M14.4 3H24v18L14.4 3zM9.6 3H0v18L9.6 3zM12 9.5L16.8 21h-3.4l-1.4-3.5H9l3-8z" fill="#FF0000" />
  </svg>
);

export const DropboxLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M6 3.5L12 7.5 6 11.5 0 7.5 6 3.5zm12 0l6 4-6 4-6-4 6-4zM0 15.5l6-4 6 4-6 4-6-4zm24 0l-6-4-6 4 6 4 6-4zM6 17.5l6 4 6-4-6 3.5-6-3.5z" fill="#0061FF" />
  </svg>
);

export const GoogleLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
  </svg>
);
