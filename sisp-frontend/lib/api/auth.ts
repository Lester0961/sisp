import apiClient from './client';
import { AuthMeResponse, AuthResponse } from '@/types';

export interface LoginResponse {
  mfaRequired: boolean;
  user: AuthResponse['user'];
  accessToken?: string;
  permissions?: string[];
  challengeId?: string;
  expiresAt?: string;
  maskedEmail?: string;
}

export const authApi = {
  register: async (data: {
    email: string;
    password: string;
    roleName: string;
  }): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  login: async (data: { email: string; password: string }): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  verifyMfa: async (data: { challengeId: string; otpCode: string }): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/verify-mfa', data);
    return response.data;
  },

  resendMfa: async (challengeId: string): Promise<{ challengeId: string; expiresAt: string; maskedEmail: string }> => {
    const response = await apiClient.post('/auth/mfa/resend', { challengeId });
    return response.data;
  },

  refresh: async (): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/refresh', {});
    return response.data;
  },

  me: async (): Promise<AuthMeResponse> => {
    const response = await apiClient.get<AuthMeResponse>('/auth/me');
    return response.data;
  },

  logout: async (): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/logout', {});
    return response.data;
  },

  logoutAll: async (): Promise<{ message: string; revoked: number }> => {
    const response = await apiClient.post<{ message: string; revoked: number }>(
      '/auth/logout-all',
      {},
    );
    return response.data;
  },

  changePassword: async (
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string; otherSessionsRevoked: number }> => {
    const response = await apiClient.post<{ message: string; otherSessionsRevoked: number }>(
      '/auth/change-password',
      { currentPassword, newPassword },
    );
    return response.data;
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/reset-password', {
      token,
      newPassword,
    });
    return response.data;
  },

  activateStudentAccount: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/activate-student', {
      token,
      newPassword,
    });
    return response.data;
  },
};
