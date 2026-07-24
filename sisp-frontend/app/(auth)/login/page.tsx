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

      // Direct login (no MFA) — shouldn't happen with new flow but kept for safety
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
      <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="flex justify-start">
          <button
            onClick={() => { setMfaRequired(false); setOtpCode(''); setServerError(null); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#0A439B]/8 border border-[#0A439B]/10 text-xs font-bold text-[#0A439B] transition-all duration-300 group"
            style={{borderRadius:'6px'}}
          >
            <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform duration-300" />
            Back to Login
          </button>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 w-full text-left space-y-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#0A439B]/8 border border-[#0A439B]/10 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-[#0A439B]" />
              </div>
              <span className="text-[10px] font-bold text-[#0A439B] uppercase tracking-widest">MFA VERIFICATION</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              Enter OTP Code
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              A 6-digit verification code has been generated for <strong>{mfaUser?.email}</strong>. Check the server console for the OTP code.
            </p>
          </div>

          {serverError && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs text-red-300 flex items-start gap-2 animate-pulse">
              <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
              <span>{serverError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="otpCode" className="text-xs font-bold text-slate-700 uppercase tracking-wide">
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
              className="w-full px-4 py-3 bg-[#F4F6F9] border border-[#0A439B]/10 hover:border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 rounded-xl text-2xl text-center tracking-[0.5em] font-mono transition-all duration-300 outline-none"
            />
          </div>

          <button
            onClick={onVerifyMfa}
            className="w-full mt-4 py-3.5 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-1.5 disabled:opacity-55 disabled:pointer-events-none"
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
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* Back to Home Link */}
      <div className="flex justify-start">
        <Link 
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#F4F6F9] border border-[#0A439B]/10 text-xs font-bold text-[#1e3a8a] transition-all duration-300 group shadow-sm"
        >
          <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform duration-300" />
          Back to Home
        </Link>
      </div>

      {/* Card Panel */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 w-full text-left space-y-6">
        
        {/* Header */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#0A439B]/8 border border-[#0A439B]/10 flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-[#1e3a8a]" />
            </div>
            <span className="text-[10px] font-bold text-[#1e3a8a] uppercase tracking-widest">SISP SECURE PORTAL</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            Sign In
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Enter your institutional email and password to access SISP.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Server error */}
          {serverError && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs text-red-300 flex items-start gap-2 animate-pulse">
              <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@rmc.edu.ph"
              autoComplete="email"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-[#F4F6F9] border border-[#0A439B]/10 hover:border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 rounded-xl text-xs transition-all duration-300 outline-none"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-[10px] font-semibold text-red-400">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-xs font-bold text-slate-700 uppercase tracking-wide">
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
                className="w-full pl-4 pr-11 py-3 bg-[#F4F6F9] border border-[#0A439B]/10 hover:border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 rounded-xl text-xs transition-all duration-300 outline-none"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-[10px] font-semibold text-red-400">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <button 
            type="submit" 
            className="w-full mt-4 py-3.5 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-1.5 disabled:opacity-55 disabled:pointer-events-none"
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