import type { LucideIcon } from 'lucide-react';
import {
  BookMarked,
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
  UserCheck,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';

export type PortalNavGroup = 'main' | 'academic' | 'services' | 'operations' | 'system';

export interface PortalNavItem {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  group: PortalNavGroup;
  roles: string[];
  /** Show in the mobile bottom bar (max ~5 per role; one may be the raised center action). */
  mobile?: boolean;
  /** Raised center action in the mobile bottom bar. */
  center?: boolean;
}

export const PORTAL_GROUP_LABELS: Record<PortalNavGroup, string> = {
  main: 'Dashboard',
  academic: 'Academics',
  services: 'Student Services',
  operations: 'Operations',
  system: 'Administration',
};

export const PORTAL_GROUP_ORDER: PortalNavGroup[] = [
  'main',
  'academic',
  'services',
  'operations',
  'system',
];

/**
 * Single source of truth for portal navigation across every role.
 * Items must stay aligned with the API authorization matrix:
 * - backend @Roles / @RequirePermissions (NestJS guards)
 * - middleware.ts UX route guard
 * A role only sees items it can actually complete end to end.
 */
export const PORTAL_NAV_ITEMS: PortalNavItem[] = [
  // --- Student ---
  { href: '/dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard, group: 'main', roles: ['student'], mobile: true },
  { href: '/enrollment', label: 'Enrollment', shortLabel: 'Enroll', icon: BookOpen, group: 'academic', roles: ['student'], mobile: true },
  { href: '/schedule', label: 'Class Schedule', shortLabel: 'Schedule', icon: CalendarDays, group: 'academic', roles: ['student'] },
  { href: '/grades', label: 'Grades', shortLabel: 'Grades', icon: GraduationCap, group: 'academic', roles: ['student'], mobile: true },
  { href: '/curriculum', label: 'Curriculum Progress', shortLabel: 'Curriculum', icon: ClipboardList, group: 'academic', roles: ['student'] },
  { href: '/financials', label: 'Financial Information', shortLabel: 'Fees', icon: Wallet, group: 'services', roles: ['student'], mobile: true },
  { href: '/requests', label: 'Service Requests', shortLabel: 'Requests', icon: FileText, group: 'services', roles: ['student'] },
  { href: '/chat', label: 'ARIA Assistant', shortLabel: 'ARIA', icon: Sparkles, group: 'services', roles: ['student'], mobile: true, center: true },
  { href: '/tickets', label: 'Escalations', shortLabel: 'Tickets', icon: FileText, group: 'services', roles: ['student'], mobile: true },
  { href: '/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings, group: 'system', roles: ['student'] },

  // --- Faculty ---
  { href: '/faculty', label: 'My Classes', shortLabel: 'Classes', icon: LayoutDashboard, group: 'main', roles: ['faculty'], mobile: true },
  { href: '/faculty/grades', label: 'Grade Entry', shortLabel: 'Grades', icon: GraduationCap, group: 'academic', roles: ['faculty'], mobile: true },
  { href: '/tickets', label: 'Escalations', shortLabel: 'Tickets', icon: Sparkles, group: 'operations', roles: ['faculty'], mobile: true, center: true },
  { href: '/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings, group: 'system', roles: ['faculty'], mobile: true },

  // --- Dean ---
  { href: '/admin/dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard, group: 'main', roles: ['dean'], mobile: true },
  { href: '/dean/advisees', label: 'Advisees', shortLabel: 'Advisees', icon: Users, group: 'academic', roles: ['dean'], mobile: true },
  { href: '/dean/grades', label: 'Grade Approvals', shortLabel: 'Approvals', icon: GraduationCap, group: 'academic', roles: ['dean'], mobile: true },
  { href: '/admin/admission', label: 'Admission Review', shortLabel: 'Admissions', icon: UserCheck, group: 'operations', roles: ['dean'] },
  { href: '/tickets', label: 'Escalations', shortLabel: 'Tickets', icon: Sparkles, group: 'operations', roles: ['dean'], mobile: true, center: true },
  { href: '/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings, group: 'system', roles: ['dean'], mobile: true },

  // --- Registrar ---
  { href: '/admin/dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard, group: 'main', roles: ['registrar'], mobile: true },
  { href: '/admin/enrollments', label: 'Course Assignments', shortLabel: 'Assignments', icon: BookOpen, group: 'academic', roles: ['registrar'] },
  { href: '/admin/advisers', label: 'Adviser Assignments', shortLabel: 'Advisers', icon: UserCog, group: 'academic', roles: ['registrar'] },
  { href: '/admin/grades', label: 'Grade Review', shortLabel: 'Grades', icon: GraduationCap, group: 'academic', roles: ['registrar'], mobile: true },
  { href: '/admin/admission', label: 'Admission Review', shortLabel: 'Admissions', icon: UserCheck, group: 'operations', roles: ['registrar'], mobile: true },
  { href: '/admin/document-requests', label: 'Document Requests', shortLabel: 'Requests', icon: FileText, group: 'operations', roles: ['registrar'], mobile: true },
  { href: '/admin/documents', label: 'Document Catalog', shortLabel: 'Catalog', icon: FileCheck, group: 'operations', roles: ['registrar'] },
  { href: '/admin/identity-verifications', label: 'Identity Verifications', shortLabel: 'Verify', icon: UserCheck, group: 'operations', roles: ['registrar'] },
  { href: '/tickets', label: 'Escalations', shortLabel: 'Tickets', icon: Sparkles, group: 'operations', roles: ['registrar'], mobile: true },
  { href: '/admin/kb', label: 'Knowledge Base', shortLabel: 'Policies', icon: BookMarked, group: 'system', roles: ['registrar'] },
  { href: '/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings, group: 'system', roles: ['registrar'], mobile: true },

  // --- Treasury ---
  { href: '/admin/dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard, group: 'main', roles: ['treasury'], mobile: true },
  { href: '/admin/financials', label: 'Financial Records', shortLabel: 'Financials', icon: Wallet, group: 'operations', roles: ['treasury'], mobile: true },
  { href: '/admin/requests', label: 'Payment Approvals', shortLabel: 'Payments', icon: ClipboardList, group: 'operations', roles: ['treasury'], mobile: true },
  { href: '/tickets', label: 'Escalations', shortLabel: 'Tickets', icon: Sparkles, group: 'operations', roles: ['treasury'], mobile: true, center: true },
  { href: '/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings, group: 'system', roles: ['treasury'], mobile: true },

  // --- System Administrator ---
  { href: '/admin/dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard, group: 'main', roles: ['sys_admin'], mobile: true },
  { href: '/admin/admission', label: 'Admission Review', shortLabel: 'Admissions', icon: UserCheck, group: 'operations', roles: ['sys_admin'] },
  { href: '/admin/advisers', label: 'Adviser Assignments', shortLabel: 'Advisers', icon: UserCog, group: 'academic', roles: ['sys_admin'] },
  { href: '/admin/kb', label: 'Knowledge Base', shortLabel: 'Policies', icon: BookMarked, group: 'system', roles: ['sys_admin'] },
  { href: '/admin/users', label: 'User Management', shortLabel: 'Users', icon: Users, group: 'system', roles: ['sys_admin'], mobile: true },
  { href: '/admin/audit', label: 'System Audit Logs', shortLabel: 'Audit', icon: Shield, group: 'system', roles: ['sys_admin'], mobile: true, center: true },
  { href: '/tickets', label: 'Escalations', shortLabel: 'Tickets', icon: Sparkles, group: 'operations', roles: ['sys_admin'] },
  { href: '/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings, group: 'system', roles: ['sys_admin'], mobile: true },
];

export function navItemsForRole(role?: string | null): PortalNavItem[] {
  if (!role) return [];
  return PORTAL_NAV_ITEMS.filter((item) => item.roles.includes(role)).sort(
    (a, b) => PORTAL_GROUP_ORDER.indexOf(a.group) - PORTAL_GROUP_ORDER.indexOf(b.group),
  );
}

export function mobileNavItemsForRole(role?: string | null): PortalNavItem[] {
  const items = navItemsForRole(role).filter((item) => item.mobile);
  // Student needs the ARIA handoff and its escalation inbox side by side.
  return items.slice(0, role === 'student' ? 6 : 5);
}

export function roleHomePath(role?: string | null): string {
  switch (role) {
    case 'student':
      return '/dashboard';
    case 'faculty':
      return '/faculty';
    case 'dean':
    case 'registrar':
    case 'treasury':
    case 'sys_admin':
      return '/admin/dashboard';
    default:
      return '/login';
  }
}

export function rolePortalLabel(role?: string | null): string {
  return role && role !== 'student' ? 'ADMIN' : 'PORTAL';
}

export function isStaffRole(role?: string | null): boolean {
  return Boolean(role && role !== 'student');
}
