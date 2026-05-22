import { create } from 'zustand';
import { adminApi, UserProfile, ListUsersResponse } from '@/lib/api/admin';
import {
  analyticsApi,
  EnrollmentStatsResponse,
  GpaDistributionResponse,
  RequestVolumeStat,
  ChatbotAnalyticsResponse,
} from '@/lib/api/analytics';

interface AdminState {
  // State
  users: UserProfile[];
  totalUsers: number;
  currentPage: number;
  limit: number;
  dashboardStats: {
    totalUsers: number;
    totalStudents: number;
    totalFaculty: number;
    totalRequests: number;
  } | null;
  enrollmentStats: EnrollmentStatsResponse | null;
  gpaDistribution: GpaDistributionResponse | null;
  requestVolume: RequestVolumeStat[];
  chatbotAnalytics: ChatbotAnalyticsResponse | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchUsers: (page?: number, limit?: number) => Promise<void>;
  updateUserRole: (userId: string, roleId: string) => Promise<void>;
  deactivateUser: (userId: string) => Promise<void>;
  fetchDashboardStats: () => Promise<void>;
  fetchEnrollmentStats: () => Promise<void>;
  fetchGpaDistribution: () => Promise<void>;
  fetchRequestVolume: () => Promise<void>;
  fetchChatbotAnalytics: () => Promise<void>;
  approveDeanException: (exceptionId: string, decision: 'approved' | 'rejected') => Promise<void>;
  downloadEnrollmentReport: () => Promise<void>;
  downloadGradeTranscript: (studentId: string) => Promise<void>;
}

export const useAdminStore = create<AdminState>()((set, get) => ({
  // Initial State
  users: [],
  totalUsers: 0,
  currentPage: 1,
  limit: 10,
  dashboardStats: null,
  enrollmentStats: null,
  gpaDistribution: null,
  requestVolume: [],
  chatbotAnalytics: null,
  isLoading: false,
  error: null,

  fetchUsers: async (page = 1, limit = 10) => {
    set({ isLoading: true, error: null });
    try {
      const res = await adminApi.listUsers(page, limit);
      set({
        users: res.data,
        totalUsers: res.total,
        currentPage: page,
        limit,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to list users.', isLoading: false });
    }
  },

  updateUserRole: async (userId: string, roleId: string) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await adminApi.updateUserRole(userId, roleId);
      // Update local user list
      set((state) => ({
        users: state.users.map((u) => (u.id === userId ? updatedUser : u)),
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update user role.', isLoading: false });
      throw err;
    }
  },

  deactivateUser: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await adminApi.deactivateUser(userId);
      set((state) => ({
        users: state.users.map((u) => (u.id === userId ? updatedUser : u)),
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to deactivate user.', isLoading: false });
      throw err;
    }
  },

  fetchDashboardStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await adminApi.getDashboardStats();
      set({ dashboardStats: stats, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch dashboard stats.', isLoading: false });
    }
  },

  fetchEnrollmentStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await analyticsApi.getEnrollmentStats();
      set({ enrollmentStats: stats, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch enrollment stats.', isLoading: false });
    }
  },

  fetchGpaDistribution: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await analyticsApi.getGpaDistribution();
      set({ gpaDistribution: stats, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch GPA distribution.', isLoading: false });
    }
  },

  fetchRequestVolume: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await analyticsApi.getRequestVolume();
      set({ requestVolume: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch request volume.', isLoading: false });
    }
  },

  fetchChatbotAnalytics: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await analyticsApi.getChatbotAnalytics();
      set({ chatbotAnalytics: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch chatbot analytics.', isLoading: false });
    }
  },

  approveDeanException: async (exceptionId: string, decision: 'approved' | 'rejected') => {
    set({ isLoading: true, error: null });
    try {
      await adminApi.approveException(exceptionId, decision);
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update exception.', isLoading: false });
      throw err;
    }
  },

  downloadEnrollmentReport: async () => {
    try {
      const blob = await analyticsApi.exportEnrollmentExcel();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'enrollment_report.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Failed to download enrollment excel report:', err);
    }
  },

  downloadGradeTranscript: async (studentId: string) => {
    try {
      const blob = await analyticsApi.exportGradesPdf(studentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grade_report_${studentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Failed to download grade PDF report:', err);
    }
  },
}));
