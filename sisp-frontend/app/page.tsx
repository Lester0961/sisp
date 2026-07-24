'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bot, ArrowRight, X, Send } from 'lucide-react';
import { PublicNavbar } from '@/components/shared/PublicNavbar';
import { PublicFooter } from '@/components/shared/PublicFooter';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

export default function LandingPage() {
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: 'Hello! I am your RMC AI Academic Advisor. Ask me anything about your curriculum, documents, or enrollment.',
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const chatOptions = [
    {
      label: 'Transcript Request',
      query: 'How do I request an official transcript?',
      response:
        'You can request transcripts online! Log into your portal, navigate to Administrative Services, choose "Document Request", and select "Official Transcript". Standard processing takes 3-5 business days.',
    },
    {
      label: 'BSIT Curriculum',
      query: 'What are the core BSIT requirements?',
      response:
        'The BS in Information Technology (BSIT) curriculum requires 142 total units, including core subjects in Systems Analysis, Web Development, Databases, Software Engineering, and a 6-unit Capstone project.',
    },
    {
      label: 'Enrollment Status',
      query: 'Can I check my current enrollment status?',
      response:
        'Yes! Once logged in, your active enrollment status, selected subjects, and schedule are displayed in real-time on your dashboard under the "Academic Record" section.',
    },
  ];

  const handleOptionClick = (query: string, response: string) => {
    if (isTyping) return;
    setChatMessages((prev) => [...prev, { sender: 'user', text: query }]);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setChatMessages((prev) => [...prev, { sender: 'bot', text: response }]);
    }, 800);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim() || isTyping) return;

    const query = customInput;
    setChatMessages((prev) => [...prev, { sender: 'user', text: query }]);
    setCustomInput('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const cleanQuery = query.toLowerCase();
      let response =
        "I'm processing your request. For detailed administrative questions, you can also submit an official support ticket inside the portal dashboard.";

      if (
        cleanQuery.includes('transcript') ||
        cleanQuery.includes('document') ||
        cleanQuery.includes('record')
      ) {
        response =
          "To request documents or official records, please go to the 'Administrative Services' tab in your portal to submit a digital request.";
      } else if (
        cleanQuery.includes('curriculum') ||
        cleanQuery.includes('subject') ||
        cleanQuery.includes('bsit') ||
        cleanQuery.includes('course')
      ) {
        response =
          "You can view complete course catalogs and recommended sequence of subjects under the 'Curriculum Progress' view in your logged-in portal.";
      } else if (
        cleanQuery.includes('security') ||
        cleanQuery.includes('privacy') ||
        cleanQuery.includes('safe')
      ) {
        response =
          'Your connection is fully encrypted. All academic records are protected in compliance with the Philippines Data Privacy Act (RA 10173).';
      }

      setChatMessages((prev) => [...prev, { sender: 'bot', text: response }]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#0A439B] font-sans flex flex-col overflow-x-hidden">
      <PublicNavbar />

      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="px-4 sm:px-6 lg:px-8 pt-32 pb-20 md:pt-40 md:pb-32 max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
          {/* Left Column */}
          <div className="flex-1 text-center lg:text-left space-y-8 max-w-2xl">
            {/* Campus Badge */}
            <div className="inline-flex">
              <span
                className="px-4 py-1.5 text-xs font-semibold text-[#0A439B] bg-white border border-[#0A439B]/10"
                style={{ borderRadius: '6px' }}
              >
                Regis Marie College Digital Campus
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#0A439B] leading-[1.1] tracking-tight">
              Transforming Your
              <span className="block mt-2">Academic Journey</span>
            </h1>

            {/* Body */}
            <p className="text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium text-[#0A439B]/80">
              Access secure academic records, submit administrative requests online, and consult
              our smart hybrid AI advisor 24/7.
            </p>

            {/* Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row justify-center lg:justify-start gap-3">
              <Link
                href="/login"
                className="bg-[#0A439B] text-white font-bold py-3.5 px-8 text-sm transition-opacity hover:opacity-90 inline-flex items-center justify-center gap-2"
                style={{ borderRadius: '6px' }}
              >
                Get Started
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <button
                onClick={() => setIsSimulatorOpen(true)}
                className="bg-white text-[#0A439B] font-bold py-3.5 px-8 text-sm transition-colors hover:bg-[#0A439B]/8 border border-[#0A439B]"
                style={{ borderRadius: '6px' }}
              >
                Try AI Simulator
              </button>
            </div>

            {/* Live Metrics */}
            <div className="pt-10 grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0">
              <div
                className="bg-white border border-[#0A439B]/10 py-4 px-3 text-center"
                style={{ borderRadius: '6px' }}
              >
                <p className="text-xl sm:text-2xl font-bold text-[#0A439B]">99.8%</p>
                <p className="text-[10px] sm:text-xs text-[#0A439B]/70 font-semibold mt-1">
                  Portal Uptime
                </p>
              </div>
              <div
                className="bg-white border border-[#0A439B]/10 py-4 px-3 text-center"
                style={{ borderRadius: '6px' }}
              >
                <p className="text-xl sm:text-2xl font-bold text-[#0A439B]">&lt;24h</p>
                <p className="text-[10px] sm:text-xs text-[#0A439B]/70 font-semibold mt-1 leading-tight">
                  Avg Request Resolution
                </p>
              </div>
              <div
                className="bg-white border border-[#0A439B]/10 py-4 px-3 text-center"
                style={{ borderRadius: '6px' }}
              >
                <p className="text-xl sm:text-2xl font-bold text-[#0A439B]">100%</p>
                <p className="text-[10px] sm:text-xs text-[#0A439B]/70 font-semibold mt-1">
                  Data Encrypted
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Dashboard Mockup */}
          <div className="flex-1 w-full max-w-xl flex justify-center items-center">
            <div
              className="relative w-full aspect-[4/3] bg-white border border-[#0A439B]/10 overflow-hidden"
              style={{ borderRadius: '12px' }}
            >
              {/* Header bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#0A439B]/10">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: '#0A439B' }}
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: '#0A439B', opacity: 0.5 }}
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: '#0A439B', opacity: 0.2 }}
                  />
                </div>
                <div className="text-[10px] font-bold text-[#0A439B]/70 tracking-[0.15em] uppercase font-mono">
                  RMC SISP Dashboard
                </div>
                <div className="w-6" />
              </div>

              {/* Grid body */}
              <div className="p-4 grid grid-cols-3 gap-3 h-full">
                <div className="col-span-2 space-y-3">
                  {/* Curriculum Progress */}
                  <div
                    className="bg-white border border-[#0A439B]/10 p-3 space-y-2.5"
                    style={{ borderRadius: '8px' }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-extrabold text-[#0A439B]">
                        Curriculum Progress
                      </span>
                      <span className="text-[10px] font-bold text-[#0A439B]">
                        84% Completed
                      </span>
                    </div>
                    <div
                      className="w-full h-1.5"
                      style={{
                        backgroundColor: 'rgba(10, 67, 155, 0.1)',
                        borderRadius: '999px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        className="h-full"
                        style={{
                          width: '84%',
                          backgroundColor: '#0A439B',
                          borderRadius: '999px',
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-0.5 text-[9px] text-[#0A439B]/70 font-semibold">
                      <span>Passed: 112 units</span>
                      <span>Remaining: 30 units</span>
                    </div>
                  </div>

                  {/* Recent Requests */}
                  <div
                    className="bg-white border border-[#0A439B]/10 p-3 space-y-2.5"
                    style={{ borderRadius: '8px' }}
                  >
                    <span className="text-[10px] font-extrabold text-[#0A439B] block">
                      Recent Requests
                    </span>
                    <div className="flex justify-between items-center text-[10px] py-2 px-2.5 border border-[#0A439B]/10 rounded-md bg-white">
                      <span className="font-semibold text-[#0A439B]">Official Transcript</span>
                      <span className="text-[9px] font-bold text-[#0A439B] border border-[#0A439B]/20 px-2 py-0.5 rounded">
                        Approved
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] py-2 px-2.5 border border-[#0A439B]/10 rounded-md bg-white">
                      <span className="font-semibold text-[#0A439B]">
                        Certificate of Enrollment
                      </span>
                      <span className="text-[9px] font-bold text-[#0A439B]/70 border border-[#0A439B]/20 px-2 py-0.5 rounded">
                        Processing
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-3">
                  {/* AI Advisory */}
                  <div
                    className="bg-white border border-[#0A439B]/10 p-3 flex flex-col items-center justify-center text-center space-y-1.5"
                    style={{ borderRadius: '8px' }}
                  >
                    <div className="w-9 h-9 border border-[#0A439B]/20 flex items-center justify-center rounded-full">
                      <Bot className="w-4.5 h-4.5 text-[#0A439B]" />
                    </div>
                    <span className="text-[10px] font-bold text-[#0A439B]">AI Advisory</span>
                    <span className="text-[8px] text-[#0A439B]/70 font-medium leading-tight">
                      Ready to consult your curriculum choices
                    </span>
                  </div>

                  {/* Student Card */}
                  <div
                    className="bg-white border border-[#0A439B]/10 p-3 space-y-2"
                    style={{ borderRadius: '8px' }}
                  >
                    <span className="text-[8px] font-bold text-[#0A439B]/70 block uppercase tracking-wider">
                      Student Card
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 border border-[#0A439B]/20 flex items-center justify-center font-bold text-xs text-[#0A439B] rounded-md">
                        JD
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-[#0A439B] leading-none">
                          John Doe
                        </p>
                        <p className="text-[7px] text-[#0A439B]/70 font-bold uppercase tracking-wider mt-1">
                          BSIT — Year 4
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />

      {/* AI Simulator Drawer */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#0A439B]/20 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white h-full flex flex-col border-l border-[#0A439B]/10">
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-[#0A439B]/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 border border-[#0A439B]/20 flex items-center justify-center rounded-md">
                  <Bot className="w-5 h-5 text-[#0A439B]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0A439B]">AI Academic Advisor</h4>
                  <p className="text-[10px] text-[#0A439B]/70 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0A439B]" />
                    Online Simulator
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSimulatorOpen(false)}
                className="p-1.5 hover:bg-[#0A439B]/8 rounded-md text-[#0A439B] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#F4F6F9]">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 max-w-[85%] ${
                    msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  {msg.sender === 'bot' && (
                    <div className="w-7 h-7 rounded-full border border-[#0A439B]/20 flex items-center justify-center shrink-0 mt-0.5 text-[#0A439B]">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`p-3.5 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#0A439B] text-white'
                        : 'bg-white border border-[#0A439B]/10 text-[#0A439B]'
                    }`}
                    style={{
                      borderRadius: '12px',
                      borderBottomRightRadius: msg.sender === 'user' ? '2px' : '12px',
                      borderBottomLeftRadius: msg.sender === 'bot' ? '2px' : '12px',
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3 max-w-[85%] mr-auto">
                  <div className="w-7 h-7 rounded-full border border-[#0A439B]/20 flex items-center justify-center shrink-0 mt-0.5 text-[#0A439B]">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div
                    className="bg-white border border-[#0A439B]/10 p-3 flex items-center gap-1.5"
                    style={{ borderRadius: '12px', borderBottomLeftRadius: '2px' }}
                  >
                    <span
                      className="w-1.5 h-1.5 bg-[#0A439B] rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-[#0A439B] rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-[#0A439B] rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="px-5 py-4 bg-white border-t border-[#0A439B]/10">
              <span className="text-[9px] font-bold text-[#0A439B]/70 uppercase block mb-2.5 tracking-wider">
                Suggested Questions
              </span>
              <div className="flex flex-col gap-2">
                {chatOptions.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOptionClick(opt.query, opt.response)}
                    disabled={isTyping}
                    className="text-left text-xs bg-white border border-[#0A439B]/10 text-[#0A439B] hover:bg-[#0A439B]/8 px-3.5 py-2.5 transition-colors font-semibold"
                    style={{ borderRadius: '6px' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <form
              onSubmit={handleCustomSubmit}
              className="p-4 bg-[#F4F6F9] border-t border-[#0A439B]/10 flex gap-2"
            >
              <input
                type="text"
                value={customInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCustomInput(e.target.value)
                }
                placeholder="Ask a custom question..."
                className="flex-1 bg-white border border-[#0A439B]/10 text-[#0A439B] placeholder:text-[#0A439B]/40 px-4 py-2.5 text-xs focus:outline-none focus:border-[#0A439B] transition-colors"
                style={{ borderRadius: '6px' }}
              />
              <button
                type="submit"
                className="bg-[#0A439B] text-white p-2.5 transition-opacity hover:opacity-90 flex items-center justify-center shrink-0"
                style={{ borderRadius: '6px' }}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
