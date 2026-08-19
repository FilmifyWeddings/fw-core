'use client';

import React from 'react';

// 1. Leads & CRM: 3D Pastel Green Target with Dart & Soft Shadows
export function CrmDecoration({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="crm_grad_outer" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#A7F3D0" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#34D399" stopOpacity="0.3" />
        </radialGradient>
        <radialGradient id="crm_grad_inner" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.7" />
        </radialGradient>
        <filter id="crm_shadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="2" dy="6" stdDeviation="4" floodColor="#059669" floodOpacity="0.15" />
        </filter>
      </defs>
      <ellipse cx="70" cy="115" rx="45" ry="12" fill="#E6F4EA" opacity="0.6" />
      <g filter="url(#crm_shadow)" transform="rotate(-15 70 70)">
        {/* Outer Ring */}
        <circle cx="70" cy="70" r="48" fill="url(#crm_grad_outer)" stroke="#6EE7B7" strokeWidth="4" />
        <circle cx="70" cy="70" r="36" fill="#FFFFFF" opacity="0.9" />
        {/* Middle Ring */}
        <circle cx="70" cy="70" r="26" fill="#D1FAE5" stroke="#34D399" strokeWidth="3" />
        <circle cx="70" cy="70" r="16" fill="#FFFFFF" />
        {/* Bullseye */}
        <circle cx="70" cy="70" r="10" fill="url(#crm_grad_inner)" />
        {/* Dart Shaft & Flight */}
        <path d="M70 70L102 38" stroke="#047857" strokeWidth="4" strokeLinecap="round" />
        <path d="M102 38L112 28M102 38L108 48M102 38L92 32" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
        <polygon points="102,38 114,32 108,48" fill="#34D399" />
      </g>
    </svg>
  );
}

// 2. Clients Directory: 3D Soft Purple/Lavender User Pedestals
export function ClientsDecoration({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cli_grad_main" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="cli_grad_sub" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#DDD6FE" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      <ellipse cx="70" cy="118" rx="48" ry="12" fill="#F3E8FF" opacity="0.7" />
      {/* Background Avatar */}
      <g opacity="0.65" transform="translate(38, 15)">
        <circle cx="40" cy="35" r="14" fill="url(#cli_grad_sub)" />
        <path d="M20 70C20 54 28 48 40 48C52 48 60 54 60 70" fill="url(#cli_grad_sub)" />
      </g>
      {/* Foreground Avatar */}
      <g transform="translate(10, 25)">
        <circle cx="45" cy="30" r="18" fill="url(#cli_grad_main)" stroke="#FFFFFF" strokeWidth="3" />
        <path d="M18 78C18 58 30 50 45 50C60 50 72 58 72 78" fill="url(#cli_grad_main)" stroke="#FFFFFF" strokeWidth="3" />
      </g>
    </svg>
  );
}

// 3. Quotations: 3D Warm Gold Proposal Document Clipboard
export function QuotationsDecoration({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="quot_board" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="quot_paper" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FFFBEB" />
        </linearGradient>
      </defs>
      <ellipse cx="70" cy="120" rx="42" ry="10" fill="#FEF3C7" opacity="0.8" />
      <g transform="rotate(8 70 70)">
        {/* Clipboard Backing */}
        <rect x="30" y="20" width="68" height="92" rx="10" fill="url(#quot_board)" />
        {/* Paper */}
        <rect x="36" y="28" width="56" height="78" rx="6" fill="url(#quot_paper)" stroke="#FDE68A" strokeWidth="1.5" />
        {/* Document Lines */}
        <rect x="44" y="42" width="40" height="4" rx="2" fill="#FCD34D" />
        <rect x="44" y="52" width="34" height="4" rx="2" fill="#E5E7EB" />
        <rect x="44" y="62" width="38" height="4" rx="2" fill="#E5E7EB" />
        <rect x="44" y="72" width="22" height="4" rx="2" fill="#E5E7EB" />
        {/* Gold Seal Badge */}
        <circle cx="74" cy="86" r="12" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2" />
        <path d="M70 86L73 89L79 83" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Top Clip */}
        <rect x="50" y="16" width="28" height="10" rx="4" fill="#D97706" />
      </g>
    </svg>
  );
}

// 4. Bookings: 3D Soft Sky Blue Calendar with Event Badge
export function BookingsDecoration({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="book_head" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <ellipse cx="70" cy="118" rx="44" ry="10" fill="#DBEAFE" opacity="0.8" />
      <g transform="rotate(-6 70 70)">
        {/* Calendar Body */}
        <rect x="26" y="28" width="76" height="78" rx="12" fill="#FFFFFF" stroke="#BFDBFE" strokeWidth="2.5" />
        {/* Header Strip */}
        <path d="M26 38C26 32.4772 30.4772 28 36 28H92C97.5228 28 102 32.4772 102 38V48H26V38Z" fill="url(#book_head)" />
        {/* Binder Rings */}
        <rect x="42" y="20" width="6" height="14" rx="3" fill="#1E40AF" stroke="#FFFFFF" strokeWidth="1" />
        <rect x="80" y="20" width="6" height="14" rx="3" fill="#1E40AF" stroke="#FFFFFF" strokeWidth="1" />
        {/* Date Blocks */}
        <circle cx="44" cy="62" r="5" fill="#93C5FD" />
        <circle cx="64" cy="62" r="5" fill="#93C5FD" />
        <circle cx="84" cy="62" r="5" fill="#93C5FD" />
        <circle cx="44" cy="80" r="5" fill="#93C5FD" />
        <circle cx="64" cy="80" r="7" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="84" cy="80" r="5" fill="#93C5FD" />
      </g>
    </svg>
  );
}

