import apiClient from './client';

export const notificationsApi = {
  getMyNotifications: async (unreadOnly = false) => {
    const response = await apiClient.get(
      `/notifications${unreadOnly ? '?unreadOnly=true' : ''}`,
    );
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (id: string) => {
    const response = await apiClient.patch(
      `/notifications/${id}/read`,
    );
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await apiClient.patch('/notifications/read-all');
    return response.data;
  },

  deleteNotification: async (id: string) => {
    const response = await apiClient.delete(`/notifications/${id}`);
    return response.data;
  },
};