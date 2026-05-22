'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Menu, Search, Shield, Bot, FileText, CheckCircle2, Lock, 
  MonitorSmartphone, Settings, Users, BookOpen, X, MessageSquare, Award, Clock, Layers
} from 'lucide-react';

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
            <Link href="/support" className="block px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">Support</Link>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="relative px-4 pt-12 pb-16 md:pt-24 md:pb-32 max-w-6xl mx-auto w-full flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-left space-y-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#0f172a] leading-[1.15] tracking-tight">
              Transforming your Academic Experience at Regis Marie College
            </h1>
            <p className="text-base md:text-lg text-slate-600 max-w-xl mx-auto md:mx-0 leading-relaxed font-medium">
              Access central records, request services, and get smart academic guidance — all online.
            </p>
            <div className="pt-4 flex justify-center md:justify-start">
              <Link 
                href="/register"
                className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                Get Started
              </Link>
            </div>
          </div>
          <div className="flex-1 w-full max-w-md md:max-w-full relative flex justify-center items-center">
            {/* Abstract Placeholder Illustration */}
            <div className="relative w-full aspect-square max-w-[400px] bg-slate-50 rounded-full flex items-center justify-center p-8 border border-slate-100 shadow-2xl shadow-teal-900/5">
              <div className="absolute top-10 right-10 w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center shadow-lg animate-bounce" style={{animationDuration: '3s'}}>
                <Bot className="w-12 h-12 text-teal-600" />
              </div>
              <div className="absolute bottom-12 left-8 w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                <FileText className="w-10 h-10 text-blue-600" />
              </div>
              <div className="w-40 h-40 bg-white rounded-3xl shadow-xl flex items-center justify-center z-10 border border-slate-100">
                <Users className="w-20 h-20 text-[#1e3a8a]" />
              </div>
              <div className="absolute bottom-24 right-4 bg-white py-1.5 px-3 rounded-full shadow-md text-xs font-bold text-teal-600 border border-teal-50 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                AI Advisor
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-slate-50/50 py-16 md:py-24 px-4 border-y border-slate-100">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#0f172a] tracking-tight">
                One Platform, Multiple Features
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mb-6">
                  <FileText className="w-7 h-7 text-teal-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Student Information</h3>
                <ul className="space-y-3">
                  {[
                    'Academic Records',
                    'Real-time Grades',
                    'Enrollment History',
                    'Curriculum Progress'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 font-medium">
                      <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#1e3a8a] shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Feature 2 */}
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                  <Settings className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Administrative Services</h3>
                <ul className="space-y-3">
                  {[
                    'Document Requests',
                    'Service Requests',
                    'Request Status Tracking',
                    'Online Processing'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 font-medium">
                      <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#1e3a8a] shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Feature 3 */}
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
                  <MessageSquare className="w-7 h-7 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">AI Academic Advisory</h3>
                <ul className="space-y-3">
                  {[
                    'Instant Answers',
                    'Intelligent Guidance',
                    'Hybrid NLP & Semantic Technology',
                    '24/7 Availability'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 font-medium">
                      <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#1e3a8a] shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 md:py-24 px-4 bg-white">
          <div className="max-w-6xl mx-auto space-y-12">
            <h2 className="text-2xl md:text-3xl font-bold text-[#0f172a] text-center tracking-tight">
              Benefits for Students & Staff
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
              <div className="space-y-3 text-center sm:text-left flex flex-col items-center sm:items-start">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-sm">
                  <Lock className="w-5 h-5 text-teal-600" />
                </div>
                <h4 className="font-bold text-slate-900">Centralized Records</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-[250px]">
                  Centralized secure academic records, fast retrieval and unified access.
                </p>
              </div>
              <div className="space-y-3 text-center sm:text-left flex flex-col items-center sm:items-start">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-sm">
                  <CheckCircle2 className="w-5 h-5 text-teal-600" />
                </div>
                <h4 className="font-bold text-slate-900">Efficient Service</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-[250px]">
                  Modern academic network hardware and efficient service delivery.
                </p>
              </div>
              <div className="space-y-3 text-center sm:text-left flex flex-col items-center sm:items-start">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-sm">
                  <BookOpen className="w-5 h-5 text-teal-600" />
                </div>
                <h4 className="font-bold text-slate-900">Better Academic Planning</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-[250px]">
                  AI-driven academic advisors facilitate better academic planning and forecasting.
                </p>
              </div>
              <div className="space-y-3 text-center sm:text-left flex flex-col items-center sm:items-start">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-sm">
                  <Clock className="w-5 h-5 text-teal-600" />
                </div>
                <h4 className="font-bold text-slate-900">Real-time Progress</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-[250px]">
                  Stay updated on your curriculum progress with real-time academic tracking.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Intelligent Academic Advisor Mockup */}
        <section className="bg-slate-50/80 py-16 md:py-24 px-4 overflow-hidden">
          <div className="max-w-5xl mx-auto space-y-16">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#0f172a] text-center tracking-tight">
              Intelligent Academic Advisor
            </h2>

            <div className="relative max-w-[320px] mx-auto">
              {/* Phone Mockup Frame */}
              <div className="relative bg-white border-[10px] border-slate-900 rounded-[3rem] h-[650px] w-full shadow-2xl overflow-hidden flex flex-col z-10">
                {/* Notch */}
                <div className="absolute top-0 inset-x-0 h-6 flex justify-center">
                  <div className="w-32 h-6 bg-slate-900 rounded-b-2xl"></div>
                </div>
                
                {/* App Header */}
                <div className="pt-10 pb-3 px-4 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-xs">R</div>
                  <span className="font-bold text-sm text-[#1e3a8a]">SISP Portal</span>
                </div>

                {/* Chat Area */}
                <div className="flex-1 bg-slate-50 p-4 space-y-4 overflow-y-auto">
                  <div className="flex justify-end">
                    <div className="bg-[#1e3a8a] text-white text-xs p-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm">
                      What subjects should I take next semester for BSIT?
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <div className="bg-white text-slate-600 text-xs p-3 rounded-2xl rounded-tl-sm border border-slate-100 shadow-sm space-y-2">
                      <p>Here is a list of courses that meet your prerequisites and curriculum track:</p>
                      <a href="#" className="text-blue-500 block break-all">https://www.regismarie.edu.ph/bsit/curriculum</a>
                      <p className="text-slate-400 italic">This is for advisory purposes, please consult your official advisor.</p>
                    </div>
                  </div>
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100">
                  <div className="bg-slate-50 border border-slate-200 rounded-full h-10 px-4 flex items-center text-xs text-slate-400">
                    Type a message...
                  </div>
                </div>
              </div>

              {/* Decorative Badges (Desktop Absolute, Mobile hidden or stacked) */}
              <div className="hidden md:flex absolute top-[20%] -left-32 bg-white px-4 py-2 rounded-xl shadow-lg border border-slate-100 items-center gap-2">
                <div className="bg-green-100 p-1.5 rounded-lg"><MonitorSmartphone className="w-4 h-4 text-green-600" /></div>
                <div className="text-xs font-bold text-slate-700">NLP<br/><span className="font-normal text-slate-500 text-[10px]">Processing</span></div>
              </div>
              
              <div className="hidden md:flex absolute top-[50%] -left-36 bg-white px-4 py-2 rounded-xl shadow-lg border border-slate-100 items-center gap-2">
                <div className="bg-teal-100 p-1.5 rounded-lg"><Search className="w-4 h-4 text-teal-600" /></div>
                <div className="text-xs font-bold text-slate-700">Semantic<br/><span className="font-normal text-slate-500 text-[10px]">Search</span></div>
              </div>

              <div className="hidden md:flex absolute top-[30%] -right-32 bg-white px-4 py-2 rounded-xl shadow-lg border border-slate-100 items-center gap-2">
                <div className="bg-indigo-100 p-1.5 rounded-lg"><Layers className="w-4 h-4 text-indigo-600" /></div>
                <div className="text-xs font-bold text-slate-700">Hybrid<br/><span className="font-normal text-slate-500 text-[10px]">Technology</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="py-16 px-4 max-w-4xl mx-auto w-full">
          <div className="bg-white border border-slate-100 rounded-3xl p-8 md:p-12 shadow-sm flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
            <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center shrink-0 border-8 border-white shadow-md">
              <Shield className="w-10 h-10 text-teal-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl md:text-2xl font-bold text-slate-900">Your Data is Secure</h3>
              <p className="text-sm text-slate-600 leading-relaxed max-w-lg">
                We adhere to the <span className="font-bold text-slate-800">RA 10173 Data Privacy Act</span>, ensuring data privacy and robust protection across the entire portal. Secured via Role-Based Access Control and Modern Cryptography.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="bg-slate-50 py-16 md:py-24 px-4 text-center border-t border-slate-100">
          <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#0f172a] tracking-tight">
              Ready to Experience the RMC SISP?
            </h2>
            <p className="text-slate-600 text-sm md:text-base">
              Get our portal now to experience the future of digital academic management.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link 
                href="/login"
                className="w-full sm:w-auto bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-bold py-3.5 px-10 rounded-xl transition-all shadow-sm"
              >
                Login
              </Link>
              <Link 
                href="/register"
                className="w-full sm:w-auto bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-10 rounded-xl transition-all"
              >
                Register
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
                &copy; 2024 Regis Marie College.<br/>All Rights Reserved.
              </span>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-slate-500 font-medium">
            <Link href="/about" className="hover:text-[#1e3a8a] transition-colors">About SISP</Link>
            <Link href="/privacy" className="hover:text-[#1e3a8a] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#1e3a8a] transition-colors">Terms of Service</Link>
            <Link href="/contact" className="hover:text-[#1e3a8a] transition-colors">Contact Us</Link>
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