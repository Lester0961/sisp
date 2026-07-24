'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Terminal } from 'lucide-react';

interface TerminalLine {
  text: string;
  type: 'input' | 'system' | 'success' | 'error';
}

export const MockTerminal: React.FC = () => {
  const [history, setHistory] = useState<TerminalLine[]>([
    { text: 'ARIA AI System Agent [v1.0.4] Initializing...', type: 'system' },
    { text: '✔ Core semantic and NLP handlers loaded successfully.', type: 'success' },
    { text: '✔ pgvector indexes verified: Cosine distance search fully operational.', type: 'success' },
    { text: "Type '/help' to discover available core commands or query the advisor.", type: 'system' },
  ]);
  const [inputVal, setInputVal] = useState('');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleCommand = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const command = inputVal.trim();
      if (!command) return;

      const newHistory = [...history, { text: `visitor@sisp-terminal:~$ ${command}`, type: 'input' as const }];
      const commandLower = command.toLowerCase();

      if (commandLower === '/help') {
        newHistory.push(
          { text: 'SISP Core Portal CLI - Available Commands:', type: 'system' },
          { text: '  /about    - Details the hybrid NLP- & semantic-based academic advisory framework.', type: 'system' },
          { text: '  /status   - Queries the active port services, response times, and models.', type: 'system' },
          { text: '  /clear    - Clears the terminal output screen buffer.', type: 'system' },
          { text: '  /chat [q] - Direct natural language interface to the FastAPI inference engine.', type: 'system' }
        );
      } else if (commandLower === '/about') {
        newHistory.push({
          text: 'SISP (Student Information and Services Portal) integrates a secure NestJS gateway with Prisma ORM and a high-performance scikit-learn FastAPI backend. Using pgvector for custom handbook document cosine embeddings, it allows ARIA AI to accurately resolve registration, grades, and academic policies with lightning speeds.',
          type: 'success',
        });
      } else if (commandLower === '/status') {
        newHistory.push(
          { text: '✔ [Gateway NestJS API]  - PORT 3001: Active & Secure (9ms latency)', type: 'success' },
          { text: '✔ [Inference FastAPI]   - PORT 8000: Running ARIA Engine (88ms latency)', type: 'success' },
          { text: '✔ [Database Postgres]    - Supabase pgvector: Sync successful (1.5ms latency)', type: 'success' },
          { text: '✔ [Active Session]      - Guest Sandbox Mode', type: 'system' }
        );
      } else if (commandLower === '/clear') {
        setHistory([]);
        setInputVal('');
        return;
      } else if (commandLower.startsWith('/chat ')) {
        const query = command.slice(6);
        newHistory.push({
          text: `Resolving semantic query: "${query}"...`,
          type: 'system',
        });
        
        // Custom interactive responses for realistic touch
        setTimeout(() => {
          let responseText = `[FastAPI ARIA AI Router]: Context parsed. Embedding distance matches SISP guidelines with 92.4% confidence. Query indicates academic routing support. For grades appeals, student must submit a signed Override appeal Exception to the Dean office.`;
          if (query.toLowerCase().includes('grade') || query.toLowerCase().includes('override') || query.toLowerCase().includes('fail')) {
            responseText = `[FastAPI ARIA AI Router]: Grades override policy: Under Article IV, Section 2 of Regis Marie Academic Code, grades appeals must be filed within 5 working days of grades release. Dean overrides require a cryptographically signed Exception ID verified under strict audit trails.`;
          } else if (query.toLowerCase().includes('hello') || query.toLowerCase().includes('hi')) {
            responseText = `[FastAPI ARIA AI Router]: Hello visitor! I am ARIA, the intelligent academic advisory chat system. Ask me questions about course credits, curricula, or administrative procedures.`;
          }
          
          setHistory(prev => [...prev, { text: responseText, type: 'success' }]);
        }, 300);
      } else {
        newHistory.push({
          text: `Error: Command not recognized: "${command}". Type '/help' to view valid commands.`,
          type: 'error',
        });
      }

      setHistory(newHistory);
      setInputVal('');
    }
  };

  return (
    <div className="w-full rounded-2xl border border-white/[0.06] bg-black/85 p-5 font-mono text-[11px] text-white shadow-2xl backdrop-blur-2xl">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between border-b border-white/[0.05] pb-3 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-rose-500/80 border border-rose-600/50" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80 border border-amber-600/50" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 border border-emerald-600/50" />
        </div>
        <span className="text-[9px] text-slate-500 uppercase tracking-widest flex items-center gap-1">
          <Terminal className="h-3 w-3 text-indigo-400" />
          ARIA-AI-ADVISOR://SHELL-SANDBOX
        </span>
        <div className="w-12" />
      </div>

      {/* Screen Log Display */}
      <div className="h-44 overflow-y-auto space-y-2.5 pr-2 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
        {history.map((line, idx) => (
          <div
            key={idx}
            className={`leading-relaxed whitespace-pre-wrap ${
              line.type === 'input'
                ? 'text-indigo-300'
                : line.type === 'system'
                ? 'text-slate-400'
                : line.type === 'success'
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            {line.text}
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>

      {/* Input Prompt */}
      <div className="flex items-center border-t border-white/[0.05] pt-3 mt-3">
        <span className="text-emerald-400 mr-2 shrink-0">visitor@sisp:~$</span>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleCommand}
          placeholder="Type /help or chat with ARIA..."
          className="flex-1 bg-transparent text-white outline-none placeholder-slate-600 focus:outline-none border-none p-0 text-[11px]"
        />
      </div>
    </div>
  );
};
