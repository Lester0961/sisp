'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpenCheck, Download, FileText, GraduationCap, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminStore } from '@/stores/adminStore';
import { Button } from '@/components/ui/button';
import { PageFooter } from '@/components/shared/PageFooter';
import { EnrollmentWidget } from '@/components/admin/dashboard/EnrollmentWidget';
import { ChatbotAnalyticsWidget } from '@/components/admin/dashboard/ChatbotAnalyticsWidget';
import { GpaDistributionWidget } from '@/components/admin/dashboard/GpaDistributionWidget';
import { MonthlyExecutiveReport } from '@/components/admin/dashboard/MonthlyExecutiveReport';

const dashboardCopy = {
  registrar: {
    title: 'Registrar operations',
    description: 'Review active records, assignments, and the work that keeps student services moving.',
    actionHref: '/admin/enrollments',
    actionLabel: 'Open assignments',
    actionIcon: Users,
  },
  treasury: {
    title: 'Treasury overview',
    description: 'Review financial records and payment approvals for student obligations.',
    actionHref: '/admin/requests',
    actionLabel: 'Review payments',
    actionIcon: FileText,
  },
  dean: {
    title: 'Academic review',
    description: 'Review advisees, academic progress, and program-level activity.',
    actionHref: '/dean/advisees',
    actionLabel: 'Review advisees',
    actionIcon: FileText,
  },
  faculty: {
    title: 'Teaching overview',
    description: 'Review the current academic picture and continue grade entry when you are ready.',
    actionHref: '/faculty/grades',
    actionLabel: 'Open grade entry',
    actionIcon: BookOpenCheck,
  },
  sys_admin: {
    title: 'System overview',
    description: 'Review core portal activity and keep user access and policy records current.',
    actionHref: '/admin/users',
    actionLabel: 'Manage users',
    actionIcon: Users,
  },
};

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const {
    dashboardStats,
    enrollmentStats,
    chatbotAnalytics,
    publishedGradeCount,
    fetchDashboardStats,
    fetchEnrollmentStats,
    fetchChatbotAnalytics,
    fetchPublishedGradeCount,
    downloadEnrollmentReport,
  } = useAdminStore();

  const role = user?.role ?? 'registrar';
  const copy = dashboardCopy[role as keyof typeof dashboardCopy] ?? dashboardCopy.registrar;
  const ActionIcon = copy.actionIcon;
  const canViewProgramData = role === 'registrar' || role === 'dean' || role === 'sys_admin';

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setDashboardLoading(true);
    setDashboardError(null);
    const requests = [fetchDashboardStats(), fetchPublishedGradeCount()];
    if (canViewProgramData) requests.push(fetchEnrollmentStats(), fetchChatbotAnalytics());
    await Promise.all(requests);
    const error = useAdminStore.getState().error;
    setDashboardError(error);
    setDashboardLoading(false);
  }, [user, canViewProgramData, fetchDashboardStats, fetchEnrollmentStats, fetchChatbotAnalytics, fetchPublishedGradeCount]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const metrics = [
    { label: 'Active students', compactLabel: 'Students', value: dashboardStats?.totalStudents ?? (dashboardLoading ? '…' : '—'), icon: GraduationCap },
    { label: 'Faculty records', compactLabel: 'Faculty', value: dashboardStats?.totalFaculty ?? (dashboardLoading ? '…' : '—'), icon: Users },
    { label: 'Document requests', compactLabel: 'Requests', value: dashboardStats?.totalRequests ?? (dashboardLoading ? '…' : '—'), icon: FileText },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <main className="portal-main flex-1">
        <div className="portal-page-header">
          <div>
            <h1 className="portal-title">{copy.title}</h1>
            <p className="portal-description mt-2">{copy.description}</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <Link href={copy.actionHref}><ActionIcon className="size-4" strokeWidth={1.8} />{copy.actionLabel}</Link>
            </Button>
            {role === 'registrar' && (
              <Button variant="outline" className="w-full sm:w-auto" onClick={downloadEnrollmentReport}>
                <Download className="size-4" strokeWidth={1.8} />Export report
              </Button>
            )}
          </div>
        </div>

        {dashboardLoading && (
          <p className="mb-4 text-sm text-[#587387]" role="status" aria-live="polite">Loading dashboard reports…</p>
        )}
        {dashboardError && !dashboardLoading && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            <span>Dashboard data could not be loaded. {dashboardError}</span>
            <Button variant="outline" size="sm" onClick={() => void loadDashboard()}>Try again</Button>
          </div>
        )}

        <section className="mb-5 grid grid-cols-3 divide-x divide-[#dce7ef] overflow-hidden rounded-2xl border border-[#dce7ef] bg-white shadow-[0_10px_28px_rgb(15_45_74_/_0.055)]">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="min-w-0 p-3 sm:p-4">
                <Icon className="mb-3 size-4 text-[#0a439b]" strokeWidth={1.8} />
                <p className="text-[11px] text-[#587387] sm:hidden">{metric.compactLabel}</p>
                <p className="hidden truncate text-xs text-[#587387] sm:block">{metric.label}</p>
                <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#102f49]">{metric.value}</p>
              </div>
            );
          })}
        </section>

        {!dashboardLoading && !dashboardError && <div className="space-y-5">
          {canViewProgramData && (
            <>
              <MonthlyExecutiveReport />
              <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                <EnrollmentWidget data={enrollmentStats?.data ?? []} />
                <ChatbotAnalyticsWidget intentDistribution={chatbotAnalytics?.intentDistribution ?? []} />
              </section>
            </>
          )}
          <GpaDistributionWidget publishedGradeCount={publishedGradeCount?.publishedGradeCount ?? 0} />
        </div>}
      </main>
      <PageFooter type="advising" />
    </div>
  );
}
