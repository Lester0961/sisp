import apiClient from './client';

export const gradesApi = {
  getMyGrades: async () => {
    const response = await apiClient.get('/grades/me');
    return response.data;
  },
};