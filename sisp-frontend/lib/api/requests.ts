import apiClient from './client';

export interface DocumentRequestItem {
  id: string;
  studentId: string;
  type: string;
  typeLabel: string;
  status: string;
  remarks?: string | null;
  fee?: number;
  paymentStatus?: string;
  paymentReference?: string | null;
  qrCodeUrl?: string | null;
  paymentConfirmedBy?: { firstName: string; lastName: string; email: string } | null;
  paymentConfirmedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  student: {
    studentNumber: string;
    user: {
      email: string;
      firstName: string;
      lastName: string;
    };
    program: {
      code: string;
      name: string;
    };
  };
}

export const requestsApi = {
  getMyRequests: async () => {
    const response = await apiClient.get('/requests/me');
    return response.data;
  },

  createRequest: async (type: string, remarks?: string) => {
    const response = await apiClient.post('/requests', {
      type,
      remarks,
    });
    return response.data.data;
  },

  getAllRequests: async (status?: string, type?: string): Promise<{ data: DocumentRequestItem[]; total: number }> => {
    const response = await apiClient.get('/requests', {
      params: { status, type },
    });
    return response.data;
  },

  updateRequestStatus: async (id: string, status: string, remarks?: string): Promise<any> => {
    const response = await apiClient.patch(`/requests/${id}`, { status, remarks });
    return response.data;
  },

  confirmPayment: async (id: string): Promise<any> => {
    const response = await apiClient.post(`/requests/${id}/confirm-payment`);
    return response.data;
  },

  getFees: async () => {
    const response = await apiClient.get('/requests/fees');
    return response.data;
  },
};
