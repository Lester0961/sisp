'use client';

import DOMPurify from 'dompurify';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { AlertCircle, BookOpen, FileText, MessageSquare, RefreshCw, Send, Sparkles, Trash2, UserRound } from 'lucide-react';
import { useChatStore, type ChatMessage } from '@/stores/chatStore';
import { Navbar } from '@/components/shared/Navbar';
import { Button } from '@/components/ui/button';

function formatMarkdown(text: string) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.*?)$/gm, '<h4 class="mt-3 text-sm font-semibold text-[#102f49]">$1</h4>')
    .replace(/^## (.*?)$/gm, '<h3 class="mt-3 text-base font-semibold text-[#102f49]">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/^> (.*?)$/gm, '<blockquote class="my-2 border-l-2 border-[#9bc2df] pl-3 text-[#365a72]">$1</blockquote>')
    .replace(/^\s*[-*]\s+(.*?)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n/g, '<br/>');
  return DOMPurify.sanitize(escaped, {
    ALLOWED_TAGS: ['h3', 'h4', 'strong', 'blockquote', 'li', 'br'],
    ALLOWED_ATTR: ['class'],
  });
}

function MessageBubble({ message, onOpenLiveChat }: { message: ChatMessage; onOpenLiveChat: (sessionId: string) => void }) {
  const [showSources, setShowSources] = useState(false);
  const isStudent = message.role === 'user';
  const isLiveAgent = message.role === 'live_agent';

  return (
    <div className={`flex flex-col gap-2 ${isStudent ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[72%] ${isStudent ? 'rounded-br-md bg-[#0a439b] text-white' : isLiveAgent ? 'rounded-bl-md border border-[#b8d5ed] bg-[#f1f7fb] text-[#102f49]' : 'rounded-bl-md border border-[#dce7ef] bg-white text-[#102f49]'}`}>
        {message.isLoading ? (
          <div className="flex items-center gap-2 text-[#587387]"><RefreshCw className="size-4 animate-spin text-[#0a439b]" strokeWidth={1.8} />ARIA is preparing a response</div>
        ) : isStudent || isLiveAgent ? (
          <p>{message.content}</p>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }} />
        )}
      </div>

      {!isStudent && message.sources?.length ? (
        <div className="max-w-[90%] sm:max-w-[72%]">
          <button
            type="button"
            onClick={() => setShowSources((open) => !open)}
            aria-expanded={showSources}
            className="flex items-center gap-2 text-xs font-medium text-[#365a72] underline-offset-2 hover:text-[#0a439b] hover:underline"
          >
            <BookOpen className="size-3.5" strokeWidth={1.8} />
            {showSources ? 'Hide sources' : `Show ${message.sources.length} source${message.sources.length === 1 ? '' : 's'}`}
          </button>
          {showSources && (
            <div className="mt-2 space-y-3 rounded-xl border border-[#dce7ef] bg-white p-3">
              {message.sources.map((source, index) => (
                <div key={`${source.source}-${index}`}>
                  <p className="text-xs font-semibold text-[#102f49]">{source.source}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#587387]">{source.content_snippet}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {!isStudent && message.escalated && (
        <div className="max-w-[90%] rounded-xl border border-[#f3d6a7] bg-[#fff8eb] px-3 py-2 text-xs leading-relaxed text-[#7a4a03] sm:max-w-[72%]">
          <div className="flex items-start gap-2"><AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} /><p><span className="font-semibold">Human support requested.</span> A school representative can review this concern.</p></div>
          {message.sessionId ? <button type="button" onClick={() => onOpenLiveChat(message.sessionId!)} className="mt-2 font-semibold text-[#7a4a03] underline underline-offset-2">Open support conversation</button> : null}
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const {
    messages,
    isTyping,
    isLoadingHistory,
    historyLoaded,
    loadHistory,
    loadQuota,
    error,
    clearMessages,
    sendMessage,
    isLiveChatMode,
    activeSessionId,
    liveMessages,
    loadLiveMessages,
    sendLiveMessage,
    setLiveChatMode,
    quota,
    preferredLanguage,
    setPreferredLanguage,
  } = useChatStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!historyLoaded) void loadHistory();
  }, [historyLoaded, loadHistory]);

  useEffect(() => {
    void loadQuota();
  }, [loadQuota]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, isTyping, liveMessages]);

  useEffect(() => {
    if (!isLiveChatMode || !activeSessionId) return;
    void loadLiveMessages(activeSessionId);
    const interval = window.setInterval(() => void loadLiveMessages(activeSessionId), 12_000);
    return () => window.clearInterval(interval);
  }, [isLiveChatMode, activeSessionId, loadLiveMessages]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const value = input.trim();
    if (!value) return;
    setInput('');
    if (isLiveChatMode && activeSessionId) {
      await sendLiveMessage(activeSessionId, value);
      return;
    }
    await sendMessage(value);
  };

  const openLiveChat = (sessionId: string) => {
    setLiveChatMode(true);
    void loadLiveMessages(sessionId);
  };

  const visibleMessages = isLiveChatMode ? liveMessages : messages;
  const title = isLiveChatMode ? 'Human support' : 'ARIA advisor';
  const helper = isLiveChatMode ? 'Continue the conversation with a school support representative.' : 'Ask about school procedures, curriculum progress, or official document requests.';

  return (
    <div className="portal-page flex min-h-[100dvh] flex-col">
      <Navbar />
      <main className="portal-main flex min-h-0 flex-1 flex-col pb-4">
        <section className="portal-surface flex min-h-[calc(100dvh-11rem)] flex-1 flex-col overflow-hidden">
          <header className="flex flex-col gap-3 border-b border-[#dce7ef] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-[#eaf3fa] text-[#0a439b]">
                {isLiveChatMode ? <UserRound className="size-5" strokeWidth={1.8} /> : <Sparkles className="size-5" strokeWidth={1.8} />}
              </span>
              <div><h1 className="font-semibold text-[#102f49]">{title}</h1><p className="mt-0.5 max-w-xl text-sm text-[#587387]">{helper}</p></div>
            </div>
            <div className="flex items-center gap-2">
              {!isLiveChatMode ? (
                <label className="flex items-center gap-2 text-xs text-[#587387]">
                  <span className="sr-only">Response language</span>
                  <select
                    value={preferredLanguage}
                    onChange={(event) => setPreferredLanguage(event.target.value)}
                    className="h-8 rounded-lg border border-[#cbdde9] bg-white px-2 text-xs text-[#102f49] focus:border-[#0a439b] focus:outline-none"
                    aria-label="Response language"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="en">English</option>
                    <option value="fil">Filipino / Tagalog</option>
                    <option value="ceb">Cebuano / Bisaya</option>
                    <option value="ilo">Ilocano</option>
                    <option value="hil">Hiligaynon / Ilonggo</option>
                    <option value="war">Waray</option>
                  </select>
                </label>
              ) : null}
              {isLiveChatMode ? <Button variant="outline" size="sm" onClick={() => setLiveChatMode(false)}>Return to ARIA</Button> : null}
              {!isLiveChatMode ? <Button variant="ghost" size="icon-sm" onClick={clearMessages} aria-label="Clear ARIA conversation"><Trash2 className="size-4" strokeWidth={1.8} /></Button> : null}
            </div>
          </header>

          {!isLiveChatMode && quota ? (
            <div className="flex items-center justify-between gap-3 border-b border-[#dce7ef] bg-[#f7fbfd] px-5 py-2 text-xs text-[#587387]">
              <span>ARIA messages today</span>
              <span className="font-semibold text-[#102f49]">{quota.remainingToday} of {quota.dailyLimit} remaining</span>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[#fbfdfe] p-4 sm:p-5">
            {isLoadingHistory ? (
              <div className="portal-empty min-h-[18rem]"><RefreshCw className="size-7 animate-spin text-[#0a439b]" strokeWidth={1.8} /><p className="text-sm text-[#587387]">Loading conversation history</p></div>
            ) : visibleMessages.length === 0 ? (
              <div className="portal-empty min-h-[18rem]">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-[#eaf3fa] text-[#0a439b]"><MessageSquare className="size-7" strokeWidth={1.7} /></span>
                <div><h2 className="font-semibold text-[#102f49]">What can I help with?</h2><p className="mt-2 max-w-sm text-sm leading-relaxed text-[#587387]">ARIA explains approved school procedures and refers exceptional cases to a staff member.</p></div>
                {!isLiveChatMode ? (
                  <div className="grid w-full max-w-xl gap-2 sm:grid-cols-3">
                    <Button variant="outline" className="h-auto justify-start whitespace-normal py-3 text-left" onClick={() => void sendMessage('How do I request my Transcript of Records?')}><FileText className="size-4 shrink-0 text-[#0a439b]" strokeWidth={1.8} />Request records</Button>
                    <Button variant="outline" className="h-auto justify-start whitespace-normal py-3 text-left" onClick={() => void sendMessage('What is the late enrollment fee?')}><BookOpen className="size-4 shrink-0 text-[#0a439b]" strokeWidth={1.8} />Enrollment fees</Button>
                    <Button variant="outline" className="h-auto justify-start whitespace-normal py-3 text-left" onClick={() => void sendMessage('How do I appeal a final grade?')}><AlertCircle className="size-4 shrink-0 text-[#0a439b]" strokeWidth={1.8} />Grade appeal</Button>
                  </div>
                ) : null}
              </div>
            ) : (
              visibleMessages.map((message) => <MessageBubble key={message.id} message={message} onOpenLiveChat={openLiveChat} />)
            )}
            {error ? <div className="rounded-xl border border-[#f0c4c4] bg-[#fff4f4] px-3 py-2 text-sm text-[#b42318]">{error}</div> : null}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-[#dce7ef] bg-white p-3 sm:p-4">
            <label htmlFor="aria-message" className="sr-only">{isLiveChatMode ? 'Message human support' : 'Ask ARIA a question'}</label>
            <div className="flex items-center gap-2">
              <input
                id="aria-message"
                type="text"
                placeholder={isLiveChatMode ? 'Write a message' : 'Ask ARIA a question'}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={isTyping || isLoadingHistory || (isLiveChatMode && !activeSessionId)}
                className="h-11 min-w-0 flex-1 rounded-xl border border-[#cbdde9] bg-[#fbfdfe] px-4 text-sm text-[#102f49] placeholder:text-[#6c879a] focus:border-[#0a439b] focus:outline-none focus:ring-4 focus:ring-[#0a439b]/10"
              />
              <Button type="submit" size="icon" disabled={!input.trim() || isTyping || isLoadingHistory || (isLiveChatMode && !activeSessionId)} aria-label="Send message"><Send className="size-4" strokeWidth={1.8} /></Button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
