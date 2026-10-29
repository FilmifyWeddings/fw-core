'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, Sparkles, ShieldCheck, Zap, Crown, 
  ArrowRight, Loader2, CheckCircle2, Lock, HelpCircle 
} from 'lucide-react';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/lib/billing/plans';
import { openRazorpayCheckout } from '@/lib/billing/razorpay';

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanId?: string;
  userId?: string;
  onSuccess?: (planName: string) => void;
}

export default function UpgradePlanModal({
  isOpen,
  onClose,
  currentPlanId = 'trial',
  userId,
  onSuccess,
}: UpgradePlanModalProps) {
  const [tiers, setTiers] = useState<SubscriptionTier[]>(SUBSCRIPTION_TIERS);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    currentPlanId === 'trial' || currentPlanId === 'starter' ? 'pro' : currentPlanId
  );
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    planName: string;
    expiresAt: string;
    invoiceNumber: string;
  } | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    async function fetchDynamicPlans() {
      try {
        const res = await fetch('/api/billing/plans');
        if (res.ok) {
          const json = await res.json();
          if (json?.success && Array.isArray(json.plans) && json.plans.length > 0 && isMounted) {
            setTiers(json.plans);
          }
        }
      } catch (err) {
        console.warn('Using default billing plans', err);
      }
    }
    fetchDynamicPlans();
    return () => { isMounted = false; };
  }, []);

  if (!isOpen) return null;

  const selectedTier = tiers.find((t) => t.id === selectedPlanId) || tiers[1] || tiers[0];

  const handleCheckout = async (tier: SubscriptionTier) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Create Order
      const res = await fetch('/api/billing/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: tier.id,
          billingCycle,
          userId,
        }),
      });

      const orderData = await res.json();
      if (!res.ok || !orderData.success) {
        throw new Error(orderData.error || 'Failed to initialize payment gateway.');
      }

      // 2. If Demo Mode (No Razorpay live keys configured yet), simulate verification seamlessly
      if (orderData.demoMode) {
        const verifyRes = await fetch('/api/billing/razorpay/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: tier.id,
            billingCycle,
            userId,
            demo: true,
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: `pay_demo_${Date.now()}`,
          }),
        });

        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          setSuccessData({
            planName: tier.name,
            expiresAt: verifyData.plan?.expiresAt || '',
            invoiceNumber: verifyData.invoice?.invoiceNumber || '',
          });
          if (onSuccess) onSuccess(tier.name);
        } else {
          throw new Error(verifyData.error || 'Payment verification failed.');
        }
        setLoading(false);
        return;
      }

      // 3. Live Razorpay Modal
      await openRazorpayCheckout({
        keyId: orderData.keyId,
        orderId: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'StudioCore Creative Cloud',
        description: `${tier.name} (${billingCycle === 'yearly' ? 'Annual Plan' : 'Monthly'})`,
        prefill: orderData.prefill,
        onSuccess: async (rzpResponse) => {
          try {
            setLoading(true);
            const verifyRes = await fetch('/api/billing/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                planId: tier.id,
                billingCycle,
                userId,
                ...rzpResponse,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setSuccessData({
                planName: tier.name,
                expiresAt: verifyData.plan?.expiresAt || '',
                invoiceNumber: verifyData.invoice?.invoiceNumber || '',
              });
              if (onSuccess) onSuccess(tier.name);
            } else {
              setErrorMessage(verifyData.error || 'Payment recorded, but verification requires admin confirmation.');
            }
          } catch (err: any) {
            setErrorMessage(err.message || 'Error confirming payment signature.');
          } finally {
            setLoading(false);
          }
        },
        onDismiss: () => {
          setLoading(false);
        },
      });
    } catch (err: any) {
      console.error('[Checkout Error]:', err);
      setErrorMessage(err.message || 'Something went wrong during checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-[0_24px_60px_-15px_rgba(27,24,20,0.18)] p-6 sm:p-8 text-[#1E2229] my-auto scrollbar-thin"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#EAE5DA] text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Success Celebration View */}
          {successData ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 px-4 text-center max-w-md mx-auto"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-[#1E2229]">
                Upgrade Successful! 🎉
              </h2>
              <p className="text-sm text-zinc-600 mt-2">
                Your studio has been upgraded to <strong className="text-[#D9822B]">{successData.planName}</strong>. 
                All features, expanded storage, and crew quota are active immediately.
              </p>

              <div className="mt-6 p-4 rounded-2xl bg-[#FAF7F2] border border-[#EAE5DA] text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Invoice Number:</span>
                  <span className="font-mono font-semibold text-zinc-800">{successData.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Valid Through:</span>
                  <span className="font-semibold text-zinc-800">
                    {new Date(successData.expiresAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">GST SAC Code:</span>
                  <span className="font-mono text-zinc-800">998315 (IT SaaS)</span>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  window.location.reload();
                }}
                className="mt-8 w-full py-3 px-5 rounded-xl bg-gradient-to-r from-[#D9822B] to-[#C89435] text-white font-bold text-sm shadow-md hover:brightness-105 transition cursor-pointer"
              >
                Done & Return to Workspace
              </button>
            </motion.div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-[#D9822B] text-xs font-bold tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 fill-[#D9822B]" />
                  <span>STUDIO CLOUD PLANS</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1E2229]">
                  Supercharge Your Photography Business
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500">
                  Instant client QR delivery, ultra-fast RAW & JPG delivery, and crew operations. Scale effortlessly with zero hidden charges.
                </p>

                {/* Monthly / Yearly Toggle */}
                <div className="pt-3 flex items-center justify-center">
                  <div className="relative flex items-center bg-[#F2EDE4] p-1 rounded-2xl border border-[#E0D8CB]">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      className={`relative z-10 px-4 py-1.5 text-xs font-bold rounded-xl transition ${
                        billingCycle === 'monthly' ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      Monthly Billing
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('yearly')}
                      className={`relative z-10 px-4 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition ${
                        billingCycle === 'yearly' ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      <span>Yearly Billing</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300/80">
                        SAVE 17%
                      </span>
                    </button>

                    {/* Animated Sliding Pill */}
                    <motion.div
                      layout
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                      className={`absolute top-1 bottom-1 w-[48%] rounded-xl bg-white shadow-xs border border-[#EAE5DA] ${
                        billingCycle === 'monthly' ? 'left-1' : 'right-1'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium">
                  {errorMessage}
                </div>
              )}

              {/* Pricing Cards Grid */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
                {tiers.map((tier) => {
                  const isCurrent = currentPlanId === tier.id;
                  const isSelected = selectedPlanId === tier.id;
                  const price = billingCycle === 'yearly' ? tier.priceYearly : tier.priceMonthly;
                  const monthlyEquivalent = billingCycle === 'yearly' ? Math.round(tier.priceYearly / 12) : tier.priceMonthly;

                  return (
                    <div
                      key={tier.id}
                      onClick={() => setSelectedPlanId(tier.id)}
                      className={`relative flex flex-col justify-between rounded-3xl p-6 transition-all duration-200 cursor-pointer ${
                        tier.popular
                          ? 'bg-[#FCF9F3] border-2 border-[#D9822B] shadow-[0_12px_30px_rgba(217,130,43,0.12)]'
                          : 'bg-white border border-[#EAE5DA] hover:border-amber-300 shadow-xs'
                      } ${isSelected && !tier.popular ? 'ring-2 ring-amber-400' : ''}`}
                    >
                      {/* Popular Badge */}
                      {tier.badge && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                          <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-[#D9822B] to-[#C89435] text-white shadow-xs">
                            {tier.badge}
                          </span>
                        </div>
                      )}

                      <div>
                        {/* Header */}
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-lg font-black text-[#1E2229]">{tier.name}</h3>
                            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{tier.tagline}</p>
                          </div>
                          {tier.popular && <Crown className="w-5 h-5 text-[#D9822B] shrink-0" />}
                        </div>

                        {/* Price */}
                        <div className="my-5 pb-4 border-b border-[#EAE5DA]">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs font-semibold text-zinc-500">₹</span>
                            <span className="text-3xl font-black text-[#1E2229]">
                              {price.toLocaleString('en-IN')}
                            </span>
                            <span className="text-xs font-medium text-zinc-500">
                              /{billingCycle === 'yearly' ? 'year' : 'mo'}
                            </span>
                          </div>

                          {billingCycle === 'yearly' && (
                            <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                              ₹{monthlyEquivalent.toLocaleString('en-IN')}/mo · 2 Months Free ✨
                            </p>
                          )}

                          {/* Quick Quota Highlights */}
                          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-medium text-zinc-700">
                            <div className="p-2 rounded-xl bg-[#FAF7F2] border border-[#EAE5DA]/80">
                              <span className="text-zinc-400 block text-[9px] uppercase tracking-wider">Cloud Storage</span>
                              <span className="font-bold text-zinc-900">{tier.storageGB} GB B2</span>
                            </div>
                            <div className="p-2 rounded-xl bg-[#FAF7F2] border border-[#EAE5DA]/80">
                              <span className="text-zinc-400 block text-[9px] uppercase tracking-wider">Crew Seats</span>
                              <span className="font-bold text-zinc-900">
                                {tier.teamSeats > 50 ? 'Unlimited' : `${tier.teamSeats} Member${tier.teamSeats > 1 ? 's' : ''}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Feature Checklist */}
                        <ul className="space-y-2.5 text-xs">
                          {tier.features.map((feat, i) => (
                            <li
                              key={i}
                              className={`flex items-start gap-2.5 ${
                                feat.included ? 'text-zinc-700' : 'text-zinc-400 line-through opacity-60'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                  feat.included
                                    ? feat.highlight
                                      ? 'bg-amber-100 text-[#D9822B]'
                                      : 'bg-emerald-100 text-emerald-700'
                                    : 'bg-zinc-100 text-zinc-400'
                                }`}
                              >
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                              <span className={feat.highlight ? 'font-bold text-zinc-900' : ''}>
                                {feat.text}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Upgrade Action */}
                      <div className="mt-6 pt-4 border-t border-[#EAE5DA]">
                        <button
                          type="button"
                          disabled={loading || (isCurrent && billingCycle === 'monthly')}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckout(tier);
                          }}
                          className={`w-full py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
                            tier.popular
                              ? 'bg-gradient-to-r from-[#D9822B] to-[#C89435] text-white hover:brightness-105'
                              : 'bg-zinc-900 text-white hover:bg-zinc-800'
                          } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          {loading && selectedPlanId === tier.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Securing Order...</span>
                            </>
                          ) : isCurrent ? (
                            <span>Current Plan (Renew)</span>
                          ) : (
                            <>
                              <span>Upgrade to {tier.name}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Trust & Guarantee Footer */}
              <div className="mt-8 pt-5 border-t border-[#EAE5DA] flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>256-Bit Encrypted Razorpay Checkout</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-[#D9822B]" />
                    <span>Instant Activation · UPI / Card / NetBanking</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span>GST Registered SAC 998315 sequential tax invoice generated</span>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
