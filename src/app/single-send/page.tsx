'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SingleSendPage() {
  const [phone, setPhone] = useState('');
  const [template, setTemplate] = useState('');
  const [variables, setVariables] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setSending(true);
    setSuccess(null);
    
    setTimeout(() => {
      setSending(false);
      setSuccess(`Message successfully sent to ${phone}!`);
      setPhone('');
      setVariables('');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#070708] text-zinc-900 dark:text-white p-8 transition-colors duration-200">
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Single Send Dispatch</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Send a direct template message to any custom contact manually</p>
        </div>

        <form onSubmit={handleSend} className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md shadow-xl space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Recipient Phone Number</label>
            <input 
              type="text" 
              placeholder="+91 99999 99999" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 text-xs rounded-xl focus:outline-none focus:border-zinc-300 dark:focus:border-zinc-700"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Select Template</label>
            <select 
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 text-xs rounded-xl focus:outline-none"
            >
              <option value="welcome_drip">welcome_drip (Approved)</option>
              <option value="followup_lead">followup_lead (Approved)</option>
              <option value="feedback_survey">feedback_survey (Pending)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Variables Mapping (Comma Separated)</label>
            <input 
              type="text" 
              placeholder="e.g. Sushant, 15 Dec" 
              value={variables}
              onChange={(e) => setVariables(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 text-xs rounded-xl focus:outline-none"
            />
          </div>

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            className="w-full py-2.5 bg-gradient-to-r from-orange-400 to-amber-500 text-black text-xs font-bold rounded-xl shadow-lg shadow-orange-500/10 hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? 'Sending...' : 'Dispatch Message'}
          </button>
        </form>
      </div>
    </div>
  );
}
