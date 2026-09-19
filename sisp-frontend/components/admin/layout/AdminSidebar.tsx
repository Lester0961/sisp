'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  BookOpen,
  CreditCard,
  Sparkles,
  BookMarked,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  FileText,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export interface NavItemConfig {
  href: string;
  label: string;
  shortLabel?: string;
  icon: typeof LayoutDashboard;
  badge?: string | number;
  roles?: string[];
  group?: 'main' | 'operations' | 'academic' | 'system';
}

export const ADMIN_NAV_ITEMS: NavItemConfig[] = [
  {
    href: '/admin/dashboard',
    label: 'Overview',
    shortLabel: 'Overview',
    icon: LayoutDashboard,
    group: 'main',
    roles: ['registrar', 'treasury', 'sys_admin', 'dean'],
  },
  {
    href: '/admin/users',
    label: 'User Management',
    shortLabel: 'Users',
    icon: Users,
    group: 'operations',
    roles: ['sys_admin'],
  },
  {
    href: '/admin/admission',
    label: 'Admission Review',
    shortLabel: 'Admissions',
    icon: UserCheck,
    group: 'operations',
    roles: ['registrar', 'sys_admin', 'dean'],
  },
  {
    href: '/admin/financials',
    label: 'Financial Records',
    shortLabel: 'Financials',
    icon: Wallet,
    group: 'operations',
    roles: ['treasury', 'sys_admin'],
  },
  {
    href: '/admin/requests',
    label: 'Payment Approvals',
    shortLabel: 'Payments',
    icon: CreditCard,
    group: 'operations',
    roles: ['treasury'],
  },
  {
    href: '/admin/documents',
    label: 'Document Catalog',
    shortLabel: 'Catalog',
    icon: FileText,
    group: 'operations',
    roles: ['registrar', 'sys_admin'],
  },
  {
    href: '/admin/escalations',
    label: 'ARIA Escalations',
    shortLabel: 'Escalations',
    icon: Sparkles,
    group: 'operations',
    roles: ['registrar'],
  },
  {
    href: '/admin/enrollments',
    label: 'Course Assignments',
    shortLabel: 'Assignments',
    icon: UserCheck,
    group: 'academic',
    roles: ['registrar', 'dean'],
  },
  {
    href: '/admin/grades',
    label: 'Grade Review',
    shortLabel: 'Grades',
    icon: BookOpen,
    group: 'academic',
    roles: ['registrar'],
  },
  {
    href: '/admin/kb',
    label: 'Knowledge Base',
    shortLabel: 'Policies',
    icon: BookMarked,
    group: 'system',
    roles: ['registrar', 'sys_admin'],
  },
  {
    href: '/admin/audit',
    label: 'System Audit Logs',
    shortLabel: 'Audit',
    icon: Shield,
    group: 'system',
    roles: ['sys_admin'],
  },
  {
    href: '/settings',
    label: 'Admin Settings',
    shortLabel: 'Settings',
    icon: Settings,
    group: 'system',
    roles: ['registrar', 'treasury', 'sys_admin', 'dean', 'faculty', 'live_agent'],
  },
];

const GROUP_LABELS: Record<string, string> = {
  main: 'Dashboard',
  operations: 'Operations',
  academic: 'Academic Records',
  system: 'Administration',
};

interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function AdminSidebar({
  isCollapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const role = user?.role ?? 'registrar';

  const accessibleItems = ADMIN_NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  // Group items
  const groupedItems = accessibleItems.reduce((acc, item) => {
    const groupKey = item.group ?? 'main';
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(item);
    return acc;
  }, {} as Record<string, NavItemConfig[]>);

  const sidebarContent = (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r border-[#dce7ef] bg-white transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-[76px]' : 'w-[260px]'
      )}
      aria-label="Admin Side Navigation"
    >
      {/* Brand Header */}
      <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#dce7ef] px-4">
        <Link
          href="/admin/dashboard"
          className={cn(
            'flex items-center gap-3 overflow-hidden transition-all',
            isCollapsed && 'justify-center w-full'
          )}
          title="Regis Marie College SISP Admin"
        >
          <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf3fa] p-1 shadow-xs border border-[#cbdde9]">
            <Image
              src="/rmc/rmc-logo.png"
              alt="RMC Logo"
              width={34}
              height={34}
              className="size-8 object-contain"
              priority
            />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[15px] tracking-tight text-[#102f49]">SISP</span>
                <span className="rounded bg-[#0a439b]/10 px-1.5 py-0.2 text-[10px] font-bold tracking-wide text-[#0a439b]">
                  ADMIN
                </span>
              </div>
              <p className="truncate text-[11px] font-medium text-[#587387]">Regis Marie College</p>
            </div>
          )}
        </Link>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
          aria-label="Close menu"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-6">
        {Object.entries(groupedItems).map(([groupKey, items]) => (
          <div key={groupKey} className="space-y-1">
            {!isCollapsed ? (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#6c879a]">
                {GROUP_LABELS[groupKey] ?? groupKey}
              </p>
            ) : (
              <div className="mx-auto my-1.5 h-px w-6 bg-[#e2edf4]" />
            )}

            {items.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/admin/dashboard'
                  ? pathname === '/admin/dashboard'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-[#0a439b] text-white shadow-[0_4px_12px_rgb(10_67_155_/_0.22)]'
                      : 'text-[#365a72] hover:bg-[#f1f7fb] hover:text-[#102f49]',
                    isCollapsed && 'justify-center px-0'
                  )}
                >
                  <Icon
                    className={cn(
                      'size-4.5 shrink-0 transition-transform duration-150 group-hover:scale-105',
                      isActive ? 'text-white' : 'text-[#587387] group-hover:text-[#0a439b]'
                    )}
                    strokeWidth={isActive ? 2.1 : 1.8}
                  />

                  {!isCollapsed && (
                    <span className="truncate text-[13px]">{item.label}</span>
                  )}

                  {/* Floating tooltip when collapsed */}
                  {isCollapsed && (
                    <span className="pointer-events-none absolute left-full ml-3 z-50 hidden whitespace-nowrap rounded-md bg-[#102f49] px-2.5 py-1 text-xs font-semibold text-white shadow-md group-hover:block">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Collapse Toggle Footer */}
      <div className="shrink-0 border-t border-[#dce7ef] p-3">
        {!isCollapsed ? (
          <div className="mb-2 flex items-center justify-between rounded-xl bg-[#f8fbfe] p-2.5 border border-[#e2edf4]">
            <div className="min-w-0 pr-2">
              <p className="truncate text-xs font-semibold text-[#102f49]">{user?.email}</p>
              <p className="truncate text-[10px] font-medium uppercase text-[#587387]">
                {role.replace(/_/g, ' ')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={logout}
              title="Sign Out"
              className="text-[#6c879a] hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="size-3.5" />
            </Button>
          </div>
        ) : (
          <div className="mb-2 flex justify-center">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={logout}
              title="Sign Out"
              className="text-[#6c879a] hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            'hidden lg:flex w-full items-center gap-2 rounded-xl border border-[#dce7ef] bg-white py-2 text-xs font-semibold text-[#587387] shadow-2xs transition-colors hover:bg-[#f1f7fb] hover:text-[#102f49]',
            isCollapsed ? 'justify-center px-0' : 'justify-between px-3'
          )}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
        >
          {!isCollapsed && <span>Minimize menu</span>}
          {isCollapsed ? (
            <ChevronRight className="size-4 text-[#0a439b]" strokeWidth={2} />
          ) : (
            <ChevronLeft className="size-4 text-[#587387]" strokeWidth={2} />
          )}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block h-screen sticky top-0 shrink-0 z-30">
        {sidebarContent}
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Slider */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[260px] bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </div>
    </>
  );
}
