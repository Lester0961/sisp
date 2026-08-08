'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BookOpen, FileText, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStudentStore } from '@/stores/studentStore';
import { Navbar } from '@/components/shared/Navbar';
import { Button } from '@/components/ui/button';
import { notificationsApi } from '@/lib/api/notifications';
import { Notification } from '@/types';
import { toast } from 'sonner';

function formatPeso(balance?: string) {
  const amount = Number.parseFloat(balance ?? '0');
  return `₱${Number.isFinite(amount) ? amount.toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '0.00'}`;
}

function formatNotificationMessage(message: string) {
  if (message.toLowerCase().includes('glassmorphic')) {
    return 'Your student information and services portal is ready to use.';
  }
  return message;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { profile, enrollments, isLoadingProfile, fetchProfile, fetchEnrollments } = useStudentStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(true);

  useEffect(() => {
    if (user && user.role !== 'student') {
      const landingPages: Record<string, string> = {
        faculty: '/faculty/grades',
        dean: '/dean/grades',
        live_agent: '/live-agent',
      };
      router.replace(landingPages[user.role] ?? '/admin/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    if (user?.role !== 'student') return;
    if (!profile) void fetchProfile();
    if (!enrollments.length) void fetchEnrollments();
  }, [profile, enrollments.length, fetchProfile, fetchEnrollments, user?.role]);

  useEffect(() => {
    if (user?.role !== 'student') {
      setIsLoadingNotifs(false);
      return;
    }
    const loadNotifications = async () => {
      try {
        const data = await notificationsApi.getMyNotifications();
        setNotifications(data.data ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      } finally {
        setIsLoadingNotifs(false);
      }
    };
    void loadNotifications();
  }, [user?.role]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((previous) => previous.map((notification) => ({ ...notification, isRead: true })));
      setUnreadCount(0);
      toast.success('Notifications marked as read.');
    } catch {
      toast.error('Unable to update notifications.');
    }
  };

  const activeEnrollments = enrollments.filter((enrollment) => enrollment.status === 'enrolled');
  const totalUnits = activeEnrollments.reduce((total, enrollment) => total + (enrollment.course?.units ?? 0), 0);
  const isLoading = isLoadingProfile || isLoadingNotifs;
  const firstName = profile?.user?.firstName || user?.email.split('@')[0] || 'Student';

  if (!user || user.role !== 'student') {
    return <div className="portal-page"><div className="portal-skeleton mx-auto mt-24 h-48 max-w-3xl" /></div>;
  }

  return (
    <div className="portal-page">
      <Navbar />
      <main className="portal-main">
        <div className="portal-page-header">
          <div>
            <h1 className="portal-title">Welcome back, {firstName}</h1>
            <p className="portal-description mt-2">Here is what needs your attention in SISP.</p>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto"><Link href="/chat"><Sparkles className="size-4" strokeWidth={1.8} />Ask ARIA</Link></Button>
        </div>

        {isLoading ? (
          <div className="space-y-5">
            <div className="portal-skeleton h-44 w-full" />
            <div className="grid gap-5 lg:grid-cols-[1.35fr_0.85fr]"><div className="portal-skeleton h-64" /><div className="portal-skeleton h-64" /></div>
          </div>
        ) : (
          <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl bg-[#102f49] p-5 text-white shadow-[0_14px_32px_rgb(15_45_74_/_0.16)] sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm text-blue-100">{profile?.program?.code || 'Academic program'} · Year {profile?.yearLevel || 'not assigned'}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{profile?.studentNumber || 'Student record loading'}</p>
                  <p className="mt-2 text-sm text-blue-100">{activeEnrollments.length} enrolled courses · {totalUnits} units this term</p>
                </div>
                <div className="border-t border-white/15 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                  <p className="text-xs font-medium text-blue-100">Outstanding balance</p>
                  <p className="mt-1 text-2xl font-semibold">{formatPeso(profile?.accountBalance?.balance)}</p>
                  <p className="mt-1 text-xs text-blue-100">Contact Accounting for official payment instructions.</p>
                </div>
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-[1.35fr_0.85fr]">
              <section className="portal-surface overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#dce7ef] px-5 py-4">
                  <div><h2 className="font-semibold text-[#102f49]">Current courses</h2><p className="mt-1 text-sm text-[#587387]">Your active enrollment for this term.</p></div>
                  <BookOpen className="size-5 text-[#0a439b]" strokeWidth={1.8} />
                </div>
                {activeEnrollments.length ? (
                  <div className="divide-y divide-[#e7eef3]">
                    {activeEnrollments.map((enrollment) => (
                      <article key={enrollment.id} className="flex items-start gap-3 px-5 py-4">
                        <span className="mt-0.5 min-w-14 rounded-lg bg-[#eaf3fa] px-2 py-1 text-center text-xs font-semibold text-[#0a439b]">{enrollment.course?.code}</span>
                        <div className="min-w-0 flex-1"><h3 className="font-medium text-[#102f49]">{enrollment.course?.title}</h3><p className="mt-1 text-sm text-[#587387]">{enrollment.course?.units ?? 0} units{enrollment.section ? ` · Section ${enrollment.section}` : ''}</p></div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="portal-empty min-h-[14rem]"><BookOpen className="size-8 text-[#0a439b]" strokeWidth={1.7} /><div><h3 className="font-semibold text-[#102f49]">No enrolled courses yet</h3><p className="mt-1 text-sm text-[#587387]">Your confirmed courses will appear here.</p></div></div>
                )}
              </section>

              <section className="portal-surface overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#dce7ef] px-5 py-4">
                  <div><h2 className="font-semibold text-[#102f49]">Notifications</h2><p className="mt-1 text-sm text-[#587387]">Important updates from the school.</p></div>
                  {unreadCount > 0 && <Button variant="ghost" size="sm" onClick={() => void handleMarkAllRead()}>Mark read</Button>}
                </div>
                {notifications.length ? (
                  <div className="divide-y divide-[#e7eef3]">
                    {notifications.slice(0, 4).map((notification) => (
                      <article key={notification.id} className={`px-5 py-4 ${notification.isRead ? '' : 'bg-[#f7fbfe]'}`}>
                        <div className="flex gap-3"><Bell className="mt-0.5 size-4 shrink-0 text-[#0a439b]" strokeWidth={1.8} /><div><h3 className="text-sm font-semibold text-[#102f49]">{notification.title}</h3><p className="mt-1 text-sm leading-relaxed text-[#587387]">{formatNotificationMessage(notification.message)}</p><p className="mt-2 text-xs text-[#6c879a]">{new Date(notification.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</p></div></div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="portal-empty min-h-[14rem]"><Bell className="size-8 text-[#0a439b]" strokeWidth={1.7} /><div><h3 className="font-semibold text-[#102f49]">You are up to date</h3><p className="mt-1 text-sm text-[#587387]">New school updates will appear here.</p></div></div>
                )}
              </section>
            </div>

            <section className="grid gap-3 sm:grid-cols-3">
              <Button asChild variant="outline" className="justify-start"><Link href="/grades"><BookOpen className="size-4 text-[#0a439b]" strokeWidth={1.8} />View grades</Link></Button>
              <Button asChild variant="outline" className="justify-start"><Link href="/requests"><FileText className="size-4 text-[#0a439b]" strokeWidth={1.8} />Request document</Link></Button>
              <Button asChild variant="outline" className="justify-start"><Link href="/settings">Review account settings</Link></Button>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
