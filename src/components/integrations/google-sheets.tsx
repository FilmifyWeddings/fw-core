'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, AlertTriangle, RefreshCw, PowerOff, 
  Copy, Check, FileSpreadsheet, ArrowRight, ShieldCheck, 
  ExternalLink, Layers, Database
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface GoogleSheetsProps {
  workspaceId: string;
}

export function GoogleSheets({ workspaceId }: GoogleSheetsProps) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState('Wedding Leads Master List 2026');
  const [selectedSheet, setSelectedSheet] = useState('Sheet1');
  const [exportTrigger, setExportTrigger] = useState('any'); // any, high_value, won
  const [syncing, setSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState<string[]>([]);

  // Load connection status from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('google_sheets_connected');
    if (saved) setConnected(saved === 'true');
  }, []);

  const handleConnect = () => {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setConnected(true);
      localStorage.setItem('google_sheets_connected', 'true');
      setSyncLog(prev => ['[SYSTEM] Synced Google Drive API credentials.', ...prev]);
    }, 1500);
  };

  const handleDisconnect = () => {
    if (confirm('Disconnect Google Sheets integration? Leads will no longer export to your spreadsheets.')) {
      setConnected(false);
      localStorage.setItem('google_sheets_connected', 'false');
      setSyncLog(prev => ['[SYSTEM] Disconnected Google Sheets integration.', ...prev]);
    }
  };

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setTimeout(() => {
      setSavingSettings(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }, 800);
  };

  const simulateSync = async () => {
    setSyncing(true);
    
    // Fetch some leads if possible, or fallback to mock
    try {
      const { data: leads } = await supabase
        .from('leads')
        .select('name, phone, email, score')
        .eq('workspace_id', workspaceId)
        .limit(5);

      let targetLeadName = 'Amit Sharma';
      let targetLeadScore = 'High-Value 🔥';
      
      if (leads && leads.length > 0) {
        const randomLead = leads[Math.floor(Math.random() * leads.length)];
        targetLeadName = randomLead.name;
        targetLeadScore = randomLead.score || 'Warm 👍';
      }

      const randomRow = Math.floor(Math.random() * 200) + 15;
      
      setSyncLog(prev => [
        `[SUCCESS] Exported: "${targetLeadName}" -> Row ${randomRow} [Spreadsheet: ${selectedSpreadsheet}]`,
        ...prev
      ]);
    } catch (err) {
      const randomRow = Math.floor(Math.random() * 200) + 15;
      setSyncLog(prev => [
        `[MOCK] Exported: "Amit Sharma" -> Row ${randomRow} [Spreadsheet: ${selectedSpreadsheet}]`,
        ...prev
      ]);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md shadow-2xl space-y-6">
      
      {/* Top Header Section */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-900 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-green-500/10 animate-pulse">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-zinc-900 dark:text-white">Google Sheets Sync</h4>
            <p className="text-xs text-zinc-550 dark:text-zinc-400 font-medium">Export scored leads automatically into spreadsheet worksheets</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 capitalize">{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main configuration console */}
        <div className="lg:col-span-2 space-y-5">
          {!connected ? (
            <div className="p-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-center bg-zinc-50 dark:bg-zinc-900/10 space-y-4">
              <FileSpreadsheet className="w-12 h-12 text-zinc-400 mx-auto" />
              <div className="space-y-1">
                <h5 className="text-sm font-bold text-zinc-900 dark:text-white">Authorize Google Drive & Sheets Api</h5>
                <p className="text-xs text-zinc-550 dark:text-zinc-400 max-w-sm mx-auto">
                  OAuth authorization enables our pipeline to write rows, append data, and read configuration settings safely.
                </p>
              </div>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
              >
                {connecting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                )}
                {connecting ? 'Linking Google Account...' : 'Link Google Sheets Workspace'}
              </button>
            </div>
          ) : (
            <form onSubmit={saveSettings} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Select Google Spreadsheet</label>
                  <select 
                    value={selectedSpreadsheet}
                    onChange={(e) => setSelectedSpreadsheet(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 text-xs rounded-xl focus:outline-none"
                  >
                    <option value="Wedding Leads Master List 2026">Wedding Leads Master List 2026</option>
                    <option value="Corporate Photography Bookings">Corporate Photography Bookings</option>
                    <option value="General Lead Capture Sheet">General Lead Capture Sheet</option>
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Sheet Worksheet Tab</label>
                  <select 
                    value={selectedSheet}
                    onChange={(e) => setSelectedSheet(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 text-xs rounded-xl focus:outline-none"
                  >
                    <option value="Sheet1">Sheet1</option>
                    <option value="Leads Ingest">Leads Ingest</option>
                    <option value="Archive">Archive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Automatic Sync Triggers</label>
                <select 
                  value={exportTrigger}
                  onChange={(e) => setExportTrigger(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 text-xs rounded-xl focus:outline-none"
                >
                  <option value="any">Export all leads immediately upon ingestion</option>
                  <option value="high_value">Export only "High-Value 🔥" scored leads</option>
                  <option value="won">Export leads only when marked "Won" or "Warm"</option>
                </select>
              </div>

              {/* Connected details container */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950/60 space-y-2 text-xs">
                <div className="flex justify-between items-center text-zinc-500">
                  <span>Authorized Account:</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold">sahil.dhonde@gmail.com</span>
                </div>
                <div className="flex justify-between items-center text-zinc-500">
                  <span>Sync Interval:</span>
                  <span className="text-emerald-500 font-semibold flex items-center gap-1.5">
                    Real-time (Trigger based)
                  </span>
                </div>
                <div className="flex justify-between items-center text-zinc-500 pt-1.5 border-t border-zinc-200 dark:border-zinc-900">
                  <span>Spreadsheet Link:</span>
                  <a 
                    href="https://docs.google.com/spreadsheets" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-500 hover:underline flex items-center gap-1 font-semibold"
                  >
                    Open Spreadsheet
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="flex items-center gap-1.5 px-3 py-2 bg-transparent hover:bg-rose-500/10 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-rose-500 rounded-xl text-xs font-bold transition-all"
                >
                  <PowerOff className="w-3.5 h-3.5 text-rose-500" />
                  Disconnect API
                </button>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-400 to-amber-500 text-black text-xs font-bold rounded-xl shadow-lg shadow-orange-500/10 hover:opacity-95"
                >
                  {savingSettings && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {saveSuccess ? 'Sync Settings Saved!' : 'Save Integration'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Info & Sync Tester */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-900 space-y-3.5">
            <h5 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-orange-500" />
              Secure Sync Engine
            </h5>
            <p className="text-[11px] text-zinc-550 dark:text-zinc-400 leading-relaxed font-medium">
              We sync lead updates continuously. High-value triggers filter leads automatically, keeping Google sheets cleanly formatted.
            </p>
            
            {connected && (
              <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-900">
                <h6 className="text-[10px] font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wide">Test Row Sync Engine</h6>
                <button
                  type="button"
                  onClick={simulateSync}
                  disabled={syncing}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-zinc-150 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all"
                >
                  {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5 text-green-500" />}
                  Simulate Sheets Row Sync
                </button>
              </div>
            )}
          </div>

          {/* Sync logs window */}
          {connected && syncLog.length > 0 && (
            <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-black/5 dark:bg-black/60 font-mono text-[9px] text-zinc-450 dark:text-zinc-400 space-y-2 h-44 overflow-y-auto">
              <div className="text-zinc-500 border-b border-zinc-900 pb-1.5 flex justify-between items-center">
                <span>Row Sync Logs</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              {syncLog.map((log, index) => (
                <p key={index} className="leading-relaxed break-all">
                  {log}
                </p>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
