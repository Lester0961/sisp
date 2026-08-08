'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Check, Eye, EyeOff, KeyRound, Loader2, X } from 'lucide-react';

export default function ForcePasswordChangePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);
  const matchesConfirm = Boolean(newPassword) && newPassword === confirmPassword;
  const isFormValid = currentPassword.length > 0 && hasMinLength && hasLetter && hasNumber && hasSpecial && matchesConfirm;
  const strengthScore = [hasMinLength, hasLetter, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthLabel = ['Too weak', 'Too weak', 'Fair', 'Good', 'Strong'][strengthScore];

  const redirectAfterChange = () => {
    switch (user?.role) {
      case 'admin_staff':
      case 'sys_admin':
        router.push('/admin/dashboard');
        break;
      case 'dean':
        router.push('/dean/grades');
        break;
      case 'faculty':
        router.push('/faculty/grades');
        break;
      case 'live_agent':
        router.push('/live-agent');
        break;
      default:
        router.push('/dashboard');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      useAuthStore.setState((state) => ({
        user: state.user ? { ...state.user, mustChangePassword: false } : null,
      }));
      toast.success('Password updated. You can continue to the portal.');
      redirectAfterChange();
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Unable to update your password. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const passwordRules = [
    { label: 'At least 8 characters', passed: hasMinLength },
    { label: 'A letter', passed: hasLetter },
    { label: 'A number', passed: hasNumber },
    { label: 'A special character', passed: hasSpecial },
  ];

  return (
    <main className="portal-page flex min-h-[100dvh] items-center px-4 py-8">
      <section className="mx-auto w-full max-w-md">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[#eaf2fa] text-[#0a439b]">
            <KeyRound className="size-5" strokeWidth={1.8} />
          </div>
          <div>
            <p className="portal-section-label">Account security</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-[#102f49]">Choose a new password</h1>
          </div>
        </div>

        <div className="portal-surface p-6 sm:p-8">
          <p className="text-sm leading-6 text-[#587387]">
            Replace your temporary password before continuing to the portal.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <PasswordField
              id="currentPassword"
              label="Current password"
              placeholder="Enter your current password"
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrentPassword}
              onToggle={() => setShowCurrentPassword((visible) => !visible)}
              disabled={loading}
            />
            <PasswordField
              id="newPassword"
              label="New password"
              placeholder="Create a new password"
              value={newPassword}
              onChange={setNewPassword}
              show={showNewPassword}
              onToggle={() => setShowNewPassword((visible) => !visible)}
              disabled={loading}
            />
            <PasswordField
              id="confirmPassword"
              label="Confirm new password"
              placeholder="Enter the new password again"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((visible) => !visible)}
              disabled={loading}
            />

            <div className="rounded-xl border border-[#dce7ef] bg-[#f8fbfd] p-4" aria-live="polite">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#102f49]">Password strength</p>
                <p className={`text-xs font-semibold ${strengthScore >= 3 ? 'text-emerald-700' : strengthScore >= 2 ? 'text-amber-700' : 'text-[#587387]'}`}>
                  {newPassword ? strengthLabel : 'Start typing'}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1.5" aria-label={`Password strength: ${strengthLabel}`}>
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={`h-1.5 rounded-full ${strengthScore >= step ? strengthScore >= 4 ? 'bg-emerald-500' : strengthScore >= 2 ? 'bg-amber-500' : 'bg-rose-500' : 'bg-[#dce7ef]'}`}
                  />
                ))}
              </div>
              <ul className="mt-4 grid gap-2 text-xs text-[#587387] sm:grid-cols-2">
                {passwordRules.map((rule) => (
                  <li key={rule.label} className="flex items-center gap-2">
                    {rule.passed ? <Check className="size-3.5 text-emerald-600" /> : <X className="size-3.5 text-[#91aabd]" />}
                    {rule.label}
                  </li>
                ))}
              </ul>
              {confirmPassword && (
                <p className={`mt-3 border-t border-[#dce7ef] pt-3 text-xs font-medium ${matchesConfirm ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {matchesConfirm ? 'Passwords match.' : 'Passwords do not match yet.'}
                </p>
              )}
            </div>

            <Button type="submit" disabled={loading || !isFormValid} className="mt-2 w-full">
              {loading ? <><Loader2 className="size-4 animate-spin" /> Updating password</> : 'Update password'}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}

function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  show,
  onToggle,
  disabled,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-[#102f49]">{label}</label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          disabled={disabled}
          className="h-11 border-[#bed1e0] bg-[#f8fbfd] pr-11 text-sm focus-visible:ring-[#0a439b]/20"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#587387] hover:text-[#0a439b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a439b]"
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}
