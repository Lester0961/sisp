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
  const [matchQueries, setMatchQueries] = useState<Record<string, string>>({});
  const [matchResults, setMatchResults] = useState<Record<string, NonNullable<IdentityVerificationRecord['matchedStudentProfile']>[]>>({});
  const [selectedMatches, setSelectedMatches] = useState<Record<string, string>>({});
  const [openingDocument, setOpeningDocument] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await identityApi.listForReview(status || undefined);
      const nextRecords = response.data ?? [];
      setRecords(nextRecords);
      setSelectedMatches((current) => {
        const next = { ...current };
        nextRecords.forEach((record) => {
          if (!next[record.id] && record.matchedStudentProfile?.id) {
            next[record.id] = record.matchedStudentProfile.id;
          }
        });
        return next;
      });
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

  const searchMatches = async (id: string) => {
    const query = (matchQueries[id] ?? '').trim();
    if (query.length < 2) {
      toast.error('Enter at least two characters to search student records.');
      return;
    }
    setBusyId(id);
    try {
      const result = await identityApi.searchStudentRecords(query);
      setMatchResults((current) => ({ ...current, [id]: result.data }));
      if (!result.data.length) toast.info('No student records matched that search.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Could not search student records.');
    } finally {
      setBusyId(null);
    }
  };

  const openDocument = async (verificationId: string, documentId: string) => {
    const key = `${verificationId}:${documentId}`;
    const preview = window.open('about:blank', '_blank');
    if (!preview) {
      toast.error('Allow pop-ups to preview the uploaded ID.');
      return;
    }
    setOpeningDocument(key);
    try {
      const blob = await identityApi.openReviewDocument(verificationId, documentId);
      const url = URL.createObjectURL(blob);
      preview.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error: any) {
      preview.close();
      toast.error(error?.response?.data?.message ?? 'Could not open the uploaded ID.');
    } finally {
      setOpeningDocument(null);
    }
  };

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
      const response = await identityApi.review(id, {
        decision,
        remarks,
        ...(decision === 'approved' ? { matchedStudentProfileId: selectedMatches[id] || null } : {}),
      });
      toast.success(`Verification marked ${decision.replace(/_/g, ' ')}.`);
      if (!response.emailNotificationSent) {
        toast.info('Review saved, but email delivery is not configured in this local environment.');
      }
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
                      <li key={document.id} className="flex flex-wrap items-center gap-2">
                        <span>{document.documentType}: {document.originalFileName} ({Math.round(document.fileSize / 1024)} KB) · {document.reviewStatus}</span>
                        <Button size="sm" variant="outline" onClick={() => void openDocument(record.id, document.id)} disabled={openingDocument === `${record.id}:${document.id}`}>
                          {openingDocument === `${record.id}:${document.id}` ? 'Opening…' : 'View ID'}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-amber-700">No identification document uploaded yet.</p>
                )}

                {(record.status === 'submitted' || record.status === 'under_review' || record.status === 'needs_info') && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-[#dce7ef] bg-slate-50 p-3">
                      <label htmlFor={`record-match-${record.id}`} className="text-xs font-semibold text-[#102f49]">Existing student record to link</label>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          value={matchQueries[record.id] ?? ''}
                          onChange={(event) => setMatchQueries((current) => ({ ...current, [record.id]: event.target.value }))}
                          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void searchMatches(record.id); } }}
                          placeholder="Search by student number, name, or email"
                          className="min-w-0 flex-1 rounded-lg border border-[#bed1e0] bg-white px-3 py-2 text-xs"
                        />
                        <Button size="sm" variant="outline" onClick={() => void searchMatches(record.id)} disabled={busyId === record.id}>Search records</Button>
                      </div>
                      <select
                        id={`record-match-${record.id}`}
                        value={selectedMatches[record.id] ?? ''}
                        onChange={(event) => setSelectedMatches((current) => ({ ...current, [record.id]: event.target.value }))}
                        className="mt-2 w-full rounded-lg border border-[#bed1e0] bg-white px-3 py-2 text-xs"
                      >
                        <option value="">Select the verified student record</option>
                        {[record.matchedStudentProfile, ...(matchResults[record.id] ?? [])]
                          .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
                          .filter((candidate, index, list) => list.findIndex((item) => item.id === candidate.id) === index)
                          .map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.studentNumber} — {candidate.user.firstName} {candidate.user.lastName} ({candidate.user.email})
                            </option>
                          ))}
                      </select>
                      <p className="mt-1 text-[11px] text-[#6c879a]">Approval is allowed only after selecting a record and uploading a valid ID.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                    {record.status === 'submitted' && (
                      <Button size="sm" variant="outline" onClick={() => void review(record.id, 'under_review')} disabled={busyId === record.id}>
                        Start review
                      </Button>
                    )}
                    <Button size="sm" onClick={() => void review(record.id, 'approved')} disabled={busyId === record.id || !selectedMatches[record.id] || !record.documents?.some((document) => document.documentType === 'valid_id')} className="bg-emerald-600 text-white hover:bg-emerald-700">
                      Approve &amp; link record
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void review(record.id, 'needs_info')} disabled={busyId === record.id}>
                      Needs info
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void review(record.id, 'rejected')} disabled={busyId === record.id} className="text-rose-700">
                      Reject
                    </Button>
                    </div>
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
