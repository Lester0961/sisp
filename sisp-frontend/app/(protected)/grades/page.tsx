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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, BookOpen, TrendingUp } from 'lucide-react';
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
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Subjects with Grades
                      </p>
                      <p className="text-2xl font-bold">{grades.length}</p>
                    </div>
                    <BookOpen className="h-8 w-8 opacity-60 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Total Units
                      </p>
                      <p className="text-2xl font-bold">{totalUnits}</p>
                    </div>
                    <BookOpen className="h-8 w-8 opacity-60 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Average Grade
                      </p>
                      <p
                        className={`text-2xl ${getGradeColor(gpa ? parseFloat(gpa) : null)}`}
                      >
                        {gpa ?? 'N/A'}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 opacity-60 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Grades table */}
            <Card>
              <CardHeader>
                <CardTitle>Grade Sheet</CardTitle>
                <CardDescription>
                  Only published grades are shown.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {grades.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-30" />
                    <p>No grades available yet.</p>
                    <p className="text-xs">
                      Grades will appear here once published by your faculty.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Course</TableHead>
                          <TableHead className="text-center">Units</TableHead>
                          <TableHead className="text-center">
                            Prelim (30%)
                          </TableHead>
                          <TableHead className="text-center">
                            Midterm (30%)
                          </TableHead>
                          <TableHead className="text-center">
                            Finals (40%)
                          </TableHead>
                          <TableHead className="text-center">
                            Final Grade
                          </TableHead>
                          <TableHead className="text-center">
                            Remarks
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {grades.map((grade) => (
                          <TableRow key={grade.id}>
                            <TableCell>
                              <p className="font-medium">
                                {grade.enrollment.course.code}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {grade.enrollment.course.title}
                              </p>
                            </TableCell>
                            <TableCell className="text-center">
                              {grade.enrollment.course.units}
                            </TableCell>
                            <TableCell className="text-center">
                              {grade.prelim ?? '—'}
                            </TableCell>
                            <TableCell className="text-center">
                              {grade.midterm ?? '—'}
                            </TableCell>
                            <TableCell className="text-center">
                              {grade.finals ?? '—'}
                            </TableCell>
                            <TableCell className="text-center">
                              <span
                                className={getGradeColor(grade.finalGrade)}
                              >
                                {grade.finalGrade?.toFixed(2) ?? '—'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={
                                  grade.finalGrade !== null &&
                                  grade.finalGrade >= 75
                                    ? 'secondary'
                                    : 'destructive'
                                }
                              >
                                {getGradeLabel(grade.finalGrade)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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