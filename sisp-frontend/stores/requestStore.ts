import { create } from 'zustand';
import { DocumentRequest } from '@/types';
import { requestsApi, type CreateRequestLineItem } from '@/lib/api/requests';

interface RequestState {
  // State
  requests: DocumentRequest[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  // Actions
  fetchRequests: () => Promise<void>;
  submitRequest: (items: CreateRequestLineItem[], remarks?: string) => Promise<any>;
  confirmPayment: (requestId: string) => Promise<void>;
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

  submitRequest: async (items: CreateRequestLineItem[], remarks?: string) => {
    set({ isSubmitting: true, error: null });
    try {
      const newRequest = await requestsApi.createRequest(items, remarks);
      set((state) => ({
        requests: [newRequest, ...state.requests],
        isSubmitting: false,
      }));
      return newRequest;
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

  confirmPayment: async (requestId: string) => {
    try {
      await requestsApi.confirmPayment(requestId);
      set((state) => ({
        requests: state.requests.map((r) =>
          r.id === requestId
            ? { ...r, status: 'pending', paymentStatus: 'paid' }
            : r,
        ),
      }));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      set({ error: err?.response?.data?.message ?? 'Failed to confirm payment' });
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
