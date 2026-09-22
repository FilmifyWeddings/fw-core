'use client';

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, ChevronDown } from 'lucide-react';

export interface ClientStatusDropdownProps {
  status?: string | null;
  clientId?: string;
  onStatusChange?: (newStatus: 'active' | 'completed') => void;
  size?: 'sm' | 'md';
  className?: string;
}

export const ClientStatusDropdown: React.FC<ClientStatusDropdownProps> = ({
  status = 'active',
  clientId,
  onStatusChange,
  size = 'sm',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<'active' | 'completed'>(
    status === 'completed' ? 'completed' : 'active'
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCurrentStatus(status === 'completed' ? 'completed' : 'active');
  }, [status]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectStatus = async (
    e: React.MouseEvent,
    newStatus: 'active' | 'completed'
  ) => {
    e.stopPropagation();
    if (newStatus === currentStatus) {
      setIsOpen(false);
      return;
    }

    // Optimistic local update
    setCurrentStatus(newStatus);
    setIsOpen(false);
    onStatusChange?.(newStatus);

    if (clientId) {
      setIsUpdating(true);
      try {
        const { error } = await supabase
          .from('workspace_clients')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', clientId);

        if (error) {
          console.error('[ClientStatusDropdown] Supabase update error:', error);
          // Revert on error
          setCurrentStatus(status === 'completed' ? 'completed' : 'active');
          onStatusChange?.(status === 'completed' ? 'completed' : 'active');
        } else {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('workspace_client_updated', {
                detail: { clientId, status: newStatus },
              })
            );
          }
        }
      } catch (err) {
        console.error('[ClientStatusDropdown] Error saving status:', err);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const isCompleted = currentStatus === 'completed';

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block text-left ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        disabled={isUpdating}
        className={`inline-flex items-center gap-1.5 rounded-full font-black border transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 select-none ${
          size === 'sm'
            ? 'px-2.5 py-1 text-[11px]'
            : 'px-3.5 py-1.5 text-xs'
        } ${
          isCompleted
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
            : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
        } ${isUpdating ? 'opacity-60 cursor-wait' : ''}`}
        title="Click to switch status"
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            isCompleted ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'
          }`}
        />
        <span>{isCompleted ? 'Completed' : 'Active'}</span>
        <ChevronDown
          className={`w-3 h-3 text-slate-500 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-36 rounded-2xl bg-white border border-[#EAE5DA] shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 font-sans">
          <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            Select Status
          </div>

          <button
            type="button"
            onClick={(e) => handleSelectStatus(e, 'active')}
            className={`w-full px-3 py-2 text-left text-xs font-bold flex items-center justify-between hover:bg-blue-50/80 transition cursor-pointer ${
              !isCompleted ? 'text-blue-700 bg-blue-50/50' : 'text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <span>Active</span>
            </div>
            {!isCompleted && <Check className="w-3.5 h-3.5 text-blue-600" />}
          </button>

          <button
            type="button"
            onClick={(e) => handleSelectStatus(e, 'completed')}
            className={`w-full px-3 py-2 text-left text-xs font-bold flex items-center justify-between hover:bg-emerald-50/80 transition cursor-pointer ${
              isCompleted ? 'text-emerald-800 bg-emerald-50/50' : 'text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Completed</span>
            </div>
            {isCompleted && <Check className="w-3.5 h-3.5 text-emerald-600" />}
          </button>
        </div>
      )}
    </div>
  );
};

export default ClientStatusDropdown;
