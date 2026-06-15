'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, RefreshCw, Power, PowerOff, ScanQrCode } from 'lucide-react';

interface WhatsappGatewayProps {
  workspaceId: string;
  initialStatus: 'connected' | 'disconnected';
}

export function WhatsappGateway({ workspaceId, initialStatus }: WhatsappGatewayProps) {
  const [status, setStatus] = useState<'connected' | 'disconnected'>(initialStatus);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Fetch QR Code from API
  const fetchQr = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/whastboost/qr?workspace_id=${workspaceId}`);
      const data = await res.json();
      if (data.success) {
        setQrCode(data.qr || null);
        setStatus(data.status);
        if (data.status === 'connected') {
          setPhoneNumber(data.phone || null);
          setDisplayName(data.name || null);
        } else {
          setPhoneNumber(null);
          setDisplayName(null);
        }
      } else {
        setError(data.message || 'Failed to sync live QR code from WhatsBoost.');
      }
    } catch (err: any) {
      console.warn('QR code fetch network warning:', err.message || err);
      setError('Network connection issues. Failed to fetch setup QR code.');
    } finally {
      setLoading(false);
    }
  };

  // Sync status if initialStatus changes (e.g. after parent finishes loading database)
  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  // Check live status when workspaceId changes (after auth completes)
  useEffect(() => {
    if (workspaceId && workspaceId !== '00000000-0000-0000-0000-000000000000') {
      checkStatus(false);
    } else {
      setCheckingStatus(false);
    }
  }, [workspaceId]);

  // Check Status API
  const checkStatus = async (isSilent = false) => {
    if (!isSilent) setCheckingStatus(true);
    try {
      const res = await fetch(`/api/whastboost/status?workspace_id=${workspaceId}`);
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
        if (data.status === 'connected') {
          setPolling(false);
          setQrCode(null);
          setError(null);
          setPhoneNumber(data.phone || null);
          setDisplayName(data.name || null);
        } else {
          setPhoneNumber(null);
          setDisplayName(null);
        }
      } else {
        setError(data.message || 'Status check failed.');
      }
    } catch (err: any) {
      console.warn('Status check network warning:', err.message || err);
      setError('Network connection issues. Status check failed.');
    } finally {
      if (!isSilent) setCheckingStatus(false);
    }
  };

  // Simulate Gateway Toggle (Demo / Development Feature)
  const toggleMockConnection = async (action: 'connect' | 'disconnect') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/whastboost/status?workspace_id=${workspaceId}&action=${action}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
        if (action === 'connect') {
          setQrCode(null);
          setPolling(false);
        } else {
          // Reset number/name, clear QR code, and stop polling (do not fetch new QR automatically)
          setPhoneNumber(null);
          setDisplayName(null);
          setQrCode(null);
          setPolling(false);
        }
      } else {
        setError(data.message || 'Failed to toggle gateway session.');
      }
    } catch (err: any) {
      console.warn('Toggle connection network warning:', err.message || err);
      setError('Network connection issues. Failed to toggle connection.');
    } finally {
      setLoading(false);
    }
  };

  // Poll status when polling is active (device is scanning)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (polling && status === 'disconnected') {
      timer = setInterval(() => {
        checkStatus(true);
      }, 3000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [polling, status]);

  // Start polling when QR code is first fetched
  const handleScanInit = () => {
    fetchQr();
    setPolling(true);
  };

  return (
    <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900/60 pb-5 mb-5">
        <div>
          <h4 className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            <ScanQrCode className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
            Connect Your WhatsApp
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Stream QR Code to authorize WhatsApp session</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${checkingStatus ? 'bg-zinc-400 dark:bg-zinc-500 animate-pulse' : status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 capitalize">{checkingStatus ? 'checking...' : status}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Device Status Information */}
        <div className="space-y-4">
          {checkingStatus ? (
            <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-805 space-y-3">
              <div className="flex items-center gap-2.5 text-zinc-605 dark:text-zinc-400">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="text-sm font-semibold">Verifying connection status...</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Checking live device state with WhatsBoost headless API gateway. Please wait.
              </p>
            </div>
          ) : status === 'connected' ? (
            <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-3">
              <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-semibold">Instance Active & Connected</span>
              </div>
              
              {(displayName || phoneNumber) && (
                <div className="text-xs text-zinc-700 dark:text-zinc-300 space-y-1 bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/60 font-mono">
                  {displayName && (
                    <p className="flex justify-between">
                      <span className="text-zinc-500">Name:</span> 
                      <span className="text-zinc-900 dark:text-white font-semibold">{displayName}</span>
                    </p>
                  )}
                  {phoneNumber && (
                    <p className="flex justify-between">
                      <span className="text-zinc-500">Number:</span> 
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">+{phoneNumber}</span>
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                आपका WhatsApp account सफलतापूर्वक gateway से link हो गया है। Precision Drip Scheduler scheduled messages को automatically background में deliver कर रहा है।
              </p>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-3">
              <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm font-semibold">Gateway Setup Required</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                WhatsApp drips send करने के लिए QR code scan करें। Scanning के बाद आपका device instance actively connect हो जायेगा।
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex flex-wrap gap-3">
            {checkingStatus ? (
              <button
                disabled
                className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 text-xs font-bold rounded-xl cursor-not-allowed"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Checking connection...
              </button>
            ) : status === 'disconnected' ? (
              <button
                onClick={handleScanInit}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black text-xs font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                {qrCode ? 'Refresh QR Code' : 'Generate Setup QR'}
              </button>
            ) : (
              <button
                onClick={() => toggleMockConnection('disconnect')}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/10 hover:text-rose-600 dark:hover:text-rose-400 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all"
              >
                <PowerOff className="w-3.5 h-3.5 text-rose-500" />
                Logout Device
              </button>
            )}

          </div>
        </div>

        {/* QR Code display screen */}
        <div className="flex flex-col items-center justify-center p-6 border border-zinc-200 dark:border-zinc-900 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/60 min-h-[260px] relative">
          {checkingStatus ? (
            <div className="space-y-3 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-zinc-400 dark:text-zinc-500 mx-auto" />
              <p className="text-xs text-zinc-500 dark:text-zinc-500">Checking device sync state...</p>
            </div>
          ) : loading ? (
            <div className="space-y-3 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-zinc-400 dark:text-zinc-500 mx-auto" />
              <p className="text-xs text-zinc-500 dark:text-zinc-500">Retrieving WhastBoost secure QR stream...</p>
            </div>
          ) : error ? (
            <div className="text-center space-y-3 p-4">
              <AlertTriangle className="w-10 h-10 text-rose-500 dark:text-rose-500 mx-auto" />
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">Gateway Error</p>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-normal max-w-xs">{error}</p>
              <button 
                onClick={fetchQr}
                className="mt-2 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-[10px] font-bold rounded-lg transition-all"
              >
                Retry Request
              </button>
            </div>
          ) : status === 'connected' ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-3.5"
            >
              <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.15)] animate-bounce">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900 dark:text-white">Status: Authenticated</p>
                <p className="text-[10px] text-zinc-500 mt-1">Ready for real-time campaign dispatching</p>
              </div>
            </motion.div>
          ) : qrCode ? (
            <div className="text-center space-y-4">
              <div className="p-3 bg-white rounded-xl inline-block shadow-2xl relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={qrCode} 
                  alt="WhatsApp QR Link setup" 
                  className="w-44 h-44 border border-zinc-200 rounded-md"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-900 dark:text-white">Scan this QR code via WhatsApp Web</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 animate-pulse">Waiting for scan authentication...</p>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-2 text-zinc-450 dark:text-zinc-600">
              <ScanQrCode className="w-12 h-12 mx-auto stroke-[1.25]" />
              <p className="text-xs">QR scanner is idle.</p>
              <p className="text-[10px]">Click Setup QR to link device.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


