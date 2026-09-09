'use client';

import React from 'react';
import { FWProject } from '@/types';
import { History, Pencil } from 'lucide-react';

export interface TeamManagerProjectCardProps {
  project: FWProject;
  onEditProject?: (project: FWProject) => void;
  onOpenHistory?: (project: FWProject) => void;
  isTmReadOnly?: boolean;
  isFilterActive?: boolean;
  isCardMatched?: boolean;
  hasUnassignedWarning?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * ⚡ Checks if a project contains unassigned slots matching the current unassigned or role filter
 */
export function checkProjectUnassignedWarning(
  project: FWProject,
  filters?: { assignmentStatus?: string; assignmentStatuses?: string[]; roles?: string[] }
): boolean {
  if (!filters || !project.fw_sub_events || project.fw_sub_events.length === 0) return false;

  const isFilterForUnassigned = Boolean(
    filters.assignmentStatus === 'unassigned' ||
    filters.assignmentStatuses?.includes('unassigned')
  );
  const activeRoles = filters.roles || [];

  if (!isFilterForUnassigned && activeRoles.length === 0) {
    return false;
  }

  for (const se of project.fw_sub_events) {
    const assignments = se.fw_assignments || [];
    for (const a of assignments) {
      if (!a.assigned_member_id) {
        if (isFilterForUnassigned) return true;
        if (activeRoles.length > 0 && (
          activeRoles.includes(a.required_role) ||
          Boolean((a as any).role_short_code && activeRoles.includes((a as any).role_short_code))
        )) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * ⚡ Unified Highlight on Matched Cards
 * Returns clean amber border focus without whole-card blinking (per user directive)
 */
export function getCardHighlightClass(isFilterActive?: boolean, isCardMatched: boolean = true): string {
  if (isFilterActive && isCardMatched) {
    return 'ring-1.5 ring-amber-400/60 shadow-md';
  }
  return '';
}

/**
 * ⚡ Team Manager Project Card Action Header with Edit & Standalone History Trigger
 */
export const TeamManagerProjectCard: React.FC<TeamManagerProjectCardProps> = ({
  project,
  onEditProject,
  onOpenHistory,
  isTmReadOnly = false,
  isFilterActive = false,
  isCardMatched = true,
  className = '',
  children,
}) => {
  const isHighlighted = isFilterActive && isCardMatched;

  if (children) {
    return (
      <div
        className={`relative rounded-2xl transition-all duration-300 ${
          isHighlighted
            ? 'ring-1.5 ring-amber-400/60 shadow-md border border-amber-300/40 bg-[#FDFBF7] dark:bg-[#1A1816]'
            : 'border border-amber-900/10 hover:border-amber-900/25 bg-[#FDFBF7] dark:bg-[#1A1816]'
        } ${className}`}
      >
        {children}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Standalone History Icon Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onOpenHistory?.(project);
        }}
        className="p-1.5 rounded-lg bg-neutral-100/90 hover:bg-amber-100/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 transition-all cursor-pointer shadow-sm"
        title="View Project Change History"
      >
        <History className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
      </button>

      {/* Edit Project Button */}
      {!isTmReadOnly && onEditProject && (
        <button
          type="button"
          title="Edit Project"
          onClick={(e) => {
            e.stopPropagation();
            onEditProject(project);
          }}
          className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-indigo-600 transition shadow-xs shrink-0 cursor-pointer"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default TeamManagerProjectCard;
