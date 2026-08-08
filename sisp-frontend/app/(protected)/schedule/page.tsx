'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, BookOpen, CalendarDays, RefreshCw } from 'lucide-react';
import { enrollmentsApi } from '@/lib/api/enrollments';
import { Enrollment } from '@/types';
import { Navbar } from '@/components/shared/Navbar';
import { Button } from '@/components/ui/button';

type EnrollmentPayload = Enrollment[] | { data?: Enrollment[] };

function normalizeEnrollments(payload: EnrollmentPayload): Enrollment[] {
  return Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
}

export default function SchedulePage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await enrollmentsApi.getMyEnrollments() as EnrollmentPayload;
      setEnrollments(normalizeEnrollments(data));
    } catch {
      setError('We could not load your schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  return (
    <div className="portal-page">
      <Navbar />
      <main className="portal-main pb-8">
        <div className="portal-page-header">
          <div>
            <h1 className="portal-title">My schedule</h1>
            <p className="portal-description mt-2">See the courses currently listed in your enrollment.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadSchedule()} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin' : ''} strokeWidth={1.8} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="portal-surface space-y-4 p-5">
            <div className="portal-skeleton h-5 w-40" />
            <div className="portal-skeleton h-16 w-full" />
            <div className="portal-skeleton h-16 w-full" />
            <div className="portal-skeleton h-16 w-full" />
          </div>
        ) : error ? (
          <section className="portal-surface portal-empty">
            <AlertCircle className="size-8 text-[#b42318]" strokeWidth={1.8} />
            <div>
              <h2 className="font-semibold text-[#102f49]">Schedule unavailable</h2>
              <p className="mt-1 text-sm text-[#587387]">{error}</p>
            </div>
            <Button size="sm" onClick={() => void loadSchedule()}>Try again</Button>
          </section>
        ) : enrollments.length === 0 ? (
          <section className="portal-surface portal-empty">
            <CalendarDays className="size-8 text-[#0a439b]" strokeWidth={1.7} />
            <div>
              <h2 className="font-semibold text-[#102f49]">No enrolled courses yet</h2>
              <p className="mt-1 text-sm text-[#587387]">Your schedule will appear here when enrollment is confirmed.</p>
            </div>
          </section>
        ) : (
          <section className="portal-surface overflow-hidden">
            <div className="border-b border-[#dce7ef] px-5 py-4">
              <h2 className="flex items-center gap-2 font-semibold text-[#102f49]">
                <BookOpen className="size-4 text-[#0a439b]" strokeWidth={1.8} />
                Current courses
              </h2>
            </div>
            <div className="divide-y divide-[#e7eef3]">
              {enrollments.map((enrollment) => (
                <article key={enrollment.id} className="grid gap-1 px-5 py-4 sm:grid-cols-[8rem_1fr_auto] sm:items-center sm:gap-4">
                  <p className="font-semibold text-[#0a439b]">{enrollment.course?.code}</p>
                  <div>
                    <h3 className="font-medium text-[#102f49]">{enrollment.course?.title}</h3>
                    <p className="mt-1 text-sm text-[#587387]">Section {enrollment.section || 'To be assigned'}</p>
                  </div>
                  <p className="text-sm font-medium text-[#365a72]">{enrollment.course?.units ?? 0} units</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
