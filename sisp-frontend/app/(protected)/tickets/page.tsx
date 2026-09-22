'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  chatApi,
  AdvisorSessionSummary,
  ChatSessionMessage,
  ChatSessionRecord,
  EligibleAssignee,
  EscalationRecord,
} from '@/lib/api/chat';
import { useAuth } from '@/hooks/useAuth';
import { PageFooter } from '@/components/shared/PageFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Send, RefreshCw, ShieldAlert, CheckCircle, Forward, Inbox } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Human escalation workspace (Phase 1).
 *
 * - Dean: sees the unassigned escalation queue, can accept/answer, and forward
 *   tickets to any eligible staff member with a routing note.
 * - Other staff (faculty/dean/registrar/treasury/sys_admin): see only tickets
 *   assigned to them, reply, and resolve.
 * Escalation is a capability, not a role; there is no live_agent account.
 */
export default function TicketsPage() {
  const { user } = useAuth();
  const isDean = user?.role === 'dean';

  const [escalations, setEscalations] = useState<EscalationRecord[]>([]);
  const [assigned, setAssigned] = useState<AdvisorSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeSession, setActiveSession] = useState<ChatSessionRecord | null>(null);
  const [messages, setMessages] = useState<ChatSessionMessage[]>([]);
  const [reply, setReply] = useState('');
  const [resolution, setResolution] = useState('');
  const [assignees, setAssignees] = useState<EligibleAssignee[]>([]);
  const [forwardTo, setForwardTo] = useState('');
  const [forwardNote, setForwardNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (isDean) {
        const [queue, mine] = await Promise.all([
          chatApi.getEscalations(),
          chatApi.getAssignedSessions(),
        ]);
        setEscalations(queue);
        setAssigned(mine.data);
      } else {
        const mine = await chatApi.getAssignedSessions();
        setAssigned(mine.data);
      }
    } catch {
      setLoadError('Could not load escalation tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isDean]);

  useEffect(() => {
    void load();
  }, [load]);

  const openSession = async (sessionId: string) => {
    try {
      const [session, sessionMessages] = await Promise.all([
        chatApi.getSession(sessionId),
        chatApi.getSessionMessages(sessionId),
      ]);
      setActiveSession(session);
      setMessages(sessionMessages);
      setReply('');
      setResolution('');
      if (isDean) {
        try {
          const list = await chatApi.getEligibleAssignees();
          setAssignees(list.filter((entry) => entry.id !== session.agentId));
          setForwardTo(list.find((entry) => entry.id !== session.agentId)?.id ?? '');
        } catch {
          setAssignees([]);
        }
      }
    } catch {
      toast.error('This ticket is not assigned to you (or was reassigned).');
    }
  };

  const accept = async (record: EscalationRecord) => {
    const sessionId = record.chat.chatSession?.id;
    if (!sessionId) {
      toast.error('No support session is linked to this ticket.');
      return;
    }
    setBusy(true);
    try {
      await chatApi.assignSession(sessionId);
      toast.success('Concern accepted. You are now the assignee.');
      await openSession(sessionId);
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'The concern may already be claimed.');
      await load();
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!activeSession || !reply.trim()) return;
    setBusy(true);
    try {
      const message = await chatApi.sendSessionMessage(activeSession.id, reply.trim());
      setMessages((current) => [...current, message]);
      setReply('');
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Could not send the reply.');
    } finally {
      setBusy(false);
    }
  };

  const forward = async () => {
    if (!activeSession || !forwardTo) return;
    setBusy(true);
    try {
      await chatApi.reassignSession(activeSession.id, forwardTo, forwardNote.trim() || undefined);
      toast.success('Ticket forwarded. The previous assignee lost access.');
      setActiveSession(null);
      setForwardNote('');
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Could not forward this ticket.');
    } finally {
      setBusy(false);
    }
  };

  const resolve = async () => {
    if (!activeSession || !resolution.trim()) {
      toast.error('A resolution is required before closing the ticket.');
      return;
    }
    setBusy(true);
    try {
      await chatApi.closeSession(activeSession.id, resolution.trim());
      toast.success('Ticket resolved. The student has been notified.');
      setActiveSession(null);
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Could not resolve this ticket.');
    } finally {
      setBusy(false);
    }
  };

  const pendingQueue = escalations.filter((entry) => entry.status === 'pending');
  const openAssigned = assigned.filter((entry) => entry.status === 'open');

  return (
    <div className="flex min-h-full flex-col">
      <main className="portal-main max-w-7xl space-y-6">
        <div className="portal-page-header flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="portal-title flex items-center gap-2">
              <ShieldAlert className="size-6 text-[#0a439b]" strokeWidth={1.8} />
              {isDean ? 'Escalation queue' : 'My tickets'}
            </h1>
            <p className="portal-description mt-2">
              {isDean
                ? 'ARIA handoffs land here first. Accept to answer, or forward to the staff member who can resolve it.'
                : 'Tickets forwarded or assigned to you. Reply and resolve when the student has an answer.'}
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading} className="w-full sm:w-auto">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {loadError && (
          <div className="portal-surface portal-empty" role="alert">
            <p className="text-sm text-rose-700">{loadError}</p>
            <Button size="sm" variant="outline" onClick={() => void load()}>Try again</Button>
          </div>
        )}

        {isDean && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#587387]">
              Unassigned queue ({pendingQueue.length})
            </h2>
            {pendingQueue.length === 0 ? (
              <div className="portal-surface portal-empty">
                <CheckCircle className="h-6 w-6 text-emerald-500" />
                <p className="text-sm text-[#587387]">No unassigned escalations. All caught up.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {pendingQueue.map((record) => {
                  const session = record.chat.chatSession;
                  return (
                    <Card key={record.id} className="portal-surface">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-[#102f49]">
                            Student {session?.student.studentNumber ?? record.chatId}
                          </p>
                          <p className="text-[11px] text-[#6c879a]">
                            {record.chat.intent ?? 'general support'} ·{' '}
                            {new Date(record.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="border-0 bg-amber-50 text-amber-700">
                          {record.status}
                        </Badge>
                      </CardHeader>
                      <CardContent className="flex justify-end gap-2 p-4 pt-0">
                        <Button
                          size="sm"
                          onClick={() => void accept(record)}
                          disabled={busy || !session}
                          className="bg-[#0a439b] text-white hover:bg-[#083980]"
                        >
                          <Inbox className="h-3.5 w-3.5" />
                          Accept concern
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#587387]">
            {isDean ? `Assigned to me (${openAssigned.length})` : `Open tickets (${openAssigned.length})`}
          </h2>
          {openAssigned.length === 0 ? (
            <div className="portal-surface portal-empty">
              <Inbox className="h-6 w-6 text-slate-400" />
              <p className="text-sm text-[#587387]">
                {isDean ? 'Accept a queue item or wait for forwarded tickets.' : 'No open tickets assigned to you.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {openAssigned.map((session) => (
                <Card key={session.id} className="portal-surface">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-[#102f49]">
                        Student {session.student.studentNumber}
                      </p>
                      <p className="text-[11px] text-[#6c879a]">
                        Assigned to {session.agent?.firstName ?? 'you'} ·{' '}
                        {new Date(session.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => void openSession(session.id)}>
                      Open
                    </Button>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      <Dialog open={!!activeSession} onOpenChange={(open) => !open && setActiveSession(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>
              Student {activeSession?.student.studentNumber} · {activeSession?.status}
            </DialogTitle>
            <DialogDescription>
              {isDean
                ? 'Answer directly or forward to another staff member with a routing note.'
                : 'Reply to the student and resolve when done.'}
            </DialogDescription>
          </DialogHeader>
          <Separator />

          <div className="max-h-64 space-y-2 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-lg border p-2 text-xs ${
                  message.senderRole === 'student'
                    ? 'border-slate-100 bg-slate-50'
                    : 'border-[#b8d5ed] bg-[#f1f7fb]'
                }`}
              >
                <span className="font-semibold capitalize">
                  {message.senderRole === 'student' ? 'Student' : 'Staff'}:
                </span>{' '}
                {message.content}
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-xs text-[#6c879a]">No messages yet.</p>
            )}
          </div>

          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="Write a reply to the student..."
              className="w-full rounded-xl border border-[#bed1e0] bg-[#f8fbfd] p-2 text-xs"
            />
            <Button size="sm" onClick={() => void sendReply()} disabled={busy || !reply.trim()}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>

          {isDean && assignees.length > 0 && (
            <div className="space-y-2 rounded-xl border border-[#dce7ef] p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#587387]">
                Forward to staff
              </p>
              <select
                value={forwardTo}
                onChange={(event) => setForwardTo(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
              >
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.firstName} {assignee.lastName} · {assignee.role.name}
                  </option>
                ))}
              </select>
              <input
                value={forwardNote}
                onChange={(event) => setForwardNote(event.target.value)}
                placeholder="Routing note (what should they check?)"
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => void forward()}
                disabled={busy || !forwardTo}
              >
                <Forward className="h-3.5 w-3.5" />
                Forward ticket
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <textarea
              rows={3}
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
              placeholder="Resolution (posted to the student and closes the ticket)"
              className="w-full rounded-xl border border-[#bed1e0] bg-[#f8fbfd] p-2 text-xs"
            />
            <DialogFooter className="sm:justify-end">
              <Button
                onClick={() => void resolve()}
                disabled={busy || !resolution.trim() || activeSession?.agentId !== user?.id}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Resolve ticket
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <PageFooter type="advising" />
    </div>
  );
}
