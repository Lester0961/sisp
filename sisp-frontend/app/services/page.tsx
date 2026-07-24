'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, GraduationCap, Bot, Shield, ArrowRight } from 'lucide-react';
import { PublicNavbar } from '@/components/shared/PublicNavbar';
import { PublicFooter } from '@/components/shared/PublicFooter';

export default function ServicesPage() {
  const services = [
    {
      title: 'Document Requests',
      description: 'Request official transcripts, enrollment certificates, and other academic documentation seamlessly.',
      icon: <FileText className="w-6 h-6 text-[#0A439B]" />,
      href: '/login',
      badge: null,
    },
    {
      title: 'Academic Records',
      description: 'View your complete academic history, current standing, and progress towards graduation requirements.',
      icon: <GraduationCap className="w-6 h-6 text-[#0A439B]" />,
      href: '/login',
      badge: null,
    },
    {
      title: 'AI Advisory',
      description: 'Engage with our intelligent advisor for course recommendations and personalized curriculum planning.',
      icon: <Bot className="w-6 h-6 text-[#0A439B]" />,
      href: '/login',
      badge: 'NEW',
    },
    {
      title: 'Privacy Compliance',
      description: 'Manage your data sharing preferences, review privacy policies, and control your digital footprint.',
      icon: <Shield className="w-6 h-6 text-[#0A439B]" />,
      href: '/login',
      badge: null,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#0A439B] font-sans flex flex-col overflow-x-hidden selection:bg-[#0A439B] selection:text-white">
      <PublicNavbar />

      <main className="flex-1 flex flex-col">
        <section className="px-4 sm:px-6 lg:px-8 pt-28 pb-16 max-w-4xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-5xl font-black text-[#0A439B] tracking-tight leading-none">
            Digital Services
          </h1>
          <p className="text-base sm:text-lg text-[#0A439B]/80 leading-relaxed font-semibold max-w-3xl">
            Browse and access available student services, from document requests to AI-assisted academic planning. Streamlined for your convenience.
          </p>
        </section>

        <section className="px-4 sm:px-6 lg:px-8 py-10 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <div
                key={index}
                className="bg-white border border-[#0A439B]/10 p-8 flex flex-col justify-between relative group"
                style={{ borderRadius: '8px' }}
              >
                {service.badge && (
                  <span className="absolute top-6 right-6 text-[9px] font-black text-[#0A439B] border border-[#0A439B]/20 px-2 py-0.5 tracking-wider uppercase" style={{ borderRadius: '4px' }}>
                    {service.badge}
                  </span>
                )}

                <div className="space-y-6">
                  <div className="w-12 h-12 border border-[#0A439B]/20 flex items-center justify-center shrink-0" style={{ borderRadius: '8px' }}>
                    {service.icon}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-[#0A439B] leading-snug">{service.title}</h3>
                    <p className="text-sm text-[#0A439B]/70 leading-relaxed font-medium">{service.description}</p>
                  </div>
                </div>

                <div className="pt-8">
                  <Link href={service.href} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A439B] hover:underline transition-colors uppercase tracking-wider">
                    Access Service
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
