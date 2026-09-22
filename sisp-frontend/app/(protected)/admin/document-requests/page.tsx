'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { requestsApi, DocumentRequestItem } from '@/lib/api/requests';

const STATUS_FILTERS = [
  'awaiting_page_confirmation',
  'awaiting_payment',
  'pending',
  'under_review',
  'approved',
  'released',
  'rejected',
] as const;

const NEXT_ACTIONS: Record<string, Array<{ status: string; label: string }>> = {
  pending: [
    { status: 'under_review', label: 'Start review' },
    { status: 'approved', label: 'Approve' },
    { status: 'rejected', label: 'Reject' },
  ],
  under_review: [
    { status: 'approved', label: 'Approve' },
    { status: 'rejected', label: 'Reject' },
  ],
  approved: [{ status: 'released', label: 'Mark released' }],
};

/**
 * Registrar document-request processing (Phase 1).
 * Queue + TOR page-count confirmation + status transitions. Treasury remains
 * the only role that confirms payments.
 */
export default function AdminDocumentRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [requests, setRequests] = useState<DocumentRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pageCounts, setPageCounts] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await requestsApi.getAllRequests(statusFilter || undefined);
      setRequests(response.data ?? []);
    } catch {
      toast.error('Could not load document requests.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmQuote = async (requestId: string) => {
    const pageCount = pageCounts[requestId];
    if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 19994) {
      toast.error('Enter the Records-confirmed TOR page count.');
      return;
    }
    setBusyId(requestId);
    try {
      await requestsApi.confirmTorQuote(requestId, pageCount);
      toast.success('TOR amount confirmed; the student can now pay.');
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Could not confirm the TOR page count.');
    } finally {
      setBusyId(null);
    }
  };

  const transition = async (requestId: string, status: string, label: string) => {
    let remarks: string | undefined;
    if (status === 'rejected') {
      remarks = window.prompt(`Reason for rejecting this request (${label})?`) ?? undefined;
      if (remarks === undefined) return;
    }
    setBusyId(requestId);
    try {
      await requestsApi.updateRequestStatus(requestId, status, remarks);
      toast.success(`Request updated: ${label}.`);
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Could not update the request.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <main className="portal-main max-w-7xl space-y-6">
        <div className="portal-page-header flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="portal-title flex items-center gap-2">
              <FileText className="size-6 text-[#0a439b]" strokeWidth={1.8} />
              Document requests
            </h1>
            <p className="portal-description mt-2">
              Confirm TOR page counts, review submitted proof, and move requests through processing.
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold capitalize transition ${
                statusFilter === status
                  ? 'border-[#0a439b] bg-[#0a439b] text-white'
                  : 'border-[#dce7ef] bg-white text-[#365a72] hover:bg-[#f1f7fb]'
              }`}
            >
              {status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-[#587387]">Loading requests…</p>
        ) : requests.length === 0 ? (
          <div className="portal-surface portal-empty">
            <p className="text-sm text-[#587387]">No requests in this status.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="portal-surface space-y-3 p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-[#102f49]">
                    {request.student?.user?.firstName} {request.student?.user?.lastName} · {request.student?.studentNumber}
                  </p>
                  <p className="text-xs text-[#587387]">
                    ₱{Number(request.fee ?? 0).toLocaleString()} · payment {request.paymentStatus ?? 'unpaid'}
                  </p>
                </div>
                <p className="text-xs text-[#587387]">
                  {(request.items?.map((item) => `${item.label} ×${item.quantity}${item.pageCount ? ` (${item.pageCount} pages)` : ''}`).join(', ')) || request.type}
                </p>
                {request.paymentProofReference && (
                  <p className="text-xs text-[#6c879a]">
                    Proof: {request.paymentProofChannel ?? '—'} · Ref {request.paymentProofReference}
                  </p>
                )}

                {request.status === 'awaiting_page_confirmation' && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <label className="text-xs font-medium text-amber-900" htmlFor={`pages-${request.id}`}>
                      Confirmed TOR page count
                    </label>
                    <input
                      id={`pages-${request.id}`}
                      type="number"
                      min={1}
                      max={19994}
                      value={pageCounts[request.id] ?? ''}
                      onChange={(event) =>
                        setPageCounts((current) => ({ ...current, [request.id]: Number(event.target.value) }))
                      }
                      className="w-24 rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => void confirmQuote(request.id)}
                      disabled={busyId === request.id}
                      className="bg-amber-600 text-white hover:bg-amber-700"
                    >
                      Confirm quote
                    </Button>
                  </div>
                )}

                {(NEXT_ACTIONS[request.status] ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(NEXT_ACTIONS[request.status] ?? []).map((action) => (
                      <Button
                        key={action.status}
                        size="sm"
                        variant={action.status === 'rejected' ? 'outline' : 'default'}
                        onClick={() => void transition(request.id, action.status, action.label)}
                        disabled={busyId === request.id}
                        className={action.status === 'rejected' ? 'text-rose-700' : 'bg-[#0a439b] text-white hover:bg-[#083980]'}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
