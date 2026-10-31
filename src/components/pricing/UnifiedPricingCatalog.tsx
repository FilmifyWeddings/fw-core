'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, X, Sparkles, ShieldCheck, Zap, Crown, 
  ArrowRight, Images, Briefcase, HelpCircle, ChevronDown, ChevronUp, CheckCircle2, Lock
} from 'lucide-react';
import { 
  GALLERY_PLANS, 
  CRM_PLANS, 
  GALLERY_FEATURE_MATRIX, 
  CRM_FEATURE_MATRIX, 
  SubscriptionTier, 
  FeatureMatrixItem 
} from '@/lib/billing/plans';

export interface UnifiedPricingCatalogProps {
  variant?: 'page' | 'landing' | 'modal';
  defaultTab?: 'gallery' | 'crm';
  currentPlanId?: string;
  onSelectPlan?: (plan: SubscriptionTier, billingCycle: 'monthly' | '6months' | 'yearly') => void;
  onStartTrial?: (plan: SubscriptionTier) => void;
}

export default function UnifiedPricingCatalog({
  variant = 'page',
  defaultTab = 'gallery',
  currentPlanId,
  onSelectPlan,
  onStartTrial,
}: UnifiedPricingCatalogProps) {
  const [activeTab, setActiveTab] = useState<'gallery' | 'crm'>(defaultTab);

  // Gallery billing: strictly '6months' or 'yearly' (NO 1-month)
  const [galleryCycle, setGalleryCycle] = useState<'6months' | 'yearly'>('yearly');

  // CRM billing: 'monthly' or 'yearly'
  const [crmCycle, setCrmCycle] = useState<'monthly' | 'yearly'>('yearly');

  // State for dynamic plans
  const [galleryPlans, setGalleryPlans] = useState<SubscriptionTier[]>(GALLERY_PLANS);
  const [crmPlans, setCrmPlans] = useState<SubscriptionTier[]>(CRM_PLANS);
  const [galleryMatrix, setGalleryMatrix] = useState<FeatureMatrixItem[]>(GALLERY_FEATURE_MATRIX);
  const [crmMatrix, setCrmMatrix] = useState<FeatureMatrixItem[]>(CRM_FEATURE_MATRIX);
  const [isLoading, setIsLoading] = useState(false);
  const [isMatrixExpanded, setIsMatrixExpanded] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadDynamicPricing() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/billing/plans');
        if (res.ok) {
          const json = await res.json();
          if (json?.success && isMounted) {
            if (Array.isArray(json.galleryPlans) && json.galleryPlans.length > 0) {
              setGalleryPlans(json.galleryPlans);
            }
            if (Array.isArray(json.crmPlans) && json.crmPlans.length > 0) {
              setCrmPlans(json.crmPlans);
            }
            if (Array.isArray(json.galleryMatrix) && json.galleryMatrix.length > 0) {
              setGalleryMatrix(json.galleryMatrix);
            }
            if (Array.isArray(json.crmMatrix) && json.crmMatrix.length > 0) {
              setCrmMatrix(json.crmMatrix);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load dynamic plans, using static catalog:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadDynamicPricing();
    return () => { isMounted = false; };
  }, []);

  const handleAction = (plan: SubscriptionTier) => {
    const cycle = activeTab === 'gallery' ? galleryCycle : crmCycle;
    if (onSelectPlan) {
      onSelectPlan(plan, cycle);
    } else if (onStartTrial) {
      onStartTrial(plan);
    } else {
      window.location.href = `/login?plan=${encodeURIComponent(plan.id)}&cycle=${cycle}`;
    }
  };

  const isModal = variant === 'modal';

  return (
    <div className={`w-full ${isModal ? 'p-2' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}`}>
      
      {/* ── TOP NAV TABS (Client Gallery vs Photography CRM) ── */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex p-1.5 rounded-full bg-stone-100/90 border border-stone-200/80 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('gallery')}
            className={`relative flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-black transition-all duration-200 cursor-pointer select-none ${
              activeTab === 'gallery'
                ? 'text-amber-950 shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            {activeTab === 'gallery' && (
              <motion.div
                layoutId="pricingTabPill"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                className="absolute inset-0 bg-white rounded-full border border-amber-300 shadow-sm"
              />
            )}
            <Images className={`relative z-10 w-4 h-4 ${activeTab === 'gallery' ? 'text-amber-600' : 'text-stone-400'}`} />
            <span className="relative z-10">Client Gallery</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('crm')}
            className={`relative flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-black transition-all duration-200 cursor-pointer select-none ${
              activeTab === 'crm'
                ? 'text-amber-950 shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            {activeTab === 'crm' && (
              <motion.div
                layoutId="pricingTabPill"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                className="absolute inset-0 bg-white rounded-full border border-amber-300 shadow-sm"
              />
            )}
            <Briefcase className={`relative z-10 w-4 h-4 ${activeTab === 'crm' ? 'text-amber-600' : 'text-stone-400'}`} />
            <span className="relative z-10">Photography CRM</span>
          </button>
        </div>
      </div>

      {/* ── BILLING DURATION TOGGLE ── */}
      <div className="flex flex-col items-center justify-center mb-10">
        {activeTab === 'gallery' ? (
          // Strictly 6 Months vs Annual (NO 1 Month)
          <div className="inline-flex items-center gap-3 p-1 rounded-full bg-stone-100 border border-stone-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setGalleryCycle('6months')}
              className={`px-5 py-1.5 rounded-full transition-all cursor-pointer ${
                galleryCycle === '6months'
                  ? 'bg-white text-stone-900 shadow-xs font-black'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              6 Months
            </button>
            <button
              type="button"
              onClick={() => setGalleryCycle('yearly')}
              className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full transition-all cursor-pointer ${
                galleryCycle === 'yearly'
                  ? 'bg-white text-stone-900 shadow-xs font-black'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <span>Annual</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                Save 20%
              </span>
            </button>
          </div>
        ) : (
          // CRM: Monthly vs Annual
          <div className="inline-flex items-center gap-3 p-1 rounded-full bg-stone-100 border border-stone-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setCrmCycle('monthly')}
              className={`px-5 py-1.5 rounded-full transition-all cursor-pointer ${
                crmCycle === 'monthly'
                  ? 'bg-white text-stone-900 shadow-xs font-black'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCrmCycle('yearly')}
              className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full transition-all cursor-pointer ${
                crmCycle === 'yearly'
                  ? 'bg-white text-stone-900 shadow-xs font-black'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <span>Annual</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                Save 17%
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ── 4 CARDS: CLIENT GALLERY OR 3 CARDS: CRM ── */}
      <AnimatePresence mode="wait">
        {activeTab === 'gallery' ? (
          <motion.div
            key="gallery-plans-grid"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch mb-14"
          >
            {galleryPlans.map((plan) => {
              const isRecommended = Boolean(plan.recommended || plan.popular);
              const isCurrent = currentPlanId === plan.id;

              // Calculate price based on duration
              let displayMonthly = plan.perMonthDisplayPrice ?? plan.priceMonthly;
              let billingNote = 'billed annually';
              if (galleryCycle === '6months' && plan.price6Months && plan.price6Months > 0) {
                displayMonthly = Math.round(plan.price6Months / 6);
                billingNote = `₹${plan.price6Months.toLocaleString('en-IN')} billed for 6 months`;
              } else if (plan.priceYearly > 0) {
                billingNote = `₹${plan.priceYearly.toLocaleString('en-IN')} billed annually`;
              } else {
                billingNote = 'Free forever';
              }

              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-6 transition-all duration-300 relative flex flex-col justify-between ${
                    isRecommended
                      ? 'bg-gradient-to-b from-white via-amber-50/20 to-amber-100/30 border-2 border-amber-400 shadow-xl shadow-amber-500/10 lg:-translate-y-2'
                      : 'bg-white border border-stone-200 hover:border-stone-300 shadow-sm hover:shadow-md'
                  }`}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                      {plan.badge || 'RECOMMENDED'}
                    </div>
                  )}

                  <div>
                    <h3 className="text-xl font-black text-stone-900">{plan.name}</h3>
                    <p className="text-[11px] text-stone-500 mt-1 min-h-[32px] leading-tight">
                      {plan.tagline}
                    </p>

                    {/* Price Header */}
                    <div className="mt-5 pb-5 border-b border-stone-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-stone-900 font-mono">
                          ₹{displayMonthly.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-stone-400 font-bold">/mo</span>
                      </div>
                      <p className="text-[10px] font-bold text-stone-400 mt-0.5">
                        {billingNote}
                      </p>
                    </div>

                    {/* Features list */}
                    <div className="mt-5 space-y-2.5">
                      <p className="text-[10px] font-black uppercase text-stone-400 tracking-wider">
                        Included:
                      </p>
                      {plan.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2 text-xs">
                          {feat.included ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0 stroke-[2.5]" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-stone-300 mt-0.5 shrink-0" />
                          )}
                          <span
                            className={`${
                              feat.included
                                ? feat.highlight
                                  ? 'text-stone-900 font-black'
                                  : 'text-stone-700 font-medium'
                                : 'text-stone-400 line-through'
                            }`}
                          >
                            {feat.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Action */}
                  <div className="mt-8">
                    <button
                      type="button"
                      disabled={isCurrent}
                      onClick={() => handleAction(plan)}
                      className={`w-full py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                        isCurrent
                          ? 'bg-stone-100 text-stone-400 cursor-default'
                          : isRecommended
                          ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md shadow-amber-500/20 hover:scale-[1.02]'
                          : 'bg-stone-900 hover:bg-stone-800 text-white'
                      }`}
                    >
                      <span>
                        {isCurrent
                          ? 'Current Active Plan'
                          : plan.priceYearly === 0
                          ? 'Get Started Free'
                          : 'Start Free Trial'}
                      </span>
                      {!isCurrent && <ArrowRight className="w-3.5 h-3.5" />}
                    </button>
                    <p className="text-[9px] text-center text-stone-400 mt-2 font-medium">
                      14-Day Free Access • No Card Required
                    </p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="crm-plans-grid"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mb-14"
          >
            {crmPlans.map((plan) => {
              const isRecommended = Boolean(plan.recommended || plan.popular);
              const isCurrent = currentPlanId === plan.id;

              const displayMonthly =
                crmCycle === 'yearly' && plan.priceYearly > 0
                  ? Math.round(plan.priceYearly / 12)
                  : plan.priceMonthly;

              const billingNote =
                crmCycle === 'yearly' && plan.priceYearly > 0
                  ? `₹${plan.priceYearly.toLocaleString('en-IN')} billed annually`
                  : 'billed monthly';

              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-7 transition-all duration-300 relative flex flex-col justify-between ${
                    isRecommended
                      ? 'bg-gradient-to-b from-white via-amber-50/20 to-amber-100/30 border-2 border-amber-400 shadow-xl shadow-amber-500/10 lg:-translate-y-2'
                      : 'bg-white border border-stone-200 hover:border-stone-300 shadow-sm hover:shadow-md'
                  }`}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                      {plan.badge || 'MOST POPULAR'}
                    </div>
                  )}

                  <div>
                    <h3 className="text-xl font-black text-stone-900">{plan.name}</h3>
                    <p className="text-[11px] text-stone-500 mt-1 min-h-[32px] leading-tight">
                      {plan.tagline}
                    </p>

                    {/* Price Header */}
                    <div className="mt-5 pb-5 border-b border-stone-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-stone-900 font-mono">
                          ₹{displayMonthly.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-stone-400 font-bold">/mo</span>
                      </div>
                      <p className="text-[10px] font-bold text-stone-400 mt-0.5">
                        {billingNote}
                      </p>
                    </div>

                    {/* Features list */}
                    <div className="mt-5 space-y-2.5">
                      <p className="text-[10px] font-black uppercase text-stone-400 tracking-wider">
                        Included Features:
                      </p>
                      {plan.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2 text-xs">
                          {feat.included ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0 stroke-[2.5]" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                          )}
                          <span
                            className={`${
                              feat.included
                                ? feat.highlight
                                  ? 'text-stone-900 font-black'
                                  : 'text-stone-700 font-medium'
                                : 'text-stone-400 font-medium'
                            }`}
                          >
                            {feat.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Action */}
                  <div className="mt-8">
                    <button
                      type="button"
                      disabled={isCurrent}
                      onClick={() => handleAction(plan)}
                      className={`w-full py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                        isCurrent
                          ? 'bg-stone-100 text-stone-400 cursor-default'
                          : isRecommended
                          ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md shadow-amber-500/20 hover:scale-[1.02]'
                          : 'bg-stone-900 hover:bg-stone-800 text-white'
                      }`}
                    >
                      <span>
                        {isCurrent ? 'Current Active Plan' : 'Start 14-Day Free Trial'}
                      </span>
                      {!isCurrent && <ArrowRight className="w-3.5 h-3.5" />}
                    </button>
                    <p className="text-[9px] text-center text-stone-400 mt-2 font-medium">
                      Full access to all modules for 14 days • Cancel anytime
                    </p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DETAILED FEATURE COMPARISON MATRIX ("Compare every feature") ── */}
      <div className="mt-12 rounded-3xl bg-white border border-stone-200 overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setIsMatrixExpanded(!isMatrixExpanded)}
          className="w-full flex items-center justify-between p-6 bg-stone-50/80 hover:bg-stone-100/80 border-b border-stone-200 transition cursor-pointer text-left"
        >
          <div>
            <h4 className="text-base font-black text-stone-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Compare Every Feature in Detail
            </h4>
            <p className="text-xs text-stone-500 mt-0.5">
              Comprehensive breakdown of limits, storage quotas, and capabilities across all tiers.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-stone-600">
            <span>{isMatrixExpanded ? 'Hide Matrix' : 'Show Matrix'}</span>
            {isMatrixExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isMatrixExpanded && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/50">
                  <th className="py-4 px-6 font-black uppercase text-[10px] text-stone-500 tracking-wider min-w-[200px]">
                    Features &amp; Capabilities
                  </th>
                  {activeTab === 'gallery'
                    ? galleryPlans.map((p) => (
                        <th
                          key={p.id}
                          className={`py-4 px-5 font-black text-center min-w-[120px] ${
                            p.popular || p.recommended ? 'bg-amber-50/70 text-amber-950 font-black' : 'text-stone-800'
                          }`}
                        >
                          <div className="text-xs">{p.name}</div>
                          <div className="text-[10px] text-stone-400 font-normal">
                            ₹{(p.perMonthDisplayPrice ?? p.priceMonthly).toLocaleString('en-IN')}/mo
                          </div>
                        </th>
                      ))
                    : crmPlans.map((p) => (
                        <th
                          key={p.id}
                          className={`py-4 px-6 font-black text-center min-w-[140px] ${
                            p.popular || p.recommended ? 'bg-amber-50/70 text-amber-950 font-black' : 'text-stone-800'
                          }`}
                        >
                          <div className="text-xs">{p.name}</div>
                          <div className="text-[10px] text-stone-400 font-normal">
                            ₹{p.priceMonthly.toLocaleString('en-IN')}/mo
                          </div>
                        </th>
                      ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {(activeTab === 'gallery' ? galleryMatrix : crmMatrix).map((row, rIdx) => {
                  const plansList = activeTab === 'gallery' ? galleryPlans : crmPlans;
                  return (
                    <tr
                      key={rIdx}
                      className={rIdx % 2 === 0 ? 'bg-white' : 'bg-stone-50/30 hover:bg-stone-50'}
                    >
                      <td className="py-3 px-6 text-stone-800 font-bold">
                        <div className="flex items-center gap-1.5">
                          <span>{row.feature}</span>
                          <span className="text-[9px] text-stone-400 font-normal">
                            ({row.category})
                          </span>
                        </div>
                      </td>
                      {plansList.map((plan) => {
                        const val = row.values[plan.id];
                        const isRec = plan.popular || plan.recommended;

                        return (
                          <td
                            key={plan.id}
                            className={`py-3 px-4 text-center font-bold ${
                              isRec ? 'bg-amber-50/40 text-amber-950 font-extrabold' : 'text-stone-700'
                            }`}
                          >
                            {typeof val === 'boolean' ? (
                              val ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                              ) : (
                                <span className="text-stone-300 font-mono text-sm">—</span>
                              )
                            ) : val !== undefined ? (
                              <span className="text-[11px] font-mono">{val}</span>
                            ) : (
                              <span className="text-stone-300 font-mono text-sm">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
