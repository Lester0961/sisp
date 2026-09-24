'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { Button } from '@/components/ui/button';
import { navItemsForRole } from '@/lib/navigation';

interface StudentTopHeaderProps {
  onOpenMobile: () => void;
}

export function StudentTopHeader({ onOpenMobile }: StudentTopHeaderProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const currentItem = navItemsForRole('student')
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Student';

  return (
    <header className="sticky top-0 z-20 flex min-h-[72px] shrink-0 items-center justify-between gap-3 border-b border-[#dceae4] bg-[#fbfdfc]/95 px-3 backdrop-blur-md sm:px-5 lg:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-[#d7e7e1] bg-white text-[#286b5b] shadow-sm transition hover:bg-[#edf6f1] lg:hidden"
          aria-label="Open student navigation"
        >
          <Menu className="size-5" />
        </button>
        <div className="min-w-0">
          <p className="hidden text-[9px] font-bold uppercase tracking-[0.18em] text-[#779387] sm:block">Student portal</p>
          <nav aria-label="Student breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
            <Link href="/dashboard" className="shrink-0 font-semibold text-[#46655e] transition hover:text-[#176a5d]">
              My campus
            </Link>
            {currentItem && currentItem.href !== '/dashboard' && (
              <>
                <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-[#9bb4a9]" />
                <span className="truncate font-semibold text-[#176a5d]">{currentItem.label}</span>
              </>
            )}
          </nav>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <NotificationBell />
        <span className="mx-1 hidden h-7 w-px bg-[#e0ebe6] sm:block" aria-hidden="true" />
        <Link
          href="/settings"
          className="flex min-w-0 items-center gap-2 rounded-2xl px-1.5 py-1.5 transition hover:bg-[#edf6f1] sm:px-2"
          title="Account settings"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#d4e7dd] bg-[#eaf4ee] text-xs font-bold text-[#176a5d]">
            {fullName.charAt(0).toUpperCase()}
          </span>
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block max-w-[150px] truncate text-xs font-semibold text-[#173d3a]">{fullName}</span>
            <span className="block text-[10px] text-[#718b81]">Student</span>
          </span>
        </Link>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={logout}
          aria-label="Sign out"
          title="Sign out of the Student Portal"
          className="border-[#d7e7e1] text-[#66847a] hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
