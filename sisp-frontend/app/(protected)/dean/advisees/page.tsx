'use client';

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Plus,
  RefreshCw,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  deanApi,
  type Advisee,
  type AdviseeDetail,
  type AdvisingConcern,
} from '@/lib/api/dean';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function DeanAdviseesPage() {
  const [advisees, setAdvisees] = useState<Advisee[]>([]);
  const [selected, setSelected] = useState<AdviseeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState('');
  const [summary, setSummary] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAdvisees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await deanApi.getAdvisees();
      setAdvisees(data.data ?? []);
    } catch {
      setError('We could not load your advisees. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAdvisees();
  }, [loadAdvisees]);

  const openAdvisee = async (studentProfileId: string) => {
    setSelectedStudentId(studentProfileId);
    setDetailError(false);
    setSelected(null);
    setLoadingDetail(true);
    try {
      setSelected(await deanApi.getAdviseeDetail(studentProfileId));
    } catch {
      setDetailError(true);
      toast.error('Unable to load the advisee record.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateConcern = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    if (!category.trim() || !summary.trim()) {
      toast.error('Category and summary are required.');
      return;
    }
    setSaving(true);
    try {
      await deanApi.createConcern({
        studentProfileId: selected.student.id,
        category: category.trim(),
        summary: summary.trim(),
      });
      toast.success('Advising concern recorded.');
      setCategory('');
      setSummary('');
      setSelected(await deanApi.getAdviseeDetail(selected.student.id));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Unable to record the concern.');
    } finally {
      setSaving(false);
    }
  };

  const handleConcernStatus = async (concern: AdvisingConcern, next: string) => {
    try {
      await deanApi.updateConcern(concern.id, { status: next });
      toast.success(`Concern marked ${next}.`);
      if (selected) setSelected(await deanApi.getAdviseeDetail(selected.student.id));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Unable to update the concern.');
    }
  };

  const statusLabel = (status: string) =>
    status === 'open' ? 'Open' : status === 'in_review' ? 'In review' : 'Resolved';

  const statusClass = (status: string) =>
    status === 'open'
      ? 'border border-amber-200 bg-amber-50 text-amber-700'
      : status === 'in_review'
        ? 'border border-blue-200 bg-blue-50 text-blue-700'
        : 'border border-emerald-200 bg-emerald-50 text-emerald-700';

  return (
    <div className="portal-page">
      <main className="portal-main max-w-6xl pb-8">
        <div className="portal-page-header">
          <div>
            <h1 className="portal-title">My advisees</h1>
            <p className="portal-description mt-2">
              Review assigned students, their academic progress, and advising concerns.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadAdvisees()} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin' : ''} strokeWidth={1.8} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="portal-surface space-y-4 p-5">
            <div className="portal-skeleton h-16 w-full" />
            <div className="portal-skeleton h-16 w-full" />
            <div className="portal-skeleton h-16 w-full" />
          </div>
        ) : error ? (
          <section className="portal-surface portal-empty">
            <AlertCircle className="size-8 text-[#b42318]" strokeWidth={1.8} />
            <div>
              <h2 className="font-semibold text-[#102f49]">Advisees unavailable</h2>
              <p className="mt-1 text-sm text-[#587387]">{error}</p>
            </div>
            <Button size="sm" onClick={() => void loadAdvisees()}>Try again</Button>
          </section>
        ) : advisees.length === 0 ? (
          <section className="portal-surface portal-empty">
            <Users className="size-8 text-[#0a439b]" strokeWidth={1.7} />
            <div>
              <h2 className="font-semibold text-[#102f49]">No assigned advisees</h2>
              <p className="mt-1 text-sm text-[#587387]">
                Students assigned to you by the Registrar will appear here.
              </p>
            </div>
          </section>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[24rem_1fr]">
            <section className="portal-surface overflow-hidden">
              <div className="border-b border-[#dce7ef] px-5 py-4">
                <h2 className="font-semibold text-[#102f49]">Assigned advisees</h2>
                <p className="mt-1 text-sm text-[#587387]">Select a student to review progress and concerns.</p>
              </div>
              <ul className="divide-y divide-[#e7eef3]">
                {advisees.map((advisee) => (
                  <li key={advisee.assignmentId}>
                    <button
                      type="button"
                      onClick={() => void openAdvisee(advisee.student.id)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#f4f9fd] ${
                        selected?.student.id === advisee.student.id ? 'bg-[#f1f6fb]' : ''
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-[#102f49]">
                          {advisee.student.lastName}, {advisee.student.firstName}
                        </span>
                        <span className="block truncate text-xs text-[#587387]">
                          {advisee.student.studentNumber} · {advisee.student.program?.code ?? 'No program'}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-[#eaf3fa] px-2 py-0.5 text-xs font-semibold text-[#0a439b]">
                        {advisee.completionPercentage}%
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-[#9ab0bf]" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-5">
              {loadingDetail ? (
                <div className="portal-surface space-y-3 p-5">
                  <div className="portal-skeleton h-6 w-52" />
                  <div className="portal-skeleton h-32 w-full" />
                </div>
              ) : detailError ? (
                <div role="alert" className="portal-surface portal-empty">
                  <AlertCircle className="size-8 text-[#b42318]" strokeWidth={1.8} />
                  <div><h2 className="font-semibold text-[#102f49]">Advisee record unavailable</h2><p className="mt-1 text-sm text-[#587387]">The selected student&apos;s record could not be loaded.</p></div>
                  <Button size="sm" onClick={() => selectedStudentId && void openAdvisee(selectedStudentId)}>Try again</Button>
                </div>
              ) : !selected ? (
                <div className="portal-surface portal-empty">
                  <ClipboardList className="size-8 text-[#0a439b]" strokeWidth={1.7} />
                  <div>
                    <h2 className="font-semibold text-[#102f49]">Select an advisee</h2>
                    <p className="mt-1 text-sm text-[#587387]">
                      Choose a student to see real progress, factual standing, and advising concerns.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="portal-surface p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-[#102f49]">
                          {selected.student.lastName}, {selected.student.firstName}
                        </h2>
                        <p className="mt-1 text-xs text-[#587387]">
                          {selected.student.studentNumber} · {selected.student.program?.code ?? 'No program'}
                        </p>
                      </div>
                      <p className="text-sm text-[#587387]">
                        Progress <span className="font-semibold text-[#0a439b]">{selected.standing.completionPercentage}%</span>
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl border border-[#dce7ef] bg-[#f8fbfe] p-3 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#587387]">Completed</p>
                        <p className="mt-1 text-xl font-semibold text-[#102f49]">{selected.standing.completedSubjects}</p>
                      </div>
                      <div className="rounded-xl border border-[#dce7ef] bg-[#f8fbfe] p-3 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#587387]">Ongoing</p>
                        <p className="mt-1 text-xl font-semibold text-[#102f49]">{selected.standing.ongoingSubjects}</p>
                      </div>
                      <div className="rounded-xl border border-[#dce7ef] bg-[#f8fbfe] p-3 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#587387]">Failed</p>
                        <p className="mt-1 text-xl font-semibold text-[#f59e0b]">{selected.standing.failedSubjects}</p>
                      </div>
                      <div className="rounded-xl border border-[#dce7ef] bg-[#f8fbfe] p-3 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#587387]">Dropped</p>
                        <p className="mt-1 text-xl font-semibold text-[#102f49]">{selected.standing.droppedSubjects}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-[#587387]">
                      Factual indicators from recorded enrollment and grade data. Standing labels are not assigned automatically.
                    </p>

                    {selected.standing.recentResults.length > 0 ? (
                      <ul className="mt-4 space-y-1">
                        {selected.standing.recentResults.map((result, index) => (
                          <li key={index} className="flex items-center gap-3 text-xs text-[#365a72]">
                            <span className="font-semibold">{result.courseCode}</span>
                            <span className="text-[#587387]">{result.term}</span>
                            <span className="ml-auto font-semibold">
                              {result.finalGrade != null ? result.finalGrade.toFixed(2) : 'Not posted'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  <div className="portal-surface overflow-hidden">
                    <div className="border-b border-[#dce7ef] px-5 py-4">
                      <h3 className="font-semibold text-[#102f49]">Advising concerns</h3>
                    </div>
                    {selected.concerns.length ? (
                      <ul className="divide-y divide-[#e7eef3]">
                        {selected.concerns.map((concern) => (
                          <li key={concern.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm">
                            <span className="font-medium text-[#102f49]">{concern.category}</span>
                            <span className="text-xs text-[#587387]">{concern.summary}</span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(concern.status)}`}>
                              {statusLabel(concern.status)}
                            </span>
                            <span className="ml-auto flex gap-2">
                              {concern.status !== 'resolved' ? (
                                <Button size="sm" onClick={() => void handleConcernStatus(concern, 'resolved')}>
                                  Resolve
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => void handleConcernStatus(concern, 'open')}>
                                  Reopen
                                </Button>
                              )}
                              {concern.status === 'open' ? (
                                <Button size="sm" variant="outline" onClick={() => void handleConcernStatus(concern, 'in_review')}>
                                  In review
                                </Button>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="px-5 py-4 text-sm text-[#587387]">No advising concerns recorded for this student.</p>
                    )}

                    <form className="flex flex-col gap-2 border-t border-[#e7eef3] px-5 py-4 sm:flex-row" onSubmit={handleCreateConcern}>
                      <Input
                        value={category}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => setCategory(event.target.value)}
                        placeholder="Category (e.g. Attendance, Academic)"
                        aria-label="Concern category"
                        required
                        className="sm:w-52"
                      />
                      <Input
                        value={summary}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => setSummary(event.target.value)}
                        placeholder="Summary of the concern"
                        aria-label="Concern summary"
                        required
                        className="flex-1"
                      />
                      <Button type="submit" disabled={saving}>
                        <Plus className="size-4" strokeWidth={1.8} />
                        {saving ? 'Saving…' : 'Record'}
                      </Button>
                    </form>
                  </div>

                  {selected.standing.failedSubjects > 0 ? (
                    <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                      This student has failed subjects on record. Consider scheduling a follow-up advising session.
                    </p>
                  ) : (
                    <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                      <CheckCircle2 className="size-4 shrink-0" />
                      No failed subjects on record.
                    </p>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
