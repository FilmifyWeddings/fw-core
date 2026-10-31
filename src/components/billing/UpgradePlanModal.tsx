'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, Sparkles, ShieldCheck, Zap, Crown, 
  ArrowRight, Loader2, CheckCircle2, Lock, HelpCircle 
} from 'lucide-react';
import { SubscriptionTier } from '@/lib/billing/plans';
import { openRazorpayCheckout } from '@/lib/billing/razorpay';
import UnifiedPricingCatalog from '@/components/pricing/UnifiedPricingCatalog';

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
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    planName: string;
    expiresAt: string;
    invoiceNumber: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleCheckout = async (tier: SubscriptionTier, billingCycle: 'monthly' | '6months' | 'yearly') => {
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
            expiresAt: verifyData.plan?.expiresAt || new Date(Date.now() + 365 * 86400000).toISOString(),
            invoiceNumber: verifyData.invoice?.invoiceNumber || `INV-SC-${Date.now().toString().slice(-6)}`,
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
        description: `${tier.name} (${billingCycle === 'yearly' ? 'Annual Plan' : billingCycle === '6months' ? '6 Months' : 'Monthly'})`,
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
      <div className="fixed inset-0 z-[100015] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
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
          className="relative w-full max-w-6xl max-h-[92vh] overflow-y-auto bg-[#FFFDF9] rounded-3xl border border-[#EAE5DA] shadow-[0_24px_60px_-15px_rgba(27,24,20,0.18)] p-6 sm:p-8 text-[#1E2229] my-auto scrollbar-thin"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#EAE5DA] text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition cursor-pointer z-20"
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
                All features, expanded storage, and quotas are active immediately.
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
            <div className="space-y-4">
              {/* Header */}
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-[#D9822B] text-xs font-bold tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 fill-[#D9822B]" />
                  <span>UPGRADE STUDIO SUBSCRIPTION</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1E2229]">
                  Scale Your Studio with Complete Freedom
                </h2>
                <p className="text-xs text-zinc-500 max-w-lg mx-auto">
                  Select a Client Gallery plan for high-res photo delivery, or upgrade your Photography CRM plan to unlock AI and automations.
                </p>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="max-w-md mx-auto p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-center font-bold">
                  {errorMessage}
                </div>
              )}

              {/* Loading Indicator */}
              {loading && (
                <div className="fixed inset-0 z-[100030] bg-black/40 backdrop-blur-xs flex items-center justify-center">
                  <div className="p-5 rounded-2xl bg-white shadow-xl flex items-center gap-3 text-xs font-bold text-stone-800">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                    <span>Connecting Secure Payment Gateway...</span>
                  </div>
                </div>
              )}

              {/* UNIFIED PRICING CATALOG (TABS + 6-MO/ANNUAL DURATION + CARDS + MATRIX) */}
              <UnifiedPricingCatalog
                variant="modal"
                currentPlanId={currentPlanId}
                defaultTab="gallery"
                onSelectPlan={(plan, cycle) => handleCheckout(plan, cycle)}
              />
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
