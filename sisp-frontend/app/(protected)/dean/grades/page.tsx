'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, FileCheck, RefreshCw, Search, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { gradesApi, GradeItem } from '@/lib/api/grades';
import { academicTermsApi, AcademicTerm } from '@/lib/api/academicTerms';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/shared/Navbar';
import { toast } from 'sonner';

function score(value: number | null | undefined) {
  return value === null || value === undefined ? 'Not recorded' : value.toFixed(2);
}

export default function DeanGradesPage() {
  useAuth();
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [termsLoading, setTermsLoading] = useState(true);
  const [termsError, setTermsError] = useState(false);
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState<Record<string, string>>({});
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);

  const loadGrades = async (termId = selectedTermId ?? undefined) => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await gradesApi.getAllGrades(undefined, undefined, 'submitted', termId);
      setGrades(Array.isArray(data) ? data : (data as { data?: GradeItem[] })?.data ?? []);
    } catch {
      setLoadError(true);
      toast.error('Unable to load the grade approval queue.');
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
      setSelectedTermId(current?.id ?? null);
      if (current) await loadGrades(current.id);
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

  const handleApprove = async (gradeId: string) => {
    if (!window.confirm('Approve this grade and publish it to the student record?')) {
      return;
    }
    setActionId(gradeId);
    try {
      await gradesApi.postGrade(gradeId);
      setGrades((previous) => previous.filter((grade) => grade.id !== gradeId));
      toast.success('Grade approved by the dean and queued for registrar publication.');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Unable to approve this grade.');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (gradeId: string) => {
    const remarks = rejectRemarks[gradeId]?.trim();
    if (!remarks) {
      toast.error('Add a reason before returning this grade.');
      return;
    }
    if (!window.confirm('Return this grade to faculty with the remarks provided?')) {
      return;
    }
    setActionId(gradeId);
    try {
      await gradesApi.rejectGrade(gradeId, remarks);
      setGrades((previous) => previous.filter((grade) => grade.id !== gradeId));
      setRejectRemarks((previous) => {
        const next = { ...previous };
        delete next[gradeId];
        return next;
      });
      toast.success('Grade returned to faculty with your remarks.');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Unable to return this grade.');
    } finally {
      setActionId(null);
    }
  };

  const filteredGrades = grades.filter((grade) => {
    const term = search.toLowerCase();
    const student = `${grade.enrollment?.student?.user?.firstName ?? ''} ${grade.enrollment?.student?.user?.lastName ?? ''}`.toLowerCase();
    return student.includes(term) || (grade.enrollment?.course?.code ?? '').toLowerCase().includes(term) || (grade.enrollment?.student?.studentNumber ?? '').toLowerCase().includes(term);
  });

  return (
    <div className="portal-page">
      <Navbar />
      <main className="portal-main">
        <div className="portal-page-header">
          <div><h1 className="portal-title">Grade approvals</h1><p className="portal-description mt-2">Review faculty-submitted grades, approve them for registrar publication, or return them with clear remarks.</p></div>
          <Button variant="outline" size="sm" onClick={() => void loadGrades()} disabled={loading}><RefreshCw className={loading ? 'animate-spin' : ''} strokeWidth={1.8} />Refresh</Button>
        </div>

        <section className="portal-surface mb-5 overflow-hidden" aria-label="Dean approval term selector">
          <div className="border-b border-[#e8f0f5] px-4 py-3 sm:px-5"><p className="text-sm font-semibold text-[#102f49]">Approval term</p><p className="text-xs text-[#587387]">Review faculty submissions one academic term at a time.</p></div>
          <div className="flex gap-2 overflow-x-auto p-3 sm:p-4">
            {terms.map((term) => <button key={term.id} type="button" aria-pressed={selectedTermId === term.id} onClick={() => { setSelectedTermId(term.id); void loadGrades(term.id); }} className={`min-w-[8rem] rounded-xl border px-3 py-2.5 text-left text-xs transition ${selectedTermId === term.id ? 'border-[#0a439b] bg-[#f1f6fb] text-[#0a439b]' : 'border-[#dce7ef] text-[#587387] hover:border-[#9bc2df]'}`}><span className="block font-semibold text-[#102f49]">{term.label}</span><span className="mt-1 block">{term.academicYear}</span></button>)}
            {termsLoading ? <p className="px-1 py-2 text-xs text-[#587387]">Loading academic terms…</p> : null}
            {termsError ? <p role="alert" className="px-1 py-2 text-xs text-red-700">Academic terms could not be loaded. <button type="button" onClick={() => void loadTerms()} className="underline">Retry</button></p> : null}
            {!termsLoading && !termsError && !terms.length ? <p className="px-1 py-2 text-xs text-[#a15c05]">No academic terms are available.</p> : null}
          </div>
        </section>

        <section className="portal-surface mb-5 p-4 sm:p-5">
          <label htmlFor="grade-search" className="sr-only">Search grades</label>
          <div className="relative"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#6c879a]" strokeWidth={1.8} /><input id="grade-search" type="search" placeholder="Search student, student number, or course" value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-xl border border-[#cbdde9] bg-[#fbfdfe] py-2 pl-10 pr-4 text-sm text-[#102f49] placeholder:text-[#6c879a] focus:border-[#0a439b] focus:outline-none focus:ring-4 focus:ring-[#0a439b]/10" /></div>
        </section>

        {termsLoading || loading ? (
          <section className="space-y-3"><div className="portal-skeleton h-52" /><div className="portal-skeleton h-52" /></section>
        ) : termsError ? null : loadError ? (
          <section role="alert" className="portal-surface border-red-200 p-5 text-sm text-red-800">Grade approvals could not be loaded. <button type="button" onClick={() => void loadGrades()} className="ml-2 underline">Retry</button></section>
        ) : !terms.length ? (
          <section className="portal-surface portal-empty"><FileCheck className="size-8 text-[#a15c05]" strokeWidth={1.8} /><div><h2 className="font-semibold text-[#102f49]">No academic terms available</h2><p className="mt-1 text-sm text-[#587387]">Grade approvals require an academic term.</p></div></section>
        ) : filteredGrades.length ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {filteredGrades.map((grade) => {
              const student = `${grade.enrollment?.student?.user?.firstName ?? ''} ${grade.enrollment?.student?.user?.lastName ?? ''}`.trim() || 'Student';
              return (
                <article key={grade.id} className="portal-surface p-5">
                  <div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-[#102f49]">{student}</h2><p className="mt-1 text-sm text-[#587387]">{grade.enrollment?.student?.studentNumber || 'Student record'}</p></div><span className="rounded-lg bg-[#eaf3fa] px-2 py-1 text-xs font-semibold text-[#0a439b]">{grade.enrollment?.course?.code}</span></div>
                  <p className="mt-4 text-sm text-[#365a72]">{grade.enrollment?.course?.title}</p>
                  <div className="mt-4 grid grid-cols-2 divide-x divide-y divide-[#dce7ef] overflow-hidden rounded-xl border border-[#dce7ef] sm:grid-cols-4 sm:divide-y-0">
                    {[['Prelim', score(grade.prelim)], ['Midterm', score(grade.midterm)], ['Finals', score(grade.finals)], ['Final grade', score(grade.finalGrade)]].map(([label, value]) => <div key={label} className="p-3 text-center"><p className="text-[11px] text-[#587387]">{label}</p><p className="mt-1 text-sm font-semibold text-[#102f49]">{value}</p></div>)}
                  </div>
                  <div className="mt-4 border-t border-[#e7eef3] pt-4"><label htmlFor={`remarks-${grade.id}`} className="text-xs font-semibold text-[#365a72]">Reason for return</label><input id={`remarks-${grade.id}`} type="text" value={rejectRemarks[grade.id] || ''} onChange={(event) => setRejectRemarks((previous) => ({ ...previous, [grade.id]: event.target.value }))} placeholder="Required only when returning a grade" className="mt-2 h-10 w-full rounded-lg border border-[#cbdde9] bg-[#fbfdfe] px-3 text-sm text-[#102f49] placeholder:text-[#6c879a] focus:border-[#0a439b] focus:outline-none focus:ring-4 focus:ring-[#0a439b]/10" /></div>
                  <div className="mt-4 grid grid-cols-2 gap-2"><Button disabled={actionId === grade.id} className="bg-[#16794c] hover:bg-[#12663f]" onClick={() => void handleApprove(grade.id)}><CheckCircle2 className="size-4" strokeWidth={1.8} />{actionId === grade.id ? 'Working' : 'Approve'}</Button><Button disabled={actionId === grade.id} variant="outline" className="border-[#f0c4c4] text-[#b42318] hover:bg-[#fff4f4]" onClick={() => void handleReject(grade.id)}><XCircle className="size-4" strokeWidth={1.8} />Return</Button></div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="portal-surface portal-empty"><FileCheck className="size-8 text-[#16794c]" strokeWidth={1.8} /><div><h2 className="font-semibold text-[#102f49]">No grades need approval</h2><p className="mt-1 text-sm text-[#587387]">Faculty-submitted grades will appear here when they are ready for dean review.</p></div></section>
        )}
      </main>
    </div>
  );
}
