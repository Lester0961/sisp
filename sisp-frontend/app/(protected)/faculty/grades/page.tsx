'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { gradesApi, GradeItem } from '@/lib/api/grades';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/shared/Navbar';
import { toast } from 'sonner';
import { AmbientBackground } from '@/components/shared/AmbientBackground';
import { PageFooter } from '@/components/shared/PageFooter';
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
  Save,
  Send,
  RefreshCw,
  Search,
  TrendingUp,
  FileCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', color: 'text-slate-500 bg-slate-50 border-slate-200', icon: <Clock className="h-3 w-3" /> },
  submitted: { label: 'Submitted', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: <Send className="h-3 w-3" /> },
  posted: { label: 'Posted', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: <FileCheck className="h-3 w-3" /> },
  approved: { label: 'Approved', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: 'Rejected', color: 'text-rose-600 bg-rose-50 border-rose-200', icon: <XCircle className="h-3 w-3" /> },
};

export default function FacultyGradesPage() {
  useAuth();
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [originalGrades, setOriginalGrades] = useState<GradeItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [selectedSection, setSelectedSection] = useState('All');
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const loadGrades = async () => {
    setLoading(true);
    try {
      const data = await gradesApi.getAllGrades();
      const gradesArray = Array.isArray(data) ? data : (data as { data?: GradeItem[] })?.data || [];
      setGrades(gradesArray);
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
      setOriginalGrades((prev) =>
        prev.map((orig) => (orig.id === grade.id ? JSON.parse(JSON.stringify(grade)) : orig)),
      );
    } catch {
      toast.error('Failed to update grade.');
    } finally {
      setSavingId(null);
    }
  };

  const saveAllChanges = async () => {
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
      setOriginalGrades(JSON.parse(JSON.stringify(grades)));
    } catch {
      toast.error('Failed to save some grades. Please try again.');
    } finally {
      setSavingAll(false);
    }
  };

  const handleSubmitForReview = async (gradeId: string) => {
    setSubmittingId(gradeId);
    try {
      await gradesApi.submitGrade(gradeId);
      toast.success('Grade submitted to registrar for review!');
      setGrades((prev) =>
        prev.map((g) => (g.id === gradeId ? { ...g, status: 'submitted' } : g)),
      );
      setOriginalGrades((prev) =>
        prev.map((g) => (g.id === gradeId ? { ...g, status: 'submitted' } : g)),
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit grade.');
    } finally {
      setSubmittingId(null);
    }
  };

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

  const uniqueCourses = ['All', ...Array.from(new Set(grades.map(g => g.enrollment?.course?.code).filter(Boolean)))];
  const uniqueSections = ['All', ...Array.from(new Set(grades.map(g => g.enrollment?.section).filter(Boolean)))];

  const gradedCount = filteredGrades.filter((g) => g.finalGrade !== null && g.finalGrade !== undefined).length;
  const averageGrade = gradedCount > 0 
    ? (filteredGrades.reduce((sum, g) => sum + (g.finalGrade ?? 0), 0) / gradedCount).toFixed(1)
    : '—';
  const passCount = filteredGrades.filter((g) => g.finalGrade !== null && g.finalGrade !== undefined && g.finalGrade >= 75).length;
  const passRate = gradedCount > 0 
    ? `${((passCount / gradedCount) * 100).toFixed(0)}%`
    : '—';
  const submittedCount = filteredGrades.filter((g) => g.status === 'submitted' || g.status === 'posted' || g.status === 'approved').length;

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-slate-50 text-slate-900 font-sans overflow-x-hidden select-none">
      <AmbientBackground topColor="bg-violet-500/5" bottomColor="bg-indigo-600/5" />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8 z-10">
        
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Grade Evaluation Matrix
            </h1>
            <p className="text-slate-500 text-xs md:text-sm font-medium">
              Encode scores, then submit for registrar review → dean approval → student visibility.
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

        {/* Live Class Performance Analytics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Class Average</span>
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
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Submitted</span>
              <p className="text-2xl font-black text-blue-700">
                {submittedCount} <span className="text-slate-300 text-xs font-normal">/ {filteredGrades.length}</span>
              </p>
            </div>
            <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100">
              <Send className="h-5 w-5" />
            </div>
          </div>

          <div className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Pending Draft</span>
              <p className="text-2xl font-black text-amber-700">
                {filteredGrades.length - submittedCount}
              </p>
            </div>
            <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 border border-amber-100">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Searching & Filtering */}
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
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Course:</span>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="py-2.5 pl-3 pr-8 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[#1e3a8a]/40 rounded-xl text-xs text-slate-700 font-bold focus:outline-none transition cursor-pointer"
              >
                {uniqueCourses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Section:</span>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="py-2.5 pl-3 pr-8 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[#1e3a8a]/40 rounded-xl text-xs text-slate-700 font-bold focus:outline-none transition cursor-pointer"
              >
                {uniqueSections.map((s) => (
                  <option key={s} value={s}>{s === 'All' ? 'All Sections' : `Section ${s}`}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Grades Table */}
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
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-center w-28">Status</TableHead>
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
                    const statusConfig = STATUS_CONFIG[g.status || 'draft'];
                    const canEdit = g.status === 'draft' || g.status === 'rejected';
                    const canSubmit = g.status === 'draft' || g.status === 'rejected';

                    return (
                      <TableRow 
                        key={g.id} 
                        className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${isDirty ? 'bg-amber-50/30' : ''}`}
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
                            <span className="text-xs font-semibold text-slate-700">{g.enrollment?.course?.code}</span>
                            <span className="text-[9px] text-slate-400 font-medium">{g.enrollment?.course?.title?.substring(0, 24)}...</span>
                          </div>
                        </TableCell>

                        {/* Prelim Input */}
                        <TableCell className="text-center">
                          <div className="relative flex flex-col items-center">
                            <input
                              type="number"
                              placeholder="—"
                              disabled={!canEdit}
                              value={g.prelim !== null && g.prelim !== undefined ? g.prelim : ''}
                              onChange={(e) => handleGradeChange(g.id, 'prelim', e.target.value)}
                              className={`w-20 mx-auto text-center py-1.5 bg-slate-50 border rounded-lg text-xs font-semibold text-slate-800 focus:outline-none transition-all duration-300 shadow-sm ${
                                validationErrors[`${g.id}-prelim`]
                                  ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-200'
                                  : 'border-slate-200 hover:border-slate-300 focus:border-[#1e3a8a]/50 focus:ring-1 focus:ring-[#1e3a8a]/10'
                              } ${isDirty ? 'bg-amber-50/50' : ''} ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                              disabled={!canEdit}
                              value={g.midterm !== null && g.midterm !== undefined ? g.midterm : ''}
                              onChange={(e) => handleGradeChange(g.id, 'midterm', e.target.value)}
                              className={`w-20 mx-auto text-center py-1.5 bg-slate-50 border rounded-lg text-xs font-semibold text-slate-800 focus:outline-none transition-all duration-300 shadow-sm ${
                                validationErrors[`${g.id}-midterm`]
                                  ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-200'
                                  : 'border-slate-200 hover:border-slate-300 focus:border-[#1e3a8a]/50 focus:ring-1 focus:ring-[#1e3a8a]/10'
                              } ${isDirty ? 'bg-amber-50/50' : ''} ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                              disabled={!canEdit}
                              value={g.finals !== null && g.finals !== undefined ? g.finals : ''}
                              onChange={(e) => handleGradeChange(g.id, 'finals', e.target.value)}
                              className={`w-20 mx-auto text-center py-1.5 bg-slate-50 border rounded-lg text-xs font-semibold text-slate-800 focus:outline-none transition-all duration-300 shadow-sm ${
                                validationErrors[`${g.id}-finals`]
                                  ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-200'
                                  : 'border-slate-200 hover:border-slate-300 focus:border-[#1e3a8a]/50 focus:ring-1 focus:ring-[#1e3a8a]/10'
                              } ${isDirty ? 'bg-amber-50/50' : ''} ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
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

                        {/* Status Badge */}
                        <TableCell className="text-center">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold ${statusConfig?.color || 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                            {statusConfig?.icon}
                            {statusConfig?.label || g.status}
                          </div>
                          {g.rejectedRemarks && (
                            <p className="text-[8px] text-rose-500 mt-1 max-w-[120px] truncate" title={g.rejectedRemarks}>
                              {g.rejectedRemarks}
                            </p>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex flex-col gap-1 items-end">
                            <Button
                              disabled={savingId === g.id || !isDirty || !canEdit}
                              onClick={() => saveSingleGrade(g)}
                              className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-bold py-1.5 px-3.5 rounded-lg text-[10px] shadow-sm hover:shadow-indigo-500/20 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1 disabled:opacity-40 disabled:pointer-events-none"
                            >
                              <Save className="h-3.5 w-3.5 mr-1" />
                              {savingId === g.id ? 'Saving...' : 'Save'}
                            </Button>
                            {canSubmit && (
                              <Button
                                disabled={submittingId === g.id || isDirty}
                                onClick={() => handleSubmitForReview(g.id)}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-3.5 rounded-lg text-[10px] shadow-sm active:scale-95 transition-all duration-200 flex items-center justify-center gap-1 disabled:opacity-40 disabled:pointer-events-none"
                              >
                                <Send className="h-3.5 w-3.5 mr-1" />
                                {submittingId === g.id ? 'Submitting...' : 'Submit'}
                              </Button>
                            )}
                          </div>
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

      <PageFooter type="cryptographic" />
    </div>
  );
}
