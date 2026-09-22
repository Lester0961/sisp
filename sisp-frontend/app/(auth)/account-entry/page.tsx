'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { identityApi } from '@/lib/api/identity';
import { ArrowLeft, GraduationCap, History, Loader2, UploadCloud, UserRound } from 'lucide-react';

type Step = 'choose' | 'returning' | 'alumni' | 'submitted' | 'track';

/**
 * Public onboarding for people who already have (or previously had) an RMC
 * record: Returning/Old Student or Alumni. No duplicate StudentProfile is
 * created here; the Registrar links the verified person to the existing record.
 */
export default function AccountEntryPage() {
  const [step, setStep] = useState<Step>('choose');
  const [loading, setLoading] = useState(false);
  const [verificationId, setVerificationId] = useState('');
  const [trackId, setTrackId] = useState('');
  const [trackEmail, setTrackEmail] = useState('');
  const [trackResult, setTrackResult] = useState<string | null>(null);

  const [form, setForm] = useState({
    applicantEmail: '',
    claimedStudentNumber: '',
    claimedFirstName: '',
    claimedMiddleName: '',
    claimedLastName: '',
    previousName: '',
  });
  const [idFile, setIdFile] = useState<{ name: string; mime: string; base64: string } | null>(null);

  const update = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (type: 'returning' | 'alumni') => {
    if (!form.applicantEmail || !form.claimedFirstName || !form.claimedLastName) {
      toast.error('Email and your name are required.');
      return;
    }
    setLoading(true);
    try {
      const result = await identityApi.submit({ verificationType: type, ...form });
      setVerificationId(result.id);
      if (type === 'alumni') {
        toast.success('Details saved. Upload a valid ID to complete your request.');
      } else {
        setStep('submitted');
        toast.success(result.message);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Could not submit your verification.');
    } finally {
      setLoading(false);
    }
  };

  const onFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Identification documents must be 5 MB or smaller.');
      return;
    }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Only PDF, JPEG, or PNG identification documents are accepted.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(',')[1] ?? '';
      setIdFile({ name: file.name, mime: file.type, base64 });
    };
    reader.readAsDataURL(file);
  };

  const uploadId = async () => {
    if (!idFile) {
      toast.error('Choose a valid ID file first.');
      return;
    }
    setLoading(true);
    try {
      await identityApi.uploadDocument(verificationId, {
        documentType: 'valid_id',
        originalFileName: idFile.name,
        mimeType: idFile.mime,
        contentBase64: idFile.base64,
      });
      setStep('submitted');
      toast.success('Identification uploaded. The Registrar will review your request.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Could not upload the identification.');
    } finally {
      setLoading(false);
    }
  };

  const track = async () => {
    setLoading(true);
    try {
      const record = await identityApi.getStatus(trackId.trim(), trackEmail.trim());
      setTrackResult(`${record.status.replace(/_/g, ' ')}${record.remarks ? ` — ${record.remarks}` : ''}`);
    } catch {
      setTrackResult(null);
      toast.error('No verification was found for that reference and email.');
    } finally {
      setLoading(false);
    }
  };

  const formFields = (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input placeholder="First name" value={form.claimedFirstName} onChange={(e) => update('claimedFirstName', e.target.value)} className="rounded-xl border border-[#bed1e0] bg-[#f8fbfd] px-3 py-2.5 text-sm" />
        <input placeholder="Last name" value={form.claimedLastName} onChange={(e) => update('claimedLastName', e.target.value)} className="rounded-xl border border-[#bed1e0] bg-[#f8fbfd] px-3 py-2.5 text-sm" />
        <input placeholder="Middle name (optional)" value={form.claimedMiddleName} onChange={(e) => update('claimedMiddleName', e.target.value)} className="rounded-xl border border-[#bed1e0] bg-[#f8fbfd] px-3 py-2.5 text-sm" />
        <input placeholder="Student number (if known)" value={form.claimedStudentNumber} onChange={(e) => update('claimedStudentNumber', e.target.value)} className="rounded-xl border border-[#bed1e0] bg-[#f8fbfd] px-3 py-2.5 text-sm" />
        <input type="email" placeholder="Current email address" value={form.applicantEmail} onChange={(e) => update('applicantEmail', e.target.value)} className="rounded-xl border border-[#bed1e0] bg-[#f8fbfd] px-3 py-2.5 text-sm sm:col-span-2" />
        <input placeholder="Name used in school records, if different" value={form.previousName} onChange={(e) => update('previousName', e.target.value)} className="rounded-xl border border-[#bed1e0] bg-[#f8fbfd] px-3 py-2.5 text-sm sm:col-span-2" />
      </div>
      <p className="text-xs text-[#6c879a]">
        A changed surname is not a problem — record the name your school documents used and the
        Registrar will verify it manually.
      </p>
    </div>
  );

  return (
    <div className="w-full space-y-5">
      <div className="flex justify-start">
        <Link href="/login" className="inline-flex items-center gap-1.5 rounded-lg border border-[#bed1e0] bg-white px-3 py-2 text-xs font-semibold text-[#0a439b] hover:bg-[#eef6fc]">
          <ArrowLeft className="h-3 w-3" /> Back to Login
        </Link>
      </div>

      <div className="w-full space-y-6 rounded-2xl border border-[#dce7ef] bg-white p-6 text-left shadow-[0_14px_36px_rgba(16,47,73,0.08)] sm:p-8">
        <div className="space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0a439b]">Account entry</span>
          <h2 className="text-2xl font-semibold tracking-tight text-[#102f49]">
            {step === 'choose' && 'Existing or former student?'}
            {step === 'returning' && 'Returning / Old Student'}
            {step === 'alumni' && 'Alumni verification'}
            {step === 'submitted' && 'Verification submitted'}
            {step === 'track' && 'Track your verification'}
          </h2>
        </div>

        {step === 'choose' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => setStep('returning')} className="rounded-2xl border border-[#dce7ef] p-4 text-left transition hover:border-[#0a439b]">
              <History className="mb-2 size-5 text-[#0a439b]" />
              <p className="font-semibold text-[#102f49]">Returning / Old Student</p>
              <p className="mt-1 text-xs text-[#587387]">Recover access to an existing RMC student record.</p>
            </button>
            <button type="button" onClick={() => setStep('alumni')} className="rounded-2xl border border-[#dce7ef] p-4 text-left transition hover:border-[#0a439b]">
              <GraduationCap className="mb-2 size-5 text-[#0a439b]" />
              <p className="font-semibold text-[#102f49]">Alumni</p>
              <p className="mt-1 text-xs text-[#587387]">Verify your identity and link your historical record.</p>
            </button>
            <button type="button" onClick={() => setStep('track')} className="rounded-2xl border border-[#dce7ef] p-4 text-left transition hover:border-[#0a439b] sm:col-span-2">
              <UserRound className="mb-2 size-5 text-[#0a439b]" />
              <p className="font-semibold text-[#102f49]">Already submitted? Track your verification</p>
            </button>
          </div>
        )}

        {step === 'returning' && (
          <>
            {formFields}
            <button type="button" onClick={() => void submit('returning')} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a439b] py-3.5 text-sm font-semibold text-white hover:bg-[#083980] disabled:opacity-55">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Submit verification
            </button>
          </>
        )}

        {step === 'alumni' && (
          <>
            {formFields}
            {!verificationId ? (
              <button type="button" onClick={() => void submit('alumni')} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a439b] py-3.5 text-sm font-semibold text-white hover:bg-[#083980] disabled:opacity-55">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Continue to ID upload
              </button>
            ) : (
              <div className="space-y-3 rounded-xl border border-[#dce7ef] p-4">
                <p className="text-sm font-semibold text-[#102f49]">Upload a valid ID</p>
                <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} className="block w-full text-xs" />
                {idFile && <p className="text-xs text-emerald-700">Selected: {idFile.name}</p>}
                <button type="button" onClick={() => void uploadId()} disabled={loading || !idFile} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a439b] py-3 text-sm font-semibold text-white hover:bg-[#083980] disabled:opacity-55">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />} Upload identification
                </button>
              </div>
            )}
          </>
        )}

        {step === 'submitted' && (
          <div className="space-y-4">
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Your request is pending Registrar review. Keep this reference number:
              <strong className="ml-1">{verificationId}</strong>
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep('track')} className="rounded-xl border border-[#bed1e0] px-4 py-2 text-xs font-semibold text-[#0a439b]">Track status</button>
              <Link href="/login" className="rounded-xl bg-[#0a439b] px-4 py-2 text-xs font-semibold text-white">Back to login</Link>
            </div>
          </div>
        )}

        {step === 'track' && (
          <div className="space-y-3">
            <input placeholder="Reference number" value={trackId} onChange={(e) => setTrackId(e.target.value)} className="w-full rounded-xl border border-[#bed1e0] bg-[#f8fbfd] px-3 py-2.5 text-sm" />
            <input type="email" placeholder="Email used in the request" value={trackEmail} onChange={(e) => setTrackEmail(e.target.value)} className="w-full rounded-xl border border-[#bed1e0] bg-[#f8fbfd] px-3 py-2.5 text-sm" />
            <button type="button" onClick={() => void track()} disabled={loading || !trackId || !trackEmail} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a439b] py-3 text-sm font-semibold text-white hover:bg-[#083980] disabled:opacity-55">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Check status
            </button>
            {trackResult && (
              <p className="rounded-xl border border-[#dce7ef] bg-[#f8fbfd] p-4 text-sm capitalize text-[#102f49]">
                Status: {trackResult}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
