'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { chatApi, ChatSessionRecord, ChatSessionMessage } from '@/lib/api/chat';
import { Navbar } from '@/components/shared/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  RefreshCw,
  User,
  Send,
  Clock,
  CheckCircle2,
  MessageSquare,
  AlertCircle,
  X,
  ArrowRight,
} from 'lucide-react';

export default function LiveAgentPage() {
  useAuth();
  const [sessions, setSessions] = useState<ChatSessionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<ChatSessionRecord | null>(null);
  const [messages, setMessages] = useState<ChatSessionMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await chatApi.getSessions('open');
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    const interval = setInterval(() => {
      loadSessions();
      if (activeSession) {
        loadSessionMessages(activeSession.id);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [activeSession?.id]);

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const data = await chatApi.getSessionMessages(sessionId);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleOpenSession = async (session: ChatSessionRecord) => {
    setActiveSession(session);
    await loadSessionMessages(session.id);
    // Auto-assign if not assigned
    if (!session.agentId) {
      try {
        await chatApi.assignSession(session.id);
        toast.success('Session assigned to you');
      } catch (err: any) {
        console.error('Failed to assign:', err);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeSession) return;
    setSending(true);
    try {
      await chatApi.sendSessionMessage(activeSession.id, input.trim());
      setInput('');
      await loadSessionMessages(activeSession.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    setClosingId(sessionId);
    try {
      await chatApi.closeSession(sessionId);
      toast.success('Session closed successfully');
      setActiveSession(null);
      setMessages([]);
      loadSessions();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to close session');
    } finally {
      setClosingId(null);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (activeSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4 md:p-6 space-y-4">
          {/* Session Header */}
          <div className="flex items-center justify-between bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setActiveSession(null); setMessages([]); }}
                className="text-slate-500 hover:text-slate-700"
              >
                <ArrowRight className="h-4 w-4 rotate-180 mr-1" />
                Back
              </Button>
              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                {activeSession.student?.user?.firstName?.[0] || 'S'}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {activeSession.student?.user?.firstName} {activeSession.student?.user?.lastName}
                </p>
                <p className="text-[10px] text-slate-400">
                  {activeSession.student?.studentNumber} • {activeSession.student?.user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px]">
                <Clock className="h-3 w-3 mr-1" />
                Open
              </Badge>
              <Button
                size="sm"
                variant="outline"
                disabled={closingId === activeSession.id}
                onClick={() => handleCloseSession(activeSession.id)}
                className="border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                {closingId === activeSession.id ? 'Closing...' : 'Close'}
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 bg-white border border-slate-100 rounded-xl p-4 overflow-y-auto min-h-[400px] space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isAgent = msg.senderRole !== 'student';
                return (
                  <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] p-3 rounded-2xl text-sm shadow-sm ${
                      isAgent
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                    }`}>
                      <p>{msg.content}</p>
                      <p className={`text-[9px] mt-1 ${isAgent ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {msg.sender?.firstName || msg.senderRole} • {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Type your response..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              className="flex-1 h-12 px-5 text-sm rounded-full border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
            />
            <Button
              type="submit"
              disabled={!input.trim() || sending}
              className="h-12 w-12 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md active:scale-95 transition-all"
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-slate-900">Live Agent Queue</h1>
            <p className="text-slate-500 text-sm">
              Manage and respond to escalated student inquiries.
            </p>
          </div>
          <Button
            onClick={loadSessions}
            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Open Sessions</p>
              <p className="text-3xl font-black text-indigo-700">{sessions.filter(s => s.status === 'open').length}</p>
            </div>
            <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100">
              <MessageSquare className="h-5 w-5" />
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned to Me</p>
              <p className="text-3xl font-black text-blue-700">{sessions.filter(s => s.status === 'open').length}</p>
            </div>
            <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100">
              <User className="h-5 w-5" />
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unassigned</p>
              <p className="text-3xl font-black text-amber-700">{sessions.filter(s => s.status === 'open' && !s.agentId).length}</p>
            </div>
            <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 border border-amber-100">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Open Sessions</h2>

          {loading ? (
            <div className="text-center py-10 text-xs text-slate-400">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
              <p className="text-xs text-slate-500">No open sessions. All caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleOpenSession(session)}
                  className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                      {session.student?.user?.firstName?.[0] || 'S'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {session.student?.user?.firstName} {session.student?.user?.lastName}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {session.student?.studentNumber} • {session.student?.user?.email}
                      </p>
                      {session.messages && session.messages[0] && (
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[300px]">
                          Last: {session.messages[0].content}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${
                      session.agentId
                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                        : 'bg-amber-50 text-amber-600 border-amber-200'
                    }`}>
                      {session.agentId ? 'Assigned' : 'Unassigned'}
                    </Badge>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg">
                      Open
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
