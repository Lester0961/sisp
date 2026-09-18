import apiClient from './client';

export interface EnrollPayload {
  courseId: string;
  section?: string;
  termId?: string;
  riskAcknowledged?: boolean;
  isTransferee?: boolean;
}

export const enrollmentsApi = {
  getAllEnrollments: async (params?: { termId?: string; instructorId?: string }) => {
    const response = await apiClient.get('/enrollments', { params });
    return response.data;
  },

  assignInstructor: async (enrollmentId: string, instructorId: string) => {
    const response = await apiClient.patch(`/enrollments/${enrollmentId}/instructor`, { instructorId });
    return response.data;
  },

  getMyEnrollments: async () => {
    const response = await apiClient.get('/enrollments/me');
    return response.data;
  },

  getAvailableCourses: async (termId?: string) => {
    const response = await apiClient.get('/enrollments/courses', { params: termId ? { termId } : undefined });
    return response.data;
  },

  enroll: async (data: EnrollPayload) => {
    const response = await apiClient.post('/enrollments', data);
    return response.data;
  },

  dropCourse: async (enrollmentId: string) => {
    const response = await apiClient.patch(
      `/enrollments/${enrollmentId}/drop`,
    );
    return response.data;
  },

  getMyHistory: async () => {
    const response = await apiClient.get('/enrollments/history');
    return response.data;
  },

  getCompletedCourseIds: async (): Promise<string[]> => {
    const response = await apiClient.get('/enrollments/completed-ids');
    return response.data;
  },
};
