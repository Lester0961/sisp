import React from 'react';
import { cn } from '@/lib/utils';

interface PageFooterProps {
  className?: string;
  type?: 'cryptographic' | 'advising' | 'privacy';
}

export function PageFooter({ className, type = 'cryptographic' }: PageFooterProps) {
  const currentYear = new Date().getFullYear();
  let subtitle = 'cryptographic models';
  if (type === 'advising') {
    subtitle = 'advising models';
  } else if (type === 'privacy') {
    return (
      <footer className={cn('w-full text-center py-6 border-t border-slate-100 text-slate-400 text-[10px] pointer-events-none select-none z-10', className)}>
        &copy; {currentYear} Regis Marie College SISP. Data secured under RA 10173.
      </footer>
    );
  }

  return (
    <footer className={cn('w-full text-center py-6 border-t border-slate-100 text-slate-400 text-[10px] pointer-events-none select-none z-10', className)}>
      &copy; {currentYear} Regis Marie College SISP. Built with high-fidelity {subtitle}.
    </footer>
  );
}
