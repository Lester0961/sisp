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
    <div className="min-h-screen bg-background">
      <Navbar/>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">My Grades</h1>
          <p className="text-muted-foreground">
            View your academic performance
          </p>
        </div>

        {isLoadingGrades ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#1e3a8a]" />
          </div>
        ) : (
          <div className="space-y-6 pb-24 md:pb-8">
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

            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-white to-slate-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Subjects Rated
                      </p>
                      <p className="text-2xl font-black text-slate-800">{grades.length}</p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-[#1e3a8a]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-white to-slate-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Total Units
                      </p>
                      <p className="text-2xl font-black text-slate-800">{totalUnits}</p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-indigo-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-[#1e3a8a] to-blue-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-1">
                        Average Grade
                      </p>
                      <p className="text-3xl font-black">
                        {gpa ?? 'N/A'}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
                      <TrendingUp className="h-6 w-6 text-emerald-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Grades List */}
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="border-b border-slate-50 pb-4">
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
                  <div className="divide-y divide-slate-100 sm:border sm:border-slate-100 sm:rounded-xl">
                    {grades.map((grade) => (
                      <div key={grade.id} className="p-4 sm:p-5 hover:bg-slate-50 transition-colors">
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
                              {grade.finalGrade?.toFixed(2) ?? '—'}
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
                            <p className="text-sm font-semibold text-slate-700">{grade.prelim ?? '—'}</p>
                          </div>
                          <div className="text-center border-x border-slate-200">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Midterm</p>
                            <p className="text-sm font-semibold text-slate-700">{grade.midterm ?? '—'}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Finals</p>
                            <p className="text-sm font-semibold text-slate-700">{grade.finals ?? '—'}</p>
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