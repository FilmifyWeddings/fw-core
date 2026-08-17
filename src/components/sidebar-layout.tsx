'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, Users, FileText, Calendar, Film, DollarSign, 
  Clock, Plug, Settings, HelpCircle, LogOut, ChevronDown, 
  ChevronRight, ChevronLeft, Menu, X, Sparkles, UserCheck, 
  Layers, Archive, UserX, CheckCircle2, ArrowUpRight
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
  const [userName, setUserName] = useState<string>('Studio Owner');
  const [workspaceName, setWorkspaceName] = useState<string>('StudioCore Workspace');
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>('');
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showOnboardingCelebration, setShowOnboardingCelebration] = useState<boolean>(false);
  const [leadsSubmenuOpen, setLeadsSubmenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [userId, setUserId] = useState<string>('');

  // Load collapsed state & user profile
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar_collapsed');
    if (savedCollapsed) {
      setCollapsed(savedCollapsed === 'true');
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

          const name = profile?.full_name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Studio Owner';
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

          // Check if onboarding celebration should trigger
          const onboardingParam = searchParams?.get('onboarding') === 'true';
          const pendingCelebration = typeof window !== 'undefined' && localStorage.getItem('sc_show_onboarding_celebration') === 'true';
          const userSeenKey = `sc_welcome_seen_${session.user.id}`;
          const alreadySeen = typeof window !== 'undefined' && (localStorage.getItem(userSeenKey) === 'true' || localStorage.getItem('sc_welcome_completed') === 'true');

          if ((onboardingParam || pendingCelebration) && !alreadySeen) {
            setShowOnboardingCelebration(true);
            try {
              localStorage.removeItem('sc_show_onboarding_celebration');
              localStorage.setItem(userSeenKey, 'true');
              localStorage.setItem('sc_welcome_completed', 'true');
              if (typeof window !== 'undefined' && window.history.replaceState) {
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, '', cleanUrl);
              }
            } catch (e) {}
          }
        }
      } catch (err) {
        console.error('Error loading user profile in sidebar:', err);
      }
    };

    fetchUserProfile();
  }, [searchParams]);

  // Save collapsed preference
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  // Auto-expand Leads submenu if on /leads path
  useEffect(() => {
    if (pathname.startsWith('/leads')) {
      setLeadsSubmenuOpen(true);
    }
  }, [pathname]);

  // Close mobile drawer on route change
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
  // 10 MASTER MENU ITEMS IN EXACT REQUESTED SEQUENCE
  // ─────────────────────────────────────────────────────────────
  const menuItems = [
    {
      id: 'leads',
      name: 'Leads',
      path: '/leads',
      icon: Database,
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/25',
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
      gradient: 'from-indigo-500 to-purple-600',
      shadow: 'shadow-indigo-500/25',
    },
    {
      id: 'quotations',
      name: 'Quotations',
      path: '/quotations',
      icon: FileText,
      gradient: 'from-amber-400 to-yellow-600',
      shadow: 'shadow-amber-500/25',
    },
    {
      id: 'team-manager',
      name: 'Team Manager',
      path: '/team-manager',
      icon: Calendar,
      gradient: 'from-violet-500 to-purple-700',
      shadow: 'shadow-violet-500/25',
    },
    {
      id: 'post-production',
      name: 'Post-Production',
      path: '/workspace/post-production',
      icon: Film,
      gradient: 'from-pink-500 to-rose-600',
      shadow: 'shadow-pink-500/25',
    },
    {
      id: 'finance',
      name: 'Finance & Payments',
      path: '/workspace/finance',
      icon: DollarSign,
      gradient: 'from-amber-500 to-yellow-600',
      shadow: 'shadow-amber-500/25',
    },
    {
      id: 'attendance',
      name: 'Workforce Attendance',
      path: '/workspace/attendance',
      icon: Clock,
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/25',
    },
    {
      id: 'integrations',
      name: 'Integrations',
      path: '/workspace/integrations',
      icon: Plug,
      gradient: 'from-blue-500 to-cyan-600',
      shadow: 'shadow-blue-500/25',
    },
    {
      id: 'settings',
      name: 'Settings',
      path: '/settings',
      icon: Settings,
      gradient: 'from-slate-600 to-zinc-700',
      shadow: 'shadow-slate-500/25',
    },
    {
      id: 'support',
      name: 'Help & Support',
      path: '/support',
      icon: HelpCircle,
      gradient: 'from-teal-500 to-emerald-600',
      shadow: 'shadow-teal-500/25',
    },
  ];

  // Standalone pages that do not show the global sidebar
  const isStandalonePage = 
    pathname === '/login' ||
    pathname.startsWith('/pdf-preview') ||
    pathname.startsWith('/p/quotation') ||
    pathname.startsWith('/attendance/') ||
    pathname.startsWith('/workspace/quotations/builder') ||
    pathname.startsWith('/admin/workspace/quotations/builder');

  if (isStandalonePage) {
    return <div className="min-h-screen w-full bg-[#FDFCF7] text-slate-900">{children}</div>;
  }

  return (
    <div className="min-h-screen w-full bg-[#FDFCF7] text-slate-900 flex flex-col font-sans selection:bg-amber-100">
      
      {/* ─────────────────────────────────────────────────────────────
          MOBILE TOP HEADER (< 1024PX)
      ───────────────────────────────────────────────────────────── */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 h-14 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <img
            src="/StudioCorelogo1.png"
            alt="StudioCore"
            className="w-8 h-8 rounded-xl object-contain shadow-xs border border-amber-500/30 bg-black"
          />
          <div>
            <span className="font-black text-sm text-slate-900 tracking-tight">StudioCore</span>
            <span className="text-[9px] font-extrabold text-amber-700 ml-1.5 uppercase tracking-wider">Suite</span>
          </div>
        </div>

        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          DESKTOP MASTER SIDEBAR (PC & TABLET)
      ───────────────────────────────────────────────────────────── */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 hidden lg:flex flex-col bg-white border-r border-slate-200/90 shadow-sm transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Top Brand & Logo Header with Expand/Collapse Toggle Arrow */}
        <div className="h-16 border-b border-slate-100 px-3.5 flex items-center justify-between shrink-0">
          <Link href="/workspace" className="flex items-center gap-2.5 overflow-hidden group">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-black border border-amber-500/40 shadow-sm flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <img
                src="/StudioCorelogo1.png"
                alt="StudioCore"
                className="w-full h-full object-contain"
              />
            </div>

            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h2 className="text-sm font-black text-slate-900 tracking-tight leading-none flex items-center gap-1">
                  StudioCore
                  <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    Pro
                  </span>
                </h2>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">
                  Production Suite
                </p>
              </motion.div>
            )}
          </Link>

          {/* Toggle Collapse/Expand Arrow Button */}
          <button
            onClick={() => setCollapsed(prev => !prev)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items List */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isLeads = item.id === 'leads';
            const isActive = isLeads
              ? pathname.startsWith('/leads')
              : pathname === item.path || (item.path !== '/workspace' && pathname.startsWith(item.path));

            return (
              <div key={item.id} className="relative group">
                <div className="flex items-center">
                  <Link
                    href={item.path}
                    className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                      isActive
                        ? 'bg-amber-500/10 text-amber-950 border border-amber-300/80 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                    } ${collapsed ? 'justify-center px-2' : ''}`}
                  >
                    {/* 3D Gradient Icon Container */}
                    <div
                      className={`w-7 h-7 rounded-lg bg-gradient-to-br ${item.gradient} ${item.shadow} flex items-center justify-center text-white shrink-0 shadow-sm transition-transform group-hover:scale-105`}
                    >
                      <Icon className="w-4 h-4 stroke-[2.2]" />
                    </div>

                    {/* Menu Label */}
                    {!collapsed && (
                      <span className="truncate flex-1 text-left tracking-tight">
                        {item.name}
                      </span>
                    )}

                    {/* Submenu Dropdown Arrow for Leads */}
                    {!collapsed && isLeads && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setLeadsSubmenuOpen(prev => !prev);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${leadsSubmenuOpen ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </Link>
                </div>

                {/* Leads Submenu Items (When Expanded) */}
                {!collapsed && isLeads && leadsSubmenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pl-9 pr-2 py-1 space-y-1"
                  >
                    {item.subItems?.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive = checkIsSubActive(sub.path);

                      return (
                        <Link
                          key={sub.name}
                          href={sub.path}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                            isSubActive
                              ? 'bg-amber-500/15 text-amber-950 font-extrabold border border-amber-300 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <SubIcon className={`w-3 h-3 ${isSubActive ? 'text-amber-600' : 'text-slate-400'}`} />
                          <span>{sub.name}</span>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}

                {/* 3D Floating Tooltip in Collapsed State */}
                {collapsed && (
                  <div className="hidden group-hover:block absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 pointer-events-none">
                    <div className="bg-slate-950 text-white px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap shadow-xl border border-slate-800 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${item.gradient}`} />
                      <span>{item.name}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom Profile & Studio Section (Clickable to open Profile Modal) */}
        <div className="p-3 border-t border-slate-100 shrink-0 bg-slate-50/50">
          <div
            className={`flex items-center rounded-xl p-2 transition ${
              collapsed ? 'justify-center' : 'justify-between bg-white border border-slate-200/80 shadow-2xs'
            }`}
          >
            <div
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2.5 overflow-hidden cursor-pointer group flex-1 hover:opacity-90 transition-opacity"
              title="Click to view & edit Studio Profile"
            >
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt="Avatar"
                  className="w-8 h-8 rounded-xl object-cover border border-amber-400 shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs border border-amber-300 shrink-0 group-hover:scale-105 transition-transform">
                  {userEmail.slice(0, 2).toUpperCase()}
                </div>
              )}

              {!collapsed && (
                <div className="overflow-hidden text-left">
                  <h4 className="text-xs font-black text-slate-900 truncate max-w-[120px] group-hover:text-[#F36F21] transition-colors">
                    {workspaceName}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate max-w-[120px] font-mono">
                    {userEmail}
                  </p>
                </div>
              )}
            </div>

            {!collapsed && (
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 ml-1"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          MOBILE SLIDING DRAWER (< 1024PX)
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawerOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            {/* Sliding Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 260 }}
              className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between z-10"
            >
              {/* Header */}
              <div className="h-16 px-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/StudioCorelogo1.png"
                    alt="StudioCore"
                    className="w-8 h-8 rounded-xl object-contain bg-black border border-amber-500/30"
                  />
                  <div>
                    <h3 className="font-black text-sm text-slate-900">StudioCore</h3>
                    <p className="text-[9px] font-bold text-amber-700 uppercase">Production Suite</p>
                  </div>
                </div>

                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Menu List */}
              <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1.5">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path || (item.path !== '/workspace' && pathname.startsWith(item.path));

                  return (
                    <div key={item.id}>
                      <Link
                        href={item.path}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-extrabold transition ${
                          isActive
                            ? 'bg-amber-500/10 text-amber-950 border border-amber-300 shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span>{item.name}</span>
                      </Link>

                      {/* Mobile Submenu for Leads */}
                      {item.id === 'leads' && (
                        <div className="pl-9 pr-2 py-1 space-y-1">
                          {item.subItems?.map(sub => {
                            const SubIcon = sub.icon;
                            const isSubActive = checkIsSubActive(sub.path);
                            return (
                              <Link
                                key={sub.name}
                                href={sub.path}
                                onClick={() => setMobileDrawerOpen(false)}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition ${
                                  isSubActive
                                    ? 'bg-amber-500/15 text-amber-950 font-black border border-amber-300 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-bold'
                                }`}
                              >
                                <SubIcon className={`w-3.5 h-3.5 ${isSubActive ? 'text-amber-600' : 'text-slate-400'}`} />
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

              {/* Bottom Profile Card */}
              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      setShowProfileModal(true);
                    }}
                    className="flex items-center gap-2.5 cursor-pointer group flex-1"
                  >
                    {userAvatarUrl ? (
                      <img
                        src={userAvatarUrl}
                        alt="Avatar"
                        className="w-8 h-8 rounded-xl object-cover border border-amber-400 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-900 font-black text-xs flex items-center justify-center">
                        {userEmail.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-black text-slate-900 group-hover:text-[#F36F21] transition-colors">{workspaceName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{userEmail}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="p-2 text-slate-400 hover:text-rose-600 transition"
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

      {/* ─────────────────────────────────────────────────────────────
          MAIN CONTENT VIEWPORT
          - Responsive Left Padding on PC/Desktop based on Collapsed state
          - NO BOTTOM BAR ON PC!
      ───────────────────────────────────────────────────────────── */}
      <main
        className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${
          collapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {children}
      </main>

      {/* ── STUDIO PROFILE EDIT MODAL ── */}
      <StudioProfileEditModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onProfileSaved={(p) => {
          if (p.studioName) setWorkspaceName(p.studioName);
          if (p.avatarUrl !== undefined) setUserAvatarUrl(p.avatarUrl);
        }}
      />

      {/* ── ONBOARDING CELEBRATION MODAL (Dual-Cannon Confetti + Welcome + Profile Setup) ── */}
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
