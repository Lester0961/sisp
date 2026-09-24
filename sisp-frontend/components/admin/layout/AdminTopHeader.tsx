'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LogOut, Shield, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { Button } from '@/components/ui/button';
import { navItemsForRole, roleHomePath, isStaffRole, roleDisplayName } from '@/lib/navigation';

interface AdminTopHeaderProps {
  onOpenMobile: () => void;
}

export function AdminTopHeader({ onOpenMobile }: AdminTopHeaderProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = navItemsForRole(user?.role);
  const homeHref = roleHomePath(user?.role);
  const homeItem = navItems.find((item) => item.href === homeHref);
  const homeLabel = isStaffRole(user?.role) ? homeItem?.label ?? 'Admin Dashboard' : 'SISP';

  // Longest matching prefix wins so nested routes map to the deepest item.
  const currentItem = navItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const roleLabel = roleDisplayName(user?.role);

  return (
    <header className="sticky top-0 z-20 flex h-[68px] shrink-0 items-center justify-between border-b border-[#dce7ef] bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      {/* Left: Mobile hamburger & Section breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          className="rounded-xl border border-[#dce7ef] p-2 text-[#365a72] hover:bg-[#f1f7fb] hover:text-[#102f49] lg:hidden"
          aria-label="Open navigation sidebar"
        >
          <Menu className="size-5" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#587387]">
          <Link href={homeHref} className="font-semibold text-[#102f49] hover:text-[#0a439b] transition-colors">
            {homeLabel}
          </Link>
          {currentItem && currentItem.href !== homeHref && (
            <>
              <ChevronRight className="size-3.5 text-[#86add0]" />
              <span className="font-semibold text-[#0a439b]">{currentItem.label}</span>
            </>
          )}
        </nav>
      </div>

      {/* Right: Notifications, User Profile & Quick Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <NotificationBell />

        <div className="h-6 w-px bg-[#dce7ef] hidden sm:block" />

        {/* User Badge */}
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-[#f1f7fb]"
          title="Account Settings"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#eaf3fa] text-[#0a439b] font-bold text-xs border border-[#cbdde9]">
            {user?.email?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="hidden text-left sm:block max-w-[160px]">
            <p className="truncate text-xs font-semibold text-[#102f49]">{user?.email}</p>
            <p className="truncate text-[10px] font-medium text-[#587387]">{roleLabel}</p>
          </div>
        </Link>

        {/* Sign Out Button */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={logout}
          aria-label="Sign out"
          title="Sign out of SISP"
          className="border-[#dce7ef] text-[#365a72] hover:bg-[#fde8e8] hover:text-[#991b1b] hover:border-[#fca5a5]"
        >
          <LogOut className="size-4" strokeWidth={1.8} />
          <span className="sr-only">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
