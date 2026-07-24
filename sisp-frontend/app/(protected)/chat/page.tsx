'use client';

import React, { useState, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useChatStore } from '@/stores/chatStore';
import {
  MessageSquare,
  Send,
  Trash2,
  BookOpen,
  Sparkles,
  AlertCircle,
  Clock,
  User,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/shared/Navbar';
import { toast } from 'sonner';

const formatMarkdown = (text: string) => {
  if (!text) return '';
  let formatted = text;
  formatted = formatted
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  formatted = formatted.replace(/^### (.*?)$/gm, '<h4 class="text-sm font-bold text-[#1e3a8a] mt-3 mb-1">$1</h4>');
  formatted = formatted.replace(/^## (.*?)$/gm, '<h3 class="text-base font-bold text-slate-900 mt-4 mb-2">$1</h3>');
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
  formatted = formatted.replace(/^&gt; (.*?)$/gm, '<blockquote class="border-l-4 border-blue-200 pl-3 my-2 italic text-slate-600 bg-slate-50/50 py-1 rounded-r">$1</blockquote>');
  formatted = formatted.replace(/^\s*[-*]\s+(.*?)$/gm, '<li class="ml-4 list-disc text-slate-700 my-0.5">$1</li>');
  formatted = formatted.replace(/\n/g, '<br/>');
  return DOMPurify.sanitize(formatted, {
    ALLOWED_TAGS: ['h3', 'h4', 'strong', 'blockquote', 'li', 'br'],
    ALLOWED_ATTR: ['class'],
  });
};

export default function ChatPage() {
  const {
    messages,
    isTyping,
    isLoadingHistory,
    clearMessages,
    sendMessage,
    isLiveChatMode,
    activeSessionId,
    liveMessages,
    loadLiveMessages,
    sendLiveMessage,
    setLiveChatMode,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [expandedSources, setExpandedSources] = useState<string | null>(null);
  const [liveInput, setLiveInput] = useState('');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, [messages, isTyping, liveMessages]);

  // Poll for new live messages when in live chat mode
  useEffect(() => {
    if (isLiveChatMode && activeSessionId) {
      loadLiveMessages(activeSessionId);
      const interval = setInterval(() => {
        loadLiveMessages(activeSessionId);
      }, 10000);
      setPollingInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  }, [isLiveChatMode, activeSessionId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const textToSend = input;
    setInput('');
    await sendMessage(textToSend);
  };

  const handleSendLive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveInput.trim() || !activeSessionId) return;
    const textToSend = liveInput;
    setLiveInput('');
    await sendLiveMessage(activeSessionId, textToSend);
  };

  const handleBackToARIA = () => {
    setLiveChatMode(false);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <div className="hidden md:block">
        <Navbar />
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a8a] via-blue-800 to-blue-600 text-white p-4 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              {isLiveChatMode ? <User className="h-5 w-5 text-blue-200" /> : <Sparkles className="h-5 w-5 text-blue-200 animate-pulse" />}
            </div>
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-blue-800" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">
              {isLiveChatMode ? 'Live Agent Chat' : 'ARIA Advisor'}
            </h1>
            <span className="text-xs text-blue-200 font-medium">
              {isLiveChatMode ? 'Human Support' : 'AI Assistant'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLiveChatMode && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleBackToARIA}
              className="text-blue-100 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to ARIA
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={clearMessages}
            title="Clear conversation"
            className="h-9 w-9 text-blue-100 hover:text-white hover:bg-white/10 rounded-full"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages Body */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-50/50 pb-[calc(72px+1rem)] md:pb-4"
      >
        {isLoadingHistory ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
            <Clock className="h-8 w-8 animate-spin text-blue-500" />
            <span className="text-sm font-medium">Loading history...</span>
          </div>
        ) : isLiveChatMode ? (
          // Live Agent Chat Mode
          <div className="space-y-4">
            {/* Live chat banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800">Live Agent Connected</p>
                <p className="text-[10px] text-amber-600">
                  You are now chatting with a human support agent. Messages refresh automatically every 10 seconds.
                </p>
              </div>
            </div>

            {liveMessages.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <User className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">Waiting for agent response...</p>
                <p className="text-xs mt-1">An agent will join the session shortly.</p>
              </div>
            ) : (
              liveMessages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}>
                    <div className="flex items-end space-x-2 max-w-[90%] md:max-w-[70%]">
                      {!isUser && (
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-sm text-white shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                      <div className={`p-3.5 rounded-2xl text-sm shadow-sm leading-relaxed border ${
                        isUser 
                          ? 'bg-[#1e3a8a] text-white border-blue-900 rounded-br-sm' 
                          : 'bg-white text-slate-800 border-slate-100 rounded-bl-sm'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-5">
            <div className="h-16 w-16 rounded-3xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-inner text-[#1e3a8a]">
              <MessageSquare className="h-8 w-8" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-800">Hi, I&apos;m ARIA</h2>
              <p className="text-sm text-slate-500 max-w-[280px] mt-2 mx-auto leading-relaxed">
                I can help you review official **enrollment procedures**, **grading policies**, and **document requests**.
              </p>
            </div>
            <div className="flex flex-col w-full max-w-[300px] gap-2.5 mt-2">
              <button 
                onClick={() => sendMessage("How do I request my Transcript of Records (TOR)?")}
                className="w-full text-left text-xs bg-white border border-slate-200 p-3 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 hover:text-[#1e3a8a] transition-all font-medium text-slate-600 shadow-sm"
              >
                📝 How do I request my TOR?
              </button>
              <button 
                onClick={() => sendMessage("What is the late enrollment fee?")}
                className="w-full text-left text-xs bg-white border border-slate-200 p-3 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 hover:text-[#1e3a8a] transition-all font-medium text-slate-600 shadow-sm"
              >
                💰 What is the late enrollment fee?
              </button>
              <button 
                onClick={() => sendMessage("How do I appeal a final grade?")}
                className="w-full text-left text-xs bg-white border border-slate-200 p-3 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 hover:text-[#1e3a8a] transition-all font-medium text-slate-600 shadow-sm"
              >
                🎓 How do I appeal a final grade?
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div 
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                <div className="flex items-end space-x-2 max-w-[90%] md:max-w-[70%]">
                  {!isUser && (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#1e3a8a] to-blue-600 flex items-center justify-center shadow-sm text-white shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  )}
                  
                  <div className={`p-3.5 rounded-2xl text-sm shadow-sm leading-relaxed border ${
                    isUser 
                      ? 'bg-[#1e3a8a] text-white border-blue-900 rounded-br-sm' 
                      : 'bg-white text-slate-800 border-slate-100 rounded-bl-sm'
                  }`}>
                    {msg.isLoading ? (
                      <div className="flex items-center space-x-1.5 py-1 px-2">
                        <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : (
                      <div 
                        dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }} 
                        className="space-y-1.5"
                      />
                    )}
                  </div>
                </div>

                {/* Citations */}
                {!isUser && msg.sources && msg.sources.length > 0 && (
                  <div className="ml-10 w-[85%] md:w-[70%]">
                    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
                      <button
                        onClick={() => setExpandedSources(expandedSources === msg.id ? null : msg.id)}
                        className="w-full flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors text-slate-500 font-medium text-xs"
                      >
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5" />
                          Sources ({msg.sources.length})
                        </span>
                        <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                          {expandedSources === msg.id ? 'Hide' : 'Show'}
                        </span>
                      </button>
                      
                      {expandedSources === msg.id && (
                        <div className="border-t border-slate-100 bg-slate-50 p-3 space-y-3">
                          {msg.sources.map((src, idx) => (
                            <div key={idx}>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                                <span>{src.source}</span>
                                <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-bold uppercase tracking-wider text-[#1e3a8a] bg-blue-50 border-0">
                                  {Math.round(src.similarity * 100)}% Match
                                </Badge>
                              </div>
                              <p className="text-slate-600 italic leading-relaxed text-xs">
                                &ldquo;{src.content_snippet}&rdquo;
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Escalation */}
                {!isUser && msg.escalated && (
                  <div className="ml-10 w-[85%] md:w-[70%]">
                    <div className="flex gap-2 items-start p-3 border border-amber-200 bg-amber-50 text-xs text-amber-800 rounded-xl shadow-sm">
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <span className="font-bold">Active Escalation:</span> This query is in the registrar&apos;s queue. A human representative has been notified.
                        {msg.sessionId && (
                          <button
                            onClick={() => {
                              setLiveChatMode(true);
                              if (msg.sessionId) loadLiveMessages(msg.sessionId);
                            }}
                            className="block mt-1 text-[10px] font-bold text-amber-700 underline hover:text-amber-900"
                          >
                            Click here to open live chat with an agent
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Form */}
      <div className="fixed bottom-[72px] md:bottom-0 left-0 w-full bg-white border-t border-slate-200 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3 shadow-[0_-5px_15px_rgba(0,0,0,0.02)] z-20">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          {isLiveChatMode ? (
            <form onSubmit={handleSendLive} className="w-full flex items-center gap-2">
              <Input
                type="text"
                placeholder="Message your live agent..."
                value={liveInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLiveInput(e.target.value)}
                disabled={isTyping || isLoadingHistory}
                className="flex-1 h-12 text-sm rounded-full border-slate-200 bg-slate-50 focus-visible:ring-[#1e3a8a] focus-visible:bg-white px-5 shadow-inner"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!liveInput.trim() || isTyping || isLoadingHistory}
                className="h-12 w-12 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md transition-all active:scale-95"
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSend} className="w-full flex items-center gap-2">
              <Input
                type="text"
                placeholder="Ask ARIA a question..."
                value={input}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                disabled={isTyping || isLoadingHistory}
                className="flex-1 h-12 text-sm rounded-full border-slate-200 bg-slate-50 focus-visible:ring-[#1e3a8a] focus-visible:bg-white px-5 shadow-inner"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!input.trim() || isTyping || isLoadingHistory}
                className="h-12 w-12 shrink-0 bg-[#1e3a8a] hover:bg-blue-800 text-white rounded-full shadow-md transition-all active:scale-95"
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
