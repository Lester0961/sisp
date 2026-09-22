'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  BookOpenCheck,
  Download,
  FileText,
  GraduationCap,
  ShieldAlert,
  Users,
  Wallet,
} from 'lucide-react';
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
    description: 'Review records, assignments, requests, and the work that keeps student services moving.',
    actionHref: '/admin/admission',
    actionLabel: 'Review admissions',
    actionIcon: Users,
  },
  treasury: {
    title: 'Treasury overview',
    description: 'Review tuition totals, collections, and payment approvals for student obligations.',
    actionHref: '/admin/requests',
    actionLabel: 'Review payments',
    actionIcon: Wallet,
  },
  dean: {
    title: 'Academic review',
    description: 'Review advisees, academic performance, ARIA trends, and escalation tickets.',
    actionHref: '/tickets',
    actionLabel: 'Open escalation queue',
    actionIcon: ShieldAlert,
  },
  sys_admin: {
    title: 'Admin Dashboard',
    description: 'Review portal activity, accounts, sessions, and system records.',
    actionHref: '/admin/users',
    actionLabel: 'Manage users',
    actionIcon: Users,
  },
} as const;

interface MetricCard {
  label: string;
  value: number | string;
  icon: typeof Users;
  tone?: 'default' | 'warning' | 'success';
}

