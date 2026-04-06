import { create } from 'zustand';
import { DocumentRequest } from '@/types';
import { requestsApi } from '@/lib/api/requests';

interface RequestState {
  // State
  requests: DocumentRequest[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  // Actions
  fetchRequests: () => Promise<void>;
  submitRequest: (type: string, remarks?: string) => Promise<void>;
  clearRequests: () => void;
}

export const useRequestStore = create<RequestState>()((set) => ({
  // Initial state
  requests: [],
  isLoading: false,
  isSubmitting: false,
  error: null,

  fetchRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await requestsApi.getMyRequests();
      set({
        requests: data.data ?? [],
        isLoading: false,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      set({
        error: err?.response?.data?.message ?? 'Failed to load requests',
        isLoading: false,
      });
    }
  },

  submitRequest: async (type: string, remarks?: string) => {
    set({ isSubmitting: true, error: null });
    try {
      const newRequest = await requestsApi.createRequest(type, remarks);
      set((state) => ({
        requests: [newRequest, ...state.requests],
        isSubmitting: false,
      }));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      set({
        error:
          err?.response?.data?.message ?? 'Failed to submit request',
        isSubmitting: false,
      });
      throw error;
    }
  },

  clearRequests: () => {
    set({
      requests: [],
      isLoading: false,
      isSubmitting: false,
      error: null,
    });
  },
}));