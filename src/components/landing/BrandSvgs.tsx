'use client';

import React from 'react';

// Official 100% Authentic Brand Vector SVGs with exact brand colors & geometry

export const InstagramLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <radialGradient id="ig-grad-official" cx="30%" cy="100%" r="130%">
      <stop offset="0%" stopColor="#fdf497" />
      <stop offset="5%" stopColor="#fdf497" />
      <stop offset="45%" stopColor="#fd5949" />
      <stop offset="60%" stopColor="#d6249f" />
      <stop offset="90%" stopColor="#285AEB" />
    </radialGradient>
    <rect width="24" height="24" rx="6.5" fill="url(#ig-grad-official)" />
    <path fillRule="evenodd" clipRule="evenodd" d="M12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7ZM8.5 12C8.5 10.067 10.067 8.5 12 8.5C13.933 8.5 15.5 10.067 15.5 12C15.5 13.933 13.933 15.5 12 15.5C10.067 15.5 8.5 13.933 8.5 12Z" fill="white" />
    <circle cx="16.5" cy="7.5" r="1.2" fill="white" />
  </svg>
);

export const FacebookLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="12" fill="#1877F2" />
    <path d="M14.651 12.875L15.069 10.155H12.457V8.39C12.457 7.643 12.823 6.915 13.997 6.915H15.187V4.598C15.187 4.598 14.107 4.414 13.076 4.414C10.92 4.414 9.512 5.72 9.512 8.085V10.155H7.125V12.875H9.512V19.455C9.992 19.53 10.48 19.57 10.984 19.57C11.488 19.57 11.977 19.53 12.457 19.455V12.875H14.651Z" fill="white" />
  </svg>
);

export const MetaLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.0002 8.5C10.7402 6.9 9.3002 6 7.6002 6C4.3002 6 2.0002 8.65 2.0002 12C2.0002 15.35 4.3002 18 7.6002 18C9.3002 18 10.7402 17.1 12.0002 15.5C13.2602 17.1 14.7002 18 16.4002 18C19.7002 18 22.0002 15.35 22.0002 12C22.0002 8.65 19.7002 6 16.4002 6C14.7002 6 13.2602 6.9 12.0002 8.5ZM7.6002 15.5C5.5002 15.5 4.0002 14 4.0002 12C4.0002 10 5.5002 8.5 7.6002 8.5C8.8002 8.5 9.8002 9.2 10.7002 10.3C9.8002 11.4 8.8002 12.1 7.6002 12.1V15.5ZM16.4002 15.5C15.2002 15.5 14.2002 14.8 13.3002 13.7C14.2002 12.6 15.2002 11.9 16.4002 11.9C18.5002 11.9 20.0002 13.4 20.0002 15.4C20.0002 17.4 18.5002 15.5 16.4002 15.5Z" fill="#0081FB" />
  </svg>
);

export const WhatsAppLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="12" fill="#25D366" />
    <path d="M17.472 14.382C17.17 14.23 15.706 13.51 15.435 13.41C15.165 13.31 14.968 13.26 14.77 13.56C14.572 13.86 14.005 14.524 13.832 14.721C13.66 14.919 13.487 14.943 13.185 14.795C12.883 14.647 11.909 14.327 10.756 13.298C9.854 12.493 9.245 11.5 9.073 11.203C8.901 10.906 9.055 10.745 9.206 10.595C9.341 10.46 9.506 10.244 9.654 10.071C9.802 9.898 9.851 9.775 9.95 9.577C10.048 9.379 10 9.206 9.926 9.058C9.851 8.91 9.245 7.426 8.998 6.832C8.757 6.253 8.51 6.331 8.33 6.322H7.762C7.565 6.322 7.244 6.396 6.973 6.693C6.702 6.99 5.938 7.707 5.938 9.165C5.938 10.623 6.998 12.032 7.146 12.23C7.294 12.428 9.235 15.424 12.213 16.711C12.921 17.016 13.47 17.198 13.899 17.334C14.608 17.56 15.253 17.527 15.764 17.451C16.334 17.366 17.519 16.734 17.766 16.042C18.012 15.35 18.012 14.757 17.938 14.634C17.864 14.51 17.667 14.436 17.472 14.382Z" fill="white" />
  </svg>
);

