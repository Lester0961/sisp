'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { gradesApi, GradeItem } from '@/lib/api/grades';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  GraduationCap,
  LogOut,
  Sparkles,
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  BookOpen,
} from 'lucide-react';

export default function FacultyGradesPage() {
  const { user, logout } = useAuth();
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadGrades = async () => {
    setLoading(true);
    try {
      const data = await gradesApi.getAllGrades();
      const gradesArray = Array.isArray(data) ? data : (data as any)?.data || [];
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

  const handleGradeChange = (
    id: string,
    field: 'prelim' | 'midterm' | 'finals',
    value: string,
  ) => {
    const numericValue = value === '' ? null : parseFloat(value);
    if (numericValue !== null && (isNaN(numericValue) || numericValue < 0 || numericValue > 100)) {
      return; // Validation bounds
    }

    setGrades((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          const updated = { ...g, [field]: numericValue };
          // Dynamically compute final grade if all inputs exist
          const p = updated.prelim ?? 0;
          const m = updated.midterm ?? 0;
          const f = updated.finals ?? 0;
          if (updated.prelim !== null && updated.midterm !== null && updated.finals !== null) {
            updated.finalGrade = parseFloat(((p * 0.3) + (m * 0.3) + (f * 0.4)).toFixed(2));
          } else {
            updated.finalGrade = null;
          }
          return updated;
        }
        return g;
      }),
    );
  };

  const saveSingleGrade = async (grade: GradeItem) => {
    setSavingId(grade.id);
    try {
      await gradesApi.updateGrade(grade.id, {
        prelim: grade.prelim ?? undefined,
        midterm: grade.midterm ?? undefined,
        finals: grade.finals ?? undefined,
      });
      alert('Grade updated successfully!');
      loadGrades();
    } catch (err) {
      alert('Failed to update grade.');
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleVisibility = async (gradeId: string, currentVal: boolean) => {
    try {
      await gradesApi.toggleVisibility(gradeId, !currentVal);
      setGrades((prev) =>
        prev.map((g) => (g.id === gradeId ? { ...g, isVisible: !currentVal } : g)),
      );
    } catch (err) {
      alert('Failed to update grade release lock.');
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
    <div className="relative min-h-screen w-full flex flex-col bg-[#07060E] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#130E2B] via-[#06050A] to-[#020204] text-slate-100 font-sans overflow-x-hidden select-none">
      
      {/* Background Depth Ambient Blobs */}
      <div className="absolute top-[5%] left-[10%] h-[350px] w-[350px] rounded-full bg-violet-500/10 blur-[130px] animate-pulse duration-[6s] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[15%] h-[400px] w-[400px] rounded-full bg-indigo-600/10 blur-[140px] pointer-events-none" />

      {/* Sticky Header Panel */}
      <header className="sticky top-0 w-full z-30 bg-[#07060E]/50 backdrop-blur-xl border-b border-white/[0.05] shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-violet-600/15 border border-violet-500/20 flex items-center justify-center shadow-inner">
              <BookOpen className="h-5 w-5 text-violet-400" />
            </div>
            <span className="font-bold tracking-wide text-sm bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
              REGIS MARIE SISP — FACULTY
            </span>
          </div>
          <div className="flex items-center space-x-5">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs text-slate-300 font-semibold">{user?.email}</span>
              <span className="text-[9px] uppercase tracking-widest text-violet-400 font-bold">Academic Instructor</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-xs hover:bg-white/5 border border-white/[0.06] hover:border-white/10 rounded-lg text-rose-300 hover:text-rose-200 transition-all duration-300 flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8 z-10">
        
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Grade Evaluation Matrix
            </h1>
            <p className="text-slate-400 text-xs md:text-sm font-medium">
              Encode prelim, midterm, and final scores. Release cleared grades to make them student-visible.
            </p>
          </div>
          <Button
            onClick={loadGrades}
            className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/[0.07] text-slate-200 hover:text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition duration-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Matrix
          </Button>
        </div>

        {/* Searching Filtering Card */}
        <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-2xl rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-center gap-4">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by student name, number, or course code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#0B0A12] border border-white/[0.08] hover:border-white/15 focus:border-indigo-500/40 rounded-xl text-xs text-slate-200 transition focus:outline-none"
            />
          </div>
        </div>

        {/* Glassmorphic Spreadsheet Table */}
        <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-2xl rounded-2xl p-5 shadow-xl space-y-4">
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-white/[0.04]">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500">Student Info</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500">Course Info</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-center w-24">Prelims (30%)</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-center w-24">Midterms (30%)</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-center w-24">Finals (40%)</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-center w-24">Final Rating</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-center w-24">Release Status</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={8} className="text-center py-10 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      Fetching Student Evaluations...
                    </TableCell>
                  </TableRow>
                ) : filteredGrades.length > 0 ? (
                  filteredGrades.map((g) => (
                    <TableRow key={g.id} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                      
                      {/* Student Info */}
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-slate-200">
                            {g.enrollment?.student?.user?.firstName} {g.enrollment?.student?.user?.lastName}
                          </span>
                          <span className="text-[9px] text-slate-500 tracking-wider font-semibold">
                            {g.enrollment?.student?.studentNumber}
                          </span>
                        </div>
                      </TableCell>

                      {/* Course info */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-300">
                            {g.enrollment?.course?.code}
                          </span>
                          <span className="text-[9px] text-slate-500 font-medium">
                            {g.enrollment?.course?.title.substring(0, 24)}...
                          </span>
                        </div>
                      </TableCell>

                      {/* Prelim Input */}
                      <TableCell className="text-center">
                        <input
                          type="number"
                          placeholder="0-100"
                          value={g.prelim !== null && g.prelim !== undefined ? g.prelim : ''}
                          onChange={(e) => handleGradeChange(g.id, 'prelim', e.target.value)}
                          className="w-16 mx-auto text-center py-1.5 bg-[#0B0A12] border border-white/[0.06] hover:border-white/10 focus:border-indigo-500/30 rounded-md text-xs text-slate-200 focus:outline-none"
                        />
                      </TableCell>

                      {/* Midterm Input */}
                      <TableCell className="text-center">
                        <input
                          type="number"
                          placeholder="0-100"
                          value={g.midterm !== null && g.midterm !== undefined ? g.midterm : ''}
                          onChange={(e) => handleGradeChange(g.id, 'midterm', e.target.value)}
                          className="w-16 mx-auto text-center py-1.5 bg-[#0B0A12] border border-white/[0.06] hover:border-white/10 focus:border-indigo-500/30 rounded-md text-xs text-slate-200 focus:outline-none"
                        />
                      </TableCell>

                      {/* Finals Input */}
                      <TableCell className="text-center">
                        <input
                          type="number"
                          placeholder="0-100"
                          value={g.finals !== null && g.finals !== undefined ? g.finals : ''}
                          onChange={(e) => handleGradeChange(g.id, 'finals', e.target.value)}
                          className="w-16 mx-auto text-center py-1.5 bg-[#0B0A12] border border-white/[0.06] hover:border-white/10 focus:border-indigo-500/30 rounded-md text-xs text-slate-200 focus:outline-none"
                        />
                      </TableCell>

                      {/* Calculated Final rating */}
                      <TableCell className="text-center font-black text-xs text-indigo-300">
                        {g.finalGrade !== null && g.finalGrade !== undefined ? g.finalGrade : 'N/A'}
                      </TableCell>

                      {/* Visibility release switcher */}
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          onClick={() => handleToggleVisibility(g.id, g.isVisible)}
                          className={`text-[10px] font-bold py-1 px-2.5 rounded-lg border flex items-center justify-center gap-1 mx-auto ${
                            g.isVisible
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          }`}
                        >
                          {g.isVisible ? (
                            <>
                              <Eye className="h-3.5 w-3.5" />
                              Released
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3.5 w-3.5" />
                              Locked
                            </>
                          )}
                        </Button>
                      </TableCell>

                      {/* Action save single */}
                      <TableCell className="text-right">
                        <Button
                          disabled={savingId === g.id}
                          onClick={() => saveSingleGrade(g)}
                          className="bg-indigo-600/15 border border-indigo-500/20 hover:bg-indigo-600/25 text-indigo-300 text-[10px] font-bold py-1.5 px-3 rounded-lg transition"
                        >
                          <Save className="h-3.5 w-3.5 mr-1 inline" />
                          {savingId === g.id ? 'Saving...' : 'Save'}
                        </Button>
                      </TableCell>

                    </TableRow>
                  ))
                ) : (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={8} className="text-center py-8 text-xs text-slate-500">
                      No matching student evaluations found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 border-t border-white/[0.03] text-slate-600 text-[10px] pointer-events-none select-none">
        &copy; {new Date().getFullYear()} Regis Marie College SISP. Built with high-fidelity cryptographic models.
      </footer>

    </div>
  );
}