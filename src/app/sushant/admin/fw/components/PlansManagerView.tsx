'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Check, X, Plus, Trash2, Save, RefreshCw, 
  HardDrive, Users, Calendar, Cpu, Crown, AlertCircle, 
  CheckCircle2, ShieldCheck, Tag, Coins, ArrowUpRight
} from 'lucide-react';

export interface AdminPlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

export interface AdminPlan {
  id: string;
  name: string;
  tagline: string;
  badge?: string;
  popular: boolean;
  priceMonthly: number;
  priceYearly: number;
  storageGB: number;
  teamSeats: number;
  eventsPerMonth: number;
  aiScans: number;
  isActive: boolean;
  features: AdminPlanFeature[];
}

export default function PlansManagerView() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [newFeatureText, setNewFeatureText] = useState<{ [planId: string]: string }>({});

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sushant/admin/fw/plans');
      if (!res.ok) throw new Error('Failed to fetch subscription plans');
      const data = await res.json();
      if (data.success && Array.isArray(data.plans)) {
        setPlans(data.plans);
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleUpdateField = (planId: string, field: keyof AdminPlan, value: any) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, [field]: value } : p))
    );
  };

  const handleFeatureToggle = (planId: string, index: number, field: 'included' | 'highlight') => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;
        const updatedFeatures = [...p.features];
        updatedFeatures[index] = {
          ...updatedFeatures[index],
          [field]: !updatedFeatures[index][field],
        };
        return { ...p, features: updatedFeatures };
      })
    );
  };

  const handleFeatureTextChange = (planId: string, index: number, text: string) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;
        const updatedFeatures = [...p.features];
        updatedFeatures[index] = { ...updatedFeatures[index], text };
        return { ...p, features: updatedFeatures };
      })
    );
  };

  const handleRemoveFeature = (planId: string, index: number) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;
        return {
          ...p,
          features: p.features.filter((_, i) => i !== index),
        };
      })
    );
  };

  const handleAddFeature = (planId: string) => {
    const text = (newFeatureText[planId] || '').trim();
    if (!text) return;

    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;
        return {
          ...p,
          features: [...p.features, { text, included: true, highlight: false }],
        };
      })
    );

    setNewFeatureText((prev) => ({ ...prev, [planId]: '' }));
  };

  const handleSavePlan = async (plan: AdminPlan) => {
    setSavingPlanId(plan.id);
    try {
      const res = await fetch('/api/sushant/admin/fw/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update plan');
      }

      showToast(`Plan "${plan.name}" updated successfully! Changes are live across all accounts.`);
    } catch (err: any) {
      showToast(err.message || 'Error saving plan', 'error');
    } finally {
      setSavingPlanId(null);
    }
  };

  const handleAddNewPlan = () => {
    const newId = `custom_${Date.now().toString().slice(-4)}`;
    const newPlan: AdminPlan = {
      id: newId,
      name: 'New Custom Tier',
      tagline: 'Customized features and limits for studio creators',
      badge: 'New Tier',
      popular: false,
      priceMonthly: 1299,
      priceYearly: 12999,
      storageGB: 80,
      teamSeats: 3,
      eventsPerMonth: 15,
      aiScans: 5000,
      isActive: true,
      features: [
        { text: '80 GB Backblaze B2 Storage', included: true, highlight: true },
        { text: '3 Crew Member Seats', included: true },
        { text: '15 Event Galleries / Month', included: true },
        { text: '5,000 AI Face Scans', included: true },
        { text: 'Client QR Guest Registration', included: true },
        { text: 'Digital Watermark Protection', included: true },
      ],
    };

    setPlans((prev) => [...prev, newPlan]);
  };

  if (loading) {
    return (
      <div className="py-24 text-center bg-white rounded-3xl border border-[#EAE5DA] shadow-xs">
        <RefreshCw className="w-8 h-8 animate-spin text-[#D9822B] mx-auto mb-3" />
        <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
          Loading SaaS Pricing Matrix & Plans...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-[200] max-w-md p-4 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-bold ${
              toastMsg.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700'
                : 'bg-rose-900 text-white border-rose-700'
            }`}
          >
            {toastMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-amber-500/10 via-[#FAF7F2] to-amber-500/5 rounded-3xl border border-[#EAE5DA]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-[#D9822B] to-[#C89435] text-white">
              SaaS Pricing & Quota Governance
            </span>
            <span className="text-xs text-zinc-400 font-bold">
              {plans.length} Tier{plans.length > 1 ? 's' : ''} Configured
            </span>
          </div>
          <h2 className="text-xl font-black text-[#1E2229] mt-2">
            Dynamic Plans & Feature Matrix Editor
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Prices, storage quotas, team limits, or features edited here are instantly synchronized across the user Upgrade Modal and Studio Settings in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchPlans}
            className="p-2.5 rounded-xl border border-[#EAE5DA] bg-white text-zinc-600 hover:text-zinc-900 hover:bg-[#FAF7F2] transition cursor-pointer"
            title="Reload from DB"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleAddNewPlan}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white font-bold text-xs hover:bg-zinc-800 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Custom Tier</span>
          </button>
        </div>
      </div>

      {/* Plans List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isSaving = savingPlanId === plan.id;
          const monthlyEquivalent = Math.round(plan.priceYearly / 12);
          const yearlyDiscountPercent = Math.round(
            ((plan.priceMonthly * 12 - plan.priceYearly) / (plan.priceMonthly * 12)) * 100
          );

          return (
            <div
              key={plan.id}
              className={`flex flex-col justify-between rounded-3xl bg-[#FFFDF9] border p-6 transition shadow-xs ${
                plan.popular
                  ? 'border-2 border-[#D9822B] shadow-[0_12px_30px_rgba(217,130,43,0.12)]'
                  : 'border-[#EAE5DA]'
              }`}
            >
              <div className="space-y-4">
                {/* Plan Header */}
                <div className="flex items-center justify-between gap-2 border-b border-[#EAE5DA] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                      ID: {plan.id}
                    </span>
                    {plan.popular && (
                      <span className="text-[10px] font-bold text-[#D9822B] flex items-center gap-0.5">
                        <Crown className="w-3 h-3 fill-[#D9822B]" />
                        Popular
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-bold text-zinc-500 cursor-pointer flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={plan.isActive}
                        onChange={(e) => handleUpdateField(plan.id, 'isActive', e.target.checked)}
                        className="rounded accent-[#D9822B]"
                      />
                      <span>Active</span>
                    </label>

                    <label className="text-[10px] font-bold text-zinc-500 cursor-pointer flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={plan.popular}
                        onChange={(e) => handleUpdateField(plan.id, 'popular', e.target.checked)}
                        className="rounded accent-[#D9822B]"
                      />
                      <span>Popular</span>
                    </label>
                  </div>
                </div>

                {/* Plan Name & Tagline Inputs */}
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-zinc-400 block mb-1">
                      Plan Title
                    </label>
                    <input
                      type="text"
                      value={plan.name}
                      onChange={(e) => handleUpdateField(plan.id, 'name', e.target.value)}
                      placeholder="e.g. Studio Pro"
                      className="w-full px-3 py-1.5 rounded-xl border border-[#EAE5DA] bg-white text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#D9822B]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-zinc-400 block mb-1">
                      Tagline / Pitch
                    </label>
                    <input
                      type="text"
                      value={plan.tagline}
                      onChange={(e) => handleUpdateField(plan.id, 'tagline', e.target.value)}
                      placeholder="e.g. Perfect for solo creators"
                      className="w-full px-3 py-1.5 rounded-xl border border-[#EAE5DA] bg-white text-xs font-medium text-zinc-700 focus:outline-none focus:border-[#D9822B]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-zinc-400 block mb-1">
                      Badge Text (Optional)
                    </label>
                    <input
                      type="text"
                      value={plan.badge || ''}
                      onChange={(e) => handleUpdateField(plan.id, 'badge', e.target.value)}
                      placeholder="e.g. Founder's Choice · Most Popular"
                      className="w-full px-3 py-1.5 rounded-xl border border-[#EAE5DA] bg-white text-xs font-medium text-zinc-700 focus:outline-none focus:border-[#D9822B]"
                    />
                  </div>
                </div>

                {/* Pricing Fields */}
                <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EAE5DA] space-y-2.5">
                  <div className="text-[11px] font-bold text-zinc-700 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-[#D9822B]" />
                      Pricing (INR)
                    </span>
                    {yearlyDiscountPercent > 0 && (
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {yearlyDiscountPercent}% Annual Savings
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-zinc-400 block mb-0.5">Monthly (₹)</span>
                      <input
                        type="number"
                        value={plan.priceMonthly}
                        onChange={(e) => handleUpdateField(plan.id, 'priceMonthly', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EAE5DA] bg-white text-xs font-black text-zinc-900 focus:outline-none focus:border-[#D9822B]"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-zinc-400 block mb-0.5">Yearly (₹)</span>
                      <input
                        type="number"
                        value={plan.priceYearly}
                        onChange={(e) => handleUpdateField(plan.id, 'priceYearly', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EAE5DA] bg-white text-xs font-black text-zinc-900 focus:outline-none focus:border-[#D9822B]"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-500">
                    Effective: ₹{monthlyEquivalent.toLocaleString('en-IN')}/mo on yearly plan.
                  </p>
                </div>

                {/* Resource Quotas Grid */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-zinc-400 block">
                    Resource Quotas & Limits
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl border border-[#EAE5DA] bg-white">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 mb-1">
                        <HardDrive className="w-3 h-3 text-[#D9822B]" />
                        <span>Storage (GB)</span>
                      </div>
                      <input
                        type="number"
                        value={plan.storageGB}
                        onChange={(e) => handleUpdateField(plan.id, 'storageGB', Number(e.target.value))}
                        className="w-full px-2 py-1 rounded border border-[#EAE5DA] text-xs font-bold text-zinc-900 focus:outline-none"
                      />
                    </div>

                    <div className="p-2.5 rounded-xl border border-[#EAE5DA] bg-white">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 mb-1">
                        <Users className="w-3 h-3 text-[#D9822B]" />
                        <span>Crew Seats</span>
                      </div>
                      <input
                        type="number"
                        value={plan.teamSeats}
                        onChange={(e) => handleUpdateField(plan.id, 'teamSeats', Number(e.target.value))}
                        className="w-full px-2 py-1 rounded border border-[#EAE5DA] text-xs font-bold text-zinc-900 focus:outline-none"
                      />
                    </div>

                    <div className="p-2.5 rounded-xl border border-[#EAE5DA] bg-white">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 mb-1">
                        <Calendar className="w-3 h-3 text-[#D9822B]" />
                        <span>Events / Mo</span>
                      </div>
                      <input
                        type="number"
                        value={plan.eventsPerMonth}
                        onChange={(e) => handleUpdateField(plan.id, 'eventsPerMonth', Number(e.target.value))}
                        className="w-full px-2 py-1 rounded border border-[#EAE5DA] text-xs font-bold text-zinc-900 focus:outline-none"
                      />
                    </div>

                    <div className="p-2.5 rounded-xl border border-[#EAE5DA] bg-white">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 mb-1">
                        <Cpu className="w-3 h-3 text-[#D9822B]" />
                        <span>AI Face Scans</span>
                      </div>
                      <input
                        type="number"
                        value={plan.aiScans}
                        onChange={(e) => handleUpdateField(plan.id, 'aiScans', Number(e.target.value))}
                        className="w-full px-2 py-1 rounded border border-[#EAE5DA] text-xs font-bold text-zinc-900 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Features Checklist Builder */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-extrabold uppercase text-zinc-400 block">
                      Feature Checklist ({plan.features.length})
                    </label>
                    <span className="text-[9px] text-zinc-400">
                      Check = Include | Star = Bold Highlight
                    </span>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1.5 p-1 scrollbar-thin">
                    {plan.features.map((feat, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-xs transition ${
                          feat.included
                            ? feat.highlight
                              ? 'bg-amber-50/70 border-amber-200'
                              : 'bg-white border-[#EAE5DA]'
                            : 'bg-zinc-50 border-zinc-200 opacity-60'
                        }`}
                      >
                        {/* Included checkbox */}
                        <button
                          type="button"
                          onClick={() => handleFeatureToggle(plan.id, idx, 'included')}
                          className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition cursor-pointer ${
                            feat.included
                              ? 'bg-emerald-600 text-white'
                              : 'bg-zinc-200 text-zinc-500'
                          }`}
                          title={feat.included ? 'Included (click to exclude)' : 'Excluded (click to include)'}
                        >
                          {feat.included ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
                        </button>

                        {/* Highlight checkbox */}
                        <button
                          type="button"
                          onClick={() => handleFeatureToggle(plan.id, idx, 'highlight')}
                          className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition cursor-pointer ${
                            feat.highlight
                              ? 'bg-amber-400 text-amber-950 font-black'
                              : 'bg-zinc-100 text-zinc-400 hover:text-amber-600'
                          }`}
                          title="Highlight in Gold"
                        >
                          <Sparkles className="w-3 h-3" />
                        </button>

                        {/* Feature text */}
                        <input
                          type="text"
                          value={feat.text}
                          onChange={(e) => handleFeatureTextChange(plan.id, idx, e.target.value)}
                          className={`flex-1 min-w-0 bg-transparent text-xs focus:outline-none ${
                            feat.highlight ? 'font-bold text-zinc-900' : 'text-zinc-700'
                          } ${!feat.included ? 'line-through text-zinc-400' : ''}`}
                        />

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(plan.id, idx)}
                          className="w-5 h-5 rounded text-zinc-400 hover:text-rose-600 flex items-center justify-center shrink-0 transition cursor-pointer"
                          title="Delete Feature"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add New Feature Row */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      value={newFeatureText[plan.id] || ''}
                      onChange={(e) =>
                        setNewFeatureText((prev) => ({ ...prev, [plan.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddFeature(plan.id);
                        }
                      }}
                      placeholder="Add feature e.g. 'Instant WhatsApp QR'..."
                      className="flex-1 px-3 py-1.5 rounded-xl border border-[#EAE5DA] bg-white text-xs text-zinc-900 focus:outline-none focus:border-[#D9822B]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddFeature(plan.id)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition cursor-pointer shrink-0"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Save Button */}
              <div className="pt-5 mt-4 border-t border-[#EAE5DA]">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSavePlan(plan)}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
                    plan.popular
                      ? 'bg-gradient-to-r from-[#D9822B] to-[#C89435] text-white hover:brightness-105'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800'
                  } ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Plan to DB...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes to {plan.name}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
