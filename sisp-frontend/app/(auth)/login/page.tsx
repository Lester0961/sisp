'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { Loader2, GraduationCap, ArrowLeft, ShieldAlert, Eye, EyeOff, ShieldCheck } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, redirectByRole, isLoading } = useAuth();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaUser, setMfaUser] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      const response = await login(data.email, data.password);

      // Check if MFA is required
      if (response.mfaRequired) {
        setMfaRequired(true);
        setMfaToken(response.mfaToken);
        setMfaUser(response.user);
        toast.info('Please enter the OTP code sent to your account.');
        return;
      }

      // Direct login remains supported for accounts that do not require MFA.
      toast.success('Welcome back!');
      redirectByRole(response.user.role);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message =
        err?.response?.data?.message ?? 'Login failed. Please try again.';
      setServerError(message);
      toast.error(message);
    }
  };

  const onVerifyMfa = async () => {
    if (otpCode.length !== 6) {
      toast.error('Please enter a 6-digit OTP code.');
      return;
    }

    setMfaLoading(true);
    setServerError(null);
    try {
      const response = await authApi.verifyMfa({ mfaToken, otpCode });
      // Set auth state with the full response
      setAuth(response.user, response.accessToken, response.refreshToken);
      toast.success('Welcome back!');
      redirectByRole(response.user.role);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message =
        err?.response?.data?.message ?? 'MFA verification failed. Please try again.';
      setServerError(message);
      toast.error(message);
    } finally {
      setMfaLoading(false);
    }
  };

  // MFA Verification Screen
  if (mfaRequired) {
    return (
      <div className="w-full space-y-5">
        <div className="flex justify-start">
          <button
            onClick={() => { setMfaRequired(false); setOtpCode(''); setServerError(null); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#bed1e0] bg-white px-3 py-2 text-xs font-semibold text-[#0a439b] transition hover:bg-[#eef6fc] group"
          >
            <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform duration-300" />
            Back to Login
          </button>
        </div>

        <div className="w-full space-y-6 rounded-2xl border border-[#dce7ef] bg-white p-6 text-left shadow-[0_14px_36px_rgba(16,47,73,0.08)] sm:p-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#0A439B]/8 border border-[#0A439B]/10 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-[#0A439B]" />
              </div>
              <span className="text-[10px] font-semibold text-[#0a439b] uppercase tracking-[0.12em]">Account verification</span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#102f49]">
              Enter OTP Code
            </h2>
            <p className="text-sm leading-6 text-[#587387]">
              Enter the 6-digit verification code sent to <strong>{mfaUser?.email}</strong>.
            </p>
          </div>

          {serverError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{serverError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="otpCode" className="text-sm font-semibold text-[#102f49]">
              One-Time Password (OTP)
            </label>
            <input
              id="otpCode"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={mfaLoading}
              className="w-full rounded-xl border border-[#bed1e0] bg-[#f8fbfd] px-4 py-3 text-center font-mono text-2xl tracking-[0.45em] text-[#102f49] outline-none transition placeholder:text-slate-400 focus:border-[#0a439b] focus:ring-2 focus:ring-[#0a439b]/15"
            />
          </div>

          <button
            onClick={onVerifyMfa}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0a439b] py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#083980] disabled:pointer-events-none disabled:opacity-55"
            disabled={mfaLoading || otpCode.length !== 6}
          >
            {mfaLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                Verifying...
              </>
            ) : (
              'Verify & Sign In'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      
      {/* Back to Home Link */}
      <div className="flex justify-start">
        <Link 
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#bed1e0] bg-white px-3 py-2 text-xs font-semibold text-[#0a439b] transition hover:bg-[#eef6fc] group"
        >
          <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform duration-300" />
          Back to Home
        </Link>
      </div>

      {/* Card Panel */}
      <div className="w-full space-y-6 rounded-2xl border border-[#dce7ef] bg-white p-6 text-left shadow-[0_14px_36px_rgba(16,47,73,0.08)] sm:p-8">
        
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#0A439B]/8 border border-[#0A439B]/10 flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-[#1e3a8a]" />
            </div>
            <span className="text-[10px] font-semibold text-[#0a439b] uppercase tracking-[0.12em]">Secure portal</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#102f49]">
            Sign In
          </h2>
          <p className="text-sm leading-6 text-[#587387]">
            Enter your institutional email and password to access SISP.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Server error */}
          {serverError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-semibold text-[#102f49]">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@rmc.edu.ph"
              autoComplete="email"
              disabled={isLoading}
              className="w-full rounded-xl border border-[#bed1e0] bg-[#f8fbfd] px-4 py-3 text-sm text-[#102f49] outline-none transition placeholder:text-slate-400 focus:border-[#0a439b] focus:ring-2 focus:ring-[#0a439b]/15"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs font-medium text-red-700">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-semibold text-[#102f49]">
                Password
              </label>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isLoading}
                className="w-full rounded-xl border border-[#bed1e0] bg-[#f8fbfd] py-3 pl-4 pr-11 text-sm text-[#102f49] outline-none transition placeholder:text-slate-400 focus:border-[#0a439b] focus:ring-2 focus:ring-[#0a439b]/15"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs font-medium text-red-700">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <button 
            type="submit" 
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0a439b] py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#083980] disabled:pointer-events-none disabled:opacity-55"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                Signing in...
              </>
            ) : (
              'Sign In to Portal'
            )}
          </button>
        </form>



      </div>
    </div>
  );
}
