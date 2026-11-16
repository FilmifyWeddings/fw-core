'use client';

import React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Crisp, Modern StudioCore SC Brand Emblem (Never cut-off, always prominent)
export const StudioCoreBrandIcon = ({ className = "w-8 h-8", isCollapsed = false }: { className?: string; isCollapsed?: boolean }) => (
  <div suppressHydrationWarning className={`${className} rounded-xl bg-gradient-to-br from-[#D9822B] via-[#C8751F] to-[#A05A12] text-white flex items-center justify-center font-black tracking-wider shadow-sm border border-[#F5C78E]/40 shrink-0 select-none relative overflow-hidden group`}>
    <div suppressHydrationWarning className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent opacity-80 pointer-events-none" />
    <span suppressHydrationWarning className="relative z-10 text-[13px] font-black tracking-tight drop-shadow-xs">SC</span>
  </div>
);

const RESERVED_PUBLIC_ROOTS = new Set([
  'admin',
  'api',
  'assigned-shoots',
  'attendance',
  'auth',
  'bee-queen-curtail',
  'blocked',
  'book-demo',
  'broadcast-campaigns',
  'clear-cookies',
  'dashboard',
  'data-deletion',
  'features',
  'fix-431',
  'forgot-password',
  'free-trial',
  'g',
  'home',
  'home2',
  'instant-import',
  'integration-showcase',
  'integrations',
  'leads',
  'login',
  'p',
  'pdf-preview',
  'portal',
  'pricing',
  'privacy-policy',
  'quotations',
  'r',
  'reset-password',
  'review',
  'robots.txt',
  'sarajosmith',
  'settings',
  'signup',
  'single-send',
  'sitemap.xml',
  'support',
  'sushant-1023-fw',
  'sushant',
  'team',
  'team-manager',
  'partner',
  'terms-of-service',
  'vendor-portal',
  'workspace',
  '_next',
  'favicon.ico',
]);

export function isPublicStandaloneRoute(pathname: string): boolean {
  if (!pathname || pathname === '/') return true;
  const pathSegments = pathname.split('/').filter(Boolean);
  const isBrandedGallery =
    pathSegments.length >= 2 &&
    !pathSegments[0].includes('.') &&
    !RESERVED_PUBLIC_ROOTS.has(pathSegments[0].toLowerCase());

  return (
    isBrandedGallery ||
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/login') ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/forgot-password') ||
    pathname === '/reset-password' ||
    pathname.startsWith('/reset-password') ||
    pathname === '/team/login' ||
    pathname.startsWith('/team/login') ||
    pathname === '/features' ||
    pathname === '/pricing' ||
    pathname === '/book-demo' ||
    pathname === '/free-trial' ||
    pathname === '/privacy-policy' ||
    pathname.startsWith('/privacy-policy') ||
    pathname === '/terms-of-service' ||
    pathname.startsWith('/terms-of-service') ||
    pathname === '/data-deletion' ||
    pathname.startsWith('/data-deletion') ||
    pathname.startsWith('/pdf-preview') ||
    pathname.startsWith('/p/') ||
    pathname.startsWith('/g/') ||
    pathname.startsWith('/r/') ||
    pathname.startsWith('/review') ||
    pathname.startsWith('/attendance/') ||
    pathname.startsWith('/bee-queen-curtail') ||
    pathname === '/sarajosmith' ||
    pathname.startsWith('/sarajosmith') ||
    pathname.startsWith('/sushant')
  );
}

// Below-the-fold / Authenticated Dashboard Sidebar is dynamically code-split ONLY when on workspace/dashboard routes
const DashboardSidebarShell = dynamic(
  () => import('./DashboardSidebarShell').then((m) => m.DashboardSidebarShell),
  {
    ssr: false,
    loading: () => <div className="min-h-screen w-full bg-[#FAF9F6]" />,
  }
);

export interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const rawPathname = usePathname();
  const pathname = rawPathname || '';
  const searchParams = useSearchParams();
  const isPublicPreviewParam = searchParams?.get('preview') === 'public';
  const isStandalonePage = isPublicStandaloneRoute(pathname) || isPublicPreviewParam;

  if (isStandalonePage) {
    return <div className="min-h-screen w-full bg-[#FFFDF8] text-zinc-900">{children}</div>;
  }

  return <DashboardSidebarShell>{children}</DashboardSidebarShell>;
}
