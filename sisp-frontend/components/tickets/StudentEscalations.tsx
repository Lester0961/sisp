'use client';

import { useCallback, useEffect, useState } from 'react';
import { chatApi, ChatSessionMessage, ChatSessionRecord } from '@/lib/api/chat';
import { escalationChanged } from '@/stores/escalationAttentionStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Inbox, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';

export function StudentEscalations() {
  const [sessions, setSessions] = useState<ChatSessionRecord[]>([]);
  const [active, setActive] = useState<ChatSessionRecord | null>(null);
  const [messages, setMessages] = useState<ChatSessionMessage[]>([]);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const cases = await chatApi.getMySessions();
      setSessions(cases.filter((item) => item.escalationId));
      setError(null);
    } catch {
      setError('Could not load your escalations. Please try again.');
    }
  }, []);

  const readCase = useCallback(async (id: string) => {
    try {
      const [session, caseMessages] = await Promise.all([chatApi.getSession(id), chatApi.getSessionMessages(id)]);
      setActive(session);
      setMessages(caseMessages);
      await chatApi.markSessionViewed(id);
      escalationChanged();
    } catch {
      toast.error('Could not open this escalation. Please refresh and try again.');
    }
  }, []);

  useEffect(() => {
    void load();
    const caseId = new URLSearchParams(window.location.search).get('case');
    if (caseId) void readCase(caseId);
    const onOpen = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (id) void readCase(id);
    };
    window.addEventListener('sisp-open-escalation', onOpen);
    const timer = window.setInterval(() => void load(), 20_000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('sisp-open-escalation', onOpen);
    };
  }, [load, readCase]);

  useEffect(() => {
    if (!active?.id) return;
    const id = active.id;
    const timer = window.setInterval(() => void readCase(id), 8_000);
    return () => window.clearInterval(timer);
  }, [active?.id, readCase]);

  const send = async () => {
    if (!active || !reply.trim()) return;
    setBusy(true);
    try {
      const message = await chatApi.sendSessionMessage(active.id, reply.trim());
      setMessages((current) => [...current, message]);
      setReply('');
    } catch (cause: any) {
      toast.error(cause?.response?.data?.message ?? 'Could not send your reply.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="portal-main max-w-5xl space-y-6">
      <div className="portal-page-header flex items-end justify-between">
        <div>
          <h1 className="portal-title">My escalations</h1>
          <p className="portal-description mt-2">Follow up on questions sent from ARIA to school staff.</p>
        </div>
        <Button variant="outline" onClick={() => void load()}><RefreshCw className="size-4" /> Refresh</Button>
      </div>
      {error && <div className="portal-surface portal-empty text-rose-700" role="alert">{error}</div>}
      {sessions.length === 0 && !error && (
        <div className="portal-surface portal-empty"><Inbox className="size-6 text-slate-400" />No escalations yet. You can request human assistance from ARIA.</div>
      )}
      <div className="grid gap-3">
        {sessions.map((session) => (
          <Card key={session.id} className="portal-surface">
            <CardHeader className="flex flex-row items-center justify-between p-4">
              <div>
                <p className="text-sm font-semibold text-[#102f49]">{session.chatLog?.message ?? 'ARIA support request'}</p>
                <p className="text-xs text-[#587387]">Updated {new Date(session.updatedAt).toLocaleString()}</p>
              </div>
              <Badge variant="outline">{session.status === 'closed' ? 'Resolved' : session.agentId ? 'With staff' : 'Awaiting Dean'}</Badge>
            </CardHeader>
            <CardContent className="flex justify-end p-4 pt-0"><Button size="sm" onClick={() => void readCase(session.id)}>Open conversation</Button></CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>Support conversation · {active?.status === 'closed' ? 'resolved' : 'open'}</DialogTitle>
            <DialogDescription>Only you and the currently assigned staff member can reply.</DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {messages.map((message) => (
              <div key={message.id} className="rounded-lg border border-[#dce7ef] p-3 text-sm">
                <span className="font-semibold">{message.senderRole === 'student' ? 'You' : 'Staff'}:</span> {message.content}
              </div>
            ))}
            {messages.length === 0 && <p className="text-sm text-[#587387]">A staff member has not replied yet.</p>}
          </div>
          {active?.status === 'open' && (
            <div className="flex items-end gap-2">
              <textarea rows={2} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply to school staff..." className="w-full rounded-xl border border-[#bed1e0] p-2 text-sm" />
              <Button onClick={() => void send()} disabled={busy || !reply.trim()} aria-label="Send reply"><Send className="size-4" /></Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
