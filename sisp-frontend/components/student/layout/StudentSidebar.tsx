'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, X } from 'lucide-react';
import type { User } from '@/types';
import { cn } from '@/lib/utils';
import {
  PORTAL_GROUP_LABELS,
  PORTAL_GROUP_ORDER,
  navItemsForRole,
  roleHomePath,
  roleDisplayName,
} from '@/lib/navigation';
import { Button } from '@/components/ui/button';

interface StudentSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  user: User | null;
  onSignOut: () => void;
}

function StudentSidebarPanel({
  mobile = false,
  onCloseMobile,
  user,
  onSignOut,
}: Omit<StudentSidebarProps, 'mobileOpen'> & { mobile?: boolean }) {
  const pathname = usePathname();
  const navItems = navItemsForRole('student');
  const activeHref = navItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const groups = navItems.reduce<Record<string, typeof navItems>>((result, item) => {
    result[item.group] ??= [];
    result[item.group].push(item);
    return result;
  }, {});
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Student';
  const initial = fullName.charAt(0).toUpperCase();

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-[#d7e7e1] bg-[#fbfdfc] text-[#173d3a]',
        mobile ? 'w-[min(19rem,88vw)] shadow-2xl' : 'w-[272px]',
      )}
      aria-label="Student navigation"
    >
      <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#e2ece7] px-5">
        <Link
          href={roleHomePath('student')}
          onClick={onCloseMobile}
          className="flex min-w-0 items-center gap-3"
          aria-label="SISP Student Portal home"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-[#d2e6dd] bg-[#edf6f1] shadow-sm">
            <Image src="/rmc/rmc-logo.png" alt="" width={32} height={32} className="size-8 object-contain" priority />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="flex items-center gap-2">
              <span className="text-[15px] font-extrabold tracking-tight text-[#173d3a]">SISP</span>
              <span className="rounded-full bg-[#e5f2eb] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#246b58]">
                Student
              </span>
            </span>
            <span className="mt-0.5 block truncate text-[11px] font-medium text-[#66847a]">Regis Marie College</span>
          </span>
        </Link>
        {mobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-xl p-2 text-[#66847a] transition hover:bg-[#edf6f1] hover:text-[#173d3a] lg:hidden"
            aria-label="Close student navigation"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-3.5 py-5">
        {PORTAL_GROUP_ORDER.filter((group) => groups[group]?.length).map((group) => (
          <section key={group} aria-label={PORTAL_GROUP_LABELS[group]} className="space-y-1.5">
            <h2 className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#82988e]">
              {group === 'main' ? 'My campus' : group === 'services' ? 'Campus services' : PORTAL_GROUP_LABELS[group]}
            </h2>
            {groups[group].map((item) => {
              const Icon = item.icon;
              const isActive = item.href === activeHref;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors',
                    isActive
                      ? 'bg-[#176a5d] text-white shadow-[0_5px_14px_rgb(23_106_93_/_0.18)]'
                      : 'text-[#46655e] hover:bg-[#edf6f1] hover:text-[#173d3a]',
                  )}
                >
                  <Icon className={cn('size-[18px] shrink-0', isActive ? 'text-white' : 'text-[#6f9285] group-hover:text-[#176a5d]')} strokeWidth={1.9} />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </Link>
              );
            })}
          </section>
        ))}
      </div>

      <div className="shrink-0 border-t border-[#e2ece7] p-3.5">
        <div className="flex items-center gap-3 rounded-2xl border border-[#e2ece7] bg-white p-3 shadow-[0_4px_14px_rgb(23_61_58_/_0.04)]">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e9f4ee] text-sm font-bold text-[#176a5d]">
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-[#173d3a]">{fullName}</span>
            <span className="block truncate text-[10px] text-[#718b81]">{user?.email}</span>
            <span className="sr-only">{roleDisplayName(user?.role)}</span>
          </span>
          {mobile && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onSignOut}
              aria-label="Sign out of the Student Portal"
              title="Sign out"
              className="text-[#718b81] hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}

export function StudentSidebar({ mobileOpen, onCloseMobile, user, onSignOut }: StudentSidebarProps) {
  return (
    <>
      <div className="sticky top-0 z-30 hidden h-screen shrink-0 lg:block">
        <StudentSidebarPanel onCloseMobile={onCloseMobile} user={user} onSignOut={onSignOut} />
      </div>
      {mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-[#102f2c]/35 backdrop-blur-[2px] lg:hidden"
            onClick={onCloseMobile}
            aria-label="Close student navigation"
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <StudentSidebarPanel mobile onCloseMobile={onCloseMobile} user={user} onSignOut={onSignOut} />
          </div>
        </>
      )}
    </>
  );
}
