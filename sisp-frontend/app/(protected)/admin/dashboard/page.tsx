'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { BookOpenCheck, Download, FileText, GraduationCap, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminStore } from '@/stores/adminStore';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/shared/Navbar';
import { PageFooter } from '@/components/shared/PageFooter';
import { EnrollmentWidget } from '@/components/admin/dashboard/EnrollmentWidget';
import { ChatbotAnalyticsWidget } from '@/components/admin/dashboard/ChatbotAnalyticsWidget';
import { GpaDistributionWidget } from '@/components/admin/dashboard/GpaDistributionWidget';

const dashboardCopy = {
  admin_staff: {
    title: 'Operations overview',
    description: 'Review active records and resolve the work that keeps student services moving.',
    actionHref: '/admin/users',
    actionLabel: 'Manage users',
    actionIcon: Users,
  },
  dean: {
    title: 'Academic review',
    description: 'Review academic exceptions, approved grades, and program-level activity.',
    actionHref: '/dean/exceptions',
    actionLabel: 'Review exceptions',
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
  const {
    dashboardStats,
    enrollmentStats,
    chatbotAnalytics,
    gpaDistribution,
    fetchDashboardStats,
    fetchEnrollmentStats,
    fetchChatbotAnalytics,
    fetchGpaDistribution,
    downloadEnrollmentReport,
  } = useAdminStore();

  const role = user?.role ?? 'admin_staff';
  const copy = dashboardCopy[role as keyof typeof dashboardCopy] ?? dashboardCopy.admin_staff;
  const ActionIcon = copy.actionIcon;
  const canViewProgramData = role === 'admin_staff' || role === 'dean' || role === 'sys_admin';

  useEffect(() => {
    if (!user) return;
    void fetchDashboardStats();
    void fetchGpaDistribution();
    if (canViewProgramData) {
      void fetchEnrollmentStats();
      void fetchChatbotAnalytics();
    }
  }, [user, canViewProgramData, fetchDashboardStats, fetchEnrollmentStats, fetchChatbotAnalytics, fetchGpaDistribution]);

  const gpaChartData = gpaDistribution?.distribution
    ? Object.entries(gpaDistribution.distribution).map(([bracket, count]) => ({ bracket, count }))
    : [];
  const passFailData = gpaDistribution?.passFailRates ?? [];
  const metrics = [
    { label: 'Active students', compactLabel: 'Students', value: dashboardStats?.totalStudents ?? '…', icon: GraduationCap },
    { label: 'Faculty records', compactLabel: 'Faculty', value: dashboardStats?.totalFaculty ?? '…', icon: Users },
    { label: 'Document requests', compactLabel: 'Requests', value: dashboardStats?.totalRequests ?? '…', icon: FileText },
  ];

  return (
    <div className="portal-page flex min-h-[100dvh] flex-col">
      <Navbar />
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
            {role === 'admin_staff' && (
              <Button variant="outline" className="w-full sm:w-auto" onClick={downloadEnrollmentReport}>
                <Download className="size-4" strokeWidth={1.8} />Export report
              </Button>
            )}
          </div>
        </div>

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

        <div className="space-y-5">
          {canViewProgramData && (
            <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <EnrollmentWidget data={enrollmentStats?.data ?? []} />
              <ChatbotAnalyticsWidget intentDistribution={chatbotAnalytics?.intentDistribution ?? []} />
            </section>
          )}
          <GpaDistributionWidget gpaChartData={gpaChartData} passFailData={passFailData} />
        </div>
      </main>
      <PageFooter type="advising" />
    </div>
  );
}
