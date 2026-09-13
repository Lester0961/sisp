import apiClient from './client';

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

  getAvailableCourses: async () => {
    const response = await apiClient.get('/enrollments/courses');
    return response.data;
  },

  enroll: async (courseId: string, section?: string) => {
    const response = await apiClient.post('/enrollments', {
      courseId,
      section,
    });
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
};
