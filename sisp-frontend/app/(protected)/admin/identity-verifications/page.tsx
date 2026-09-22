'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileCheck2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { identityApi, IdentityVerificationRecord } from '@/lib/api/identity';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const STATUSES = ['submitted', 'under_review', 'needs_info', 'approved', 'rejected'] as const;

export default function IdentityVerificationsPage() {
  const [status, setStatus] = useState<string>('submitted');
  const [records, setRecords] = useState<IdentityVerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await identityApi.listForReview(status || undefined);
      setRecords(response.data ?? []);
    } catch {
      toast.error('Could not load identity verifications.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const review = async (id: string, decision: 'under_review' | 'approved' | 'rejected' | 'needs_info') => {
    let remarks: string | undefined;
    if (decision === 'rejected' || decision === 'needs_info') {
      remarks = window.prompt(
        decision === 'rejected' ? 'Reason for rejection?' : 'What information is needed?',
      ) ?? undefined;
      if (remarks === undefined) return;
    }
    setBusyId(id);
    try {
      await identityApi.review(id, { decision, remarks });
      toast.success(`Verification marked ${decision.replace(/_/g, ' ')}.`);
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Could not update the verification.');
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
              <FileCheck2 className="size-6 text-[#0a439b]" strokeWidth={1.8} />
              Identity verifications
            </h1>
            <p className="portal-description mt-2">
              Review returning-student and alumni identity requests, verify the uploaded ID, and
              approve linkage to the existing record. Never create a duplicate student profile.
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUSES.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setStatus(entry)}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold capitalize transition ${
                status === entry
                  ? 'border-[#0a439b] bg-[#0a439b] text-white'
                  : 'border-[#dce7ef] bg-white text-[#365a72] hover:bg-[#f1f7fb]'
              }`}
            >
              {entry.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-[#587387]">Loading verifications…</p>
        ) : records.length === 0 ? (
          <div className="portal-surface portal-empty">
            <p className="text-sm text-[#587387]">No verification requests in this status.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <div key={record.id} className="portal-surface space-y-3 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#102f49]">
                      {record.claimedFirstName} {record.claimedMiddleName ?? ''} {record.claimedLastName}
                      {record.previousName ? ` (record name: ${record.previousName})` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-[#587387]">
                      {record.applicantEmail} · {record.claimedStudentNumber ?? 'no student number'} ·{' '}
                      {new Date(record.submittedAt).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-[#6c879a]">
                      {record.matchedStudentProfile
                        ? `Matched record: ${record.matchedStudentProfile.studentNumber} — ${record.matchedStudentProfile.user.firstName} ${record.matchedStudentProfile.user.lastName}`
                        : 'No automatic record match — manual verification required'}
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit capitalize">{record.verificationType}</Badge>
                </div>

                {record.documents && record.documents.length > 0 ? (
                  <ul className="space-y-1 text-xs text-[#365a72]">
                    {record.documents.map((document) => (
                      <li key={document.id}>
                        {document.documentType}: {document.originalFileName} ({Math.round(document.fileSize / 1024)} KB)
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-amber-700">No identification document uploaded yet.</p>
                )}

                {(record.status === 'submitted' || record.status === 'under_review' || record.status === 'needs_info') && (
                  <div className="flex flex-wrap gap-2">
                    {record.status === 'submitted' && (
                      <Button size="sm" variant="outline" onClick={() => void review(record.id, 'under_review')} disabled={busyId === record.id}>
                        Start review
                      </Button>
                    )}
                    <Button size="sm" onClick={() => void review(record.id, 'approved')} disabled={busyId === record.id} className="bg-emerald-600 text-white hover:bg-emerald-700">
                      Approve &amp; link record
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void review(record.id, 'needs_info')} disabled={busyId === record.id}>
                      Needs info
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void review(record.id, 'rejected')} disabled={busyId === record.id} className="text-rose-700">
                      Reject
                    </Button>
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
