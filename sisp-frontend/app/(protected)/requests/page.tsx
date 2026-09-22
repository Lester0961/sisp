'use client';

import { useCallback, useEffect, useState } from 'react';
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
  Copy,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { requestsApi, DocumentCatalogItem, PaymentChannels } from '@/lib/api/requests';

const STUDENT_DOCUMENT_OPTIONS = [
  { codes: ['certificate_of_good_moral'], label: 'Certificate of good moral', fee: 500, billingBasis: 'copy' },
  { codes: ['copy_of_grades'], label: '2nd copy of grades', fee: 150, billingBasis: 'copy' },
  { codes: ['certificate_of_registration', 'certified_true_copy_cor'], label: 'COR', fee: 300, billingBasis: 'copy' },
  { codes: ['certified_true_copy_grades'], label: 'certified true copy - copy of grades', fee: 300, billingBasis: 'copy' },
  { codes: ['transcript_of_records'], label: 'TOR', fee: 500, billingBasis: 'page', feeNote: 'per page' },
  { codes: ['certificate_of_enrollment'], label: 'COE', fee: 300, billingBasis: 'copy' },
] as const;

export default function RequestsPage() {
  const { requests, isLoading, isSubmitting, error: requestsError, fetchRequests, submitRequest } =
    useRequestStore();
  const [showForm, setShowForm] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [requestRemarks, setRequestRemarks] = useState('');
  const [isThirdParty, setIsThirdParty] = useState(false);
  const [authorizationNotes, setAuthorizationNotes] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentRequestId, setPaymentRequestId] = useState<string | null>(null);
  const [paymentChannels, setPaymentChannels] = useState<PaymentChannels | null>(null);
  const [proofChannel, setProofChannel] = useState<'gcash' | 'pnb'>('gcash');
  const [proofReference, setProofReference] = useState('');
  const [submittingProofId, setSubmittingProofId] = useState<string | null>(null);
  const [catalogItems, setCatalogItems] = useState<
    Array<{
      value: string;
      label: string;
      fee: number;
      feeNote?: string;
      tat?: string;
      staff?: string;
      billingBasis?: string;
    }>
  >([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const fees = await requestsApi.getFees();
      const activeFees = new Map(
        (Array.isArray(fees) ? fees : []).filter((item: any) => item.isActive !== false)
          .map((item: any) => [item.code || item.type, item]),
      );
      const mapped = STUDENT_DOCUMENT_OPTIONS.flatMap((option) => {
        const availableCode = option.codes.find((code) => activeFees.has(code));
        if (!availableCode) return [];
        return [{
          value: availableCode,
          label: option.label,
          fee: option.fee,
          feeNote: 'feeNote' in option ? option.feeNote : undefined,
          billingBasis: option.billingBasis,
        }];
      });
      setCatalogItems(mapped);
      if (mapped.length === 0) {
        setCatalogError('The document catalog is currently unavailable. Please contact the Records Office.');
      }
    } catch {
      setCatalogItems([]);
      setCatalogError('We could not load the document catalog. Please try again.');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (requests.length === 0) void fetchRequests();
    void loadCatalog();
  }, [requests.length, fetchRequests, loadCatalog]);

  useEffect(() => {
    void (async () => {
      try {
        setPaymentChannels(await requestsApi.getPaymentChannels());
      } catch {
        // Leave channels unset; the UI then directs the student to Treasury
        // instead of showing unverified fallback account details.
        setPaymentChannels(null);
      }
    })();
  }, []);

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Copy failed. Please copy it manually.');
    }
  };

  const handleSubmit = async () => {
    const items = catalogItems
      .filter((type) => (selectedItems[type.value] ?? 0) > 0)
      .map((type) => ({
        type: type.value,
        quantity: selectedItems[type.value],
      }));
    if (items.length === 0) {
      toast.error('Please select at least one document');
      return;
    }
    try {
      const newRequest = await submitRequest(
        items,
        requestRemarks.trim() || undefined,
        isThirdParty,
        authorizationNotes.trim() || undefined,
      );
      toast.success('Document request submitted. Please complete payment to proceed.');
      setShowForm(false);
      setSelectedItems({});
      setRequestRemarks('');
      setIsThirdParty(false);
      setAuthorizationNotes('');
      if (newRequest?.id) {
        setPaymentRequestId(newRequest.id);
        setExpandedId(newRequest.id);
      }
    } catch (e: any) {
      const backendMessage =
        e?.response?.data?.message ??
        (Array.isArray(e?.response?.data?.message)
          ? e.response.data.message.join(', ')
          : null) ??
        'Failed to submit request';
      toast.error(backendMessage);
    }
  };

  const handleSubmitProof = async (requestId: string) => {
    if (!proofReference.trim()) {
      toast.error('Please enter your GCash reference number or PNB slip number');
      return;
    }
    setSubmittingProofId(requestId);
    try {
      await requestsApi.submitProof(requestId, proofChannel, proofReference.trim());
      toast.success('Proof submitted! Treasury will verify it before confirming your payment.');
      setProofReference('');
      await fetchRequests();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to submit proof of payment.');
    } finally {
      setSubmittingProofId(null);
    }
  };

  const pendingCount = requests.filter(
    (r) => r.status === 'pending' || r.status === 'under_review',
  ).length;
  const awaitingPaymentCount = requests.filter((r) => r.status === 'awaiting_payment').length;

  const selectedCount = Object.values(selectedItems).filter((quantity) => quantity > 0).length;
  const estimatedTotal = catalogItems.reduce(
    (sum, type) => sum + (type.billingBasis === 'page' ? 0 : type.fee * (selectedItems[type.value] ?? 0)),
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
                Request and payment status will appear in your portal after submission. Check the catalog for any available document details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <fieldset disabled={isSubmitting} className="space-y-2">
                <legend className="text-sm font-semibold text-[#102f49]">Choose documents</legend>
                <p className="text-xs text-[#587387]">Select one or more document types, then set the quantity for each.</p>
                {catalogLoading ? (
                  <div className="portal-skeleton h-24 w-full" />
                ) : catalogError || catalogItems.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                    <AlertCircle className="size-6 text-amber-600" />
                    <p className="text-sm font-medium text-amber-800">
                      {catalogError ?? 'No documents are available.'}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => void loadCatalog()}>
                      Retry catalog
                    </Button>
                  </div>
                ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {catalogItems.map((type) => {
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
                          <span className="flex items-center gap-2 text-xs text-[#587387]">
                            <span>₱{type.fee.toFixed(2)}{type.feeNote ? ` / ${type.feeNote}` : ''}</span>
                          </span>
                        </label>
                        <input
                          aria-label={`${type.label} copies`}
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
                )}
              </fieldset>

              {/* Third Party Authorization Checklist (Regis Marie College Records Rule) */}
              <div className="rounded-xl border border-[#dce7ef] bg-slate-50/70 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="third-party-toggle"
                    checked={isThirdParty}
                    onCheckedChange={(checked) => setIsThirdParty(!!checked)}
                  />
                  <label htmlFor="third-party-toggle" className="cursor-pointer text-sm font-medium text-[#102f49]">
                    I am requesting this document on behalf of someone else (Third-Party Representative)
                  </label>
                </div>
                {isThirdParty && (
                  <div className="pl-6 space-y-2 pt-1 text-xs text-[#587387]">
                    <p className="font-medium text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                      ⚠️ Note: Registar records require an Authorization Letter and Valid ID upon pickup.
                    </p>
                    <input
                      type="text"
                      value={authorizationNotes}
                      onChange={(e) => setAuthorizationNotes(e.target.value)}
                      placeholder="Name of authorized representative / relationship to student"
                      className="w-full rounded-lg border border-[#cbdde9] bg-white px-3 py-1.5 text-sm text-[#102f49] focus:outline-none focus:ring-2 focus:ring-[#0a439b]"
                    />
                  </div>
                )}
              </div>

              <label className="block space-y-1" htmlFor="request-remarks">
                <span className="text-sm font-medium text-[#102f49]">Notes (optional)</span>
                <textarea
                  id="request-remarks"
                  value={requestRemarks}
                  onChange={(event) => setRequestRemarks(event.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Add a note for the administration office (e.g. purpose of request)"
                  className="w-full rounded-xl border border-[#cbdde9] bg-white px-3 py-2 text-sm text-[#102f49] placeholder:text-[#6c879a] focus:border-[#0a439b] focus:outline-none focus:ring-4 focus:ring-[#0a439b]/10"
                />
              </label>


              {selectedCount > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Payment Required</p>
                    <p className="text-xs text-amber-700">
                      {selectedCount} document type{selectedCount === 1 ? '' : 's'} · {catalogItems.some((item) => item.billingBasis === 'page' && selectedItems[item.value] > 0) ? `At least ₱${estimatedTotal.toFixed(2)}; TOR page count and final fee will be confirmed by the Records Office.` : `Estimated total: ₱${estimatedTotal.toFixed(2)}.`} Final payable amounts come from the server catalog.
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
        ) : requestsError ? (
          <Card className="portal-surface" role="alert">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircle className="size-8 text-[#b42318]" />
              <p className="text-sm text-[#b42318]">{requestsError}</p>
              <Button size="sm" variant="outline" onClick={() => void fetchRequests()}>Retry</Button>
            </CardContent>
          </Card>
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
                        {request.referenceNo ? (
                          <span className="mr-2 font-mono text-[11px] font-semibold text-[#1e3a8a]">
                            {request.referenceNo}
                          </span>
                        ) : null}
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
                            : request.status === 'awaiting_payment' || request.status === 'awaiting_page_confirmation'
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

                    {request.status === 'awaiting_page_confirmation' && (
                      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Awaiting Records Office page-count confirmation. No TOR amount is payable yet.</div>
                    )}

                    {/* Payment Section for awaiting_payment */}
                    {request.status === 'awaiting_payment' && (
                      <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-amber-600" />
                          <h3 className="text-sm font-bold text-amber-800">Payment Required</h3>
                        </div>
                        <p className="text-xs text-amber-700">
                          <span className="font-semibold">Fee:</span> ₱{(request.fee ?? 0).toFixed(2)}
                          {' '}<span className="font-semibold">· SISP Reference:</span>{' '}
                          <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 text-amber-800 font-mono">
                            {request.paymentReference}
                          </code>
                        </p>

                        {/* Official Treasury online channels (deployment-configured) */}
                        <div className="rounded-lg border border-amber-200 bg-white p-3 space-y-2">
                          {paymentChannels?.configured ? (
                            <>
                              <p className="text-xs font-bold text-amber-800">
                                Pay through an official channel, then submit your proof below
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {paymentChannels.gcash?.number ? (
                                  <div className="rounded-lg bg-slate-50 p-2.5 text-xs">
                                    <p className="font-bold text-[#102f49]">{paymentChannels.gcash.label}</p>
                                    <p className="mt-1 flex items-center gap-1.5 font-mono font-semibold text-[#102f49]">
                                      {paymentChannels.gcash.number}
                                      <button
                                        type="button"
                                        onClick={() => void copyText(paymentChannels.gcash!.number!, 'GCash number')}
                                        className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                                        aria-label="Copy GCash number"
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                      </button>
                                    </p>
                                    {paymentChannels.gcash.accountName ? (
                                      <p className="text-[11px] text-slate-500">{paymentChannels.gcash.accountName}</p>
                                    ) : null}
                                    {paymentChannels.gcash.note ? (
                                      <p className="mt-1 text-[10px] leading-relaxed text-amber-700">
                                        {paymentChannels.gcash.note}
                                      </p>
                                    ) : null}
                                  </div>
                                ) : null}
                                {paymentChannels.pnb?.accountNumber ? (
                                  <div className="rounded-lg bg-slate-50 p-2.5 text-xs">
                                    <p className="font-bold text-[#102f49]">{paymentChannels.pnb.label}</p>
                                    {paymentChannels.pnb.accountName ? (
                                      <p className="mt-1 text-[11px] text-slate-600">{paymentChannels.pnb.accountName}</p>
                                    ) : null}
                                    <p className="flex items-center gap-1.5 font-mono font-semibold text-[#102f49]">
                                      {paymentChannels.pnb.accountNumber}
                                      <button
                                        type="button"
                                        onClick={() => void copyText(paymentChannels.pnb!.accountNumber!, 'PNB account number')}
                                        className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                                        aria-label="Copy PNB account number"
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                      </button>
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                            </>
                          ) : (
                            <p className="text-xs font-semibold text-amber-800">
                              {paymentChannels?.instruction ??
                                'Online payment channels are not configured yet. Please contact the Treasury Office for official payment instructions.'}
                            </p>
                          )}
                          <p className="text-[10px] leading-relaxed text-amber-700">
                            {paymentChannels?.proofRecipient?.instruction ??
                              'Submit your proof of payment after completing the transaction; the Treasury Office will verify it.'}
                          </p>
                        </div>

                        {request.paymentProofReference ? (
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs">
                            <p className="font-bold text-emerald-800">
                              Proof submitted — awaiting Treasury verification
                            </p>
                            <p className="mt-1 text-emerald-700">
                              {request.paymentProofChannel === 'gcash' ? 'GCash' : 'PNB'} ·{' '}
                              <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200 font-mono">
                                {request.paymentProofReference}
                              </code>
                            </p>
                            {request.paymentProofSubmittedAt ? (
                              <p className="mt-1 text-[10px] text-emerald-600">
                                Submitted{' '}
                                {new Date(request.paymentProofSubmittedAt).toLocaleString('en-PH')}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-[#cbdde9] bg-white p-3 space-y-2">
                            <p className="text-xs font-bold text-[#102f49]">Submit proof of payment</p>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <select
                                value={proofChannel}
                                onChange={(event) =>
                                  setProofChannel(event.target.value as 'gcash' | 'pnb')
                                }
                                className="rounded-lg border border-[#cbdde9] bg-white px-3 py-2 text-sm text-[#102f49] focus:outline-none focus:ring-2 focus:ring-[#0a439b]"
                                aria-label="Payment channel"
                              >
                                <option value="gcash">GCash</option>
                                <option value="pnb">PNB transfer / deposit</option>
                              </select>
                              <input
                                type="text"
                                value={proofReference}
                                onChange={(event) => setProofReference(event.target.value)}
                                maxLength={64}
                                placeholder="GCash ref no. / PNB slip no."
                                className="flex-1 rounded-lg border border-[#cbdde9] bg-white px-3 py-2 text-sm text-[#102f49] placeholder:text-[#6c879a] focus:outline-none focus:ring-2 focus:ring-[#0a439b]"
                              />
                              <Button
                                size="sm"
                                disabled={submittingProofId === request.id || !proofReference.trim()}
                                onClick={() => void handleSubmitProof(request.id)}
                              >
                                {submittingProofId === request.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                  </>
                                ) : (
                                  'Submit Proof'
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
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
