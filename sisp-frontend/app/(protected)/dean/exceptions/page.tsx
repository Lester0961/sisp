'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { adminApi } from '@/lib/api/admin';
import { requestsApi, DocumentRequestItem } from '@/lib/api/requests';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  GraduationCap,
  LogOut,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileText,
  User,
} from 'lucide-react';

export default function DeanExceptionsPage() {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState<DocumentRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await requestsApi.getAllRequests();
      // Show pending document requests / overrides
      const requestArray = Array.isArray(res?.data) ? res.data : [];
      setRequests(requestArray.filter((r) => r.status === 'pending'));
    } catch (err) {
      console.error('Failed to load exceptions queue:', err);
    } finally {
      setLoading(true);
      // Ensure smooth loader exit
      setTimeout(() => setLoading(false), 200);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleDecision = async (exceptionId: string, decision: 'approved' | 'rejected') => {
    setActioningId(exceptionId);
    try {
      await adminApi.approveException(exceptionId, decision);
      alert(`Exception request successfully ${decision}!`);
      loadRequests();
    } catch (err) {
      alert('Failed to resolve exception.');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-[#07060E] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0E1B2B] via-[#06050A] to-[#020204] text-slate-100 font-sans overflow-x-hidden select-none">
      
      {/* Background Depth Ambient Blobs */}
      <div className="absolute top-[5%] right-[10%] h-[350px] w-[350px] rounded-full bg-cyan-500/10 blur-[130px] animate-pulse duration-[7s] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[5%] h-[400px] w-[400px] rounded-full bg-indigo-600/10 blur-[140px] pointer-events-none" />

      {/* Sticky Header Panel */}
      <header className="sticky top-0 w-full z-30 bg-[#07060E]/50 backdrop-blur-xl border-b border-white/[0.05] shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-600/15 border border-cyan-500/20 flex items-center justify-center shadow-inner">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
            </div>
            <span className="font-bold tracking-wide text-sm bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
              REGIS MARIE SISP — DEAN PORTAL
            </span>
          </div>
          <div className="flex items-center space-x-5">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs text-slate-300 font-semibold">{user?.email}</span>
              <span className="text-[9px] uppercase tracking-widest text-cyan-400 font-bold">Academic Dean</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-xs hover:bg-white/5 border border-white/[0.06] hover:border-white/10 rounded-lg text-rose-300 hover:text-rose-200 transition-all duration-300 flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8 space-y-8 z-10">
        
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Dean Exceptions Queue
            </h1>
            <p className="text-slate-400 text-xs md:text-sm font-medium">
              Review and act on academic overrides and registrar document requests.
            </p>
          </div>
          <Button
            onClick={loadRequests}
            className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/[0.07] text-slate-200 hover:text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition duration-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </Button>
        </div>

        {/* Exceptions Grid */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 shadow-xl">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                Scanning Exception Logs...
              </span>
            </div>
          ) : requests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white/[0.02] border border-white/[0.06] hover:border-white/10 backdrop-blur-2xl rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all duration-300"
                >
                  <div className="space-y-4">
                    
                    {/* Header Card Row */}
                    <div className="flex items-start justify-between">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-500/25 bg-cyan-500/5 text-cyan-300 text-[9px] font-bold uppercase tracking-wider">
                        <Sparkles className="h-3 w-3 text-cyan-400" />
                        {req.typeLabel}
                      </div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Student Info */}
                    <div className="p-3.5 bg-white/[0.01] border border-white/[0.03] rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-cyan-400" />
                        <span className="font-bold text-xs text-slate-200">
                          {req.student.user.email}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-slate-500 font-semibold">Student Number</span>
                          <span className="font-bold text-slate-300">{req.student.studentNumber}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-slate-500 font-semibold">Program Code</span>
                          <span className="font-bold text-slate-300">{req.student.program.code}</span>
                        </div>
                      </div>
                    </div>

                    {/* Remarks Input */}
                    {req.remarks && (
                      <div className="space-y-1">
                        <span className="block text-[8px] uppercase tracking-wider text-slate-500 font-bold">Request Remarks</span>
                        <p className="text-xs text-slate-300 italic bg-black/25 p-3 rounded-lg border border-white/[0.03] leading-relaxed">
                          "{req.remarks}"
                        </p>
                      </div>
                    )}

                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-3 pt-6 border-t border-white/[0.03] mt-5">
                    <Button
                      disabled={actioningId === req.id}
                      onClick={() => handleDecision(req.id, 'approved')}
                      className="flex-1 bg-emerald-600/15 border border-emerald-500/20 hover:bg-emerald-600/25 text-emerald-400 hover:text-emerald-300 text-xs font-bold py-2.5 rounded-xl transition duration-300 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve Override
                    </Button>
                    <Button
                      disabled={actioningId === req.id}
                      onClick={() => handleDecision(req.id, 'rejected')}
                      className="flex-1 bg-rose-600/15 border border-rose-500/20 hover:bg-rose-600/25 text-rose-400 hover:text-rose-300 text-xs font-bold py-2.5 rounded-xl transition duration-300 flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject Request
                    </Button>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white/[0.02] border border-white/[0.06] backdrop-blur-2xl rounded-2xl p-8 shadow-xl space-y-3">
              <FileText className="h-10 w-10 text-slate-600 mx-auto" />
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Queue Cleared</h3>
                <p className="text-[10px] text-slate-500">No exception or override requests currently require Dean approval.</p>
              </div>
            </div>
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 border-t border-white/[0.03] text-slate-600 text-[10px] pointer-events-none select-none">
        &copy; {new Date().getFullYear()} Regis Marie College SISP. Built with high-fidelity cryptographic models.
      </footer>

    </div>
  );
}