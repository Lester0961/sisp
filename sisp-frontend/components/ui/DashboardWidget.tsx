'use client';

import React, { useState } from 'react';
import { Cpu, Zap, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export const DashboardWidget: React.FC = () => {
  const [trafficRate, setTrafficRate] = useState(65);
  const [selectedModel, setSelectedModel] = useState('ARIA-NLP-Hybrid');

  // Radial chart configuration
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (trafficRate / 100) * circumference;

  return (
    <div className="w-full flex flex-col justify-between h-full space-y-4">
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
        <div className="flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metrics Monitor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">Operational</span>
        </div>
      </div>

      {/* Main Dial and Details */}
      <div className="flex items-center justify-between py-2">
        {/* Radial Dial Indicator */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="h-20 w-20 transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r={radius}
              className="stroke-white/[0.04] fill-none"
              strokeWidth="5"
            />
            <motion.circle
              cx="40"
              cy="40"
              r={radius}
              className="stroke-indigo-400 fill-none"
              strokeWidth="5"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute text-center">
            <div className="text-sm font-mono font-black text-indigo-200">{trafficRate}%</div>
            <div className="text-[8px] uppercase tracking-widest text-slate-400 font-bold">API Load</div>
          </div>
        </div>

        {/* Configurations */}
        <div className="space-y-2.5 pl-4 flex-1 text-left">
          <div>
            <label className="text-[8px] uppercase text-slate-500 font-bold tracking-wider block">Neural Engine Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/[0.06] bg-white/[0.01] px-2 py-1 text-[9px] text-indigo-200 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 font-semibold"
            >
              <option className="bg-[#0A0A10] text-slate-300" value="ARIA-NLP-Hybrid">ARIA Hybrid NLP</option>
              <option className="bg-[#0A0A10] text-slate-300" value="Mixtral-8x7B">Mixtral LLM</option>
              <option className="bg-[#0A0A10] text-slate-300" value="Embedding-v3-pgvector">Supabase Vector V3</option>
            </select>
          </div>
          
          <div>
            <label className="text-[8px] uppercase text-slate-500 font-bold tracking-wider block">Advisory Rate limit</label>
            <input
              type="range"
              min="10"
              max="100"
              value={trafficRate}
              onChange={(e) => setTrafficRate(Number(e.target.value))}
              className="w-full h-1 bg-white/[0.04] rounded-lg appearance-none cursor-pointer accent-indigo-400 mt-1"
            />
          </div>
        </div>
      </div>

      {/* Footer Metrics */}
      <div className="space-y-1.5 border-t border-white/[0.04] pt-3 text-[9px] font-mono text-slate-400">
        <div className="flex justify-between">
          <span className="flex items-center gap-1"><Cpu className="h-3 w-3 text-indigo-400" /> Vector Latency:</span>
          <span className="text-slate-200 font-semibold">{Math.round(15 + (trafficRate * 0.1))} ms</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-indigo-400" /> Active Cache:</span>
          <span className="text-emerald-400 font-bold">96.8% (Hit)</span>
        </div>
      </div>
    </div>
  );
};
