'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, GraduationCap, ArrowLeft, ShieldAlert } from 'lucide-react';

const registerSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(64, 'Password must not exceed 64 characters'),
    confirmPassword: z.string(),
    roleName: z.enum(['student', 'faculty', 'admin_staff', 'dean'], {
      errorMap: () => ({ message: 'Please select a role' }),
    }),
    consent: z.boolean().refine((val) => val === true, {
      message:
        'You must consent to data collection under RA 10173 (Data Privacy Act of 2012)',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register: registerUser, redirectByRole, isLoading } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      consent: false,
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      await registerUser(data.email, data.password, data.roleName);
      toast.success('Registration successful! Welcome to SISP.');
      redirectByRole();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message =
        err?.response?.data?.message ?? 'Registration failed. Please try again.';
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-indigo-300 hover:text-white transition-all duration-300 group shadow-sm"
        >
          <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform duration-300" />
          Back to Home
        </Link>
      </div>

      {/* Glassmorphic Portal Panel */}
      <div className="bg-white/[0.02] border border-white/[0.07] backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:border-white/10 transition-all duration-300 w-full text-left space-y-6">
        
        {/* Header */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-indigo-400" />
            </div>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">SISP REGISTER PORTAL</span>
          </div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Create Account
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Register with your institutional credentials.
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
            <label htmlFor="email" className="text-xs font-bold text-slate-300 uppercase tracking-wide">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@rmc.edu.ph"
              autoComplete="email"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 hover:border-white/20 text-white placeholder-slate-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 backdrop-blur-md rounded-xl text-xs transition-all duration-300 outline-none"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-[10px] font-semibold text-red-400">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label htmlFor="role" className="text-xs font-bold text-slate-300 uppercase tracking-wide">
              Institutional Role
            </label>
            <select
              id="role"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 hover:border-white/20 text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 backdrop-blur-md rounded-xl text-xs transition-all duration-300 outline-none appearance-none"
              defaultValue=""
              onChange={(e) =>
                setValue(
                  'roleName',
                  e.target.value as RegisterFormData['roleName'],
                  { shouldValidate: true },
                )
              }
            >
              <option value="" disabled className="bg-slate-900 text-slate-400">Select your role</option>
              <option value="student" className="bg-slate-900 text-white">Student</option>
              <option value="faculty" className="bg-slate-900 text-white">Faculty</option>
              <option value="admin_staff" className="bg-slate-900 text-white">Admin Staff</option>
              <option value="dean" className="bg-slate-900 text-white">Dean</option>
            </select>
            {errors.roleName && (
              <p className="text-[10px] font-semibold text-red-400">
                {errors.roleName.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-bold text-slate-300 uppercase tracking-wide">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 hover:border-white/20 text-white placeholder-slate-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 backdrop-blur-md rounded-xl text-xs transition-all duration-300 outline-none"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-[10px] font-semibold text-red-400">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-xs font-bold text-slate-300 uppercase tracking-wide">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 hover:border-white/20 text-white placeholder-slate-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 backdrop-blur-md rounded-xl text-xs transition-all duration-300 outline-none"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-[10px] font-semibold text-red-400">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Consent checkbox — RA 10173 */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-start space-x-2.5">
              <input
                id="consent"
                type="checkbox"
                checked={consentChecked}
                disabled={isLoading}
                className="mt-0.5 h-3.5 w-3.5 rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500/20 focus:ring-opacity-25 accent-indigo-600"
                onChange={(e) => {
                  const value = e.target.checked;
                  setConsentChecked(value);
                  setValue('consent', value, { shouldValidate: true });
                }}
              />
              <label
                htmlFor="consent"
                className="text-[10px] leading-relaxed text-slate-400 cursor-pointer select-none"
              >
                I consent to the collection and processing of my personal data by Regis Marie College in accordance with{' '}
                <span className="font-bold text-slate-200">
                  RA 10173 (Data Privacy Act of 2012)
                </span>
                . My data will be used solely for academic and administrative purposes.
              </label>
            </div>
            {errors.consent && (
              <p className="text-[10px] font-semibold text-red-400">
                {errors.consent.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <button 
            type="submit" 
            className="w-full mt-4 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-1.5 disabled:opacity-55 disabled:pointer-events-none"
            disabled={isLoading || !consentChecked}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Footer info inside card */}
        <div className="border-t border-white/[0.06] pt-4 text-center">
          <p className="text-xs text-slate-400 font-medium">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-bold text-indigo-400 hover:text-indigo-300 underline underline-offset-4 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}