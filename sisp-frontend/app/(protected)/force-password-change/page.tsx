'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ShieldAlert, KeyRound, Loader2, Check, X, Eye, EyeOff } from 'lucide-react';

export default function ForcePasswordChangePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password Validation Rules
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);
  const matchesConfirm = newPassword && newPassword === confirmPassword;

  const isFormValid = hasMinLength && hasLetter && hasNumber && hasSpecial && matchesConfirm;

  // Strength score calculation
  const strengthScore = [hasMinLength, hasLetter, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthLabels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = [
    'bg-slate-200',
    'bg-rose-500',
    'bg-amber-500',
    'bg-indigo-500',
    'bg-emerald-500',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    try {
      await authApi.changePassword(newPassword);
      
      // Update state in Zustand store
      useAuthStore.setState((state) => ({
        user: state.user ? { ...state.user, mustChangePassword: false } : null,
      }));

      toast.success('Password changed successfully! Welcome back.');
      
      // Redirect to correct dashboard based on role
      if (user?.role === 'admin_staff') {
        router.push('/admin/dashboard');
      } else if (user?.role === 'dean') {
        router.push('/dean/exceptions');
      } else if (user?.role === 'faculty') {
        router.push('/faculty/grades');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message ?? 'Failed to update password. Please try again.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-900 px-4 font-sans select-none overflow-y-auto py-12">
      
      {/* Background Depth Ambient Blobs */}
      <div className="absolute top-[10%] left-[5%] h-[350px] w-[350px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none animate-pulse duration-[6s]" />
      <div className="absolute bottom-[10%] right-[10%] h-[380px] w-[380px] rounded-full bg-violet-600/5 blur-[130px] pointer-events-none" />

      {/* Auth Wrapper */}
      <div className="relative z-10 w-full max-w-md px-2 flex flex-col items-center">
        
        {/* Card Panel */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 w-full text-left space-y-6">
          
          {/* Header */}
          <div className="space-y-2 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <KeyRound className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-2">Security Enforcement</span>
            <h2 className="text-xl font-black text-slate-900">
              Reset Temporary Password
            </h2>
            <p className="text-xs text-slate-500 font-medium max-w-xs leading-relaxed">
              This is your first time logging in. For your account\'s absolute security, please set a new personal password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            
            {/* New Password */}
            <div className="space-y-1.5">
              <label htmlFor="newPassword" className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                New Password
              </label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter new secure password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl text-xs transition duration-200 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 transition-colors"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl text-xs transition duration-200 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {newPassword && (
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                  <span>Strength:</span>
                  <span className={strengthScore >= 3 ? 'text-emerald-600' : strengthScore >= 2 ? 'text-indigo-600' : 'text-rose-500'}>
                    {strengthLabels[strengthScore]}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        strengthScore >= step ? strengthColors[strengthScore] : 'bg-slate-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Rules Checklist */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2.5">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Password Safety Rules:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-600 font-medium">
                <div className="flex items-center gap-1.5">
                  {hasMinLength ? <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <X className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                  <span>8+ Characters</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasLetter ? <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <X className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                  <span>Letters (A-Z)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasNumber ? <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <X className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                  <span>Numbers (0-9)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasSpecial ? <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <X className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                  <span>Special Char (@,!)</span>
                </div>
              </div>
              
              {/* Matches feedback */}
              {confirmPassword && (
                <div className="pt-1.5 border-t border-slate-200/50 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                  {matchesConfirm ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="text-emerald-700">Passwords match perfectly</span>
                    </>
                  ) : (
                    <>
                      <X className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span className="text-rose-600">Passwords do not match yet</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading || !isFormValid}
              className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-1.5 disabled:opacity-55 disabled:pointer-events-none active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Updating Password...
                </>
              ) : (
                'Secure My Account'
              )}
            </Button>

          </form>

        </div>

      </div>
    </main>
  );
}
