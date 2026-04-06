'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { Button } from '@/components/ui/button';
import {
  GraduationCap,
  LogOut,
  LayoutDashboard,
  BookOpen,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const studentNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/grades', label: 'Grades', icon: BookOpen },
  { href: '/requests', label: 'Documents', icon: FileText },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <GraduationCap className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none">SISP</p>
            <p className="text-xs text-muted-foreground">
              Regis Marie College
            </p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="hidden items-center space-x-1 md:flex">
          {studentNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'flex items-center gap-2',
                    isActive && 'pointer-events-none',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center space-x-3">
          {/* NotificationBell — replaces simple bell icon */}
          <NotificationBell />

          {/* User info */}
          <div className="hidden flex-col text-right md:flex">
            <span className="text-xs font-medium">{user?.email}</span>
            <span className="text-xs capitalize text-muted-foreground">
              {user?.role?.replace('_', ' ')}
            </span>
          </div>

          {/* Logout */}
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" />
            <span className="ml-2 hidden md:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}