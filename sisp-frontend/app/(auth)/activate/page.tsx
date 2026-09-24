'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { authApi } from '@/lib/api/auth';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, ShieldCheck } from 'lucide-react';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export default function ActivatePage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') ?? '');
  }, []);

  const validPassword =
    password.length >= 8 && password.length <= 64 && PASSWORD_PATTERN.test(password);

  const requestConfirmation = (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      toast.error('Open the secure activation link sent to your email.');
      return;
    }
    if (!validPassword) {
      toast.error('Use 8–64 characters with at least one uppercase letter, one lowercase letter, and one number.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('The passwords do not match.');
      return;
    }
    setConfirmOpen(true);
  };

  const savePassword = async () => {
    setLoading(true);
    try {
      const response = await authApi.activateStudentAccount(token, password);
      setDone(true);
      setConfirmOpen(false);
      setPassword('');
      setConfirmPassword('');
      toast.success(response.message);
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'This activation link is invalid or has expired.');
      setConfirmOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-md space-y-6">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0a439b] hover:text-[#083980]">
          <ArrowLeft className="size-4" /> Back to Login
        </Link>

        <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#0a439b]">
              <ShieldCheck className="size-3.5" /> Secure student activation
            </span>
            <h1 className="mt-4 flex items-center gap-2 text-2xl font-bold text-[#102f49]">
              <KeyRound className="size-5 text-[#0a439b]" /> Set your password
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Choose and confirm the password you will use to sign in to SISP. The email link is single-use and expires after 30 minutes.
            </p>
          </div>

          {!token ? (
            <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              This page needs the secure activation link sent to your email. Request help from the Registrar if it has expired.
            </p>
          ) : done ? (
            <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="size-5" />
                <h2 className="font-semibold">Password saved</h2>
              </div>
              <p className="text-sm leading-6 text-emerald-900">
                Your password is set. You are not signed in yet; log in with your account email and the password you just saved.
              </p>
              <Link href="/login" className="flex w-full justify-center rounded-xl bg-[#0a439b] px-4 py-3 text-sm font-semibold text-white hover:bg-[#083980]">
                Go to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={requestConfirmation} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="activation-password" className="text-sm font-semibold text-[#102f49]">New password</label>
                <input
                  id="activation-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={64}
                  required
                  className="w-full rounded-xl border border-[#bed1e0] bg-[#f8fbfd] px-4 py-3 text-sm outline-none focus:border-[#0a439b] focus:ring-2 focus:ring-[#0a439b]/15"
                />
                <p className="text-xs text-slate-500">8–64 characters, including uppercase, lowercase, and a number.</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="activation-confirm-password" className="text-sm font-semibold text-[#102f49]">Confirm password</label>
                <input
                  id="activation-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={64}
                  required
                  className="w-full rounded-xl border border-[#bed1e0] bg-[#f8fbfd] px-4 py-3 text-sm outline-none focus:border-[#0a439b] focus:ring-2 focus:ring-[#0a439b]/15"
                />
              </div>
              <button
                type="submit"
                disabled={!validPassword || password !== confirmPassword || loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a439b] py-3 text-sm font-semibold text-white transition hover:bg-[#083980] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                Review and save password
              </button>
            </form>
          )}
        </section>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="confirm-password-title" className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 id="confirm-password-title" className="text-lg font-bold text-[#102f49]">Are you sure about this password?</h2>
            <p className="text-sm leading-6 text-slate-600">
              Make sure you remember and save it somewhere secure. After setting it, you must log in again using this password.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={loading} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">
                Go back
              </button>
              <button type="button" onClick={() => void savePassword()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-[#0a439b] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-55">
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                {loading ? 'Saving…' : 'Yes, save it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
