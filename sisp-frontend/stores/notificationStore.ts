import { create } from 'zustand';
import { Notification } from '@/types';
import { notificationsApi } from '@/lib/api/notifications';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  lastFetchedAt: Date | null;

  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  (set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    lastFetchedAt: null,

    fetchNotifications: async () => {
      set({ isLoading: true });
      try {
        const data = await notificationsApi.getMyNotifications();
        const notifications: Notification[] = data.data ?? [];
        const unreadCount = notifications.filter((n) => !n.isRead).length;
        set({
          notifications,
          unreadCount,
          isLoading: false,
          lastFetchedAt: new Date(),
        });
      } catch {
        set({ isLoading: false });
      }
    },

    markAsRead: async (id: string) => {
      try {
        await notificationsApi.markAsRead(id);
        set((state) => {
          const updated = state.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n,
          );
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.isRead).length,
          };
        });
      } catch {
        // silently fail
      }
    },

    markAllAsRead: async () => {
      try {
        await notificationsApi.markAllAsRead();
        set((state) => ({
          notifications: state.notifications.map((n) => ({
            ...n,
            isRead: true,
          })),
          unreadCount: 0,
        }));
      } catch {
        // silently fail
      }
    },

    deleteNotification: async (id: string) => {
      try {
        await notificationsApi.deleteNotification(id);
        set((state) => {
          const updated = state.notifications.filter((n) => n.id !== id);
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.isRead).length,
          };
        });
      } catch {
        // silently fail
      }
    },

    clearNotifications: () => {
      set({
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        lastFetchedAt: null,
      });
    },
  }),
);