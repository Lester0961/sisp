'use client';

import React, { useState, useEffect } from 'react';
import { chatApi, EscalationRecord, ChatSessionRecord, EligibleAssignee } from '@/lib/api/chat';
import { PageFooter } from '@/components/shared/PageFooter';
import { 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  User, 
  RefreshCw,
  Edit3,
  Check,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function EscalationsPage() {
  const [escalations, setEscalations] = useState<EscalationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('all');
  
  // Resolution Dialog state
  const [selectedRecord, setSelectedRecord] = useState<EscalationRecord | null>(null);
  const [selectedSession, setSelectedSession] = useState<ChatSessionRecord | null>(null);
  const [eligibleAssignees, setEligibleAssignees] = useState<EligibleAssignee[]>([]);
  const [targetAssignee, setTargetAssignee] = useState('');
  const [resolutionText, setResolutionText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await chatApi.getEscalations();
      setEscalations(data);
    } catch (error) {
      console.error('Failed to load escalations:', error);
      setLoadError('Could not load escalation records. Please try again.');
      toast.error('Could not load escalation records. Please check API server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleOpenResolve = async (record: EscalationRecord) => {
    const sessionId = record.chat.chatSession?.id;
    if (!sessionId) { toast.error('No advisor session is linked to this case.'); return; }
    try {
      setSelectedRecord(record);
      const [session, assignees] = await Promise.all([chatApi.getSession(sessionId), chatApi.getEligibleAssignees()]);
      setSelectedSession(session);
      setEligibleAssignees(assignees);
      setTargetAssignee(assignees.find((assignee) => assignee.id !== session.agentId)?.id || '');
      setResolutionText(record.resolution || '');
    } catch {
      setSelectedRecord(null);
      toast.error('Accept this concern before viewing its conversation.');
    }
  };

  const handleReassign = async () => {
    if (!selectedSession || !targetAssignee) return;
    try {
      const session = await chatApi.reassignSession(selectedSession.id, targetAssignee);
      setSelectedSession(session);
      setTargetAssignee(eligibleAssignees.find((assignee) => assignee.id !== session.agentId)?.id || '');
      toast.success('Concern reassigned. The previous representative has lost access.');
      await fetchRecords();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not reassign this concern.');
    }
  };

  const handleAccept = async (record: EscalationRecord) => {
    const sessionId = record.chat.chatSession?.id;
    if (!sessionId) { toast.error('No advisor session is linked to this case.'); return; }
    try {
      await chatApi.assignSession(sessionId);
      toast.success('Concern accepted and assigned to you.');
      await fetchRecords();
    } catch {
      toast.error('This concern may have been claimed by another representative. Refresh and retry.');
    }
  };

  const handleSubmitResolution = async () => {
    if (!selectedRecord) return;
    if (!resolutionText.trim()) {
      toast.error('Please input a resolution before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      await chatApi.resolveEscalation(selectedRecord.id, resolutionText.trim());
      toast.success('Escalation resolved and updated successfully!');
      setSelectedRecord(null);
      fetchRecords(); // Reload grid
    } catch (error) {
      console.error('Failed to submit resolution:', error);
      toast.error('Failed to submit resolution. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Stats computation
  const pendingCount = escalations.filter(e => e.status === 'pending' || e.status === 'in_progress').length;
  const resolvedCount = escalations.filter(e => e.status === 'resolved').length;

  // Filtered dataset
  const filteredRecords = escalations.filter(e => {
    if (filterStatus === 'all') return true;
    return filterStatus === 'pending' ? e.status === 'pending' || e.status === 'in_progress' : e.status === filterStatus;
  });

  return (
    <div className="flex min-h-full flex-col">
      <main className="portal-main max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="portal-page-header flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="portal-title flex items-center gap-2">
            <ShieldAlert className="size-6 text-[#0a439b]" strokeWidth={1.8} />
            Advising escalations
          </h1>
          <p className="portal-description mt-2">
            Review and provide official registrar resolutions for queries flagged for human review by ARIA.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchRecords} 
          disabled={loading}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Queue
        </Button>
      </div>

      {/* Stats Cards Row */}
      <div className="portal-surface grid grid-cols-3 divide-x divide-[#dce7ef] overflow-hidden p-0">
        <Card className="rounded-none border-0 bg-transparent shadow-none">
          <CardContent className="p-4 sm:p-5">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#587387]">Total</span>
              <h2 className="mt-2 text-2xl font-semibold text-[#102f49]">{escalations.length}</h2>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-0 bg-amber-50/40 shadow-none">
          <CardContent className="p-4 sm:p-5">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">Pending</span>
              <h2 className="mt-2 text-2xl font-semibold text-amber-700">{pendingCount}</h2>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-0 bg-emerald-50/40 shadow-none">
          <CardContent className="p-4 sm:p-5">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">Resolved</span>
              <h2 className="mt-2 text-2xl font-semibold text-emerald-700">{resolvedCount}</h2>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-[#dce7ef] pb-4">
        <Button 
          variant={filterStatus === 'all' ? 'default' : 'ghost'}
          onClick={() => setFilterStatus('all')}
          className="h-8 px-4 text-xs font-medium rounded-full"
        >
          All Requests ({escalations.length})
        </Button>
        <Button 
          variant={filterStatus === 'pending' ? 'default' : 'ghost'}
          onClick={() => setFilterStatus('pending')}
          className="h-8 px-4 text-xs font-medium rounded-full text-amber-700 hover:text-amber-800"
        >
          Pending Handoffs ({pendingCount})
        </Button>
        <Button 
          variant={filterStatus === 'resolved' ? 'default' : 'ghost'}
          onClick={() => setFilterStatus('resolved')}
          className="h-8 px-4 text-xs font-medium rounded-full text-emerald-700 hover:text-emerald-800"
        >
          Resolved ({resolvedCount})
        </Button>
      </div>

      {/* Escalations List */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-2">
          <Clock className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="text-sm font-semibold">Fetching escalations queue...</span>
        </div>
      ) : loadError ? (
        <div className="portal-surface portal-empty" role="alert">
          <div>
            <h2 className="font-semibold text-[#102f49]">Escalations are unavailable</h2>
            <p className="mt-1 text-sm text-rose-700">{loadError}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void fetchRecords()} disabled={loading}>Try again</Button>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="portal-surface portal-empty">
          <div className="h-16 w-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100 mx-auto">
            <Check className="h-8 w-8 text-emerald-500" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-base">All caught up!</h4>
            <p className="text-slate-500 text-xs mt-1">No pending escalations matched your filter criteria.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredRecords.map((record) => {
            const dateFormatted = new Date(record.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            const isPending = record.status === 'pending' || record.status === 'in_progress';
            const session = record.chat.chatSession;

            return (
              <Card key={record.id} className="portal-surface overflow-hidden">
                <CardHeader className="bg-slate-50/50 p-4 border-b flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center space-x-3 select-none">
                    <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase shadow-inner">
                      {'S'}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-800">Student {session?.student.studentNumber || 'record'}</h4>
                      <div className="flex items-center text-[10px] text-slate-400 space-x-2.5 mt-0.5">
                        <span className="flex items-center gap-1">
                          <User className="h-2.5 w-2.5" />
                        </span>
                        <span>•</span>
                        <span>Student support request</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={`text-[10px] h-5 px-2 font-bold uppercase tracking-wide border-0 ${
                      isPending ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {record.status}
                    </Badge>
                    <span className="text-[10px] text-slate-400 font-medium">{dateFormatted}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="p-4 space-y-3">
                  {/* Chat query snippet */}
                  <div className="bg-slate-50 border border-slate-100/50 p-3 rounded-xl space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 select-none">
                      <User className="h-3 w-3" />
                      Student Message:
                    </div>
                    <p className="text-slate-800 text-xs leading-relaxed font-semibold">
                      Human review requested Â· {record.chat.intent || 'student support'}
                    </p>
                  </div>

                  {/* ARIA default response snippet */}
                  <div className="bg-indigo-50/20 border border-indigo-50/50 p-3 rounded-xl space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1 select-none">
                      <Sparkles className="h-3 w-3" />
                      ARIA response
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed italic truncate">
                      {session?.agentId ? 'Conversation available to the assigned representative.' : 'Accept this concern to review the conversation.'}
                    </p>
                  </div>

                  {/* If resolved: display resolution */}
                  {!isPending && record.resolution && (
                    <div className="border-t border-slate-100 pt-3 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1 select-none">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Staff response
                      </div>
                      <div className="bg-emerald-50/20 border border-emerald-50/40 p-3 rounded-xl text-xs leading-relaxed text-slate-700">
                        {record.resolution}
                      </div>
                      {record.assignee && (
                        <div className="text-[10px] text-slate-400 font-medium text-right">
                          Assigned to: <span className="text-slate-600 font-bold">{record.assignee.firstName} {record.assignee.lastName}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>

                {isPending && (
                  <CardFooter className="p-4 border-t bg-slate-50/30 flex items-center justify-end">
                    <Button 
                      size="sm" 
                      onClick={() => session?.agentId ? void handleOpenResolve(record) : void handleAccept(record)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 h-8 px-3.5 rounded-lg shadow-sm"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      {session?.agentId ? 'Open assigned concern' : 'Accept concern'}
                    </Button>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Resolution Interactive Modal Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && (setSelectedRecord(null), setSelectedSession(null), setEligibleAssignees([]))}>
        <DialogContent className="max-w-2xl bg-white border border-slate-100 rounded-2xl shadow-2xl p-6 overflow-hidden">
          <DialogHeader className="select-none">
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-indigo-600" />
              Resolve Inquiry Escalation
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              Provide an official response. Your resolution will be posted directly back to the student&apos;s chat window as an official advisor notification.
            </DialogDescription>
          </DialogHeader>
          
          <Separator className="my-2" />

          {selectedRecord && (
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {/* Student info card */}
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Student record: <strong className="text-slate-800 font-bold">{selectedSession?.student.studentNumber}</strong></span>
              </div>

              {/* Student Query */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">Student Question:</label>
                <div className="p-3 border border-slate-100 rounded-xl bg-slate-50 text-xs font-semibold text-slate-800 leading-relaxed">
                  {selectedSession?.chatLog?.message || 'Conversation question unavailable.'}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Conversation</label>
                {selectedSession?.messages?.map((message) => <div key={message.id} className="rounded-lg border border-slate-100 bg-white p-2 text-xs"><strong>{message.senderRole === 'student' ? 'Student' : 'Staff'}:</strong> {message.content}</div>)}
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <label htmlFor="reassign-concern" className="text-xs font-medium text-slate-600">Reassign to an active representative</label>
                <select id="reassign-concern" value={targetAssignee} onChange={(event) => setTargetAssignee(event.target.value)} className="min-w-48 rounded-lg border border-slate-200 bg-white p-2 text-xs">
                  {eligibleAssignees.filter((assignee) => assignee.id !== selectedSession?.agentId).map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.firstName} {assignee.lastName} · {assignee.role.name}</option>)}
                </select>
                <Button type="button" size="sm" variant="outline" onClick={() => void handleReassign()} disabled={!targetAssignee}>Reassign</Button>
              </div>

              {/* Resolution Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">Official Advisor Resolution Response:</label>
                <textarea
                  rows={4}
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  placeholder="Draft your official advisory response here..."
                  className="w-full p-3 text-xs leading-relaxed text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>
            </div>
          )}

          <Separator className="my-2" />

          <DialogFooter className="flex justify-end gap-2 p-1 bg-slate-50/50 rounded-b-xl select-none">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedRecord(null)}
              className="text-xs h-9 px-4 border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitResolution}
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 shadow flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Clock className="h-3.5 w-3.5 animate-spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-3.5 w-3.5" />
                  Resolve Escalation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </main>

      <PageFooter type="advising" />
    </div>
  );
}
