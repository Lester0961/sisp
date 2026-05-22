import React from 'react';
import { GraduationCap } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-slate-50 text-slate-900 px-4 font-sans select-none">
      
      {/* 2. Top Navigation for Auth pages */}
      <header className="absolute top-0 w-full max-w-7xl mx-auto flex items-center justify-between p-6 z-20">
        <Link href="/" className="flex items-center space-x-2.5 hover:opacity-90 transition-all duration-300">
          <div className="w-8 h-8 rounded bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-lg">
            R
          </div>
          <span className="font-extrabold tracking-wider text-sm text-[#1e3a8a]">SISP Portal</span>
        </Link>
      </header>

      {/* 3. Auth Form Wrapper */}
      <div className="relative z-10 w-full max-w-md my-16 px-2 flex flex-col items-center">
        {children}
      </div>

      {/* 4. Footer */}
      <footer className="absolute bottom-6 text-center text-slate-500 text-[10px] select-none pointer-events-none">
        &copy; {new Date().getFullYear()} Regis Marie College SISP. Data secured under RA 10173.
      </footer>
    </main>
  );
}