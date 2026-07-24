'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BookOpen, MessageSquare, FileText, Settings, Sparkles, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; isCenter?: boolean };

const roleNavs: Record<string, NavItem[]> = {
  student: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/grades', label: 'Grades', icon: BookOpen },
    { href: '/chat', label: 'ARIA Chat', icon: Sparkles, isCenter: true },
    { href: '/requests', label: 'Documents', icon: FileText },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  faculty: [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/faculty/grades', label: 'Grades', icon: BookOpen },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  dean: [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dean/grades', label: 'Grade Approval', icon: BookOpen },
    { href: '/dean/exceptions', label: 'Exceptions', icon: FileText },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  admin_staff: [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/grades', label: 'Grade Review', icon: BookOpen },
    { href: '/admin/requests', label: 'Payments', icon: FileText },
    { href: '/admin/escalations', label: 'ARIA', icon: Sparkles, isCenter: true },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  sys_admin: [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/escalations', label: 'ARIA', icon: Sparkles, isCenter: true },
    { href: '/admin/audit', label: 'Audit', icon: FileText },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  live_agent: [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/live-agent', label: 'Live Chat', icon: MessageSquare },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
};

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const userRole = user?.role || 'student';
  const navItems = roleNavs[userRole] || roleNavs.student;

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full md:hidden">
      {/* Soft gradient background for the navigation bar */}
      <div className="absolute inset-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]" />
      
      {/* Extra padding at bottom for safe areas on mobile devices (e.g. iOS home indicator) */}
      <nav className="relative flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-2 h-[72px]">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <div key={item.href} className="relative -top-5 px-2">
                <Link href={item.href} className="flex flex-col items-center">
                  <div className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 duration-300",
                    isActive 
                      ? "bg-slate-800 text-white" 
                      : "bg-gradient-to-tr from-[#1e3a8a] to-blue-600 text-white hover:scale-105"
                  )}>
                    {isActive ? (
                      <MessageSquare className="h-6 w-6" />
                    ) : (
                      <Sparkles className="h-6 w-6 animate-pulse" />
                    )}
                  </div>
                  <span className={cn(
                    "mt-1 text-[10px] font-bold tracking-tight",
                    isActive ? "text-[#1e3a8a]" : "text-slate-500"
                  )}>
                    ARIA
                  </span>
                </Link>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center space-y-1 transition-colors active:scale-95",
                isActive ? "text-[#1e3a8a]" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <div className={cn(
                "flex items-center justify-center rounded-xl p-1.5 transition-colors",
                isActive ? "bg-blue-50" : "bg-transparent"
              )}>
                <Icon className={cn("h-5 w-5", isActive ? "stroke-[2.5px]" : "stroke-2")} />
              </div>
              <span className={cn(
                "text-[10px] font-medium tracking-tight",
                isActive ? "font-bold" : ""
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
