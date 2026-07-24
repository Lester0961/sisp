'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PublicNavbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/about', label: 'About SISP' },
    { href: '/services', label: 'Services' },
    { href: '/support', label: 'Support' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#0A439B]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
        {/* Left: Logo + Brand */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 -ml-2 text-[#0A439B] hover:bg-[#0A439B]/8 rounded-md md:hidden transition-colors"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-[#0A439B] flex items-center justify-center font-bold text-lg text-white">
              R
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-[#0A439B] leading-none">
                RMC SISP
              </span>
              <span className="text-[9px] font-bold tracking-[0.2em] text-[#0A439B]/70 uppercase mt-1">
                Portal Gateway
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Nav Links */}
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-semibold text-[#0A439B] py-1 transition-all duration-200 border-b-2',
                  isActive
                    ? 'border-[#0A439B]'
                    : 'border-transparent hover:border-[#0A439B]/30',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Login Button */}
        <Link
          href="/login"
          className="bg-[#0A439B] text-white font-bold py-2.5 px-6 text-sm transition-colors hover:opacity-90"
          style={{ borderRadius: '6px' }}
        >
          Login Portal
        </Link>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-[#0A439B]/10 bg-white px-4 py-5 space-y-2 absolute w-full left-0">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'block px-4 py-3 font-semibold text-sm transition-colors',
                  isActive
                    ? 'text-[#0A439B] bg-[#0A439B]/8'
                    : 'text-[#0A439B]/70 hover:text-[#0A439B] hover:bg-[#0A439B]/8',
                )}
                style={{ borderRadius: '6px' }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
