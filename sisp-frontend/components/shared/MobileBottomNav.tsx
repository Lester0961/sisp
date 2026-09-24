'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { mobileNavItemsForRole } from '@/lib/navigation';
import { useEscalationAttentionStore } from '@/stores/escalationAttentionStore';

/**
 * Mobile quick navigation derived from the shared portal nav config so it can
 * never drift from the sidebar. Hidden on lg+ where the side nav is visible.
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const escalationCount = useEscalationAttentionStore((state) => state.count);
  const navItems = mobileNavItemsForRole(user?.role);

  if (navItems.length === 0) {
    return null;
  }

  const activeHref = navItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dce7ef] bg-white lg:hidden">
      <nav
        className="flex min-h-[calc(4.75rem+env(safe-area-inset-bottom))] items-start justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-2"
        aria-label="Mobile portal navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === activeHref;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-center transition-colors active:translate-y-px',
                isActive ? 'text-[#0a439b]' : 'text-[#6c879a]',
              )}
            >
              <span
                className={cn(
                  'relative flex size-8 items-center justify-center rounded-xl',
                  item.center && 'size-10 -mt-4 border-4 border-[#f8fbfd] bg-[#0a439b] text-white shadow-[0_8px_20px_rgb(10_67_155_/_0.22)]',
                  isActive && !item.center && 'bg-[#eaf3fa]',
                )}
              >
                <Icon className={cn(item.center ? 'size-5' : 'size-[18px]')} strokeWidth={1.9} />
                {item.href === '/tickets' && escalationCount > 0 && (
                  <span className="absolute right-1 top-0 size-2.5 rounded-full bg-amber-500 ring-2 ring-white" aria-label={`${escalationCount} escalations need attention`} />
                )}
              </span>
              <span className={cn('max-w-full truncate text-[11px] leading-none', isActive && 'font-bold')}>
                {item.shortLabel ?? item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
