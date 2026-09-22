'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, CheckCircle2, RefreshCw, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { academicTermsApi, AcademicTerm } from '@/lib/api/academicTerms';
import { enrollmentsApi } from '@/lib/api/enrollments';

type FacultyOption = { id: string; firstName: string; lastName: string; email: string };

type EnrollmentRow = {
  id: string;
  section?: string | null;
  term?: AcademicTerm | null;
  instructorId?: string | null;
  instructor?: { id: string; firstName: string; lastName: string; email: string } | null;
  course?: { code: string; title: string; units: number };
  student?: { studentNumber: string; user?: { firstName: string; lastName: string; email: string } };
};

export default function EnrollmentAssignmentsPage() {
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string | undefined>();
  const [rows, setRows] = useState<EnrollmentRow[]>([]);
  const [faculty, setFaculty] = useState<FacultyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [termsLoading, setTermsLoading] = useState(true);
  const [termsError, setTermsError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const load = async (termId = selectedTermId) => {
    setLoading(true);
    setLoadError(false);
    try {
      const [enrollmentResponse, facultyResponse] = await Promise.all([
        enrollmentsApi.getAllEnrollments({ termId }),
        enrollmentsApi.getEligibleInstructors(),
      ]);
      setRows(enrollmentResponse.data ?? []);
      setFaculty(facultyResponse ?? []);
    } catch {
      setLoadError(true);
      toast.error('Unable to load enrollment assignments.');
    } finally {
      setLoading(false);
    }
  };

  const loadTerms = async () => {
    setTermsLoading(true);
    setTermsError(false);
    try {
      const availableTerms = await academicTermsApi.list();
      setTerms(availableTerms);
      const current = availableTerms.find((term) => term.isCurrent) ?? availableTerms[0];
      setSelectedTermId(current?.id);
      if (current) await load(current.id);
      else setRows([]);
    } catch {
      setTermsError(true);
    } finally {
      setTermsLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTerms();
  }, []);

  const assignedCount = useMemo(() => rows.filter((row) => row.instructorId).length, [rows]);

  const assign = async (enrollmentId: string, instructorId: string) => {
    if (!instructorId) return;
    setAssigningId(enrollmentId);
    try {
      const result = await enrollmentsApi.assignInstructor(enrollmentId, instructorId);
      setRows((previous) => previous.map((row) => row.id === enrollmentId ? { ...row, ...result.data } : row));
      toast.success('Faculty assignment saved.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to save faculty assignment.');
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <main className="portal-main max-w-7xl space-y-5">
        <div className="portal-page-header flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="portal-title">Enrollment assignments</h1>
            <p className="portal-description mt-2">Assign each enrolled student to the faculty member who may encode that term&apos;s grades.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'animate-spin' : ''} />Refresh</Button>
        </div>

        <section className="portal-surface overflow-hidden" aria-label="Assignment term selector">
          <div className="flex flex-col gap-1 border-b border-[#e8f0f5] px-4 py-3 sm:px-5"><p className="text-sm font-semibold text-[#102f49]">Assignment term</p><p className="text-xs text-[#587387]">Faculty ownership is enforced by the grade API.</p></div>
          <div className="flex gap-2 overflow-x-auto p-3 sm:p-4">
            {terms.map((term) => <button key={term.id} type="button" aria-pressed={selectedTermId === term.id} onClick={() => { setSelectedTermId(term.id); void load(term.id); }} className={`min-w-[9rem] rounded-xl border px-3 py-2.5 text-left text-xs transition ${selectedTermId === term.id ? 'border-[#0a439b] bg-[#f1f6fb]' : 'border-[#dce7ef] bg-white hover:border-[#9bc2df]'}`}><span className="block font-semibold text-[#102f49]">{term.label}</span><span className="mt-1 block text-[#587387]">{term.academicYear}{term.isCurrent ? ' · Current' : ''}</span></button>)}
            {termsLoading ? <p className="px-1 py-2 text-xs text-[#587387]">Loading academic terms…</p> : null}
            {termsError ? <p role="alert" className="px-1 py-2 text-xs text-red-700">Academic terms could not be loaded. <button type="button" onClick={() => void loadTerms()} className="underline">Retry</button></p> : null}
            {!termsLoading && !termsError && !terms.length ? <p className="px-1 py-2 text-xs text-[#a15c05]">No academic terms are available.</p> : null}
          </div>
        </section>

        <section className="grid grid-cols-2 divide-x divide-[#dce7ef] overflow-hidden rounded-2xl border border-[#dce7ef] bg-white shadow-[0_10px_28px_rgb(15_45_74_/_0.055)] sm:grid-cols-3">
          <div className="p-4"><p className="text-xs text-[#587387]">Enrollments in term</p><p className="mt-1 text-2xl font-semibold text-[#102f49]">{rows.length}</p></div>
          <div className="p-4"><p className="text-xs text-[#587387]">Assigned</p><p className="mt-1 text-2xl font-semibold text-[#16794c]">{assignedCount}</p></div>
          <div className="col-span-2 border-t border-[#dce7ef] p-4 sm:col-span-1 sm:border-t-0"><p className="text-xs text-[#587387]">Needs assignment</p><p className="mt-1 text-2xl font-semibold text-[#a15c05]">{Math.max(0, rows.length - assignedCount)}</p></div>
        </section>

        {termsLoading || loading ? <section className="portal-surface space-y-3 p-5"><div className="portal-skeleton h-16" /><div className="portal-skeleton h-16" /></section> : termsError ? null : loadError ? (
          <section role="alert" className="portal-surface border-red-200 p-5 text-sm text-red-800">Enrollment assignments could not be loaded. <button type="button" onClick={() => void load()} className="ml-2 underline">Retry</button></section>
        ) : !terms.length ? (
          <section className="portal-surface portal-empty"><AlertCircle className="size-8 text-[#a15c05]" /><div><h2 className="font-semibold text-[#102f49]">No academic terms available</h2><p className="mt-1 text-sm text-[#587387]">Enrollment assignments require an academic term.</p></div></section>
        ) : rows.length === 0 ? (
          <section className="portal-surface portal-empty"><AlertCircle className="size-8 text-[#a15c05]" /><div><h2 className="font-semibold text-[#102f49]">No enrollments in this term</h2><p className="mt-1 text-sm text-[#587387]">Enrollment records will appear here when they are attached to an academic term.</p></div></section>
        ) : (
          <section className="portal-surface overflow-hidden">
            <div className="border-b border-[#e8f0f5] bg-[#fbfdfe] px-4 py-4 sm:px-5"><h2 className="font-semibold text-[#102f49]">Student-to-faculty ownership</h2></div>
            <div className="divide-y divide-[#e8f0f5]">
              {rows.map((row) => (
                <article key={row.id} className="grid gap-4 px-4 py-4 lg:grid-cols-[1.1fr_1fr_18rem] lg:items-center sm:px-5">
                  <div className="flex min-w-0 items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#eaf3fa] text-[#0a439b]"><BookOpen className="size-4" /></span><div className="min-w-0"><p className="truncate font-semibold text-[#102f49]">{row.student?.user?.firstName} {row.student?.user?.lastName}</p><p className="mt-1 truncate text-xs text-[#587387]">{row.student?.studentNumber} · {row.course?.code} · {row.course?.title}</p></div></div>
                  <div className="flex items-center gap-2 text-xs text-[#587387]"><span className="rounded-full border border-[#dce7ef] px-2 py-1">Section {row.section || '—'}</span><span>{row.course?.units ?? 0} units</span>{row.instructorId ? <CheckCircle2 className="size-4 text-[#16794c]" /> : <AlertCircle className="size-4 text-[#a15c05]" />}</div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#365a72]"><UserRound className="size-4 shrink-0" /><span className="sr-only">Assign faculty for {row.student?.studentNumber}</span><select value={row.instructorId ?? ''} onChange={(event) => void assign(row.id, event.target.value)} disabled={assigningId === row.id || faculty.length === 0} className="h-10 min-w-0 flex-1 rounded-xl border border-[#cbdde9] bg-white px-3 text-sm font-normal text-[#102f49] focus:border-[#0a439b] focus:outline-none focus:ring-4 focus:ring-[#0a439b]/10"><option value="">Select faculty</option>{faculty.map((person) => <option key={person.id} value={person.id}>{person.firstName} {person.lastName}</option>)}</select></label>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
