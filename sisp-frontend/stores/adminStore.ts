import { create } from 'zustand';
import { adminApi, UserProfile, ListUsersResponse } from '@/lib/api/admin';
import {
  analyticsApi,
  EnrollmentStatsResponse,
  FinanceSummaryResponse,
  PublishedGradeCountResponse,
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
    pendingEscalations?: number;
    resolvedEscalations?: number;
    awaitingPaymentRequests?: number;
    openDocumentRequests?: number;
    activeSessions?: number;
  } | null;
  enrollmentStats: EnrollmentStatsResponse | null;
  publishedGradeCount: PublishedGradeCountResponse | null;
  requestVolume: RequestVolumeStat[];
  chatbotAnalytics: ChatbotAnalyticsResponse | null;
  financeSummary: FinanceSummaryResponse | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchUsers: (page?: number, limit?: number) => Promise<void>;
  updateUserRole: (userId: string, roleName: string) => Promise<void>;
  deactivateUser: (userId: string) => Promise<void>;
  fetchDashboardStats: () => Promise<void>;
  fetchEnrollmentStats: () => Promise<void>;
  fetchPublishedGradeCount: () => Promise<void>;
  fetchRequestVolume: () => Promise<void>;
  fetchChatbotAnalytics: () => Promise<void>;
  fetchFinanceSummary: () => Promise<void>;
  downloadEnrollmentReport: () => Promise<void>;
  downloadGradeTranscript: (studentId: string) => Promise<void>;
  createUser: (data: any) => Promise<{ user: UserProfile; temporaryPassword?: string }>;
  activateUser: (userId: string) => Promise<void>;
  archiveUser: (userId: string) => Promise<void>;
  revokeUserSessions: (userId: string) => Promise<number>;
}

export const useAdminStore = create<AdminState>()((set, get) => ({
  // Initial State
  users: [],
  totalUsers: 0,
  currentPage: 1,
  limit: 10,
  dashboardStats: null,
  enrollmentStats: null,
  publishedGradeCount: null,
  requestVolume: [],
  chatbotAnalytics: null,
  financeSummary: null,
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

  updateUserRole: async (userId: string, roleName: string) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await adminApi.updateUserRole(userId, roleName);
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

  fetchPublishedGradeCount: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await analyticsApi.getPublishedGradeCount();
      set({ publishedGradeCount: stats, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch published grade count.', isLoading: false });
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

  fetchFinanceSummary: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await analyticsApi.getFinanceSummary();
      set({ financeSummary: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch finance summary.', isLoading: false });
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

  createUser: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const res = await adminApi.createUser(data);
      // Fetch users again to reload the current page table
      await get().fetchUsers(get().currentPage, get().limit);
      set({ isLoading: false });
      return { user: res.user, temporaryPassword: res.temporaryPassword };
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to create user.';
      set({ error: errMsg, isLoading: false });
      throw err;
    }
  },

  activateUser: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await adminApi.activateUser(userId);
      set((state) => ({
        users: state.users.map((u) => (u.id === userId ? updatedUser : u)),
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to activate user.', isLoading: false });
      throw err;
    }
  },

  archiveUser: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await adminApi.archiveUser(userId);
      set((state) => ({
        users: state.users.map((u) => (u.id === userId ? updatedUser : u)),
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to archive user.', isLoading: false });
      throw err;
    }
  },

  revokeUserSessions: async (userId: string) => {
    try {
      const result = await adminApi.revokeSessions(userId);
      return result.revoked;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to revoke sessions.', isLoading: false });
      throw err;
    }
  },
}));
