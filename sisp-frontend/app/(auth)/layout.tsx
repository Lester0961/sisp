import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PageFooter } from '@/components/shared/PageFooter';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-[100dvh] w-full flex-col bg-[#f8fbfd] px-4 text-[#102f49]">
      <header className="mx-auto flex w-full max-w-6xl items-center py-5 sm:py-6">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a439b] focus-visible:ring-offset-2">
          <Image
            src="/rmc/rmc-logo.png"
            alt="Regis Marie College"
            width={44}
            height={44}
            className="size-10 shrink-0 rounded-full object-contain"
          />
          <span className="text-sm font-semibold tracking-tight text-[#102f49]">Regis Marie College</span>
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8 sm:py-12">
        {children}
      </div>

      <PageFooter type="privacy" className="mx-auto w-full max-w-6xl border-t-[#dce7ef] py-5 text-[#587387]" />
    </main>
  );
}