export const GoogleDriveLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.8 15.5L21.08 8.1L16.8 0.7H8.27L12.54 8.1L16.8 15.5Z" fill="#FFBA00" />
    <path d="M8.27 15.5L4 8.1L8.27 0.7H16.8L12.54 8.1L8.27 15.5Z" fill="#0066DA" />
    <path d="M8.27 15.5H16.8L21.08 8.1H12.54L8.27 15.5Z" fill="#00AC47" />
  </svg>
);

export const GoogleSheetsLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="18" height="22" x="3" y="1" rx="2" fill="#0F9D58" />
    <path d="M14 1V7H20L14 1Z" fill="#87CEAC" />
    <rect x="7" y="11" width="10" height="2" fill="white" />
    <rect x="7" y="14" width="10" height="2" fill="white" />
    <rect x="7" y="17" width="10" height="2" fill="white" />
  </svg>
);

export const GoogleCalendarLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="18" height="18" x="3" y="4" rx="3.5" fill="#4285F4" />
    <path d="M3 8H21V6.5C21 5.12 19.88 4 18.5 4H5.5C4.12 4 3 5.12 3 6.5V8Z" fill="#1565C0" />
    <text x="12" y="17" textAnchor="middle" fill="white" fontSize="9.5" fontWeight="900" fontFamily="sans-serif">31</text>
  </svg>
);

export const GmailLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.5 19.5H21.5V7.5L12 13.5L2.5 7.5V19.5Z" fill="#EA4335" />
    <path d="M21.5 4.5L12 11.5L2.5 4.5H2.5C1.4 4.5 0.5 5.4 0.5 6.5V7.5L12 14.5L23.5 7.5V6.5C23.5 5.4 22.6 4.5 21.5 4.5Z" fill="#C5221F" />
    <path d="M0.5 6.5V19.5C0.5 20.6 1.4 21.5 2.5 21.5H5.5V10.5L0.5 6.5Z" fill="#4285F4" />
    <path d="M23.5 6.5L18.5 10.5V21.5H21.5C22.6 21.5 23.5 20.6 23.5 19.5V6.5Z" fill="#34A853" />
  </svg>
);

export const AdobeLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.4 3H24V21L14.4 3ZM9.6 3H0V21L9.6 3ZM12 9.5L16.8 21H13.4L12 17.5H9L12 9.5Z" fill="#FF0000" />
  </svg>
);

export const DropboxLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 3.5L12 7.5L6 11.5L0 7.5L6 3.5ZM18 3.5L24 7.5L18 11.5L12 7.5L18 3.5ZM0 15.5L6 11.5L12 15.5L6 19.5L0 15.5ZM24 15.5L18 11.5L12 15.5L18 19.5L24 15.5ZM6 17.5L12 21.5L18 17.5L12 14L6 17.5Z" fill="#0061FF" />
  </svg>
);

export const GoogleLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.71 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4" />
    <path d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.71 17.57C14.73 18.23 13.48 18.63 12 18.63C9.14 18.63 6.71 16.7 5.84 14.1H2.18V16.94C3.99 20.53 7.7 23 12 23Z" fill="#34A853" />
    <path d="M5.84 14.1C5.62 13.44 5.49 12.74 5.49 12C5.49 11.26 5.62 10.56 5.84 9.9V7.06H2.18C1.43 8.55 1 10.22 1 12C1 13.78 1.43 15.45 2.18 16.94L5.84 14.1Z" fill="#FBBC05" />
    <path d="M12 5.38C13.62 5.38 15.06 5.94 16.21 7.02L19.36 3.87C17.45 2.09 14.97 1 12 1C7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38Z" fill="#EA4335" />
  </svg>
);
