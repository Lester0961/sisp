'use client';

import React, { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { PublicNavbar } from '@/components/shared/PublicNavbar';
import { PublicFooter } from '@/components/shared/PublicFooter';
import Link from 'next/link';

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const faqs = [
    {
      q: "Where can I check a service request?",
      a: "Sign in to SISP and open Service Requests to review requests associated with your account."
    },
    {
      q: "Is my data secure?",
      a: "SISP restricts portal records according to account permissions. Refer to Regis Marie College's official privacy notice for the institution's privacy practices."
    },
    {
      q: "How do I reset my portal password?",
      a: "A password reset is not available in SISP. Follow the current support instructions published by Regis Marie College."
    }
  ];



  return (
    <div className="public-site public-interior min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-x-hidden relative selection:bg-teal-500 selection:text-white">
      
      {/* Background Mesh Gradients */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[150px] pointer-events-none -z-10" />
      <div className="absolute top-[30%] right-10 w-[500px] h-[500px] bg-indigo-50/50 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Shared Navbar */}
      <PublicNavbar />

      <main className="flex-1 flex flex-col">
        {/* Header Section */}
        <section className="px-4 sm:px-6 lg:px-8 pt-28 pb-12 max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-none">
            How can we help today?
          </h1>
          <p className="text-base sm:text-lg text-slate-500 leading-relaxed font-semibold max-w-2xl mx-auto">
            Find answers to common questions and access SISP student services.
          </p>
          
          {/* Main search bar */}
          <div className="relative max-w-lg mx-auto pt-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <label className="sr-only" htmlFor="support-faq-search">Search frequently asked questions</label>
            <input
              id="support-faq-search"
              type="text" 
              placeholder="Search frequently asked questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm shadow-md shadow-slate-100/40 focus:outline-none focus:border-[#0d2c7f] text-slate-900 placeholder-slate-400"
            />
          </div>
        </section>

        {/* Content Section */}
        <section className="px-4 sm:px-6 lg:px-8 py-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* FAQ Column (Left) */}
          <div className="lg:col-span-7 space-y-8">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <HelpCircleIcon className="w-6 h-6 text-slate-800" />
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-4">
              {faqs.filter(faq => !searchQuery || faq.q.toLowerCase().includes(searchQuery.toLowerCase()) || faq.a.toLowerCase().includes(searchQuery.toLowerCase())).map((faq, index) => (
                <div 
                  key={index} 
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
                >
                  <button 
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full text-left p-5 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-extrabold text-slate-800 text-sm sm:text-base leading-snug">{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-250 ${openFaq === index ? 'rotate-180 text-teal-600' : ''}`} />
                  </button>
                  {openFaq === index && (
                    <div className="p-5 pt-0 text-slate-500 text-sm leading-relaxed border-t border-slate-100 bg-slate-50/20 font-semibold animate-in fade-in duration-200">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact information is omitted until verified institutional details are supplied. */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-100/50 sm:p-8">
              <h3 className="text-lg font-extrabold text-slate-900">Portal support</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                This page does not receive support tickets. Sign in to access student services and review your request status. For other assistance, use the published Regis Marie College contact details below.
              </p>
              <Link
                href="/login"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0d2c7f] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0d2c7f]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d2c7f] focus-visible:ring-offset-2"
              >
                Sign in to SISP
              </Link>
            </div>
          </div>

        </section>
      </main>

      {/* Shared Footer */}
      <PublicFooter />
    </div>
  );
}

// Simple Helper Icon component to display FAQ icon
function HelpCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}
