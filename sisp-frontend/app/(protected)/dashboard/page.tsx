'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStudentStore } from '@/stores/studentStore';
import { Navbar } from '@/components/shared/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, BookOpen, CreditCard, Bell } from 'lucide-react';
import { notificationsApi } from '@/lib/api/notifications';
import { Notification } from '@/types';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { user } = useAuth();
  const {
    profile,
    enrollments,
    isLoadingProfile,
    fetchProfile,
    fetchEnrollments,
  } = useStudentStore();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(true);

  useEffect(() => {
    if (!profile) void fetchProfile();
    if (enrollments.length === 0) void fetchEnrollments();
  }, [profile, enrollments.length, fetchProfile, fetchEnrollments]);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const data = await notificationsApi.getMyNotifications();
        setNotifications(data.data ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      } catch {
        // notifications are non-critical
      } finally {
        setIsLoadingNotifs(false);
      }
    };
    void fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark notifications as read');
    }
  };

  const activeEnrollments = enrollments.filter(
    (e) => e.status === 'enrolled',
  );

  const totalUnits = activeEnrollments.reduce(
    (sum, e) => sum + (e.course?.units ?? 0),
    0,
  );

  const isLoading = isLoadingProfile || isLoadingNotifs;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.email}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {/* Profile & Balance combined card */}
              <Card className="overflow-hidden border-slate-100 shadow-sm">
                <div className="bg-gradient-to-r from-[#1e3a8a] to-blue-600 p-6 text-white flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold">{profile?.user?.firstName} {profile?.user?.lastName || profile?.user?.email.split('@')[0]}</h2>
                    <p className="text-blue-100 text-sm font-medium">{profile?.program?.code} • Year {profile?.yearLevel}</p>
                    <p className="text-blue-200 text-xs mt-1 font-mono">{profile?.studentNumber}</p>
                  </div>
                  {profile?.accountBalance && (
                    <div className="bg-white/10 p-3 rounded-xl border border-white/20 backdrop-blur-sm">
                      <p className="text-blue-100 text-xs uppercase tracking-wider font-semibold mb-1">Outstanding Balance</p>
                      <p className="text-2xl font-bold">
                        ₱{parseFloat(profile.accountBalance.balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="border-slate-100 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-50 mb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BookOpen className="h-4 w-4 text-[#1e3a8a]" />
                      Current Enrollments
                    </CardTitle>
                    <Badge variant="outline" className="text-xs bg-slate-50">
                      {activeEnrollments.length} courses ({totalUnits} units)
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {activeEnrollments.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No active enrollments.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {activeEnrollments.map((enrollment) => (
                        <div
                          key={enrollment.id}
                          className="flex items-center justify-between rounded-xl bg-slate-50/50 hover:bg-slate-50 px-4 py-3 transition-colors border border-slate-100"
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 shrink-0 rounded-lg bg-blue-50 text-[#1e3a8a] flex flex-col items-center justify-center">
                              <span className="text-[10px] font-bold uppercase tracking-wider">{enrollment.course.code.split(' ')[0]}</span>
                              <span className="text-xs font-black">{enrollment.course.code.split(' ')[1] || ''}</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 leading-tight">
                                {enrollment.course.title}
                              </p>
                              <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                                <span>{enrollment.course.units} Units</span>
                                {enrollment.section && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                    <span>Sec {enrollment.section}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>


            </div>

            {/* Notifications panel */}
            <div className="space-y-4">
              <Card className="border-slate-100 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-50 mb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Bell className="h-4 w-4 text-[#1e3a8a]" />
                      Notifications
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-1">
                          {unreadCount}
                        </Badge>
                      )}
                    </CardTitle>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => void handleMarkAllRead()}
                        className="text-xs text-primary hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {notifications.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No notifications yet.
                    </p>
                  ) : (
                    <div className="max-h-96 space-y-3 overflow-y-auto">
                      {notifications.slice(0, 5).map((notif) => (
                        <div
                          key={notif.id}
                          className={`rounded-xl border p-3.5 transition-colors ${
                            !notif.isRead
                              ? 'border-blue-100 bg-blue-50/50'
                              : 'border-slate-100 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm ${!notif.isRead ? 'font-bold text-[#1e3a8a]' : 'font-semibold text-slate-800'}`}>
                              {notif.title}
                            </p>
                            {!notif.isRead && (
                              <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                            {notif.message}
                          </p>
                          <p className="mt-2 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                            {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}