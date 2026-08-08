'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const navLinks = [
  { href: '/#why-rmc', label: 'Why RMC' },
  { href: '/#programs', label: 'Programs' },
  { href: '/#aria', label: 'ARIA Advisor' },
  { href: '/#about', label: 'About' },
];

export function PublicNavbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isHome = pathname === '/';

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors ${
        isHome
          ? 'border-[#0b3c76]/40 bg-[#0a439b] text-white shadow-sm'
          : 'border-[#1a4a6e]/10 bg-white/95 text-[#102f49] backdrop-blur-xl'
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8 2xl:px-10">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Regis Marie College home">
          <Image
            src="/rmc/rmc-logo.png"
            alt=""
            width={48}
            height={48}
            className="size-10 shrink-0 rounded-full object-contain"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight sm:text-base">Regis Marie College</p>
            <p className={`mt-0.5 text-[10px] font-medium tracking-[0.08em] ${isHome ? 'text-white/70' : 'text-[#587387]'}`}>
              Home of Educators
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Public navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition hover:-translate-y-0.5 ${
                isHome ? 'text-white/80 hover:text-white' : 'text-[#49697f] hover:text-[#102f49]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className={`hidden h-10 items-center justify-center rounded-full border px-5 text-sm font-semibold transition sm:inline-flex ${
              isHome
                ? 'border-white/30 bg-white/10 text-white hover:bg-white/20'
                : 'border-[#1a4a6e]/20 bg-white text-[#1a4a6e] hover:bg-[#eef6fc]'
            }`}
          >
            Portal Login
          </Link>
          <a
            href="/#aria"
            className={`hidden h-10 items-center justify-center rounded-full px-5 text-sm font-semibold transition md:inline-flex ${
              isHome
                ? 'bg-white text-[#1a4a6e] hover:bg-[#eef6fc]'
                : 'bg-[#1a4a6e] text-white hover:bg-[#123a58]'
            }`}
          >
            Ask ARIA
          </a>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className={`flex size-10 items-center justify-center rounded-xl transition lg:hidden ${
              isHome ? 'text-white hover:bg-white/10' : 'text-[#1a4a6e] hover:bg-[#eef6fc]'
            }`}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="border-t border-white/10 bg-[#0e2a41] px-4 py-4 text-white lg:hidden">
          <nav className="mx-auto grid max-w-[1440px] gap-1" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="mt-2 rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-[#1a4a6e]"
            >
              Portal Login
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
