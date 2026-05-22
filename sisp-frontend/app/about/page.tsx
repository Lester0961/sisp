'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, Search, X, Facebook, Twitter, Instagram, Info, Target, Users, Bot, ShieldCheck } from 'lucide-react';

export default function AboutPage() {
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
            <Link href="/about" className="block px-4 py-3 text-[#1e3a8a] bg-blue-50 rounded-lg font-bold">About</Link>
            <Link href="/services" className="block px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">Services</Link>
            <Link href="/support" className="block px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">Support</Link>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="bg-slate-50 py-16 md:py-24 border-b border-slate-100">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
            <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-2xl mb-4 text-[#1e3a8a]">
              <Info className="w-8 h-8" />
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-[#0f172a] tracking-tight">
              About SISP
            </h1>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-medium">
              SISP is a web-based student portal designed for Regis Marie College. It centralizes academic records, service requests, curriculum tracking, and academic advising support in one secure and accessible platform. With its AI-assisted advisory chat system, SISP helps students receive faster guidance while supporting faculty and administrative staff in managing academic services more efficiently.
            </p>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16 md:py-24 px-4 max-w-4xl mx-auto space-y-16">
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[#1e3a8a] font-bold text-xl md:text-2xl">
              <Target className="w-6 h-6" />
              <h2>Why This System Was Built</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Regis Marie College currently handles many academic and administrative processes through manual, paper-based, or separated digital workflows. Student records, enrollment information, curriculum progress, service requests, and academic advising may require coordination between different offices.
            </p>
            <p className="text-slate-600 leading-relaxed">
              SISP was created to help address these challenges by providing a centralized platform where users can access relevant services based on their roles. The goal is to reduce delays, improve record accuracy, support better communication, and make academic services more convenient for the school community.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3 text-[#1e3a8a] font-bold text-xl md:text-2xl">
              <Bot className="w-6 h-6" />
              <h2>Academic Advisory Chat System</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              One of the main features of SISP is its <strong>Hybrid NLP- and Semantic-Based Academic Advisory Chat System</strong>.
            </p>
            <p className="text-slate-600 leading-relaxed">
              This chat system is designed to help students receive academic guidance more conveniently. It uses intent classification to understand the type of question being asked and semantic search to retrieve relevant information from the school's academic knowledge base.
            </p>
            <p className="text-slate-600 leading-relaxed italic border-l-4 border-teal-500 pl-4 bg-teal-50 py-3 pr-3 rounded-r-lg">
              The chatbot is not meant to replace official advisers or school personnel. Instead, it serves as a first layer of support for common academic questions and helps students get faster guidance before seeking direct assistance from faculty or administrative offices.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3 text-[#1e3a8a] font-bold text-xl md:text-2xl">
              <Users className="w-6 h-6" />
              <h2>Who Can Use the System</h2>
            </div>
            {/* Mobile-first Cards that adapt to a grid on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-slate-800 text-lg mb-2">Students</h3>
                <p className="text-slate-600 text-sm leading-relaxed">View academic records, track curriculum progress, submit service requests, and ask academic questions.</p>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-slate-800 text-lg mb-2">Faculty Members</h3>
                <p className="text-slate-600 text-sm leading-relaxed">Monitor student academic progress and support advising-related needs.</p>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-slate-800 text-lg mb-2">Academic Advisers / Dean</h3>
                <p className="text-slate-600 text-sm leading-relaxed">Review academic standing, curriculum progress, and advising concerns.</p>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-slate-800 text-lg mb-2">Administrative Staff</h3>
                <p className="text-slate-600 text-sm leading-relaxed">Manage records, process requests, and update request statuses.</p>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm md:col-span-2 lg:col-span-1">
                <h3 className="font-bold text-slate-800 text-lg mb-2">System Administrator</h3>
                <p className="text-slate-600 text-sm leading-relaxed">Manage accounts, roles, permissions, security settings, and audit logs.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[#1e3a8a] font-bold text-xl md:text-2xl">
              <ShieldCheck className="w-6 h-6" />
              <h2>Our Commitment</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              SISP is developed with a focus on accessibility, organization, and responsible data handling. Since the system manages academic and personal information, it follows secure design principles such as role-based access control, proper user authentication, and controlled access to sensitive records.
            </p>
            <p className="text-slate-600 leading-relaxed">
              The system supports the school's goal of improving academic service delivery while helping students receive more convenient and timely support, strictly adhering to the Republic Act 10173 - Data Privacy Act of 2012.
            </p>
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
            <Link href="/about" className="text-[#1e3a8a] transition-colors font-bold">About SISP</Link>
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