export default function AdminDashboardPage() {
  const { user, hasPermission } = useAuth();
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const {
    dashboardStats,
    enrollmentStats,
    chatbotAnalytics,
    publishedGradeCount,
    financeSummary,
    fetchDashboardStats,
    fetchEnrollmentStats,
    fetchChatbotAnalytics,
    fetchPublishedGradeCount,
    fetchRequestVolume,
    fetchFinanceSummary,
    downloadEnrollmentReport,
  } = useAdminStore();

  const role = (user?.role ?? 'registrar') as keyof typeof dashboardCopy;
  const copy = dashboardCopy[role] ?? dashboardCopy.registrar;
  const ActionIcon = copy.actionIcon;
  const canReadReports = hasPermission('report.read');
  const canReadTrends = hasPermission('aria_trends.read');

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setDashboardLoading(true);
    setDashboardError(null);

    const requests: Promise<unknown>[] = [fetchDashboardStats()];
    if (canReadReports) {
      requests.push(fetchPublishedGradeCount(), fetchEnrollmentStats(), fetchRequestVolume(), fetchFinanceSummary());
    }
    if (canReadTrends) {
      requests.push(fetchChatbotAnalytics());
    }
    if (role === 'registrar') {
      requests.push(useAdminStore.getState().fetchRequestVolume());
    }

    await Promise.allSettled(requests);
    setDashboardError(useAdminStore.getState().error);
    setDashboardLoading(false);
  }, [
    user,
    role,
    canReadReports,
    canReadTrends,
    fetchDashboardStats,
    fetchEnrollmentStats,
    fetchChatbotAnalytics,
    fetchPublishedGradeCount,
    fetchRequestVolume,
    fetchFinanceSummary,
  ]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const value = (input?: number) => (input === undefined ? (dashboardLoading ? '…' : '—') : input);

  const metricGroups = useMemo(() => {
    const people: MetricCard[] = [
      { label: 'User accounts', value: value(dashboardStats?.totalUsers), icon: Users },
      { label: 'Active students', value: value(dashboardStats?.totalStudents), icon: GraduationCap },
      { label: 'Faculty records', value: value(dashboardStats?.totalFaculty), icon: BookOpenCheck },
    ];
    const operations: MetricCard[] = [
      { label: 'Document requests', value: value(dashboardStats?.totalRequests), icon: FileText },
      { label: 'Open requests', value: value(dashboardStats?.openDocumentRequests), icon: FileText },
      { label: 'Awaiting payment', value: value(dashboardStats?.awaitingPaymentRequests), icon: Wallet, tone: 'warning' },
    ];
    const aria: MetricCard[] = [
      { label: 'Pending escalations', value: value(dashboardStats?.pendingEscalations), icon: ShieldAlert, tone: 'warning' },
      { label: 'Resolved escalations', value: value(dashboardStats?.resolvedEscalations), icon: ShieldAlert, tone: 'success' },
      { label: 'Active sessions', value: value(dashboardStats?.activeSessions), icon: Activity },
    ];
    return { people, operations, aria };
  }, [dashboardStats, dashboardLoading]);

  const financeCards = financeSummary
    ? [
        { label: 'Tuition assessed', value: `₱${financeSummary.totalAssessed.toLocaleString()}` },
        { label: 'Collected (verified)', value: `₱${financeSummary.totalCollected.toLocaleString()}` },
        { label: 'Outstanding balance', value: `₱${financeSummary.outstandingBalance.toLocaleString()}` },
        { label: 'Payments awaiting verification', value: String(financeSummary.paymentsAwaitingVerification) },
        { label: 'Document fees collected', value: `₱${financeSummary.documentFeesCollected.toLocaleString()}` },
      ]
    : [];

  const renderGroup = (title: string, metrics: MetricCard[]) => (
    <section className="space-y-2">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6c879a]">{title}</h2>
      <div className="grid grid-cols-2 divide-x divide-y divide-[#dce7ef] overflow-hidden rounded-2xl border border-[#dce7ef] bg-white shadow-[0_10px_28px_rgb(15_45_74_/_0.055)] sm:grid-cols-3 sm:divide-y-0">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const toneClass =
            metric.tone === 'warning'
              ? 'text-amber-700'
              : metric.tone === 'success'
                ? 'text-emerald-700'
                : 'text-[#0a439b]';
          return (
            <div key={metric.label} className="min-w-0 p-3 sm:p-4">
              <Icon className={`mb-3 size-4 ${toneClass}`} strokeWidth={1.8} />
              <p className="truncate text-[11px] text-[#587387]">{metric.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#102f49]">{metric.value}</p>
            </div>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="flex min-h-full flex-col">
      <main className="portal-main flex-1 space-y-5">
        <div className="portal-page-header">
          <div>
            <h1 className="portal-title">{copy.title}</h1>
            <p className="portal-description mt-2">{copy.description}</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <Link href={copy.actionHref}>
                <ActionIcon className="size-4" strokeWidth={1.8} />
                {copy.actionLabel}
              </Link>
            </Button>
            {role === 'registrar' && canReadReports && (
              <Button variant="outline" className="w-full sm:w-auto" onClick={downloadEnrollmentReport}>
                <Download className="size-4" strokeWidth={1.8} />
                Export enrollment report
              </Button>
            )}
          </div>
        </div>

        {dashboardLoading && (
          <p className="text-sm text-[#587387]" role="status" aria-live="polite">
            Loading dashboard reports…
          </p>
        )}
        {dashboardError && !dashboardLoading && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            <span>Some dashboard data could not be loaded. {dashboardError}</span>
            <Button variant="outline" size="sm" onClick={() => void loadDashboard()}>
              Try again
            </Button>
          </div>
        )}

        {renderGroup('People', metricGroups.people)}
        {renderGroup('Records & requests', metricGroups.operations)}
        {renderGroup('ARIA & security', metricGroups.aria)}

        {financeSummary && (
          <section className="space-y-2">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6c879a]">
              Tuition & finance
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {financeCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-[#dce7ef] bg-white p-3 shadow-[0_10px_28px_rgb(15_45_74_/_0.055)]"
                >
                  <p className="text-[11px] text-[#587387]">{card.label}</p>
                  <p className="mt-1 text-lg font-semibold text-[#102f49]">{card.value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {!dashboardLoading && (
          <div className="space-y-5">
            {canReadReports && <MonthlyExecutiveReport />}
            {canReadReports && (
              <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                <EnrollmentWidget data={enrollmentStats?.data ?? []} />
                {canReadTrends ? (
                  <ChatbotAnalyticsWidget
                    intentDistribution={chatbotAnalytics?.intentDistribution ?? []}
                    escalatedCount={chatbotAnalytics?.escalatedCount}
                    resolvedCount={chatbotAnalytics?.escalationsResolved}
                  />
                ) : (
                  <GpaDistributionWidget
                    publishedGradeCount={publishedGradeCount?.publishedGradeCount ?? 0}
                  />
                )}
              </section>
            )}
            {!canReadReports && canReadTrends && (
              <ChatbotAnalyticsWidget
                intentDistribution={chatbotAnalytics?.intentDistribution ?? []}
                escalatedCount={chatbotAnalytics?.escalatedCount}
                resolvedCount={chatbotAnalytics?.escalationsResolved}
              />
            )}
          </div>
        )}
      </main>
      <PageFooter type="advising" />
    </div>
  );
}
