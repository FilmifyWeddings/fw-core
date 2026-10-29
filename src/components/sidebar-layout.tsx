'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Target, Users, FileText, Calendar, Users2, 
  Film, IndianRupee, Clock, Layers, BarChart3, Settings, 
  Headphones, LogOut, ChevronDown, ChevronRight, ChevronLeft, 
  Menu, X, Sparkles, UserCheck, Archive, UserX, CheckCircle2, 
  ArrowUpRight, Bell, ShieldCheck, Crown, Briefcase, HardDrive, Camera,
  Flame, PhoneCall, CheckSquare, QrCode, Images, PlaySquare
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import StudioProfileEditModal from '@/components/workspace/StudioProfileEditModal';
import OnboardingCelebrationModal from '@/components/workspace/OnboardingCelebrationModal';
import MandatoryGoogleOnboardingModal from '@/components/auth/MandatoryGoogleOnboardingModal';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';
import { useWorkspace } from '@/lib/context/BhamstraContext';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

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

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const router = useRouter();
  const rawPathname = usePathname();
  const pathname = rawPathname || '';
  const isStandalonePage = isPublicStandaloneRoute(pathname);
  const searchParams = useSearchParams();
  const { isOwner, userRole, permissions, availableWorkspaces, activeWorkspace } = useWorkspace();
  const hasFetchedRef = useRef(false);
  const stageParam = searchParams?.get('stage') || searchParams?.get('filter') || searchParams?.get('view') || '';
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  const queryStudioCode = searchParams?.get('studio') || searchParams?.get('ws') || '';
  const currentStudioCode = 
    queryStudioCode || 
    (mounted ? (activeWorkspace?.workspaceId === 'all' ? 'all' : (activeWorkspace?.studioSlug || activeWorkspace?.workspaceId)) : '') || 
    '';

  const formatPathWithStudio = useCallback((path: string) => {
    if (!currentStudioCode) return path;
    try {
      const [base, query] = path.split('?');
      const params = new URLSearchParams(query || '');
      params.set('studio', currentStudioCode);
      return `${base}?${params.toString()}`;
    } catch (_) {
      return path.includes('?') ? `${path}&studio=${encodeURIComponent(currentStudioCode)}` : `${path}?studio=${encodeURIComponent(currentStudioCode)}`;
    }
  }, [currentStudioCode]);

  const checkIsSubActive = (subPath: string) => {
    if (subPath === '/leads') {
      return pathname === '/leads' && (!stageParam || stageParam === 'all' || stageParam === 'overview');
    }
    if (pathname.startsWith('/leads')) {
      const match = subPath.match(/stage=([^&]+)/);
      if (match) {
        const target = match[1].toLowerCase();
        if (target === 'archived') {
          return stageParam === 'archived' || stageParam === 'archive';
        }
        if (target === 'cool') {
          return stageParam === 'cool' || stageParam === 'warm';
        }
        if (target === 'contacted') {
          return stageParam === 'contacted' || stageParam === 'connected';
        }
        return stageParam.toLowerCase() === target;
      }
    }
    return pathname === subPath;
  };
  const [userEmail, setUserEmail] = useState<string>('');

  const [userName, setUserName] = useState<string>('');
  const [workspaceName, setWorkspaceName] = useState<string>('');
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>('');
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showOnboardingCelebration, setShowOnboardingCelebration] = useState<boolean>(false);
  const [showGoogleOnboarding, setShowGoogleOnboarding] = useState<boolean>(false);
  const [googleOnboardingRole, setGoogleOnboardingRole] = useState<'owner' | 'team_member'>('owner');
  const [leadsSubmenuOpen, setLeadsSubmenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [profileData, setProfileData] = useState<any>(null);

  // Liquid Glass Mode Switcher: Studio CRM vs AI Galleries
  const [appMode, setAppMode] = useState<'crm' | 'gallery'>('crm');

  // Automatically keep appMode synchronized with current route and localStorage
  useEffect(() => {
    if (pathname.startsWith('/workspace/gallery')) {
      setAppMode('gallery');
      try {
        localStorage.setItem('sc_workspace_app_mode', 'gallery');
      } catch (_) {}
    } else if (
      pathname === '/workspace' ||
      pathname.startsWith('/leads') ||
      pathname === '/team-manager' ||
      pathname.startsWith('/quotations') ||
      pathname.startsWith('/workspace/team') ||
      pathname.startsWith('/workspace/clients') ||
      pathname.startsWith('/workspace/post-production') ||
      pathname.startsWith('/workspace/finance') ||
      pathname.startsWith('/workspace/tasks') ||
      pathname.startsWith('/workspace/attendance') ||
      pathname.startsWith('/workspace/review') ||
      pathname.startsWith('/workspace/workflows') ||
      pathname.startsWith('/workspace/integrations') ||
      pathname.startsWith('/team') ||
      pathname.startsWith('/assigned-shoots')
    ) {
      setAppMode('crm');
      try {
        localStorage.setItem('sc_workspace_app_mode', 'crm');
      } catch (_) {}
    } else {
      try {
        const saved = localStorage.getItem('sc_workspace_app_mode');
        if (saved === 'gallery' || saved === 'crm') {
          setAppMode(saved);
        }
      } catch (_) {}
    }
  }, [pathname]);

  const handleSwitchAppMode = useCallback((mode: 'crm' | 'gallery') => {
    setAppMode(mode);
    try {
      localStorage.setItem('sc_workspace_app_mode', mode);
    } catch (_) {}

    if (mode === 'gallery') {
      if (!pathname.startsWith('/workspace/gallery')) {
        router.push(formatPathWithStudio('/workspace/gallery'));
      }
    } else {
      if (pathname.startsWith('/workspace/gallery')) {
        router.push(formatPathWithStudio('/workspace'));
      }
    }
  }, [pathname, router, formatPathWithStudio]);

  // Load user profile & collapsed preference
  const fetchUserProfile = useCallback(async (force = false) => {
    if (isStandalonePage) return;
    if (!force && hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    // 1. Initial fast hydration from localStorage on mount (0ms instant display)
    let hasLocalName = false;
    let hasLocalStudio = false;
    let hasLocalAvatar = false;

    if (typeof window !== 'undefined') {
      const cachedStudioName = localStorage.getItem('sc_studio_name') || localStorage.getItem('fw_studio_name');
      const cachedAvatar = localStorage.getItem('sc_avatar_url');
      const cachedLogo = localStorage.getItem('sc_logo_url');
      const cachedUserName = localStorage.getItem('sc_user_name');

      if (cachedStudioName && cachedStudioName !== 'StudioCore Workspace' && cachedStudioName !== 'All-in-One Studio') {
        setWorkspaceName(cachedStudioName);
        hasLocalStudio = true;
      }
      if (cachedAvatar || cachedLogo) {
        setUserAvatarUrl(cachedAvatar || cachedLogo || '');
        hasLocalAvatar = true;
      }
      if (cachedUserName && cachedUserName !== 'Studio Owner' && cachedUserName !== 'User') {
        setUserName(cachedUserName);
        hasLocalName = true;
      }
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email || '');
        setUserId(session.user.id);

        // Fallback to user metadata ONLY if NO saved local profile exists
        const metaStudio = session.user.user_metadata?.workspace_name || session.user.user_metadata?.studio_name || '';
        const metaName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
        const metaAvatar = session.user.user_metadata?.avatar_url || '';

        if (!hasLocalStudio && metaStudio) setWorkspaceName(metaStudio);
        if (!hasLocalName && metaName) setUserName(metaName);
        if (!hasLocalAvatar && metaAvatar) setUserAvatarUrl(metaAvatar);

        // Fetch authoritative profile from API (bypassing client RLS safely)
        const token = session.access_token;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
          const res = await fetch('/api/user/profile-setup', { headers });
          if (res.ok) {
            const json = await res.json();
            if (json?.profile && json.profile.id !== 'demo_user') {
              const p = json.profile;
              const finalStudio = p.studioName || (hasLocalStudio ? localStorage.getItem('sc_studio_name') : metaStudio);
              const finalName = p.fullName || (hasLocalName ? localStorage.getItem('sc_user_name') : metaName);
              const finalAvatar = p.avatarUrl || p.logoUrl || (hasLocalAvatar ? localStorage.getItem('sc_avatar_url') : metaAvatar);

              if (finalStudio) setWorkspaceName(finalStudio);
              if (finalName) setUserName(finalName);
              if (finalAvatar) setUserAvatarUrl(finalAvatar);

              if (typeof window !== 'undefined') {
                if (finalStudio) {
                  localStorage.setItem('sc_studio_name', finalStudio);
                  localStorage.setItem('fw_studio_name', finalStudio);
                }
                if (finalName) localStorage.setItem('sc_user_name', finalName);
                if (finalAvatar) localStorage.setItem('sc_avatar_url', finalAvatar);
              }

              // Detect if user logged in via Google and needs mandatory profile onboarding
              const isGoogle = session.user.app_metadata?.provider === 'google' ||
                               (session.user.identities && session.user.identities.some((id: any) => id.provider === 'google')) ||
                               p.authProvider === 'google';
              const isExistingUser = Boolean(
                p.phone || p.phoneVerified || (p.studioName && p.studioName !== 'My Studio') || p.isOnboarded
              );
              if (isGoogle && !isExistingUser) {
                setShowGoogleOnboarding(true);
                if (p.platformRole === 'team_member' || (typeof window !== 'undefined' && window.location.pathname.startsWith('/team'))) {
                  setGoogleOnboardingRole('team_member');
                }
              }
            }
          }
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Error loading user profile in sidebar handled safely:', err);
    }
  }, []);

  const handleGoogleOnboardingComplete = useCallback((data: { studioName: string; phone: string; fullName: string; role: string; avatarUrl?: string }) => {
    setShowGoogleOnboarding(false);
    if (data.studioName) setWorkspaceName(data.studioName);
    if (data.fullName) setUserName(data.fullName);
    if (data.avatarUrl) setUserAvatarUrl(data.avatarUrl);
    if (typeof window !== 'undefined' && window.history.replaceState) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('google_onboarding');
        url.searchParams.delete('role');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      } catch (_) {}
    }
    fetchUserProfile(true);
  }, [fetchUserProfile]);

  useEffect(() => {
    setMounted(true);
    const savedCollapsed = localStorage.getItem('sidebar_collapsed');
    if (savedCollapsed !== null) {
      setCollapsed(savedCollapsed === 'true');
    } else {
      setCollapsed(false);
    }

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isParamPresent = params.get('onboarding') === 'true' || params.get('welcome') === 'true';
      const isPending = localStorage.getItem('sc_show_onboarding_celebration') === 'true';
      const isCompleted = localStorage.getItem('sc_welcome_completed') === 'true';

      const isGoogleOnboarding = params.get('google_onboarding') === 'true';
      if (isGoogleOnboarding) {
        setShowGoogleOnboarding(true);
        const roleParam = params.get('role');
        if (roleParam === 'team_member') {
          setGoogleOnboardingRole('team_member');
        } else {
          setGoogleOnboardingRole('owner');
        }
      }

      if ((isParamPresent || isPending) && !isCompleted) {
        setShowOnboardingCelebration(true);
        try {
          localStorage.removeItem('sc_show_onboarding_celebration');
          localStorage.setItem('sc_welcome_completed', 'true');
          if (window.history.replaceState) {
            const url = new URL(window.location.href);
            url.searchParams.delete('welcome');
            url.searchParams.delete('onboarding');
            window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
          }
        } catch (_) {}
      } else if (isParamPresent && window.history.replaceState) {
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('welcome');
          url.searchParams.delete('onboarding');
          window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
        } catch (_) {}
      }
    }

    if (!isStandalonePage) {
      fetchUserProfile();
    }

    // Listen for custom profile update events
    const handleProfileUpdate = (e: any) => {
      if (isStandalonePage) return;
      const p = e.detail;
      if (p) {
        if (p.studioName) setWorkspaceName(p.studioName);
        if (p.fullName) setUserName(p.fullName);
        if (p.avatarUrl || p.logoUrl) setUserAvatarUrl(p.avatarUrl || p.logoUrl);
      }
      fetchUserProfile(true);
    };

    window.addEventListener('sc_profile_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('sc_profile_updated', handleProfileUpdate);
    };
  }, [fetchUserProfile, isStandalonePage]);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  // Clean idle prefetch - eliminates aggressive 13-route network bursts on page load
  useEffect(() => {
    if (isStandalonePage) return;
    const timer = setTimeout(() => {
      try {
        router.prefetch('/workspace');
      } catch (_) {}
    }, 2500);
    return () => clearTimeout(timer);
  }, [isStandalonePage, router]);

  useEffect(() => {
    if (pathname.startsWith('/leads')) {
      setLeadsSubmenuOpen(true);
    }
  }, [pathname]);

  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out from StudioCore?')) {
      try {
        const { clearUserWorkspaceCaches } = await import('@/lib/storage-safety');
        clearUserWorkspaceCaches();
      } catch (_) {}
      try {
        const { clearAllSupabaseAuthCookies } = await import('@/lib/supabase');
        clearAllSupabaseAuthCookies();
      } catch (_) {}
      await supabase.auth.signOut();
      window.location.href = '/login?logout=true';
    }
  };

  const partnerPortalItem = {
    id: 'partner-portal',
    name: 'Partner Portal',
    path: '/workspace/partner-portal',
    icon: Briefcase,
    iconBg: 'bg-[#EEF2FF] text-[#4F46E5]',
  };

  const hasPartnerWorkspaces = mounted && Boolean(availableWorkspaces?.some(w => !w.isOwner));

  const baseMenuItems = isOwner ? [
    {
      id: 'dashboard',
      name: 'Workspace Home',
      path: '/workspace',
      icon: LayoutDashboard,
      iconBg: 'bg-[#E0F2FE] text-[#0369A1]',
    },
    {
      id: 'leads',
      name: 'Leads & CRM',
      path: '/leads',
      icon: Target,
      iconBg: 'bg-[#E6F4EA] text-[#137333]',
      subItems: [
        { name: 'All Leads', path: '/leads', icon: Target },
        { name: 'New Leads', path: '/leads?stage=new', icon: Sparkles },
        { name: 'Contacted', path: '/leads?stage=contacted', icon: PhoneCall },
        { name: 'Cool / Warm', path: '/leads?stage=cool', icon: Clock },
        { name: 'Hot Leads', path: '/leads?stage=hot', icon: Flame },
        { name: 'Booked', path: '/leads?stage=booked', icon: CheckCircle2 },
        { name: 'Lost Leads', path: '/leads?stage=lost', icon: UserX },
        { name: 'Archived', path: '/leads?stage=archived', icon: Archive },
      ]
    },
    {
      id: 'clients',
      name: 'Clients Directory',
      path: '/workspace/clients',
      icon: Users,
      iconBg: 'bg-[#F3E8FF] text-[#7E22CE]',
    },
    {
      id: 'gallery',
      name: 'AI Galleries',
      path: '/workspace/gallery',
      icon: Camera,
      iconBg: 'bg-[#FEF3C7] text-[#D97706]',
    },
    {
      id: 'quotations',
      name: 'Quotations',
      path: '/quotations',
      icon: FileText,
      iconBg: 'bg-[#FEF3C7] text-[#B45309]',
    },
    {
      id: 'bookings',
      name: 'Bookings & Events',
      path: '/team-manager',
      icon: Calendar,
      iconBg: 'bg-[#E0F2FE] text-[#0284C7]',
    },
    {
      id: 'team',
      name: 'Team & Partners',
      path: '/workspace/team',
      icon: Users2,
      iconBg: 'bg-[#EDE9FE] text-[#6366F1]',
    },
    {
      id: 'post-production',
      name: 'Post-Production',
      path: '/workspace/post-production',
      icon: Film,
      iconBg: 'bg-[#FFE4E6] text-[#E11D48]',
    },
    {
      id: 'review',
      name: 'Video Review',
      path: '/workspace/video-review',
      icon: PlaySquare,
      iconBg: 'bg-[#EDE9FE] text-[#7C3AED]',
    },
    {
      id: 'storage',
      name: 'Studio Storage',
      path: '/workspace/storage',
      icon: HardDrive,
      iconBg: 'bg-[#F0FDF4] text-[#16A34A]',
    },
    {
      id: 'tasks',
      name: 'Tasks & Notes',
      path: '/workspace/tasks',
      icon: CheckSquare,
      iconBg: 'bg-[#FEF3C7] text-[#D97706]',
    },
    {
      id: 'finance',
      name: 'Finance & Payments',
      path: '/workspace/finance',
      icon: IndianRupee,
      iconBg: 'bg-[#FEF9C3] text-[#A16207]',
    },
    {
      id: 'attendance',
      name: 'Smart Attendance',
      path: '/workspace/attendance',
      icon: Clock,
      iconBg: 'bg-[#DCFCE7] text-[#15803D]',
    },
    {
      id: 'integrations',
      name: 'Integrations Hub',
      path: '/workspace/integrations',
      icon: Layers,
      iconBg: 'bg-[#E0E7FF] text-[#4338CA]',
    },
    {
      id: 'settings',
      name: 'Studio Settings',
      path: '/workspace/settings',
      icon: Settings,
      iconBg: 'bg-[#F4F4F5] text-[#52525B]',
    },
    {
      id: 'support',
      name: 'Help & Support',
      path: '/support',
      icon: Headphones,
      iconBg: 'bg-[#CCFBF1] text-[#0F766E]',
    },
  ] : [
    // PARTNER / FREELANCER WORKSPACE RESTRICTED NAVIGATION
    {
      id: 'team-dashboard',
      name: 'Dashboard',
      path: '/team/dashboard',
      icon: LayoutDashboard,
      iconBg: 'bg-[#FEF3C7] text-[#D97706]',
    },
    // Clients Directory (Controlled by clients_access RBAC)
    ...(permissions?.clients_access && permissions.clients_access !== 'NONE' ? [{
      id: 'clients',
      name: (permissions.clients_access === 'ALL_VIEW' || permissions.clients_access === 'ALL_MANAGE') ? 'Clients Directory' : 'Assigned Clients',
      path: '/workspace/clients',
      icon: Users,
      iconBg: 'bg-[#F3E8FF] text-[#7E22CE]',
    }] : []),
    // 1. Leads
    ...(permissions?.leads_access && permissions.leads_access !== 'NONE' ? [{
      id: 'leads',
      name: (permissions.leads_access === 'ALL_VIEW' || permissions.leads_access === 'ALL_EDIT' || permissions.leads_access === 'ALL_MANAGE') ? 'Leads & CRM' : 'Assigned Leads',
      path: '/leads',
      icon: Target,
      iconBg: 'bg-[#E6F4EA] text-[#137333]',
      subItems: [
        { name: 'All Leads', path: '/leads', icon: Target },
        { name: 'New Leads', path: '/leads?stage=new', icon: Sparkles },
        { name: 'Contacted', path: '/leads?stage=contacted', icon: PhoneCall },
        { name: 'Cool / Warm', path: '/leads?stage=cool', icon: Clock },
        { name: 'Hot Leads', path: '/leads?stage=hot', icon: Flame },
        { name: 'Booked', path: '/leads?stage=booked', icon: CheckCircle2 },
        { name: 'Lost Leads', path: '/leads?stage=lost', icon: UserX },
        { name: 'Archived', path: '/leads?stage=archived', icon: Archive },
      ]
    }] : []),
    // 2. Bookings & Team Manager
    ...(permissions?.team_manager_access && permissions.team_manager_access !== 'NONE' ? [{
      id: 'bookings',
      name: (permissions.team_manager_access === 'ALL_VIEW' || permissions.team_manager_access === 'ALL_MANAGE') ? 'Bookings & Events' : 'Assigned Shoots',
      path: (permissions.team_manager_access === 'ALL_VIEW' || permissions.team_manager_access === 'ALL_MANAGE') ? '/team-manager' : '/assigned-shoots',
      icon: Calendar,
      iconBg: 'bg-[#E0F2FE] text-[#0284C7]',
    }] : [{
      id: 'bookings',
      name: 'Assigned Shoots',
      path: '/assigned-shoots',
      icon: Calendar,
      iconBg: 'bg-[#E0F2FE] text-[#0284C7]',
    }]),
    // 3. Quotations
    ...(permissions?.quotations_access && permissions.quotations_access !== 'NONE' ? [{
      id: 'quotations',
      name: 'Quotations',
      path: '/quotations',
      icon: FileText,
      iconBg: 'bg-[#FEF3C7] text-[#B45309]',
    }] : []),
    // 4. Post-Production
    ...(permissions?.post_production_access !== 'NONE' ? [
      {
        id: 'post-production',
        name: 'Post-Production',
        path: '/workspace/post-production',
        icon: Film,
        iconBg: 'bg-[#FFE4E6] text-[#E11D48]',
      }
    ] : []),
    // 5. Finance & Payouts (Studio Owner's Full Finance if RBAC granted, otherwise Transparent My Finances & Payouts)
    ...(permissions?.finance_access && permissions.finance_access !== 'NONE' ? [{
      id: 'finance',
      name: 'Finance & Payments',
      path: '/workspace/finance',
      icon: IndianRupee,
      iconBg: 'bg-[#FEF9C3] text-[#A16207]',
    }] : [{
      id: 'team-finance',
      name: 'Finance & Payouts',
      path: '/team/finance',
      icon: IndianRupee,
      iconBg: 'bg-[#DCFCE7] text-[#15803D]',
    }]),
    // 6. Smart Attendance (STRICTLY only for In-House staff under this studio owner; hidden for freelancers)
    ...(((activeWorkspace?.primary_type && ['in_house', 'in-house', 'inhouse'].includes(activeWorkspace.primary_type.toLowerCase())) ||
        (Array.isArray(activeWorkspace?.member_types) && activeWorkspace.member_types.some(t => String(t).toLowerCase().includes('house'))) ||
        Boolean((activeWorkspace as any)?.has_attendance)) ? [{
      id: 'team-attendance',
      name: 'Smart Attendance',
      path: '/team/attendance',
      icon: Clock,
      iconBg: 'bg-[#DCFCE7] text-[#15803D]',
    }] : []),
    {
      id: 'support',
      name: 'Help & Support',
      path: '/support',
      icon: Headphones,
      iconBg: 'bg-[#CCFBF1] text-[#0F766E]',
    },
  ];

  const galleryMenuItems = [
    {
      id: 'gallery-events',
      name: 'My Events',
      path: '/workspace/gallery',
      icon: Camera,
      iconBg: 'bg-[#FEF3C7] text-[#D97706]',
    },
    {
      id: 'gallery-analytics',
      name: 'Analytics',
      path: '/workspace/gallery/analytics',
      icon: BarChart3,
      iconBg: 'bg-[#E0F2FE] text-[#0284C7]',
    },
    {
      id: 'gallery-settings',
      name: 'Gallery Settings',
      path: '/workspace/gallery/settings',
      icon: Settings,
      iconBg: 'bg-[#F4F4F5] text-[#52525B]',
    },
    {
      id: 'gallery-support',
      name: 'Help & Support',
      path: '/support',
      icon: Headphones,
      iconBg: 'bg-[#CCFBF1] text-[#0F766E]',
    },
  ];

  const menuItems = (isOwner && appMode === 'gallery') ? galleryMenuItems : baseMenuItems;

  if (isStandalonePage) {
    return <div className="min-h-screen w-full bg-[#FFFDF8] text-zinc-900">{children}</div>;
  }

  return (
    <div suppressHydrationWarning className="min-h-screen w-full bg-[#FAF9F6] text-zinc-900 flex flex-col font-sans selection:bg-amber-100">
      
      {/* ─────────────────────────────────────────────────────────────
          1. DESKTOP & TABLET FIXED LEFT SIDEBAR
      ───────────────────────────────────────────────────────────── */}
      <aside
        suppressHydrationWarning
        className={`fixed top-0 bottom-0 left-0 z-50 hidden lg:flex flex-col bg-white border-r border-[#EBE7DF] shadow-xs transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Top Brand Logo Header */}
        <div suppressHydrationWarning className={`h-16 border-b border-[#F0ECE4] flex items-center shrink-0 ${collapsed ? 'justify-center px-1' : 'justify-between px-4'}`}>
          {!collapsed ? (
            <>
              <Link
                href={isOwner ? "/workspace" : formatPathWithStudio("/assigned-shoots")}
                prefetch={true}
                onMouseEnter={() => router.prefetch(isOwner ? '/workspace' : formatPathWithStudio('/assigned-shoots'))}
                className="flex items-center gap-3 overflow-hidden group"
              >
                <StudioCoreBrandIcon className="w-9 h-9" isCollapsed={false} />
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1">
                    <span className="text-[17px] font-black text-zinc-900 tracking-tight leading-none">StudioCore</span>
                    <span className="text-amber-600 font-black text-xs">✦</span>
                  </div>
                  <p className="text-[10px] font-bold text-zinc-400 tracking-tight truncate mt-0.5 max-w-[130px]">
                    {workspaceName || 'All-in-One Studio'}
                  </p>
                </div>
              </Link>

              <button
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition shrink-0 cursor-pointer"
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setCollapsed(false)}
              className="flex items-center justify-center w-12 h-12 rounded-2xl hover:bg-amber-50/80 transition-all cursor-pointer relative group"
              title="Expand Sidebar (Click to Open)"
            >
              <StudioCoreBrandIcon className="w-10 h-10 shadow-sm" isCollapsed={true} />
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white border border-[#EBE7DF] text-zinc-500 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                <ChevronRight className="w-2.5 h-2.5" />
              </div>
            </button>
          )}
        </div>

        {/* Workspace Switcher Bar */}
        <div className="px-3 pt-3 pb-1 shrink-0">
          <WorkspaceSwitcher isCollapsed={collapsed} />
        </div>

        {/* Animated Round Capsule Mode Switcher (CRM <-> Gallery) - STRICTLY for Studio Owner Only */}
        {isOwner && (!collapsed ? (
          <div className="px-3 py-2 shrink-0">
            <div className="relative p-1 rounded-full bg-[#F3EFE7] border border-[#E4DEC3] flex items-center shadow-inner">
              <button
                type="button"
                onClick={() => handleSwitchAppMode('crm')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-full text-xs font-black transition-colors duration-200 cursor-pointer select-none ${
                  appMode === 'crm' ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {appMode === 'crm' && (
                  <motion.div
                    layoutId="desktopModePill"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    className="absolute inset-0 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] border border-[#E7E2D8]"
                  />
                )}
                <Briefcase className={`relative z-10 w-3.5 h-3.5 ${appMode === 'crm' ? 'text-amber-600' : 'text-zinc-400'}`} />
                <span className="relative z-10">CRM</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchAppMode('gallery')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-full text-xs font-black transition-colors duration-200 cursor-pointer select-none ${
                  appMode === 'gallery' ? 'text-amber-950' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {appMode === 'gallery' && (
                  <motion.div
                    layoutId="desktopModePill"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    className="absolute inset-0 bg-white rounded-full shadow-[0_2px_8px_rgba(217,119,6,0.15),0_1px_2px_rgba(0,0,0,0.04)] border border-amber-300/80"
                  />
                )}
                <Images className={`relative z-10 w-3.5 h-3.5 ${appMode === 'gallery' ? 'text-amber-600' : 'text-zinc-400'}`} />
                <span className="relative z-10">Gallery</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="px-2 py-2 shrink-0 flex justify-center">
            <button
              type="button"
              onClick={() => handleSwitchAppMode(appMode === 'crm' ? 'gallery' : 'crm')}
              className={`w-11 h-11 rounded-full flex flex-col items-center justify-center transition-all duration-200 cursor-pointer border shadow-2xs ${
                appMode === 'gallery'
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-zinc-50 border-[#E7E2D8] text-zinc-700 hover:bg-white'
              }`}
              title={`Switch to ${appMode === 'crm' ? 'Gallery' : 'CRM'}`}
            >
              {appMode === 'gallery' ? (
                <Images className="w-4 h-4 text-amber-600" />
              ) : (
                <Briefcase className="w-4 h-4 text-zinc-700" />
              )}
              <span className="text-[8px] font-black tracking-tight mt-0.5">
                {appMode === 'crm' ? 'CRM' : 'GAL'}
              </span>
            </button>
          </div>
        ))}

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1 menu-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isDashboard = item.id === 'dashboard';
            const isLeads = item.id === 'leads';
            
            let isActive = false;
            if (appMode === 'gallery') {
              if (item.id === 'gallery-events') {
                isActive = pathname === '/workspace/gallery' || (pathname.startsWith('/workspace/gallery/') && !pathname.includes('/analytics') && !pathname.includes('/settings'));
              } else if (item.id === 'gallery-analytics') {
                isActive = pathname.startsWith('/workspace/gallery/analytics');
              } else if (item.id === 'gallery-settings') {
                isActive = pathname.startsWith('/workspace/gallery/settings');
              } else {
                isActive = pathname === item.path;
              }
            } else {
              isActive = isDashboard
                ? pathname === '/workspace'
                : isLeads
                  ? pathname.startsWith('/leads')
                  : item.id === 'bookings'
                    ? (pathname === '/team-manager' || pathname.startsWith('/team-manager') || pathname === '/assigned-shoots' || pathname.startsWith('/assigned-shoots'))
                    : pathname === item.path || (item.path !== '/workspace' && pathname.startsWith(item.path));
            }

            return (
              <div key={item.id} className="relative group">
                <Link
                  href={formatPathWithStudio(item.path)}
                  prefetch={true}
                  suppressHydrationWarning
                  onMouseEnter={() => router.prefetch(formatPathWithStudio(item.path))}
                  onPointerDown={() => router.prefetch(formatPathWithStudio(item.path))}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#FDF6EC] text-[#92400E] border border-[#F5E6CC] shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-[#F9F8F5]'
                  } ${collapsed ? 'justify-center px-0 py-2.5' : ''}`}
                  title={collapsed ? item.name : undefined}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${item.iconBg}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  {!collapsed && (
                    <div className="flex items-center justify-between flex-1 min-w-0">
                      <span className="truncate">{item.name}</span>
                      {isLeads && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setLeadsSubmenuOpen(prev => !prev);
                          }}
                          className="p-1 hover:bg-black/5 rounded-md text-zinc-400"
                        >
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${leadsSubmenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>
                  )}
                </Link>

                {/* Leads Nested Submenu */}
                {isLeads && !collapsed && leadsSubmenuOpen && (
                  <div className="pl-9 pr-2 py-1 space-y-0.5 mt-0.5 border-l-2 border-amber-200 ml-4.5">
                    {(item as any).subItems?.map((sub: any) => {
                      const isSubActive = checkIsSubActive(sub.path);
                      return (
                        <Link
                          key={sub.name}
                          href={formatPathWithStudio(sub.path)}
                          prefetch={true}
                          suppressHydrationWarning
                          onMouseEnter={() => router.prefetch(formatPathWithStudio(sub.path))}
                          onPointerDown={() => router.prefetch(formatPathWithStudio(sub.path))}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                            isSubActive
                              ? 'bg-amber-100/70 text-amber-900 font-bold'
                              : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isSubActive ? 'bg-amber-600' : 'bg-zinc-300'}`} />
                          <span>{sub.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom Profile & Studio Name Card */}
        <div className="p-3 border-t border-[#F0ECE4] shrink-0 bg-[#FCFBF9]">
          {!collapsed ? (
            <div className="space-y-2">
              <div 
                onClick={() => setShowProfileModal(true)}
                className="w-full flex items-center justify-between p-2 rounded-2xl bg-zinc-50/80 hover:bg-amber-50/60 border border-zinc-200/80 transition group cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative">
                    {userAvatarUrl ? (
                      <img src={userAvatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-amber-400" />
                    ) : (
                      <div suppressHydrationWarning className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 via-amber-500 to-[#F36F21] text-white font-black text-xs flex items-center justify-center shadow-xs">
                        {mounted ? (workspaceName || userName || 'SC').slice(0, 2).toUpperCase() : 'SC'}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-900 truncate leading-tight group-hover:text-amber-800 transition">
                      {userName || workspaceName || 'Studio Account'}
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate leading-tight mt-0.5">
                      {userEmail}
                    </p>
                  </div>
                </div>
                <div className="p-1 rounded-lg text-zinc-400 group-hover:text-amber-700 transition">
                  <Settings className="w-3.5 h-3.5" />
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl text-[11px] font-bold text-zinc-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setShowProfileModal(true)}
                className="w-9 h-9 rounded-full relative cursor-pointer group"
                title="Edit Studio Profile"
              >
                {userAvatarUrl ? (
                  <img src={userAvatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-400 via-amber-500 to-[#F36F21] text-white font-black text-xs flex items-center justify-center">
                    {(workspaceName || userName || 'SC').slice(0, 2).toUpperCase()}
                  </div>
                )}
              </button>

              <button
                onClick={handleSignOut}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN CONTENT WRAPPER
      ───────────────────────────────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          collapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Mobile-Only Minimal Header */}
        <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EBE7DF] h-14 flex items-center justify-between px-4 shrink-0 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="p-1.5 rounded-xl text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
              aria-label="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5">
              <StudioCoreBrandIcon className="w-7 h-7" />
              <span className="text-sm font-black text-zinc-900 tracking-tight">{workspaceName || 'StudioCore'}</span>
            </div>
          </div>

          <div 
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2 cursor-pointer"
          >
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt="Avatar" className="w-7 h-7 rounded-full object-cover border border-amber-400" />
            ) : (
              <div suppressHydrationWarning className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 via-amber-500 to-[#F36F21] text-white font-black text-[10px] flex items-center justify-center">
                {mounted ? (workspaceName || userName || 'SC').slice(0, 2).toUpperCase() : 'SC'}
              </div>
            )}
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MOBILE SLIDING DRAWER
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawerOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 260 }}
              className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between z-10"
            >
              <div className="h-16 px-4 border-b border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StudioCoreBrandIcon className="w-8 h-8" />
                  <div className="flex items-center gap-1">
                    <span className="text-base font-black text-zinc-900">StudioCore</span>
                    <span className="text-amber-600 font-black text-xs">✦</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-3 pt-3 pb-1 shrink-0">
                <WorkspaceSwitcher isCollapsed={false} />
              </div>

              {/* Mobile Animated Capsule Mode Switcher - STRICTLY for Studio Owner Only */}
              {isOwner && (
                <div className="px-3 py-2 shrink-0">
                  <div className="relative p-1 rounded-full bg-[#F3EFE7] border border-[#E4DEC3] flex items-center shadow-inner">
                    <button
                      type="button"
                      onClick={() => {
                        handleSwitchAppMode('crm');
                        setMobileDrawerOpen(false);
                      }}
                      className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-full text-xs font-black transition-colors duration-200 cursor-pointer select-none ${
                        appMode === 'crm' ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      {appMode === 'crm' && (
                        <motion.div
                          layoutId="mobileModePill"
                          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                          className="absolute inset-0 bg-white rounded-full shadow-xs border border-[#E7E2D8]"
                        />
                      )}
                      <Briefcase className={`relative z-10 w-3.5 h-3.5 ${appMode === 'crm' ? 'text-amber-600' : 'text-zinc-400'}`} />
                      <span className="relative z-10">CRM</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleSwitchAppMode('gallery');
                        setMobileDrawerOpen(false);
                      }}
                      className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-full text-xs font-black transition-colors duration-200 cursor-pointer select-none ${
                        appMode === 'gallery' ? 'text-amber-950' : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      {appMode === 'gallery' && (
                        <motion.div
                          layoutId="mobileModePill"
                          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                          className="absolute inset-0 bg-white rounded-full shadow-xs border border-amber-300/80"
                        />
                      )}
                      <Images className={`relative z-10 w-3.5 h-3.5 ${appMode === 'gallery' ? 'text-amber-600' : 'text-zinc-400'}`} />
                      <span className="relative z-10">Gallery</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1 menu-scrollbar">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  let isActive = false;
                  if (appMode === 'gallery') {
                    if (item.id === 'gallery-events') {
                      isActive = pathname === '/workspace/gallery' || (pathname.startsWith('/workspace/gallery/') && !pathname.includes('/analytics') && !pathname.includes('/settings'));
                    } else if (item.id === 'gallery-analytics') {
                      isActive = pathname.startsWith('/workspace/gallery/analytics');
                    } else if (item.id === 'gallery-settings') {
                      isActive = pathname.startsWith('/workspace/gallery/settings');
                    } else {
                      isActive = pathname === item.path;
                    }
                  } else {
                    isActive = item.id === 'bookings'
                      ? (pathname === '/team-manager' || pathname.startsWith('/team-manager') || pathname === '/assigned-shoots' || pathname.startsWith('/assigned-shoots'))
                      : pathname === item.path || (item.path !== '/workspace' && pathname.startsWith(item.path));
                  }

                  return (
                    <div key={item.id}>
                      <Link
                        href={formatPathWithStudio(item.path)}
                        prefetch={true}
                        suppressHydrationWarning
                        onMouseEnter={() => router.prefetch(formatPathWithStudio(item.path))}
                        onPointerDown={() => router.prefetch(formatPathWithStudio(item.path))}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition ${
                          isActive
                            ? 'bg-[#FDF6EC] text-[#92400E] border border-[#F5E6CC]'
                            : 'text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${item.iconBg}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span>{item.name}</span>
                      </Link>

                      {item.id === 'leads' && (item as any).subItems && pathname.startsWith('/leads') && (
                        <div className="pl-9 pr-2 py-1 space-y-1 mt-0.5 border-l-2 border-amber-200 ml-4.5">
                          {(item as any).subItems.map((sub: any) => {
                            const isSubActive = checkIsSubActive(sub.path);
                            return (
                              <Link
                                key={sub.name}
                                href={formatPathWithStudio(sub.path)}
                                prefetch={true}
                                onClick={() => setMobileDrawerOpen(false)}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                                  isSubActive
                                    ? 'bg-amber-100/70 text-amber-900 font-bold'
                                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/60'
                                }`}
                              >
                                <sub.icon className="w-3 h-3" />
                                <span>{sub.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-3 border-t border-zinc-100 bg-zinc-50/50">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Studio Profile Edit Modal */}
      <StudioProfileEditModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {/* Onboarding Celebration Modal */}
      <OnboardingCelebrationModal
        isOpen={showOnboardingCelebration}
        onClose={() => setShowOnboardingCelebration(false)}
      />

      {/* Mandatory Google Onboarding Modal (Phone SMS OTP) */}
      <MandatoryGoogleOnboardingModal
        isOpen={showGoogleOnboarding}
        userEmail={userEmail}
        userFullName={userName}
        initialRole={googleOnboardingRole}
        onComplete={handleGoogleOnboardingComplete}
      />
    </div>
  );
}
