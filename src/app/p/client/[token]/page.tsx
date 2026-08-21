'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Calendar, MapPin, Film, Camera, BookOpen, Clock, 
  CheckCircle2, ExternalLink, Download, Phone, Mail, MessageCircle, 
  Key, Lock, ShieldCheck, Heart, AlertTriangle, Layers, DollarSign,
  ChevronRight, ArrowRight, Music, Play
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { parseClientExtended } from '@/components/clients/client-insider-modal';
import type { WorkspaceClient, PostProductionProject, ClientFinanceRecord } from '@/types';

export default function PublicClientPortalPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<WorkspaceClient | null>(null);
  const [postProd, setPostProd] = useState<PostProductionProject | null>(null);
  const [finance, setFinance] = useState<ClientFinanceRecord | null>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // PIN Authentication state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Active Tab in unlocked portal
  const [portalTab, setPortalTab] = useState<'itinerary' | 'deliverables' | 'package' | 'billing'>('itinerary');

  useEffect(() => {
    async function loadPortalData() {
      setLoading(true);
      setErrorMsg(null);

      if (!token) {
        setErrorMsg('Invalid client portal link.');
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch client matching id or portal_token in notes
        let { data: clientRow, error: clientErr } = await supabase
          .from('workspace_clients')
          .select('*')
          .eq('id', token)
          .maybeSingle();

        // If not found by id, search by notes containing token
        if (!clientRow) {
          const { data: searchClients } = await supabase
            .from('workspace_clients')
            .select('*');

          if (searchClients) {
            const found = searchClients.find(c => {
              const ext = parseClientExtended(c);
              return ext.portal_token === token || c.id === token;
            });
            if (found) clientRow = found;
          }
        }

        if (!clientRow) {
          setErrorMsg('Client wedding portal not found or link has expired.');
          setLoading(false);
          return;
        }

        setClient(clientRow);

        // Check if session has cached unlock for this token
        const cachedPin = sessionStorage.getItem(`portal_unlocked_${token}`);
        const ext = parseClientExtended(clientRow);
        if (cachedPin === ext.portal_pin) {
          setIsUnlocked(true);
        }

        // Fetch related post production and finance in background
        const [postProdRes, financeRes, quotesRes] = await Promise.all([
          supabase.from('post_production_projects').select('*').eq('client_id', clientRow.id).maybeSingle(),
          supabase.from('client_finance_records').select('*').eq('client_id', clientRow.id).maybeSingle(),
          supabase.from('quotations').select('*').eq('client_id', clientRow.id)
        ]);

        if (postProdRes.data) setPostProd(postProdRes.data);
        if (financeRes.data) setFinance(financeRes.data);
        if (quotesRes.data) setQuotations(quotesRes.data);

      } catch (e) {
        console.error('Error loading client portal:', e);
        setErrorMsg('Unable to load wedding portal. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    loadPortalData();
  }, [token]);

  // Handle PIN Unlock
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    const ext = parseClientExtended(client);
    const correctPin = ext.portal_pin;

    if (enteredPin.trim() === correctPin.trim()) {
      setIsUnlocked(true);
      setPinError(false);
      sessionStorage.setItem(`portal_unlocked_${token}`, correctPin);
    } else {
      setPinError(true);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-6 text-center text-slate-900">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center animate-bounce mb-4 shadow-sm">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-base font-black">Opening Your Wedding Portal...</h2>
        <p className="text-xs text-slate-500 font-medium mt-1">Preparing your itinerary and memories</p>
      </div>
    );
  }

  // Error state
  if (errorMsg || !client) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-6 text-center text-slate-900">
        <div className="w-16 h-16 rounded-full bg-rose-100 border border-rose-300 text-rose-600 flex items-center justify-center mb-4 shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Portal Unavailable</h2>
        <p className="text-xs text-slate-600 max-w-sm mt-1 mb-5">{errorMsg || 'Please verify the link with your wedding studio.'}</p>
      </div>
    );
  }

  const ext = parseClientExtended(client);

  // Calculate Days to Wedding
  const calculateDaysToGo = () => {
    if (!client.event_date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(client.event_date);
    target.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const daysToGo = calculateDaysToGo();

  // ─────────────────────────────────────────────────────────────
  // 1. PIN VERIFICATION LOCK SCREEN
  // ─────────────────────────────────────────────────────────────
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAF9F5] via-[#FFFDF9] to-[#FAF8F2] flex items-center justify-center p-4 text-slate-900">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-[#FFFDF9] border border-[#EAE5DA] rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 text-center"
        >
          {/* Logo / Crest Badge */}
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center shadow-md border border-amber-200">
            <Heart className="w-8 h-8 fill-amber-600 text-amber-700" />
          </div>

          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-widest font-mono">
              {ext.client_code}
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-2">{client.name}</h1>
            <p className="text-xs text-slate-500 font-medium">Welcome to your Personal Wedding Space</p>
          </div>

          {/* PIN Form */}
          <form onSubmit={handleVerifyPin} className="space-y-4 pt-2">
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-black text-slate-700 block text-center">
                Enter 4-Digit Access PIN
              </label>
              <div className="relative">
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  placeholder="• • • •"
                  value={enteredPin}
                  onChange={(e) => {
                    setEnteredPin(e.target.value);
                    setPinError(false);
                  }}
                  className={`w-full text-center text-2xl font-black tracking-[0.6em] py-3 bg-white border rounded-2xl focus:outline-none transition ${
                    pinError 
                      ? 'border-rose-400 ring-2 ring-rose-300 text-rose-600' 
                      : 'border-[#EAE5DA] focus:ring-2 focus:ring-amber-500/20 text-slate-900'
                  }`}
                />
              </div>
              {pinError && (
                <p className="text-[11px] font-bold text-rose-500 text-center animate-shake mt-1">
                  Incorrect PIN. Please check the PIN shared by your studio.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!enteredPin.trim()}
              className="w-full py-3 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-slate-900 font-black rounded-2xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Key className="w-4 h-4" />
              Unlock Wedding Portal
            </button>
          </form>

          <p className="text-[11px] text-slate-400">
            Powered by StudioCore • Luxury Photography & Films
          </p>
        </motion.div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. UNLOCKED LUXURY CLIENT PORTAL
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-900 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">

        {/* ── HERO BANNER ── */}
        <div className="bg-gradient-to-br from-[#FFFDF9] via-amber-50/40 to-[#FFFDF9] border border-[#EAE5DA] rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 font-mono">
                  {ext.client_code}
                </span>
                <span className="text-xs font-bold text-slate-500">•</span>
                <span className="text-xs font-bold text-slate-600">{client.event_type}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{client.name}</h1>
              <p className="text-xs text-slate-600 font-medium flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>{client.event_date ? new Date(client.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Wedding Celebrations'}</span>
              </p>
            </div>

            {/* Right: Days to go Countdown & WhatsApp Button */}
            <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-3">
              {daysToGo !== null && (
                <div className="px-4 py-2 bg-white rounded-2xl border border-amber-200 shadow-2xs text-center">
                  <span className="text-base sm:text-lg font-black text-amber-900">
                    {daysToGo > 0 ? `${daysToGo} Days To Go! 🎉` : daysToGo === 0 ? 'Wedding Day Today! 💖' : `${Math.abs(daysToGo)} Days of Happiness 💍`}
                  </span>
                </div>
              )}

              {ext.whatsapp_group_link && (
                <a
                  href={ext.whatsapp_group_link}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Join Wedding WhatsApp Group
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── PORTAL NAVIGATION TABS ── */}
        <div className="flex border-b border-[#EAE5DA] bg-[#FAF8F2] p-1.5 rounded-2xl gap-1 overflow-x-auto shadow-2xs">
          {[
            { id: 'itinerary', label: 'Event Itinerary', icon: Calendar },
            { id: 'deliverables', label: 'Photos & Videos', icon: Film },
            { id: 'package', label: 'Package Inclusions', icon: Sparkles },
            { id: 'billing', label: 'Payment Summary', icon: DollarSign },
          ].map(tab => {
            const Icon = tab.icon;
            const active = portalTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPortalTab(tab.id as any)}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  active 
                    ? 'bg-amber-400 text-slate-900 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: EVENT ITINERARY ── */}
        {portalTab === 'itinerary' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Celebration Schedule</h3>
              <span className="text-xs text-slate-500 font-bold">{ext.events.length} Ceremonies</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {ext.events.map((ev, index) => (
                <div
                  key={ev.id}
                  className="p-5 bg-white rounded-2xl border border-[#EAE5DA] shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 font-black text-xs flex items-center justify-center">
                        {index + 1}
                      </span>
                      <h4 className="text-base font-black text-slate-900">{ev.name}</h4>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {new Date(ev.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-600 pt-1">
                    {ev.time_start && (
                      <p className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span className="font-semibold text-slate-800">{ev.time_start} - {ev.time_end || 'End'}</span>
                      </p>
                    )}

                    {ev.venue && (
                      <p className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{ev.venue}, {ev.city}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── TAB 2: DELIVERABLES & GOOGLE DRIVE ACCESS ── */}
        {portalTab === 'deliverables' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Photos, Films & Deliverables</h3>
              <p className="text-xs text-slate-500 font-medium">Access your wedding memory links and track edit progress</p>
            </div>

            {!postProd || postProd.deliverables.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-[#EAE5DA] space-y-3">
                <Film className="w-8 h-8 mx-auto text-amber-500" />
                <h4 className="text-sm font-bold text-slate-800">Deliverables in preparation</h4>
                <p className="text-xs text-slate-500">Your edited photos and cinematic films will be attached here once ready.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {postProd.deliverables.map(item => {
                  const isDone = item.status === 'completed' || item.status === 'done';
                  return (
                    <div
                      key={item.id}
                      className="p-4 bg-white rounded-2xl border border-[#EAE5DA] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                          item.category === 'photos' ? 'bg-indigo-100 text-indigo-700' :
                          item.category === 'videos' ? 'bg-rose-100 text-rose-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {item.category === 'photos' ? <Camera className="w-5 h-5" /> :
                           item.category === 'videos' ? <Film className="w-5 h-5" /> :
                           <BookOpen className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900">{item.title}</h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {item.count || 'Deliverable Item'} • Status: <span className="font-bold text-slate-800">{isDone ? 'Ready for Download' : 'In Post-Production Editing'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-auto">
                        {item.drive_link ? (
                          <a
                            href={item.drive_link}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open Google Drive
                          </a>
                        ) : (
                          <span className="px-3 py-1 bg-slate-100 text-slate-500 font-bold text-xs rounded-lg">
                            Editing in progress
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── TAB 3: PACKAGE INCLUSIONS ── */}
        {portalTab === 'package' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Wedding Photography & Film Package</h3>
              <p className="text-xs text-slate-500 font-medium">Inclusions, deliverables and agreed scope</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#EAE5DA] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h4 className="text-sm font-black text-slate-900">{client.event_type} Package</h4>
                  <p className="text-xs text-slate-500">Premium Cinematic Studio Coverage</p>
                </div>
                <span className="text-base font-black font-mono text-slate-900">
                  ₹{(client.total_package_amount || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-700">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Full High-Resolution Edited Photographs with color-grading
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Cinematic Wedding Highlight Film (4K Master)
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Traditional Full-Length Documentary Video Cut
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Luxury Leather / Canvas Bound Wedding Photo Album
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Instagram Reels & Teaser Cuts
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── TAB 4: BILLING & PAYMENTS SUMMARY ── */}
        {portalTab === 'billing' && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Payment & Account Summary</h3>
              <p className="text-xs text-slate-500 font-medium">Your package billing status and received payments</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 bg-white rounded-2xl border border-[#EAE5DA] shadow-xs">
                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Package</p>
                <h3 className="text-xl font-black text-slate-900 mt-1 font-mono">
                  ₹{(client.total_package_amount || 0).toLocaleString('en-IN')}
                </h3>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-[#EAE5DA] shadow-xs">
                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Paid Amount</p>
                <h3 className="text-xl font-black text-emerald-600 mt-1 font-mono">
                  ₹{(client.paid_amount || 0).toLocaleString('en-IN')}
                </h3>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-[#EAE5DA] shadow-xs">
                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Remaining Balance</p>
                <h3 className="text-xl font-black text-amber-800 mt-1 font-mono">
                  ₹{Math.max(0, (client.total_package_amount || 0) - (client.paid_amount || 0)).toLocaleString('en-IN')}
                </h3>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
