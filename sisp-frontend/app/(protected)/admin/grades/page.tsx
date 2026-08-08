'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { gradesApi, GradeItem } from '@/lib/api/grades';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/shared/Navbar';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  RefreshCw,
  Search,
  FileCheck,
  XCircle,
  Send,
  Clock,
  AlertCircle,
} from 'lucide-react';

export default function RegistrarGradesPage() {
  useAuth();
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [postingId, setPostingId] = useState<string | null>(null);

  const loadGrades = async () => {
    setLoading(true);
    try {
      const data = await gradesApi.getAllGrades(undefined, undefined, 'submitted');
      const gradesArray = Array.isArray(data) ? data : (data as { data?: GradeItem[] })?.data || [];
      setGrades(gradesArray);
    } catch (err) {
      console.error('Failed to load grades:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGrades();
  }, []);

  const handlePost = async (gradeId: string) => {
    if (!window.confirm('Post this grade to the dean approval queue? The faculty member will no longer be able to edit it while it is under review.')) {
      return;
    }
    setPostingId(gradeId);
    try {
      await gradesApi.postGrade(gradeId);
      toast.success('Grade posted to dean for approval!');
      setGrades((prev) => prev.filter((g) => g.id !== gradeId));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to post grade.');
    } finally {
      setPostingId(null);
    }
  };

  const filteredGrades = grades.filter((g) => {
    const studentName = `${g.enrollment?.student?.user?.firstName || ''} ${g.enrollment?.student?.user?.lastName || ''}`.toLowerCase();
    const courseCode = (g.enrollment?.course?.code || '').toLowerCase();
    const studentNumber = (g.enrollment?.student?.studentNumber || '').toLowerCase();
    const q = search.toLowerCase();
    return studentName.includes(q) || courseCode.includes(q) || studentNumber.includes(q);
  });

  return (
    <div className="portal-page">
      <Navbar />

      <main className="portal-main max-w-7xl space-y-6">
        <div className="portal-page-header flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="portal-title">Grade review</h1>
            <p className="portal-description mt-2">
              Review submitted grades from faculty and post them to the dean for approval.
            </p>
          </div>
          <Button
            onClick={loadGrades}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="portal-surface p-5">
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search student or course..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]/10 font-medium"
            />
          </div>

          <p className="mb-3 text-xs text-[#587387] sm:hidden">Scroll horizontally to review all grade details.</p>
          <div className="overflow-x-auto" role="region" aria-label="Submitted grade review table" tabIndex={0}>
            <Table className="min-w-[900px]">
              <TableHeader className="border-b border-[#e8f0f5]">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500">Student</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500">Course</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-center">Prelim</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-center">Midterm</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-center">Finals</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-center">Final Grade</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-center">Submitted By</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-xs text-slate-400">
                      Loading submitted grades...
                    </TableCell>
                  </TableRow>
                ) : filteredGrades.length > 0 ? (
                  filteredGrades.map((g) => (
                    <TableRow key={g.id} className="border-b border-[#e8f0f5] hover:bg-[#f8fbfd]">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-slate-800">
                            {g.enrollment?.student?.user?.firstName} {g.enrollment?.student?.user?.lastName}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold">
                            {g.enrollment?.student?.studentNumber}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-semibold text-slate-700">{g.enrollment?.course?.code}</span>
                        <p className="text-[9px] text-slate-400">{g.enrollment?.course?.title}</p>
                      </TableCell>
                      <TableCell className="text-center text-xs font-semibold">{g.prelim ?? 'Not recorded'}</TableCell>
                      <TableCell className="text-center text-xs font-semibold">{g.midterm ?? 'Not recorded'}</TableCell>
                      <TableCell className="text-center text-xs font-semibold">{g.finals ?? 'Not recorded'}</TableCell>
                      <TableCell className="text-center">
                        <span className={`text-sm font-black ${g.finalGrade && g.finalGrade >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {g.finalGrade ?? 'Not recorded'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-[10px] text-slate-500">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="h-3 w-3" />
                          {g.submittedBy?.firstName} {g.submittedBy?.lastName}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          disabled={postingId === g.id}
                          onClick={() => handlePost(g.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] shadow-sm active:scale-95 transition-all"
                        >
                          <FileCheck className="h-3.5 w-3.5 mr-1" />
                          {postingId === g.id ? 'Posting...' : 'Post to Dean'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <AlertCircle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      <p className="text-xs text-slate-500">No submitted grades pending review.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
}
