'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, LayoutDashboard, Command, Sparkles } from 'lucide-react';
import { BhamstraProvider } from '@/lib/context/BhamstraContext';

function SushantGatewayCore() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#070708] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* Dynamic Background Gradients */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-10 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl w-full text-center space-y-12 relative z-10">
        
        {/* Logo and Header */}
        <div className="space-y-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 shadow-xl"
          >
            <Command className="w-4 h-4 text-orange-500 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="text-[10px] font-extrabold font-mono tracking-widest text-zinc-400 uppercase">BHAMSTRA CORE OPERATIONS</span>
          </motion.div>
          
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent"
          >
            Platform Command Gateway
          </motion.h1>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-sm text-zinc-550 max-w-lg mx-auto leading-relaxed"
          >
            Choose your destination console. Access system-wide metrics or return to your creative studio workspace.
          </motion.p>
        </div>

        {/* Choice Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card 1: Admin Dashboard */}
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            whileHover={{ y: -8, scale: 1.02 }}
            className="p-8 rounded-3xl border border-zinc-850 hover:border-orange-500/30 bg-zinc-950/40 backdrop-blur-md flex flex-col justify-between items-center text-center shadow-2xl relative overflow-hidden group cursor-pointer"
            onClick={() => router.push('/admin/sushant/dashboard')}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
            
            <div className="space-y-6 relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors">Admin Dashboard</h3>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-[280px] mx-auto">
                  Deploy system updates via OTA, monitor R2 storage metrics, and review multi-tenant telemetry.
                </p>
              </div>
            </div>

            <div className="mt-8 w-full relative z-10">
              <button 
                type="button"
                className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-lg shadow-orange-500/10 flex items-center justify-center gap-1.5 transition-all group-hover:shadow-orange-500/20"
              >
                Access Command Center <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* Card 2: User Dashboard */}
          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            whileHover={{ y: -8, scale: 1.02 }}
            className="p-8 rounded-3xl border border-zinc-850 hover:border-emerald-500/30 bg-zinc-950/40 backdrop-blur-md flex flex-col justify-between items-center text-center shadow-2xl relative overflow-hidden group cursor-pointer"
            onClick={() => router.push('/home')}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
            
            <div className="space-y-6 relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                <LayoutDashboard className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">User Dashboard</h3>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-[280px] mx-auto">
                  Access leads management, WhatsBoost WhatsApp triggers, sequences, and workspace settings.
                </p>
              </div>
            </div>

            <div className="mt-8 w-full relative z-10">
              <button 
                type="button"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5 transition-all group-hover:shadow-emerald-500/20"
              >
                Access User Studio <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

        </div>

      </div>

    </div>
  );
}

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={props.className}
    >
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
  );
}

export default function SushantGatewayPage() {
  return (
    <BhamstraProvider>
      <SushantGatewayCore />
    </BhamstraProvider>
  );
}
