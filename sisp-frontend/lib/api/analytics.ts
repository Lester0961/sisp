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

export interface GradeBand {
  band: string;
  count: number;
}

export interface PublishedGradeCountResponse {
  publishedGradeCount: number;
  gradeDistribution?: GradeBand[];
}

export interface RequestVolumeStat {
  type: string;
  status: string;
  count: number;
}

export interface ChatbotAnalyticsResponse {
  totalLogs: number;
  escalatedCount: number;
  escalationsResolved?: number;
  escalationRate: number | null;
  escalationResolutionRate?: number | null;
  intentDistribution: {
    intent: string;
    count: number;
    avgConfidence: number | null;
  }[];
}

export interface FinanceSummaryResponse {
  totalAssessed: number;
  totalCollected: number;
  outstandingBalance: number;
  paymentsAwaitingVerification: number;
  documentFeesCollected: number;
}

export interface MonthlyReportResponse {
  reportPeriod: { start: string; endExclusive: string };
  generatedAt: string;
  summary: {
    totalStudentInquiries: number;
    totalStudentProfiles: number;
    totalDocumentRequests: number;
    escalationsCreated: number;
    escalationsResolved: number;
    pendingEscalations: number;
    escalationResolutionRate: number | null;
  };
  topStudentConcerns?: {
    topic: string;
    inquiryCount: number;
    confidence: number | null;
  }[];
}

export const analyticsApi = {
  getEnrollmentStats: async (): Promise<EnrollmentStatsResponse> => {
    const response = await apiClient.get('/analytics/enrollment');
    return response.data;
  },

  getMonthlyReport: async (): Promise<MonthlyReportResponse> => {
    const response = await apiClient.get('/analytics/monthly-report');
    return response.data;
  },

  getPublishedGradeCount: async (): Promise<PublishedGradeCountResponse> => {
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

  getFinanceSummary: async (): Promise<FinanceSummaryResponse> => {
    const response = await apiClient.get('/analytics/finance-summary');
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
