'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { 
  MessageSquare, 
  X, 
  Send, 
  Trash2, 
  BookOpen, 
  Sparkles, 
  User, 
  AlertCircle,
  HelpCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';

// Custom lightweight markdown renderer to safely format ARIA's RAG responses
const formatMarkdown = (text: string) => {
  if (!text) return '';
  
  let formatted = text;
  
  // Escape HTML entities to prevent XSS
  formatted = formatted
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  // Format Headers (e.g. ### Header)
  formatted = formatted.replace(/^### (.*?)$/gm, '<h4 class="text-sm font-bold text-indigo-900 mt-3 mb-1">$1</h4>');
  formatted = formatted.replace(/^## (.*?)$/gm, '<h3 class="text-base font-bold text-indigo-950 mt-4 mb-2">$1</h3>');
  
  // Format Bold (e.g. **text**)
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-indigo-950">$1</strong>');
  
  // Format Blockquotes (e.g. > quote)
  formatted = formatted.replace(/^&gt; (.*?)$/gm, '<blockquote class="border-l-4 border-indigo-200 pl-3 my-2 italic text-slate-600 bg-slate-50/50 py-1 rounded-r">$1</blockquote>');
  
  // Format Bullet points (e.g. - list item or * list item)
  formatted = formatted.replace(/^\s*[-*]\s+(.*?)$/gm, '<li class="ml-4 list-disc text-slate-700 my-0.5">$1</li>');
  
  // Format Line breaks / Paragraphs
  formatted = formatted.replace(/\n/g, '<br/>');
  
  return formatted;
};

export default function ChatWidget() {
  const {
    messages,
    isOpen,
    isTyping,
    isLoadingHistory,
    toggleChat,
    closeChat,
    clearMessages,
    sendMessage
  } = useChatStore();

  const [input, setInput] = useState('');
  const [expandedSources, setExpandedSources] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, isOpen, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const textToSend = input;
    setInput('');
    await sendMessage(textToSend);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* 1. Sliding Chat Card panel */}
      {isOpen && (
        <Card className="mb-4 h-[560px] w-[380px] flex flex-col shadow-2xl border-indigo-100 rounded-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 bg-white/95 backdrop-blur-sm">
          {/* Header Gradient */}
          <CardHeader className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 text-white p-4 flex flex-row items-center justify-between space-y-0 select-none">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                  <Sparkles className="h-5 w-5 text-indigo-200 animate-pulse" />
                </div>
                <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-indigo-700" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight tracking-wide flex items-center gap-1.5">
                  ARIA Advisor
                </h3>
                <span className="text-[10px] text-indigo-200 font-medium">Regis Marie College</span>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={clearMessages}
                title="Clear conversation"
                className="h-8 w-8 text-indigo-200 hover:text-white hover:bg-white/10 rounded-full"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={closeChat}
                className="h-8 w-8 text-indigo-200 hover:text-white hover:bg-white/10 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          {/* Messages Body */}
          <CardContent 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50"
          >
            {isLoadingHistory ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                <Clock className="h-6 w-6 animate-spin text-indigo-500" />
                <span className="text-xs font-medium">Loading chat history...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100/50 shadow-inner text-indigo-600">
                  <MessageSquare className="h-7 w-7" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Ask ARIA</h4>
                  <p className="text-xs text-slate-500 max-w-[240px] mt-1 leading-relaxed">
                    I can help you review official **enrollment procedures, grading policies**, and **document requests**.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-[280px]">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => sendMessage("How do I request my Transcript of Records (TOR)?")}
                    className="text-[11px] h-7 px-2.5 rounded-full border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/30"
                  >
                    📝 Order TOR
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => sendMessage("What is the late enrollment fee?")}
                    className="text-[11px] h-7 px-2.5 rounded-full border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/30"
                  >
                    💰 Late enrollment fee
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => sendMessage("How do I appeal a final grade?")}
                    className="text-[11px] h-7 px-2.5 rounded-full border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/30"
                  >
                    🎓 Appeal final grade
                  </Button>
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
                    {/* Speech bubble */}
                    <div className="flex items-end space-x-2 max-w-[85%]">
                      {!isUser && (
                        <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow text-white shrink-0">
                          <Sparkles className="h-3.5 w-3.5" />
                        </div>
                      )}
                      
                      <div className={`p-3 rounded-2xl text-xs shadow-sm leading-relaxed border ${
                        isUser 
                          ? 'bg-indigo-600 text-white border-indigo-700 rounded-br-none' 
                          : 'bg-white text-slate-800 border-slate-100 rounded-bl-none'
                      }`}>
                        {msg.isLoading ? (
                          <div className="flex items-center space-x-1.5 py-1 px-2 select-none">
                            <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        ) : (
                          <div 
                            dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }} 
                            className="space-y-1"
                          />
                        )}
                      </div>

                      {isUser && (
                        <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-200">
                          <User className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>

                    {/* Sources (RAG Citations) */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div className="ml-8 w-[80%]">
                        <div className="border border-slate-100 rounded-lg bg-white overflow-hidden shadow-inner text-[10px]">
                          <button
                            onClick={() => setExpandedSources(expandedSources === msg.id ? null : msg.id)}
                            className="w-full flex items-center justify-between p-2 hover:bg-slate-50 transition-colors text-slate-500 hover:text-indigo-600 font-medium"
                          >
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              Reference Policy Sources ({msg.sources.length})
                            </span>
                            <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
                              {expandedSources === msg.id ? 'Hide' : 'Show'}
                            </span>
                          </button>
                          
                          {expandedSources === msg.id && (
                            <div className="border-t border-slate-100 bg-slate-50/50 p-2 space-y-1.5 divide-y divide-slate-100/70">
                              {msg.sources.map((src, idx) => (
                                <div key={idx} className="pt-1.5 first:pt-0">
                                  <div className="flex items-center justify-between text-[9px] text-slate-400 mb-0.5 font-medium">
                                    <span>{src.source}</span>
                                    <Badge variant="secondary" className="text-[8px] h-3 px-1 font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 border-0">
                                      Match {Math.round(src.similarity * 100)}%
                                    </Badge>
                                  </div>
                                  <p className="text-slate-500 italic leading-snug">
                                    &ldquo;{src.content_snippet}&rdquo;
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Escalation Alert Badge */}
                    {!isUser && msg.escalated && (
                      <div className="ml-8 w-[80%]">
                        <div className="flex gap-2 items-start p-2 border border-amber-100 bg-amber-50/50 text-[10px] text-amber-800 rounded-lg shadow-sm">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Active Advisor Escalation:</span> This query is in the registrar's queue. A human representative has been notified.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Message Input Footer */}
          <CardFooter className="p-3 border-t bg-white flex items-center gap-2">
            <form onSubmit={handleSend} className="w-full flex items-center gap-2">
              <Input
                type="text"
                placeholder="Ask ARIA about college rules..."
                value={input}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                disabled={isTyping || isLoadingHistory}
                className="flex-1 h-9 text-xs rounded-full border-slate-200 focus-visible:ring-indigo-500 pr-4 pl-4"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!input.trim() || isTyping || isLoadingHistory}
                className="h-9 w-9 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md hover:shadow-lg transition-all"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}

      {/* 2. Floating Launcher Button */}
      <Button
        onClick={toggleChat}
        size="icon"
        className={`h-14 w-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border border-indigo-500/20 ${
          isOpen 
            ? 'bg-slate-800 hover:bg-slate-900 text-white' 
            : 'bg-gradient-to-tr from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white'
        }`}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <MessageSquare className="h-6 w-6 animate-pulse" />
            <div className="absolute -top-2.5 -right-2 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border-2 border-indigo-600 animate-bounce">
              AI
            </div>
          </div>
        )}
      </Button>
    </div>
  );
}
