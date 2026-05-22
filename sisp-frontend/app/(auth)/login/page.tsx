'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, GraduationCap, ArrowLeft, ShieldAlert } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, redirectByRole, isLoading } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

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

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* Back to Home Link */}
      <div className="flex justify-start">
        <Link 
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-[#1e3a8a] transition-all duration-300 group shadow-sm"
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
            <div className="h-7 w-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
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
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 rounded-xl text-xs transition-all duration-300 outline-none"
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
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 rounded-xl text-xs transition-all duration-300 outline-none"
              {...register('password')}
            />
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

        <div className="border-t border-slate-100 pt-4 text-center">
          <p className="text-xs text-slate-500 font-medium">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-bold text-[#1e3a8a] hover:text-[#1e3a8a]/80 underline underline-offset-4 transition-colors"
            >
              Register here
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}