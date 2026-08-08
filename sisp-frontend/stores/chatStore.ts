import { create } from 'zustand';
import { chatApi, ChatMessageApi, ChatSource } from '@/lib/api/chat';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'live_agent';
  content: string;
  intent?: string;
  confidence?: number;
  timestamp: Date;
  isLoading?: boolean;
  sources?: ChatSource[];
  escalated?: boolean;
  sessionId?: string | null;
}

interface ChatState {
  // State
  messages: ChatMessage[];
  isOpen: boolean;
  isTyping: boolean;
  isLoadingHistory: boolean;
  historyLoaded: boolean;
  error: string | null;
  activeSessionId: string | null;
  isLiveChatMode: boolean;
  liveMessages: ChatMessage[];

  // Actions
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  clearMessages: () => void;
  loadHistory: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  loadLiveMessages: (sessionId: string) => Promise<void>;
  sendLiveMessage: (sessionId: string, content: string) => Promise<void>;
  setLiveChatMode: (mode: boolean) => void;
}

const generateId = () =>
  Math.random().toString(36).substring(2) + Date.now().toString(36);

export const useChatStore = create<ChatState>()((set, get) => ({
  // Initial state
  messages: [],
  isOpen: false,
  isTyping: false,
  isLoadingHistory: false,
  historyLoaded: false,
  error: null,
  activeSessionId: null,
  isLiveChatMode: false,
  liveMessages: [],

  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
  openChat: () => {
    set({ isOpen: true });
    if (!get().historyLoaded) {
      get().loadHistory();
    }
  },
  closeChat: () => set({ isOpen: false }),

  clearMessages: () =>
    set({
      messages: [],
      isTyping: false,
      error: null,
      isLiveChatMode: false,
      activeSessionId: null,
      liveMessages: [],
    }),

  loadHistory: async () => {
    set({ isLoadingHistory: true, error: null });
    try {
      const data = await chatApi.getChatHistory();
      const mappedMessages: ChatMessage[] = [];
      
      data.forEach((log) => {
        mappedMessages.push({
          id: `${log.id}-user`,
          role: 'user',
          content: log.message,
          timestamp: new Date(log.createdAt),
        });
        
        mappedMessages.push({
          id: `${log.id}-assistant`,
          role: 'assistant',
          content: log.response,
          intent: log.intent || undefined,
          confidence: log.confidence || undefined,
          timestamp: new Date(log.createdAt),
          escalated: !!log.escalation,
          sessionId: log.escalation?.chatId || null,
        });
      });
      
      set({ 
        messages: mappedMessages, 
        isLoadingHistory: false, 
        historyLoaded: true 
      });
    } catch (error: any) {
      console.error('Failed to load chat history:', error);
      set({ 
        error: 'Failed to load conversation history.', 
        isLoadingHistory: false 
      });
    }
  },

  sendMessage: async (content: string) => {
    if (!content.trim()) return;

    const userMsgId = generateId();
    const assistantMsgId = generateId();

    const newUserMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    const loadingAssistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    set((state) => ({
      messages: [...state.messages, newUserMessage, loadingAssistantMessage],
      isTyping: true,
      error: null,
    }));

    try {
      const recentMessages = get().messages.filter(
        (m) => m.id !== assistantMsgId && !m.isLoading
      );
      
      const historyPayload: ChatMessageApi[] = recentMessages.slice(-8).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const res = await chatApi.sendMessage({
        message: content.trim(),
        history: historyPayload,
      });

      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: res.response,
                intent: res.intent,
                confidence: res.confidence,
                sources: res.sources,
                escalated: res.escalated,
                sessionId: res.sessionId,
                isLoading: false,
              }
            : m
        ),
        isTyping: false,
        isLiveChatMode: res.escalated,
        activeSessionId: res.sessionId || null,
      }));
    } catch (error: any) {
      console.error('Failed to send message:', error);
      
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: 'Unable to send the message. Please check your connection and try again.',
                isLoading: false,
              }
            : m
        ),
        isTyping: false,
        error: 'Failed to send message.',
      }));
    }
  },

  loadLiveMessages: async (sessionId: string) => {
    try {
      const messages = await chatApi.getSessionMessages(sessionId);
      const mapped: ChatMessage[] = messages.map((m) => ({
        id: m.id,
        role: m.senderRole === 'student' ? 'user' : 'live_agent',
        content: m.content,
        timestamp: new Date(m.createdAt),
      }));
      set({ liveMessages: mapped, activeSessionId: sessionId });
    } catch (err) {
      console.error('Failed to load live messages:', err);
    }
  },

  sendLiveMessage: async (sessionId: string, content: string) => {
    if (!content.trim()) return;
    try {
      const newMsg = await chatApi.sendSessionMessage(sessionId, content.trim());
      const mapped: ChatMessage = {
        id: newMsg.id,
        role: newMsg.senderRole === 'student' ? 'user' : 'live_agent',
        content: newMsg.content,
        timestamp: new Date(newMsg.createdAt),
      };
      set((state) => ({
        liveMessages: [...state.liveMessages, mapped],
      }));
    } catch (err) {
      console.error('Failed to send live message:', err);
      set({ error: 'Failed to send message to live agent.' });
    }
  },

  setLiveChatMode: (mode: boolean) => set({ isLiveChatMode: mode }),
}));
