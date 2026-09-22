'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { RefreshCw, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { advisersApi, AdviserAssignmentRow, AdviserCandidate } from '@/lib/api/advisers';
import { studentsApi } from '@/lib/api/students';

interface StudentOption {
  id: string;
  studentNumber: string;
  user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
  program?: { code?: string | null } | null;
}

/**
 * Registrar-owned adviser assignment workspace (NEXT 5).
 * Dean/advisee scoping existed everywhere but there was no writer for
 * AdviserAssignment, so Deans had empty advisee lists. Registrars assign and
 * deactivate advisers here; Deans then see advisees on their own pages.
 */
export default function AdminAdvisersPage() {
  const [advisers, setAdvisers] = useState<AdviserCandidate[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [assignments, setAssignments] = useState<AdviserAssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [adviserId, setAdviserId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [academicYear, setAcademicYear] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [advisersResponse, studentsResponse, assignmentsResponse] = await Promise.all([
        advisersApi.listAdvisers(),
        studentsApi.listAll(),
        advisersApi.listAssignments(),
      ]);
      setAdvisers(advisersResponse.data ?? []);
      setStudents(studentsResponse.data ?? studentsResponse ?? []);
      setAssignments(assignmentsResponse.data ?? []);
    } catch {
      toast.error('Could not load adviser assignments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredStudents = useMemo(() => {
    const query = studentFilter.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) => {
      const name = `${student.user?.firstName ?? ''} ${student.user?.lastName ?? ''}`.toLowerCase();
      return (
        name.includes(query) ||
        (student.studentNumber ?? '').toLowerCase().includes(query) ||
        (student.program?.code ?? '').toLowerCase().includes(query)
      );
    });
  }, [students, studentFilter]);

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return assignments;
    return assignments.filter((assignment) => {
      const name =
        `${assignment.student.user.firstName} ${assignment.student.user.lastName}`.toLowerCase();
      const adviser = `${assignment.adviser.firstName} ${assignment.adviser.lastName}`.toLowerCase();
      return (
        name.includes(query) ||
        adviser.includes(query) ||
        assignment.student.studentNumber.toLowerCase().includes(query)
      );
    });
  }, [assignments, search]);

  const assign = async () => {
    if (!adviserId || !studentId) {
      toast.error('Select both a student and a Dean adviser.');
      return;
    }
    setBusy(true);
    try {
      await advisersApi.assign({
        adviserId,
        studentId,
        ...(academicYear.trim() ? { academicYear: academicYear.trim() } : {}),
      });
      toast.success('Adviser assigned.');
      setStudentId('');
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Could not assign the adviser.');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (id: string, status: 'active' | 'inactive') => {
    setBusy(true);
    try {
      await advisersApi.setStatus(id, status);
      toast.success(status === 'active' ? 'Assignment reactivated.' : 'Assignment deactivated.');
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Could not update the assignment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-[#0f2e3d]">
            <UserCog className="h-5 w-5" aria-hidden /> Adviser Assignments
          </h1>
          <p className="text-sm text-[#587387]">
            Assign Deans as advisers per student. Deans only see students assigned to them.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assign an adviser</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="student-filter">Find student</Label>
            <Input
              id="student-filter"
              placeholder="Search by name, student number, or program"
              value={studentFilter}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setStudentFilter(event.target.value)
              }
            />
            <select
              aria-label="Student"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
            >
              <option value="">Select a student</option>
              {filteredStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.user?.lastName ?? ''}, {student.user?.firstName ?? ''} —{' '}
                  {student.studentNumber}
                  {student.program?.code ? ` (${student.program.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adviser">Dean adviser</Label>
            <select
              id="adviser"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={adviserId}
              onChange={(event) => setAdviserId(event.target.value)}
            >
              <option value="">Select a Dean</option>
              {advisers.map((adviser) => (
                <option key={adviser.id} value={adviser.id}>
                  {adviser.lastName}, {adviser.firstName}
                  {typeof adviser._count?.adviserAssignments === 'number'
                    ? ` (${adviser._count.adviserAssignments} advisees)`
                    : ''}
                </option>
              ))}
            </select>
            <div className="space-y-2">
              <Label htmlFor="academic-year">Academic year (optional)</Label>
              <Input
                id="academic-year"
                placeholder="e.g. 2026-2027"
                value={academicYear}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setAcademicYear(event.target.value)
                }
              />
            </div>
            <Button className="w-full" onClick={() => void assign()} disabled={busy}>
              Assign adviser
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Assignments</CardTitle>
          <Input
            className="sm:max-w-xs"
            placeholder="Filter assignments"
            value={search}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-6 text-center text-sm text-[#587387]">Loading assignments…</p>
          ) : filteredAssignments.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#587387]">
              No adviser assignments yet. Assign a Dean above to populate Dean dashboards.
            </p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {filteredAssignments.map((assignment) => (
                <article
                  key={assignment.id}
                  className="space-y-3 rounded-xl border border-[#e8f0f5] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#102f49]">
                        {assignment.student.user.lastName}, {assignment.student.user.firstName}
                      </p>
                      <p className="text-xs text-[#587387]">
                        {assignment.student.studentNumber}
                        {assignment.student.program?.code
                          ? ` · ${assignment.student.program.code}`
                          : ''}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        assignment.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {assignment.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#587387]">
                    Adviser: {assignment.adviser.firstName} {assignment.adviser.lastName}
                    {assignment.academicTerm?.label
                      ? ` · ${assignment.academicTerm.label}`
                      : ''}
                    {assignment.academicYear ? ` · ${assignment.academicYear}` : ''}
                  </p>
                  {assignment.status === 'active' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={busy}
                      onClick={() => void setStatus(assignment.id, 'inactive')}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={busy}
                      onClick={() => void setStatus(assignment.id, 'active')}
                    >
                      Reactivate
                    </Button>
                  )}
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-[#587387]">
                    <th className="px-3 py-2">Student</th>
                    <th className="px-3 py-2">Adviser</th>
                    <th className="px-3 py-2">Term / Year</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.map((assignment) => (
                    <tr key={assignment.id} className="border-b last:border-0">
                      <td className="px-3 py-3">
                        <div className="font-medium text-[#0f2e3d]">
                          {assignment.student.user.lastName}, {assignment.student.user.firstName}
                        </div>
                        <div className="text-xs text-[#587387]">
                          {assignment.student.studentNumber}
                          {assignment.student.program?.code
                            ? ` · ${assignment.student.program.code}`
                            : ''}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {assignment.adviser.firstName} {assignment.adviser.lastName}
                      </td>
                      <td className="px-3 py-3 text-[#587387]">
                        {assignment.academicTerm?.label ?? '—'}
                        {assignment.academicYear ? ` · ${assignment.academicYear}` : ''}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            assignment.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {assignment.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {assignment.status === 'active' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => void setStatus(assignment.id, 'inactive')}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => void setStatus(assignment.id, 'active')}
                          >
                            Reactivate
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
