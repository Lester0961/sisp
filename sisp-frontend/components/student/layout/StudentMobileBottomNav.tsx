'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Ellipsis, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navItemsForRole } from '@/lib/navigation';
import { useEscalationAttentionStore } from '@/stores/escalationAttentionStore';

interface PrimaryMobileItem {
  href: string;
  shortLabel: string;
  icon: LucideIcon;
  center?: boolean;
}

const STUDENT_PRIMARY_HREFS = new Set(['/dashboard', '/enrollment', '/grades', '/chat']);

export function StudentMobileBottomNav() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const escalationCount = useEscalationAttentionStore((state) => state.count);
  const studentItems = navItemsForRole('student');
  const primaryItems = studentItems.filter((item) => STUDENT_PRIMARY_HREFS.has(item.href)) as PrimaryMobileItem[];
  const moreItems = studentItems.filter((item) => !STUDENT_PRIMARY_HREFS.has(item.href));
  const activeHref = studentItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const isMoreActive = Boolean(activeHref && !STUDENT_PRIMARY_HREFS.has(activeHref));

  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMoreOpen) return;
    const closeOnOutsideOrEscape = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key === 'Escape') {
        setIsMoreOpen(false);
      } else if (event instanceof MouseEvent && !menuRef.current?.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideOrEscape);
    document.addEventListener('keydown', closeOnOutsideOrEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideOrEscape);
      document.removeEventListener('keydown', closeOnOutsideOrEscape);
    };
  }, [isMoreOpen]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dceae4] bg-[#fbfdfc]/95 shadow-[0_-10px_28px_rgb(23_61_58_/_0.08)] backdrop-blur-xl lg:hidden" ref={menuRef}>
      <section
          id="student-mobile-more-menu"
          aria-label="More student portal pages"
          aria-hidden={!isMoreOpen}
          className={cn(
            'absolute bottom-[calc(100%+0.75rem)] right-3 w-[min(21rem,calc(100vw-1.5rem))] rounded-2xl border border-[#d7e7e1] bg-white p-2 shadow-[0_18px_48px_rgb(16_47_73_/_0.18)] sm:right-5',
            !isMoreOpen && 'hidden',
          )}
        >
          <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#82988e]">More from your portal</p>
          <div className="grid gap-1">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === activeHref;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                    isActive ? 'bg-[#eaf4ee] text-[#176a5d]' : 'text-[#46655e] hover:bg-[#f3f8f5] hover:text-[#173d3a]',
                  )}
                >
                  <Icon className="size-[18px] shrink-0 text-[#6f9285]" strokeWidth={1.9} />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.href === '/tickets' && escalationCount > 0 && (
                    <span className="size-2.5 rounded-full bg-amber-500 ring-2 ring-white" aria-label={`${escalationCount} escalations need attention`} />
                  )}
                </Link>
              );
            })}
          </div>
      </section>

      <nav
        className="grid min-h-[calc(4.45rem+env(safe-area-inset-bottom))] grid-cols-5 items-start gap-0 px-1.5 pb-[env(safe-area-inset-bottom)] pt-1.5"
        aria-label="Student mobile navigation"
      >
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex min-w-0 flex-col items-center gap-1 rounded-xl px-0.5 py-1 text-center transition-colors active:translate-y-px',
                isActive ? 'text-[#176a5d]' : 'text-[#718b81]',
              )}
            >
              <span
                className={cn(
                  'relative flex size-8 items-center justify-center rounded-xl',
                  item.center && 'size-10 -mt-3 border-[3px] border-[#fbfdfc] bg-[#176a5d] text-white shadow-[0_8px_20px_rgb(23_106_93_/_0.24)]',
                  isActive && !item.center && 'bg-[#eaf4ee]',
                )}
              >
                <Icon aria-hidden="true" className={item.center ? 'size-[19px]' : 'size-[18px]'} strokeWidth={1.9} />
              </span>
              <span className={cn('max-w-full truncate text-[10px] leading-none', isActive && 'font-bold')}>
                {item.href === '/dashboard' ? 'Home' : item.shortLabel}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setIsMoreOpen((open) => !open)}
          aria-expanded={isMoreOpen}
          aria-controls="student-mobile-more-menu"
          className={cn(
            'flex min-w-0 flex-col items-center gap-1 rounded-xl px-0.5 py-1 text-center transition-colors',
            isMoreActive || isMoreOpen ? 'text-[#176a5d]' : 'text-[#718b81]',
          )}
        >
          <span className={cn('flex size-8 items-center justify-center rounded-xl', (isMoreActive || isMoreOpen) && 'bg-[#eaf4ee]')}>
            <Ellipsis aria-hidden="true" className="size-[19px]" strokeWidth={2} />
          </span>
          <span className={cn('text-[10px] leading-none', (isMoreActive || isMoreOpen) && 'font-bold')}>More</span>
        </button>
      </nav>
    </div>
  );
}
