'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authApi } from '@/lib/api/auth';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') ?? '');
  }, []);

  const isValid =
    token.length > 0 &&
    newPassword.length >= 8 &&
    /[a-z]/.test(newPassword) &&
    /[A-Z]/.test(newPassword) &&
    /\d/.test(newPassword) &&
    newPassword === confirmPassword;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid) return;
    setLoading(true);
    try {
      await authApi.resetPassword(token, newPassword);
      setDone(true);
      toast.success('Password updated. You can sign in now.');
      setTimeout(() => router.push('/login'), 1500);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'This reset link is invalid or has expired.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 rounded-2xl border border-[#dce7ef] bg-white p-6 text-left shadow-[0_14px_36px_rgba(16,47,73,0.08)] sm:p-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#0a439b]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0a439b]">
            Account recovery
          </span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-[#102f49]">Set a new password</h2>
      </div>

      {!token ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This page requires a valid reset link from your email.
        </p>
      ) : done ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Password updated. Redirecting to sign in...
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="text-sm font-semibold text-[#102f49]">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-xl border border-[#bed1e0] bg-[#f8fbfd] px-4 py-3 text-sm outline-none transition focus:border-[#0a439b] focus:ring-2 focus:ring-[#0a439b]/15"
            />
            <p className="text-xs text-[#6c879a]">
              8-64 characters with at least one uppercase letter, one lowercase letter, and one
              number.
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-semibold text-[#102f49]">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-xl border border-[#bed1e0] bg-[#f8fbfd] px-4 py-3 text-sm outline-none transition focus:border-[#0a439b] focus:ring-2 focus:ring-[#0a439b]/15"
            />
          </div>
          <button
            type="submit"
            disabled={!isValid || loading}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0a439b] py-3.5 text-sm font-semibold text-white transition hover:bg-[#083980] disabled:opacity-55"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}
          </button>
        </form>
      )}
    </div>
  );
}
