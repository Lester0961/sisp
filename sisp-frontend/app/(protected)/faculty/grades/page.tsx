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
  GraduationCap,
  LogOut,
  Sparkles,
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  BookOpen,
  TrendingUp,
} from 'lucide-react';
export default function FacultyGradesPage() {
  const { user } = useAuth();
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [originalGrades, setOriginalGrades] = useState<GradeItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [selectedSection, setSelectedSection] = useState('All');
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const loadGrades = async () => {
    setLoading(true);
    try {
      const data = await gradesApi.getAllGrades();
      const gradesArray = Array.isArray(data) ? data : (data as any)?.data || [];
      setGrades(gradesArray);
      // Clone grades to track original states
      setOriginalGrades(JSON.parse(JSON.stringify(gradesArray)));
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
    
    // Bounds validation
    let error = '';
    if (numericValue !== null && (isNaN(numericValue) || numericValue < 0 || numericValue > 100)) {
      error = 'Must be 0-100';
    }

    setValidationErrors((prev) => {
      const key = `${id}-${field}`;
      if (error) {
        return { ...prev, [key]: error };
      } else {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      }
    });

    setGrades((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          const updated = { ...g, [field]: value === '' ? null : numericValue };
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
    // Check if there are validation errors on this row
    const hasError = Object.keys(validationErrors).some((key) => key.startsWith(grade.id));
    if (hasError) {
      toast.error('Please correct validation errors before saving.');
      return;
    }

    setSavingId(grade.id);
    try {
      await gradesApi.updateGrade(grade.id, {
        prelim: grade.prelim ?? undefined,
        midterm: grade.midterm ?? undefined,
        finals: grade.finals ?? undefined,
      });
      toast.success('Grade updated successfully!');
      
      // Update original state for this specific grade
      setOriginalGrades((prev) =>
        prev.map((orig) => (orig.id === grade.id ? JSON.parse(JSON.stringify(grade)) : orig)),
      );
    } catch (err) {
      toast.error('Failed to update grade.');
    } finally {
      setSavingId(null);
    }
  };

  const saveAllChanges = async () => {
    // Check validation errors
    if (Object.keys(validationErrors).length > 0) {
      toast.error('Please correct all validation errors before saving.');
      return;
    }

    const dirtyList = getDirtyGrades();
    if (dirtyList.length === 0) return;

    setSavingAll(true);
    try {
      await Promise.all(
        dirtyList.map((g) =>
          gradesApi.updateGrade(g.id, {
            prelim: g.prelim ?? undefined,
            midterm: g.midterm ?? undefined,
            finals: g.finals ?? undefined,
          }),
        ),
      );
      toast.success(`Successfully saved all changes for ${dirtyList.length} students!`);
      // Update original states
      setOriginalGrades(JSON.parse(JSON.stringify(grades)));
    } catch (err) {
      toast.error('Failed to save some grades. Please try again.');
    } finally {
      setSavingAll(false);
    }
  };

  const handleToggleVisibility = async (gradeId: string, currentVal: boolean) => {
    try {
      await gradesApi.toggleVisibility(gradeId, !currentVal);
      setGrades((prev) =>
        prev.map((g) => (g.id === gradeId ? { ...g, isVisible: !currentVal } : g)),
      );
      setOriginalGrades((prev) =>
        prev.map((g) => (g.id === gradeId ? { ...g, isVisible: !currentVal } : g)),
      );
      toast.success(`Grade successfully ${!currentVal ? 'released' : 'locked'}!`);
    } catch (err) {
      toast.error('Failed to update grade release lock.');
    }
  };

  // Find unique courses and sections for filtering options
  const uniqueCourses = ['All', ...Array.from(new Set(grades.map(g => g.enrollment?.course?.code).filter(Boolean)))];
  const uniqueSections = ['All', ...Array.from(new Set(grades.map(g => g.enrollment?.section).filter(Boolean)))];

  const getDirtyGrades = () => {
    return grades.filter((g) => {
      const orig = originalGrades.find((o) => o.id === g.id);
      if (!orig) return false;
      return (
        g.prelim !== orig.prelim ||
        g.midterm !== orig.midterm ||
        g.finals !== orig.finals
      );
    });
  };

  const isRowDirty = (gradeId: string) => {
    const current = grades.find((g) => g.id === gradeId);
    const original = originalGrades.find((o) => o.id === gradeId);
    if (!current || !original) return false;
    return (
      current.prelim !== original.prelim ||
      current.midterm !== original.midterm ||
      current.finals !== original.finals
    );
  };

  const dirtyGradesCount = getDirtyGrades().length;

  const filteredGrades = grades.filter((g) => {
    const studentName = `${g.enrollment?.student?.user?.firstName || ''} ${g.enrollment?.student?.user?.lastName || ''}`.toLowerCase();
    const courseCode = (g.enrollment?.course?.code || '').toLowerCase();
    const studentNumber = (g.enrollment?.student?.studentNumber || '').toLowerCase();
    const q = search.toLowerCase();

    const matchesSearch = studentName.includes(q) || courseCode.includes(q) || studentNumber.includes(q);
    const matchesCourse = selectedCourse === 'All' || g.enrollment?.course?.code === selectedCourse;
    const matchesSection = selectedSection === 'All' || g.enrollment?.section === selectedSection;

    return matchesSearch && matchesCourse && matchesSection;
  });

  // Calculate live statistics for HCI aggregates
  const releasedCount = filteredGrades.filter((g) => g.isVisible).length;
  const gradedCount = filteredGrades.filter((g) => g.finalGrade !== null && g.finalGrade !== undefined).length;
  const averageGrade = gradedCount > 0 
    ? (filteredGrades.reduce((sum, g) => sum + (g.finalGrade ?? 0), 0) / gradedCount).toFixed(1)
    : '—';
  const passCount = filteredGrades.filter((g) => g.finalGrade !== null && g.finalGrade !== undefined && g.finalGrade >= 75).length;
  const passRate = gradedCount > 0 
    ? `${((passCount / gradedCount) * 100).toFixed(0)}%`
    : '—';

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-slate-50 text-slate-900 font-sans overflow-x-hidden select-none">
      
      {/* Background Depth Ambient Blobs */}
      <div className="absolute top-[5%] left-[10%] h-[350px] w-[350px] rounded-full bg-violet-500/5 blur-[130px] animate-pulse duration-[6s] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[15%] h-[400px] w-[400px] rounded-full bg-indigo-600/5 blur-[140px] pointer-events-none" />

      <Navbar />

      {/* Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8 z-10">
        
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Grade Evaluation Matrix
            </h1>
            <p className="text-slate-500 text-xs md:text-sm font-medium">
              Encode prelim, midterm, and final scores. Release cleared grades to make them student-visible.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {dirtyGradesCount > 0 && (
              <Button
                onClick={saveAllChanges}
                disabled={savingAll || Object.keys(validationErrors).length > 0}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-300 shadow-md animate-bounce"
              >
                <FileCheck className="h-4 w-4" />
                {savingAll ? 'Saving Changes...' : `Save All Changes (${dirtyGradesCount})`}
              </Button>
            )}
            <Button
              onClick={loadGrades}
              className="w-full sm:w-auto bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition duration-300 shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Matrix
            </Button>
          </div>
        </div>

        {/* Live Class Performance Analytics (HCI Aggregate View) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Class Average Rating</span>
              <p className="text-2xl font-black text-indigo-750">{averageGrade === '—' ? '—' : `${averageGrade}%`}</p>
            </div>
            <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-650 border border-indigo-100">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          <div className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Passing Rate</span>
              <p className="text-2xl font-black text-emerald-700">{passRate}</p>
            </div>
            <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100">
              <GraduationCap className="h-5 w-5" />
            </div>
          </div>

          <div className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Grades Released</span>
              <p className="text-2xl font-black text-blue-700">
                {releasedCount} <span className="text-slate-300 text-xs font-normal">/ {filteredGrades.length} Students</span>
              </p>
            </div>
            <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100">
              <Eye className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Searching & Dynamic Dropdown Filtering Card (HCI Chunking Principles) */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search student name, registration number, or course code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[#1e3a8a]/40 rounded-xl text-xs text-slate-800 transition focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]/10 font-medium"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            {/* Dynamic Course Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Course:</span>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="py-2.5 pl-3 pr-8 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[#1e3a8a]/40 rounded-xl text-xs text-slate-700 font-bold focus:outline-none transition cursor-pointer"
              >
                {uniqueCourses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Section Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Section:</span>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="py-2.5 pl-3 pr-8 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[#1e3a8a]/40 rounded-xl text-xs text-slate-700 font-bold focus:outline-none transition cursor-pointer"
              >
                {uniqueSections.map((s) => (
                  <option key={s} value={s}>
                    {s === 'All' ? 'All Sections' : `Section ${s}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Glassmorphic Spreadsheet Table */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-slate-100">
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
                  filteredGrades.map((g) => {
                    const isDirty = isRowDirty(g.id);
                    return (
                      <TableRow 
                        key={g.id} 
                        className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${
                          isDirty ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        
                        {/* Student Info */}
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-slate-800">
                              {g.enrollment?.student?.user?.firstName} {g.enrollment?.student?.user?.lastName}
                            </span>
                            <span className="text-[9px] text-slate-400 tracking-wider font-semibold">
                              {g.enrollment?.student?.studentNumber}
                            </span>
                          </div>
                        </TableCell>

                        {/* Course info */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-700">
                              {g.enrollment?.course?.code}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">
                              {g.enrollment?.course?.title.substring(0, 24)}...
                            </span>
                          </div>
                        </TableCell>

                        {/* Prelim Input */}
                        <TableCell className="text-center">
                          <div className="relative flex flex-col items-center">
                            <input
                              type="number"
                              placeholder="—"
                              value={g.prelim !== null && g.prelim !== undefined ? g.prelim : ''}
                              onChange={(e) => handleGradeChange(g.id, 'prelim', e.target.value)}
                              className={`w-20 mx-auto text-center py-1.5 bg-slate-50 border rounded-lg text-xs font-semibold text-slate-800 focus:outline-none transition-all duration-300 shadow-sm ${
                                validationErrors[`${g.id}-prelim`]
                                  ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-200'
                                  : 'border-slate-200 hover:border-slate-300 focus:border-[#1e3a8a]/50 focus:ring-1 focus:ring-[#1e3a8a]/10'
                              } ${isDirty ? 'bg-amber-50/50' : ''}`}
                            />
                            {validationErrors[`${g.id}-prelim`] && (
                              <span className="absolute top-8 text-[8px] font-bold text-red-500 whitespace-nowrap bg-red-50 px-1 rounded border border-red-100 flex items-center gap-0.5 z-20">
                                <AlertCircle className="h-2 w-2" />
                                {validationErrors[`${g.id}-prelim`]}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Midterm Input */}
                        <TableCell className="text-center">
                          <div className="relative flex flex-col items-center">
                            <input
                              type="number"
                              placeholder="—"
                              value={g.midterm !== null && g.midterm !== undefined ? g.midterm : ''}
                              onChange={(e) => handleGradeChange(g.id, 'midterm', e.target.value)}
                              className={`w-20 mx-auto text-center py-1.5 bg-slate-50 border rounded-lg text-xs font-semibold text-slate-800 focus:outline-none transition-all duration-300 shadow-sm ${
                                validationErrors[`${g.id}-midterm`]
                                  ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-200'
                                  : 'border-slate-200 hover:border-slate-300 focus:border-[#1e3a8a]/50 focus:ring-1 focus:ring-[#1e3a8a]/10'
                              } ${isDirty ? 'bg-amber-50/50' : ''}`}
                            />
                            {validationErrors[`${g.id}-midterm`] && (
                              <span className="absolute top-8 text-[8px] font-bold text-red-500 whitespace-nowrap bg-red-50 px-1 rounded border border-red-100 flex items-center gap-0.5 z-20">
                                <AlertCircle className="h-2 w-2" />
                                {validationErrors[`${g.id}-midterm`]}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Finals Input */}
                        <TableCell className="text-center">
                          <div className="relative flex flex-col items-center">
                            <input
                              type="number"
                              placeholder="—"
                              value={g.finals !== null && g.finals !== undefined ? g.finals : ''}
                              onChange={(e) => handleGradeChange(g.id, 'finals', e.target.value)}
                              className={`w-20 mx-auto text-center py-1.5 bg-slate-50 border rounded-lg text-xs font-semibold text-slate-800 focus:outline-none transition-all duration-300 shadow-sm ${
                                validationErrors[`${g.id}-finals`]
                                  ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-200'
                                  : 'border-slate-200 hover:border-slate-300 focus:border-[#1e3a8a]/50 focus:ring-1 focus:ring-[#1e3a8a]/10'
                              } ${isDirty ? 'bg-amber-50/50' : ''}`}
                            />
                            {validationErrors[`${g.id}-finals`] && (
                              <span className="absolute top-8 text-[8px] font-bold text-red-500 whitespace-nowrap bg-red-50 px-1 rounded border border-red-100 flex items-center gap-0.5 z-20">
                                <AlertCircle className="h-2 w-2" />
                                {validationErrors[`${g.id}-finals`]}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Calculated Final rating */}
                        <TableCell className="text-center font-black text-xs">
                          {g.finalGrade !== null && g.finalGrade !== undefined ? (
                            <div className="flex flex-col items-center gap-1.5">
                              <span className={g.finalGrade >= 75 ? 'text-emerald-600 text-sm font-black' : 'text-rose-600 text-sm font-black'}>
                                {g.finalGrade}
                              </span>
                              <span className={`text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                g.finalGrade >= 75
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}>
                                {g.finalGrade >= 75 ? 'Passed' : 'Failed'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-semibold italic">N/A</span>
                          )}
                        </TableCell>

                        {/* Visibility release switcher */}
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            onClick={() => handleToggleVisibility(g.id, g.isVisible)}
                            className={`text-[10px] font-bold py-1 px-2.5 rounded-lg border flex items-center justify-center gap-1 mx-auto ${
                              g.isVisible
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100'
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
                            disabled={savingId === g.id || !isDirty}
                            onClick={() => saveSingleGrade(g)}
                            className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-bold py-1.5 px-3.5 rounded-lg text-[10px] shadow-sm hover:shadow-indigo-500/20 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1 ml-auto disabled:opacity-40 disabled:pointer-events-none"
                          >
                            <Save className="h-3.5 w-3.5 mr-1" />
                            {savingId === g.id ? 'Saving...' : 'Save'}
                          </Button>
                        </TableCell>

                      </TableRow>
                    );
                  })
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
      <footer className="w-full text-center py-6 border-t border-slate-100 text-slate-400 text-[10px] pointer-events-none select-none">
        &copy; {new Date().getFullYear()} Regis Marie College SISP. Built with high-fidelity cryptographic models.
      </footer>

    </div>
  );
}