'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Wallet } from 'lucide-react';
import { financeApi, type FinanceSummary } from '@/lib/api/finance';
import { Navbar } from '@/components/shared/Navbar';
import { Button } from '@/components/ui/button';

const peso = (value: number | null | undefined) =>
  `₱${Number(value ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function FinancialsPage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await financeApi.getMySummary());
    } catch {
      setError('We could not load your financial record. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const hasRecord =
    summary &&
    (summary.obligations.length > 0 || summary.payments.length > 0 || summary.balance > 0);

  return (
    <div className="portal-page">
      <Navbar />
      <main className="portal-main max-w-6xl pb-8">
        <div className="portal-page-header">
          <div>
            <h1 className="portal-title">Financial information</h1>
            <p className="portal-description mt-2">
              Your balance, obligations, and verified payments as maintained by the Treasury Office.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadSummary()} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin' : ''} strokeWidth={1.8} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="portal-surface space-y-4 p-5">
            <div className="portal-skeleton h-24 w-full" />
            <div className="portal-skeleton h-40 w-full" />
          </div>
        ) : error ? (
          <section className="portal-surface portal-empty">
            <AlertCircle className="size-8 text-[#b42318]" strokeWidth={1.8} />
            <div>
              <h2 className="font-semibold text-[#102f49]">Financial record unavailable</h2>
              <p className="mt-1 text-sm text-[#587387]">{error}</p>
            </div>
            <Button size="sm" onClick={() => void loadSummary()}>Try again</Button>
          </section>
        ) : !hasRecord ? (
          <section className="portal-surface portal-empty">
            <Wallet className="size-8 text-[#0a439b]" strokeWidth={1.7} />
            <div>
              <h2 className="font-semibold text-[#102f49]">No financial records yet</h2>
              <p className="mt-1 text-sm text-[#587387]">
                Obligations and verified payments recorded by the Treasury Office will appear here.
              </p>
            </div>
          </section>
        ) : summary ? (
          <div className="space-y-5">
            <section className="portal-surface grid grid-cols-1 divide-[#dce7ef] sm:grid-cols-3 sm:divide-x" aria-label="Financial summary">
              <div className="p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#587387]">Outstanding balance</p>
                <p className="mt-2 text-2xl font-semibold text-[#102f49]">{peso(summary.balance)}</p>
                <p className="mt-1 text-xs text-[#587387]">
                  {summary.balance > 0 ? 'Settle with the Treasury Office.' : 'No outstanding balance.'}
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#587387]">Total paid (verified)</p>
                <p className="mt-2 text-2xl font-semibold text-[#102f49]">{peso(summary.totalPaid)}</p>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#587387]">Total obligations</p>
                <p className="mt-2 text-2xl font-semibold text-[#102f49]">{peso(summary.totalObligations)}</p>
              </div>
            </section>

            <section className="portal-surface overflow-hidden">
              <div className="border-b border-[#dce7ef] px-5 py-4">
                <h2 className="font-semibold text-[#102f49]">Upcoming obligations</h2>
                <p className="mt-1 text-sm text-[#587387]">Terms that are not yet fully settled.</p>
              </div>
              {summary.upcomingObligations.length ? (
                <ul className="divide-y divide-[#e7eef3]">
                  {summary.upcomingObligations.map((obligation) => {
                    const remaining = Math.max(0, obligation.amountDue - obligation.amountPaid);
                    return (
                      <li key={obligation.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                        <span className="font-medium text-[#102f49]">
                          {obligation.termLabel ?? obligation.semester}
                          {obligation.academicYear ? ` · ${obligation.academicYear}` : ''}
                        </span>
                        <span className="text-xs text-[#587387]">
                          Due {peso(obligation.amountDue)} · Paid {peso(obligation.amountPaid)}
                        </span>
                        <span className="ml-auto rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                          Remaining {peso(remaining)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-5 py-4 text-sm text-[#587387]">No outstanding obligations.</p>
              )}
            </section>

            <section className="portal-surface overflow-hidden">
              <div className="border-b border-[#dce7ef] px-5 py-4">
                <h2 className="font-semibold text-[#102f49]">Payment history</h2>
                <p className="mt-1 text-sm text-[#587387]">Verified and pending payments recorded by the Treasury Office.</p>
              </div>
              {summary.payments.length ? (
                <ul className="divide-y divide-[#e7eef3]">
                  {summary.payments.map((payment) => (
                    <li key={payment.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                      <span className="font-semibold text-[#102f49]">{peso(payment.amount)}</span>
                      <span className="text-xs text-[#587387]">
                        {payment.termLabel ?? payment.academicYear ?? 'General'}
                        {payment.paymentMethod ? ` · ${payment.paymentMethod}` : ''}
                      </span>
                      <span className="text-xs text-[#6c879a]">
                        {new Date(payment.paidAt ?? payment.createdAt).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span
                        className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          payment.status === 'verified'
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                            : payment.status === 'pending'
                              ? 'border border-amber-200 bg-amber-50 text-amber-700'
                              : 'border border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-4 text-sm text-[#587387]">No payments recorded yet.</p>
              )}
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
