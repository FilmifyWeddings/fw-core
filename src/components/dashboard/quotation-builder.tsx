'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, FileText, Download, Share2, Sparkles, Check, 
  Layers, DollarSign, Calendar, Eye
} from 'lucide-react';
import { Lead } from '@/types';
import { supabase } from '@/lib/supabase';

interface QuotationBuilderProps {
  lead: Lead;
  onLeadUpdate: (updatedFields: Partial<Lead>) => void;
  userEmail?: string | null;
}

interface DeliverableItem {
  id: string;
  label: string;
  checked: boolean;
  qty: number;
}

interface EventPricingRow {
  id: string;
  eventName: string;
  price: number;
}

const DEFAULT_DELIVERABLES = [
  { id: 'raw_photos', label: 'Raw Photos & JPEGs', checked: true, qty: 1000 },
  { id: 'cinematic_teasers', label: 'Cinematic 1-min Teasers', checked: false, qty: 1 },
  { id: 'long_form_videos', label: 'Long-form Cinematic Videos', checked: true, qty: 1 },
  { id: 'canvas_albums', label: 'Canvas Bound Photo Albums', checked: false, qty: 1 },
  { id: 'screen_streams', label: 'Screen Live Stream Broadcasts', checked: false, qty: 1 }
];

export function QuotationBuilder({ lead, onLeadUpdate, userEmail }: QuotationBuilderProps) {
  const [deliverables, setDeliverables] = useState<DeliverableItem[]>(DEFAULT_DELIVERABLES);
  const [events, setEvents] = useState<EventPricingRow[]>([
    { id: 'e1', eventName: 'Main Wedding Shoot', price: 150000 },
    { id: 'e2', eventName: 'Sangeet & Cocktail', price: 50000 }
  ]);
  const [activeTheme, setActiveTheme] = useState<string>('modern_light');
  const [exportUrl, setExportUrl] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  // Load from lead raw_payload
  useEffect(() => {
    if (lead.raw_payload?.quotation_config) {
      const config = lead.raw_payload.quotation_config;
      if (Array.isArray(config.deliverables)) {
        setDeliverables(config.deliverables);
      }
      if (Array.isArray(config.events)) {
        setEvents(config.events);
      }
      if (config.theme) {
        setActiveTheme(config.theme);
      }
      if (config.export_url) {
        setExportUrl(config.export_url);
      }
    }
  }, [lead]);

  const saveQuotationConfig = (newDeliverables: DeliverableItem[], newEvents: EventPricingRow[], themeName: string, url: string) => {
    const totalDealCost = newEvents.reduce((sum, e) => sum + Number(e.price || 0), 0);
    const updatedPayload = {
      ...lead.raw_payload,
      total_deal_cost: totalDealCost,
      quotation_config: {
        deliverables: newDeliverables,
        events: newEvents,
        theme: themeName,
        export_url: url
      }
    };
    onLeadUpdate({
      raw_payload: updatedPayload
    });
  };

  const handleDeliverableCheck = (id: string, checked: boolean) => {
    const updated = deliverables.map(d => d.id === id ? { ...d, checked } : d);
    setDeliverables(updated);
    saveQuotationConfig(updated, events, activeTheme, exportUrl);
  };

  const handleDeliverableQty = (id: string, qty: number) => {
    const updated = deliverables.map(d => d.id === id ? { ...d, qty } : d);
    setDeliverables(updated);
    saveQuotationConfig(updated, events, activeTheme, exportUrl);
  };

  const handleAddEvent = () => {
    const newEvent: EventPricingRow = {
      id: `ev-${Math.random().toString(36).substring(2, 5)}`,
      eventName: 'New Event Shoot',
      price: 0
    };
    const updated = [...events, newEvent];
    setEvents(updated);
    saveQuotationConfig(deliverables, updated, activeTheme, exportUrl);
  };

  const handleEventNameChange = (id: string, name: string) => {
    const updated = events.map(e => e.id === id ? { ...e, eventName: name } : e);
    setEvents(updated);
    saveQuotationConfig(deliverables, updated, activeTheme, exportUrl);
  };

  const handleEventPriceChange = (id: string, price: number) => {
    const updated = events.map(e => e.id === id ? { ...e, price } : e);
    setEvents(updated);
    saveQuotationConfig(deliverables, updated, activeTheme, exportUrl);
  };

  const handleRemoveEvent = (id: string) => {
    const updated = events.filter(e => e.id !== id);
    setEvents(updated);
    saveQuotationConfig(deliverables, updated, activeTheme, exportUrl);
  };

  const handleThemeChange = (theme: string) => {
    setActiveTheme(theme);
    saveQuotationConfig(deliverables, events, theme, exportUrl);
  };

  const handleCompileProposal = async () => {
    setIsExporting(true);
    // Simulate compilation delay
    setTimeout(async () => {
      const tenantId = lead.tenant_id || lead.workspace_id || '00000000-0000-0000-0000-000000000000';
      const clientId = lead.client_id || lead.id;
      const totalCost = events.reduce((sum, e) => sum + Number(e.price || 0), 0);

      // Create persistent quotation record in database (3-tier persistence compliance)
      try {
        const { data, error } = await supabase
          .from('client_quotations')
          .insert({
            tenant_id: tenantId,
            client_id: clientId,
            event_structures: {
              deliverables,
              events,
              theme: activeTheme
            },
            deliverables_count: deliverables.filter(d => d.checked).length,
            template_choice: activeTheme
          })
          .select();

        if (error) {
          console.error('Error inserting client quotation:', error.message);
        }
      } catch (err) {
        console.error('Database connection failed for quotation:', err);
      }

      const proposalId = Math.random().toString(36).substring(2, 10).toUpperCase();
      const newUrl = `https://psychic-levers-jimmy.ngrok-free.dev/proposals/${proposalId}`;
      setExportUrl(newUrl);
      setIsExporting(false);
      saveQuotationConfig(deliverables, events, activeTheme, newUrl);
    }, 1200);
  };

  const totalCostSum = events.reduce((sum, e) => sum + Number(e.price || 0), 0);

  const THEMES = [
    { id: 'modern_light', label: 'Modern Light (Free)', type: 'free' },
    { id: 'classic_mono', label: 'Classic Monochrome (Free)', type: 'free' },
    { id: 'royal_gold', label: 'Royal Gold (Premium)', type: 'premium' },
    { id: 'desert_rose', label: 'Desert Rose (Premium)', type: 'premium' },
    { id: 'nordic_blue', label: 'Nordic Blue (Premium)', type: 'premium' },
    { id: 'emerald_lush', label: 'Emerald Lush (Premium)', type: 'premium' }
  ];

  return (
    <div className="space-y-6 text-xs text-slate-800 dark:text-zinc-300">
      
      {/* Deliverables Checklist Section */}
      <div className="space-y-3">
        <h4 className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-550 tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-orange-500" />
          Itemized Deliverables Checklist
        </h4>
        
        <div className="space-y-2 bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-850 p-3.5 rounded-2xl">
          {deliverables.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-900/60 last:border-0">
              <label className="flex items-center gap-2.5 cursor-pointer font-semibold py-1">
                <input 
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => handleDeliverableCheck(item.id, e.target.checked)}
                  className="rounded border-slate-350 dark:border-zinc-700 text-orange-500 focus:ring-orange-500 focus:ring-opacity-25"
                />
                <span>{item.label}</span>
              </label>
              
              {item.checked && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400">Qty:</span>
                  <input 
                    type="number"
                    value={item.qty}
                    onChange={(e) => handleDeliverableQty(item.id, Number(e.target.value))}
                    className="w-16 bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 rounded p-1 text-center font-mono font-bold"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Event Shoot Pricing Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-550 tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-orange-500" />
            Shoot Schedule & Pricing Matrix
          </h4>
          <button
            onClick={handleAddEvent}
            className="p-1 px-2 text-[9px] uppercase font-bold bg-slate-900 dark:bg-white text-white dark:text-black rounded hover:opacity-80 transition-opacity flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Event
          </button>
        </div>

        <div className="space-y-2">
          {events.length === 0 ? (
            <div className="p-4 text-center italic text-slate-400 border border-dashed border-slate-250 dark:border-zinc-900 rounded-xl">
              No events scheduled yet. Click Add Event.
            </div>
          ) : (
            events.map((e) => (
              <div key={e.id} className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-850 p-2 rounded-xl">
                <input 
                  type="text"
                  value={e.eventName}
                  onChange={(el) => handleEventNameChange(e.id, el.target.value)}
                  className="flex-1 bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 rounded p-1.5 font-semibold"
                  placeholder="e.g. Haldi ceremony"
                />
                
                <div className="flex items-center gap-1 bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 rounded px-1.5 py-1">
                  <span className="text-[10px] text-slate-400 font-bold">₹</span>
                  <input 
                    type="number"
                    value={e.price}
                    onChange={(el) => handleEventPriceChange(e.id, Number(el.target.value))}
                    className="w-24 bg-transparent border-none p-0 focus:ring-0 font-mono font-extrabold focus:outline-none text-right"
                    placeholder="0"
                  />
                </div>

                <button
                  onClick={() => handleRemoveEvent(e.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Themes & Render Engine Section */}
      <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-zinc-900">
        <h4 className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-550 tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-orange-500" />
          Proposal Canvas Render Styles
        </h4>

        <div className="grid grid-cols-2 gap-2">
          {THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => handleThemeChange(theme.id)}
              className={`p-2.5 border rounded-xl text-left transition-all ${
                activeTheme === theme.id
                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400 font-bold'
                  : 'bg-slate-50 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-850 hover:bg-slate-100 dark:hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{theme.label.split(' (')[0]}</span>
                {activeTheme === theme.id && <Check className="w-3.5 h-3.5 shrink-0" />}
              </div>
              <span className={`text-[8px] font-bold uppercase tracking-wider block mt-1 ${
                theme.type === 'premium' ? 'text-amber-500' : 'text-slate-400'
              }`}>
                {theme.type} Style
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Quote summary cost and export controls */}
      <div className="pt-4 border-t border-slate-200 dark:border-zinc-900 space-y-3">
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/10">
          <div>
            <span className="text-[9px] uppercase font-black text-slate-500 dark:text-zinc-450 tracking-wider">Calculated Deal Proposal Value</span>
            <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
              ₹{totalCostSum.toLocaleString('en-IN')}
            </div>
          </div>
          <DollarSign className="w-8 h-8 text-orange-500/20" />
        </div>

        {exportUrl ? (
          <div className="space-y-2.5">
            <div className="p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-xl flex items-center justify-between gap-2">
              <span className="font-mono text-[9px] text-orange-500 truncate max-w-[240px]">{exportUrl}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(exportUrl);
                  alert('Proposal link copied to clipboard!');
                }}
                className="p-1 px-2 text-[9px] font-bold bg-slate-200 hover:bg-slate-350 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded transition-colors text-slate-700 dark:text-zinc-300"
              >
                Copy Link
              </button>
            </div>
            
            <div className="flex gap-2">
              <a
                href={exportUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" /> View Proposal Live
              </a>
              
              <button
                onClick={() => window.print()}
                className="px-3.5 bg-slate-100 hover:bg-slate-250 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl transition-all text-slate-700 dark:text-zinc-300"
                title="Download print PDF version"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleCompileProposal}
            disabled={isExporting}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-250 text-white dark:text-black font-black rounded-xl transition-all flex items-center justify-center gap-1.5 hover:scale-[1.01] disabled:opacity-50"
          >
            <Share2 className="w-3.5 h-3.5" /> 
            {isExporting ? 'Compiling Proposal Canvas...' : 'Compile & Export Proposal Link'}
          </button>
        )}
      </div>

    </div>
  );
}
