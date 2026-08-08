'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { chatApi, ChatSessionMessage, ChatSessionRecord } from '@/lib/api/chat';
import { Navbar } from '@/components/shared/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  MessageSquare,
  RefreshCw,
  Send,
  UserRound,
} from 'lucide-react';

function studentName(session: ChatSessionRecord) {
  const firstName = session.student?.user?.firstName ?? '';
  const lastName = session.student?.user?.lastName ?? '';
  return `${firstName} ${lastName}`.trim() || 'Student';
}

function studentInitial(session: ChatSessionRecord) {
  return studentName(session).charAt(0).toUpperCase() || 'S';
}

export default function LiveAgentPage() {
  const [sessions, setSessions] = useState<ChatSessionRecord[]>([]);
  const [mySessionIds, setMySessionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ChatSessionRecord | null>(null);
  const [messages, setMessages] = useState<ChatSessionMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadSessionMessages = useCallback(async (sessionId: string) => {
    try {
      setMessages(await chatApi.getSessionMessages(sessionId));
    } catch {
      toast.error('Unable to load this conversation.');
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [queue, mine] = await Promise.all([
        chatApi.getSessions('open'),
        chatApi.getAssignedSessions(),
      ]);
      setSessions(queue);
      setMySessionIds(new Set(mine.map((session) => session.id)));
    } catch {
      setError('We could not load the support queue. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
    const interval = window.setInterval(() => void loadSessions(), 15_000);
    return () => window.clearInterval(interval);
  }, [loadSessions]);

  useEffect(() => {
    if (!activeSession) return;
    void loadSessionMessages(activeSession.id);
    const interval = window.setInterval(
      () => void loadSessionMessages(activeSession.id),
      12_000,
    );
    return () => window.clearInterval(interval);
  }, [activeSession?.id, loadSessionMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  const handleOpenSession = async (session: ChatSessionRecord) => {
    setActiveSession(session);
    setMessages([]);
    await loadSessionMessages(session.id);
  };

  const handleAssignSession = async () => {
    if (!activeSession) return;
    setAssigning(true);
    try {
      const assigned = await chatApi.assignSession(activeSession.id);
      setActiveSession(assigned);
      setMySessionIds((previous) => new Set(previous).add(assigned.id));
      setSessions((previous) => previous.map((session) => session.id === assigned.id ? assigned : session));
      toast.success('Session assigned to you.');
    } catch {
      toast.error('Unable to assign this session.');
    } finally {
      setAssigning(false);
    }
  };

  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim() || !activeSession) return;
    setSending(true);
    try {
      await chatApi.sendSessionMessage(activeSession.id, input.trim());
      setInput('');
      await loadSessionMessages(activeSession.id);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Unable to send your response.');
    } finally {
      setSending(false);
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    setClosing(true);
    try {
      await chatApi.closeSession(activeSession.id);
      toast.success('Support session closed.');
      setCloseDialogOpen(false);
      setActiveSession(null);
      setMessages([]);
      await loadSessions();
    } catch {
      toast.error('Unable to close this session.');
    } finally {
      setClosing(false);
    }
  };

  const openCount = sessions.filter((session) => session.status === 'open').length;
  const unassignedCount = sessions.filter((session) => session.status === 'open' && !session.agentId).length;

  if (activeSession) {
    const isMine = mySessionIds.has(activeSession.id);
    const isUnassigned = !activeSession.agentId;

    return (
      <div className="portal-page flex min-h-[100dvh] flex-col">
        <Navbar />
        <main className="portal-main flex min-h-0 flex-1 flex-col gap-4 pb-4">
          <div className="portal-surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setActiveSession(null);
                  setMessages([]);
                }}
                aria-label="Back to support queue"
              >
                <ArrowLeft className="size-4" strokeWidth={1.8} />
              </Button>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eaf3fa] font-semibold text-[#0a439b]">
                {studentInitial(activeSession)}
              </div>
              <div className="min-w-0">
                <h1 className="truncate font-semibold text-[#102f49]">{studentName(activeSession)}</h1>
                <p className="truncate text-xs text-[#587387]">
                  {activeSession.student?.studentNumber || 'Student record'}
                  {activeSession.student?.user?.email ? ` · ${activeSession.student.user.email}` : ''}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-[#cfe6db] bg-[#edf9f1] text-[#16794c]">Open</Badge>
              {isUnassigned ? (
                <Button size="sm" onClick={() => void handleAssignSession()} disabled={assigning}>
                  <UserRound className="size-4" strokeWidth={1.8} />
                  {assigning ? 'Assigning' : 'Assign to me'}
                </Button>
              ) : isMine ? (
                <Badge variant="outline" className="border-[#b8d5ed] bg-[#f1f7fb] text-[#0a439b]">Assigned to you</Badge>
              ) : (
                <Badge variant="outline" className="border-[#f3d6a7] bg-[#fff8eb] text-[#9a5b05]">Assigned</Badge>
              )}
              <Button variant="outline" size="sm" className="border-[#f0c4c4] text-[#b42318] hover:bg-[#fff4f4]" onClick={() => setCloseDialogOpen(true)}>
                Close session
              </Button>
            </div>
          </div>

          <section className="portal-surface flex min-h-[calc(100dvh-17rem)] flex-1 flex-col overflow-hidden">
            <div className="border-b border-[#e7eef3] px-5 py-3">
              <p className="text-sm font-semibold text-[#102f49]">Conversation</p>
              <p className="mt-0.5 text-xs text-[#587387]">Keep replies clear, factual, and within school support policy.</p>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#fbfdfe] p-4 sm:p-5">
              {messages.length === 0 ? (
                <div className="portal-empty min-h-[16rem]">
                  <MessageSquare className="size-8 text-[#0a439b]" strokeWidth={1.7} />
                  <div>
                    <h2 className="font-semibold text-[#102f49]">No messages yet</h2>
                    <p className="mt-1 text-sm text-[#587387]">Start with a concise response when you are ready.</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => {
                  const isAgent = message.senderRole !== 'student';
                  return (
                    <article key={message.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[72%] ${isAgent ? 'rounded-br-md bg-[#0a439b] text-white' : 'rounded-bl-md border border-[#dce7ef] bg-white text-[#102f49]'}`}>
                        <p>{message.content}</p>
                        <p className={`mt-2 text-[11px] ${isAgent ? 'text-blue-100' : 'text-[#6c879a]'}`}>
                          {isAgent ? 'Support agent' : studentName(activeSession)} · {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </article>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="border-t border-[#dce7ef] bg-white p-3 sm:p-4">
              <label htmlFor="agent-response" className="sr-only">Write a response</label>
              <div className="flex items-center gap-2">
                <input
                  id="agent-response"
                  type="text"
                  placeholder="Write a response"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  disabled={sending}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-[#cbdde9] bg-[#fbfdfe] px-4 text-sm text-[#102f49] placeholder:text-[#6c879a] focus:border-[#0a439b] focus:outline-none focus:ring-4 focus:ring-[#0a439b]/10"
                />
                <Button type="submit" size="icon" disabled={!input.trim() || sending} aria-label="Send response">
                  <Send className="size-4" strokeWidth={1.8} />
                </Button>
              </div>
            </form>
          </section>
        </main>

        <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
          <DialogContent showCloseButton={!closing}>
            <DialogHeader>
              <DialogTitle>Close this support session?</DialogTitle>
              <DialogDescription>
                The student will no longer be able to continue this conversation through the active session.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={closing}>Cancel</Button>
              </DialogClose>
              <Button variant="destructive" onClick={() => void handleCloseSession()} disabled={closing}>
                {closing ? 'Closing' : 'Close session'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="portal-page">
      <Navbar />
      <main className="portal-main">
        <div className="portal-page-header">
          <div>
            <h1 className="portal-title">Support queue</h1>
            <p className="portal-description mt-2">Review escalated student concerns, then open or claim the session you can support.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadSessions()} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin' : ''} strokeWidth={1.8} />
            Refresh
          </Button>
        </div>

        <section className="mb-5 grid grid-cols-3 divide-x divide-[#dce7ef] overflow-hidden rounded-2xl border border-[#dce7ef] bg-white shadow-[0_10px_28px_rgb(15_45_74_/_0.055)]">
          <div className="p-3 sm:p-4"><p className="text-xs text-[#587387]">Open</p><p className="mt-1 text-2xl font-semibold text-[#102f49]">{openCount}</p></div>
          <div className="p-3 sm:p-4"><p className="text-xs text-[#587387]">Mine</p><p className="mt-1 text-2xl font-semibold text-[#0a439b]">{mySessionIds.size}</p></div>
          <div className="p-3 sm:p-4"><p className="text-xs text-[#587387]">Unassigned</p><p className="mt-1 text-2xl font-semibold text-[#9a5b05]">{unassignedCount}</p></div>
        </section>

        {loading ? (
          <section className="portal-surface space-y-3 p-5">
            <div className="portal-skeleton h-16 w-full" />
            <div className="portal-skeleton h-16 w-full" />
            <div className="portal-skeleton h-16 w-full" />
          </section>
        ) : error ? (
          <section className="portal-surface portal-empty">
            <AlertCircle className="size-8 text-[#b42318]" strokeWidth={1.8} />
            <div><h2 className="font-semibold text-[#102f49]">Queue unavailable</h2><p className="mt-1 text-sm text-[#587387]">{error}</p></div>
            <Button size="sm" onClick={() => void loadSessions()}>Try again</Button>
          </section>
        ) : sessions.length === 0 ? (
          <section className="portal-surface portal-empty">
            <CheckCircle2 className="size-8 text-[#16794c]" strokeWidth={1.8} />
            <div><h2 className="font-semibold text-[#102f49]">The queue is clear</h2><p className="mt-1 text-sm text-[#587387]">No open student support sessions need attention.</p></div>
          </section>
        ) : (
          <section className="portal-surface overflow-hidden">
            <div className="border-b border-[#dce7ef] px-5 py-4"><h2 className="font-semibold text-[#102f49]">Open sessions</h2></div>
            <div className="divide-y divide-[#e7eef3]">
              {sessions.map((session) => {
                const isMine = mySessionIds.has(session.id);
                const isUnassigned = !session.agentId;
                return (
                  <article key={session.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <button type="button" onClick={() => void handleOpenSession(session)} className="flex min-w-0 items-start gap-3 text-left">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eaf3fa] text-sm font-semibold text-[#0a439b]">{studentInitial(session)}</span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2"><span className="truncate font-semibold text-[#102f49]">{studentName(session)}</span>{isMine && <Badge variant="outline" className="border-[#b8d5ed] bg-[#f1f7fb] text-[#0a439b]">Mine</Badge>}</span>
                        <span className="mt-1 block truncate text-xs text-[#587387]">{session.student?.studentNumber || 'Student record'}{session.messages?.[0]?.content ? ` · ${session.messages[0].content}` : ''}</span>
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                      <Badge className={isUnassigned ? 'border-[#f3d6a7] bg-[#fff8eb] text-[#9a5b05]' : 'border-[#b8d5ed] bg-[#f1f7fb] text-[#0a439b]'}>{isUnassigned ? 'Unassigned' : 'Assigned'}</Badge>
                      <Button size="sm" onClick={() => void handleOpenSession(session)}>Open <ArrowRight className="size-4" strokeWidth={1.8} /></Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
