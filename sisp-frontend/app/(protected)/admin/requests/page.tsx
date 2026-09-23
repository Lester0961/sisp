'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RefreshCw, Search, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { requestsApi, DocumentRequestItem } from '@/lib/api/requests';

/**
 * Treasury payment approvals (Phase 1).
 * Uses only the treasury-scoped endpoints: /requests/payment-queue and
 * /requests/:id/confirm-payment. TOR page-count confirmation belongs to the
 * Registrar's Document Requests workspace.
 */
export default function AdminPaymentApprovalsPage() {
  const [queue, setQueue] = useState<DocumentRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await requestsApi.getPaymentQueue();
      setQueue(data ?? []);
    } catch {
      setLoadError('Could not load payment confirmations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const confirmPayment = async (requestId: string) => {
    const request = queue.find((item) => item.id === requestId);
    if (!request?.paymentProofChannel || !request.paymentProofReference?.trim()) {
      toast.error('Wait for the student to submit payment proof before confirming.');
      return;
    }
    setConfirmingId(requestId);
    try {
      await requestsApi.confirmPayment(requestId);
      toast.success('Payment confirmed. The request moved to processing.');
      setQueue((previous) => previous.filter((request) => request.id !== requestId));
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to confirm payment.');
    } finally {
      setConfirmingId(null);
    }
  };

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return queue.filter((request) => {
      const studentName = `${request.student?.user?.firstName ?? ''} ${request.student?.user?.lastName ?? ''}`.toLowerCase();
      const reference = (request.paymentProofReference ?? request.paymentReference ?? '').toLowerCase();
      const type = (request.items?.map((item) => item.label).join(', ') || request.type).toLowerCase();
      return studentName.includes(query) || reference.includes(query) || type.includes(query);
    });
  }, [queue, search]);

  return (
    <div className="flex min-h-full flex-col">
      <main className="portal-main max-w-7xl space-y-6">
        <div className="portal-page-header flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="portal-title flex items-center gap-2">
              <Wallet className="size-6 text-[#0a439b]" strokeWidth={1.8} />
              Payment approvals
            </h1>
            <p className="portal-description mt-2">
              Confirm student proof of payment for document requests. Verification is final once confirmed.
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-[#dce7ef] bg-white px-3 py-2">
          <Search className="size-4 text-[#6c879a]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search student, reference, or document type"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        {loadError && (
          <div className="portal-surface portal-empty" role="alert">
            <p className="text-sm text-rose-700">{loadError}</p>
            <Button size="sm" variant="outline" onClick={() => void load()}>Try again</Button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[#587387]">Loading payment queue…</p>
        ) : filtered.length === 0 ? (
          <div className="portal-surface portal-empty">
            <CheckCircle2 className="size-8 text-emerald-500" />
            <p className="text-sm text-[#587387]">No payments are awaiting confirmation.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((request) => {
              const hasSubmittedProof = Boolean(
                request.paymentProofChannel && request.paymentProofReference?.trim(),
              );
              return (
              <div key={request.id} className="portal-surface p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#102f49]">
                      {request.student?.user?.firstName} {request.student?.user?.lastName} · {request.student?.studentNumber}
                    </p>
                    <p className="mt-0.5 text-xs text-[#587387]">
                      {(request.items?.map((item) => `${item.label} ×${item.quantity}`).join(', ')) || request.type}
                    </p>
                    <p className="mt-1 text-xs text-[#6c879a]">
                      {request.paymentProofChannel ? `Proof: ${request.paymentProofChannel.toUpperCase()}` : 'Proof not submitted'} · Proof reference: {request.paymentProofReference ?? '—'} · Amount: ₱{Number(request.fee ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                    <Button
                      onClick={() => void confirmPayment(request.id)}
                      disabled={confirmingId === request.id || !hasSubmittedProof}
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="size-4" />
                      Confirm payment
                    </Button>
                    {!hasSubmittedProof && (
                      <p className="text-xs text-amber-800">Waiting for student payment proof.</p>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
