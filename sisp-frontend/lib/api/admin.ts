import apiClient from './client';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  isActive: boolean;
  role: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export interface ListUsersResponse {
  data: UserProfile[];
  total: number;
}

export const adminApi = {
  getDashboardStats: async () => {
    const response = await apiClient.get('/admin/dashboard/stats');
    return response.data;
  },

  listUsers: async (page: number = 1, limit: number = 10): Promise<ListUsersResponse> => {
    const response = await apiClient.get('/admin/users', {
      params: { page, limit },
    });
    return response.data;
  },

  updateUserRole: async (userId: string, roleName: string): Promise<UserProfile> => {
    const response = await apiClient.patch(`/admin/users/${userId}/role`, { roleName });
    return response.data;
  },

  deactivateUser: async (userId: string): Promise<UserProfile> => {
    const response = await apiClient.patch(`/admin/users/${userId}/deactivate`);
    return response.data;
  },

  approveException: async (exceptionId: string, decision: 'approved' | 'rejected') => {
    const response = await apiClient.post('/admin/dean/approve-exception', {
      exceptionId,
      decision,
    });
    return response.data;
  },

  createUser: async (data: {
    email: string;
    firstName: string;
    lastName: string;
    roleName: string;
    studentNumber?: string;
    programId?: string;
    temporaryPassword?: string;
  }): Promise<{ message: string; user: UserProfile; temporaryPassword?: string }> => {
    const response = await apiClient.post('/admin/users/create', data);
    return response.data;
  },

  deleteUser: async (userId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/admin/users/${userId}`);
    return response.data;
  },

  // ── Audit Logs ──────────────────────────────────────────
  getAuditLogs: async (page: number = 1, limit: number = 50, resource?: string) => {
    const params: Record<string, any> = { page, limit };
    if (resource) params.resource = resource;
    const response = await apiClient.get('/audit', { params });
    return response.data;
  },

  getAuditStats: async () => {
    const response = await apiClient.get('/audit/stats');
    return response.data;
  },

  // ── Knowledge Base Management ───────────────────────────
  getKbDocuments: async () => {
    const response = await apiClient.get('/admin/kb/documents');
    return response.data;
  },

  getKbDocument: async (filename: string) => {
    const response = await apiClient.get(`/admin/kb/documents/${encodeURIComponent(filename)}`);
    return response.data;
  },

  updateKbDocument: async (filename: string, content: string) => {
    const response = await apiClient.put(`/admin/kb/documents/${encodeURIComponent(filename)}`, { content });
    return response.data;
  },

  createKbDocument: async (data: { filename: string; content: string; category: string }) => {
    const response = await apiClient.post('/admin/kb/documents', data);
    return response.data;
  },

  deleteKbDocument: async (filename: string) => {
    const response = await apiClient.delete(`/admin/kb/documents/${encodeURIComponent(filename)}`);
    return response.data;
  },

  reindexKb: async () => {
    const response = await apiClient.post('/admin/kb/reindex');
    return response.data;
  },
};
