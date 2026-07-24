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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  FileText,
  Plus,
  ChevronDown,
  ChevronUp,
  Wallet,
  QrCode,
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
  const [selectedType, setSelectedType] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentRequestId, setPaymentRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (requests.length === 0) void fetchRequests();
  }, [requests.length, fetchRequests]);

  const handleSubmit = async () => {
    if (!selectedType) {
      toast.error('Please select a document type');
      return;
    }
    try {
      const newRequest = await submitRequest(selectedType);
      toast.success('Document request submitted. Please complete payment to proceed.');
      setShowForm(false);
      setSelectedType('');
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

  const selectedDocType = DOCUMENT_TYPES.find((d) => d.value === selectedType);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-8 pb-24 md:pb-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Document Requests</h1>
            <p className="text-muted-foreground">
              Request official academic documents
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm" className="w-full md:w-auto h-10 bg-[#1e3a8a] text-white rounded-xl shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </div>

        {/* New request form */}
        {showForm && (
          <Card className="mb-6 border-primary/30">
            <CardHeader>
              <CardTitle className="text-base">Submit New Request</CardTitle>
              <CardDescription>
                Processing takes 3–5 business days after payment confirmation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={selectedType}
                onValueChange={setSelectedType}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type..." />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label} — ₱{type.fee.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedDocType && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <Wallet className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Payment Required</p>
                    <p className="text-xs text-amber-600">
                      Fee: ₱{selectedDocType.fee.toFixed(2)}. You will receive a payment reference and QR code after submission.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => void handleSubmit()}
                  disabled={isSubmitting || !selectedType}
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
                    setSelectedType('');
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
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card className="border-slate-100 shadow-sm bg-slate-50/50">
              <CardContent className="pb-4 pt-4 text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{requests.length}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-100 shadow-sm bg-amber-50/30 border-amber-100/50">
              <CardContent className="pb-4 pt-4 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Awaiting Payment</p>
                <p className="text-2xl font-black text-amber-600">
                  {awaitingPaymentCount}
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-100 shadow-sm bg-blue-50/30 border-blue-100/50">
              <CardContent className="pb-4 pt-4 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">In Progress</p>
                <p className="text-2xl font-black text-[#1e3a8a]">
                  {pendingCount}
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-100 shadow-sm bg-emerald-50/30 border-emerald-100/50">
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
          <Card>
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
              <Card key={request.id} className="border-slate-100 shadow-sm overflow-hidden">
                <CardHeader className="pb-3 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-800 leading-tight">
                        {request.typeLabel}
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
