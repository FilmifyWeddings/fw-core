'use client';

import React from 'react';
import { Megaphone, Play, Calendar, CheckCircle, Clock } from 'lucide-react';

export default function BroadcastCampaignsPage() {
  const campaigns = [
    { id: '1', name: 'Summer Wedding Discount Drip', template: 'welcome_drip', audience: 'Facebook Leads', status: 'Active', sent: 18, pending: 4, date: '12 Jun 2026' },
    { id: '2', name: 'Goa Destination Promo Pack', template: 'followup_lead', audience: 'Goa Inquiries', status: 'Scheduled', sent: 0, pending: 24, date: '15 Jun 2026' },
    { id: '3', name: 'Pre-Wedding Shoot Folio', template: 'feedback_survey', audience: 'Completed Deals', status: 'Completed', sent: 48, pending: 0, date: '08 Jun 2026' }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#070708] text-zinc-900 dark:text-white p-8 transition-colors duration-200">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Broadcast Marketing Campaigns</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Schedule, monitor, and scale WhatsApp template broadcast drips to target cohorts</p>
          </div>
          <button 
            type="button" 
            onClick={() => alert('Campaign builder is launching soon!')}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-400 to-amber-500 text-black text-xs font-bold rounded-xl shadow-lg shadow-orange-500/10 hover:opacity-95"
          >
            <Megaphone className="w-3.5 h-3.5" />
            Create Campaign
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {campaigns.map((camp) => (
            <div key={camp.id} className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md shadow-xl flex flex-col justify-between h-48 group hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                    camp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    camp.status === 'Scheduled' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    'bg-zinc-200 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800'
                  }`}>
                    {camp.status}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium font-mono">{camp.date}</span>
                </div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white truncate">{camp.name}</h3>
                <p className="text-[10px] text-zinc-500 font-mono truncate">Template: {camp.template}</p>
              </div>

              <div className="pt-3 border-t border-zinc-150 dark:border-zinc-900/60 flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="text-left">
                    <p className="text-[9px] text-zinc-400 font-bold uppercase">Sent</p>
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{camp.sent}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] text-zinc-400 font-bold uppercase">Pending</p>
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{camp.pending}</p>
                  </div>
                </div>
                
                <button 
                  type="button"
                  className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 flex items-center justify-center hover:text-orange-500 hover:border-orange-500/20"
                >
                  {camp.status === 'Active' ? <Play className="w-3.5 h-3.5 animate-pulse text-emerald-500" /> : <Calendar className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
