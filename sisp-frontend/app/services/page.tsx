'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, Search, X, Layers, FileText, Bot, Clock, GraduationCap } from 'lucide-react';

export default function ServicesPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const services = [
    {
      title: "Student Academic Records",
      description: "Students can access important academic information such as grades, enrollment history, and curriculum progress securely from any device.",
      icon: <GraduationCap className="w-8 h-8 text-[#1e3a8a]" />
    },
    {
      title: "Service Request Management",
      description: "Submit requests for academic documents such as Transcript of Records (TOR) or Certifications, and track the status of requests online in real-time.",
      icon: <FileText className="w-8 h-8 text-[#1e3a8a]" />
    },
    {
      title: "Academic Advisory Chat System",
      description: "An AI-assisted chat feature that helps answer common academic questions about curriculum, subjects, enrollment, and prerequisites 24/7.",
      icon: <Bot className="w-8 h-8 text-[#1e3a8a]" />
    },
    {
      title: "Real-Time Tracking & Updates",
      description: "Stay informed instantly whenever your document request changes status from pending, to processing, to ready for pickup.",
      icon: <Clock className="w-8 h-8 text-[#1e3a8a]" />
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
            <Link href="/services" className="block px-4 py-3 text-[#1e3a8a] bg-blue-50 rounded-lg font-bold">Services</Link>
            <Link href="/support" className="block px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">Support</Link>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="bg-slate-50 py-16 md:py-24 border-b border-slate-100">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
            <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-2xl mb-4 text-[#1e3a8a]">
              <Layers className="w-8 h-8" />
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-[#0f172a] tracking-tight">
              Our Services
            </h1>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-medium">
              SISP provides a centralized platform offering everything from academic advising to document processing to make your experience at Regis Marie College smooth and efficient.
            </p>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16 md:py-24 px-4 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <div key={index} className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                  {service.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">{service.title}</h3>
                <p className="text-slate-600 leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 bg-[#1e3a8a] rounded-3xl p-10 md:p-16 text-center text-white space-y-6 shadow-xl">
            <h2 className="text-2xl md:text-4xl font-bold">Need a specific service?</h2>
            <p className="text-blue-100 max-w-2xl mx-auto leading-relaxed">
              Log into your portal to see all personalized services available based on your curriculum, standing, and academic role.
            </p>
            <div className="pt-4">
               <Link 
                href="/login"
                className="inline-block bg-white hover:bg-slate-50 text-[#1e3a8a] font-bold py-3.5 px-10 rounded-xl transition-all shadow-sm"
              >
                Access Portal Now
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
            <Link href="/support" className="hover:text-[#1e3a8a] transition-colors">Contact Us</Link>
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
