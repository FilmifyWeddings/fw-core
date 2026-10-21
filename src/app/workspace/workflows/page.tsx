'use client';

import React from 'react';
import Link from 'next/link';
import { 
  PlaySquare, Film, Camera, CheckSquare, ArrowRight, 
  Sparkles, Layers, ShieldCheck, CheckCircle2 
} from 'lucide-react';

export default function WorkflowsHubPage() {
  const workflows = [
    {
      title: 'StudioCore Review',
      description: 'Frame-accurate video proofing, client timestamped comments, frame annotations & final approval sign-offs.',
      path: '/workspace/review',
      icon: PlaySquare,
      badge: 'New & Active',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      action: 'Launch Video Review',
    },
    {
      title: 'Post-Production Management',
      description: 'Track cinema editing pipelines, color grading stages, sound mastering & deliverable deadlines.',
      path: '/workspace/post-production',
      icon: Film,
      badge: 'Pipeline',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      action: 'Manage Post-Production',
    },
    {
      title: 'AI Client Galleries',
      description: 'Facial recognition photo delivery, real-time client selections, lightroom export & printable standees.',
      path: '/workspace/gallery',
      icon: Camera,
      badge: 'Photo Proofing',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      action: 'Open Galleries',
    },
    {
      title: 'Tasks & Production Notes',
      description: 'Collaborative team tasks, shoot assignments, internal notes & client deliverables tracking.',
      path: '/workspace/tasks',
      icon: CheckSquare,
      badge: 'Team Operations',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      action: 'View Tasks',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F5] p-4 sm:p-8 space-y-6 select-none font-sans">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-[#E7E2D8] shadow-2xs space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 text-[11px] font-black tracking-wider uppercase border border-amber-500/20">
            StudioCore Workflows
          </span>
        </div>
        <h1 
          style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
          className="text-2xl sm:text-3xl font-medium text-zinc-900 tracking-tight"
        >
          Creative Operations & Workflows
        </h1>
        <p className="text-xs text-zinc-500 max-w-xl">
          End-to-end production pipelines for creative wedding cinematographers, photographers, and post-production studios.
        </p>
      </div>

      {/* Workflow Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {workflows.map((wf) => {
          const Icon = wf.icon;
          return (
            <Link
              key={wf.title}
              href={wf.path}
              className="group bg-white rounded-3xl border border-[#E7E2D8] p-6 shadow-2xs hover:shadow-md hover:border-amber-400 transition-all duration-300 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${wf.badgeColor}`}>
                    {wf.badge}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-base text-zinc-900 group-hover:text-amber-600 transition-colors">
                    {wf.title}
                  </h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    {wf.description}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-bold text-amber-600">
                <span>{wf.action}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
