'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FWProject, FWTeamMember } from '@/types';
import { parseClientExtended, serializeClientExtended } from '@/components/clients/client-insider-modal';
import { ChevronDown, Search, UserCheck, Users, Calendar, MapPin } from 'lucide-react';
import { handleUpdateBookingPM } from '@/lib/team-helpers';
export { handleUpdateBookingPM };

export interface ProjectBookingCardProps {
  project: FWProject;
  teamMembers: FWTeamMember[];
  onPMChange?: (projectId: string, memberId: string | null, memberName: string | null) => void;
}

import { ProjectManagerAssignModal } from '@/components/modals/ProjectManagerAssignModal';

export const ProjectBookingCard: React.FC<ProjectBookingCardProps> = ({
  project,
  teamMembers,
  onPMChange,
}) => {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const assignableMembers = teamMembers.map(m => ({
    id: m.id,
    name: m.name,
    role: m.primary_role || 'Crew Member',
    primary_role: m.primary_role || null,
    roles: (m as any).roles || [],
    primary_type: (m as any).primary_type || null,
    member_types: (m as any).member_types || [],
    email: m.email,
    phone: m.phone,
    avatar_url: m.avatar_url
  }));

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsAssignModalOpen(true)}
        className="px-3 py-1.5 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-950 text-xs font-bold flex items-center gap-2 transition shadow-xs cursor-pointer group"
      >
        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">PM:</span>
        {project.project_manager_name ? (
          <span className="font-extrabold text-amber-950 max-w-[130px] truncate">
            {project.project_manager_name}
          </span>
        ) : (
          <span className="text-amber-700/80 italic font-semibold">Assign PM</span>
        )}
        <ChevronDown className="w-3 h-3 text-amber-700 group-hover:translate-y-0.5 transition-transform" />
      </button>

      {/* 3D Cream Project Manager Granular Assignment Modal */}
      <ProjectManagerAssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        client={{
          id: project.client_id || project.id,
          name: project.client_name,
          project_manager_id: project.project_manager_id,
          project_manager_name: project.project_manager_name
        }}
        teamMembers={assignableMembers}
        onAssigned={({ memberId, memberName }) => {
          if (onPMChange) {
            onPMChange(project.id, memberId, memberName);
          }
          setIsAssignModalOpen(false);
        }}
      />
    </div>
  );
};

export default ProjectBookingCard;
