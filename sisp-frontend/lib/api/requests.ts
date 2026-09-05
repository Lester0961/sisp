import apiClient from './client';

export interface DocumentRequestLineItem {
  id?: string;
  catalogItemId?: string;
  type: string;
  label: string;
  quantity: number;
  unitFee: number;
  lineTotal: number;
  remarks?: string | null;
  createdAt?: string;
}

export interface DocumentRequestItem {
  id: string;
  studentId: string;
  type: string;
  typeLabel: string;
  documentNames?: string;
  totalQuantity?: number;
  items?: DocumentRequestLineItem[];
  status: string;
  statusStep: number;
  remarks?: string | null;
  fee?: number;
  paymentStatus?: string;
  paymentReference?: string | null;
  qrCodeUrl?: string | null;
  paymentConfirmedBy?: { firstName: string; lastName: string; email: string } | null;
  paymentConfirmedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  student?: {
    studentNumber: string;
    user: { email: string; firstName: string; lastName: string };
    program: { code: string; name: string };
  };
}

export interface CreateRequestLineItem {
  type: string;
  quantity: number;
  remarks?: string;
}

export const requestsApi = {
  getMyRequests: async (): Promise<{ data: DocumentRequestItem[]; total: number }> => {
    const response = await apiClient.get('/requests/me');
    return response.data;
  },

  createRequest: async (items: CreateRequestLineItem[], remarks?: string) => {
    const response = await apiClient.post('/requests', { items, remarks });
    return response.data.data;
  },

  getAllRequests: async (
    status?: string,
    type?: string,
  ): Promise<{ data: DocumentRequestItem[]; total: number }> => {
    const response = await apiClient.get('/requests', { params: { status, type } });
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
