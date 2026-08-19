'use client';

import React from 'react';

// 1. Official Meta Ads Logo
export const MetaIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <linearGradient id="metaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0081FB" />
        <stop offset="100%" stopColor="#0064E0" />
      </linearGradient>
    </defs>
    <rect width="36" height="36" rx="8" fill="#F0F6FF" />
    <path
      d="M30 17.8c0-3.6-2.1-6.8-5.3-6.8-3.4 0-5.8 3.5-7.7 6.3-1.6 2.4-3.1 4.7-4.8 4.7-1.8 0-3.2-2.1-3.2-4.5 0-2.4 1.4-4.5 3.2-4.5.9 0 1.9.6 2.6 1.4.3.4.9.4 1.2.1.4-.3.4-.9.1-1.2-1-1.2-2.4-1.9-3.9-1.9-3.1 0-5.5 2.8-5.5 6.1 0 3.3 2.4 6.1 5.5 6.1 3.4 0 5.8-3.5 7.7-6.3 1.6-2.4 3.1-4.7 4.8-4.7 1.8 0 3.2 2.1 3.2 4.5 0 2.4-1.4 4.5-3.2 4.5-.9 0-1.9-.6-2.6-1.4-.3-.4-.9-.4-1.2-.1-.4.3-.4.9-.1 1.2 1 1.2 2.4 1.9 3.9 1.9 3.2 0 5.3-3.1 5.3-6.9z"
      fill="url(#metaGrad)"
    />
  </svg>
);

// 2. Official WhatsApp Logo
export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    <circle cx="18" cy="18" r="15" fill="#25D366" />
    <path
      d="M25 21.8c-.3-.2-1.9-1-2.2-1.1-.3-.1-.5-.2-.7.2-.2.3-.8 1.1-1 1.3-.2.2-.4.2-.7.1-.3-.2-1.5-.6-2.8-1.7-1.1-1-1.8-2.2-2-2.6-.2-.4 0-.5.2-.7.1-.2.3-.4.5-.6.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5s-.7-1.8-.9-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.3 1.3-1.3 3.1 0 1.8 1.3 3.6 1.5 3.8.2.2 2.6 4 6.3 5.6.9.4 1.6.6 2.1.8.9.3 1.7.2 2.3.1.7-.1 2.2-1 2.5-1.8.3-.9.3-1.7.2-1.8-.1-.1-.3-.2-.6-.3z"
      fill="#FFFFFF"
    />
  </svg>
);

// 3. Official Phone Calls Icon (Green Dialer / Telephony App Icon)
export const CallsIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <linearGradient id="phoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22C55E" />
        <stop offset="100%" stopColor="#16A34A" />
      </linearGradient>
    </defs>
    <rect width="36" height="36" rx="9" fill="url(#phoneGrad)" />
    <path
      d="M24.8 20.9c-.9-.3-1.8-.7-2.6-.4-.5.2-.9.7-1.2 1.1-.3.4-.8.5-1.3.2-2.1-1.3-3.7-2.9-5-5-.3-.5-.2-1 .2-1.3.4-.3.9-.7 1.1-1.2.3-.8-.1-1.7-.4-2.6-.5-1.3-1.2-2.3-2.1-2.3-.9 0-1.7.5-2.2 1.3-1.1 1.7-1.1 4.1.3 7 1.7 3.5 4.3 6.1 7.8 7.8 2.9 1.4 5.3 1.4 7 .3.8-.5 1.3-1.3 1.3-2.2 0-.9-1-1.6-2.3-2.1z"
      fill="#FFFFFF"
    />
  </svg>
);

// 4. Official Canva Gradient Logo
export const CanvaIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    <circle cx="18" cy="18" r="15" fill="url(#canvaGrad2)" />
    <defs>
      <linearGradient id="canvaGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00C4CC" />
        <stop offset="100%" stopColor="#7D2AE8" />
      </linearGradient>
    </defs>
    <path
      d="M13.5 19.5c-.8-1.5-1.2-3.2-1.2-5 0-3.3 1.8-4.5 3.5-4.5 1.2 0 2.2.7 2.7 1.8.2.4 0 .9-.4 1.1-.4.2-.9 0-1.1-.4-.3-.6-.7-.9-1.2-.9-.8 0-1.7.7-1.7 2.9 0 1.5.3 2.9.9 4.1.2.4 0 .9-.4 1.1-.4.2-.9 0-1.1-.2zm4.8 5c-2.8 0-4.8-2.1-4.8-4.7 0-2.4 1.6-4.2 3.8-4.2 2.4 0 4.1 1.9 4.1 4.5 0 2.6-1.7 4.4-3.1 4.4zm.2-1.5c.8 0 1.5-1.1 1.5-2.9 0-1.6-.7-2.9-1.8-2.9-1 0-1.9 1.1-1.9 2.7 0 1.7.9 3.1 2.2 3.1z"
      fill="#FFFFFF"
    />
  </svg>
);

