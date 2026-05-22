import apiClient from './client';

export interface EnrollmentStat {
  programId: string;
  programName: string;
  count: number;
}

export interface EnrollmentStatsResponse {
  data: EnrollmentStat[];
  totalEnrolled: number;
}

export interface GpaDistributionResponse {
  distribution: {
    [key: string]: number;
  };
  passFailRates: {
    code: string;
    title: string;
    pass: number;
    fail: number;
  }[];
}

export interface RequestVolumeStat {
  type: string;
  status: string;
  count: number;
}

export interface ChatbotAnalyticsResponse {
  totalLogs: number;
  escalatedCount: number;
  escalationRate: number;
  intentDistribution: {
    intent: string;
    count: number;
    avgConfidence: number;
  }[];
}

export const analyticsApi = {
  getEnrollmentStats: async (): Promise<EnrollmentStatsResponse> => {
    const response = await apiClient.get('/analytics/enrollment');
    return response.data;
  },

  getGpaDistribution: async (): Promise<GpaDistributionResponse> => {
    const response = await apiClient.get('/analytics/grades');
    return response.data;
  },

  getRequestVolume: async (): Promise<RequestVolumeStat[]> => {
    const response = await apiClient.get('/analytics/requests');
    return response.data;
  },

  getChatbotAnalytics: async (): Promise<ChatbotAnalyticsResponse> => {
    const response = await apiClient.get('/analytics/chatbot');
    return response.data;
  },

  exportEnrollmentExcel: async (): Promise<Blob> => {
    const response = await apiClient.get('/analytics/export/enrollment', {
      responseType: 'blob',
    });
    return response.data;
  },

  exportGradesPdf: async (studentId: string): Promise<Blob> => {
    const response = await apiClient.get(`/analytics/export/grades/${studentId}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
