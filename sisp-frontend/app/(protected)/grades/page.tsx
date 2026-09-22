'use client';

import { useEffect } from 'react';
import { useStudentStore } from '@/stores/studentStore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { Loader2, BookOpen, Layers, AlertCircle, CalendarDays, CheckCircle2, LockKeyhole } from 'lucide-react';

export default function GradesPage() {
  const {
    grades,
    gradesMessage,
    gradesError,
    isLoadingGrades,
    fetchGrades,
    gradeTerms,
    currentGradeTerm,
    selectedGradeTermId,
    setSelectedGradeTerm,
  } = useStudentStore();

  useEffect(() => {
    if (grades.length === 0 && gradeTerms.length === 0 && !isLoadingGrades) void fetchGrades();
  }, [grades.length, gradeTerms.length, isLoadingGrades, fetchGrades]);

  const totalUnits = grades.reduce(
    (sum, g) => sum + (g.enrollment?.course?.units ?? 0),
    0,
  );

  const selectedTerm = selectedGradeTermId
    ? gradeTerms.find((term) => term.id === selectedGradeTermId) ?? null
    : currentGradeTerm;
  const termLocked = Boolean(selectedTerm && !selectedTerm.isFullyPaid);

  return (
    <div className="portal-page">

      <main className="portal-main max-w-6xl">
        <div className="portal-page-header">
          <div>
          <h1 className="portal-title">My grades</h1>
          <p className="portal-description mt-2">
            View your academic performance
          </p>
          </div>
        </div>

        {isLoadingGrades ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#1e3a8a]" />
          </div>
        ) : gradesError ? (
          <div role="alert" className="portal-surface portal-empty">
            <AlertCircle className="size-8 text-[#b42318]" />
            <div><h2 className="font-semibold text-[#102f49]">Grades unavailable</h2><p className="mt-1 text-sm text-[#587387]">{gradesError}</p></div>
            <Button variant="outline" size="sm" onClick={() => void fetchGrades()}>Try again</Button>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="portal-surface overflow-hidden" aria-label="Academic term selector">
              <div className="flex flex-col gap-3 border-b border-[#e8f0f5] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-[#eaf3fa] text-[#0a439b]"><CalendarDays className="size-4" /></span>
                  <div><p className="text-sm font-semibold text-[#102f49]">Academic terms</p><p className="text-xs text-[#587387]">Prelim, Midterm, and Finals are recorded inside each term.</p></div>
                </div>
                <span className="text-xs font-medium text-[#587387]">{selectedTerm ? `${selectedTerm.academicYear} · ${selectedTerm.label}` : 'All terms'}</span>
              </div>
              <div className="grid gap-2 p-3 sm:grid-cols-4 sm:p-4">
                <button
                  type="button"
                  onClick={() => void setSelectedGradeTerm(null)}
                  className={`rounded-xl border px-3 py-3 text-left transition ${selectedGradeTermId === null ? 'border-[#0a439b] bg-[#f1f6fb] ring-2 ring-[#0a439b]/10' : 'border-[#dce7ef] bg-white hover:border-[#9bc2df]'}`}
                >
                  <span className="block text-xs font-semibold text-[#102f49]">All terms</span>
                  <span className="mt-1 block text-[11px] text-[#587387]">Complete approved record</span>
                </button>
                {gradeTerms.map((term) => {
                  const locked = !term.isFullyPaid;
                  return (
                    <button
                      type="button"
                      key={term.id}
                      onClick={() => void setSelectedGradeTerm(term.id)}
                      className={`rounded-xl border px-3 py-3 text-left transition ${selectedGradeTermId === term.id ? 'border-[#0a439b] bg-[#f1f6fb] ring-2 ring-[#0a439b]/10' : 'border-[#dce7ef] bg-white hover:border-[#9bc2df]'}`}
                    >
                      <span className="flex items-center justify-between gap-2 text-xs font-semibold text-[#102f49]"><span>{term.label}</span>{locked ? <LockKeyhole className="size-3.5 text-[#a15c05]" /> : <CheckCircle2 className="size-3.5 text-[#16794c]" />}</span>
                      <span className={`mt-1 block text-[11px] ${locked ? 'text-[#a15c05]' : 'text-[#16794c]'}`}>{locked ? 'Payment required to view' : 'Paid · grades available'}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Payment status banner */}
            {(termLocked || gradesMessage || grades.length === 0) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                {termLocked ? <LockKeyhole className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" /> : <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />}
                <div>
                  <p className="text-sm font-semibold text-amber-800">{termLocked ? `${selectedTerm?.label ?? 'This term'} grades are locked` : gradesMessage ? 'Some grades are temporarily hidden' : 'Grades temporarily unavailable'}</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    {termLocked ? 'Complete the payment requirement for this academic term to view its approved grades. Paid past terms remain available.' : gradesMessage || 'Current-term grades are hidden until the matching term is fully paid.'}
                  </p>
                </div>
              </div>
            )}

            <section className="portal-surface grid grid-cols-3 divide-x divide-[#dce7ef] p-0" aria-label="Grade summary">
              <div className="p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#587387]">Subjects rated</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-[#102f49]">{grades.length}</p>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#587387]">Total units</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-[#102f49]">{totalUnits}</p>
              </div>
              <div className="bg-[#f1f6fb] p-4 sm:p-5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0a439b]"><Layers className="size-3.5" /> Terms on record</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-[#0a439b]">{gradeTerms.length}</p>
                <p className="mt-1 text-[10px] text-[#587387]">Official GPA is issued by the Registrar, not computed here.</p>
              </div>
            </section>

            {/* Grades List */}
            <Card className="portal-surface overflow-hidden">
              <CardHeader className="border-b border-[#e8f0f5] pb-4">
                <CardTitle className="text-lg">Grade Sheet</CardTitle>
                <CardDescription>
                  Only officially approved grades are shown after dean review.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                {grades.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-30" />
                    <p>No grades available yet.</p>
                    <p className="text-xs">
                      Grades will appear here once approved by the dean and your tuition is fully paid.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#e8f0f5] sm:rounded-xl sm:border sm:border-[#e8f0f5]">
                    {grades.map((grade) => (
                      <div key={grade.id} className="p-4 transition-colors hover:bg-[#f8fbfd] sm:p-5">
                        {/* Mobile Header: Course Code & Final Grade */}
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-800 tracking-tight">{grade.enrollment.course.code}</span>
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5 rounded bg-slate-50 text-slate-500 border-slate-200">
                                {grade.enrollment.course.units} UNITS
                              </Badge>
                              <Badge className="text-[9px] h-4 px-1.5 rounded bg-emerald-50 text-emerald-600 border-emerald-200">
                                {grade.status === 'approved' ? 'Published' : grade.status ?? 'Posted'}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-0.5 leading-snug pr-4">
                              {grade.enrollment.course.title}
                            </p>
                          </div>
                          
                          <div className="text-right shrink-0">
                            <div className="text-xl font-semibold text-[#102f49]">
                              {grade.finalGrade?.toFixed(2) ?? 'Not posted'}
                            </div>
                            <p className="mt-1 text-[9px] text-[#587387]">Recorded final grade</p>
                          </div>
                        </div>

                        {/* Breakdown */}
                        <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-50/80 rounded-lg p-2.5 border border-slate-100">
                          <div className="text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prelim</p>
                            <p className="text-sm font-semibold text-slate-700">{grade.prelim ?? 'Not posted'}</p>
                          </div>
                          <div className="text-center border-x border-slate-200">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Midterm</p>
                            <p className="text-sm font-semibold text-slate-700">{grade.midterm ?? 'Not posted'}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Finals</p>
                            <p className="text-sm font-semibold text-slate-700">{grade.finals ?? 'Not posted'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
