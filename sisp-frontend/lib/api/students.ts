import apiClient from './client';

export const studentsApi = {
  getMyProfile: async () => {
    const response = await apiClient.get('/students/me');
    return response.data;
  },
};