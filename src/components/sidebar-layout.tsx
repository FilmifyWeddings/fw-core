'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Database, Send, Download, Megaphone, Layers, 
  Settings, HelpCircle, Sun, Moon, Menu, ChevronDown, ChevronRight, 
  LogOut, Search, MessageSquare, FileSpreadsheet, Check, Shield, GitBranch
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    viewBox="0 0 24 24" 
    width="24" 
    height="24" 
    stroke="currentColor" 
    strokeWidth="2" 
    fill="none" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={props.className}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [userEmail, setUserEmail] = useState<string>('user@studio.com');
  const [workspaceName, setWorkspaceName] = useState<string>('My Studio');
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);

  // Load layout preferences and theme
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar_collapsed');
    if (savedCollapsed) setCollapsed(savedCollapsed === 'true');

    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme('light');
    }

    // Get current user session
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email || 'user@studio.com');
        
        // Fetch profile workspace name
        const { data: profile } = await supabase
          .from('profiles')
          .select('workspace_name')
          .eq('id', session.user.id)
          .maybeSingle();
          
        if (profile?.workspace_name) {
          setWorkspaceName(profile.workspace_name);
        } else {
          setWorkspaceName(`${session.user.email?.split('@')[0]}'s Studio`);
        }
      }
    };
    fetchUser();
  }, []);

  // Update theme classes on document element
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Keep collapsed state in localStorage
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  // Track active sub-integration tab from URL query params
  useEffect(() => {
    if (pathname.startsWith('/dashboard/integrations')) {
      const parts = pathname.split('/');
      const providerSlug = parts[parts.length - 1];
      if (providerSlug && providerSlug !== 'integrations') {
        setActiveSubTab(providerSlug);
      } else {
        setActiveSubTab(null);
      }
      setIntegrationsOpen(true);
    } else {
      setActiveSubTab(null);
    }
  }, [pathname]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await supabase.auth.signOut();
      router.push('/login');
    }
  };

  const menuItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/'
    },
    {
      name: 'Leads',
      icon: Database,
      path: '/leads'
    },
    {
      name: 'Single Send',
      icon: Send,
      path: '/single-send'
    },
    {
      name: 'Instant Import',
      icon: Download,
      path: '/instant-import'
    },
    {
      name: 'Broadcast Campaigns',
      icon: Megaphone,
      path: '/broadcast-campaigns'
    },
    // {
    //   name: 'Workflows',
    //   icon: GitBranch,
    //   path: '/dashboard/workflows'
    // }
  ];

  if (['/login', '/home', '/admin/sushant', '/admin/dashboard'].includes(pathname)) {
    return <div className="min-h-screen w-full bg-white dark:bg-[#070708] text-zinc-900 dark:text-zinc-100">{children}</div>;
  }

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-white dark:bg-[#070708] text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      
      {/* Sidebar navigation */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950/60 backdrop-blur-md transition-all duration-300 overflow-x-hidden ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Sidebar Header Logo & Collapse Toggler */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-zinc-200 dark:border-zinc-900/60 transition-all">
          {!collapsed ? (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 flex-shrink-0 rounded-lg bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center font-bold text-xs text-black shadow-lg shadow-orange-500/10">
                  FW
                </div>
                <span className="font-bold text-xs tracking-wide bg-gradient-to-r from-zinc-800 to-zinc-500 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent truncate">
                  FW Core Platform
                </span>
              </div>
              
              <button 
                type="button"
                onClick={() => setCollapsed(true)}
                className="p-1 flex-shrink-0 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-900 border border-transparent hover:border-zinc-300 dark:hover:border-zinc-800 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white transition-all ml-1.5 focus:outline-none"
              >
                <Menu className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button 
              type="button"
              onClick={() => setCollapsed(false)}
              className="w-9 h-9 rounded-xl hover:bg-zinc-200/50 dark:hover:bg-zinc-900/40 border border-transparent hover:border-zinc-300 dark:hover:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white flex items-center justify-center mx-auto transition-all focus:outline-none"
              title="Expand Sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Bar Aesthetic */}
        {!collapsed ? (
          <div className="px-4 py-3.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search..."
                disabled
                className="w-full pl-9 pr-3 py-1.5 text-[11px] bg-zinc-200/50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg cursor-not-allowed"
              />
            </div>
          </div>
        ) : (
          <div className="py-3 flex justify-center">
            <Search className="w-4 h-4 text-zinc-400 cursor-not-allowed hover:text-zinc-600 dark:hover:text-zinc-200" />
          </div>
        )}

        {/* Primary Menu Links */}
        <div className={`flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-1 ${collapsed ? 'px-1' : 'px-3'}`}>
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <div key={item.name} className="relative group">
                <Link
                  href={item.path}
                  className={`flex items-center gap-3 py-2 rounded-lg text-xs font-semibold transition-all border border-transparent ${
                    collapsed ? 'px-2 justify-center' : 'px-3'
                  } ${
                    isActive 
                      ? 'bg-zinc-200 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white' 
                      : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200/40 dark:hover:bg-zinc-900/30'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-orange-500' : ''}`} />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
                
                {/* Collapsed Tooltip */}
                {collapsed && (
                  <div className="hidden group-hover:block absolute left-16 top-1/2 -translate-y-1/2 bg-zinc-950 border border-zinc-800 text-white text-[9px] font-bold py-1 px-2.5 rounded-md pointer-events-none whitespace-nowrap shadow-xl z-50">
                    {item.name}
                  </div>
                )}
              </div>
            );
          })}

          {/* Super Admin Dashboard Link */}
          {userEmail === 'sushantnawale700@gmail.com' && (
            <div className="relative group">
              <Link
                href="/admin/dashboard"
                className={`flex items-center gap-3 py-2 rounded-lg text-xs font-semibold transition-all border border-transparent ${
                  collapsed ? 'px-2 justify-center' : 'px-3'
                } ${
                  pathname === '/admin/dashboard'
                    ? 'bg-zinc-200 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200/40 dark:hover:bg-zinc-900/30'
                }`}
              >
                <Shield className={`w-4 h-4 ${pathname === '/admin/dashboard' ? 'text-orange-500' : ''}`} />
                {!collapsed && <span>Admin Dashboard</span>}
              </Link>
              
              {/* Collapsed Tooltip */}
              {collapsed && (
                <div className="hidden group-hover:block absolute left-16 top-1/2 -translate-y-1/2 bg-zinc-950 border border-zinc-800 text-white text-[9px] font-bold py-1 px-2.5 rounded-md pointer-events-none whitespace-nowrap shadow-xl z-50">
                  Admin Dashboard
                </div>
              )}
            </div>
          )}

          {/* Integrations Parent Menu Accordion */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => {
                router.push('/dashboard/integrations');
                if (!collapsed) {
                  setIntegrationsOpen(!integrationsOpen);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all border border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200/40 dark:hover:bg-zinc-900/30 ${
                pathname.startsWith('/dashboard/integrations') && !activeSubTab ? 'bg-zinc-200/50 dark:bg-zinc-900/40 text-zinc-950 dark:text-white' : ''
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Layers className={`w-4 h-4 ${pathname.startsWith('/dashboard/integrations') ? 'text-orange-500' : ''}`} />
                {!collapsed && <span>Integrations</span>}
              </div>
              {!collapsed && (
                integrationsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
              )}
            </button>
            
            {/* Collapsed Tooltip */}
            {collapsed && (
              <div className="hidden group-hover:block absolute left-16 top-1/2 -translate-y-1/2 bg-zinc-950 border border-zinc-800 text-white text-[9px] font-bold py-1 px-2.5 rounded-md pointer-events-none whitespace-nowrap shadow-xl z-50">
                Integrations
              </div>
            )}

            {/* Integrations Sub-menus accordion details */}
            {!collapsed && integrationsOpen && (
              <div className="mt-1 ml-4 pl-3.5 border-l border-zinc-200 dark:border-zinc-900 space-y-0.5">
                <Link
                  href="/dashboard/integrations/whatsapp-web"
                  className={`flex items-center gap-2 py-1.5 px-2.5 rounded-md text-[11px] font-medium transition-all ${
                    activeSubTab === 'whatsapp-web'
                      ? 'text-orange-500 bg-zinc-200/30 dark:bg-zinc-900/20'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp Web</span>
                </Link>
                <Link
                  href="/dashboard/integrations/meta-ads"
                  className={`flex items-center gap-2 py-1.5 px-2.5 rounded-md text-[11px] font-medium transition-all ${
                    activeSubTab === 'meta-ads'
                      ? 'text-orange-500 bg-zinc-200/30 dark:bg-zinc-900/20'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <FacebookIcon className="w-3.5 h-3.5" />
                  <span>Meta Ads</span>
                </Link>
                <Link
                  href="/dashboard/integrations/google-sheets"
                  className={`flex items-center gap-2 py-1.5 px-2.5 rounded-md text-[11px] font-medium transition-all ${
                    activeSubTab === 'google-sheets'
                      ? 'text-orange-500 bg-zinc-200/30 dark:bg-zinc-900/20'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Google Sheets</span>
                </Link>
                <Link
                  href="/dashboard/integrations/google-contacts"
                  className={`flex items-center gap-2 py-1.5 px-2.5 rounded-md text-[11px] font-medium transition-all ${
                    activeSubTab === 'google-contacts'
                      ? 'text-orange-500 bg-zinc-200/30 dark:bg-zinc-900/20'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Google Contacts</span>
                </Link>
              </div>
            )}
          </div>

          {/* Settings Menu */}
          <div className="relative group">
            <Link
              href="/settings"
              className={`flex items-center gap-3 py-2 rounded-lg text-xs font-semibold transition-all border border-transparent ${
                collapsed ? 'px-2 justify-center' : 'px-3'
              } ${
                pathname === '/settings' 
                  ? 'bg-zinc-200 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white' 
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200/40 dark:hover:bg-zinc-900/30'
              }`}
            >
              <Settings className={`w-4 h-4 ${pathname === '/settings' ? 'text-orange-500' : ''}`} />
              {!collapsed && <span>Settings</span>}
            </Link>
            
            {/* Collapsed Tooltip */}
            {collapsed && (
              <div className="hidden group-hover:block absolute left-16 top-1/2 -translate-y-1/2 bg-zinc-950 border border-zinc-800 text-white text-[9px] font-bold py-1 px-2.5 rounded-md pointer-events-none whitespace-nowrap shadow-xl z-50">
                Settings
              </div>
            )}
          </div>

          {/* Support Menu */}
          <div className="relative group">
            <Link
              href="/support"
              className={`flex items-center gap-3 py-2 rounded-lg text-xs font-semibold transition-all border border-transparent ${
                collapsed ? 'px-2 justify-center' : 'px-3'
              } ${
                pathname === '/support' 
                  ? 'bg-zinc-200 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white' 
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200/40 dark:hover:bg-zinc-900/30'
              }`}
            >
              <HelpCircle className={`w-4 h-4 ${pathname === '/support' ? 'text-orange-500' : ''}`} />
              {!collapsed && <span>Support</span>}
            </Link>
            
            {/* Collapsed Tooltip */}
            {collapsed && (
              <div className="hidden group-hover:block absolute left-16 top-1/2 -translate-y-1/2 bg-zinc-950 border border-zinc-800 text-white text-[9px] font-bold py-1 px-2.5 rounded-md pointer-events-none whitespace-nowrap shadow-xl z-50">
                Support
              </div>
            )}
          </div>
        </div>

        {/* Bottom Toggle Switches & Profile Widget */}
        <div className={`border-t border-zinc-200 dark:border-zinc-900/60 space-y-2.5 bg-zinc-50 dark:bg-zinc-950/40 transition-all duration-200 ${collapsed ? 'p-1.5' : 'p-3'}`}>
          
          {/* Light/Dark Mode Switcher */}
          <div className="px-1 py-0.5">
            {!collapsed ? (
              <div className="w-full flex items-center justify-between gap-1 p-1 bg-zinc-200/50 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-900/60 rounded-xl relative">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold rounded-lg transition-colors duration-200 focus:outline-none ${
                    theme === 'light' 
                      ? 'text-zinc-950 dark:text-white' 
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  <Sun className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-amber-500' : ''}`} />
                  <span>Light</span>
                  {theme === 'light' && (
                    <motion.div
                      layoutId="themeActiveBlock"
                      className="absolute inset-0 -z-10 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold rounded-lg transition-colors duration-200 focus:outline-none ${
                    theme === 'dark' 
                      ? 'text-zinc-950 dark:text-white' 
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  <Moon className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-orange-500' : ''}`} />
                  <span>Dark</span>
                  {theme === 'dark' && (
                    <motion.div
                      layoutId="themeActiveBlock"
                      className="absolute inset-0 -z-10 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    />
                  )}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={toggleTheme}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-zinc-200/50 dark:bg-zinc-900/40 border border-zinc-300 dark:border-zinc-900/60 hover:border-zinc-400 dark:hover:border-zinc-800 mx-auto text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-all focus:outline-none"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                <motion.div
                  key={theme}
                  initial={{ rotate: -90, scale: 0.8, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  {theme === 'dark' ? (
                    <Moon className="w-4 h-4 text-orange-500" />
                  ) : (
                    <Sun className="w-4 h-4 text-amber-500" />
                  )}
                </motion.div>
              </button>
            )}
          </div>

          {/* User Profile Card */}
          <div 
            className={`flex items-center rounded-xl transition-all duration-250 justify-between group relative ${
              collapsed 
                ? 'justify-center p-1 bg-transparent border-transparent' 
                : 'p-2.5 border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-900/40 backdrop-blur-md'
            }`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500 font-bold flex items-center justify-center text-xs flex-shrink-0">
                {userEmail.slice(0, 1).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="text-left overflow-hidden">
                  <h5 className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[100px]">
                    {workspaceName}
                  </h5>
                  <p className="text-[9px] text-zinc-500 dark:text-zinc-500 truncate max-w-[100px] font-mono">
                    {userEmail}
                  </p>
                </div>
              )}
            </div>

            {!collapsed && (
              <button 
                type="button"
                onClick={handleSignOut}
                className="p-1 rounded text-zinc-500 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
            
            {/* Collapsed Tooltip Sign out */}
            {collapsed && (
              <div className="hidden group-hover:flex absolute left-16 top-1/2 -translate-y-1/2 bg-zinc-950 border border-zinc-800 text-white text-[9px] font-bold py-1.5 px-3.5 rounded-md pointer-events-none whitespace-nowrap shadow-xl z-50 items-center gap-2">
                <span>{userEmail}</span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="p-0.5 rounded bg-zinc-900 border border-zinc-800 hover:text-rose-400 text-zinc-400"
                >
                  <LogOut className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>

        </div>
      </aside>

      {/* Main viewport margin offset area */}
      <main 
        className={`flex-1 min-h-screen flex flex-col min-w-0 transition-all duration-300 bg-zinc-50 dark:bg-[#070708] ${
          collapsed ? 'pl-16' : 'pl-60'
        }`}
      >
        {children}
      </main>

    </div>
  );
}
