import React from 'react';
import Link from 'next/link';
import { PageFooter } from '@/components/shared/PageFooter';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-[#F4F6F9] text-[#0A439B] px-4 font-sans select-none">
      
      {/* Top Navigation for Auth pages */}
      <header className="absolute top-0 w-full max-w-7xl mx-auto flex items-center justify-between p-6 z-20">
        <Link href="/" className="flex items-center space-x-2.5 hover:opacity-90 transition-all duration-300">
          <div className="w-8 h-8 rounded bg-[#0A439B] text-white flex items-center justify-center font-bold text-lg">
            R
          </div>
          <span className="font-extrabold tracking-wider text-sm text-[#0A439B]">SISP Portal</span>
        </Link>
      </header>

      {/* Auth Form Wrapper */}
      <div className="relative z-10 w-full max-w-md my-16 px-2 flex flex-col items-center">
        {children}
      </div>

      {/* Footer */}
      <PageFooter type="privacy" className="absolute bottom-6 border-t-0 py-0 text-[#0A439B]/70 w-auto" />
    </main>
  );
}
