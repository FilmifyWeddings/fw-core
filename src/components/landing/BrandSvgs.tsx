'use client';

import React from 'react';

// NEW: 100% Vector recreation of uploaded StudioCore SC Monogram Logo
export const StudioCoreLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="scGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E5C158" />
        <stop offset="50%" stopColor="#D4AF37" />
        <stop offset="100%" stopColor="#9A7B32" />
      </linearGradient>
    </defs>
    {/* Interlocking S & C curves matching user's uploaded image */}
    <path 
      d="M 65 30 C 45 30, 25 45, 25 65 C 25 85, 45 95, 65 95 C 85 95, 105 75, 125 45 C 140 25, 160 25, 175 40 C 190 55, 190 80, 175 95 C 160 110, 135 105, 125 95" 
      stroke="url(#scGoldGrad)" 
      strokeWidth="22" 
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path 
      d="M 65 95 C 80 95, 95 85, 110 65 M 35 45 C 45 32, 60 30, 70 30" 
      stroke="url(#scGoldGrad)" 
      strokeWidth="22" 
      strokeLinecap="round"
    />
  </svg>
);

// Official 100% Authentic Brand Logos sourced directly from Official Brand Media Kits & Wikimedia Official Vector Repositories

export const InstagramLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg" 
    alt="Instagram" 
    className={`${className} object-contain`} 
  />
);

export const FacebookLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg" 
    alt="Facebook" 
    className={`${className} object-contain`} 
  />
);

export const MetaLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg" 
    alt="Meta" 
    className={`${className} object-contain`} 
  />
);

export const WhatsAppLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" 
    alt="WhatsApp" 
    className={`${className} object-contain`} 
  />
);

export const GoogleDriveLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" 
    alt="Google Drive" 
    className={`${className} object-contain`} 
  />
);

export const GoogleSheetsLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg" 
    alt="Google Sheets" 
    className={`${className} object-contain`} 
  />
);

export const GoogleCalendarLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" 
    alt="Google Calendar" 
    className={`${className} object-contain`} 
  />
);

export const GmailLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" 
    alt="Gmail" 
    className={`${className} object-contain`} 
  />
);

export const AdobeLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/7/7b/Adobe_Systems_logo_2017.svg" 
    alt="Adobe" 
    className={`${className} object-contain`} 
  />
);

export const DropboxLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/7/78/Dropbox_Icon.svg" 
    alt="Dropbox" 
    className={`${className} object-contain`} 
  />
);

export const GoogleLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" 
    alt="Google" 
    className={`${className} object-contain`} 
  />
);
