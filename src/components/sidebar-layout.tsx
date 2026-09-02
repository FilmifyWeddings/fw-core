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
  ArrowUpRight, Bell, ShieldCheck, Crown, Briefcase, HardDrive, Camera
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import StudioProfileEditModal from '@/components/workspace/StudioProfileEditModal';
import OnboardingCelebrationModal from '@/components/workspace/OnboardingCelebrationModal';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';
import { useWorkspace } from '@/lib/context/BhamstraContext';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

// Crisp, Modern StudioCore SC Brand Emblem (Never cut-off, always prominent)
export const StudioCoreBrandIcon = ({ className = "w-8 h-8", isCollapsed = false }: { className?: string; isCollapsed?: boolean }) => (
  <div className={`${className} rounded-xl bg-gradient-to-br from-[#D9822B] via-[#C8751F] to-[#A05A12] text-white flex items-center justify-center font-black tracking-wider shadow-sm border border-[#F5C78E]/40 shrink-0 select-none relative overflow-hidden group`}>
    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent opacity-80 pointer-events-none" />
    <span className="relative z-10 text-[13px] font-black tracking-tight drop-shadow-xs">SC</span>
  </div>
);

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isOwner, userRole, permissions, availableWorkspaces } = useWorkspace();
  const hasFetchedRef = useRef(false);
  const stageParam = searchParams?.get('stage') || searchParams?.get('filter') || searchParams?.get('view') || '';

  const checkIsSubActive = (subPath: string) => {
    if (subPath === '/leads') {
      return pathname === '/leads' && !stageParam;
    }
    if (subPath.includes('stage=lost')) {
      return pathname.startsWith('/leads') && stageParam === 'lost';
    }
    if (subPath.includes('stage=archived')) {
      return pathname.startsWith('/leads') && (stageParam === 'archived' || stageParam === 'archive');
    }
    return pathname === subPath;
  };

  const [collapsed, setCollapsed] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('user@studiocore.in');
  const [userName, setUserName] = useState<string>('Studio Owner');
  const [workspaceName, setWorkspaceName] = useState<string>('StudioCore');
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>('');
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showOnboardingCelebration, setShowOnboardingCelebration] = useState<boolean>(false);
  const [leadsSubmenuOpen, setLeadsSubmenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [profilesFetchErrorCount, setProfilesFetchErrorCount] = useState(0);

  const fetchUserProfileDefensive = useCallback(async (targetId: string) => {
    if (!targetId || profilesFetchErrorCount > 3) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', targetId)
        .maybeSingle();

      if (error) {
        console.error("Safe caught profile fetch error:", error.message);
        setProfilesFetchErrorCount(prev => prev + 1);
        return;
      }

      if (data && JSON.stringify(data) !== JSON.stringify(profileData)) {
        setProfileData(data);
        if (data.full_name) setUserName(data.full_name);
      }
    } catch (err) {
      console.warn("Infinite loop defense triggered in profile fetch");
    }
  }, [profilesFetchErrorCount, profileData]);

  // Load user profile & collapsed preference
  const fetchUserProfile = useCallback(async (force = false) => {
    if (!force && hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    // 1. Initial fast hydration from localStorage
    if (typeof window !== 'undefined') {
      const cachedStudioName = localStorage.getItem('sc_studio_name');
      const cachedAvatar = localStorage.getItem('sc_avatar_url');
      const cachedLogo = localStorage.getItem('sc_logo_url');
      const cachedUserName = localStorage.getItem('sc_user_name');

      if (cachedStudioName) setWorkspaceName(cachedStudioName);
      if (cachedAvatar || cachedLogo) setUserAvatarUrl(cachedAvatar || cachedLogo || '');
      if (cachedUserName) setUserName(cachedUserName);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email || 'user@studiocore.in');
        setUserId(session.user.id);

        // Fetch authoritative profile from API (bypassing client RLS)
        const token = session.access_token;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
          const res = await fetch('/api/user/profile-setup', { headers });
          if (res.ok) {
            const json = await res.json();
            if (json?.profile) {
              const p = json.profile;
              const finalStudio = p.studioName || session.user.user_metadata?.workspace_name || 'My Studio';
              const finalName = p.fullName || session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Studio Owner';
              const finalAvatar = p.avatarUrl || p.logoUrl || session.user.user_metadata?.avatar_url || '';

              setWorkspaceName(finalStudio);
              setUserName(finalName);
              setUserAvatarUrl(finalAvatar);

              if (typeof window !== 'undefined') {
                localStorage.setItem('sc_studio_name', finalStudio);
                localStorage.setItem('sc_user_name', finalName);
                if (finalAvatar) localStorage.setItem('sc_avatar_url', finalAvatar);
              }
              return;
            }
          }
        } catch (_) {}

        // Direct Supabase fallback with defensive safe column selection
        await fetchUserProfileDefensive(session.user.id);

        const studio = session.user.user_metadata?.workspace_name || 'My Studio';
        setWorkspaceName(studio);
      }
    } catch (err) {
      console.warn('Error loading user profile in sidebar handled safely:', err);
    }
  }, [fetchUserProfileDefensive]);

  useEffect(() => {
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

    fetchUserProfile();

    // Listen for custom profile update events
    const handleProfileUpdate = (e: any) => {
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
  }, [fetchUserProfile]);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, [collapsed]);

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
      await supabase.auth.signOut();
      router.push('/login');
    }
  };

  const partnerPortalItem = {
    id: 'partner-portal',
    name: 'Partner Portal',
    path: '/workspace/partner-portal',
    icon: Briefcase,
    iconBg: 'bg-[#EEF2FF] text-[#4F46E5]',
  };

  const hasPartnerWorkspaces = availableWorkspaces?.some(w => !w.isOwner);

  const baseMenuItems = isOwner ? [
    {
      id: 'dashboard',
      name: 'Workspace Home',
      path: '/workspace',
      icon: LayoutDashboard,
      iconBg: 'bg-[#E0F2FE] text-[#0369A1]',
    },
    ...(hasPartnerWorkspaces ? [partnerPortalItem] : []),
    {
      id: 'leads',
      name: 'Leads & CRM',
      path: '/leads',
      icon: Target,
      iconBg: 'bg-[#E6F4EA] text-[#137333]',
      subItems: [
        { name: 'All Leads', path: '/leads', icon: Target },
        { name: 'Qualified', path: '/leads?stage=qualified', icon: UserCheck },
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
    partnerPortalItem,
    // 1. Leads
    ...(permissions?.leads_access && permissions.leads_access !== 'NONE' ? [{
      id: 'leads',
      name: (permissions.leads_access === 'ALL_VIEW' || permissions.leads_access === 'ALL_EDIT') ? 'Leads & CRM' : 'Assigned Leads',
      path: '/leads',
      icon: Target,
      iconBg: 'bg-[#E6F4EA] text-[#137333]',
    }] : []),
    // 2. Bookings & Team Manager
    ...(permissions?.team_manager_access && permissions.team_manager_access !== 'NONE' ? [{
      id: 'bookings',
      name: (permissions.team_manager_access === 'ALL_VIEW' || permissions.team_manager_access === 'ALL_MANAGE') ? 'Bookings & Events' : 'Assigned Shoots',
      path: '/team-manager',
      icon: Calendar,
      iconBg: 'bg-[#E0F2FE] text-[#0284C7]',
    }] : []),
    // 3. Quotations
    ...(permissions?.quotations_access && permissions.quotations_access !== 'NONE' ? [{
      id: 'quotations',
      name: 'Quotations',
      path: '/quotations',
      icon: FileText,
      iconBg: 'bg-[#FEF3C7] text-[#B45309]',
    }] : []),
    // 4. Post-Production
    ...(permissions?.post_production_access && permissions.post_production_access !== 'NONE' ? [{
      id: 'post-production',
      name: 'Post-Production',
      path: '/workspace/post-production',
      icon: Film,
      iconBg: 'bg-[#FFE4E6] text-[#E11D48]',
    }] : []),
    // 5. Team & Partners (Only for full manage)
    ...(permissions?.team_manager_access === 'ALL_MANAGE' || permissions?.team_manager_access === 'MANAGE_ALL' ? [{
      id: 'team',
      name: 'Team & Partners',
      path: '/workspace/team',
      icon: Users2,
      iconBg: 'bg-[#EDE9FE] text-[#6366F1]',
    }] : []),
    // 6. Finance
    ...(permissions?.finance_access && permissions.finance_access !== 'NONE' ? [{
      id: 'finance',
      name: 'Finance & Payments',
      path: '/workspace/finance',
      icon: IndianRupee,
      iconBg: 'bg-[#FEF9C3] text-[#A16207]',
    }] : []),
    {
      id: 'support',
      name: 'Help & Support',
      path: '/support',
      icon: Headphones,
      iconBg: 'bg-[#CCFBF1] text-[#0F766E]',
    },
  ];

  const menuItems = baseMenuItems;

  const isStandalonePage = 
    pathname === '/' ||
    pathname === '/login' ||
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
    pathname.startsWith('/attendance/') ||
    pathname.startsWith('/workspace/quotations/builder') ||
    pathname.startsWith('/admin/workspace/quotations/builder');

  if (isStandalonePage) {
    return <div className="min-h-screen w-full bg-[#FFFDF8] text-zinc-900">{children}</div>;
  }

  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] text-zinc-900 flex flex-col font-sans selection:bg-amber-100">
      
      {/* ─────────────────────────────────────────────────────────────
          1. DESKTOP & TABLET FIXED LEFT SIDEBAR
      ───────────────────────────────────────────────────────────── */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 hidden lg:flex flex-col bg-white border-r border-[#EBE7DF] shadow-xs transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Top Brand Logo Header */}
        <div className={`h-16 border-b border-[#F0ECE4] flex items-center shrink-0 ${collapsed ? 'justify-center px-1' : 'justify-between px-4'}`}>
          {!collapsed ? (
            <>
              <Link href="/workspace" className="flex items-center gap-3 overflow-hidden group">
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

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1 scrollbar-thin scrollbar-thumb-zinc-200">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isDashboard = item.id === 'dashboard';
            const isLeads = item.id === 'leads';
            
            const isActive = isDashboard
              ? pathname === '/workspace'
              : isLeads
                ? pathname.startsWith('/leads')
                : pathname === item.path || (item.path !== '/workspace' && pathname.startsWith(item.path));

            return (
              <div key={item.id} className="relative group">
                <Link
                  href={item.path}
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
                          href={sub.path}
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
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 via-amber-500 to-[#F36F21] text-white font-black text-xs flex items-center justify-center shadow-xs">
                        {(workspaceName || userName || 'SC').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-900 truncate leading-tight group-hover:text-amber-800 transition">
                      {userName || 'Studio Owner'}
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
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 via-amber-500 to-[#F36F21] text-white font-black text-[10px] flex items-center justify-center">
                {(workspaceName || userName || 'SC').slice(0, 2).toUpperCase()}
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
              <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path || (item.path !== '/workspace' && pathname.startsWith(item.path));

                  return (
                    <div key={item.id}>
                      <Link
                        href={item.path}
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
    </div>
  );
}
