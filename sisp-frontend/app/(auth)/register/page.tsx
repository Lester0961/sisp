'use client';

import Link from 'next/link';
import { GraduationCap, ArrowLeft, ShieldAlert } from 'lucide-react';

export default function RegisterPage() {
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
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 w-full text-center space-y-6">
        
        {/* Header */}
        <div className="space-y-2 flex flex-col items-center">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-amber-600" />
          </div>
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-2">Access Restrict</span>
          <h2 className="text-2xl font-black text-slate-900">
            Registration Disabled
          </h2>
          <p className="text-xs text-slate-500 font-medium max-w-sm leading-relaxed">
            Public self-registration is closed. Accounts are securely provisioned exclusively by the Academic Registrar and Administration.
          </p>
        </div>

        {/* Informational Message */}
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-left space-y-2 text-xs text-slate-600">
          <p className="font-semibold text-slate-800">For Students:</p>
          <p className="leading-relaxed">Please obtain your auto-generated credentials directly from the Registrar office. Your temporary password is set to your Surname followed by the last 4 digits of your student number.</p>
          <p className="font-semibold text-slate-800 pt-2">For Faculty and Staff:</p>
          <p className="leading-relaxed">Contact the System Administrator to receive your official institutional email and temporary access password.</p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Link href="/login" className="block w-full py-3.5 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-300">
            Proceed to Login Portal
          </Link>
        </div>

      </div>
    </div>
  );
}