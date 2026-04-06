import apiClient from './client';

export const enrollmentsApi = {
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