'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { requestsApi, DocumentRequestItem } from '@/lib/api/requests';
import { Button } from '@/components/ui/button';
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
  CheckCircle2,
  AlertCircle,
  Wallet,
} from 'lucide-react';

export default function AdminRequestsPage() {
  useAuth();
  const [requests, setRequests] = useState<DocumentRequestItem[]>([]);
  const [torQuotes, setTorQuotes] = useState<DocumentRequestItem[]>([]);
  const [pageCounts, setPageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [data, quotes] = await Promise.all([
        requestsApi.getPaymentQueue(),
        requestsApi.getAllRequests('awaiting_page_confirmation'),
      ]);
      const requestsArray = (data || []).map((request) => ({ ...request, typeLabel: request.items?.map((item) => item.label).join(', ') || request.type }));
      setRequests(requestsArray);
      setTorQuotes(quotes?.data || []);
    } catch (err) {
      console.error('Failed to load requests:', err);
      setLoadError('Could not load payment confirmations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleConfirmPayment = async (requestId: string) => {
    setConfirmingId(requestId);
    try {
      await requestsApi.confirmPayment(requestId);
      toast.success('Payment confirmed! Request is now pending review.');
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to confirm payment.');
    } finally {
      setConfirmingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const studentName = `${r.student?.user?.firstName || ''} ${r.student?.user?.lastName || ''}`.toLowerCase();
    const typeLabel = (r.typeLabel || '').toLowerCase();
    const ref = (r.paymentReference || '').toLowerCase();
    const proof = (r.paymentProofReference || '').toLowerCase();
    const q = search.toLowerCase();
    return studentName.includes(q) || typeLabel.includes(q) || ref.includes(q) || proof.includes(q);
  });

  const handleConfirmQuote = async (requestId: string) => {
    const pageCount = pageCounts[requestId];
    if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 19994) {
      toast.error('Enter the Records-confirmed TOR page count.');
      return;
    }
    setConfirmingId(requestId);
    try {
      await requestsApi.confirmTorQuote(requestId, pageCount);
      toast.success('TOR amount confirmed and moved to awaiting payment.');
      setTorQuotes((previous) => previous.filter((request) => request.id !== requestId));
      await loadRequests();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not confirm TOR page count.');
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <main className="portal-main max-w-7xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-slate-900">Payment Confirmations</h1>
            <p className="text-slate-500 text-sm">
              Review and confirm payments for document requests before processing.
            </p>
          </div>
          <Button
            onClick={loadRequests}
            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {torQuotes.length > 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-semibold text-amber-900">TOR page-count confirmation</h2>
            <p className="mb-4 mt-1 text-xs text-amber-800">Confirm the number of pages from the official record before the system calculates the payable amount.</p>
            <div className="space-y-3">
              {torQuotes.map((request) => (
                <div key={request.id} className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-sm font-medium text-slate-800">{request.student?.studentNumber} · {request.typeLabel}</p><p className="text-xs text-slate-500">{request.student?.user?.firstName} {request.student?.user?.lastName} · quantity {request.items?.find((item) => item.type === 'transcript_of_records')?.quantity ?? 1}</p></div>
                  <div className="flex items-center gap-2"><input aria-label={`Confirmed page count for ${request.id}`} type="number" min={1} max={19994} value={pageCounts[request.id] ?? ''} onChange={(event) => setPageCounts((current) => ({ ...current, [request.id]: Number(event.target.value) }))} className="h-9 w-28 rounded-lg border border-slate-300 px-2 text-sm" placeholder="Pages" /><Button size="sm" disabled={confirmingId === request.id} onClick={() => void handleConfirmQuote(request.id)}>Confirm quote</Button></div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5">
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search student, document type, or reference number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]/10 font-medium"
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500">Student</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500">Document</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-center">Fee</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-center">Reference</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-center">Proof of Payment</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-center">Payment</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-xs text-slate-400">
                      Loading payment confirmations...
                    </TableCell>
                  </TableRow>
                ) : loadError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center" role="alert">
                      <p className="mb-3 text-sm text-rose-700">{loadError}</p>
                      <Button size="sm" variant="outline" onClick={() => void loadRequests()} disabled={loading}>Try again</Button>
                    </TableCell>
                  </TableRow>
                ) : filteredRequests.length > 0 ? (
                  filteredRequests.map((r) => (
                    <TableRow key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-slate-800">
                            {r.student?.user?.firstName} {r.student?.user?.lastName}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold">
                            {r.student?.studentNumber}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {r.student?.program?.code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-semibold text-slate-700">{r.typeLabel}</span>
                      </TableCell>
                      <TableCell className="text-center text-xs font-semibold">
                        ₱{(r.fee ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <code className="bg-slate-100 px-2 py-1 rounded text-[10px] font-mono text-slate-700">
                          {r.paymentReference}
                        </code>
                      </TableCell>
                      <TableCell className="text-center">
                        {r.paymentProofReference ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                              {r.paymentProofChannel === 'gcash' ? 'GCash' : 'PNB'}
                            </span>
                            <code className="bg-slate-100 px-2 py-1 rounded text-[10px] font-mono text-slate-700">
                              {r.paymentProofReference}
                            </code>
                            {r.paymentProofSubmittedAt ? (
                              <span className="text-[9px] text-slate-400">
                                {new Date(r.paymentProofSubmittedAt).toLocaleString('en-PH')}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">No proof yet</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {r.paymentStatus === 'paid' ? (
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Paid
                          </span>
                        ) : (
                          <span className="rounded bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                            Unpaid
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          disabled={confirmingId === r.id}
                          onClick={() => handleConfirmPayment(r.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] shadow-sm active:scale-95 transition-all"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          {confirmingId === r.id ? 'Confirming...' : 'Confirm Payment'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <AlertCircle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      <p className="text-xs text-slate-500">No payments awaiting confirmation.</p>
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
