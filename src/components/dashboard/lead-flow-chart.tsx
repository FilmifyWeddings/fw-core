'use client';

import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface LeadFlowChartProps {
  data: Array<{ date: string; leads: number; whatsappSent: number }>;
}

export function LeadFlowChart({ data }: LeadFlowChartProps) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);

    const checkTheme = () => {
      const root = window.document.documentElement;
      setIsDark(root.classList.contains('dark'));
    };

    checkTheme();

    // Set up MutationObserver to sync theme state dynamically
    const observer = new MutationObserver(checkTheme);
    observer.observe(window.document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  if (!mounted) {
    return (
      <div className="h-[300px] w-full bg-white dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl animate-pulse flex items-center justify-center">
        <span className="text-zinc-400 dark:text-zinc-550 text-xs font-semibold">Loading analytics flow chart...</span>
      </div>
    );
  }

  // Set colors dynamically based on light/dark mode
  const gridColor = isDark ? '#27272a' : '#e2e8f0';
  const labelColor = isDark ? '#71717a' : '#64748b';
  const tooltipBg = isDark ? '#09090b' : '#ffffff';
  const tooltipBorder = isDark ? '#27272a' : '#e2e8f0';
  const tooltipText = isDark ? '#ffffff' : '#0f172a';

  return (
    <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md shadow-2xl transition-colors duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h4 className="text-base font-semibold text-zinc-900 dark:text-white">Lead Flow & Delivery Analytics</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Daily breakdown of ingested leads and automated dispatches</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-zinc-400 dark:bg-zinc-500" />
            <span className="text-zinc-650 dark:text-zinc-300">Ingested Leads</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
            <span className="text-zinc-650 dark:text-zinc-300">Drips Sent</span>
          </div>
        </div>
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isDark ? '#a1a1aa' : '#71717a'} stopOpacity={0.15}/>
                <stop offset="95%" stopColor={isDark ? '#a1a1aa' : '#71717a'} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorDrips" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke={labelColor} 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              fontFamily="sans-serif"
            />
            <YAxis 
              stroke={labelColor} 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              fontFamily="sans-serif"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: tooltipBg, 
                borderColor: tooltipBorder,
                borderRadius: '12px',
                color: tooltipText,
                fontSize: '11px',
                fontFamily: 'sans-serif',
                boxShadow: '0 4px_12px rgba(0,0,0,0.05)'
              }}
              labelClassName="font-bold text-zinc-550 dark:text-zinc-300"
            />
            <Area 
              type="monotone" 
              dataKey="leads" 
              name="Ingested Leads"
              stroke={isDark ? '#a1a1aa' : '#71717a'} 
              strokeWidth={1.75}
              fillOpacity={1} 
              fill="url(#colorLeads)" 
            />
            <Area 
              type="monotone" 
              dataKey="whatsappSent" 
              name="Drips Sent"
              stroke="#10b981" 
              strokeWidth={1.75}
              fillOpacity={1} 
              fill="url(#colorDrips)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
