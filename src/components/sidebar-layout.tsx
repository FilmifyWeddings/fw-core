'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Target, Users, FileText, Calendar, Users2, 
  Film, IndianRupee, Clock, Layers, BarChart3, Settings, 
  Headphones, LogOut, ChevronDown, ChevronRight, ChevronLeft, 
  Menu, X, Sparkles, UserCheck, Archive, UserX, CheckCircle2, 
  ArrowUpRight, Search, Bell, MoreVertical, ShieldCheck, Crown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import StudioProfileEditModal from '@/components/workspace/StudioProfileEditModal';
import OnboardingCelebrationModal from '@/components/workspace/OnboardingCelebrationModal';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  const [userName, setUserName] = useState<string>('Sushant Sharma');
  const [workspaceName, setWorkspaceName] = useState<string>('StudioCore Workspace');
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>('');
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showOnboardingCelebration, setShowOnboardingCelebration] = useState<boolean>(false);
  const [leadsSubmenuOpen, setLeadsSubmenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load user profile & collapsed preference
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar_collapsed');
    if (savedCollapsed !== null) {
      setCollapsed(savedCollapsed === 'true');
    } else {
      setCollapsed(false); // Expanded by default on first visit
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

    const fetchUserProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserEmail(session.user.email || 'user@studiocore.in');
          setUserId(session.user.id);

          const { data: profile } = await supabase
            .from('profiles')
            .select('workspace_name, avatar_url, logo_url, full_name')
            .eq('id', session.user.id)
            .maybeSingle();

          const name = profile?.full_name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Sushant Sharma';
          setUserName(name);

          if (profile?.avatar_url) {
            setUserAvatarUrl(profile.avatar_url);
          } else if (session.user.user_metadata?.avatar_url) {
            setUserAvatarUrl(session.user.user_metadata.avatar_url);
          }

          if (profile?.workspace_name) {
            setWorkspaceName(profile.workspace_name);
          } else if (session.user.user_metadata?.workspace_name) {
            setWorkspaceName(session.user.user_metadata.workspace_name);
          } else {
            const defaultName = session.user.email ? `${session.user.email.split('@')[0]}'s Studio` : 'My StudioCore';
            setWorkspaceName(defaultName);
          }
        }
      } catch (err) {
        console.error('Error loading user profile in sidebar:', err);
      }
    };

    fetchUserProfile();
  }, [searchParams]);

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

  // ─────────────────────────────────────────────────────────────
  // NAVIGATION MENU ITEMS IN EXACT REFERENCE SEQUENCE
  // ─────────────────────────────────────────────────────────────
  const menuItems = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      path: '/workspace',
      icon: LayoutDashboard,
      iconBg: 'bg-[#FEF3C7] text-[#D97706]',
    },
    {
      id: 'leads',
      name: 'Leads & CRM',
      path: '/leads',
      icon: Target,
      iconBg: 'bg-[#E6F4EA] text-[#137333]',
      hasSubmenu: true,
      subItems: [
        { name: 'All Active Leads', path: '/leads', icon: Layers },
        { name: 'Lost Leads', path: '/leads?stage=lost', icon: UserX },
        { name: 'Archived Leads', path: '/leads?stage=archived', icon: Archive },
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
      id: 'quotations',
      name: 'Quotations',
      path: '/quotations',
      icon: FileText,
      iconBg: 'bg-[#FEF3C7] text-[#B45309]',
    },
    {
      id: 'bookings',
      name: 'Bookings',
      path: '/team-manager',
      icon: Calendar,
      iconBg: 'bg-[#E0F2FE] text-[#0284C7]',
    },
    {
      id: 'team-manager',
      name: 'Team Manager',
      path: '/team-manager',
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
      name: 'Attendance',
      path: '/workspace/attendance',
      icon: Clock,
      iconBg: 'bg-[#DCFCE7] text-[#15803D]',
    },
    {
      id: 'integrations',
      name: 'Integrations',
      path: '/workspace/integrations',
      icon: Layers,
      iconBg: 'bg-[#E0F2FE] text-[#0369A1]',
    },
    {
      id: 'reports',
      name: 'Reports',
      path: '/workspace/finance',
      icon: BarChart3,
      iconBg: 'bg-[#F1F5F9] text-[#475569]',
    },
    {
      id: 'settings',
      name: 'Settings',
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
  ];

  const isStandalonePage = 
    pathname === '/login' ||
    pathname.startsWith('/pdf-preview') ||
    pathname.startsWith('/p/quotation') ||
    pathname.startsWith('/attendance/') ||
    pathname.startsWith('/workspace/quotations/builder') ||
    pathname.startsWith('/admin/workspace/quotations/builder');

  if (isStandalonePage) {
    return <div className="min-h-screen w-full bg-[#FAF9F6] text-zinc-900">{children}</div>;
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
        <div className="h-16 px-4 border-b border-[#F0ECE4] flex items-center justify-between shrink-0">
          <Link href="/workspace" className="flex items-center gap-2.5 overflow-hidden group">
            {!collapsed ? (
              <div className="overflow-hidden">
                <div className="flex items-center gap-1">
                  <span className="text-lg font-black text-zinc-900 tracking-tight">StudioCore</span>
                  <span className="text-amber-600 font-black text-sm">✦</span>
                </div>
                <p className="text-[10px] font-bold text-zinc-400 tracking-tight">
                  All-in-One Studio Management
                </p>
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                SC
              </div>
            )}
          </Link>

          <button
            onClick={() => setCollapsed(prev => !prev)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition shrink-0"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1 scrollbar-thin scrollbar-thumb-zinc-200">
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
                      ? 'bg-[#FDF6EC] text-[#92400E] font-extrabold border border-[#F5E6CC] shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 border border-transparent'
                  } ${collapsed ? 'justify-center px-2' : ''}`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${item.iconBg} ${isActive ? 'text-[#B45309]' : ''}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  {!collapsed && (
                    <span className="truncate flex-1 text-left tracking-tight">
                      {item.name}
                    </span>
                  )}

                  {!collapsed && isLeads && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLeadsSubmenuOpen(prev => !prev);
                      }}
                      className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/50 transition"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${leadsSubmenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </Link>

                {/* Submenu for Leads */}
                {!collapsed && isLeads && leadsSubmenuOpen && (
                  <div className="pl-9 pr-2 py-1 space-y-1">
                    {item.subItems?.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive = checkIsSubActive(sub.path);

                      return (
                        <Link
                          key={sub.name}
                          href={sub.path}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                            isSubActive
                              ? 'bg-amber-500/15 text-amber-950 font-extrabold border border-amber-300'
                              : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                          }`}
                        >
                          <SubIcon className={`w-3 h-3 ${isSubActive ? 'text-amber-600' : 'text-zinc-400'}`} />
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

        {/* "Grow Your Studio" Card */}
        {!collapsed && (
          <div className="p-3 mx-3 mb-2 rounded-2xl bg-gradient-to-br from-[#FFFBF2] to-[#FFF5E6] border border-[#FDE8CA] space-y-2">
            <div className="flex items-center gap-2 text-zinc-900 font-extrabold text-xs">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Grow Your Studio</span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-tight">
              Discover tools and insights that help you grow faster.
            </p>
            <Link
              href="/workspace/settings"
              className="block w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#D9822B] to-[#C2721C] text-white font-extrabold text-[11px] text-center shadow-xs hover:brightness-105 transition"
            >
              Upgrade Now
            </Link>
          </div>
        )}

        {/* Bottom User Profile Card */}
        <div className="p-3 border-t border-[#F0ECE4] shrink-0 bg-[#FAF9F6]">
          <div
            onClick={() => setShowProfileModal(true)}
            className={`flex items-center rounded-xl p-2 cursor-pointer hover:bg-white transition ${
              collapsed ? 'justify-center' : 'justify-between border border-zinc-200/60 shadow-2xs'
            }`}
            title="Studio Profile & Settings"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full object-cover border border-amber-400 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-orange-400 text-zinc-900 font-black text-xs flex items-center justify-center shrink-0">
                  {userName.slice(0, 2).toUpperCase()}
                </div>
              )}

              {!collapsed && (
                <div className="overflow-hidden text-left">
                  <h4 className="text-xs font-black text-zinc-900 truncate max-w-[110px]">
                    {userName}
                  </h4>
                  <p className="text-[10px] text-zinc-400 font-medium truncate">
                    Studio Owner
                  </p>
                </div>
              )}
            </div>

            {!collapsed && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSignOut();
                }}
                className="p-1 text-zinc-400 hover:text-rose-600 transition"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN CONTENT WRAPPER (HEADER + CONTENT) WITH PERFECT ALIGNMENT
      ───────────────────────────────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          collapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#EBE7DF] h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0">
          
          {/* Left Side: Mobile Drawer / Collapse Toggle + Search Bar */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-lg">
            <button
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setMobileDrawerOpen(true);
                } else {
                  setCollapsed(prev => !prev);
                }
              }}
              className="p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition"
              aria-label="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search Box */}
            <div className="relative flex-1">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#F4F2EC] hover:bg-[#EFECE5] border border-[#E5E1D8] text-xs transition-colors">
                <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search anything..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-hidden text-xs text-zinc-800 placeholder:text-zinc-400 w-full"
                />
                <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-white text-zinc-400 text-[10px] font-mono font-bold border border-zinc-200 shadow-2xs">
                  ⌘K
                </kbd>
              </div>
            </div>
          </div>

          {/* Right Side: Notifications, Calendar & Profile */}
          <div className="flex items-center gap-3 sm:gap-4">
            
            {/* Notifications Bell */}
            <button
              type="button"
              className="relative p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                3
              </span>
            </button>

            {/* Calendar Shortcut */}
            <Link
              href="/team-manager"
              className="p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition"
              title="Calendar & Schedules"
            >
              <Calendar className="w-4 h-4" />
            </Link>

            {/* Topbar User Profile */}
            <div
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-zinc-200 cursor-pointer group"
            >
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full object-cover border border-amber-400 shadow-2xs group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-orange-400 text-zinc-900 font-black text-xs flex items-center justify-center shadow-2xs">
                  {userName.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="hidden sm:block text-left">
                <h4 className="text-xs font-black text-zinc-900 group-hover:text-amber-700 transition-colors leading-tight">
                  {userName}
                </h4>
                <p className="text-[10px] text-zinc-400 font-medium">
                  Studio Owner
                </p>
              </div>
            </div>

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
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black text-zinc-900">StudioCore</span>
                  <span className="text-amber-600 font-black">✦</span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
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

              <div className="p-4 border-t border-zinc-100 bg-zinc-50">
                <div className="flex items-center justify-between">
                  <div
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      setShowProfileModal(true);
                    }}
                    className="flex items-center gap-2.5 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-400 text-zinc-900 font-black text-xs flex items-center justify-center">
                      {userName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-black text-zinc-900">{userName}</p>
                      <p className="text-[10px] text-zinc-400">Studio Owner</p>
                    </div>
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="p-2 text-zinc-400 hover:text-rose-600 transition"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile & Onboarding Modals */}
      <StudioProfileEditModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onProfileSaved={(p) => {
          if (p.studioName) setWorkspaceName(p.studioName);
          if (p.avatarUrl !== undefined) setUserAvatarUrl(p.avatarUrl);
        }}
      />

      <OnboardingCelebrationModal
        isOpen={showOnboardingCelebration}
        onClose={() => setShowOnboardingCelebration(false)}
        userName={userName}
        initialStudioName={workspaceName}
        userEmail={userEmail}
        userId={userId}
        onProfileUpdated={(p) => {
          if (p.studioName) setWorkspaceName(p.studioName);
          if (p.avatarUrl !== undefined) setUserAvatarUrl(p.avatarUrl);
        }}
      />

    </div>
  );
}
