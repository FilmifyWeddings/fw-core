'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, User, DollarSign, FileText, Lock, Users, Briefcase, Plus, Calendar, Tag, Mail, Phone,
  FileIcon, ChevronRight
} from 'lucide-react';
import { Lead, LeadStatus, LeadScore } from '@/types';
import { supabase } from '@/lib/supabase';
import { QuotationBuilder } from './quotation-builder';

interface LeadInsiderDrawerProps {
  lead: Lead | null;
  onClose: () => void;
  onLeadUpdate?: (leadId: string, updatedFields: Partial<Lead>) => void;
  stages?: any[];
  customSources?: string[];
  userEmail?: string | null;
}

const MOCK_TEAM_MEMBERS = [
  { id: 't1', name: 'Rahul Sharma', role: 'Lead Photographer' },
  { id: 't2', name: 'Karan Singh', role: 'Cinematographer' },
  { id: 't3', name: 'Sneha Reddy', role: 'Main Editor' },
  { id: 't4', name: 'Amit Patel', role: 'Drone Operator' }
];

export function LeadInsiderDrawer({
  lead,
  onClose,
  onLeadUpdate,
  stages = [],
  customSources = [],
  userEmail
}: LeadInsiderDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'quotes' | 'finance' | 'assets'>('overview');
  const [isMounted, setIsMounted] = useState(false);
  const [commentText, setCommentText] = useState('');

  // Check role: sushantnawale700@gmail.com is Super Admin, otherwise we simulate role permissions
  // In our rules: standard shooters cannot view the financial matrix unless permitted.
  const isAdmin = userEmail === 'sushantnawale700@gmail.com' || userEmail?.includes('admin') || userEmail?.includes('owner');
  const isShooter = !isAdmin && userEmail?.includes('shooter');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!lead) return null;

  const handleFieldChange = (fields: Partial<Lead>) => {
    if (onLeadUpdate) {
      onLeadUpdate(lead.id, fields);
    }
  };

  const handleRawPayloadChange = (key: string, val: any) => {
    const updatedPayload = { ...lead.raw_payload, [key]: val };
    handleFieldChange({ raw_payload: updatedPayload });
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const newComment = {
      text: commentText.trim(),
      timestamp: new Date().toISOString()
    };
    const currentComments = (lead as any).comments || [];
    handleFieldChange({ comments: [...currentComments, newComment] } as any);
    setCommentText('');
  };

  const toggleAssignee = (memberId: string) => {
    const currentAssignees = lead.raw_payload?.assigned_team_ids || [];
    let updated: string[];
    if (currentAssignees.includes(memberId)) {
      updated = currentAssignees.filter((id: string) => id !== memberId);
    } else {
      updated = [...currentAssignees, memberId];
    }
    handleRawPayloadChange('assigned_team_ids', updated);
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
      />

      {/* Drawer Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 220 }}
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-zinc-950 border-l border-slate-200 dark:border-zinc-900 shadow-2xl flex flex-col text-slate-800 dark:text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-zinc-900 shrink-0 bg-slate-50 dark:bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Lead Workspace</h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Project ID: {lead.id.slice(0, 8)}...</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-900 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-950/30 p-1.5 gap-1 shrink-0">
          {[
            { id: 'overview', label: 'Overview', icon: Briefcase },
            { id: 'quotes', label: 'Quotations', icon: FileText },
            { id: 'finance', label: 'Financials', icon: DollarSign },
            { id: 'assets', label: 'Assets', icon: FileIcon }
          ].map(t => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-bold rounded-xl transition-all ${
                  active 
                    ? 'bg-white dark:bg-zinc-900 text-orange-500 dark:text-white border border-slate-200 dark:border-zinc-800 shadow-sm' 
                    : 'text-slate-500 dark:text-zinc-550 hover:text-slate-850 dark:hover:text-zinc-300'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: OVERVIEW & ASSIGNEES */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="space-y-6 text-xs"
              >
                {/* Standard fields */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 dark:text-zinc-550 font-bold uppercase tracking-wider block">Lead Name</label>
                    <input 
                      type="text" 
                      value={lead.name || ''} 
                      onChange={(e) => handleFieldChange({ name: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 p-2.5 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-orange-500/40"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 dark:text-zinc-550 font-bold uppercase tracking-wider block">Mobile Phone</label>
                    <input 
                      type="text" 
                      value={lead.phone} 
                      onChange={(e) => handleFieldChange({ phone: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 p-2.5 rounded-xl text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-orange-500/40"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 dark:text-zinc-550 font-bold uppercase tracking-wider block">Email Address</label>
                    <input 
                      type="text" 
                      value={lead.email || ''} 
                      onChange={(e) => handleFieldChange({ email: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 p-2.5 rounded-xl text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-orange-500/40"
                    />
                  </div>
                </div>

                {/* Team Assignees sub-section */}
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-zinc-900">
                  <h4 className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-550 tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-orange-500" />
                    Team Allocations & Assignees
                  </h4>
                  <div className="space-y-2">
                    {MOCK_TEAM_MEMBERS.map(member => {
                      const isAssigned = (lead.raw_payload?.assigned_team_ids || []).includes(member.id);
                      return (
                        <button
                          key={member.id}
                          onClick={() => toggleAssignee(member.id)}
                          className={`w-full flex items-center justify-between p-2.5 border rounded-xl transition-all ${
                            isAssigned 
                              ? 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400 font-bold' 
                              : 'bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-850 text-slate-600 dark:text-zinc-400'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-md bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="text-left">
                              <div className="text-xs font-semibold">{member.name}</div>
                              <div className="text-[9px] text-slate-500">{member.role}</div>
                            </div>
                          </div>
                          <Check className={`w-3.5 h-3.5 ${isAssigned ? 'opacity-100' : 'opacity-0'}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Comments activity timeline */}
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-zinc-900">
                  <h4 className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-550 tracking-wider">Comments Timeline</h4>
                  <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                    {((lead as any).comments || []).length === 0 ? (
                      <p className="text-[10px] text-slate-500 italic">No timeline entries logged.</p>
                    ) : (
                      ((lead as any).comments || []).map((comm: any, idx: number) => (
                        <div key={idx} className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 p-2.5 rounded-xl space-y-1">
                          <p className="text-slate-800 dark:text-zinc-200 font-medium">{comm.text}</p>
                          <span className="text-[9px] text-slate-500 block font-mono">{isMounted ? new Date(comm.timestamp).toLocaleString('en-IN') : '...'}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Type a comments logger..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                      className="flex-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 p-2 rounded-xl text-xs focus:outline-none placeholder-slate-400 dark:placeholder-zinc-600"
                    />
                    <button 
                      onClick={handleAddComment}
                      className="px-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-250 text-white dark:text-black font-extrabold rounded-xl text-xs transition-colors"
                    >
                      Log
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 4: QUOTATION BUILDER */}
            {activeTab === 'quotes' && (
              <motion.div
                key="quotes"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="space-y-6"
              >
                <QuotationBuilder
                  lead={lead}
                  onLeadUpdate={handleFieldChange}
                  userEmail={userEmail}
                />
              </motion.div>
            )}

            {/* TAB 2: FINANCIAL MATRIX */}
            {activeTab === 'finance' && (
              <motion.div
                key="finance"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="space-y-6"
              >
                {/* Standard Shooter Restrictions Overlay */}
                {isShooter ? (
                  <div className="p-6 rounded-2xl border border-rose-500/10 bg-rose-500/5 text-center space-y-4 py-16">
                    <Lock className="w-12 h-12 text-rose-500 mx-auto animate-pulse" />
                    <h3 className="text-sm font-black text-rose-400 uppercase tracking-wide">Access Token Mismatch</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Standard Shooter accounts do not possess authentication clearances to view financial billing matrix structures.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 text-xs">
                    <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 text-orange-400 text-[10px] font-bold leading-normal flex items-start gap-2">
                      <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>Financial clearance granted. Only administrators or workspace owners can edit these billing registry matrix values.</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 dark:text-zinc-550 font-bold uppercase tracking-wider block">Total Deal Cost (₹)</label>
                      <input 
                        type="number" 
                        value={lead.raw_payload?.total_deal_cost || ''} 
                        onChange={(e) => handleRawPayloadChange('total_deal_cost', Number(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 p-2.5 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none"
                        placeholder="e.g. 250000"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 dark:text-zinc-550 font-bold uppercase tracking-wider block">Retainer Payment (₹)</label>
                      <input 
                        type="number" 
                        value={lead.raw_payload?.retainer_payment || ''} 
                        onChange={(e) => handleRawPayloadChange('retainer_payment', Number(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 p-2.5 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none"
                        placeholder="e.g. 50000"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 dark:text-zinc-550 font-bold uppercase tracking-wider block">Balance Outstanding (₹)</label>
                      <div className="w-full bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 p-2.5 rounded-xl text-slate-900 dark:text-white font-mono text-xs font-black">
                        ₹{Math.max(0, (Number(lead.raw_payload?.total_deal_cost || 0) - Number(lead.raw_payload?.retainer_payment || 0))).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 dark:text-zinc-550 font-bold uppercase tracking-wider block">Tracking Token Keys</label>
                      <input 
                        type="text" 
                        value={lead.raw_payload?.tracking_token || ''} 
                        onChange={(e) => handleRawPayloadChange('tracking_token', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 p-2.5 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none"
                        placeholder="e.g. FT-998822-LOCK"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 3: WORKSPACE ASSETS */}
            {activeTab === 'assets' && (
              <motion.div
                key="assets"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="space-y-4 text-xs"
              >
                <div className="text-[10px] text-slate-500 dark:text-zinc-550 font-bold uppercase tracking-wider">Photography Documents</div>
                
                <div className="space-y-3">
                  {[
                    { name: 'Quotation_Taj_Lake_Palace.pdf', size: '1.4 MB', type: 'proposal', status: 'Approved' },
                    { name: 'Invoice_Retainer_50k.pdf', size: '320 KB', type: 'invoice', status: 'Paid' },
                    { name: 'Wedding_Photography_Contract.pdf', size: '780 KB', type: 'contract', status: 'Signed' }
                  ].map((asset, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-950/40 rounded-xl">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="text-left min-w-0">
                          <div className="font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[180px]">{asset.name}</div>
                          <div className="text-[9px] text-slate-500 mt-0.5">{asset.size} • {asset.type.toUpperCase()}</div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono ${
                        asset.status === 'Paid' || asset.status === 'Signed' || asset.status === 'Approved'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          : 'bg-zinc-800 border border-zinc-700 text-zinc-400'
                      }`}>
                        {asset.status}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Simulated file upload */}
                <button
                  type="button"
                  onClick={() => alert('Supabase Object Storage direct browser upload triggered (Law 2 compliance).')}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 mt-2"
                >
                  <Plus className="w-4 h-4" /> Upload New Asset Proposal
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