// 5. Team Manager: 3D Indigo Collaboration Network
export function TeamDecoration({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="team_grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
      <ellipse cx="70" cy="116" rx="46" ry="11" fill="#E0E7FF" opacity="0.8" />
      {/* Central Leader */}
      <circle cx="70" cy="40" r="16" fill="url(#team_grad)" stroke="#FFFFFF" strokeWidth="3" />
      <path d="M48 76C48 60 58 54 70 54C82 54 92 60 92 76" fill="url(#team_grad)" stroke="#FFFFFF" strokeWidth="3" />
      {/* Left Associate */}
      <circle cx="34" cy="56" r="11" fill="#A5B4FC" />
      <path d="M18 88C18 76 25 70 34 70C43 70 50 76 50 88" fill="#A5B4FC" />
      {/* Right Associate */}
      <circle cx="106" cy="56" r="11" fill="#A5B4FC" />
      <path d="M90 88C90 76 97 70 106 70C115 70 122 76 122 88" fill="#A5B4FC" />
    </svg>
  );
}

// 6. Post-Production: 3D Rose Clapperboard & Film Strip
export function PostProdDecoration({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="post_grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>
      </defs>
      <ellipse cx="70" cy="118" rx="44" ry="10" fill="#FFE4E6" opacity="0.8" />
      <g transform="rotate(-8 70 70)">
        {/* Clapper Body */}
        <rect x="28" y="44" width="76" height="58" rx="8" fill="url(#post_grad)" stroke="#FFFFFF" strokeWidth="2.5" />
        {/* Film Strip Holes */}
        <rect x="36" y="52" width="12" height="10" rx="2" fill="#FFFFFF" opacity="0.85" />
        <rect x="54" y="52" width="12" height="10" rx="2" fill="#FFFFFF" opacity="0.85" />
        <rect x="72" y="52" width="12" height="10" rx="2" fill="#FFFFFF" opacity="0.85" />
        {/* Play Icon */}
        <polygon points="60,70 76,78 60,86" fill="#FFFFFF" />
        {/* Top Diagonal Clapper Stick */}
        <rect x="24" y="28" width="82" height="16" rx="4" fill="#881337" transform="rotate(-10 24 28)" />
        <line x1="42" y1="20" x2="36" y2="34" stroke="#FFFFFF" strokeWidth="3" />
        <line x1="62" y1="16" x2="56" y2="30" stroke="#FFFFFF" strokeWidth="3" />
        <line x1="82" y1="12" x2="76" y2="26" stroke="#FFFFFF" strokeWidth="3" />
      </g>
    </svg>
  );
}

