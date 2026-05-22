import apiClient from './client';

export interface DocumentRequestItem {
  id: string;
  studentId: string;
  type: string;
  typeLabel: string;
  status: string;
  remarks?: string | null;
  createdAt: string;
  student: {
    studentNumber: string;
    user: {
      email: string;
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
};