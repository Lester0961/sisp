'use client';

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Search, Wallet, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  financeApi,
  type FinanceStudentRow,
  type FinanceSummary,
} from '@/lib/api/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const peso = (value: number | null | undefined) =>
  `₱${Number(value ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminFinancialsPage() {
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<FinanceStudentRow[]>([]);
  const [selected, setSelected] = useState<FinanceSummary | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);

  const search = useCallback(async (searchQuery?: string) => {
    setLoadingStudents(true);
    setError(null);
    try {
      const result = await financeApi.searchStudents(searchQuery);
      setStudents(result.data ?? []);
    } catch {
      setError('Unable to load students. Please try again.');
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    void search();
  }, [search]);

  const openStudent = async (studentProfileId: string) => {
    setSelectedStudentId(studentProfileId);
    setDetailError(false);
    setLoadingDetail(true);
    try {
      setSelected(await financeApi.getStudentSummary(studentProfileId));
    } catch {
      setDetailError(true);
      setSelected(null);
      toast.error('Unable to load the student financial record.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const reloadSelected = async (studentProfileId: string) => {
    setSelected(await financeApi.getStudentSummary(studentProfileId));
    await search(query || undefined);
  };

  const handleRecord = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error('Enter a valid amount greater than zero.');
      return;
    }
    setSaving(true);
    try {
      await financeApi.recordTransaction({
        studentProfileId: selected.student.id,
        amount: parsed,
        paymentMethod: method.trim() || undefined,
        referenceNumber: reference.trim() || undefined,
      });
      toast.success('Payment recorded.');
      setAmount('');
      setMethod('');
      setReference('');
      await reloadSelected(selected.student.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to record payment.');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (id: string, decision: 'verified' | 'rejected') => {
    if (!selected) return;
    try {
      await financeApi.verifyTransaction(id, decision);
      toast.success(`Payment ${decision}.`);
      await reloadSelected(selected.student.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Unable to update the transaction.');
    }
  };

  const handleVoid = async (id: string) => {
    if (!selected) return;
    try {
      await financeApi.voidTransaction(id);
      toast.success('Payment voided.');
      await reloadSelected(selected.student.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Unable to void the transaction.');
    }
  };

  return (
    <main className="portal-main max-w-7xl">
      <div className="portal-page-header">
        <div>
          <h1 className="portal-title">Financial records</h1>
          <p className="portal-description mt-2">
            Search students, review obligations and payments, and record Treasury-verified transactions.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void search(query || undefined)} disabled={loadingStudents}>
          <RefreshCw className={loadingStudents ? 'animate-spin' : ''} strokeWidth={1.8} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        <section className="portal-surface overflow-hidden">
          <form
            className="flex items-center gap-2 border-b border-[#dce7ef] px-4 py-3"
            onSubmit={(event) => {
              event.preventDefault();
              void search(query || undefined);
            }}
          >
            <Input
              value={query}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
              placeholder="Student number, name, or email"
              aria-label="Search students"
            />
            <Button type="submit" size="sm" disabled={loadingStudents}>
              <Search className="size-4" strokeWidth={1.8} />
            </Button>
          </form>

          {loadingStudents ? (
            <div className="space-y-2 p-4">
              <div className="portal-skeleton h-12 w-full" />
              <div className="portal-skeleton h-12 w-full" />
              <div className="portal-skeleton h-12 w-full" />
            </div>
          ) : error ? (
            <p className="px-4 py-4 text-sm text-[#b42318]">{error}</p>
          ) : students.length === 0 ? (
            <p className="px-4 py-4 text-sm text-[#587387]">No students match this search.</p>
          ) : (
            <ul className="divide-y divide-[#e7eef3]">
              {students.map((student) => (
                <li key={student.id}>
                  <button
                    type="button"
                    onClick={() => void openStudent(student.id)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#f4f9fd] ${
                      selected?.student.id === student.id ? 'bg-[#f1f6fb]' : ''
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[#102f49]">
                        {student.lastName}, {student.firstName}
                      </span>
                      <span className="block truncate text-xs text-[#587387]">
                        {student.studentNumber} · {student.program?.code ?? 'No program'}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-[#102f49]">
                      {peso(student.balance)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-5">
          {loadingDetail ? (
            <div className="portal-surface space-y-3 p-5">
              <div className="portal-skeleton h-6 w-52" />
              <div className="portal-skeleton h-32 w-full" />
            </div>
          ) : detailError ? (
            <div role="alert" className="portal-surface portal-empty">
              <Wallet className="size-8 text-[#b42318]" strokeWidth={1.7} />
              <div><h2 className="font-semibold text-[#102f49]">Financial record unavailable</h2><p className="mt-1 text-sm text-[#587387]">The selected student&apos;s record could not be loaded.</p></div>
              <Button size="sm" onClick={() => selectedStudentId && void openStudent(selectedStudentId)}>Try again</Button>
            </div>
          ) : !selected ? (
            <div className="portal-surface portal-empty">
              <Wallet className="size-8 text-[#0a439b]" strokeWidth={1.7} />
              <div>
                <h2 className="font-semibold text-[#102f49]">Select a student</h2>
                <p className="mt-1 text-sm text-[#587387]">
                  Choose a student from the list to review obligations, payments, and balance.
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
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#587387]">Balance</p>
                    <p className="text-2xl font-semibold text-[#102f49]">{peso(selected.balance)}</p>
                    <p className="text-xs text-[#587387]">
                      Obligations {peso(selected.totalObligations)} · Paid {peso(selected.totalPaid)}
                    </p>
                  </div>
                </div>

                <form className="mt-5 grid gap-3 border-t border-[#e7eef3] pt-4 sm:grid-cols-4" onSubmit={handleRecord}>
                  <label className="space-y-1 text-xs font-medium text-[#365a72]">
                    <span>Amount <span aria-hidden="true" className="text-red-700">*</span></span>
                    <Input
                      value={amount}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setAmount(event.target.value)}
                      placeholder="Amount"
                      inputMode="decimal"
                      aria-label="Payment amount"
                      required
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-[#365a72]">
                    <span>Payment method</span>
                    <Input
                      value={method}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setMethod(event.target.value)}
                      placeholder="Method (GCash, PNB…)"
                      aria-label="Payment method"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-[#365a72]">
                    <span>Reference number</span>
                    <Input
                      value={reference}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setReference(event.target.value)}
                      placeholder="Reference number"
                      aria-label="Reference number"
                    />
                  </label>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Record payment'}
                  </Button>
                </form>
              </div>

              <div className="portal-surface overflow-hidden">
                <div className="border-b border-[#dce7ef] px-5 py-4">
                  <h3 className="font-semibold text-[#102f49]">Obligations</h3>
                </div>
                {selected.obligations.length ? (
                  <ul className="divide-y divide-[#e7eef3]">
                    {selected.obligations.map((obligation) => (
                      <li key={obligation.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                        <span className="font-medium text-[#102f49]">
                          {obligation.termLabel ?? obligation.semester}
                          {obligation.academicYear ? ` · ${obligation.academicYear}` : ''}
                        </span>
                        <span className="text-xs text-[#587387]">
                          Due {peso(obligation.amountDue)} · Paid {peso(obligation.amountPaid)}
                        </span>
                        <span className="ml-auto text-xs font-semibold text-[#365a72]">{obligation.paymentStatus}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-5 py-4 text-sm text-[#587387]">No obligations recorded.</p>
                )}
              </div>

              <div className="portal-surface overflow-hidden">
                <div className="border-b border-[#dce7ef] px-5 py-4">
                  <h3 className="font-semibold text-[#102f49]">Payment transactions</h3>
                </div>
                {selected.payments.length ? (
                  <ul className="divide-y divide-[#e7eef3]">
                    {selected.payments.map((payment) => (
                      <li key={payment.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-sm">
                        <span className="font-semibold text-[#102f49]">{peso(payment.amount)}</span>
                        <span className="text-xs text-[#587387]">
                          {payment.termLabel ?? 'General'}
                          {payment.paymentMethod ? ` · ${payment.paymentMethod}` : ''}
                          {payment.referenceNumber ? ` · ${payment.referenceNumber}` : ''}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            payment.status === 'verified'
                              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                              : payment.status === 'pending'
                                ? 'border border-amber-200 bg-amber-50 text-amber-700'
                                : 'border border-slate-200 bg-slate-50 text-slate-600'
                          }`}
                        >
                          {payment.status}
                        </span>
                        <span className="ml-auto flex gap-2">
                          {payment.status === 'pending' ? (
                            <>
                              <Button size="sm" onClick={() => void handleVerify(payment.id, 'verified')}>Verify</Button>
                              <Button size="sm" variant="outline" onClick={() => void handleVerify(payment.id, 'rejected')}>Reject</Button>
                            </>
                          ) : payment.status === 'verified' ? (
                            <Button size="sm" variant="outline" onClick={() => void handleVoid(payment.id)}>Void</Button>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-5 py-4 text-sm text-[#587387]">No payment transactions recorded.</p>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
