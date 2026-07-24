'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { adminApi } from '@/lib/api/admin';
import { requestsApi, DocumentRequestItem } from '@/lib/api/requests';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/shared/Navbar';
import { toast } from 'sonner';
import { AmbientBackground } from '@/components/shared/AmbientBackground';
import { PageFooter } from '@/components/shared/PageFooter';

import {
  Sparkles,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileText,
  User,
} from 'lucide-react';

export default function DeanExceptionsPage() {
  useAuth();
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
      toast.success(`Exception request successfully ${decision}!`);
      loadRequests();
    } catch {
      toast.error('Failed to resolve exception.');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-slate-50 text-slate-900 font-sans overflow-x-hidden select-none">
      
      <AmbientBackground topColor="bg-cyan-500/5" bottomColor="bg-indigo-600/5" />

      <Navbar />

      {/* Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8 space-y-8 z-10">
        
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Dean Exceptions Queue
            </h1>
            <p className="text-slate-500 text-xs md:text-sm font-medium">
              Review and act on academic overrides and registrar document requests.
            </p>
          </div>
          <Button
            onClick={loadRequests}
            className="w-full sm:w-auto bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition duration-300 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </Button>
        </div>

        {/* Exceptions Grid */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                Scanning Exception Logs...
              </span>
            </div>
          ) : requests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white border border-slate-100 hover:border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between transition-all duration-300"
                >
                  <div className="space-y-4">
                    
                    {/* Header Card Row */}
                    <div className="flex items-start justify-between">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-200 bg-cyan-50 text-cyan-700 text-[9px] font-bold uppercase tracking-wider">
                        <Sparkles className="h-3 w-3 text-cyan-600" />
                        {req.typeLabel}
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Student Info */}
                    <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-[#1e3a8a]" />
                        <span className="font-bold text-xs text-slate-800">
                          {req.student.user.email}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-semibold">Student Number</span>
                          <span className="font-bold text-slate-700">{req.student.studentNumber}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-semibold">Program Code</span>
                          <span className="font-bold text-slate-700">{req.student.program.code}</span>
                        </div>
                      </div>
                    </div>

                    {/* Remarks Input */}
                    {req.remarks && (
                      <div className="space-y-1">
                        <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold">Request Remarks</span>
                        <p className="text-xs text-slate-600 italic bg-slate-100 p-3 rounded-lg border border-slate-200 leading-relaxed">
                          &quot;{req.remarks}&quot;
                        </p>
                      </div>
                    )}

                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-3 pt-6 border-t border-slate-100 mt-5">
                    <Button
                      disabled={actioningId === req.id}
                      onClick={() => handleDecision(req.id, 'approved')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 border border-emerald-600/10 text-white text-xs font-bold py-2.5 rounded-xl transition duration-300 flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve Override
                    </Button>
                    <Button
                      disabled={actioningId === req.id}
                      onClick={() => handleDecision(req.id, 'rejected')}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 border border-rose-600/10 text-white text-xs font-bold py-2.5 rounded-xl transition duration-300 flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject Request
                    </Button>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-3">
              <FileText className="h-10 w-10 text-slate-400 mx-auto" />
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Queue Cleared</h3>
                <p className="text-[10px] text-slate-500">No exception or override requests currently require Dean approval.</p>
              </div>
            </div>
          )}
        </div>

      </main>

      {/* Footer */}
      <PageFooter type="cryptographic" />

    </div>
  );
}