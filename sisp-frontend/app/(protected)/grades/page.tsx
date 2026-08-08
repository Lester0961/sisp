'use client';

import { useEffect } from 'react';
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

import { Loader2, BookOpen, TrendingUp, AlertCircle } from 'lucide-react';
import { notificationsApi } from '@/lib/api/notifications';
import { useEffect as useEffectNotif } from 'react';

function getGradeColor(grade: number | null): string {
  if (grade === null) return 'text-muted-foreground';
  if (grade >= 90) return 'text-green-600 font-bold';
  if (grade >= 80) return 'text-blue-600 font-bold';
  if (grade >= 75) return 'text-yellow-600 font-bold';
  return 'text-destructive font-bold';
}

function getGradeLabel(grade: number | null): string {
  if (grade === null) return 'N/A';
  if (grade >= 90) return 'Excellent';
  if (grade >= 80) return 'Very Good';
  if (grade >= 75) return 'Passing';
  return 'Failed';
}

export default function GradesPage() {
  const { grades, isLoadingGrades, fetchGrades } = useStudentStore();

  useEffect(() => {
    if (grades.length === 0) void fetchGrades();
  }, [grades.length, fetchGrades]);

  useEffectNotif(() => {
    notificationsApi
      .getUnreadCount()
      .catch(() => {});
  }, []);

  const gpa =
    grades.length > 0
      ? (
          grades.reduce((sum, g) => sum + (g.finalGrade ?? 0), 0) /
          grades.length
        ).toFixed(2)
      : null;

  const totalUnits = grades.reduce(
    (sum, g) => sum + (g.enrollment?.course?.units ?? 0),
    0,
  );

  return (
    <div className="portal-page">
      <Navbar/>

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
        ) : (
          <div className="space-y-6">
            {/* Payment status banner */}
            {grades.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Grades temporarily unavailable</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Your grades are hidden until tuition is fully paid for this semester. Please settle your balance at the accounting office.
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
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0a439b]"><TrendingUp className="size-3.5" /> Average</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-[#0a439b]">{gpa ?? 'N/A'}</p>
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
                                Dean Approved
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-0.5 leading-snug pr-4">
                              {grade.enrollment.course.title}
                            </p>
                          </div>
                          
                          <div className="text-right shrink-0">
                            <div className={`text-xl ${getGradeColor(grade.finalGrade)}`}>
                              {grade.finalGrade?.toFixed(2) ?? 'Not posted'}
                            </div>
                            <Badge
                              variant={grade.finalGrade !== null && grade.finalGrade >= 75 ? 'secondary' : 'destructive'}
                              className={`mt-1 text-[9px] px-1.5 py-0 rounded ${grade.finalGrade !== null && grade.finalGrade >= 75 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : ''}`}
                            >
                              {getGradeLabel(grade.finalGrade)}
                            </Badge>
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
