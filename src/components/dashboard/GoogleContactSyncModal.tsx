'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ChevronDown,
  Sparkles,
  RefreshCw,
  Phone,
  User,
  Tag,
} from 'lucide-react';
import { Lead } from '@/types';

interface GoogleContactSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  workspaceId: string;
  onSyncSuccess?: (leadId: string, contactId?: string) => void;
}

export function GoogleContactSyncModal({
  isOpen,
  onClose,
  lead,
  workspaceId,
  onSyncSuccess,
}: GoogleContactSyncModalProps) {
  const [loadingConfig, setLoadingConfig] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectedEmail, setConnectedEmail] = useState<string>('');
  const [selectedLabelId, setSelectedLabelId] = useState<string>('');
  const [selectedLabelName, setSelectedLabelName] = useState<string>('');
  const [labels, setLabels] = useState<Array<{ id: string; name: string; memberCount: number }>>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if lead is already synced
  const isAlreadySynced = Boolean(
    (lead as any)?.google_synced || lead?.raw_payload?.google_synced || syncSuccess
  );

  // Fetch credentials and labels on open
  useEffect(() => {
    if (!isOpen || !workspaceId) return;

    let isMounted = true;
    setLoadingConfig(true);
    setErrorMessage(null);
    setSyncSuccess(false);

    async function fetchStatus() {
      try {
        const res = await fetch(`/api/integrations/google-contacts?workspace_id=${workspaceId}`);
        const data = await res.json();

        if (!isMounted) return;

        if (res.ok && data.connected) {
          setIsConnected(true);
          setConnectedEmail(data.connectedEmail || '');
          setSelectedLabelId(data.selectedLabelId || (data.labels?.[0]?.id ?? ''));
          setSelectedLabelName(data.selectedLabelName || (data.labels?.[0]?.name ?? ''));
          setLabels(data.labels || []);
        } else {
          setIsConnected(false);
          setConnectedEmail('');
          setLabels([]);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error fetching Google Contacts status:', err);
        setIsConnected(false);
      } finally {
        if (isMounted) setLoadingConfig(false);
      }
    }

    fetchStatus();

    return () => {
      isMounted = false;
    };
  }, [isOpen, workspaceId, lead?.id]);

  if (!isOpen || !lead) return null;

  // Handle Sync Contact
  const handleSync = async () => {
    if (isSyncing || !lead) return;
    setIsSyncing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/integrations/google-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          workspaceId: workspaceId || lead.workspace_id,
          labelId: selectedLabelId || null,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSyncSuccess(true);
        if (onSyncSuccess) {
          onSyncSuccess(lead.id, data.contactId);
        }
      } else {
        setErrorMessage(data.error || data.message || 'Failed to sync contact with Google.');
      }
    } catch (err: any) {
      console.error('Sync lead error:', err);
      setErrorMessage(err.message || 'Network error occurred during sync.');
    } finally {
      setIsSyncing(false);
    }
  };

  const syncedDate = lead.raw_payload?.google_synced_at || (lead as any).google_synced_at;
  const formattedSyncDate = syncedDate
    ? new Date(syncedDate).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recently';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        />

        {/* Creamy Minimal Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 12 }}
          className="relative z-10 w-full max-w-lg bg-[#FAF8F5] dark:bg-[#181614] border border-[#E8E5DF] dark:border-[#2C2926] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Subtle Top Accent Ribbon */}
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

          {/* Modal Header */}
          <div className="p-5 sm:p-6 border-b border-[#E8E5DF] dark:border-[#2C2926] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#22201D] border border-[#E8E5DF] dark:border-[#332F2B] shadow-xs flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1A1816] dark:text-[#F4F2ED] flex items-center gap-2">
                  Google Contacts Sync
                  {isAlreadySynced && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Synced ✓
                    </span>
                  )}
                </h3>
                <p className="text-xs text-[#7A756D] dark:text-[#9E988F]">
                  Export and sync CRM client leads to your Google Workspace account.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#7A756D] hover:text-[#1A1816] dark:text-[#9E988F] dark:hover:text-[#F4F2ED] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 space-y-5">
            {loadingConfig ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
                <p className="text-xs font-medium text-[#7A756D] dark:text-[#9E988F]">
                  Checking Google Contacts connection & labels...
                </p>
              </div>
            ) : !isConnected ? (
              /* State A: Google Account is Disconnected / OFF */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-red-700 dark:text-red-400">
                      Google Account Not Connected
                    </h4>
                    <p className="text-xs text-red-600/90 dark:text-red-300/90 mt-1 leading-relaxed">
                      Your Google Contacts integration is currently OFF or disconnected. Leads cannot be automatically synced until Google Contacts is authorized.
                    </p>
                  </div>
                </div>

                {/* Step-by-step guidance */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#201E1B] border border-[#E8E5DF] dark:border-[#2C2926] shadow-2xs space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-[#7A756D] dark:text-[#9E988F]">
                    How to Connect (30 Seconds):
                  </h5>
                  <ol className="text-xs text-[#403C36] dark:text-[#C8C3BA] space-y-2 list-decimal list-inside leading-relaxed">
                    <li>
                      Go to <strong className="text-[#1A1816] dark:text-[#F4F2ED]">Integrations &gt; Google Contacts</strong>.
                    </li>
                    <li>
                      Click <strong className="text-[#1A1816] dark:text-[#F4F2ED]">Connect Google Account</strong> and grant Contacts access.
                    </li>
                    <li>
                      Choose or create your default <strong className="text-[#1A1816] dark:text-[#F4F2ED]">Contacts Label</strong> (e.g. &apos;Wedding Leads&apos;).
                    </li>
                    <li>
                      Return to Leads CRM to sync any lead with one click.
                    </li>
                  </ol>
                </div>

                <div className="pt-2">
                  <a
                    href="/dashboard/integrations/google-contacts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#1A1816] hover:bg-[#2A2622] dark:bg-[#F4F2ED] dark:hover:bg-white text-white dark:text-[#1A1816] font-semibold text-xs transition-all shadow-md cursor-pointer"
                  >
                    Open Google Contacts Integration
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : isAlreadySynced && !syncSuccess ? (
              /* State C: Already Synced Mode */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-700 dark:text-blue-400">
                      Already Synced to Google Contacts
                    </h4>
                    <p className="text-xs text-blue-600/90 dark:text-blue-300/90 mt-1 leading-relaxed">
                      This lead is already safely synchronized to your Google Contacts portfolio under your connected Google account.
                    </p>
                  </div>
                </div>

                {/* Account & Sync Details Card */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#201E1B] border border-[#E8E5DF] dark:border-[#2C2926] shadow-2xs space-y-3">
                  <div className="flex items-center justify-between text-xs py-1 border-b border-[#F0ECE1] dark:border-[#2A2724]">
                    <span className="text-[#7A756D] dark:text-[#9E988F]">Connected Google Account</span>
                    <span className="font-semibold text-[#1A1816] dark:text-[#F4F2ED]">
                      {connectedEmail || 'Authorized Account'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-b border-[#F0ECE1] dark:border-[#2A2724]">
                    <span className="text-[#7A756D] dark:text-[#9E988F]">Contact Name</span>
                    <span className="font-semibold text-[#1A1816] dark:text-[#F4F2ED]">
                      {lead.name || 'Lead ' + lead.phone}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-b border-[#F0ECE1] dark:border-[#2A2724]">
                    <span className="text-[#7A756D] dark:text-[#9E988F]">Phone Number</span>
                    <span className="font-mono font-medium text-[#1A1816] dark:text-[#F4F2ED]">
                      {lead.phone}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-[#7A756D] dark:text-[#9E988F]">Last Synced</span>
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                      {formattedSyncDate}
                    </span>
                  </div>
                </div>

                {/* Target Label Dropdown for Re-sync */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#403C36] dark:text-[#C8C3BA] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-blue-500" />
                      Contact Label / Group
                    </span>
                    <span className="text-[11px] text-[#7A756D] dark:text-[#9E988F]">
                      Optional: Switch label and re-sync
                    </span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedLabelId}
                      onChange={(e) => setSelectedLabelId(e.target.value)}
                      className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#201E1B] border border-[#E8E5DF] dark:border-[#2C2926] text-xs font-medium text-[#1A1816] dark:text-[#F4F2ED] focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 pr-9 cursor-pointer shadow-2xs"
                    >
                      {labels.length === 0 ? (
                        <option value="">Default Google Contacts</option>
                      ) : (
                        labels.map((grp) => (
                          <option key={grp.id} value={grp.id}>
                            {grp.name} ({grp.memberCount} contacts)
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#7A756D] dark:text-[#9E988F] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                    {errorMessage}
                  </div>
                )}

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-[#E8E5DF] dark:border-[#2C2926] bg-white dark:bg-[#201E1B] hover:bg-[#FAF8F5] dark:hover:bg-[#2C2926] text-xs font-semibold text-[#403C36] dark:text-[#C8C3BA] transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Re-syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        Update / Re-Sync
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* State B: Connected & Ready to Sync (or Just Synced) */
              <div className="space-y-4">
                {/* Connected Account Banner */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#201E1B] border border-[#E8E5DF] dark:border-[#2C2926] flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                    <div>
                      <p className="text-[11px] font-medium text-[#7A756D] dark:text-[#9E988F]">
                        Connected Google Account
                      </p>
                      <p className="text-xs font-bold text-[#1A1816] dark:text-[#F4F2ED]">
                        {connectedEmail || 'Google Contacts Authorized'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>

                {/* Lead Summary Card */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#201E1B] border border-[#E8E5DF] dark:border-[#2C2926] shadow-2xs space-y-2.5">
                  <div className="flex items-center gap-2 text-xs text-[#1A1816] dark:text-[#F4F2ED]">
                    <User className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-[#7A756D] dark:text-[#9E988F]">Name:</span>
                    <strong className="font-semibold">{lead.name || 'Unnamed Client'}</strong>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#1A1816] dark:text-[#F4F2ED]">
                    <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-[#7A756D] dark:text-[#9E988F]">Phone:</span>
                    <strong className="font-mono">{lead.phone}</strong>
                  </div>
                  {lead.source && (
                    <div className="flex items-center gap-2 text-xs text-[#1A1816] dark:text-[#F4F2ED]">
                      <Tag className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-[#7A756D] dark:text-[#9E988F]">Source:</span>
                      <span>{lead.source}</span>
                    </div>
                  )}
                </div>

                {/* Target Contact Label Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#403C36] dark:text-[#C8C3BA] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-blue-500" />
                      Select Target Contact Label
                    </span>
                    <span className="text-[11px] text-[#7A756D] dark:text-[#9E988F]">
                      Google People Group
                    </span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedLabelId}
                      onChange={(e) => setSelectedLabelId(e.target.value)}
                      className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#201E1B] border border-[#E8E5DF] dark:border-[#2C2926] text-xs font-medium text-[#1A1816] dark:text-[#F4F2ED] focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 pr-9 cursor-pointer shadow-2xs"
                    >
                      {labels.length === 0 ? (
                        <option value="">Default Google Contacts</option>
                      ) : (
                        labels.map((grp) => (
                          <option key={grp.id} value={grp.id}>
                            {grp.name} ({grp.memberCount} contacts)
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#7A756D] dark:text-[#9E988F] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Success Banner */}
                {syncSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    Lead successfully synced to Google Contacts!
                  </motion.div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                    {errorMessage}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 px-4 rounded-2xl border border-[#E8E5DF] dark:border-[#2C2926] bg-white dark:bg-[#201E1B] hover:bg-[#FAF8F5] dark:hover:bg-[#2C2926] text-xs font-semibold text-[#403C36] dark:text-[#C8C3BA] transition-colors cursor-pointer"
                  >
                    {syncSuccess ? 'Done' : 'Cancel'}
                  </button>

                  <button
                    onClick={handleSync}
                    disabled={isSyncing || syncSuccess}
                    className={`flex-1 py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                      syncSuccess
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                    }`}
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Syncing Contact...
                      </>
                    ) : syncSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Synced to Google ✓
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        Sync Contact Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
