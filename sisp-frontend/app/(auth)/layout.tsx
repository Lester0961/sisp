import React from 'react';
import { GraduationCap } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-[#0A0A10] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#13112E] via-[#08080C] to-black text-white px-4 font-sans select-none">
      {/* 1. Glassmorphic Glowing Backdrop Orbs (HCI Ambient Depth) */}
      <div className="absolute top-[10%] right-[15%] h-[350px] w-[350px] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse duration-[6s] pointer-events-none" />
      <div className="absolute bottom-[15%] left-[10%] h-[400px] w-[400px] rounded-full bg-violet-700/15 blur-[140px] animate-pulse duration-[8s] pointer-events-none" />
      <div className="absolute top-[40%] left-[35%] h-[250px] w-[250px] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none" />
      
      {/* 2. Top Navigation for Auth pages */}
      <header className="absolute top-0 w-full max-w-7xl mx-auto flex items-center justify-between p-6 z-20">
        <Link href="/" className="flex items-center space-x-2.5 hover:opacity-90 transition-all duration-300">
          <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
            <GraduationCap className="h-5 w-5 text-indigo-400" />
          </div>
          <span className="font-extrabold tracking-wider text-sm text-indigo-100">REGIS MARIE SISP</span>
        </Link>
      </header>

      {/* 3. Auth Form Wrapper */}
      <div className="relative z-10 w-full max-w-md my-16 px-2 flex flex-col items-center">
        {children}
      </div>

      {/* 4. Footer */}
      <footer className="absolute bottom-6 text-center text-slate-600 text-[10px] select-none pointer-events-none">
        &copy; {new Date().getFullYear()} Regis Marie College SISP. Data secured under RA 10173.
      </footer>
    </main>
  );
}