import apiClient from './client';

export interface GradeItem {
  id: string;
  enrollmentId: string;
  prelim?: number | null;
  midterm?: number | null;
  finals?: number | null;
  finalGrade?: number | null;
  isVisible: boolean;
  status?: string;
  submittedBy?: { firstName: string; lastName: string; email: string } | null;
  submittedAt?: string | null;
  postedBy?: { firstName: string; lastName: string; email: string } | null;
  postedAt?: string | null;
  approvedBy?: { firstName: string; lastName: string; email: string } | null;
  approvedAt?: string | null;
  rejectedBy?: { firstName: string; lastName: string; email: string } | null;
  rejectedAt?: string | null;
  rejectedRemarks?: string | null;
  enrollment?: {
    id: string;
    section?: string;
    semester?: string;
    year?: string;
    student: {
      id: string;
      studentNumber: string;
      user: {
        firstName: string;
        lastName: string;
      };
    };
    course: {
      id: string;
      code: string;
      title: string;
    };
  };
}

export const gradesApi = {
  getMyGrades: async () => {
    const response = await apiClient.get('/grades/me');
    return response.data;
  },

  getAllGrades: async (
    studentId?: string,
    enrollmentId?: string,
    status?: string,
  ): Promise<GradeItem[]> => {
    const response = await apiClient.get('/grades', {
      params: { studentId, enrollmentId, status },
    });
    return Array.isArray(response.data)
      ? response.data
      : response.data?.data || [];
  },

  updateGrade: async (
    gradeId: string,
    payload: { prelim?: number; midterm?: number; finals?: number; isVisible?: boolean },
  ): Promise<GradeItem> => {
    const response = await apiClient.patch(`/grades/${gradeId}`, payload);
    return response.data;
  },

  submitGrade: async (gradeId: string): Promise<GradeItem> => {
    const response = await apiClient.post(`/grades/${gradeId}/submit`);
    return response.data;
  },

  postGrade: async (gradeId: string): Promise<GradeItem> => {
    const response = await apiClient.post(`/grades/${gradeId}/post`);
    return response.data;
  },

  approveGrade: async (gradeId: string): Promise<GradeItem> => {
    const response = await apiClient.post(`/grades/${gradeId}/approve`);
    return response.data;
  },

  rejectGrade: async (gradeId: string, remarks: string): Promise<GradeItem> => {
    const response = await apiClient.post(`/grades/${gradeId}/reject`, { remarks });
    return response.data;
  },

  toggleVisibility: async (gradeId: string, isVisible: boolean): Promise<GradeItem> => {
    const response = await apiClient.patch(`/grades/${gradeId}/visibility`, { isVisible });
    return response.data;
  },

  bulkUpdateGrades: async (grades: { enrollmentId: string; prelim?: number; midterm?: number; finals?: number }[]): Promise<any> => {
    const response = await apiClient.post('/grades/bulk', { grades });
    return response.data;
  },
};
