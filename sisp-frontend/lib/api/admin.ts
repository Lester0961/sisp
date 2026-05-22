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

  updateUserRole: async (userId: string, roleId: string): Promise<UserProfile> => {
    const response = await apiClient.patch(`/admin/users/${userId}/role`, { roleId });
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
};
