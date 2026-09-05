'use client';

import { useEffect, useState } from 'react';
import { useRequestStore } from '@/stores/requestStore';
import { Navbar } from '@/components/shared/Navbar';
import { RequestStatusTracker } from '@/components/shared/RequestStatusTracker';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  FileText,
  Plus,
  ChevronDown,
  ChevronUp,
  Wallet,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const DOCUMENT_TYPES = [
  { value: 'transcript_of_records', label: 'Transcript of Records', fee: 200 },
  { value: 'certificate_of_enrollment', label: 'Certificate of Enrollment', fee: 150 },
  { value: 'certificate_of_good_moral', label: 'Certificate of Good Moral Character', fee: 100 },
  { value: 'diploma', label: 'Diploma', fee: 500 },
  { value: 'course_description', label: 'Course Description', fee: 50 },
  { value: 'authentication', label: 'Document Authentication', fee: 300 },
  { value: 'other', label: 'Other Document', fee: 100 },
];

export default function RequestsPage() {
  const { requests, isLoading, isSubmitting, fetchRequests, submitRequest, confirmPayment } =
    useRequestStore();
  const [showForm, setShowForm] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [requestRemarks, setRequestRemarks] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentRequestId, setPaymentRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (requests.length === 0) void fetchRequests();
  }, [requests.length, fetchRequests]);

  const handleSubmit = async () => {
    const items = DOCUMENT_TYPES.filter((type) => (selectedItems[type.value] ?? 0) > 0).map((type) => ({
      type: type.value,
      quantity: selectedItems[type.value],
    }));
    if (items.length === 0) {
      toast.error('Please select at least one document');
      return;
    }
    try {
      const newRequest = await submitRequest(items, requestRemarks.trim() || undefined);
      toast.success('Document request submitted. Please complete payment to proceed.');
      setShowForm(false);
      setSelectedItems({});
      setRequestRemarks('');
      // Show payment modal for the new request
      if (newRequest?.id) {
        setPaymentRequestId(newRequest.id);
        setExpandedId(newRequest.id);
      }
    } catch {
      toast.error('Failed to submit request');
    }
  };

  const handleMarkPaid = async (requestId: string) => {
    try {
      await confirmPayment(requestId);
      toast.success('Payment marked as complete! Your request is now pending review.');
    } catch {
      toast.error('Failed to update payment status.');
    }
  };

  const pendingCount = requests.filter(
    (r) => r.status === 'pending' || r.status === 'under_review',
  ).length;
  const awaitingPaymentCount = requests.filter((r) => r.status === 'awaiting_payment').length;

  const selectedCount = Object.values(selectedItems).filter((quantity) => quantity > 0).length;
  const estimatedTotal = DOCUMENT_TYPES.reduce(
    (sum, type) => sum + type.fee * (selectedItems[type.value] ?? 0),
    0,
  );

  return (
    <div className="portal-page">
      <Navbar />

      <main className="portal-main max-w-4xl">
        <div className="portal-page-header flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="portal-title">Document requests</h1>
            <p className="portal-description mt-2">
              Request official academic documents
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </div>

        {/* New request form */}
        {showForm && (
          <Card className="portal-surface mb-6 border-[#86add0]">
            <CardHeader>
              <CardTitle className="text-base">Submit New Request</CardTitle>
              <CardDescription>
                Processing takes 3 to 5 business days after payment confirmation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <fieldset disabled={isSubmitting} className="space-y-2">
                <legend className="text-sm font-semibold text-[#102f49]">Choose documents</legend>
                <p className="text-xs text-[#587387]">Select one or more document types, then set the quantity for each.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {DOCUMENT_TYPES.map((type) => {
                    const quantity = selectedItems[type.value] ?? 0;
                    const selected = quantity > 0;
                    return (
                      <div
                        key={type.value}
                        className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${selected ? 'border-[#0a439b] bg-[#f1f7fb]' : 'border-[#dce7ef] bg-white'}`}
                      >
                        <Checkbox
                          id={`document-${type.value}`}
                          checked={selected}
                          onCheckedChange={(checked) =>
                            setSelectedItems((current) => ({
                              ...current,
                              [type.value]: checked ? Math.max(1, current[type.value] ?? 1) : 0,
                            }))
                          }
                        />
                        <label htmlFor={`document-${type.value}`} className="min-w-0 flex-1 cursor-pointer">
                          <span className="block text-sm font-medium text-[#102f49]">{type.label}</span>
                          <span className="text-xs text-[#587387]">₱{type.fee.toFixed(2)} per copy</span>
                        </label>
                        <input
                          aria-label={`${type.label} quantity`}
                          type="number"
                          min={1}
                          max={10}
                          value={selected ? quantity : 1}
                          disabled={!selected}
                          onChange={(event) =>
                            setSelectedItems((current) => ({
                              ...current,
                              [type.value]: Math.min(10, Math.max(1, Number(event.target.value) || 1)),
                            }))
                          }
                          className="h-9 w-16 rounded-lg border border-[#cbdde9] bg-white px-2 text-center text-sm text-[#102f49] disabled:cursor-not-allowed disabled:bg-[#f6f9fb] disabled:text-[#9ab0bf]"
                        />
                      </div>
                    );
                  })}
                </div>
              </fieldset>

              <label className="block space-y-1" htmlFor="request-remarks">
                <span className="text-sm font-medium text-[#102f49]">Notes (optional)</span>
                <textarea
                  id="request-remarks"
                  value={requestRemarks}
                  onChange={(event) => setRequestRemarks(event.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Add a note for the administration office"
                  className="w-full rounded-xl border border-[#cbdde9] bg-white px-3 py-2 text-sm text-[#102f49] placeholder:text-[#6c879a] focus:border-[#0a439b] focus:outline-none focus:ring-4 focus:ring-[#0a439b]/10"
                />
              </label>

              {selectedCount > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Payment Required</p>
                    <p className="text-xs text-amber-700">
                      {selectedCount} document type{selectedCount === 1 ? '' : 's'} · Estimated total: ₱{estimatedTotal.toFixed(2)}. A payment reference and QR code will be issued after submission.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => void handleSubmit()}
                  disabled={isSubmitting || selectedCount === 0}
                  size="sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedItems({});
                    setRequestRemarks('');
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {!isLoading && (
          <div className="portal-surface mb-6 grid grid-cols-2 divide-x divide-y divide-[#dce7ef] overflow-hidden p-0 sm:grid-cols-4 sm:divide-y-0">
            <Card className="rounded-none border-0 bg-transparent shadow-none">
              <CardContent className="pb-4 pt-4 text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{requests.length}</p>
              </CardContent>
            </Card>
            <Card className="rounded-none border-0 bg-amber-50/30 shadow-none">
              <CardContent className="pb-4 pt-4 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Awaiting Payment</p>
                <p className="text-2xl font-black text-amber-600">
                  {awaitingPaymentCount}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-none border-0 bg-blue-50/30 shadow-none">
              <CardContent className="pb-4 pt-4 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">In Progress</p>
                <p className="text-2xl font-black text-[#1e3a8a]">
                  {pendingCount}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-none border-0 bg-emerald-50/30 shadow-none">
              <CardContent className="pb-4 pt-4 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Released</p>
                <p className="text-2xl font-black text-emerald-600">
                  {requests.filter((r) => r.status === 'released').length}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Requests list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <Card className="portal-surface">
            <CardContent className="py-16 text-center text-muted-foreground">
              <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p>No document requests yet.</p>
              <p className="text-xs">
                Click &quot;New Request&quot; to submit your first request.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id} className="portal-surface overflow-hidden">
                <CardHeader className="pb-3 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-800 leading-tight">
                        {request.documentNames || request.typeLabel}
                      </CardTitle>
                      <CardDescription>
                        Submitted{' '}
                        {new Date(request.createdAt).toLocaleDateString(
                          'en-PH',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          },
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 rounded font-bold border-0 ${
                          request.status === 'rejected'
                            ? 'bg-rose-50 text-rose-600'
                            : request.status === 'released'
                            ? 'bg-emerald-50 text-emerald-600'
                            : request.status === 'awaiting_payment'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-blue-50 text-[#1e3a8a]'
                        }`}
                      >
                        {request.status.replace('_', ' ')}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 text-slate-400"
                        onClick={() =>
                          setExpandedId(
                            expandedId === request.id ? null : request.id,
                          )
                        }
                        aria-label={expandedId === request.id ? `Collapse ${request.typeLabel}` : `Show details for ${request.typeLabel}`}
                      >
                        {expandedId === request.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {expandedId === request.id && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />

                    {/* Payment Section for awaiting_payment */}
                    {request.status === 'awaiting_payment' && (
                      <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-amber-600" />
                          <h3 className="text-sm font-bold text-amber-800">Payment Required</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <p className="text-xs text-amber-700">
                              <span className="font-semibold">Fee:</span> ₱{(request.fee ?? 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-amber-700">
                              <span className="font-semibold">Reference:</span>{' '}
                              <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 text-amber-800 font-mono">
                                {request.paymentReference}
                              </code>
                            </p>
                            <p className="text-[10px] text-amber-600 leading-relaxed">
                              Please pay via InstaPay or bank transfer using the reference number above.
                              After payment, click &quot;I Have Paid&quot; below.
                            </p>
                            <Button
                              onClick={() => handleMarkPaid(request.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-lg"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                              I Have Paid
                            </Button>
                          </div>
                          {request.qrCodeUrl && (
                            <div className="flex flex-col items-center gap-2">
                              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Scan to Pay</p>
                              <img
                                src={request.qrCodeUrl}
                                alt="Payment QR Code"
                                className="w-32 h-32 rounded-lg border border-amber-200 bg-white"
                              />
                              <p className="text-[9px] text-amber-500 text-center">Mock InstaPay QR</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <RequestStatusTracker
                      status={request.status}
                      statusStep={request.statusStep}
                      updatedAt={request.updatedAt}
                    />
                    {request.items?.length ? (
                      <div className="mt-4 rounded-lg border border-[#dce7ef] bg-[#fbfdfe] px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#587387]">Requested copies</p>
                        <ul className="mt-2 space-y-1 text-sm text-[#102f49]">
                          {request.items.map((item) => (
                            <li key={item.id || `${request.id}-${item.type}`} className="flex items-center justify-between gap-3">
                              <span>{item.label}</span>
                              <span className="font-semibold">×{item.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {request.remarks && (
                      <div className="mt-4 rounded-lg bg-muted px-4 py-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          Remarks from admin:
                        </p>
                        <p className="mt-1 text-sm">{request.remarks}</p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
