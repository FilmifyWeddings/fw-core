'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Crown, Plus, Edit3, Copy, RefreshCw, CheckCircle2, ShieldAlert, 
  ArrowLeft, Eye, Layers, Sparkles, AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isSuperAdmin } from '@/lib/auth/admin-guard';
import QuotationDocumentCanvas from '@/components/QuotationDocumentCanvas';
import { DEFAULT_AIRY_PROPOSAL, normalizeQuotationData } from '@/lib/quotation-defaults';

interface SystemTemplateItem {
  id: string;
  title: string;
  category: string;
  is_system_template: boolean;
  is_global_default: boolean;
  status: 'published' | 'draft' | 'archived';
  created_at: string;
  updated_at: string;
  document_json?: any;
}

export default function AdminSystemTemplatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [templates, setTemplates] = useState<SystemTemplateItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    async function loadAdminTemplates() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userEmail = session?.user?.email;

        if (!isSuperAdmin(userEmail)) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setIsAdmin(true);

        const token = session?.access_token || '';
        const res = await fetch('/api/admin/quotation-templates', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.status === 403) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const json = await res.json();
        if (res.ok && json.success) {
          const tmpls = json.templates || [];
          const enriched = await Promise.all(tmpls.map(async (t: any) => {
            const docRes = await fetch(`/api/admin/quotation-templates/${t.id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (docRes.ok) {
              const docJson = await docRes.json();
              return { ...t, document_json: docJson.document?.content_json || docJson.document?.document_json };
            }
            return t;
          }));
          setTemplates(enriched);
        }
      } catch (err) {
        console.error('[Admin Templates Load Error]:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAdminTemplates();
  }, []);

  const handleCreateSystemTemplate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/quotation-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          title: 'System Default Wedding Template',
          category: 'Wedding'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create system template');

      showToast('New System Template created successfully');
      router.push(`/admin/workspace/quotations/builder/templet/${data.newSystemId}`);
    } catch (err: any) {
      alert('Error creating system template: ' + (err.message || 'Unknown error'));
    } finally {
      setCreating(false);
    }
  };

  const handleSetGlobalDefault = async (tmpl: SystemTemplateItem) => {
    setActionId(tmpl.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/quotation-templates/${tmpl.id}/set-global-default`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set global default');

      setTemplates(prev => prev.map(t => ({
        ...t,
        is_global_default: t.id === tmpl.id,
        status: t.id === tmpl.id ? 'published' : t.status
      })));

      showToast(`'${tmpl.title}' is now the Global Default System Template across the platform.`);
    } catch (err: any) {
      alert('Error setting global default: ' + (err.message || 'Unknown error'));
    } finally {
      setActionId(null);
    }
  };

  const handleDuplicateSystemTemplate = async (tmpl: SystemTemplateItem) => {
    setActionId(tmpl.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/quotation-templates/${tmpl.id}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to duplicate system template');

      if (data.newSystemId) {
        showToast('System Template duplicated successfully. Opening builder...');
        router.push(`/admin/workspace/quotations/builder/templet/${data.newSystemId}`);
      }
    } catch (err: any) {
      alert('Error duplicating system template: ' + (err.message || 'Unknown error'));
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E0D0C] text-white flex flex-col items-center justify-center p-6">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mb-4" />
        <p className="text-sm font-bold text-zinc-400">Loading System Templates Panel...</p>
      </div>
    );
  }

  // 403 ACCESS DENIED GUARD FOR NON-ADMIN USERS
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-[#0E0D0C] text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-6 shadow-2xl">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white mb-2">403 — Access Denied</h1>
        <p className="text-sm text-zinc-400 max-w-md mb-8">
          The System Templates Panel is strictly restricted to authorized Super Admins.
        </p>
        <Link
          href="/workspace/quotations"
          className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Workspace Quotations</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0908] text-white p-8">
      {/* Toast Notification */}
      {toastMsg && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl bg-amber-500 text-black font-black text-xs shadow-2xl flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>{toastMsg}</span>
        </motion.div>
      )}

      {/* Admin Header */}
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 fill-amber-400" />
                <span>SUPER ADMIN PANEL</span>
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">System Quotation Templates</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Manage platform system presets, set the Global Default for new users, and duplicate designs.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCreateSystemTemplate}
            disabled={creating}
            className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-xl cursor-pointer disabled:opacity-50"
          >
            {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>Create System Template</span>
          </button>
        </div>

        {/* System Templates Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {templates.map((tmpl) => {
            const docData = normalizeQuotationData(tmpl.document_json || DEFAULT_AIRY_PROPOSAL);
            const isProcessing = actionId === tmpl.id;

            return (
              <div
                key={tmpl.id}
                className={`relative rounded-3xl bg-[#141312] border transition-all duration-300 flex flex-col overflow-hidden shadow-2xl ${
                  tmpl.is_global_default
                    ? 'border-amber-500/80 ring-2 ring-amber-500/30'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* PROMINENT TOP-RIGHT GLOBAL DEFAULT BADGE */}
                {tmpl.is_global_default && (
                  <div className="absolute top-3 right-3 z-20 px-3 py-1 rounded-full bg-amber-500 text-black font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-xl border border-amber-400">
                    <Crown className="w-3.5 h-3.5 fill-black" />
                    <span>GLOBAL DEFAULT</span>
                  </div>
                )}

                {/* Canvas Live Preview Card Header */}
                <div className="relative aspect-[3/4] bg-[#0E0D0C] overflow-hidden flex items-center justify-center p-4 border-b border-zinc-800/80">
                  <div className="transform scale-[0.38] origin-center pointer-events-none shadow-2xl">
                    <QuotationDocumentCanvas documentData={docData} onlyFirstPage={true} />
                  </div>
                </div>

                {/* Card Info & Controls */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-lg font-black text-white truncate">{tmpl.title}</h3>
                      <span className="text-[10px] font-mono text-zinc-500">{tmpl.id}</span>
                    </div>
                    <p className="text-xs text-zinc-400">{tmpl.category || 'Wedding'}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {!tmpl.is_global_default ? (
                      <button
                        type="button"
                        onClick={() => handleSetGlobalDefault(tmpl)}
                        disabled={isProcessing}
                        className="w-full py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        <span>Set as Global Default</span>
                      </button>
                    ) : (
                      <div className="w-full py-2.5 px-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold text-xs flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active Global Default</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/workspace/quotations/builder/templet/${tmpl.id}`)}
                        className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Edit Template</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicateSystemTemplate(tmpl)}
                        disabled={isProcessing}
                        className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Copy className="w-3.5 h-3.5 text-blue-400" />
                        <span>Duplicate</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
