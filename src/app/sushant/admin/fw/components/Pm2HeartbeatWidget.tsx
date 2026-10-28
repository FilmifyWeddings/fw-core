'use client';

import React, { useState, useEffect } from 'react';
import { 
  Server, Activity, Cpu, HardDrive, 
  RefreshCw, CheckCircle2, AlertCircle, Clock, Sparkles 
} from 'lucide-react';

interface ProcessInfo {
  name: string;
  pm_id: number;
  pid: number;
  status: 'online' | 'stopped' | 'errored' | string;
  cpu: string;
  cpuRaw: number;
  memory: string;
  memoryBytes: number;
  memoryMB: number;
  uptime: string;
  uptimeSec: number;
  restarts: number;
  mode: string;
  watching: boolean;
}

interface Pm2TelemetryData {
  host: {
    platform: string;
    hostname: string;
    arch: string;
    cpuCores: number;
    cpuModel: string;
    loadAvg: number[];
    uptime: string;
    memory: {
      totalMB: number;
      usedMB: number;
      freeMB: number;
      usedPercent: number;
      freePercent: number;
    };
  };
  pm2: {
    isAvailable: boolean;
    totalProcesses: number;
    onlineCount: number;
    stoppedCount: number;
    erroredCount: number;
    processes: ProcessInfo[];
  };
}

export default function Pm2HeartbeatWidget() {
  const [data, setData] = useState<Pm2TelemetryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPm2Data = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/sushant/admin/fw/pm2-status');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch process telemetry');
      }
      setData(json);
    } catch (err: any) {
      setError(err.message || 'PM2 telemetry connection failure');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPm2Data();
    const interval = setInterval(fetchPm2Data, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="p-8 bg-white border border-[#EAE5DA] rounded-3xl shadow-xs text-center space-y-3">
        <RefreshCw className="w-6 h-6 mx-auto text-amber-600 animate-spin" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Querying Host Daemons & Process Memory...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-white border border-rose-200 rounded-3xl text-center space-y-2">
        <AlertCircle className="w-6 h-6 mx-auto text-rose-500" />
        <p className="text-xs font-bold text-rose-700">{error || 'Telemetry offline'}</p>
        <button
          onClick={fetchPm2Data}
          className="px-3 py-1 bg-rose-100 text-rose-800 rounded-lg text-xs font-bold hover:bg-rose-200 transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── TOP SERVER HEALTH SUMMARY ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        
        {/* RAM Usage */}
        <div className="p-4 bg-white border border-[#EAE5DA] rounded-2xl shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Host Memory (RAM)</span>
            <HardDrive className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900 font-mono">
              {(data.host.memory.usedMB / 1024).toFixed(1)} GB <span className="text-xs text-slate-400">/ {(data.host.memory.totalMB / 1024).toFixed(1)} GB</span>
            </span>
            <span className="text-xs font-black text-indigo-600">
              {data.host.memory.usedPercent}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full ${
                data.host.memory.usedPercent > 85 ? 'bg-rose-500' :
                data.host.memory.usedPercent > 70 ? 'bg-amber-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${data.host.memory.usedPercent}%` }}
            />
          </div>
        </div>

        {/* CPU Load */}
        <div className="p-4 bg-white border border-[#EAE5DA] rounded-2xl shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Processor & Load</span>
            <Cpu className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900 font-mono">
              {data.host.cpuCores} Cores
            </span>
            <span className="text-xs font-bold text-slate-600 font-mono">
              Load: {data.host.loadAvg.join(', ')}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">
            {data.host.cpuModel}
          </p>
        </div>

        {/* Uptime & Platform */}
        <div className="p-4 bg-white border border-[#EAE5DA] rounded-2xl shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">System Uptime</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-800 font-mono">
            {data.host.uptime}
          </div>
          <p className="text-[10px] text-slate-400 font-mono">
            Host: {data.host.hostname} ({data.host.platform} {data.host.arch})
          </p>
        </div>

      </div>

      {/* ── PROCESS CARDS GRID ── */}
      <div className="bg-white border border-[#EAE5DA] rounded-3xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">PM2 Process Daemons & Microservices</h3>
            <p className="text-xs text-slate-500">Live monitoring of fw-core Next.js server, Baileys socket engine, and webhooks.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
              {data.pm2.onlineCount} Online
            </span>
            {data.pm2.stoppedCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                {data.pm2.stoppedCount} Idle
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {data.pm2.processes.map((proc) => {
            const isOnline = proc.status === 'online';
            return (
              <div 
                key={proc.name + proc.pm_id}
                className={`p-4 rounded-2xl border transition-all ${
                  isOnline 
                    ? 'bg-[#FAF9F5] border-[#EAE5DA] hover:border-amber-300' 
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-mono font-black text-slate-900 text-xs">
                      {proc.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (ID: {proc.pm_id})
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                    isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {proc.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-xl bg-white border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-sans uppercase block">Memory</span>
                    <span className="font-extrabold text-slate-800">{proc.memory}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-sans uppercase block">CPU</span>
                    <span className="font-extrabold text-slate-800">{proc.cpu}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-sans uppercase block">Uptime</span>
                    <span className="font-bold text-slate-700">{proc.uptime}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-sans uppercase block">Restarts</span>
                    <span className="font-bold text-amber-700">{proc.restarts}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>PID: {proc.pid}</span>
                  <span>Mode: {proc.mode}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
