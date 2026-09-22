import apiClient from './client';

export interface DocumentRequestLineItem {
  id?: string;
  catalogItemId?: string;
  type: string;
  label: string;
  quantity: number;
  unitFee: number;
  lineTotal: number;
  billingBasis?: 'copy' | 'page' | string;
  pageCount?: number | null;
  remarks?: string | null;
  createdAt?: string;
}

export interface PaymentChannels {
  configured: boolean;
  instruction: string;
  gcash: { label: string; number?: string; accountName?: string; note?: string | null } | null;
  pnb: { label: string; accountName?: string; accountNumber?: string } | null;
  proofRecipient: { name: string; office: string; instruction: string } | null;
}

export interface DocumentRequestItem {
  id: string;
  studentId: string;
  type: string;
  referenceNo?: string | null;
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
  paymentProofChannel?: string | null;
  paymentProofReference?: string | null;
  paymentProofSubmittedAt?: string | null;
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

export interface DocumentCatalogItem {
  id: string;
  code: string;
  type?: string;
  label: string;
  fee: number;
  feeNote?: string | null;
  tat?: string | null;
  assignedTo?: string | null;
  sortOrder: number;
  isActive: boolean;
  billingBasis?: 'copy' | 'page' | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCatalogItemPayload {
  code: string;
  label: string;
  fee: number;
  feeNote?: string;
  tat?: string;
  assignedTo?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCatalogItemPayload {
  code?: string;
  label?: string;
  fee?: number;
  feeNote?: string;
  tat?: string;
  assignedTo?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export const requestsApi = {
  getMyRequests: async (): Promise<{ data: DocumentRequestItem[]; total: number }> => {
    const response = await apiClient.get('/requests/me');
    return response.data;
  },

  createRequest: async (
    items: CreateRequestLineItem[],
    remarks?: string,
    isThirdParty?: boolean,
    authorizationNotes?: string,
  ) => {
    const response = await apiClient.post('/requests', {
      items,
      remarks,
      isThirdParty,
      authorizationNotes,
    });
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

  confirmTorQuote: async (id: string, pageCount: number): Promise<any> => {
    const response = await apiClient.post(`/requests/${id}/confirm-tor-quote`, { pageCount });
    return response.data;
  },

  getPaymentQueue: async (): Promise<DocumentRequestItem[]> => {
    const response = await apiClient.get<DocumentRequestItem[]>('/requests/payment-queue');
    return response.data;
  },

  getPaymentChannels: async (): Promise<PaymentChannels> => {
    const response = await apiClient.get('/requests/payment-channels');
    return response.data;
  },

  submitProof: async (
    id: string,
    channel: 'gcash' | 'pnb',
    reference: string,
  ): Promise<any> => {
    const response = await apiClient.post(`/requests/${id}/payment-proof`, {
      channel,
      reference,
    });
    return response.data;
  },

  getFees: async (): Promise<DocumentCatalogItem[]> => {
    const response = await apiClient.get('/requests/fees');
    return response.data;
  },

  getCatalog: async (all = false): Promise<DocumentCatalogItem[]> => {
    const response = await apiClient.get('/requests/catalog', { params: { all } });
    return response.data;
  },

  createCatalogItem: async (payload: CreateCatalogItemPayload): Promise<DocumentCatalogItem> => {
    const response = await apiClient.post('/requests/catalog', payload);
    return response.data;
  },

  updateCatalogItem: async (
    id: string,
    payload: UpdateCatalogItemPayload,
  ): Promise<DocumentCatalogItem> => {
    const response = await apiClient.patch(`/requests/catalog/${id}`, payload);
    return response.data;
  },

  deleteCatalogItem: async (id: string): Promise<{ message: string; deactivated?: boolean; deleted?: boolean }> => {
    const response = await apiClient.delete(`/requests/catalog/${id}`);
    return response.data;
  },
};
