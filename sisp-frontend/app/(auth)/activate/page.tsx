'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { admissionApi } from '@/lib/api/admission';
import { Loader2, ArrowLeft, CheckCircle2, ShieldCheck, KeyRound, Sparkles } from 'lucide-react';

export default function ActivatePage() {
  const [studentNumber, setStudentNumber] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNumber || !dob || !email) {
      toast.error('Please fill in all fields to verify identity.');
      return;
    }

    setLoading(true);
    try {
      const res = await admissionApi.activateStudentAccount(studentNumber, dob, email);
      setResult(res);
      toast.success('Account successfully verified and activated!');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Verification failed. Please check your credentials.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center text-sm font-semibold text-[#0a439b] hover:text-[#083980]"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Login
          </Link>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" /> Flow B: Existing Student
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-[#102f49] flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-[#0a439b]" />
              Activate Portal Account
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              For enrolled Regis Marie College students claiming portal access for the first time.
            </p>
          </div>

          {result ? (
            <div className="space-y-5 rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
              <div className="flex items-center gap-2.5 text-emerald-800">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <h3 className="font-bold text-sm">Account Activated!</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {result.instructions}
              </p>
              <div className="rounded-lg bg-white p-3.5 border border-emerald-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student No:</span>
                  <span className="font-semibold text-slate-800">{result.studentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-semibold text-slate-800">{result.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Temp Password:</span>
                  <span className="font-mono font-bold text-[#0a439b]">{result.temporaryPassword}</span>
                </div>
              </div>

              <Link
                href="/login"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0a439b] py-3 text-xs font-semibold text-white shadow-sm hover:bg-[#083980]"
              >
                Proceed to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Student Number</label>
                <input
                  type="text"
                  placeholder="e.g. 2026-0001"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs outline-none focus:border-[#0a439b] focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs outline-none focus:border-[#0a439b] focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Personal / Institutional Email</label>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs outline-none focus:border-[#0a439b] focus:bg-white"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0a439b] py-3 text-xs font-semibold text-white shadow-sm hover:bg-[#083980] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Verifying Record...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Claim & Activate Account
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