// 5. Official Google Sheets Logo
export const GoogleSheetsIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    <path d="M23 4H10C8.9 4 8 4.9 8 6v24c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V11l-5-7z" fill="#0F9D58" />
    <path d="M23 4v7h5L23 4z" fill="#87CEAC" />
    <rect x="12" y="16" width="12" height="10" rx="1" fill="#FFFFFF" />
    <path d="M12 19.5h12M12 23h12M17 16v10" stroke="#0F9D58" strokeWidth="1.2" />
  </svg>
);

// 6. Yellow Notepad / Notes Logo
export const NotesIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    <rect x="7" y="5" width="22" height="26" rx="3" fill="#FFF59D" stroke="#FBC02D" strokeWidth="1.5" />
    <rect x="7" y="5" width="22" height="6" rx="2" fill="#F57F17" />
    <line x1="11" y1="16" x2="25" y2="16" stroke="#B08B00" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="11" y1="20" x2="25" y2="20" stroke="#B08B00" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="11" y1="24" x2="20" y2="24" stroke="#B08B00" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

// 7. Payment UPI / Card / Cash Icon (Vibrant Indian Rupee & Card)
export const PaymentTrackingIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <linearGradient id="payGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0284C7" />
        <stop offset="50%" stopColor="#2563EB" />
        <stop offset="100%" stopColor="#7C3AED" />
      </linearGradient>
    </defs>
    <rect width="36" height="36" rx="9" fill="url(#payGrad)" />
    <rect x="5.5" y="9" width="25" height="18" rx="3.5" fill="#FFFFFF" fillOpacity="0.18" stroke="#FFFFFF" strokeWidth="1.2" />
    <rect x="5.5" y="13.5" width="25" height="4" fill="#0F172A" fillOpacity="0.45" />
    <circle cx="24" cy="22" r="3" fill="#F59E0B" />
    <text x="11.5" y="23.5" fontSize="7" fontWeight="bold" fill="#FFFFFF" fontFamily="sans-serif">â‚¹ UPI</text>
  </svg>
);

// 8. Team Groups Collaboration Logo
export const TeamGroupsIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    <circle cx="18" cy="18" r="15" fill="#EDE7F6" stroke="#7C3AED" strokeWidth="1.2" />
    <circle cx="15" cy="15" r="3.5" fill="#7C3AED" />
    <circle cx="22" cy="14" r="2.8" fill="#A78BFA" />
    <path d="M9 25c0-3.3 2.7-5 6-5s6 1.7 6 5M21 24c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5" stroke="#7C3AED" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

// 9. Official Google Drive Logo
export const GoogleDriveIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    <path d="M13.5 7L7 18.2l4.8 8.3L18.3 15.3 13.5 7z" fill="#0066DA" />
    <path d="M22.5 7H13.5l4.8 8.3h9L22.5 7z" fill="#00AC47" />
    <path d="M28.8 26.5l-4.8-8.3-4.8 8.3h9.6z" fill="#EA4335" />
    <path d="M11.8 26.5l4.8-8.3h12.2l-4.8 8.3H11.8z" fill="#FFBA00" />
  </svg>
);

// 10. Random Files / Folder Logo
export const RandomFilesIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    <path d="M6 10c0-1.1.9-2 2-2h6l2 2h12c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V10z" fill="#0288D1" />
    <path d="M6 14h24v12c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V14z" fill="#29B6F6" />
    <rect x="11" y="16" width="7" height="8" rx="1" fill="#FFFFFF" opacity="0.9" />
    <rect x="18" y="18" width="7" height="6" rx="1" fill="#FFFFFF" opacity="0.75" />
  </svg>
);
