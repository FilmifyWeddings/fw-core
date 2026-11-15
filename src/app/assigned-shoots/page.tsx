'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import TeamDashboardPage from '../team/dashboard/page';

const TeamManagerPage = dynamic(() => import('../team-manager/page'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-0.5 bg-amber-500/10 overflow-hidden pointer-events-none">
      <div className="h-full bg-gradient-to-r from-amber-500 to-amber-600 animate-pulse w-1/3" />
    </div>
  ),
});

export default function AssignedShootsPage() {
  const { isOwner } = useWorkspace();

  // If non-owner (crew / freelancer / partner), render the ultra-fast 0ms Crew Portal
  if (!isOwner) {
    return <TeamDashboardPage />;
  }

  return (
    <Suspense fallback={
      <div className="w-full h-0.5 bg-amber-500/10 overflow-hidden pointer-events-none">
        <div className="h-full bg-gradient-to-r from-amber-500 to-amber-600 animate-pulse w-1/3" />
      </div>
    }>
      <TeamManagerPage />
    </Suspense>
  );
}
