'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Menu, Search, Shield, Bot, FileText, CheckCircle2, Lock, 
  MonitorSmartphone, Settings, Users, BookOpen, X, MessageSquare, 
  Award, Clock, Layers, Sparkles, Send, ArrowRight, HelpCircle, 
  ChevronDown, Check, Fingerprint, Activity 
} from 'lucide-react';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  isLink?: boolean;
  linkUrl?: string;
  isDisclaimer?: boolean;
}

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  
  // Interactive Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: 'bot', text: 'Hello! I am your RMC AI Academic Advisor. Ask me anything about your curriculum, documents, or enrollment.' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const chatOptions = [
    { label: 'Transcript Request', query: 'How do I request an official transcript?', response: 'You can request transcripts online! Log into your portal, navigate to Administrative Services, choose "Document Request", and select "Official Transcript". Standard processing takes 3-5 business days.' },
    { label: 'BSIT Curriculum', query: 'What are the core BSIT requirements?', response: 'The BS in Information Technology (BSIT) curriculum requires 142 total units, including core subjects in Systems Analysis, Web Development, Databases, Software Engineering, and a 6-unit Capstone project.' },
    { label: 'Enrollment Status', query: 'Can I check my current enrollment status?', response: 'Yes! Once logged in, your active enrollment status, selected subjects, and schedule are displayed in real-time on your dashboard under the "Academic Record" section.' },
    { label: 'Security & RA 10173', query: 'How is my private data protected?', response: 'All RMC SISP systems fully comply with the RA 10173 Data Privacy Act. We employ end-to-end encryption, role-based access controls, and regular vulnerability scans to guarantee your files remain confidential.' }
  ];

  const handleOptionClick = (query: string, response: string) => {
    if (isTyping) return;
    
    // Add user message
    setChatMessages(prev => [...prev, { sender: 'user', text: query }]);
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      setIsTyping(false);
      setChatMessages(prev => [
        ...prev, 
        { sender: 'bot', text: response }
      ]);
    }, 800);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim() || isTyping) return;

    const query = customInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: query }]);
    setCustomInput('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      
      // Match key phrases or give fallback
      const cleanQuery = query.toLowerCase();
      let response = "I'm processing your request. For detailed administrative questions, you can also submit an official support ticket inside the portal dashboard.";
      
      if (cleanQuery.includes('transcript') || cleanQuery.includes('document') || cleanQuery.includes('record')) {
        response = "To request documents or official records, please go to the 'Administrative Services' tab in your portal to submit a digital request.";
      } else if (cleanQuery.includes('curriculum') || cleanQuery.includes('subject') || cleanQuery.includes('bsit') || cleanQuery.includes('course')) {
        response = "You can view complete course catalogs and recommended sequence of subjects under the 'Curriculum Progress' view in your logged-in portal.";
      } else if (cleanQuery.includes('security') || cleanQuery.includes('privacy') || cleanQuery.includes('safe')) {
        response = "Your connection is fully encrypted. All academic records are protected in compliance with the Philippines Data Privacy Act (RA 10173).";
      }

      setChatMessages(prev => [
        ...prev,
        { sender: 'bot', text: response }
      ]);
    }, 1000);
  };

  const faqs = [
    {
      q: "What is the RMC SISP Portal?",
      a: "The Student Information and Services Portal (SISP) is a modern, unified academic platform for Regis Marie College students and faculty. It facilitates centralized record access, administrative document request handling, and real-time guidance via AI."
    },
    {
      q: "How fast are document requests processed?",
      a: "Standard requests like transcripts, certifications, and diplomas are processed within 3 to 5 business days. Urgent requests can be expedited through the online tracking system."
    },
    {
      q: "Is my student data secure under the Data Privacy Act?",
      a: "Absolutely. RMC strictly complies with the Republic Act No. 10173 (Data Privacy Act of 2012). Your records are encrypted at rest and in transit, and access is restricted using modern Role-Based Access Controls (RBAC)."
    },
    {
      q: "How does the AI Academic Advisor work?",
      a: "The AI Advisor uses modern NLP (Natural Language Processing) and semantic search models to analyze your curriculum progress, answer FAQs instantly, and assist you in selecting recommended subjects for upcoming semesters."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col overflow-x-hidden relative selection:bg-teal-500 selection:text-slate-950">
      
      {/* Background Mesh Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[20%] right-10 w-[400px] h-[400px] bg-teal-900/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-[20%] left-10 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[130px] pointer-events-none -z-10" />

      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg md:hidden transition-colors"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-400 p-[2px] shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-bold text-xl text-white">
                  R
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  RMC SISP
                </span>
                <span className="text-[10px] font-semibold tracking-wider text-teal-400 uppercase">
                  Portal Gateway
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <Link href="/about" className="hover:text-white transition-colors">About SISP</Link>
            <Link href="/services" className="hover:text-white transition-colors">Services</Link>
            <Link href="/support" className="hover:text-white transition-colors">Support</Link>
          </nav>

          <div className="flex items-center gap-3">
            {/* Live Status Badge */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-full text-xs font-medium text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Systems Operational
            </div>

            <Link 
              href="/login"
              className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-white rounded-lg group bg-gradient-to-br from-teal-300 to-lime-300 group-hover:from-teal-300 group-hover:to-lime-300 dark:text-white focus:ring-4 focus:outline-none focus:ring-lime-800"
              style={{ marginBottom: 0, marginRight: 0 }}
            >
              <span className="relative px-5 py-2 transition-all ease-in duration-75 bg-slate-950 rounded-md group-hover:bg-opacity-0 font-semibold">
                Login Portal
              </span>
            </Link>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-900 bg-slate-950 px-4 py-6 space-y-3 shadow-2xl absolute w-full left-0 animate-in fade-in slide-in-from-top-5 duration-200">
            <Link href="/about" className="block px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-900 rounded-lg font-semibold">About SISP</Link>
            <Link href="/services" className="block px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-900 rounded-lg font-semibold">Services</Link>
            <Link href="/support" className="block px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-900 rounded-lg font-semibold">Support</Link>
            <div className="px-4 pt-4 border-t border-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                Portal Status Online
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="relative px-4 pt-16 pb-20 md:pt-32 md:pb-40 max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left space-y-8 max-w-2xl">
            {/* Live Indicator */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-950/50 border border-indigo-500/30 text-xs text-indigo-300 font-semibold tracking-wide animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              Regis Marie College Digital Campus
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-[1.1] tracking-tight">
              Transforming Your
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-teal-400 bg-clip-text text-transparent block mt-2">
                Academic Journey
              </span>
            </h1>
            
            <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Access secure academic records, submit administrative requests online, and consult our smart hybrid AI advisor 24/7.
            </p>
            
            <div className="pt-4 flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
              <Link 
                href="/register"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 group"
              >
                Get Started
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a 
                href="#advisor-simulator"
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold py-4 px-8 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Try AI Simulator
              </a>
            </div>

            {/* Quick Metrics */}
            <div className="pt-10 grid grid-cols-3 gap-6 border-t border-slate-900 max-w-md mx-auto lg:mx-0">
              <div>
                <p className="text-2xl font-bold text-white">99.8%</p>
                <p className="text-xs text-slate-500 font-medium mt-1">Portal Uptime</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">&lt;24h</p>
                <p className="text-xs text-slate-500 font-medium mt-1">Avg Request Resolution</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">100%</p>
                <p className="text-xs text-slate-500 font-medium mt-1">Data Encrypted</p>
              </div>
            </div>
          </div>

          {/* Hero Illustration / Dashboard Preview */}
          <div className="flex-1 w-full max-w-xl relative flex justify-center items-center">
            <div className="relative w-full aspect-[4/3] rounded-3xl bg-slate-900/40 border border-slate-800 p-2 shadow-2xl backdrop-blur-sm overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-teal-500/10 opacity-60 group-hover:opacity-80 transition-opacity" />
              
              {/* Glass dashboard window header */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-950/60 border-b border-slate-800 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
                  <span className="w-3 h-3 rounded-full bg-green-500/80"></span>
                </div>
                <div className="text-xs font-semibold text-slate-500 tracking-wide">RMC SISP Dashboard</div>
                <div className="w-6"></div>
              </div>

              {/* Internal Mock Layout */}
              <div className="p-4 grid grid-cols-3 gap-4 h-full">
                <div className="col-span-2 space-y-4">
                  {/* Mock Chart Component */}
                  <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">Curriculum Progress</span>
                      <span className="text-[10px] text-teal-400 font-bold bg-teal-950/40 px-2 py-0.5 rounded-full">84% Completed</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2">
                      <div className="bg-gradient-to-r from-blue-500 to-teal-400 h-2 rounded-full" style={{ width: '84%' }}></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] text-slate-500">
                      <div>Passed: 112 units</div>
                      <div>Remaining: 30 units</div>
                    </div>
                  </div>

                  {/* Mock Records List */}
                  <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 space-y-2.5">
                    <span className="text-xs font-bold text-slate-400 block">Recent Requests</span>
                    {[
                      { title: 'Official Transcript', status: 'Approved', color: 'text-emerald-400 bg-emerald-950/30' },
                      { title: 'Certificate of Enrollment', status: 'Processing', color: 'text-amber-400 bg-amber-950/30' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs bg-slate-900/50 p-2 rounded-lg border border-slate-800/40">
                        <span className="font-medium text-slate-300">{item.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.color}`}>{item.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sidebar Widget mock */}
                <div className="space-y-4">
                  <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 flex flex-col items-center justify-center text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-indigo-950 flex items-center justify-center border border-indigo-800/50 text-indigo-400 animate-bounce">
                      <Bot className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-300">AI Advisory</span>
                    <span className="text-[10px] text-slate-500">Ready to consult your curriculum choices</span>
                  </div>

                  <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Student Card</span>
                    <div className="h-12 bg-gradient-to-tr from-slate-900 to-indigo-950 rounded-lg p-2 border border-indigo-900/30 flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center font-bold text-[10px] text-white">JD</div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-300">John Doe</p>
                        <p className="text-[8px] text-teal-400">BSIT - Year 4</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-slate-900/40 py-20 md:py-28 px-4 border-y border-slate-900">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-950/40 border border-teal-500/20 text-xs text-teal-300 font-semibold uppercase tracking-wider">
                Full-Service Portal
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                One Platform. Everything Academic.
              </h2>
              <p className="text-slate-400 text-sm md:text-base">
                An integrated student administration framework streamlining everything from grades to AI advising.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-slate-950/60 p-8 rounded-3xl border border-slate-800 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all group duration-300">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <FileText className="w-7 h-7 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Student Information</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Maintain single source-of-truth access for your academic data, marks, and registration history.
                </p>
                <ul className="space-y-3">
                  {[
                    'Academic Grades & Records',
                    'Course & Registration Logs',
                    'Curriculum Tracking Matrix'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs font-semibold text-slate-300">
                      <Check className="w-4 h-4 text-teal-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Feature 2 */}
              <div className="bg-slate-950/60 p-8 rounded-3xl border border-slate-800 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all group duration-300">
                <div className="w-14 h-14 bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border border-teal-500/20 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <Settings className="w-7 h-7 text-teal-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Administrative Services</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Say goodbye to physically waiting in queues. Submit, pay, and track certificates & credentials completely online.
                </p>
                <ul className="space-y-3">
                  {[
                    'Automated Document Issuance',
                    'Live Tracking Dashboard',
                    'Online Fee Integration'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs font-semibold text-slate-300">
                      <Check className="w-4 h-4 text-teal-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Feature 3 */}
              <div className="bg-slate-950/60 p-8 rounded-3xl border border-slate-800 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all group duration-300">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <Bot className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">AI Academic Advisory</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Get intelligent consulting powered by hybrid semantic-search models. Receive instantly personalized subject guidance.
                </p>
                <ul className="space-y-3">
                  {[
                    'Prerequisite Verification',
                    'Instant Curricular FAQs',
                    'Semantic Catalog Queries'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs font-semibold text-slate-300">
                      <Check className="w-4 h-4 text-teal-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* AI Simulator Section */}
        <section id="advisor-simulator" className="py-20 md:py-28 px-4 bg-slate-950 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="max-w-4xl mx-auto space-y-12 relative z-10">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/40 border border-purple-500/30 text-xs text-purple-300 font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" style={{ animationDuration: '4s' }} />
                Interactive AI Simulator
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                Try the RMC Advisor Right Now
              </h2>
              <p className="text-slate-400 text-sm max-w-xl mx-auto">
                Interact with the mock advisor below to see how SISP answers curriculum and registrar questions instantly.
              </p>
            </div>

            {/* Chatbot Interface */}
            <div className="max-w-2xl mx-auto bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-md">
              {/* Simulator Header */}
              <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">AI Academic Advisor</h4>
                    <p className="text-[10px] text-teal-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Online & Ready
                    </p>
                  </div>
                </div>
                <div className="text-xs font-semibold text-slate-500">Beta Version 1.0</div>
              </div>

              {/* Message Display Area */}
              <div className="p-6 h-80 overflow-y-auto space-y-4 bg-slate-950/30">
                {chatMessages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                  >
                    {msg.sender === 'bot' && (
                      <div className="w-7 h-7 rounded-full bg-purple-950 flex items-center justify-center border border-purple-900 shrink-0 mt-0.5">
                        <Bot className="w-4 h-4 text-purple-400" />
                      </div>
                    )}
                    <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.sender === 'user' 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-sm' 
                        : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex gap-3 max-w-[85%] mr-auto">
                    <div className="w-7 h-7 rounded-full bg-purple-950 flex items-center justify-center border border-purple-900 shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 text-slate-400 text-sm p-3.5 rounded-2xl rounded-tl-sm flex items-center gap-1.5 shadow-sm">
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Predefined Quick Action Prompts */}
              <div className="px-6 py-3 bg-slate-950/40 border-t border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-2 tracking-wider">Suggested Questions</span>
                <div className="flex flex-wrap gap-2">
                  {chatOptions.map((opt, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleOptionClick(opt.query, opt.response)}
                      disabled={isTyping}
                      className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/30 text-slate-300 hover:text-white px-3.5 py-1.5 rounded-full transition-all duration-200"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleCustomSubmit} className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
                <input 
                  type="text" 
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Ask a custom question..."
                  className="flex-1 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
                <button 
                  type="submit" 
                  className="bg-purple-600 hover:bg-purple-500 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Security & Compliance Section */}
        <section className="py-20 md:py-28 px-4 bg-slate-900/30 border-t border-slate-900">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/30 border border-slate-800 p-8 md:p-14 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
              <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/5 rounded-full blur-[60px] pointer-events-none" />
              
              <div className="w-20 h-20 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/10">
                <Shield className="w-10 h-10 text-teal-400" />
              </div>
              
              <div className="space-y-4 flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-1 bg-teal-950/40 border border-teal-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-teal-400 uppercase tracking-wide">
                  RA 10173 Compliant
                </div>
                <h3 className="text-2xl font-bold text-white">Your Data Privacy & Security Guarded</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  We guarantee fully-compliant safeguarding procedures in adherence with the <span className="text-white font-bold">Philippines Data Privacy Act of 2012 (RA 10173)</span>. All records use standard high-grade end-to-end encryption protocols and robust Role-Based Access Controls.
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5"><Fingerprint className="w-3.5 h-3.5 text-teal-500" /> Biometric Identity Integrity</span>
                  <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-teal-500" /> AES-256 Storage Encryption</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs Accordion Section */}
        <section className="py-20 md:py-28 px-4 bg-slate-950">
          <div className="max-w-3xl mx-auto space-y-16">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/40 border border-blue-500/20 text-xs text-blue-300 font-semibold uppercase tracking-wider">
                Support Center
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div 
                  key={idx} 
                  className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden transition-colors"
                >
                  <button 
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-slate-200 hover:text-white"
                  >
                    <span className="pr-4">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${activeFaq === idx ? 'transform rotate-180 text-teal-400' : ''}`} />
                  </button>
                  
                  {activeFaq === idx && (
                    <div className="px-6 pb-5 text-sm text-slate-400 leading-relaxed border-t border-slate-800/40 pt-4 animate-in fade-in slide-in-from-top-1 duration-150">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="bg-slate-900/20 py-20 md:py-28 px-4 text-center border-t border-slate-900 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-900/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="max-w-2xl mx-auto space-y-8 relative z-10">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Ready to Access the RMC Portal?
            </h2>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
              Step into the future of digital academic infrastructure. Get immediate portal credentials to begin tracking, requesting, and obtaining help.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link 
                href="/login"
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 px-10 rounded-xl transition-all shadow-lg shadow-indigo-600/30"
              >
                Log In Now
              </Link>
              <Link 
                href="/register"
                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold py-4 px-10 rounded-xl transition-all"
              >
                Register Account
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 py-16 px-4 border-t border-slate-900 text-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-[2px]">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-bold text-lg text-white">R</div>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400 font-semibold text-xs">&copy; 2026 Regis Marie College.</span>
              <span className="text-slate-600 text-[10px] mt-0.5">All Rights Reserved. SISP Digital Services.</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-slate-500 font-medium">
            <Link href="/about" className="hover:text-white transition-colors">About SISP</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact Support</Link>
          </div>

          <div className="flex items-center gap-6 text-slate-500 font-bold text-xs">
            <a href="#" aria-label="Facebook" className="hover:text-white transition-colors">FACEBOOK</a>
            <a href="#" aria-label="Twitter" className="hover:text-white transition-colors">TWITTER</a>
            <a href="#" aria-label="LinkedIn" className="hover:text-white transition-colors">LINKEDIN</a>
          </div>
        </div>
      </footer>
    </div>
  );
}