'use client';

import React, { useState } from 'react';
import { 
  ChevronDown, Send, MapPin, Phone, Mail, Search,
  CheckCircle2
} from 'lucide-react';
import { PublicNavbar } from '@/components/shared/PublicNavbar';
import { PublicFooter } from '@/components/shared/PublicFooter';
import { toast } from 'sonner';

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'Login Issues',
    message: ''
  });
  const [searchQuery, setSearchQuery] = useState('');

  const faqs = [
    {
      q: "How fast are requests processed?",
      a: "Standard requests like transcripts, certifications, and diplomas are processed within 3 to 5 business days. Urgent requests can be expedited through the online tracking system."
    },
    {
      q: "Is my data secure?",
      a: "Absolutely. RMC strictly complies with the Republic Act No. 10173 (Data Privacy Act of 2012). Your records are encrypted at rest and in transit, and access is restricted using modern Role-Based Access Controls (RBAC)."
    },
    {
      q: "How do I reset my portal password?",
      a: "You can reset your password by clicking the 'Forgot Password' link on the Login page. An email containing password recovery instructions will be sent to your registered academic email address."
    },
    {
      q: "Can I cancel a request after submission?",
      a: "Yes, you can cancel a request from your student dashboard as long as the status is still marked as 'Pending'. Once the status changes to 'Processing', cancellation is no longer possible."
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/feedback/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to submit ticket');
      toast.success('Support ticket submitted successfully!');
    } catch {
      toast.error('Could not submit ticket. Please try again or contact the registrar directly.');
    }
    
    setFormSubmitted(true);
    setTimeout(() => {
      setFormSubmitted(false);
      setFormData({
        name: '',
        email: '',
        category: 'Login Issues',
        message: ''
      });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-x-hidden relative selection:bg-teal-500 selection:text-white">
      
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
            Find answers to common questions or reach out to our support team for technical assistance.
          </p>
          
          {/* Main search bar */}
          <div className="relative max-w-lg mx-auto pt-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search knowledge base..." 
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

          {/* Form & Info Column (Right) */}
          <div className="lg:col-span-5 space-y-8">
            {/* Ticket Submission Form */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-lg shadow-slate-100/50 space-y-6">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Technical Support</h3>
                <p className="text-xs text-slate-400 font-semibold mt-1">Experiencing issues with the portal? Send us a message.</p>
              </div>

              {formSubmitted ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-5 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Ticket Submitted!</h4>
                    <p className="text-xs mt-1 text-emerald-700 font-medium">Your support ticket has been received. Our team will contact you shortly.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Name</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. John Doe"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0d2c7f] transition-colors"
                    />
                  </div>

                  {/* Email field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Student ID / Email</label>
                    <input 
                      type="text" 
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="e.g. student@regismarie.edu"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0d2c7f] transition-colors"
                    />
                  </div>

                  {/* Category dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Issue Category</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0d2c7f] transition-colors"
                    >
                      <option>Login Issues</option>
                      <option>Academic Records</option>
                      <option>Document Request</option>
                      <option>AI Advisory Error</option>
                      <option>Other Concerns</option>
                    </select>
                  </div>

                  {/* Message field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Message</label>
                    <textarea 
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      placeholder="Describe your issue in detail..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0d2c7f] transition-colors resize-none"
                    ></textarea>
                  </div>

                  {/* Submit Button */}
                  <button 
                    type="submit"
                    className="w-full bg-[#0d2c7f] hover:bg-[#0d2c7f]/90 text-white font-bold py-3 px-5 rounded-xl transition-all shadow-md shadow-[#0d2c7f]/10 hover:shadow-[#0d2c7f]/20 flex items-center justify-center gap-2 text-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit Ticket
                  </button>
                </form>
              )}
            </div>

            {/* Registrar Info Box */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-lg shadow-slate-100/50 space-y-6">
              <h3 className="text-lg font-extrabold text-slate-900">Registrar&apos;s Office</h3>
              
              <div className="space-y-4">
                {/* Main Campus */}
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-slate-700 shrink-0 shadow-sm">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Main Campus</h4>
                    <p className="text-xs text-slate-400 font-semibold leading-relaxed mt-1">
                      Building A, Room 102<br/>
                      University Avenue
                    </p>
                  </div>
                </div>

                {/* Phone Support */}
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-slate-700 shrink-0 shadow-sm">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Phone Support</h4>
                    <p className="text-xs text-slate-400 font-semibold leading-relaxed mt-1">
                      +1(555) 123-4567<br/>
                      Mon-Fri, 8AM - 5PM
                    </p>
                  </div>
                </div>

                {/* Email Support */}
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-slate-700 shrink-0 shadow-sm">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Email</h4>
                    <p className="text-xs text-slate-400 font-semibold leading-relaxed mt-1">
                      registrar@rmcsisp.edu
                    </p>
                  </div>
                </div>
              </div>
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
