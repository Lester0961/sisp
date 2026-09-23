'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Loader2,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { enrollmentsApi } from '@/lib/api/enrollments';
import { useStudentStore } from '@/stores/studentStore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AvailableCourse {
  id: string;
  code: string;
  isCodeSynthesized?: boolean;
  title: string;
  units: number;
  lecUnits?: number;
  labUnits?: number | null;
  prerequisites?: { requiresCode: string }[];
}

interface MyEnrollment {
  id: string;
  courseId: string;
  section?: string;
  status: string;
  course?: { code: string; title: string; units: number };
  term?: { label: string; academicYear: string } | null;
  createdAt: string;
}

interface EnrollmentHistoryEntry {
  id: string;
  status: string;
  previousStatus?: string | null;
  term?: string | null;
  academicYear?: string | null;
  createdAt: string;
  course?: { code: string; title: string } | null;
  academicTerm?: { code: string; label: string } | null;
  changedBy?: { firstName?: string; lastName?: string } | null;
}

export default function EnrollmentPage() {
  const { profile, fetchProfile } = useStudentStore();

  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<MyEnrollment[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [history, setHistory] = useState<EnrollmentHistoryEntry[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [termInfo, setTermInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [droppingId, setDroppingId] = useState<string | null>(null);
  const [pendingDrop, setPendingDrop] = useState<{ enrollmentId: string; courseCode: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Late enrollment waiver state
  const [pendingCourse, setPendingCourse] = useState<AvailableCourse | null>(null);
  const [showWaiver, setShowWaiver] = useState(false);

  const balance = Number.parseFloat(profile?.accountBalance?.balance ?? '0');
  const hasOutstandingBalance = balance > 0;

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [coursesRes, enrollmentsRes, completedRes, historyRes] = await Promise.all([
        enrollmentsApi.getAvailableCourses(),
        enrollmentsApi.getMyEnrollments(),
        enrollmentsApi.getCompletedCourseIds(),
        enrollmentsApi.getMyHistory(),
      ]);

      setAvailableCourses(coursesRes.data ?? []);
      setTermInfo(coursesRes.term ?? null);

      const enrollments: MyEnrollment[] = enrollmentsRes.data ?? [];
      setMyEnrollments(enrollments);
      setEnrolledIds(
        new Set(enrollments.filter((e) => e.status === 'enrolled').map((e) => e.courseId)),
      );
      setCompletedIds(completedRes ?? []);
      setHistory(Array.isArray(historyRes?.data) ? historyRes.data : []);
    } catch {
      setError('Unable to load enrollment data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profile) void fetchProfile();
    void loadAll();
  }, [loadAll, profile, fetchProfile]);

  const handleEnroll = async (course: AvailableCourse, riskAcknowledged = false) => {
    if (hasOutstandingBalance) {
      toast.error('Please clear your outstanding balance before enrolling.');
      return;
    }

    setEnrollingId(course.id);
    try {
      const result = await enrollmentsApi.enroll({
        courseId: course.id,
        riskAcknowledged,
      });
      toast.success(result.message || `Enrolled in ${course.code}`);
      setShowWaiver(false);
      setPendingCourse(null);
      await loadAll();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Enrollment failed.';
      // If the error is about late enrollment risk, show the waiver modal
      if (msg.includes('risk waiver') || msg.includes('late enroll')) {
        setPendingCourse(course);
        setShowWaiver(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setEnrollingId(null);
    }
  };

  const handleDrop = async () => {
    if (!pendingDrop) return;
    const { enrollmentId, courseCode } = pendingDrop;
    setDroppingId(enrollmentId);
    try {
      const result = await enrollmentsApi.dropCourse(enrollmentId);
      toast.success(result.message || `Dropped ${courseCode}`);
      setPendingDrop(null);
      await loadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Unable to drop course.');
    } finally {
      setDroppingId(null);
    }
  };

  const activeEnrollments = myEnrollments.filter((e) => e.status === 'enrolled');
  const totalUnits = activeEnrollments.reduce((sum, e) => sum + (e.course?.units ?? 0), 0);

  return (
    <div className="portal-page">
      <main className="portal-main pb-8">
        <div className="portal-page-header">
          <div>
            <h1 className="portal-title">Enrollment</h1>
            <p className="portal-description mt-2">
              Select courses for the current term and manage your enrollments.
            </p>
            {termInfo && (
              <p className="mt-1 text-xs font-medium text-[#0a439b]">
                Current term: {termInfo}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/curriculum">
                <BookOpen className="size-4" strokeWidth={1.8} />
                Curriculum
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void loadAll()} disabled={loading}>
              <RefreshCw className={loading ? 'animate-spin' : ''} strokeWidth={1.8} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Treasury Clearance Warning */}
        {hasOutstandingBalance && (
          <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-800" />
              <div>
                <h2 className="text-sm font-semibold text-amber-900">
                  Treasury Clearance Required
                </h2>
                <p className="mt-1 text-sm text-amber-800">
                  You have an outstanding balance of{' '}
                  <strong>
                    ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </strong>
                  . Per Regis Marie College policy, you must clear your balance before enrolling in new courses.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-3 border-amber-300 bg-white hover:bg-amber-100 text-amber-900">
                  <Link href="/support">Contact Treasury</Link>
                </Button>
              </div>
            </div>
          </section>
        )}

        {loading ? (
          <div className="portal-surface space-y-4 p-5">
            <div className="portal-skeleton h-6 w-52" />
            <div className="portal-skeleton h-20 w-full" />
            <div className="portal-skeleton h-20 w-full" />
            <div className="portal-skeleton h-20 w-full" />
          </div>
        ) : error ? (
          <section className="portal-surface portal-empty">
            <AlertCircle className="size-8 text-[#b42318]" strokeWidth={1.8} />
            <div>
              <h2 className="font-semibold text-[#102f49]">Unable to load enrollment</h2>
              <p className="mt-1 max-w-md text-sm text-[#587387]">{error}</p>
            </div>
            <Button size="sm" onClick={() => void loadAll()}>Try again</Button>
          </section>
        ) : (
          <div className="space-y-5">
            {/* Current Enrollments Summary */}
            <section className="grid grid-cols-2 divide-x divide-[#dce7ef] overflow-hidden rounded-2xl border border-[#dce7ef] bg-white shadow-[0_10px_28px_rgb(15_45_74_/_0.055)] sm:grid-cols-3">
              <div className="p-4">
                <p className="text-xs text-[#587387]">Enrolled courses</p>
                <p className="mt-1 text-2xl font-semibold text-[#102f49]">{activeEnrollments.length}</p>
              </div>
              <div className="p-4">
                <p className="text-xs text-[#587387]">Total units</p>
                <p className="mt-1 text-2xl font-semibold text-[#0a439b]">{totalUnits}</p>
              </div>
              <div className="col-span-2 border-t border-[#dce7ef] p-4 sm:col-span-1 sm:border-t-0">
                <p className="text-xs text-[#587387]">Completed</p>
                <p className="mt-1 text-2xl font-semibold text-[#16794c]">{completedIds.length}</p>
              </div>
            </section>

            {/* My Enrollments */}
            {activeEnrollments.length > 0 && (
              <section className="portal-surface overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#e8f0f5] px-4 py-4 sm:px-5">
                  <div>
                    <h2 className="font-semibold text-[#102f49]">My enrollments</h2>
                    <p className="mt-1 text-xs text-[#587387]">
                      Courses you are currently enrolled in this term.
                    </p>
                  </div>
                  <CheckCircle2 className="size-5 text-[#16794c]" strokeWidth={1.8} />
                </div>
                <div className="divide-y divide-[#e8f0f5]">
                  {activeEnrollments.map((enrollment) => (
                    <article
                      key={enrollment.id}
                      className="flex items-center gap-3 px-4 py-4 sm:px-5"
                    >
                      <span className="min-w-16 rounded-lg bg-[#eaf3fa] px-2 py-1 text-center text-xs font-semibold text-[#0a439b]">
                        {enrollment.course?.code}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium text-[#102f49]">
                          {enrollment.course?.title}
                        </h3>
                        <p className="mt-0.5 text-xs text-[#587387]">
                          {enrollment.course?.units ?? 0} units
                          {enrollment.section ? ` · Section ${enrollment.section}` : ''}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        disabled={droppingId === enrollment.id}
                        onClick={() => setPendingDrop({
                          enrollmentId: enrollment.id,
                          courseCode: enrollment.course?.code ?? 'this course',
                        })}
                      >
                        {droppingId === enrollment.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <XCircle className="size-3.5" />
                        )}
                        Drop
                      </Button>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Available Courses */}
            <section className="portal-surface overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#e8f0f5] px-4 py-4 sm:px-5">
                <div>
                  <h2 className="font-semibold text-[#102f49]">Available courses</h2>
                  <p className="mt-1 text-xs text-[#587387]">
                    Courses from your curriculum for the current term.
                    {availableCourses.length === 0 && ' No courses found — contact the registrar.'}
                  </p>
                </div>
                <BookOpen className="size-5 text-[#0a439b]" strokeWidth={1.8} />
              </div>
              {availableCourses.length > 0 ? (
                <div className="divide-y divide-[#e8f0f5]">
                  {availableCourses.map((course) => {
                    const isEnrolled = enrolledIds.has(course.id);
                    const isCompleted = completedIds.includes(course.id);
                    const isBusy = enrollingId === course.id;

                    return (
                      <article
                        key={course.id}
                        className="flex items-center gap-3 px-4 py-4 sm:px-5"
                      >
                        <span className="min-w-16 rounded-lg bg-[#eaf3fa] px-2 py-1 text-center text-xs font-semibold text-[#0a439b]">
                          {course.isCodeSynthesized ? 'Code not specified' : course.code}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-medium text-[#102f49]">
                            {course.title}
                          </h3>
                          <p className="mt-0.5 text-xs text-[#587387]">
                            {course.units} units
                            {course.lecUnits != null || course.labUnits != null
                              ? ` (LEC ${course.lecUnits ?? 0} / LAB ${course.labUnits ?? 'not listed'})`
                              : ''}
                            {course.prerequisites?.length
                              ? ` · Prereq: ${course.prerequisites
                                  .map((p) => p.requiresCode)
                                  .join(', ')}`
                              : ''}
                          </p>
                        </div>
                        {isCompleted ? (
                          <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                            <CheckCircle2 className="size-3.5" />
                            Completed
                          </span>
                        ) : isEnrolled ? (
                          <span className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
                            <CheckCircle2 className="size-3.5" />
                            Enrolled
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            disabled={isBusy || hasOutstandingBalance}
                            onClick={() => void handleEnroll(course)}
                          >
                            {isBusy ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <ChevronRight className="size-3.5" />
                            )}
                            Enroll
                          </Button>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="portal-empty min-h-[10rem]">
                  <BookOpen className="size-8 text-[#0a439b]" strokeWidth={1.7} />
                  <div>
                    <h3 className="font-semibold text-[#102f49]">No courses available</h3>
                    <p className="mt-1 text-sm text-[#587387]">
                      Your program&apos;s curriculum may not have courses assigned for this term.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Enrollment history (automatically maintained — P3-03/P4-04) */}
        {!loading && !error && (
          <section className="portal-surface mt-6 overflow-hidden">
            <div className="border-b border-[#dce7ef] px-5 py-4">
              <h2 className="font-semibold text-[#102f49]">Enrollment history</h2>
              <p className="mt-1 text-sm text-[#587387]">Recorded status changes for your enrollment records.</p>
            </div>
            {history.length ? (
              <div className="divide-y divide-[#e7eef3]">
                {history.slice(0, 12).map((entry) => (
                  <article key={entry.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                    <span className="min-w-16 rounded-lg bg-[#eaf3fa] px-2 py-1 text-center text-xs font-semibold text-[#0a439b]">
                      {entry.course?.code ?? entry.term ?? 'Record'}
                    </span>
                    <span className="text-[#102f49]">{entry.course?.title ?? entry.academicTerm?.label ?? 'Enrollment update'}</span>
                    <span className="text-xs text-[#587387]">
                      {entry.previousStatus ? `${entry.previousStatus} → ` : ''}
                      <span className="font-semibold text-[#365a72]">{entry.status}</span>
                    </span>
                    <span className="ml-auto text-xs text-[#6c879a]">
                      {new Date(entry.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {entry.changedBy?.lastName ? ` · ${entry.changedBy.firstName ?? ''} ${entry.changedBy.lastName}`.trimEnd() : ''}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="px-5 py-4 text-sm text-[#587387]">No enrollment history has been recorded yet.</p>
            )}
          </section>
        )}

        {/* Enrollment drop confirmation */}
        <Dialog
          open={pendingDrop !== null}
          onOpenChange={(open) => {
            if (!open && !droppingId) setPendingDrop(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm course drop</DialogTitle>
              <DialogDescription>
                Are you sure you want to drop {pendingDrop?.courseCode ?? 'this course'} from your current enrollment?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                disabled={droppingId !== null}
                onClick={() => setPendingDrop(null)}
              >
                Cancel
              </Button>
              <Button
                disabled={!pendingDrop || droppingId === pendingDrop.enrollmentId}
                className="bg-red-700 text-white hover:bg-red-800"
                onClick={() => void handleDrop()}
              >
                {pendingDrop && droppingId === pendingDrop.enrollmentId ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : null}
                Confirm drop
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Late Enrollment Risk Waiver Modal */}
        {showWaiver && pendingCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 size-6 shrink-0 text-amber-600" />
                <div>
                  <h2 className="text-lg font-semibold text-[#102f49]">
                    Late Enrollment Risk Waiver
                  </h2>
                  <p className="mt-2 text-sm text-[#587387]">
                    Classes for this term are already ongoing. Per Regis Marie College
                    Registrar policy, late enrollees must accept the academic risk waiver
                    (&quot;Student Will Take the Risk&quot;) before enrolling.
                  </p>
                  <p className="mt-3 text-sm font-medium text-[#102f49]">
                    Course: {pendingCourse.code} — {pendingCourse.title}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowWaiver(false);
                    setPendingCourse(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-amber-600 hover:bg-amber-700"
                  disabled={enrollingId === pendingCourse.id}
                  onClick={() => void handleEnroll(pendingCourse, true)}
                >
                  {enrollingId === pendingCourse.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : null}
                  I Accept the Risk — Enroll
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
