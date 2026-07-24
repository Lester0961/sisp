import apiClient from './client';
import { AuthResponse } from '@/types';

export const authApi = {
  register: async (data: {
    email: string;
    password: string;
    roleName: string;
  }): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>(
      '/auth/register',
      data,
    );
    return response.data;
  },

  login: async (data: {
    email: string;
    password: string;
  }): Promise<any> => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  verifyMfa: async (data: {
    mfaToken: string;
    otpCode: string;
  }): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/verify-mfa', data);
    return response.data;
  },

  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};