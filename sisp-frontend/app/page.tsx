'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  GraduationCap, 
  ArrowRight, 
  Sparkles, 
  BookOpen, 
  Clock, 
  Shield, 
  Award, 
  Calendar,
  Lock,
  CheckCircle2,
  ChevronRight,
  Terminal as TerminalIcon,
  Activity,
  Layers
} from 'lucide-react';
import { InteractiveParticles } from '@/components/ui/InteractiveParticles';
import { TiltCard } from '@/components/ui/TiltCard';
import { MockTerminal } from '@/components/ui/MockTerminal';
import { DashboardWidget } from '@/components/ui/DashboardWidget';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'courses' | 'grades' | 'handoffs'>('courses');

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-start overflow-x-hidden overflow-y-auto bg-[#07070C] text-white px-4 font-sans select-none pb-24 pt-20">
      
      {/* 1. Global High-Performance Interactive Canvas Backdrop */}
      <InteractiveParticles />

      {/* Atmospheric Ambient Glow Layer */}
      <div className="absolute top-[-10%] right-[5%] h-[600px] w-[600px] rounded-full bg-indigo-900/10 blur-[160px] pointer-events-none -z-10" />
      <div className="absolute bottom-[5%] left-[5%] h-[500px] w-[500px] rounded-full bg-violet-950/10 blur-[150px] pointer-events-none -z-10" />

      {/* 2. Floating Futuristic Header */}
      <header className="absolute top-0 w-full max-w-7xl mx-auto flex items-center justify-between p-6 z-20">
        <Link href="/" className="flex items-center space-x-2.5 hover:opacity-90 transition-all duration-300">
          <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
            <GraduationCap className="h-5 w-5 text-indigo-400" />
          </div>
          <span className="font-extrabold tracking-wider text-xs sm:text-sm text-indigo-100 font-mono">REGIS MARIE SISP</span>
        </Link>
        <Link 
          href="/login"
          className="text-xs font-bold tracking-wide bg-indigo-500/10 hover:bg-indigo-600/20 border border-indigo-500/30 hover:border-indigo-400/50 backdrop-blur-md px-4 py-2 rounded-full transition-all duration-300 flex items-center gap-1.5 shadow-lg text-indigo-200 hover:text-white"
        >
          Portal Access
          <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      {/* 3. Hero Introduction */}
      <section className="relative w-full max-w-6xl text-center space-y-6 z-10 pt-8 pb-4 flex flex-col items-center">
        {/* Soft Floating Chip */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-300 text-[10px] font-bold uppercase tracking-widest animate-pulse select-none font-mono">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          Powered by ARIA AI Advisory System
        </div>

        {/* Primary Typography Hierarchy */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-none bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Your Academic Journey,<br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 via-indigo-200 to-violet-400 bg-clip-text text-transparent">
              Intelligent & Beautiful
            </span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto font-medium">
            Access curriculum profiles, evaluations, and deans exceptions overrides under a unified glassmorphic portal, secured by Regis Marie College.
          </p>
        </div>
      </section>

      {/* 4. High-Fidelity Asymmetrical Bento Grid */}
      <section className="relative w-full max-w-6xl z-10 grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
        
        {/* Card A: Interactive Portal Showcase (Col Span 2) */}
        <div className="md:col-span-2">
          <TiltCard glowColor="rgba(99, 102, 241, 0.12)" className="h-full flex flex-col justify-between">
            <div className="space-y-6 w-full text-left">
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
                <div className="flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Explore Core Portal Functions</span>
                </div>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Tabbed Showcase</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                {/* Interactive Tab Selectors */}
                <div className="flex flex-col gap-2.5 w-full sm:w-[45%] shrink-0">
                  <button
                    onClick={() => setActiveTab('courses')}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-300 flex items-start gap-3 w-full outline-none ${
                      activeTab === 'courses' 
                        ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                        : 'bg-white/[0.01] border-white/[0.03] hover:bg-white/[0.02] hover:border-white/[0.06]'
                    }`}
                  >
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border ${
                      activeTab === 'courses' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/10'
                    }`}>
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className={`font-bold text-xs ${activeTab === 'courses' ? 'text-indigo-200' : 'text-slate-200'}`}>Interactive Courses</h4>
                      <p className="text-[9px] text-slate-400 leading-normal">Examine active schedules and curriculum paths.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('grades')}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-300 flex items-start gap-3 w-full outline-none ${
                      activeTab === 'grades' 
                        ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                        : 'bg-white/[0.01] border-white/[0.03] hover:bg-white/[0.02] hover:border-white/[0.06]'
                    }`}
                  >
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border ${
                      activeTab === 'grades' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/10'
                    }`}>
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className={`font-bold text-xs ${activeTab === 'grades' ? 'text-indigo-200' : 'text-slate-200'}`}>Real-Time Grades</h4>
                      <p className="text-[9px] text-slate-400 leading-normal">Access midterm and final transcript evaluations.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('handoffs')}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-300 flex items-start gap-3 w-full outline-none ${
                      activeTab === 'handoffs' 
                        ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                        : 'bg-white/[0.01] border-white/[0.03] hover:bg-white/[0.02] hover:border-white/[0.06]'
                    }`}
                  >
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border ${
                      activeTab === 'handoffs' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/10'
                    }`}>
                      <Shield className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className={`font-bold text-xs ${activeTab === 'handoffs' ? 'text-indigo-200' : 'text-slate-200'}`}>Dean Overrides</h4>
                      <p className="text-[9px] text-slate-400 leading-normal">Submit grades override appeals securely.</p>
                    </div>
                  </button>
                </div>

                {/* Interactive Dynamic Display Panel */}
                <div className="flex-1 rounded-2xl border border-white/[0.04] bg-white/[0.01] p-4 flex flex-col justify-between min-h-[200px] transition-all duration-300 hover:border-white/[0.07] text-left">
                  {activeTab === 'courses' && (
                    <div className="space-y-4 flex flex-col justify-between h-full">
                      <div className="space-y-1.5">
                        <span className="inline-block text-[8px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">Curriculum Portal</span>
                        <h5 className="font-bold text-xs text-slate-200">Interactive Syllabi & Schedules</h5>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                          Inspect class weighting structures, units, and live timing slots synced with official university calendars.
                        </p>
                      </div>
                      
                      <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3 space-y-2 text-[10px] font-mono">
                        <div className="flex items-center justify-between font-bold text-indigo-200">
                          <span className="flex items-center gap-1"><ChevronRight className="h-3 w-3" /> CS 101: Intro to Programming</span>
                          <span>3 Units</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-400 border-t border-white/[0.04] pt-2">
                          <div className="flex items-center gap-1"><Calendar className="h-3 w-3 shrink-0 text-indigo-400" /> MW 9:00 - 10:30 AM</div>
                          <div className="flex items-center gap-1"><Award className="h-3 w-3 shrink-0 text-indigo-400" /> Labs: 40% / Exams: 30%</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'grades' && (
                    <div className="space-y-4 flex flex-col justify-between h-full">
                      <div className="space-y-1.5">
                        <span className="inline-block text-[8px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">Student Records</span>
                        <h5 className="font-bold text-xs text-slate-200">Transcript Evaluations</h5>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                          View authenticated midterm, and finals classifications. Average scores are tabulated instantly.
                        </p>
                      </div>
                      
                      <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3 space-y-2 text-[10px] font-mono">
                        <div className="flex items-center justify-between font-bold text-indigo-200">
                          <span>Cumulative GPA Index</span>
                          <span className="text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">1.15 EXCELLENT</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-white/[0.04] pt-2">
                          <span>Prelims: 1.0</span>
                          <span>Midterms: 1.25</span>
                          <span>Finals: 1.2</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'handoffs' && (
                    <div className="space-y-4 flex flex-col justify-between h-full">
                      <div className="space-y-1.5">
                        <span className="inline-block text-[8px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">Security Registry</span>
                        <h5 className="font-bold text-xs text-slate-200">Cryptographic Exceptions Override</h5>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                          Dean exceptions are signed digitally and backed under tamper-proof audit trails, instantly resolving grading disputes.
                        </p>
                      </div>
                      
                      <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3 space-y-2 text-[10px] font-mono">
                        <div className="flex items-center justify-between font-bold text-indigo-200">
                          <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-emerald-400 shrink-0" /> Appeal Exception #829</span>
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">VERIFIED</span>
                        </div>
                        <div className="text-[9px] text-slate-400 flex items-center gap-1 border-t border-white/[0.04] pt-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          Dean digital signature confirmed. Records updated.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-white/[0.04] mt-6 w-full">
              <Link 
                href="/login"
                className="w-full sm:flex-1 text-center py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-1.5"
              >
                Sign In to Dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link 
                href="/register"
                className="w-full sm:flex-1 text-center py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-indigo-200 hover:text-white font-bold text-xs rounded-xl transition-all duration-300"
              >
                Register New Account
              </Link>
            </div>
          </TiltCard>
        </div>

        {/* Card B: ARIA AI Advisory Terminal (Col Span 1) */}
        <div className="md:col-span-1">
          <TiltCard glowColor="rgba(6, 182, 212, 0.12)" className="h-full flex flex-col justify-between">
            <div className="space-y-4 h-full flex flex-col justify-between">
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
                  <div className="flex items-center gap-1.5">
                    <TerminalIcon className="h-4 w-4 text-cyan-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">ARIA AI Advisory Shell</span>
                  </div>
                  <span className="rounded-full bg-cyan-950 px-2 py-0.5 text-[8px] font-bold text-cyan-300 font-mono">CLI SDK</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                  Execute direct system commands or test the semantic FastAPI advisory neural routing engine below.
                </p>
              </div>

              {/* Console Widget */}
              <div className="w-full">
                <MockTerminal />
              </div>
            </div>
          </TiltCard>
        </div>

        {/* Card C: Interactive Stats Monitor (Col Span 1) */}
        <div className="md:col-span-1">
          <TiltCard glowColor="rgba(139, 92, 246, 0.12)" className="h-full">
            <DashboardWidget />
          </TiltCard>
        </div>

        {/* Card D: Legal & compliance information banner (Col Span 2) */}
        <div className="md:col-span-2">
          <TiltCard glowColor="rgba(244, 63, 94, 0.08)" className="h-full flex flex-col justify-between text-left space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
              <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                Institutional Security Protocols
              </span>
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider font-mono">Status: Secure</span>
            </div>
            
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
              Authorized access only. SISP activities are logged, tracked, and encrypted using modern cryptographic handshake profiles. All transactional procedures comply strictly with the provisions of the Philippine Data Privacy Act of 2012 (Republic Act No. 10173). Security parameters are audited routinely by the Board of Academic Trustees.
            </p>

            <div className="flex items-center gap-3 pt-1 text-[9px] font-mono text-slate-500">
              <span>CIPHER: AES-256-GCM</span>
              <span>•</span>
              <span>AUDIT: ACTIVE</span>
              <span>•</span>
              <span>REGIS MARIE BOARD APPROVED</span>
            </div>
          </TiltCard>
        </div>

      </section>

      {/* 5. Clean Footer */}
      <footer className="absolute bottom-6 text-center text-slate-600 text-[10px] select-none pointer-events-none w-full font-mono">
        &copy; {new Date().getFullYear()} Regis Marie College. All Rights Reserved. Secure SISP Interface v1.1.2
      </footer>

    </main>
  );
}