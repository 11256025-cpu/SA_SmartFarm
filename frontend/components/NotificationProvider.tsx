import React, { createContext, useContext, useMemo, useState } from 'react';

export type NotificationType = 'alert' | 'success' | 'warning' | 'info' | 'error';

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  action?: () => void;
  createdAt: number;
  read: boolean;
};

export type NotificationPayload = Omit<NotificationItem, 'id' | 'createdAt' | 'read'> & {
  id?: string;
};

type NotificationContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  panelVisible: boolean;
  addNotification: (notification: NotificationPayload) => void;
  addNotifications: (notifications: NotificationPayload[]) => void;
  replaceNotificationsOfType: (type: NotificationType, notifications: NotificationPayload[]) => void;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  clearNotifications: () => void;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const createNotificationId = (id?: string) => id || `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [panelVisible, setPanelVisible] = useState(false);

  const addNotification = (notification: NotificationPayload) => {
    const id = createNotificationId(notification.id);
    setNotifications((current) => {
      const existingIndex = current.findIndex((item) => item.id === id);
      const createdAt = Date.now();
      const newItem: NotificationItem = {
        id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        action: notification.action,
        createdAt,
        read: false,
      };

      if (existingIndex >= 0) {
        return [
          newItem,
          ...current.slice(0, existingIndex),
          ...current.slice(existingIndex + 1),
        ].slice(0, 30);
      }

      return [newItem, ...current].slice(0, 30);
    });
  };

  const addNotifications = (items: NotificationPayload[]) => {
    setNotifications((current) => {
      const merged = [...current];
      items.forEach((notification) => {
        const id = createNotificationId(notification.id);
        const existingIndex = merged.findIndex((item) => item.id === id);
        const newItem: NotificationItem = {
          id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          action: notification.action,
          createdAt: Date.now(),
          read: false,
        };
        if (existingIndex >= 0) {
          merged.splice(existingIndex, 1);
        }
        merged.unshift(newItem);
      });
      return merged.slice(0, 30);
    });
  };

  const replaceNotificationsOfType = (type: NotificationType, items: NotificationPayload[]) => {
    setNotifications((current) => {
      const others = current.filter((item) => item.type !== type);
      const newItems = items.map((notification) => ({
        id: createNotificationId(notification.id),
        title: notification.title,
        message: notification.message,
        type: notification.type,
        action: notification.action,
        createdAt: Date.now(),
        read: false,
      }));
      return [...newItems, ...others].slice(0, 30);
    });
  };

  const openPanel = () => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    setPanelVisible(true);
  };

  const closePanel = () => setPanelVisible(false);
  const togglePanel = () => setPanelVisible((prev) => !prev);
  const clearNotifications = () => setNotifications([]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.filter((item) => !item.read).length,
      panelVisible,
      addNotification,
      addNotifications,
      replaceNotificationsOfType,
      openPanel,
      closePanel,
      togglePanel,
      clearNotifications,
    }),
    [notifications, panelVisible]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
