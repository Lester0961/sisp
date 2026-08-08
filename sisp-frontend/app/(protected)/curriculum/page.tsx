'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, BookOpenCheck, RefreshCw } from 'lucide-react';
import { curriculaApi, type CurriculumCourse } from '@/lib/api/curricula';
import CurriculumChecklist from '@/components/curriculum/CurriculumChecklist';
import { Navbar } from '@/components/shared/Navbar';
import { Button } from '@/components/ui/button';

export default function CurriculumPage() {
  const [courses, setCourses] = useState<CurriculumCourse[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCurriculum = useCallback(async () => {
    setLoading(true);
    setError(null);
    let timeoutId: number | undefined;
    try {
      const data = await Promise.race([
        Promise.all([
          curriculaApi.getMyCurriculum(),
          curriculaApi.getCompletedCourseIds(),
        ]),
        new Promise<never>((_, reject) => {
          timeoutId = window.setTimeout(() => reject(new Error('timeout')), 10_000);
        }),
      ]);
      setCourses(data[0]);
      setCompletedIds(data[1]);
    } catch {
      setError('We could not load your curriculum. Confirm that your student profile has an assigned program, then try again.');
    } finally {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCurriculum();
  }, [loadCurriculum]);

  return (
    <div className="portal-page">
      <Navbar />
      <main className="portal-main pb-8">
        <div className="portal-page-header">
          <div>
            <h1 className="portal-title">Curriculum checklist</h1>
            <p className="portal-description mt-2">Track required courses and the progress recorded for your program.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadCurriculum()} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin' : ''} strokeWidth={1.8} />
            Refresh
          </Button>
        </div>

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
              <h2 className="font-semibold text-[#102f49]">Curriculum unavailable</h2>
              <p className="mt-1 max-w-md text-sm text-[#587387]">{error}</p>
            </div>
            <Button size="sm" onClick={() => void loadCurriculum()}>Try again</Button>
          </section>
        ) : courses.length === 0 ? (
          <section className="portal-surface portal-empty">
            <BookOpenCheck className="size-8 text-[#0a439b]" strokeWidth={1.7} />
            <div>
              <h2 className="font-semibold text-[#102f49]">No curriculum is assigned</h2>
              <p className="mt-1 text-sm text-[#587387]">Please contact the registrar if you believe this is incorrect.</p>
            </div>
          </section>
        ) : (
          <section className="portal-surface p-4 sm:p-6">
            <CurriculumChecklist curriculumCourses={courses} completedCourseIds={completedIds} />
          </section>
        )}
      </main>
    </div>
  );
}
