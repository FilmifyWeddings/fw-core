'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, Crown, Briefcase, Check, Building2, 
  Sparkles, Camera, Film, BookOpen, Layers, ShieldCheck 
} from 'lucide-react';
import { useWorkspace, WorkspaceOption } from '@/lib/context/BhamstraContext';
import { useRouter, usePathname } from 'next/navigation';

interface WorkspaceSwitcherProps {
  isCollapsed?: boolean;
}

export function WorkspaceSwitcher({ isCollapsed = false }: WorkspaceSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { 
    workspaceName, 
    workspaceId, 
    isOwner, 
    userRole, 
    availableWorkspaces, 
    switchWorkspace 
  } = useWorkspace();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const ownerWorkspaces = availableWorkspaces.filter(w => w.isOwner);
  const partnerWorkspaces = availableWorkspaces.filter(w => !w.isOwner);

  const getRoleIcon = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'OWNER':
        return <Crown className="w-3.5 h-3.5 text-amber-500" />;
      case 'PHOTOGRAPHER':
      case 'CINEMATOGRAPHER':
        return <Camera className="w-3.5 h-3.5 text-sky-500" />;
      case 'EDITOR':
        return <Film className="w-3.5 h-3.5 text-rose-500" />;
      case 'ALBUM_LAB':
        return <BookOpen className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <Briefcase className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'OWNER': return 'Studio Owner';
      case 'PHOTOGRAPHER': return 'Photographer';
      case 'CINEMATOGRAPHER': return 'Cinematographer';
      case 'EDITOR': return 'Video/Photo Editor';
      case 'ALBUM_LAB': return 'Printing Lab';
      case 'MANAGER': return 'Studio Manager';
      default: return role || 'Partner Member';
    }
  };

  const handleSelect = async (ws: WorkspaceOption) => {
    setIsOpen(false);
    await switchWorkspace(ws.workspaceId);

    // If switching to a partner workspace and currently on an owner-only page, route to partner portal
    if (!ws.isOwner) {
      if (
        pathname === '/workspace/settings' || 
        pathname === '/workspace/integrations' ||
        pathname === '/workspace/finance' ||
        pathname === '/workspace'
      ) {
        router.push('/workspace/partner-portal');
      }
    } else if (pathname === '/workspace/partner-portal') {
      router.push('/workspace');
    }
  };

  if (isCollapsed) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center bg-zinc-50 hover:bg-amber-50 border border-zinc-200 transition-all cursor-pointer relative group"
          title={`Active: ${workspaceName} (${isOwner ? 'Owner' : userRole})`}
        >
          {isOwner ? (
            <Crown className="w-5 h-5 text-amber-600" />
          ) : (
            <Briefcase className="w-5 h-5 text-indigo-600" />
          )}
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, x: -10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.95 }}
              className="absolute left-16 top-0 w-72 bg-white rounded-2xl border border-zinc-200 shadow-2xl z-50 p-2 text-left"
            >
              {renderDropdownContent()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  function renderDropdownContent() {
    return (
      <div className="space-y-3">
        {/* Header summary */}
        <div className="px-3 py-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Switch Studio</span>
          </div>
          <span className="text-[10px] font-black text-amber-700 bg-white/80 px-2 py-0.5 rounded-md border border-amber-200">
            {availableWorkspaces.length} Total
          </span>
        </div>

        {/* 1. MY STUDIOS (OWNER) */}
        <div>
          <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Crown className="w-3 h-3 text-amber-500" />
            <span>My Studios (Owner)</span>
          </div>
          <div className="mt-1 space-y-1">
            {ownerWorkspaces.map((ws) => {
              const isSelected = ws.workspaceId === workspaceId;
              return (
                <button
                  key={ws.workspaceId}
                  onClick={() => handleSelect(ws)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/10 text-amber-900 border border-amber-300 font-bold'
                      : 'hover:bg-zinc-100 text-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                      {ws.studioName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold leading-tight truncate">{ws.studioName}</p>
                      <p className="text-[10px] text-zinc-400 font-normal">Full Studio Admin</p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. PARTNER WORKSPACES (CREW / LAB) */}
        {partnerWorkspaces.length > 0 && (
          <div>
            <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 border-t border-zinc-100 pt-2">
              <Briefcase className="w-3 h-3 text-indigo-500" />
              <span>Partner Workspaces (Crew / Vendor)</span>
            </div>
            <div className="mt-1 space-y-1">
              {partnerWorkspaces.map((ws) => {
                const isSelected = ws.workspaceId === workspaceId;
                return (
                  <button
                    key={ws.workspaceId}
                    onClick={() => handleSelect(ws)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-900 border border-indigo-300 font-bold'
                        : 'hover:bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                        {ws.studioName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold leading-tight truncate">{ws.studioName}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {getRoleIcon(ws.userRole)}
                          <span className="text-[10px] font-semibold text-indigo-600">
                            {getRoleLabel(ws.userRole)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 rounded-2xl bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-200/80 transition-all cursor-pointer group shadow-2xs"
      >
        <div className="flex items-center gap-2.5 overflow-hidden text-left">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 shadow-xs ${
            isOwner 
              ? 'bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600' 
              : 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600'
          }`}>
            {isOwner ? <Crown className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-zinc-900 tracking-tight truncate max-w-[110px]">
                {workspaceName || 'StudioCore'}
              </span>
              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md tracking-wider ${
                isOwner 
                  ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                  : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
              }`}>
                {isOwner ? 'Owner' : userRole}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-medium truncate">
              {isOwner ? 'Full Studio Access' : 'Partner Workspace Portal'}
            </p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-400 group-hover:text-zinc-700 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-zinc-200 shadow-2xl z-50 p-2.5"
          >
            {renderDropdownContent()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
