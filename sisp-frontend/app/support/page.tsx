'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, Search, X, LifeBuoy, Mail, Phone, MapPin, ChevronDown } from 'lucide-react';

export default function SupportPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "How do I log into the SISP Portal?",
      a: "You can log in using your official Regis Marie College email address and the initial password provided during your enrollment. If you forgot your password, please click on 'Forgot Password' on the login page."
    },
    {
      q: "Can the AI Advisor process enrollment changes?",
      a: "No, the AI Advisor provides guidance and recommendations based on your curriculum. To make official changes, you must submit a Service Request through the portal for Registrar approval."
    },
    {
      q: "How long does document processing take?",
      a: "Standard document requests (like TOR) take 3-5 working days. You can track the real-time status of your request directly from your student dashboard."
    },
    {
      q: "Who should I contact if I notice an error in my grades?",
      a: "Please submit a 'Grade Verification' request under the Administrative Services tab. The system will securely route your request to the Dean and Registrar for review."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col overflow-x-hidden">
      
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-lg">
                R
              </div>
              <span className="font-bold text-lg tracking-tight hidden sm:block text-[#1e3a8a]">SISP Portal</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors hidden sm:flex">
              <Search className="w-5 h-5" />
            </button>
            <Link 
              href="/login"
              className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-semibold py-2 px-6 rounded-lg transition-colors text-sm shadow-sm"
            >
              Login
            </Link>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-2 shadow-lg absolute w-full">
            <Link href="/about" className="block px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">About</Link>
            <Link href="/services" className="block px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">Services</Link>
            <Link href="/support" className="block px-4 py-3 text-[#1e3a8a] bg-blue-50 rounded-lg font-bold">Support</Link>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="bg-slate-50 py-16 md:py-24 border-b border-slate-100">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
            <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-2xl mb-4 text-[#1e3a8a]">
              <LifeBuoy className="w-8 h-8" />
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-[#0f172a] tracking-tight">
              Support Center
            </h1>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-medium">
              Need help navigating the portal or have academic questions? We're here to support you.
            </p>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16 md:py-24 px-4 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* FAQ Section */}
          <div className="lg:col-span-7 space-y-8">
            <h2 className="text-2xl font-bold text-slate-900">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <button 
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full text-left p-5 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-bold text-slate-800">{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === index && (
                    <div className="p-5 pt-0 text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Section */}
          <div className="lg:col-span-5 space-y-8">
            <h2 className="text-2xl font-bold text-slate-900">Contact Us</h2>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-[#1e3a8a]" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Campus Address</h4>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Regis Marie College<br/>
                    123 Academic Way, Education District<br/>
                    Metro Manila, Philippines
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-[#1e3a8a]" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Email Us</h4>
                  <p className="text-sm text-slate-600 mt-1">support@regismarie.edu.ph<br/>registrar@regismarie.edu.ph</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-[#1e3a8a]" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Call Us</h4>
                  <p className="text-sm text-slate-600 mt-1">+63 (2) 8123 4567<br/>Mon-Fri, 8:00 AM - 5:00 PM</p>
                </div>
              </div>
            </div>
            
            <div className="bg-[#1e3a8a] rounded-2xl p-6 text-white space-y-4">
              <h3 className="font-bold text-lg">Still need help?</h3>
              <p className="text-sm text-blue-100 opacity-90 leading-relaxed">
                Log into your dashboard and use the AI Advisory Chat System for instant answers, or submit a direct support ticket.
              </p>
              <Link href="/login" className="inline-block mt-2 bg-white text-[#1e3a8a] text-sm font-bold px-5 py-2.5 rounded-lg">
                Go to Dashboard
              </Link>
            </div>
          </div>

        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white py-12 px-4 border-t border-slate-100 text-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-lg">
                R
              </div>
              <span className="text-slate-500 font-medium text-xs">
                &copy; {new Date().getFullYear()} Regis Marie College.<br/>All Rights Reserved.
              </span>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-slate-500 font-medium">
            <Link href="/about" className="hover:text-[#1e3a8a] transition-colors">About SISP</Link>
            <Link href="/privacy" className="hover:text-[#1e3a8a] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#1e3a8a] transition-colors">Terms of Service</Link>
            <Link href="/support" className="text-[#1e3a8a] transition-colors font-bold">Contact Us</Link>
          </div>

          <div className="flex items-center gap-4 text-slate-400 font-bold text-xs">
            <a href="#" aria-label="Facebook" className="hover:text-[#1e3a8a] transition-colors">FB</a>
            <a href="#" aria-label="Twitter" className="hover:text-[#1e3a8a] transition-colors">TW</a>
            <a href="#" aria-label="Instagram" className="hover:text-[#1e3a8a] transition-colors">IG</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
