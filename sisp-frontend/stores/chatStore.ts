import { create } from 'zustand';
import { chatApi, ChatMessageApi, ChatSource } from '@/lib/api/chat';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  confidence?: number;
  timestamp: Date;
  isLoading?: boolean;
  sources?: ChatSource[];
  escalated?: boolean;
}

interface ChatState {
  // State
  messages: ChatMessage[];
  isOpen: boolean;
  isTyping: boolean;
  isLoadingHistory: boolean;
  historyLoaded: boolean;
  error: string | null;

  // Actions
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  clearMessages: () => void;
  loadHistory: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
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

  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
  openChat: () => {
    set({ isOpen: true });
    // Proactively load history when chat is opened
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
    }),

  loadHistory: async () => {
    set({ isLoadingHistory: true, error: null });
    try {
      const data = await chatApi.getChatHistory();
      const mappedMessages: ChatMessage[] = [];
      
      data.forEach((log) => {
        // Map user query
        mappedMessages.push({
          id: `${log.id}-user`,
          role: 'user',
          content: log.message,
          timestamp: new Date(log.createdAt),
        });
        
        // Map ARIA response
        mappedMessages.push({
          id: `${log.id}-assistant`,
          role: 'assistant',
          content: log.response,
          intent: log.intent || undefined,
          confidence: log.confidence || undefined,
          timestamp: new Date(log.createdAt),
          escalated: !!log.escalation,
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

    // 1. Append User Message and Loading Assistant Message optimistically
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
      // 2. Prepare history in the format required by the ML / NestJS backend (excluding the current loading message)
      const recentMessages = get().messages.filter(
        (m) => m.id !== assistantMsgId && !m.isLoading
      );
      
      const historyPayload: ChatMessageApi[] = recentMessages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // 3. Make HTTP request to NestJS /chat
      const res = await chatApi.sendMessage({
        message: content.trim(),
        history: historyPayload,
      });

      // 4. Update the Loading message with the actual AI response
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
                isLoading: false,
              }
            : m
        ),
        isTyping: false,
      }));
    } catch (error: any) {
      console.error('Failed to send message:', error);
      
      // Update loading message to display an error bubble
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: '⚠️ Failed to send message. Please check your connection and try again.',
                isLoading: false,
              }
            : m
        ),
        isTyping: false,
        error: 'Failed to send message.',
      }));
    }
  },
}));