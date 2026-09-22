'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, BookOpenCheck, RefreshCw, TriangleAlert } from 'lucide-react';
import { curriculaApi, type CurriculumProgress } from '@/lib/api/curricula';
import CurriculumChecklist from '@/components/curriculum/CurriculumChecklist';
import { Button } from '@/components/ui/button';

export default function CurriculumPage() {
  const [progress, setProgress] = useState<CurriculumProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCurriculum = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await curriculaApi.getMyProgress();
      setProgress(data);
    } catch {
      setError('We could not load your curriculum progress. Confirm that your student profile has an assigned program, then try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCurriculum();
  }, [loadCurriculum]);

  const totals = progress?.totals;
  const hasCurriculum = Boolean(progress?.curriculum && (progress?.courses.length ?? 0) > 0);

  return (
    <div className="portal-page">
      <main className="portal-main pb-8">
        <div className="portal-page-header">
          <div>
            <h1 className="portal-title">Curriculum checklist</h1>
            <p className="portal-description mt-2">Track required courses and the progress recorded for your program.</p>
            {progress?.curriculum?.program ? (
              <p className="mt-1 text-xs font-medium text-[#0a439b]">
                {progress.curriculum.program.code} · {progress.curriculum.program.name} — Effective{' '}
                {progress.curriculum.schoolYear ?? progress.curriculum.effectiveYear}
              </p>
            ) : null}
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
        ) : !hasCurriculum ? (
          <section className="portal-surface portal-empty">
            <BookOpenCheck className="size-8 text-[#0a439b]" strokeWidth={1.7} />
            <div>
              <h2 className="font-semibold text-[#102f49]">No curriculum is assigned</h2>
              <p className="mt-1 text-sm text-[#587387]">Please contact the registrar if you believe this is incorrect.</p>
            </div>
          </section>
        ) : (
          <div className="space-y-5">
            <section className="portal-surface grid grid-cols-2 divide-[#dce7ef] sm:grid-cols-4 sm:divide-x" aria-label="Curriculum progress summary">
              <div className="p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#587387]">Completed units</p>
                <p className="mt-2 text-2xl font-semibold text-[#102f49]">
                  {totals?.completedUnits ?? 0}
                  <span className="text-sm font-normal text-[#587387]"> / {totals?.requiredUnits ?? 0}</span>
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#587387]">Ongoing subjects</p>
                <p className="mt-2 text-2xl font-semibold text-[#102f49]">{totals?.ongoingSubjects ?? 0}</p>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#587387]">Remaining subjects</p>
                <p className="mt-2 text-2xl font-semibold text-[#102f49]">{totals?.remainingSubjects ?? 0}</p>
              </div>
              <div className="bg-[#f1f6fb] p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0a439b]">Completion</p>
                <p className="mt-2 text-2xl font-semibold text-[#0a439b]">{totals?.completionPercentage ?? 0}%</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#d6e6f2]" role="progressbar" aria-valuenow={totals?.completionPercentage ?? 0} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-[#0a439b]" style={{ width: `${Math.min(100, Math.max(0, totals?.completionPercentage ?? 0))}%` }} />
                </div>
              </div>
            </section>

            {progress && !progress.prerequisitesMet && progress.unmetPrerequisites.length > 0 ? (
              <section className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
                <div>
                  <h2 className="text-sm font-semibold text-amber-800">Prerequisites still to complete</h2>
                  <ul className="mt-1 space-y-0.5 text-xs text-amber-700">
                    {progress.unmetPrerequisites.slice(0, 8).map((item) => (
                      <li key={`${item.courseCode}-${item.requiresCode}`}>
                        {item.courseCode}: requires {item.requiresCode}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ) : null}

            <section className="portal-surface p-4 sm:p-6">
              <CurriculumChecklist courses={progress?.courses ?? []} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
