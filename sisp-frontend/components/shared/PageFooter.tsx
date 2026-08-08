import React from 'react';
import { cn } from '@/lib/utils';

interface PageFooterProps {
  className?: string;
  type?: 'general' | 'advising' | 'privacy';
}

export function PageFooter({ className, type = 'general' }: PageFooterProps) {
  const currentYear = new Date().getFullYear();
  if (type === 'privacy') {
    return (
      <footer className={cn('w-full text-center py-6 border-t border-slate-100 text-slate-400 text-[10px] pointer-events-none select-none z-10', className)}>
        &copy; {currentYear} Regis Marie College SISP. Data secured under RA 10173.
      </footer>
    );
  }

  const suffix = type === 'advising'
    ? 'ARIA provides academic guidance from approved school sources.'
    : 'Student information and services portal.';

  return (
    <footer className={cn('w-full text-center py-6 border-t border-slate-100 text-slate-400 text-[10px] pointer-events-none select-none z-10', className)}>
      &copy; {currentYear} Regis Marie College SISP. {suffix}
    </footer>
  );
}
