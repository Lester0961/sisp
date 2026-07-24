'use client';

import React from 'react';
import { Eye, Rocket, Layers, Zap, Shield, Palette } from 'lucide-react';
import { PublicNavbar } from '@/components/shared/PublicNavbar';
import { PublicFooter } from '@/components/shared/PublicFooter';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#0A439B] font-sans flex flex-col overflow-x-hidden selection:bg-[#0A439B] selection:text-white">

      <PublicNavbar />

      <main className="flex-1 flex flex-col">
        {/* Hero Header */}
        <section className="px-4 sm:px-6 lg:px-8 pt-28 pb-16 max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl font-black text-[#0A439B] tracking-tight leading-none">
            The Future of Academic Management
          </h1>
          <p className="text-base sm:text-lg text-[#0A439B]/80 leading-relaxed font-semibold max-w-3xl mx-auto">
            The Student Information System Portal (SISP) is Regis Marie College&apos;s flagship digital platform, designed to unify the academic journey through intuitive design, seamless workflows, and forward-thinking architecture.
          </p>
        </section>

        {/* Mission and Transformation Grid */}
        <section className="px-4 sm:px-6 lg:px-8 py-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Our Mission */}
          <div className="lg:col-span-7 bg-white border border-[#0A439B]/10 p-8 sm:p-10 flex flex-col justify-between space-y-8" style={{ borderRadius: '8px' }}>
            <div className="w-12 h-12 border border-[#0A439B]/20 flex items-center justify-center text-[#0A439B] shrink-0" style={{ borderRadius: '8px' }}>
              <Eye className="w-6 h-6" />
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-extrabold text-[#0A439B]">Our Mission</h2>
              <p className="text-sm sm:text-base text-[#0A439B]/80 leading-relaxed font-medium">
                To completely modernize the administrative and academic experience for students, faculty, and staff. SISP strives to eliminate bureaucratic friction, providing a clean, accessible, and highly responsive environment that allows the academic community to focus on learning and innovation rather than paperwork.
              </p>
            </div>
          </div>

          {/* Digital Transformation */}
          <div className="lg:col-span-5 bg-white border border-[#0A439B]/10 p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden group" style={{ borderRadius: '8px' }}>
            <div className="absolute right-0 bottom-0 w-48 h-48 bg-[#F4F6F9] border-t border-l border-[#0A439B]/10 p-3 pointer-events-none transform translate-x-8 translate-y-8 group-hover:translate-x-4 group-hover:translate-y-4 transition-transform duration-500" style={{ borderTopLeftRadius: '8px' }}>
              <div className="w-full h-full bg-white border border-[#0A439B]/10 p-2 space-y-2" style={{ borderRadius: '6px' }}>
                <div className="h-2 w-12 bg-[#0A439B]/10 rounded" />
                <div className="h-1 w-20 bg-[#0A439B]/10 rounded" />
                <div className="h-6 bg-[#F4F6F9] border border-[#0A439B]/10 rounded flex items-center justify-center text-[8px] font-bold text-[#0A439B]/50">Mock Data</div>
              </div>
            </div>

            <div className="w-12 h-12 border border-[#0A439B]/20 flex items-center justify-center text-[#0A439B] shrink-0 z-10" style={{ borderRadius: '8px' }}>
              <Rocket className="w-6 h-6" />
            </div>
            <div className="space-y-4 z-10 pt-16 lg:pt-24">
              <h2 className="text-2xl font-extrabold text-[#0A439B]">Digital Transformation</h2>
              <p className="text-sm text-[#0A439B]/80 leading-relaxed font-medium">
                Moving beyond legacy systems to embrace cloud-native, scalable solutions that adapt to the evolving needs of higher education.
              </p>
            </div>
          </div>
        </section>

        {/* Core Capabilities */}
        <section className="px-4 sm:px-6 lg:px-8 py-20 max-w-7xl mx-auto w-full space-y-16">
          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold text-[#0A439B] tracking-tight">Core Capabilities</h2>
            <p className="text-[#0A439B]/70 text-sm font-semibold uppercase tracking-wider">Engineered for clarity and performance.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="text-[#0A439B]">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-[#0A439B] text-base">Centralized Records</h3>
              <p className="text-xs sm:text-sm text-[#0A439B]/70 leading-relaxed font-semibold">
                A single source of truth for grades, schedules, and financial standing, securely accessible anywhere.
              </p>
            </div>

            <div className="space-y-4">
              <div className="text-[#0A439B]">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-[#0A439B] text-base">Real-time Sync</h3>
              <p className="text-xs sm:text-sm text-[#0A439B]/70 leading-relaxed font-semibold">
                Instant updates across all modules ensures that advisors, students, and administration are always aligned.
              </p>
            </div>

            <div className="space-y-4">
              <div className="text-[#0A439B]">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-[#0A439B] text-base">Enterprise Security</h3>
              <p className="text-xs sm:text-sm text-[#0A439B]/70 leading-relaxed font-semibold">
                Role-based access control and advanced encryption protect sensitive academic and personal data.
              </p>
            </div>

            <div className="space-y-4">
              <div className="text-[#0A439B]">
                <Palette className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-[#0A439B] text-base">Modern Interface</h3>
              <p className="text-xs sm:text-sm text-[#0A439B]/70 leading-relaxed font-semibold">
                A highly legible, accessible, and intuitive UI built on a unified design system for seamless navigation.
              </p>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
