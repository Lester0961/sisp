'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  BookOpenCheck,
  ChevronRight,
  RefreshCw,
  Users,
} from 'lucide-react';
import { facultyApi, type AssignedClass, type ClassRoster } from '@/lib/api/faculty';
import { Navbar } from '@/components/shared/Navbar';
import { Button } from '@/components/ui/button';

export default function FacultyDashboardPage() {
  const [classes, setClasses] = useState<AssignedClass[]>([]);
  const [selected, setSelected] = useState<AssignedClass | null>(null);
  const [roster, setRoster] = useState<ClassRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await facultyApi.getAssignedClasses();
      setClasses(data.data ?? []);
    } catch {
      setError('We could not load your assigned classes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  const openClass = async (assigned: AssignedClass) => {
    setSelected(assigned);
    setLoadingRoster(true);
    try {
      setRoster(await facultyApi.getClassRoster(assigned.courseId, assigned.term?.id, assigned.section));
    } catch {
      setRoster(null);
      setError('We could not load the class roster.');
    } finally {
      setLoadingRoster(false);
    }
  };

  return (
    <div className="portal-page">
      <Navbar />
      <main className="portal-main max-w-6xl pb-8">
        <div className="portal-page-header">
          <div>
            <h1 className="portal-title">My classes</h1>
            <p className="portal-description mt-2">
              Your assigned subjects and class rosters. Grade entry is available on the Grade entry page.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/faculty/grades">
                <BookOpenCheck className="size-4" strokeWidth={1.8} />
                Grade entry
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void loadClasses()} disabled={loading}>
              <RefreshCw className={loading ? 'animate-spin' : ''} strokeWidth={1.8} />
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="portal-surface space-y-4 p-5">
            <div className="portal-skeleton h-16 w-full" />
            <div className="portal-skeleton h-16 w-full" />
            <div className="portal-skeleton h-16 w-full" />
          </div>
        ) : error ? (
          <section className="portal-surface portal-empty">
            <AlertCircle className="size-8 text-[#b42318]" strokeWidth={1.8} />
            <div>
              <h2 className="font-semibold text-[#102f49]">Classes unavailable</h2>
              <p className="mt-1 text-sm text-[#587387]">{error}</p>
            </div>
            <Button size="sm" onClick={() => void loadClasses()}>Try again</Button>
          </section>
        ) : classes.length === 0 ? (
          <section className="portal-surface portal-empty">
            <BookOpen className="size-8 text-[#0a439b]" strokeWidth={1.7} />
            <div>
              <h2 className="font-semibold text-[#102f49]">No assigned classes</h2>
              <p className="mt-1 text-sm text-[#587387]">
                Classes assigned to you by the Registrar will appear here.
              </p>
            </div>
          </section>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[24rem_1fr]">
            <section className="portal-surface overflow-hidden">
              <div className="border-b border-[#dce7ef] px-5 py-4">
                <h2 className="font-semibold text-[#102f49]">Assigned classes</h2>
                <p className="mt-1 text-sm text-[#587387]">Select a class to view its roster.</p>
              </div>
              <ul className="divide-y divide-[#e7eef3]">
                {classes.map((assigned) => (
                  <li key={`${assigned.courseId}-${assigned.term?.id ?? 'any'}-${assigned.section}`}>
                    <button
                      type="button"
                      onClick={() => void openClass(assigned)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#f4f9fd] ${
                        selected?.courseId === assigned.courseId &&
                        selected?.section === assigned.section
                          ? 'bg-[#f1f6fb]'
                          : ''
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-[#102f49]">
                          {assigned.course.code} · {assigned.course.title}
                        </span>
                        <span className="block truncate text-xs text-[#587387]">
                          {assigned.term?.label ?? ''} · Section {assigned.section} ·{' '}
                          {assigned.studentCount} student{assigned.studentCount === 1 ? '' : 's'}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-[#9ab0bf]" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="portal-surface overflow-hidden">
              <div className="border-b border-[#dce7ef] px-5 py-4">
                <h2 className="flex items-center gap-2 font-semibold text-[#102f49]">
                  <Users className="size-4 text-[#0a439b]" strokeWidth={1.8} />
                  {selected ? `${selected.course.code} — Section ${selected.section} roster` : 'Class roster'}
                </h2>
                {selected ? (
                  <p className="mt-1 text-sm text-[#587387]">
                    {selected.course.title} · {selected.term?.label ?? ''} · {selected.studentCount} enrolled
                  </p>
                ) : null}
              </div>

              {!selected ? (
                <p className="px-5 py-6 text-sm text-[#587387]">Select a class to see its enrolled students.</p>
              ) : loadingRoster ? (
                <div className="space-y-2 p-4">
                  <div className="portal-skeleton h-10 w-full" />
                  <div className="portal-skeleton h-10 w-full" />
                  <div className="portal-skeleton h-10 w-full" />
                </div>
              ) : !roster ? (
                <p className="px-5 py-6 text-sm text-[#b42318]">Unable to load this roster.</p>
              ) : roster.students.length === 0 ? (
                <p className="px-5 py-6 text-sm text-[#587387]">No enrolled students in this class yet.</p>
              ) : (
                <ul className="divide-y divide-[#e7eef3]">
                  {roster.students.map((student) => (
                    <li key={student.enrollmentId} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                      <span className="min-w-28 font-medium text-[#102f49]">{student.name}</span>
                      <span className="text-xs text-[#587387]">{student.studentNumber}</span>
                      <span className="ml-auto text-xs font-semibold text-[#365a72]">
                        {student.finalGrade != null
                          ? `${student.finalGrade.toFixed(2)} · ${student.gradeStatus ?? 'recorded'}`
                          : 'No grade yet'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}