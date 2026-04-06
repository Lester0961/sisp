import apiClient from './client';

export const requestsApi = {
  getMyRequests: async () => {
    const response = await apiClient.get('/requests/me');
    return response.data;
  },

createRequest: async (type: string, remarks?: string) => {
  const response = await apiClient.post('/requests', {
    type,
    remarks,
  });
  return response.data.data;
},
};