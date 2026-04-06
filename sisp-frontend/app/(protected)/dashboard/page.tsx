'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStudentStore } from '@/stores/studentStore';
import { Navbar } from '@/components/shared/Navbar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
            <div className="space-y-6 lg:col-span-2">
              {profile ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Student Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border px-4 py-3">
                      <p className="text-xs text-muted-foreground">
                        Student Number
                      </p>
                      <p className="font-mono font-medium">
                        {profile.studentNumber}
                      </p>
                    </div>
                    <div className="rounded-lg border px-4 py-3">
                      <p className="text-xs text-muted-foreground">Program</p>
                      <p className="font-medium">{profile.program.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {profile.program.name}
                      </p>
                    </div>
                    <div className="rounded-lg border px-4 py-3">
                      <p className="text-xs text-muted-foreground">
                        Year Level
                      </p>
                      <p className="font-medium">Year {profile.yearLevel}</p>
                    </div>
                    <div className="rounded-lg border px-4 py-3">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">
                        {profile.user.email}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <User className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    <p>No student profile found.</p>
                    <p className="text-xs">
                      Please contact admin to set up your profile.
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Current Enrollments
                  </CardTitle>
                  <CardDescription>
                    {activeEnrollments.length} course(s) — {totalUnits} units
                  </CardDescription>
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
                          className="flex items-center justify-between rounded-lg border px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {enrollment.course.code}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {enrollment.course.title}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary">
                              {enrollment.course.units} units
                            </Badge>
                            {enrollment.section && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Section {enrollment.section}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Account Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profile?.accountBalance ? (
                    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        Outstanding Balance
                      </span>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          ₱
                          {parseFloat(
                            profile.accountBalance.balance,
                          ).toLocaleString('en-PH', {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        <Badge
                          variant={
                            profile.accountBalance.status === 'active'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {profile.accountBalance.status}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No balance records found.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Notifications panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
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
                      {notifications.slice(0, 10).map((notif) => (
                        <div
                          key={notif.id}
                          className={`rounded-lg border p-3 transition-colors ${
                            !notif.isRead
                              ? 'border-primary/30 bg-primary/5'
                              : 'bg-muted/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium">
                              {notif.title}
                            </p>
                            {!notif.isRead && (
                              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {notif.message}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(notif.createdAt).toLocaleDateString()}
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