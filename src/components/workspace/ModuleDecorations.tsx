'use client';

import React from 'react';

// 1. Leads & CRM Decoration (Target / Funnel / Leads)
export function CrmDecoration({ className = "w-24 h-24 text-emerald-500/20" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="3" strokeDasharray="4 4" />
      <circle cx="50" cy="50" r="28" stroke="currentColor" strokeWidth="4" />
      <circle cx="50" cy="50" r="14" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="4" />
      <path d="M75 25L50 50L60 60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M50 50L40 40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// 2. Clients Directory Decoration (Profile / Roster)
export function ClientsDecoration({ className = "w-24 h-24 text-purple-500/20" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="35" r="18" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="3" />
      <path d="M15 75C15 62 26 55 40 55C54 55 65 62 65 75" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="68" cy="38" r="13" stroke="currentColor" strokeWidth="3" />
      <path d="M65 58C73 60 82 66 82 75" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// 3. Quotations Decoration (Document / Proposal / Star)
export function QuotationsDecoration({ className = "w-24 h-24 text-amber-500/20" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="15" width="50" height="70" rx="8" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="3" />
      <line x1="35" y1="32" x2="65" y2="32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="35" y1="44" x2="65" y2="44" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="35" y1="56" x2="52" y2="56" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="65" cy="65" r="14" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="3" />
      <path d="M60 65L64 69L71 61" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 4. Bookings Decoration (Calendar / Event Schedule)
export function BookingsDecoration({ className = "w-24 h-24 text-blue-500/20" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="22" width="60" height="58" rx="10" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="3" />
      <line x1="20" y1="40" x2="80" y2="40" stroke="currentColor" strokeWidth="3" />
      <line x1="35" y1="14" x2="35" y2="26" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <line x1="65" y1="14" x2="65" y2="26" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="36" cy="52" r="4" fill="currentColor" />
      <circle cx="50" cy="52" r="4" fill="currentColor" />
      <circle cx="64" cy="52" r="4" fill="currentColor" />
      <circle cx="36" cy="66" r="4" fill="currentColor" />
      <circle cx="50" cy="66" r="4" fill="currentColor" />
      <circle cx="64" cy="66" r="5" fill="currentColor" fillOpacity="0.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

// 5. Team Manager Decoration (Crew / Hierarchy)
export function TeamDecoration({ className = "w-24 h-24 text-indigo-500/20" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="28" r="14" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="3" />
      <path d="M30 62C30 52 39 46 50 46C61 46 70 52 70 62" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="45" r="10" stroke="currentColor" strokeWidth="2.5" />
      <path d="M10 75C10 67 16 62 24 62" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="76" cy="45" r="10" stroke="currentColor" strokeWidth="2.5" />
      <path d="M90 75C90 67 84 62 76 62" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// 6. Post-Production Decoration (Film Roll / Editing)
export function PostProdDecoration({ className = "w-24 h-24 text-rose-500/20" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="24" width="60" height="52" rx="8" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="3" />
      <path d="M20 38H80M20 62H80" stroke="currentColor" strokeWidth="3" />
      <circle cx="32" cy="31" r="3" fill="currentColor" />
      <circle cx="50" cy="31" r="3" fill="currentColor" />
      <circle cx="68" cy="31" r="3" fill="currentColor" />
      <circle cx="32" cy="69" r="3" fill="currentColor" />
      <circle cx="50" cy="69" r="3" fill="currentColor" />
      <circle cx="68" cy="69" r="3" fill="currentColor" />
      <polygon points="44,45 60,50 44,55" fill="currentColor" />
    </svg>
  );
}

// 7. Finance & Payments Decoration (Currency / Cash Flow)
export function FinanceDecoration({ className = "w-24 h-24 text-amber-500/20" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="38" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="3" />
      <path d="M38 32H62M38 42H58M38 32V52C48 52 56 46 56 42M38 52L60 72" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="72" cy="28" r="10" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

// 8. Attendance Decoration (Clock / GPS)
export function AttendanceDecoration({ className = "w-24 h-24 text-emerald-500/20" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="38" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="3" />
      <circle cx="50" cy="50" r="4" fill="currentColor" />
      <polyline points="50,26 50,50 66,58" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="74" cy="74" r="14" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2.5" />
      <path d="M70 74L73 77L79 71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 9. Integrations Decoration (Connected Nodes / Plug)
export function IntegrationsDecoration({ className = "w-24 h-24 text-blue-500/20" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="35" y="35" width="30" height="30" rx="8" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="3" />
      <circle cx="20" cy="50" r="8" stroke="currentColor" strokeWidth="3" />
      <circle cx="80" cy="50" r="8" stroke="currentColor" strokeWidth="3" />
      <circle cx="50" cy="20" r="8" stroke="currentColor" strokeWidth="3" />
      <circle cx="50" cy="80" r="8" stroke="currentColor" strokeWidth="3" />
      <line x1="28" y1="50" x2="35" y2="50" stroke="currentColor" strokeWidth="3" />
      <line x1="65" y1="50" x2="72" y2="50" stroke="currentColor" strokeWidth="3" />
      <line x1="50" y1="28" x2="50" y2="35" stroke="currentColor" strokeWidth="3" />
      <line x1="50" y1="65" x2="50" y2="72" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

// 10. Reports Decoration (Analytics / Growth)
export function ReportsDecoration({ className = "w-24 h-24 text-slate-500/20" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="20" width="60" height="60" rx="10" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="3" />
      <line x1="34" y1="65" x2="34" y2="50" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <line x1="50" y1="65" x2="50" y2="38" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <line x1="66" y1="65" x2="66" y2="30" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M30 45L48 34L64 24L74 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 3" />
    </svg>
  );
}

// 11. Settings Decoration (Gears / Preferences)
export function SettingsDecoration({ className = "w-24 h-24 text-zinc-500/20" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="18" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="3" />
      <circle cx="50" cy="50" r="8" fill="currentColor" />
      <path d="M50 18V28M50 72V82M18 50H28M72 50H82M27 27L34 34M66 66L73 73M27 73L34 66M66 34L73 27" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

// 12. Help & Support Decoration (Headset / Support)
export function SupportDecoration({ className = "w-24 h-24 text-teal-500/20" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="48" r="28" stroke="currentColor" strokeWidth="3" />
      <rect x="20" y="42" width="8" height="20" rx="4" fill="currentColor" />
      <rect x="72" y="42" width="8" height="20" rx="4" fill="currentColor" />
      <path d="M72 58C72 68 62 76 50 76H46" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="42" cy="76" r="4" fill="currentColor" />
    </svg>
  );
}
