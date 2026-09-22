'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { authApi } from '@/lib/api/auth';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await authApi.forgotPassword(email);
      setSent(true);
      toast.success(result.message);
    } catch {
      // The API always returns the same generic message; surface it too.
      setSent(true);
      toast.success('If the account exists, a password reset link has been sent.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-5">
      <div className="flex justify-start">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#bed1e0] bg-white px-3 py-2 text-xs font-semibold text-[#0a439b] transition hover:bg-[#eef6fc]"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Login
        </Link>
      </div>

      <div className="w-full space-y-6 rounded-2xl border border-[#dce7ef] bg-white p-6 text-left shadow-[0_14px_36px_rgba(16,47,73,0.08)] sm:p-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-[#102f49]">Reset password</h2>
          <p className="text-sm leading-6 text-[#587387]">
            Enter your institutional email. If an account exists, we will send a reset link valid
            for 30 minutes.
          </p>
        </div>

        {sent ? (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Check your inbox (and spam folder) for the reset link.</span>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-[#102f49]">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@rmc.edu.ph"
                className="w-full rounded-xl border border-[#bed1e0] bg-[#f8fbfd] px-4 py-3 text-sm text-[#102f49] outline-none transition focus:border-[#0a439b] focus:ring-2 focus:ring-[#0a439b]/15"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0a439b] py-3.5 text-sm font-semibold text-white transition hover:bg-[#083980] disabled:opacity-55"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