// 7. Finance & Payments: 3D Golden Rupee Coins & Invoice
export function FinanceDecoration({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fin_coin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#CA8A04" />
        </linearGradient>
      </defs>
      <ellipse cx="70" cy="118" rx="45" ry="11" fill="#FEF08A" opacity="0.7" />
      {/* Background Receipt */}
      <rect x="30" y="24" width="50" height="74" rx="6" fill="#FFFFFF" stroke="#FEF08A" strokeWidth="2" transform="rotate(-12 30 24)" />
      <line x1="36" y1="42" x2="64" y2="36" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
      <line x1="38" y1="52" x2="66" y2="46" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
      {/* Main Rupee Coin */}
      <g transform="translate(42, 40)">
        <circle cx="36" cy="36" r="30" fill="url(#fin_coin)" stroke="#FFFFFF" strokeWidth="3" />
        <circle cx="36" cy="36" r="23" stroke="#FEF08A" strokeWidth="2" strokeDasharray="3 3" />
        {/* Rupee Symbol ₹ */}
        <path d="M26 24H46M26 32H42M26 24V40C34 40 40 36 40 32M26 40L42 52" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

// 8. Attendance: 3D Mint Clock with Checkmark
export function AttendanceDecoration({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="att_grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <ellipse cx="70" cy="118" rx="44" ry="10" fill="#D1FAE5" opacity="0.8" />
      <g transform="translate(15, 15)">
        {/* Clock Outer Rim */}
        <circle cx="50" cy="50" r="42" fill="#FFFFFF" stroke="#A7F3D0" strokeWidth="4" />
        <circle cx="50" cy="50" r="34" fill="#ECFDF5" />
        {/* Clock Hands */}
        <circle cx="50" cy="50" r="4" fill="#047857" />
        <line x1="50" y1="50" x2="50" y2="28" stroke="#047857" strokeWidth="4" strokeLinecap="round" />
        <line x1="50" y1="50" x2="68" y2="58" stroke="#047857" strokeWidth="3.5" strokeLinecap="round" />
        {/* Check Badge */}
        <circle cx="78" cy="78" r="14" fill="url(#att_grad)" stroke="#FFFFFF" strokeWidth="2.5" />
        <path d="M73 78L77 82L84 74" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

// 9. Integrations: 3D Cyan Connected Cloud Nodes
export function IntegrationsDecoration({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="int_grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
      </defs>
      <ellipse cx="70" cy="116" rx="46" ry="11" fill="#E0F2FE" opacity="0.8" />
      {/* Central Cloud Body */}
      <g transform="translate(18, 25)">
        <path d="M30 65H78C86 65 92 59 92 51C92 44 87 38 80 37C78 24 67 15 54 15C43 15 34 22 30 31C21 32 14 39 14 48C14 57 21 65 30 65Z" fill="url(#int_grad)" stroke="#FFFFFF" strokeWidth="3" />
        {/* Plug Connection Nodes */}
        <circle cx="35" cy="76" r="6" fill="#0369A1" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="54" cy="80" r="7" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="73" cy="76" r="6" fill="#0369A1" stroke="#FFFFFF" strokeWidth="2" />
        <line x1="35" y1="65" x2="35" y2="76" stroke="#0284C7" strokeWidth="2.5" />
        <line x1="54" y1="65" x2="54" y2="80" stroke="#0284C7" strokeWidth="2.5" />
        <line x1="73" y1="65" x2="73" y2="76" stroke="#0284C7" strokeWidth="2.5" />
      </g>
    </svg>
  );
}

// 10. Reports: 3D Slate Analytics Chart with Rising Arrow
export function ReportsDecoration({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rep_bar1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
        <linearGradient id="rep_bar2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
      </defs>
      <ellipse cx="70" cy="118" rx="45" ry="11" fill="#F1F5F9" opacity="0.8" />
      {/* 3D Column Bars */}
      <rect x="28" y="68" width="16" height="38" rx="4" fill="url(#rep_bar1)" stroke="#FFFFFF" strokeWidth="2" />
      <rect x="52" y="48" width="16" height="58" rx="4" fill="url(#rep_bar1)" stroke="#FFFFFF" strokeWidth="2" />
      <rect x="76" y="30" width="16" height="76" rx="4" fill="url(#rep_bar2)" stroke="#FFFFFF" strokeWidth="2" />
      <rect x="100" y="16" width="16" height="90" rx="4" fill="#0EA5E9" stroke="#FFFFFF" strokeWidth="2" />
      {/* Rising Trendline */}
      <path d="M28 65L52 46L76 28L108 12" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />
      <polygon points="108,12 96,14 104,22" fill="#F59E0B" />
    </svg>
  );
}

// 11. Settings: 3D Precision Interlocking Gears
export function SettingsDecoration({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="set_gear" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
      </defs>
      <ellipse cx="70" cy="118" rx="44" ry="10" fill="#F1F5F9" opacity="0.8" />
      {/* Big Gear */}
      <g transform="translate(25, 25)">
        <circle cx="45" cy="45" r="30" fill="url(#set_gear)" stroke="#FFFFFF" strokeWidth="3" />
        <circle cx="45" cy="45" r="14" fill="#FFFFFF" />
        {/* Teeth */}
        <rect x="41" y="8" width="8" height="12" rx="2" fill="#64748B" />
        <rect x="41" y="70" width="8" height="12" rx="2" fill="#64748B" />
        <rect x="8" y="41" width="12" height="8" rx="2" fill="#64748B" />
        <rect x="70" y="41" width="12" height="8" rx="2" fill="#64748B" />
      </g>
    </svg>
  );
}

// 12. Help & Support: 3D Teal Headset with Chat Bubble
export function SupportDecoration({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sup_grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
      </defs>
      <ellipse cx="70" cy="118" rx="44" ry="10" fill="#CCFBF1" opacity="0.8" />
      <g transform="translate(18, 20)">
        {/* Headband */}
        <path d="M20 54C20 30 34 16 52 16C70 16 84 30 84 54" stroke="url(#sup_grad)" strokeWidth="6" strokeLinecap="round" />
        {/* Left Earpad */}
        <rect x="12" y="46" width="14" height="24" rx="7" fill="#0F766E" stroke="#FFFFFF" strokeWidth="2.5" />
        {/* Right Earpad */}
        <rect x="78" y="46" width="14" height="24" rx="7" fill="#0F766E" stroke="#FFFFFF" strokeWidth="2.5" />
        {/* Mic Boom */}
        <path d="M84 62C84 76 72 84 58 84H50" stroke="#0D9488" strokeWidth="4" strokeLinecap="round" />
        <circle cx="46" cy="84" r="5" fill="#F59E0B" />
      </g>
    </svg>
  );
}
