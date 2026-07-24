'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export default function RegisterPage() {
  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex justify-start">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#0A439B]/8 border border-[#0A439B]/10 text-xs font-bold text-[#0A439B] transition-all duration-300 group"
          style={{ borderRadius: '6px' }}
        >
          <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform duration-300" />
          Back to Home
        </Link>
      </div>

      <div
        className="bg-white border border-[#0A439B]/10 p-6 sm:p-8 w-full text-center space-y-6"
        style={{ borderRadius: '8px' }}
      >
        <div className="space-y-2 flex flex-col items-center">
          <div
            className="h-12 w-12 border border-[#0A439B]/20 flex items-center justify-center"
            style={{ borderRadius: '8px' }}
          >
            <ShieldAlert className="h-6 w-6 text-[#0A439B]" />
          </div>
          <span className="text-[10px] font-bold text-[#0A439B] uppercase tracking-widest mt-2">
            Access Restricted
          </span>
          <h2 className="text-2xl font-black text-[#0A439B]">Registration Disabled</h2>
          <p className="text-xs text-[#0A439B]/70 font-medium max-w-sm leading-relaxed">
            Public self-registration is closed. Accounts are securely provisioned exclusively by the Academic Registrar and Administration.
          </p>
        </div>

        <div
          className="p-4 bg-[#F4F6F9] border border-[#0A439B]/10 text-left space-y-2 text-xs text-[#0A439B]/80"
          style={{ borderRadius: '8px' }}
        >
          <p className="font-semibold text-[#0A439B]">For Students:</p>
          <p className="leading-relaxed">
            Please obtain your auto-generated credentials directly from the Registrar office. Your temporary password is set to your Surname followed by the last 4 digits of your student number.
          </p>
          <p className="font-semibold text-[#0A439B] pt-2">For Faculty and Staff:</p>
          <p className="leading-relaxed">
            Contact the System Administrator to receive your official institutional email and temporary access password.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="block w-full py-3.5 bg-[#0A439B] text-white font-bold text-xs text-center transition-opacity hover:opacity-90"
            style={{ borderRadius: '6px' }}
          >
            Proceed to Login Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
