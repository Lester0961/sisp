import React from 'react';
import Link from 'next/link';

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#F4F6F9] py-12 px-4 sm:px-6 lg:px-8 border-t border-[#0A439B]/10 text-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-md bg-[#0A439B] flex items-center justify-center font-bold text-lg text-white">
            R
          </div>
          <div className="flex flex-col">
            <span className="text-[#0A439B]/70 font-semibold text-xs">
              &copy; {currentYear} RMC SISP. All Rights Reserved.
            </span>
            <span className="text-[#0A439B]/70 text-[10px] mt-0.5 font-medium uppercase tracking-[0.2em]">
              RA 10173 Compliant
            </span>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-8 text-[#0A439B] font-semibold">
          <Link href="/calendar" className="hover:underline transition-colors">
            Academic Calendar
          </Link>
          <Link href="/privacy" className="hover:underline transition-colors">
            Privacy Policy
          </Link>
          <Link href="/support" className="hover:underline transition-colors">
            Contact Support
          </Link>
          <Link href="/security" className="hover:underline transition-colors">
            Security Protocol
          </Link>
        </div>
      </div>
    </footer>
  );
}
