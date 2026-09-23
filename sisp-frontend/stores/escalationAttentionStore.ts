import { create } from 'zustand';
import { chatApi } from '@/lib/api/chat';

interface EscalationAttentionState {
  count: number;
  refresh: () => Promise<void>;
  clear: () => void;
}

export const useEscalationAttentionStore = create<EscalationAttentionState>((set) => ({
  count: 0,
  refresh: async () => {
    try {
      const result = await chatApi.getAttention();
      set({ count: result.count });
    } catch {
      set({ count: 0 });
    }
  },
  clear: () => set({ count: 0 }),
}));

export function escalationChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('sisp-escalation-changed'));
}
