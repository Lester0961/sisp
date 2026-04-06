import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  confidence?: number;
  timestamp: Date;
  isLoading?: boolean;
}

interface ChatState {
  // State
  messages: ChatMessage[];
  isOpen: boolean;
  isTyping: boolean;
  sessionId: string | null;

  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setTyping: (isTyping: boolean) => void;
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  clearMessages: () => void;
  setSessionId: (id: string) => void;
}

const generateId = () =>
  Math.random().toString(36).substring(2) + Date.now().toString(36);

export const useChatStore = create<ChatState>()((set) => ({
  // Initial state
  messages: [],
  isOpen: false,
  isTyping: false,
  sessionId: null,

  addMessage: (message) => {
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: generateId(),
          timestamp: new Date(),
        },
      ],
    }));
  },

  setTyping: (isTyping) => set({ isTyping }),

  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),

  openChat: () => set({ isOpen: true }),

  closeChat: () => set({ isOpen: false }),

  clearMessages: () =>
    set({
      messages: [],
      isTyping: false,
      sessionId: null,
    }),

  setSessionId: (id) => set({ sessionId: id }),
}));